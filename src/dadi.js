// Tiri di dado puri, senza stato né DOM (usciti da app.js).
import {clamp} from './util.js';
export function rollExpr(expr){
  const src = String(expr).replace(/\s+/g, '').replace(/−/g, '-');
  const terms = src.match(/[+-]?[^+-]+/g) || [];
  let total = 0; const parts = [];
  for (let t of terms){
    const sign = t[0] === '-' ? -1 : 1; t = t.replace(/^[+-]/, '');
    const m = t.match(/^(\d*)d(\d+)$/i);
    if (m){
      const n = clamp(+m[1] || 1, 1, 100), s = +m[2];
      const rs = Array.from({length:n}, () => 1 + Math.floor(Math.random() * s));
      total += sign * rs.reduce((a, b) => a + b, 0); parts.push((sign < 0 ? '−' : '') + '[' + rs.join('+') + ']');
    } else if (/^\d+$/.test(t)){ total += sign * +t; parts.push((sign < 0 ? '−' : '+') + t); }
  }
  return {total, parts:parts.join(' ').replace(/^\+/, '')};
}
export function d20(adv){
  const a = 1 + Math.floor(Math.random() * 20);
  if (!adv) return {nat:a, txt:`[${a}]`};
  const b = 1 + Math.floor(Math.random() * 20);
  const nat = adv > 0 ? Math.max(a, b) : Math.min(a, b);
  return {nat, txt:`[${a}, ${b}]${adv > 0 ? ' adv' : ' dis'}`};
}
