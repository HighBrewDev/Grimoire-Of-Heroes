// Dado 3D di prova (d6 e d20), CSS 3D + Web Animations, nessuna libreria. Prototipo: i numeri del d20 non seguono la disposizione dei dadi veri
// (facce opposte sommano 21). Non conosce l'app: roll() restituisce il valore e basta, chi lo usa decide cosa farne.
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(...a), norm = a => a.map(x => x / len(a)), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mul = (A, B) => A.map((r, i) => B[0].map((_, j) => r.reduce((s, _, k) => s + A[i][k] * B[k][j], 0)));
const css = M => `matrix3d(${[0, 1, 2].map(c => [M[0][c], M[1][c], M[2][c], 0].join(',')).join(',')},0,0,0,1)`;

// geometria: facce con normale n, asse u (destra), vertice alto (solo triangoli)
function cube(){
  const F = [[1, [0, 0, 1], [1, 0, 0]], [6, [0, 0, -1], [-1, 0, 0]], [3, [1, 0, 0], [0, 0, -1]], [4, [-1, 0, 0], [0, 0, 1]], [2, [0, -1, 0], [1, 0, 0]], [5, [0, 1, 0], [1, 0, 0]]];
  return F.map(([value, n, u]) => ({value, n, u, c:n.map(x => x * .5), tri:false}));
}
function icosa(){
  const p = (1 + Math.sqrt(5)) / 2, V = [];
  for (const a of [-1, 1]) for (const b of [-p, p]) V.push([0, a, b], [a, b, 0], [b, 0, a]);
  const F = [];
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) for (let k = j + 1; k < 12; k++)
    if ([[i, j], [j, k], [i, k]].every(([x, y]) => Math.abs(len(sub(V[x], V[y])) - 2) < 1e-6)) F.push([V[i], V[j], V[k]]);
  const faces = F.map(([A, B, C]) => {
    const c = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3, (A[2] + B[2] + C[2]) / 3], n = norm(c);
    const v = norm(sub(c, A)), u = norm(cross(v, n));      // v = giù, A = vertice in alto
    return {n, u, c:c.map(x => x / 2), tri:true};
  });
  const used = new Set(); let val = 1;
  faces.forEach((f, i) => { if (f.value) return; const j = faces.findIndex((g, k) => k !== i && dot(g.n, f.n) < -.999); f.value = val; faces[j].value = 21 - val; val++; });
  return faces;
}
// rotazione che porta la normale verso l'osservatore (+z) e raddrizza il numero
function facing(f){
  const z = [0, 0, 1], ax = cross(f.n, z), s = len(ax), c = dot(f.n, z);
  let R;
  if (s < 1e-9) R = c > 0 ? [[1, 0, 0], [0, 1, 0], [0, 0, 1]] : [[1, 0, 0], [0, -1, 0], [0, 0, -1]];
  else { const [x, y, w] = norm(ax), k = 1 - c; R = [[c + x * x * k, x * y * k - w * s, x * w * k + y * s], [y * x * k + w * s, c + y * y * k, y * w * k - x * s], [w * x * k - y * s, w * y * k + x * s, c + w * w * k]]; }
  const ru = [0, 1, 2].map(i => R[i][0] * f.u[0] + R[i][1] * f.u[1] + R[i][2] * f.u[2]), t = -Math.atan2(ru[1], ru[0]);
  const Z = [[Math.cos(t), -Math.sin(t), 0], [Math.sin(t), Math.cos(t), 0], [0, 0, 1]];
  return mul(Z, R);
}

export function createDie(host, {sides = 20, size = 120} = {}){
  const faces = sides === 6 ? cube() : icosa(), edge = sides === 6 ? size * .72 : size * .66;
  const scale = edge, wrap = document.createElement('div'), die = document.createElement('div');
  wrap.className = 'fxDieWrap'; die.className = 'fxDie d' + sides; wrap.style.setProperty('--s', size + 'px'); wrap.appendChild(die);
  const w = edge, h = sides === 6 ? edge : edge * Math.sqrt(3) / 2;
  for (const f of faces){
    const el = document.createElement('div'); el.className = 'fxFace' + (f.tri ? ' tri' : ''); el.textContent = f.value;
    const v = cross(f.n, f.u); // giù
    const M = [[f.u[0], v[0], f.n[0]], [f.u[1], v[1], f.n[1]], [f.u[2], v[2], f.n[2]]];
    el.style.cssText = `width:${w}px;height:${h}px;left:${-w / 2}px;top:${f.tri ? -h * 2 / 3 : -h / 2}px;transform-origin:50% ${f.tri ? '66.667%' : '50%'};` +
      `transform:translate3d(${f.c[0] * scale}px,${f.c[1] * scale}px,${f.c[2] * scale}px) ${css(M)}`;
    die.appendChild(el); f.el = el;
  }
  host.appendChild(wrap);
  let cur = css([[1, 0, 0], [0, 1, 0], [0, 0, 1]]), rolling = false;
  const to = f => css(facing(f));
  function roll(value){
    if (rolling) return Promise.resolve(null);
    const f = value ? faces.find(x => x.value === value) : faces[Math.floor(Math.random() * faces.length)];
    rolling = true; const end = to(f);
    const a = [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1].join(','), still = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const spin = die.animate([{transform:cur}, {transform:`rotate3d(${a},${540 + Math.random() * 360}deg)`, offset:.6}, {transform:end}],
      {duration:still ? 1 : 1150, easing:'cubic-bezier(.2,.7,.2,1)', fill:'forwards'});
    wrap.animate([{transform:'translateY(0)'}, {transform:`translateY(${-size * .55}px)`, offset:.35}, {transform:'translateY(0)', offset:.7}, {transform:`translateY(${-size * .12}px)`, offset:.85}, {transform:'translateY(0)'}],
      {duration:still ? 1 : 1150, easing:'ease-out'});
    return spin.finished.then(() => { cur = end; die.style.transform = end; spin.cancel(); rolling = false; die.dataset.value = f.value; return f.value; });
  }
  die.style.transform = cur;
  return {roll, el:wrap, faces:faces.length, destroy:() => wrap.remove()};
}
