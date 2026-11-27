// Piccole funzioni comuni (uscite da app.js).
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const mod = score => Math.floor(((+score || 10) - 10) / 2);
export const fmt = m => (m >= 0 ? '+' : '') + m;
export const profFor = lvl => 2 + Math.floor((Math.max(1, lvl) - 1) / 4);
export const uid = () => 'c' + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 15) : Math.random().toString(36).slice(2, 12) + Date.now().toString(36));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const norm = s => String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
export const title = s => String(s).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.effects === 'off';
export const act = (name, arg, label, cls = 'sb', extra = '') =>
  `<button type="button" class="${cls}" data-act="${name}"${arg !== undefined ? ` data-arg="${esc(arg)}"` : ''} ${extra}>${label}</button>`;
export const xref = (name, label) => `<button type="button" class="xref" data-act="detail" data-arg="${esc(name)}">${esc(label || name)}</button>`;
