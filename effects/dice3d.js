// Dadi 3D su un layer a tutto schermo sopra l'interfaccia: fisica vera (cannon-es) + rendering WebGL (Three.js), caricati solo al primo tiro.
// Il risultato lo decide l'app (Math.random in dadi.js): qui il lancio viene simulato in anticipo, si guarda quale faccia finisce sopra
// e le etichette si scambiano in modo che quella faccia mostri il valore già tirato. Poi il lancio si riproduce in tempo reale.
// API: rollDice([{s:20, v:14}, {s:6, v:3}, ...], {shadows}) -> Promise<void> alla fine del lancio. Max 12 dadi. d100 = due d10 (decine e unità).
const libs = () => Promise.all([window.THREE || import('./vendor/three.module.min.js'), window.CANNON || import('./vendor/cannon-es.js')]);
const SIDES = [4, 6, 8, 10, 12, 20];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(a[0], a[1], a[2]), norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/* ---------- forme: vertici -> facce piane (inviluppo convesso a forza bruta, bastano ≤20 vertici) ---------- */
function vertsOf(sides){
  const p = (1 + Math.sqrt(5)) / 2, q = 1 / p;
  let v;
  if (sides === 4) v = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
  else if (sides === 6) v = [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => [x, y, z])));
  else if (sides === 8) v = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  else if (sides === 12){ v = [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => [x, y, z])));
    for (const a of [-1, 1]) for (const b of [-1, 1]) v.push([0, a * q, b * p], [a * q, b * p, 0], [b * p, 0, a * q]); }
  else if (sides === 20){ v = []; for (const a of [-1, 1]) for (const b of [-1, 1]) v.push([0, a, b * p], [a, b * p, 0], [b * p, 0, a]); }
  else { // d10: trapezoedro pentagonale, z dell'anello scelta perché i 10 "aquiloni" siano piani
    const c = Math.cos(Math.PI / 5), z0 = (1 - c) / (1 + c); v = [[0, 0, 1], [0, 0, -1]];
    for (let i = 0; i < 10; i++) v.push([Math.cos(i * Math.PI / 5), Math.sin(i * Math.PI / 5), i % 2 ? z0 : -z0]);
  }
  const R = Math.max(...v.map(len)); return v.map(x => x.map(k => k / R));
}
function hull(V){
  const out = [], seen = new Set(), E = 1e-6, n = V.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++){
    let nn = cross(sub(V[j], V[i]), sub(V[k], V[i])); if (len(nn) < 1e-9) continue; nn = norm(nn);
    let d = dot(nn, V[i]), pos = 0, neg = 0, on = [];
    V.forEach((x, m) => { const s = dot(nn, x) - d; if (s > E) pos++; else if (s < -E) neg++; else on.push(m); });
    if (pos && neg) continue;
    if (pos) { nn = nn.map(x => -x); d = -d; }
    const key = on.join(','); if (seen.has(key)) continue; seen.add(key);
    const c = on.reduce((a, m) => [a[0] + V[m][0] / on.length, a[1] + V[m][1] / on.length, a[2] + V[m][2] / on.length], [0, 0, 0]);
    const u = norm(sub(V[on[0]], c)), w = cross(nn, u);
    on.sort((a, b) => Math.atan2(dot(sub(V[a], c), w), dot(sub(V[a], c), u)) - Math.atan2(dot(sub(V[b], c), w), dot(sub(V[b], c), u)));
    out.push({idx:on, n:nn, c, u, v:w});   // idx antiorario visto da fuori, u destra, v su (n = u × v)
  }
  return out;
}
const shapes = {};
function shape(sides){
  if (shapes[sides]) return shapes[sides];
  const V = vertsOf(sides), F = hull(V);
  const vals = new Array(F.length).fill(0); let nx = 1;
  F.forEach((f, i) => { if (vals[i]) return; const j = F.findIndex((g, k) => k !== i && dot(g.n, f.n) < -.999); vals[i] = nx; if (j >= 0) vals[j] = F.length + 1 - nx; nx++; });
  return shapes[sides] = {V, F, vals};
}

/* ---------- etichette (atlante di testo, uno spazio per faccia) ---------- */
const COLORS = {bg0:'#d4513a', bg1:'#7d2012', ink:'#f6dc98', edge:'rgba(246,220,152,.6)'};
function drawAtlas(sh, labels, vertexLabels, cols, cell){
  const rows = Math.ceil(sh.F.length / cols), cv = document.createElement('canvas'); cv.width = cols * cell; cv.height = rows * cell;
  const g = cv.getContext('2d');
  sh.F.forEach((f, i) => {
    const x0 = (i % cols) * cell, y0 = Math.floor(i / cols) * cell, gr = g.createLinearGradient(x0, y0, x0 + cell, y0 + cell);
    gr.addColorStop(0, COLORS.bg0); gr.addColorStop(1, COLORS.bg1); g.fillStyle = gr; g.fillRect(x0, y0, cell, cell);
    const R = sh.R[i], k = cell * .47 / R, cx = x0 + cell / 2, cy = y0 + cell / 2;
    const pt = m => { const d = sub(sh.V[m], f.c); return [cx + dot(d, f.u) * k, cy - dot(d, f.v) * k]; };
    g.strokeStyle = COLORS.edge; g.lineWidth = Math.max(2, cell / 70); g.beginPath();
    f.idx.forEach((m, a) => { const [px, py] = pt(m); a ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.stroke();
    g.fillStyle = COLORS.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (vertexLabels){   // d4: ogni angolo porta il numero del suo vertice
      g.font = `700 ${cell * .2}px Georgia, serif`;
      f.idx.forEach(m => { const [px, py] = pt(m); g.fillText(vertexLabels[m], cx + (px - cx) * .62, cy + (py - cy) * .62); });
    } else { const s = String(labels[i]); g.font = `700 ${cell * (s.length > 1 ? .3 : .38)}px Georgia, serif`; g.fillText(s + (s === '6' || s === '9' ? '.' : ''), cx, cy + cell * .02); }
  });
  return {cv, cols, rows};
}

/* ---------- il layer ---------- */
let L = null;   // {THREE, CANNON, renderer, canvas, ...}
async function layer(opts){
  if (L) return L;
  const [THREE, CANNON] = await libs();
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;opacity:0;transition:opacity .35s';
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true}); renderer.setClearColor(0, 0);
  renderer.shadowMap.enabled = !opts.low;
  L = {THREE, CANNON, canvas, renderer, low:!!opts.low, scene:new THREE.Scene(), cam:new THREE.PerspectiveCamera(38, 1, .1, 200), raf:0, token:0, dice:[]};
  L.scene.add(new THREE.AmbientLight(0xffffff, 1.35));
  const sun = new THREE.DirectionalLight(0xfff0d0, 2.6); sun.position.set(-5, 12, 6); L.scene.add(sun); L.sun = sun;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({opacity:.38})); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; L.scene.add(floor);
  addEventListener('resize', () => { if (L.active) fit(); });
  return L;
}
function fit(){
  const {renderer, cam, canvas} = L, w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, L.low ? 1 : 2)); renderer.setSize(w, h, false);
  const pxR = Math.max(34, Math.min(80, Math.min(w, h) * .09)), halfH = (h / 2) / pxR, halfW = (w / 2) / pxR;
  const H = halfH / Math.tan(cam.fov * Math.PI / 360);
  cam.aspect = w / h; cam.position.set(0, H, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
  L.arena = {W:halfW * .86, D:halfH * .84, H};
  const s = L.sun.shadow; s.camera.left = -halfW; s.camera.right = halfW; s.camera.top = halfH; s.camera.bottom = -halfH; s.camera.far = 60; s.camera.updateProjectionMatrix(); s.mapSize.set(1024, 1024);
}

function build(sides, tens){
  const {THREE} = L, sh = shape(sides === 100 ? 10 : sides);
  if (!sh.R) sh.R = sh.F.map(f => Math.max(...f.idx.map(m => len(sub(sh.V[m], f.c)))));
  const geo = new THREE.BufferGeometry(), P = [], N = [], U = [], cols = sides === 4 ? 4 : 5, cell = 192, rows = Math.ceil(sh.F.length / cols);
  sh.F.forEach((f, i) => {
    const cx = (i % cols + .5) / cols, cy = 1 - (Math.floor(i / cols) + .5) / rows, k = .47 / sh.R[i];
    const uv = m => { const d = sub(sh.V[m], f.c); return [cx + dot(d, f.u) * k / cols, cy + dot(d, f.v) * k / rows]; };
    for (let m = 1; m < f.idx.length - 1; m++) for (const a of [f.idx[0], f.idx[m], f.idx[m + 1]]){ P.push(...sh.V[a]); N.push(...f.n); U.push(...uv(a)); }
  });
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  const tex = new THREE.CanvasTexture(document.createElement('canvas')); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({map:tex, roughness:.4, metalness:.12, flatShading:true}));
  mesh.castShadow = !L.low;
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), new THREE.LineBasicMaterial({color:0xe7c878})); mesh.add(e);
  return {mesh, tex, sh, cols, cell, sides, tens, vals:sh.vals.slice(), vv:[1, 2, 3, 4]};
}
const label = (d, v) => d.sides === 100 ? (d.tens ? String((v % 10) * 10).padStart(2, '0') : String(v % 10)) : d.sides === 10 ? String(v % 10) : String(v);
function paint(d){
  const sh = d.sh, A = drawAtlas(sh, d.vals.map(v => label(d, v)), d.sides === 4 ? d.vv : null, d.cols, d.cell);
  d.tex.image = A.cv; d.tex.needsUpdate = true;
}

/* ---------- lancio ---------- */
function simulate(dice){
  const {CANNON} = L, {W, D} = L.arena, world = new CANNON.World({gravity:new CANNON.Vec3(0, -42, 0)});
  world.allowSleep = true; world.defaultContactMaterial.friction = .32; world.defaultContactMaterial.restitution = .38;
  const wall = (n, p) => { const b = new CANNON.Body({mass:0}); b.addShape(new CANNON.Plane()); b.quaternion.setFromVectors(new CANNON.Vec3(0, 0, 1), new CANNON.Vec3(...n)); b.position.set(...p); world.addBody(b); };
  wall([0, 1, 0], [0, 0, 0]); wall([0, -1, 0], [0, 9, 0]); wall([1, 0, 0], [-W, 0, 0]); wall([-1, 0, 0], [W, 0, 0]); wall([0, 0, 1], [0, 0, -D]); wall([0, 0, -1], [0, 0, D]);
  const rnd = (a, b) => a + Math.random() * (b - a), bodies = dice.map((d, i) => {
    const sh = d.sh, b = new CANNON.Body({mass:1, sleepSpeedLimit:.9, sleepTimeLimit:.25, linearDamping:.04, angularDamping:.12});
    b.addShape(new CANNON.ConvexPolyhedron({vertices:sh.V.map(v => new CANNON.Vec3(...v)), faces:sh.F.map(f => f.idx.slice())}));
    const n = dice.length; b.position.set((i - (n - 1) / 2) * Math.min(2.7, (2 * W * .8) / Math.max(1, n)), 3 + (i % 3) * .9, D * .8);
    b.velocity.set(rnd(-4, 4) - (i - (n - 1) / 2) * .6, rnd(-2, 2), -rnd(15, 24));
    b.angularVelocity.set(rnd(-24, 24), rnd(-24, 24), rnd(-24, 24));
    b.quaternion.setFromEuler(rnd(0, 6.28), rnd(0, 6.28), rnd(0, 6.28)); world.addBody(b); return b;
  });
  const frames = [], step = 1 / 120;
  for (let t = 0; t < 600; t++){
    world.step(step);
    if (t % 2) frames.push(bodies.map(b => [b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w]));
    if (t > 90 && bodies.every(b => b.sleepState === 2)) break;
  }
  frames.push(frames[frames.length - 1]); return frames;
}

// faccia (o vertice del d4) che sta in alto nell'ultimo fotogramma; poi scambia le etichette per mostrare il valore voluto
function settle(dice, last){
  const {THREE} = L;
  dice.forEach((d, i) => {
    const f = last[i], q = new THREE.Quaternion(f[3], f[4], f[5], f[6]), sh = d.sh;
    if (d.sides === 4){
      let top = 0, y = -9; sh.V.forEach((v, m) => { const w = new THREE.Vector3(...v).applyQuaternion(q).y; if (w > y) { y = w; top = m; } });
      const g = d.vv.indexOf(d.want); [d.vv[top], d.vv[g]] = [d.vv[g], d.vv[top]]; d.topFace = -1;
    } else {
      let top = 0, y = -9; sh.F.forEach((fc, m) => { const w = new THREE.Vector3(...fc.n).applyQuaternion(q).y; if (w > y) { y = w; top = m; } });
      const g = d.vals.indexOf(d.want); [d.vals[top], d.vals[g]] = [d.vals[g], d.vals[top]]; d.topFace = top;
    }
    paint(d);
  });
}

export async function rollDice(list, opts = {}){
  const items = [];
  for (const e of list.slice(0, 12)){
    if (e.s === 100){ const t = e.v === 100 ? 0 : Math.floor(e.v / 10), u = e.v === 100 ? 0 : e.v % 10; items.push({s:100, tens:true, want:t || 10}, {s:100, tens:false, want:u || 10}); }
    else if (SIDES.includes(e.s)) items.push({s:e.s, want:e.v});
  }
  if (!items.length) return;
  await layer(opts);
  const my = ++L.token, {THREE} = L; L.active = true; fit();
  for (const d of L.dice) { L.scene.remove(d.mesh); d.mesh.geometry.dispose(); d.tex.dispose(); }
  L.dice = items.map(it => Object.assign(build(it.s, it.tens), {want:it.want}));
  items.forEach((it, i) => { const d = L.dice[i]; paint(d); });
  const frames = simulate(L.dice); settle(L.dice, frames[frames.length - 1]);
  L.dice.forEach(d => L.scene.add(d.mesh)); cancelAnimationFrame(L.raf); L.canvas.style.opacity = '1';
  const still = matchMedia('(prefers-reduced-motion:reduce)').matches, t0 = performance.now(), total = frames.length / 60 * 1000;
  // alla fine, il numero sopra si raddrizza (rotazione attorno alla verticale: la fisica non cambia, è solo estetica)
  const last = frames[frames.length - 1], yaw = L.dice.map((d, i) => {
    const q = new THREE.Quaternion(last[i][3], last[i][4], last[i][5], last[i][6]); let a = 0;
    if (d.topFace >= 0){ const up = new THREE.Vector3(...d.sh.F[d.topFace].v).applyQuaternion(q); a = Math.atan2(up.x, -up.z); }   // verso l'alto dello schermo = -z
    return a;
  });
  return new Promise(res => {
    const frame = now => {
      if (L.token !== my) return res();
      const el = Math.max(0, now - t0), k = still ? frames.length - 1 : Math.min(frames.length - 1, Math.floor(el / 1000 * 60)), fr = frames[k];
      const ease = Math.max(0, Math.min(1, (el - total) / 350));
      L.dice.forEach((d, i) => {
        const f = fr[i], q = new THREE.Quaternion(f[3], f[4], f[5], f[6]);
        if (ease) q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw[i] * ease));
        d.mesh.position.set(f[0], f[1], f[2]); d.mesh.quaternion.copy(q);
      });
      L.renderer.render(L.scene, L.cam);
      if (el < total + 350 || still && el < 50) L.raf = requestAnimationFrame(frame);
      else { res(); setTimeout(() => { if (L.token === my){ L.canvas.style.opacity = '0'; setTimeout(() => { if (L.token === my){ L.active = false; for (const d of L.dice) L.scene.remove(d.mesh); L.renderer.clear(); } }, 400); } }, 1500); }
    };
    L.raf = requestAnimationFrame(frame);
  });
}
// risultato mostrato per ogni dado dell'ultimo lancio, per i test
export const shown = () => L ? L.dice.map(d => d.sides === 4 ? d.want : d.sides === 100 ? (d.tens ? 't' : 'u') + d.want : d.want) : [];
