// Grimoire of Heroes · livello effetti (fase 6). Modulo isolato: nessuna dipendenza, non conosce la logica dell'app.
// Legge soltanto html[data-effects="full|reduced|off"] (lo possiede il design system, vedi "Aspetto"); se manca, vale "off".
// API: init(), level(), suggest(), transition(fn, kind), measure(ms), dice (vedi dice3d.js).
const root = document.documentElement;
export const level = () => ({full:'full', reduced:'reduced'})[root.dataset.effects] || 'off';
const coarse = () => matchMedia('(pointer:coarse)').matches;

// Livello consigliato quando l'utente non ha ancora scelto: telefono debole = spento, ridotto OS = ridotto.
export function suggest(){
  const weak = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  if (coarse() && weak) return 'off';
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return 'reduced';
  return coarse() ? 'reduced' : 'full';
}

// Misura del frame time: ms tra un frame e il successivo, per `ms` millisecondi.
export function measure(ms = 2000){
  return new Promise(res => {
    const d = []; let last = 0, t0 = 0;
    const tick = t => {
      if (!t0) t0 = t;
      if (last) d.push(t - last);
      last = t;
      if (t - t0 < ms) requestAnimationFrame(tick);
      else {
        const s = [...d].sort((a, b) => a - b), q = p => s[Math.min(s.length - 1, Math.floor(s.length * p))] || 0;
        res({frames:d.length, medianMs:+q(.5).toFixed(1), p95Ms:+q(.95).toFixed(1), maxMs:+(s[s.length - 1] || 0).toFixed(1),
          fps:+(d.length / (ms / 1000)).toFixed(1), slow:d.filter(x => x > 20).length});
      }
    };
    requestAnimationFrame(tick);
  });
}

// Transizione fra capitoli: View Transitions se ci sono e gli effetti sono accesi, altrimenti si aggiorna e basta.
// L'app la usa così: Effects.transition(() => render()). Restituisce una promessa che finisce quando la pagina è aggiornata.
export function transition(update, kind = 'page'){
  const vt = document.startViewTransition;
  if (level() === 'off' || typeof vt !== 'function') { update(); return Promise.resolve(); }
  root.dataset.fxVt = kind;
  const t = vt.call(document, () => { update(); });
  const done = () => { delete root.dataset.fxVt; };
  t.finished.then(done, done);
  return t.updateCallbackDone.catch(() => {});
}

// Copertina: braci su canvas dietro il libro + inclinazione al puntatore (solo "full"); "reduced" ha solo il luccichio CSS.
function embers(host){
  const cv = document.createElement('canvas'); cv.className = 'fxEmbers'; cv.setAttribute('aria-hidden', 'true');
  host.prepend(cv);
  const ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let w = 0, h = 0, raf = 0, last = 0, ema = 16, frames = 0, ps = [];
  const resize = () => { w = host.clientWidth; h = host.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  const spawn = (fromBottom) => ({x:Math.random() * w, y:fromBottom ? h + 10 : Math.random() * h, r:.6 + Math.random() * 1.8,
    vy:12 + Math.random() * 38, vx:(Math.random() - .5) * 14, ph:Math.random() * 6.28, a:.25 + Math.random() * .6});
  resize(); ps = Array.from({length:w < 600 ? 26 : 56}, () => spawn(false));
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  const kill = reason => { stop(); cv.remove(); ro.disconnect(); document.removeEventListener('visibilitychange', vis); if (reason) root.dispatchEvent(new CustomEvent('fx:degraded', {detail:reason})); };
  const vis = () => { if (document.hidden) stop(); else if (!raf) { last = 0; raf = requestAnimationFrame(loop); } };
  function loop(t){
    if (!host.isConnected || host.hidden || level() !== 'full') return kill();
    const dt = last ? Math.min((t - last) / 1000, .05) : .016; if (last) { ema = ema * .92 + (t - last) * .08; frames++; } last = t;
    // guardia: se il telefono arranca, prima dimezza le braci, poi le spegne
    if (frames === 50 && ema > 26) ps.length >>= 1;
    if (frames === 110 && ema > 26) return kill('slow');
    ctx.clearRect(0, 0, w, h);
    for (const p of ps){
      p.y -= p.vy * dt; p.x += (p.vx + Math.sin(t / 900 + p.ph) * 10) * dt;
      if (p.y < -10) Object.assign(p, spawn(true));
      const k = Math.min(1, p.y / (h * .35)) * p.a;
      ctx.globalAlpha = k * .25; ctx.fillStyle = '#ff9d3c'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.2, 0, 6.283); ctx.fill();
      ctx.globalAlpha = k; ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    }
    raf = requestAnimationFrame(loop);
  }
  const ro = new ResizeObserver(resize); ro.observe(host);
  document.addEventListener('visibilitychange', vis);
  raf = requestAnimationFrame(loop);
}

function tilt(host){
  const book = host.querySelector('.cover'); if (!book || coarse()) return;
  let pending = 0, x = 0, y = 0;
  const on = e => { x = e.clientX / innerWidth - .5; y = e.clientY / innerHeight - .5;
    if (!pending) pending = requestAnimationFrame(() => { pending = 0; if (!host.isConnected || level() !== 'full') return;
      book.style.setProperty('--fxRy', (x * 9).toFixed(2) + 'deg'); book.style.setProperty('--fxRx', (-y * 7).toFixed(2) + 'deg'); }); };
  host.addEventListener('pointermove', on);
}

let bound = new WeakSet();
function bindCover(){
  const host = document.getElementById('coverBk');
  if (!host || host.hidden || host.classList.contains('opening') || level() !== 'full') return;
  if (host.querySelector('.fxEmbers')) return;
  embers(host);
  if (!bound.has(host)) { bound.add(host); tilt(host); }
}

let started = false;
export function init(){
  if (started) return; started = true;
  const check = () => bindCover();
  new MutationObserver(check).observe(root, {attributes:true, attributeFilter:['data-effects']});
  new MutationObserver(check).observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['hidden']});
  check();
}
export default {init, level, suggest, transition, measure};
