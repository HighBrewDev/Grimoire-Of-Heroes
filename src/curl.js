// Foglio che si gira: la pagina (già fotografata come copia del DOM) è tagliata in strisce affiancate che si piegano.
// Prima ogni fotogramma riscriveva ~40 stili da JavaScript sul thread principale (e ogni faccia era un layer a parte).
// Ora il moto è calcolato UNA volta (fotogrammi chiave campionati dalla stessa formula) e gira come Web Animations su transform e
// opacity: lo esegue il compositor, il thread principale resta libero e il giro non scatta nemmeno sotto carico.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = t => t * t * t * (t * (t * 6 - 15) + 10);
const curlAt = (t, K) => -K * Math.sin(2 * Math.PI * t) * (1 - .35 * t) - K * .45 * Math.sin(Math.PI * t);
const STEPS = 36;

export function curlLeaf(book, geo, content, {strips, dur = 1000, back = false, curl = 64} = {}){
  const {top, left, w, h} = geo, sw = w / strips, els = [], segs = [];
  for (let i = 0; i < strips; i++){
    const s = document.createElement('div'); s.className = 'strip';
    s.style.cssText = `top:${top}px;left:${left}px;width:${Math.ceil(sw) + 1}px;height:${h}px;z-index:20;opacity:1`;
    const f = document.createElement('div'); f.className = 'face front';
    if (content){ const c = i ? content.cloneNode(true) : content; c.style.width = w + 'px'; c.style.marginLeft = (-i * sw) + 'px'; f.appendChild(c); }
    else f.classList.add('blank');
    const shF = document.createElement('div'); shF.className = 'shade'; f.appendChild(shF);
    const b = document.createElement('div'); b.className = 'face back';
    b.style.backgroundPosition = `${-(strips - 1 - i) * sw}px 0`; b.style.backgroundSize = `${w}px ${h}px`;
    const shB = document.createElement('div'); shB.className = 'shade'; b.appendChild(shB);
    s.append(f, b); book.appendChild(s); els.push(s); segs.push({s, f, b, shF, shB});
  }
  const wts = segs.map((_, i) => i ? Math.pow(i / (strips - 1), 1.35) - Math.pow((i - 1) / (strips - 1), 1.35) : 0);
  // campionamento: per ogni istante, angolo e posizione di ogni striscia (stessa integrazione di prima)
  const K = segs.map(() => ({tr:[], fade:[], shF:[], shB:[]}));
  for (let k = 0; k <= STEPS; k++){
    const t = k / STEPS, p = back ? 1 - t : t, e = smooth(p), c = curlAt(p, curl);
    let A = -180 * e, x = 0, z = 0;
    for (let i = 0; i < strips; i++){
      if (i){ const pa = A * Math.PI / 180; x += sw * Math.cos(pa); z += -sw * Math.sin(pa); A += c * wts[i]; }
      A = clamp(A, -180, 0);
      const ar = -A * Math.PI / 180, lit = Math.sin(ar), fade = clamp((A + 172) / 60, 0, 1);
      K[i].tr.push({transform:`translate3d(${x.toFixed(1)}px,0,${(z + .5).toFixed(1)}px) rotateY(${A.toFixed(2)}deg)`, offset:t});
      K[i].fade.push({opacity:+fade.toFixed(3), offset:t});
      K[i].shF.push({opacity:+(A > -90 ? lit * .62 : 1).toFixed(2), offset:t});
      K[i].shB.push({opacity:+(A < -90 ? lit * .45 : 1).toFixed(2), offset:t});
    }
  }
  const opt = {duration:dur, easing:'linear', fill:'both'}, anims = [];
  segs.forEach((g, i) => {
    anims.push(g.s.animate(K[i].tr, opt), g.f.animate(K[i].fade, opt), g.b.animate(K[i].fade, opt), g.shF.animate(K[i].shF, opt), g.shB.animate(K[i].shB, opt));
  });
  const finished = Promise.all(anims.map(a => a.finished.catch(() => {})));
  return {els, finished, cancel(){ anims.forEach(a => { try { a.cancel(); } catch (e) {} }); }};
}
