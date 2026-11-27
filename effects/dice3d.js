// Dado 3D (d6 e d20) con Three.js (WebGL), caricato solo quando serve (import dinamico: zero costo se nessun dado viene creato).
// Non conosce l'app: roll(valore?) mostra il valore chiesto (o ne sceglie uno) e lo restituisce; chi lo usa decide cosa farne.
// I numeri del d20 hanno opposti che sommano 21 (come i dadi veri); la disposizione completa non è quella dei dadi commerciali.
let T = null;
// window.THREE già presente (pagina singola autonoma) oppure import dinamico del modulo locale
const load = () => window.THREE ? Promise.resolve(window.THREE) : T || (T = import('./vendor/three.module.min.js'));

function atlas(THREE, n, cols, cw, ch, draw){
  const rows = Math.ceil(n / cols), cv = document.createElement('canvas'); cv.width = cols * cw; cv.height = rows * ch;
  const g = cv.getContext('2d');
  for (let i = 0; i < n; i++) draw(g, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch, i);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return {tex, cols, rows};
}
const paint = (g, x, y, w, h) => { const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#d4513a'); gr.addColorStop(1, '#7d2012'); g.fillStyle = gr; g.fillRect(x, y, w, h); };
const txt = (g, s, cx, cy, px) => { g.fillStyle = '#f6dc98'; g.font = `700 ${px}px Georgia, "Times New Roman", serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, cx, cy); };

// quaternione che porta la faccia (normale n, "su" u) verso l'osservatore (+z, su = +y)
function facing(THREE, n, u){
  const r = new THREE.Vector3().crossVectors(u, n).normalize(), up = new THREE.Vector3().crossVectors(n, r).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(r, up, n)).invert();
}

function buildD20(THREE){
  const geo = new THREE.IcosahedronGeometry(1, 0), pos = geo.attributes.position, faces = [];
  for (let i = 0; i < 20; i++){
    const a = new THREE.Vector3().fromBufferAttribute(pos, i * 3), b = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 1), c = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 2);
    const ctr = a.clone().add(b).add(c).divideScalar(3);
    faces.push({n:ctr.clone().normalize(), up:a.clone().sub(ctr).normalize()});
  }
  let v = 1;
  faces.forEach((f, i) => { if (f.value) return; const j = faces.findIndex((g, k) => k !== i && g.n.dot(f.n) < -.999); f.value = v; faces[j].value = 21 - v; v++; });
  const cw = 256, ch = 222, A = atlas(THREE, 20, 5, cw, ch, (g, x, y, w, h, i) => {
    paint(g, x, y, w, h); g.strokeStyle = 'rgba(246,220,152,.55)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x + w / 2, y + 3); g.lineTo(x + w - 3, y + h - 3); g.lineTo(x + 3, y + h - 3); g.closePath(); g.stroke();
    txt(g, String(faces[i].value), x + w / 2, y + h * .64, faces[i].value > 9 ? 78 : 92);
  });
  const uv = new Float32Array(20 * 6);
  for (let i = 0; i < 20; i++){
    const cx = i % 5, cy = Math.floor(i / 5), u0 = cx / 5, u1 = (cx + 1) / 5, vTop = 1 - cy / 4, vBot = 1 - (cy + 1) / 4;
    uv.set([(u0 + u1) / 2, vTop, u0, vBot, u1, vBot], i * 6);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return {geo, mat:new THREE.MeshStandardMaterial({map:A.tex, roughness:.42, metalness:.12, flatShading:true}), faces, radius:1};
}
function buildD6(THREE){
  const geo = new THREE.BoxGeometry(1.35, 1.35, 1.35);
  // ordine dei materiali di BoxGeometry: +x, -x, +y, -y, +z, -z
  const vals = [3, 4, 2, 5, 1, 6], ns = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], ups = [[0, 1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [0, 1, 0], [0, 1, 0]];
  const mats = vals.map(val => { const A = atlas(THREE, 1, 1, 256, 256, (g, x, y, w, h) => { paint(g, x, y, w, h); g.strokeStyle = 'rgba(246,220,152,.55)'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20); txt(g, String(val), w / 2, h / 2 + 6, 150); });
    return new THREE.MeshStandardMaterial({map:A.tex, roughness:.42, metalness:.12}); });
  const faces = vals.map((value, i) => ({value, n:new THREE.Vector3(...ns[i]), up:new THREE.Vector3(...ups[i])}));
  return {geo, mat:mats, faces, radius:1.17};
}

export async function createDie(host, {sides = 20, size = 140} = {}){
  const THREE = await load(), B = sides === 6 ? buildD6(THREE) : buildD20(THREE);
  const wrap = document.createElement('div'); wrap.className = 'fxDieWrap'; wrap.style.cssText = `width:${size}px;height:${size}px;margin:12px;display:inline-block`;
  const r = new THREE.WebGLRenderer({antialias:true, alpha:true}); r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.setSize(size, size);
  wrap.appendChild(r.domElement); host.appendChild(wrap);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, .1, 50); cam.position.set(0, 0, 4.6 / (1.17 / B.radius) * (sides === 6 ? 1.05 : 1));
  scene.add(new THREE.AmbientLight(0xffffff, 1.5)); const sun = new THREE.DirectionalLight(0xfff0d0, 2.4); sun.position.set(2, 3, 5); scene.add(sun);
  const mesh = new THREE.Mesh(B.geo, B.mat), pivot = new THREE.Group(); pivot.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(B.geo), new THREE.LineBasicMaterial({color:0xe7c878})); mesh.add(edges); scene.add(pivot);
  const render = () => r.render(scene, cam);
  const q = f => facing(THREE, f.n, f.up);
  mesh.quaternion.copy(q(B.faces.find(f => f.value === (sides === 6 ? 1 : 20)))); render();
  const rnd = () => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize(), Math.random() * 6.28);
  let rolling = false;
  function roll(value){
    if (rolling) return Promise.resolve(null);
    const f = value ? B.faces.find(x => x.value === value) : B.faces[Math.floor(Math.random() * B.faces.length)];
    if (!f) return Promise.resolve(null);
    rolling = true;
    const keys = [mesh.quaternion.clone(), rnd(), rnd(), rnd(), q(f)], still = matchMedia('(prefers-reduced-motion:reduce)').matches, dur = 1300, t0 = performance.now();
    return new Promise(res => {
      const end = () => { mesh.quaternion.copy(keys[4]); pivot.position.y = 0; render(); rolling = false; wrap.dataset.value = f.value; res(f.value); };
      if (still) return end();
      (function tick(now){
        const t = Math.max(0, Math.min(1, (now - t0) / dur)), e = 1 - Math.pow(1 - t, 3), s = e * 4, i = Math.min(3, Math.floor(s));
        mesh.quaternion.copy(keys[i]).slerp(keys[i + 1], s - i);
        pivot.position.y = Math.abs(Math.sin(t * Math.PI * 2.6)) * .55 * Math.pow(1 - t, 1.3);
        render(); t < 1 ? requestAnimationFrame(tick) : end();
      })(t0);
    });
  }
  return {roll, el:wrap, faces:B.faces.length, destroy(){ r.dispose(); wrap.remove(); }};
}
