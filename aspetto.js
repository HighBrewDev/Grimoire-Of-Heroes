/* Grimoire of Heroes · Aspetto (appearance): themes as data, effects level, the picker screen.
   Colours live in style.css as custom properties (:root[data-theme="…"]); this file holds the list (names, tone, swatches),
   remembers the choice (own key, hero data untouched) and sets two attributes on <html>:
     data-theme   = palette id (absent for the two base themes, Parchment and Night)
     data-effects = full | reduced | off   (default: reduced when the system asks for reduced motion)
   index.html hands over what the picker needs through Aspetto.attach(); until then nothing here needs the app. */
(function(){
'use strict';
const KEY = 'grimoire-aspetto-v1';

/** Themes. tone = which page tone (data-book) the palette is built on; sw = three swatches: desk, page, accent. */
const THEMES = [
  {id:'pergamena', name:'Parchment', tone:'day',   sw:['#3b2416', '#f3e6c4', '#c9a227'], note:'Warm paper on a leather tome. The original.'},
  {id:'bosco',     name:'Forest',    tone:'day',   sw:['#24402f', '#e9eed6', '#c3b25a'], note:'Sage paper, green leather.'},
  {id:'notte',     name:'Night',     tone:'night', sw:['#3b2416', '#231c16', '#d6b447'], note:'Dark pages, gold ink. Easy on the eyes at the table.'},
  {id:'brace',     name:'Ember',     tone:'night', sw:['#4a1a14', '#1f1715', '#e0a043'], note:'Charcoal pages, red leather, amber ink.'},
  {id:'marea',     name:'Tide',      tone:'night', sw:['#16304f', '#15202e', '#b9c6d6'], note:'Deep blue pages, silver ink.'},
];
const BASE = {day:'pergamena', night:'notte'};
const FX = [
  {id:'full',    name:'Full',    note:'Textures, page turns and every flourish.'},
  {id:'reduced', name:'Reduced', note:'Fainter textures, shorter motion. Easier on a phone.'},
  {id:'off',     name:'Off',     note:'Flat paper, no motion. Fastest.'},
];

const root = document.documentElement;
const sysReduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
let st = {theme:null, effects:null};
try { const j = JSON.parse(localStorage.getItem(KEY) || '{}'); if (j && typeof j === 'object') st = {theme:j.theme || null, effects:j.effects || null}; } catch (e) {}
const themeOf = id => THEMES.find(t => t.id === id);
const effects = () => FX.some(f => f.id === st.effects) ? st.effects : (window.Fx && Fx.suggest ? Fx.suggest() : (sysReduced() ? 'reduced' : 'full')); // Fx.suggest(): effects module (weak phone = off)
let host = null;

function store(){ try { localStorage.setItem(KEY, JSON.stringify({theme:st.theme, effects:st.effects})); } catch (e) {} }
function paint(){
  const t = themeOf(st.theme);
  if (t && t.id !== BASE[t.tone]) root.dataset.theme = t.id; else delete root.dataset.theme;
  root.dataset.effects = effects();
}
/** Which theme is in force given the page tone (the old sun/moon button flips the tone): keep the chosen one if it fits, else the base of that tone. */
function sync(tone){
  const t = themeOf(st.theme);
  if (!t || t.tone !== tone){ st.theme = BASE[tone] || BASE.day; store(); }
  paint();
  const open = document.querySelector('#modalBk .aspetto'); if (open) fill(open);
}
function setTheme(id){
  const t = themeOf(id); if (!t) return;
  if (id !== 'pergamena' && host && host.plusOK && !host.plusOK()){ host.plusModal('themes'); return; }
  st.theme = id; store();
  if (host) host.setTone(t.tone); // saves the tone in the app's own prefs and re-runs applyTheme() → sync()
  else { root.dataset.book = t.tone; paint(); }
  paint();
}
function setEffects(id){
  if (!FX.some(f => f.id === id)) return;
  st.effects = id; store(); paint();
  const open = document.querySelector('#modalBk .aspetto'); if (open) fill(open);
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
function fill(box){
  const cur = themeOf(st.theme) || themeOf(BASE.day), fx = effects();
  box.querySelector('[data-grp="theme"]').innerHTML = THEMES.map(t =>
    `<button type="button" class="themeOpt" role="radio" aria-checked="${t.id === cur.id}" data-aspetto-theme="${t.id}">
      <span class="themeSw" aria-hidden="true">${t.sw.map(c => `<i style="background:${c}"></i>`).join('')}</span>
      <b>${esc(t.name)}</b><small>${esc(t.note)}</small></button>`).join('');
  box.querySelector('[data-grp="fx"]').innerHTML = FX.map(f =>
    `<button type="button" class="themeOpt" role="radio" aria-checked="${f.id === fx}" data-aspetto-fx="${f.id}">
      <b>${esc(f.name)}</b><small>${esc(f.note)}</small></button>`).join('');
}
function open(){
  if (!host) return;
  const bk = host.modal(`<div class="aspetto">
    <div class="head"><h2>Appearance</h2><span class="spacer"></span>${host.closeBtn()}</div>
    <p class="sub">How the tome looks. It is only paint: your heroes are never touched.</p>
    <fieldset><legend>Theme</legend><div class="themeGrid" role="radiogroup" aria-label="Theme" data-grp="theme"></div></fieldset>
    <fieldset><legend>Effects</legend><div class="fxOpts" role="radiogroup" aria-label="Effects level" data-grp="fx"></div>
      <p class="muted" style="margin:.6em 0 0">${sysReduced() ? 'Your device asks for reduced motion, so Reduced is the starting point.' : 'Pick Reduced or Off if the tome feels slow.'}</p></fieldset>
  </div>`, {label:'Appearance'});
  const box = bk.querySelector('.aspetto'); fill(box);
  box.addEventListener('click', e => {
    const th = e.target.closest('[data-aspetto-theme]'), fx = e.target.closest('[data-aspetto-fx]');
    if (th) setTheme(th.dataset.aspettoTheme); else if (fx) setEffects(fx.dataset.aspettoFx);
  });
}

window.Aspetto = {
  THEMES, FX, open, sync, setTheme, setEffects, effects,
  /** host = {modal, closeBtn, plusOK, plusModal, setTone(tone)}: what the picker needs from the app. */
  attach(h){ host = h; },
};
paint();
})();
