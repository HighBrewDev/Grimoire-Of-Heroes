import {$, $$, esc, mod, fmt, profFor, uid, clamp, norm, title, reduceMotion, act, xref} from './util.js';
import {ABIL, ABIL_ID, PORTRAITS, ALIGN, XP_TABLE, SPELL_AB, ICON_BOOK} from './costanti.js';
import {rollExpr, d20} from './dadi.js';

/* Grimoire of Heroes — app logic (fifth edition, 2024 rules) */
(function(){
'use strict';

/* ================================================================== utils */
/* ================================================================== data */
const DND = window.DND || {};
let SRD = {};
SRD = window.SRD_DATA || {}; if (!window.SRD_DATA) console.warn('SRD data missing');
const EXT = [];               // entries imported by the user (5etools-format JSON), loaded from IndexedDB

/* Normalise the hand-written quick summaries into the same shapes as the SRD so one renderer serves both. */
const QUICK = {
  spells: (DND.SPELLS || []).map(s => ({n:s.n, lv:s.lvl, sc:s.school, t:s.time, r:s.range, c:s.comp, d:s.dur, x:s.desc, h:s.up})),
  feats: (DND.FEATS || []).map(f => ({n:f.n, ty:f.t, pre:f.pre, x:f.d})),
  species: (DND.SPECIES || []).map(s => ({n:s.n, speed:parseInt(s.speed) || 30, size:/small/i.test(s.life) ? 'Small' : 'Medium', life:s.life, x:s.desc, tr:(s.traits || []).map(t => { const m = t.match(/^([^:]{2,40}):\s*(.*)$/); return m ? {n:m[1], x:m[2]} : {n:'', x:t}; })})),
  backgrounds: (DND.BACKGROUNDS || []).map(b => ({n:b.n, asi:b.asi, feat:b.feat, skills:b.skills, tools:[b.tool], x:b.desc})),
  classes: (DND.CLASSES || []).map(c => ({n:c.n, hd:parseInt(String(c.hd).replace('d', '')) || 8, prim:c.primary, saves:c.saves.map(s => s.slice(0, 3).toUpperCase()), prof:[c.armor, c.weapons, c.tools].filter(Boolean), x:c.desc, f:(c.feats || []).map(f => ({l:f.l, n:f.n, x:f.d || ''})), subsQuick:c.subs, master:c.master})),
  subclasses: Object.entries(DND.SUBCLASS || {}).map(([n, s]) => ({n, cls:s.cls, x:s.desc, srcBook:s.src, f:s.feats.map(f => ({l:f.l, n:f.n, x:f.d}))})),
  conditions: (DND.CONDITIONS || []).map(c => ({n:c.n, x:c.d})),
  rules: [...(DND.ACTIONS || []).map(a => ({n:a.n, x:a.d, kind:'Action'})), ...(DND.MASTERY || []).map(a => ({n:a.n, x:a.d, kind:'Weapon Mastery'}))],
};

const CATS = [
  {id:'spells', t:'Spells'}, {id:'classes', t:'Classes'}, {id:'subclasses', t:'Subclasses'}, {id:'species', t:'Species'},
  {id:'backgrounds', t:'Backgrounds'}, {id:'feats', t:'Feats'}, {id:'equipment', t:'Equipment'}, {id:'items', t:'Magic Items'},
  {id:'monsters', t:'Creatures'}, {id:'conditions', t:'Conditions'}, {id:'rules', t:'Rules'}, {id:'features', t:'Class Features'}, {id:'other', t:'Other'}];
const CAT_NAME = Object.fromEntries(CATS.map(c => [c.id, c.t]));
const SCHOOL = {A:'Abjuration',C:'Conjuration',D:'Divination',E:'Enchantment',V:'Evocation',I:'Illusion',N:'Necromancy',T:'Transmutation',P:'Psionic'};

function srdEntries(){
  const out = [];
  const push = (cat, o, k) => out.push({cat, n:o.n, o, src:'SRD', k:k || ''});
  (SRD.spells || []).forEach(s => push('spells', s, s.lv ? `Lv ${s.lv} · ${s.sc}` : `Cantrip · ${s.sc}`));
  (SRD.classes || []).forEach(c => {
    push('classes', c, `d${c.hd} · ${c.prim}`);
    (c.subs || []).forEach(s => push('subclasses', {...s, cls:c.n}, c.n));
    (c.f || []).forEach(f => push('features', {...f, cls:c.n}, `${c.n} ${f.l}`));
    (c.subs || []).forEach(s => (s.f || []).forEach(f => push('features', {...f, cls:c.n, sub:s.n}, `${s.n} ${f.l}`)));
  });
  (SRD.species || []).forEach(s => push('species', s, `${s.size} · ${s.speed} ft.`));
  (SRD.backgrounds || []).forEach(b => push('backgrounds', b, b.asi.join('/')));
  (SRD.feats || []).forEach(f => push('feats', f, f.ty));
  (SRD.equipment || []).forEach(e => push('equipment', e, e.cat));
  (SRD.items || []).forEach(i => push('items', i, i.rar));
  (SRD.monsters || []).forEach(m => push('monsters', m, 'CR ' + crStr(m.cr)));
  (SRD.conditions || []).forEach(c => push('conditions', c, 'Condition'));
  (SRD.mastery || []).forEach(c => push('rules', {...c, kind:'Weapon Mastery'}, 'Weapon Mastery'));
  (SRD.wprops || []).forEach(c => push('rules', {...c, kind:'Weapon Property'}, 'Weapon Property'));
  return out;
}
function quickEntries(have){
  const out = [];
  for (const [cat, arr] of Object.entries(QUICK)) arr.forEach(o => {
    if (have.has(cat + '|' + norm(o.n))) return;
    const k = cat === 'spells' ? (o.lv ? `Lv ${o.lv} · ${o.sc}` : `Cantrip · ${o.sc}`) : cat === 'feats' ? o.ty : cat === 'rules' ? o.kind : cat === 'subclasses' ? o.cls : '';
    out.push({cat, n:o.n, o, src:'Quick', k});
  });
  return out;
}
let ALL = [];
function buildIndex(){
  const base = srdEntries().concat(EXT);
  const have = new Set(base.map(e => e.cat + '|' + norm(e.n)));
  ALL = base.concat(quickEntries(have));
  ALL.forEach(e => { if (typeof e.n !== 'string') e.n = toTxt(e.n, 120); e.lc = norm(e.n); e.id = e.id || (e.src + ':' + e.cat + ':' + e.n + ':' + (txt5(e.o.cls) || txt5(e.o.source))); });
  ALL.sort((a, b) => String(a.n).localeCompare(String(b.n)));
}
const PRI = {SRD:0, Homebrew:1, Quick:2};
function find(name, cat){
  const q = norm(name); if (!q) return null;
  const hits = ALL.filter(e => e.lc === q && (!cat || e.cat === cat));
  if (!hits.length) return null;
  const order = ['spells','feats','conditions','species','backgrounds','classes','subclasses','rules','items','equipment','monsters','features','other'];
  hits.sort((a, b) => (PRI[a.src] ?? 1) - (PRI[b.src] ?? 1) || order.indexOf(a.cat) - order.indexOf(b.cat));
  return hits[0];
}
const quickFor = (cat, name) => (QUICK[cat] || []).find(o => norm(o.n) === norm(name));
const byId = id => ALL.find(e => e.id === id);

function crStr(cr){ return cr === 0.125 ? '1/8' : cr === 0.25 ? '1/4' : cr === 0.5 ? '1/2' : String(cr); }

/* ================================================================== text rendering */
const COND_NAMES = (SRD.conditions || []).map(c => c.n).concat(['Bloodied']);
const COND_RE = new RegExp('\\b(' + COND_NAMES.join('|') + ')\\b', 'g');
/* References, LaTeX-style. Imported text and hand-written homebrew can name anything: [[Fireball]], [[spell:Fireball]], [[Fireball|that fiery spell]].
   The name is looked up when the text is shown, in the SRD, in what was imported and in the person's own homebrew, so it links to whatever exists at that moment and stays plain words when nothing does.
   The older "[label](xref:Name)" form (saved by an earlier import) still works. */
const REF_RE = /\[\[(?:([a-z]+):)?([^\[\]\n|]+?)(?:\|([^\[\]\n]+?))?\]\]|\[([^\[\]\n]+?)\]\(xref:([^()\n]+?)\)/g;
const REF_CATS = {spell:['spells'], item:['items', 'equipment'], weapon:['items', 'equipment'], feat:['feats'], species:['species'], race:['species'], background:['backgrounds'], class:['classes'], subclass:['subclasses'],
  creature:['monsters'], monster:['monsters'], rule:['rules', 'conditions'], condition:['conditions'], skill:['rules'], action:['rules'], sense:['rules'], feature:['features', 'other'], other:['other', 'features'], deity:['other']};
const refFind = (pre, name) => { const cs = REF_CATS[pre]; if (!cs) return find(name); for (const c of cs){ const e = find(name, c); if (e) return e; } return find(name); };
function inline(s){
  const links = [];
  s = s.replace(REF_RE, (m, pre, nm, lab, lab2, nm2) => {
    const name = String(nm ?? nm2).trim().replace(/&#39;/g, "'").replace(/&amp;/g, '&'), text = String(lab ?? lab2 ?? nm).trim();
    const e = refFind(pre, name);
    links.push(e ? `<button type="button" class="xref" data-act="detailId" data-arg="${esc(e.id)}">${text}</button>` : text);
    return '\u0001' + (links.length - 1) + '\u0001'; });
  if (AUTOLINK) s = autolink(s, links);
  return inline0(s).replace(/\u0001(\d+)\u0001/g, (m, i) => links[+i]);
}
/* Names written in plain text link too, with no syntax to learn: only in imported and homebrew entries, only spells, items and feats,
   only with the exact capital letters, and only for names of 6+ letters or more than one word ("Light" in a normal sentence stays a word; [[spell:Light]] forces it). */
let AUTOLINK = false, AUTO_MAP = null, AUTO_N = -1;
function autoMap(){
  if (AUTO_MAP && AUTO_N === ALL.length) return AUTO_MAP;
  AUTO_MAP = new Map(); AUTO_N = ALL.length;
  for (const e of ALL){
    if (!['spells', 'items', 'equipment', 'feats'].includes(e.cat) || typeof e.n !== 'string' || !/^[A-Z]/.test(e.n) || !(e.n.length >= 6 || /\s/.test(e.n))) continue;
    for (const k of [e.n, esc(e.n)]) if (!AUTO_MAP.has(k) || (PRI[e.src] ?? 1) < (PRI[AUTO_MAP.get(k).src] ?? 1)) AUTO_MAP.set(k, e);
  }
  return AUTO_MAP;
}
function autolink(s, links){
  const map = autoMap(), words = [...s.matchAll(/[A-Za-z][A-Za-z'’-]*/g)];
  let out = '', pos = 0;
  for (let i = 0; i < words.length; i++){
    let hit = null, end = 0;
    for (let n = Math.min(5, words.length - i); n >= 1; n--){
      const a = words[i].index, b = words[i + n - 1].index + words[i + n - 1][0].length, t = s.slice(a, b);
      if (/[\u0001]/.test(t)) continue;
      const e = map.get(t); if (e){ hit = {e, a, b, t}; end = i + n - 1; break; }
    }
    if (!hit) continue;
    out += s.slice(pos, hit.a); pos = hit.b; i = end;
    links.push(`<button type="button" class="xref" data-act="detailId" data-arg="${esc(hit.e.id)}">${hit.t}</button>`);
    out += '\u0001' + (links.length - 1) + '\u0001';
  }
  return out + s.slice(pos);
}
function inline0(s){
  return s
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\*)/g, '$1<i>$2</i>')
    .replace(/\b(\d*d(?:4|6|8|10|12|20|100))(\s*[+−-]\s*\d+)?\b/g, (m, d, b) => `<button type="button" class="dice" data-act="roll" data-arg="${esc((d + (b || '')).replace(/\s|−/g, s => s === '−' ? '-' : ''))}">${m}</button>`)
    .replace(/(Attack Roll: )\+(\d+)/g, (m, a, b) => `${a}<button type="button" class="dice" data-act="roll" data-arg="1d20+${b}">+${b}</button>`)
    .replace(COND_RE, (m) => `<button type="button" class="xref" data-act="detail" data-arg="${m}">${m}</button>`);
}
/** SRD text: paragraphs split by newline, "**Name.**" run-ins, "a | b" tables, "- " lists. */
function md(text){
  if (!text) return '';
  const lines = esc(text).split(/\n/);
  let html = '', i = 0;
  while (i < lines.length){
    const ln = lines[i].trim();
    if (!ln){ i++; continue; }
    if (ln.includes(' | ')){
      const rows = [];
      while (i < lines.length && lines[i].includes(' | ')) rows.push(lines[i++].trim().split(/\s\|\s/));
      html += '<div class="tblWrap"><table><thead><tr>' + rows[0].map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
        rows.slice(1).map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>';
      continue;
    }
    if (/^[-*•]\s/.test(ln)){
      const items = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i].trim())) items.push(lines[i++].trim().replace(/^[-*•]\s/, ''));
      html += '<ul>' + items.map(t => `<li>${inline(t)}</li>`).join('') + '</ul>';
      continue;
    }
    html += `<p>${inline(ln)}</p>`; i++;
  }
  return `<div class="prose">${html}</div>`;
}

/* 5etools "entries" renderer — handles the common entry types and {@tag ...} markup. */
function tag5(s){
  let prev;
  do {
    prev = s;
    s = s.replace(/\{@(\w+)\s*([^{}]*?)\}/g, (m, t, body) => {
      const p = body.split('|'), txt = p[0];
      switch (t){
        case 'b': case 'bold': return `<b>${txt}</b>`;
        case 'i': case 'italic': return `<i>${txt}</i>`;
        case 'u': case 'underline': return `<u>${txt}</u>`;
        case 'dice': case 'damage': case 'scaledice': case 'scaledamage': {
          const ex = (t.startsWith('scale') ? p[2] || p[0] : p[0]).replace(/\s/g, '').replace(/×/g, '*');
          const lab = (t.startsWith('scale') ? p[2] : p[1]) || p[0];
          return /^\d*d\d+([+-]\d+)?$/.test(ex) ? `<button type="button" class="dice" data-act="roll" data-arg="${ex}">${lab}</button>` : lab;
        }
        case 'hit': return `<button type="button" class="dice" data-act="roll" data-arg="1d20${fmt(+txt || 0)}">${fmt(+txt || 0)}</button>`;
        case 'd20': return `<button type="button" class="dice" data-act="roll" data-arg="1d20${fmt(+txt || 0)}">${fmt(+txt || 0)}</button>`;
        case 'dc': return `DC ${txt}`;
        case 'chance': return `${txt}%`;
        case 'recharge': return `(Recharge ${txt ? txt + '–6' : '6'})`;
        case 'atk': return '<i>' + txt.split(',').map(a => ({mw:'Melee Weapon', rw:'Ranged Weapon', ms:'Melee Spell', rs:'Ranged Spell', m:'Melee', r:'Ranged'}[a.trim()] || a)).join(' or ') + ' Attack:</i>';
        case 'atkr': return '<i>' + txt.split(',').map(a => ({m:'Melee', r:'Ranged'}[a.trim()] || a)).join(' or ') + ' Attack Roll:</i>';
        case 'h': return '<i>Hit:</i> ';
        case 'm': return '<i>Miss:</i> ';
        case 'hom': return '<i>Hit or Miss:</i> ';
        case 'actSave': return `<i>${title(txt)} Saving Throw:</i>`;
        case 'actSaveFail': return '<i>Failure:</i>';
        case 'actSaveSuccess': return '<i>Success:</i>';
        case 'actTrigger': return '<i>Trigger:</i>';
        case 'actResponse': return '<i>Response:</i>';
        case 'spell': case 'condition': case 'item': case 'creature': case 'feat': case 'race': case 'background': case 'class': case 'status': case 'action': case 'skill': case 'sense': case 'variantrule': case 'disease': case 'optfeature': case 'deity':
          return `<button type="button" class="xref" data-act="detail" data-arg="${p[0]}">${p[2] || p[0]}</button>`;
        default: return p[2] || p[0];
      }
    });
  } while (s !== prev);
  return s;
}
function r5(e, depth = 0){
  if (e == null) return '';
  if (typeof e === 'string') return `<p>${tag5(esc(e))}</p>`;
  if (typeof e === 'number') return `<p>${e}</p>`;
  if (Array.isArray(e)) return e.map(x => r5(x, depth)).join('');
  const nm = e.name ? `<b>${tag5(esc(e.name))}.</b> ` : '';
  const kids = x => (x || []).map(y => r5(y, depth + 1)).join('');
  switch (e.type){
    case 'list':
      return '<ul>' + (e.items || []).map(it => `<li>${typeof it === 'string' ? tag5(esc(it)) : r5(it, depth + 1).replace(/^<p>|<\/p>$/g, '')}</li>`).join('') + '</ul>';
    case 'item':
      return `<p>${nm}${e.entry ? tag5(esc(e.entry)) : ''}</p>${e.entries ? kids(e.entries) : ''}`;
    case 'table': {
      const cell = c => typeof c === 'object' && c ? (c.roll ? esc(c.roll.exact ?? `${c.roll.min}–${c.roll.max}`) : r5(c.entry || c.entries || '', depth + 1).replace(/^<p>|<\/p>$/g, '')) : tag5(esc(c));
      return (e.caption ? `<h4>${esc(e.caption)}</h4>` : '') + '<div class="tblWrap"><table>' +
        (e.colLabels ? '<thead><tr>' + e.colLabels.map(c => `<th>${tag5(esc(c))}</th>`).join('') + '</tr></thead>' : '') +
        '<tbody>' + (e.rows || []).map(r => '<tr>' + (Array.isArray(r) ? r : r.row || []).map(c => `<td>${cell(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>';
    }
    case 'quote': return `<blockquote>${kids(e.entries)}${e.by ? `<p>— ${esc(e.by)}</p>` : ''}</blockquote>`;
    case 'abilityDc': return `<p><b>${esc(e.name)} save DC</b> = 8 + your Proficiency Bonus + your ${(e.attributes || []).map(a => esc(title(a))).join(' or ')} modifier</p>`;
    case 'abilityAttackMod': return `<p><b>${esc(e.name)} attack modifier</b> = your Proficiency Bonus + your ${(e.attributes || []).map(a => esc(title(a))).join(' or ')} modifier</p>`;
    case 'refClassFeature': case 'refSubclassFeature': case 'refOptionalfeature':
      return `<p><i>${esc(String(e.classFeature || e.subclassFeature || e.optionalfeature || '').split('|')[0])}</i></p>`;
    case 'image': case 'gallery': case 'statblock': case 'hr': return '';
    case 'spellcasting':
      return `<p>${nm}</p>${kids(e.headerEntries)}` +
        (e.will ? `<p>At will: ${tag5(esc(e.will.join(', ')))}</p>` : '') +
        (e.daily ? Object.entries(e.daily).map(([k, v]) => `<p>${esc(k).replace('e', '/day each')}: ${tag5(esc(v.join(', ')))}</p>`).join('') : '') +
        (e.spells ? Object.entries(e.spells).map(([lv, v]) => `<p>${lv === '0' ? 'Cantrips' : 'Level ' + esc(lv)}${v.slots ? ` (${esc(v.slots)} slots)` : ''}: ${tag5(esc((v.spells || []).join(', ')))}</p>`).join('') : '') +
        kids(e.footerEntries);
    default:
      if (e.entries || e.entry) {
        const head = e.name ? (depth < 1 ? `<h4>${tag5(esc(e.name))}</h4>` : '') : '';
        const body = e.entries ? kids(e.entries) : r5(e.entry, depth + 1);
        return depth < 1 ? head + body : body.replace(/^<p>/, `<p>${nm}`);
      }
      return '';
  }
}
const prose5 = x => `<div class="prose">${r5(x)}</div>`;

/* ================================================================== state */
const G = {
  chars: [], activeId: null,
  chapter: 'hero', libCat: 'spells', libQ: '', libSel: null, libF: {}, adv: 0, sound: false,
  log: [], showCover: true, turning: null, theme: 'day', coverOnStart: true,
};
const KEY = 'grimoire-heroes-v1', PREF = 'grimoire-prefs-v1';

function sampleChars(){
  return [
    {id:uid(), portrait:'⚔️', name:'Valeria Thorne', class:'Fighter', subclass:'Champion', level:3, species:'Human', background:'Soldier', alignment:'Lawful Good', xp:900, inspiration:true,
     abilities:{str:16,dex:14,con:15,int:10,wis:12,cha:11}, hp:{cur:32,max:32,temp:0}, hitDice:{used:0}, death:{s:0,f:0}, exhaustion:0, conditions:[],
     saves:{str:1,con:1}, skills:{athletics:1,intimidation:1,perception:1,survival:0},
     attacks:[{n:'Longsword', bonus:5, dmg:'1d8+3 Slashing', note:'Versatile (1d10) · Mastery: Sap'},{n:'Javelin', bonus:5, dmg:'1d6+3 Piercing', note:'Thrown 30/120 · Mastery: Slow'}],
     feats:[{n:'Savage Attacker', src:'Background (Soldier)'},{n:'Alert', src:'Human (Versatile)'}], classFeats:['Improved Critical (19–20)'],
     spells:{known:[], prep:[], slots:{}}, inventory:[{n:'Chain Mail',q:1,d:'AC 16'},{n:'Shield',q:1,d:'+2 AC'},{n:'Healer’s Kit',q:1,d:'10 uses'},{n:'Potion of Healing',q:2,d:''},{n:'Bedroll',q:1,d:''},{n:'Rope',q:1,d:'50 ft. hempen'},{n:'Silver locket',q:1,d:'Portrait of her sister',custom:true,cat:'Treasure & Valuables',type:'Trinket',val:'25 gp',wt:0}], currency:{cp:12,sp:30,ep:0,gp:45,pp:0},
     notes:{look:'Scarred cheek, braided black hair, crimson cloak.', story:'A city guardsman who took up the adventuring road after defending the bridge at Millford alone.', allies:'Squire Pip; Captain Ossa of the Watch.', extra:'Owes 50 gp to the temple of the Dawnfather.'}},
    {id:uid(), portrait:'🧙', name:'Eldrin Moonwhisper', class:'Wizard', subclass:'Evoker', level:4, species:'Elf', background:'Sage', alignment:'Neutral Good', xp:2700, inspiration:false,
     abilities:{str:8,dex:14,con:13,int:17,wis:12,cha:10}, hp:{cur:24,max:24,temp:0}, hitDice:{used:0}, death:{s:0,f:0}, exhaustion:0, conditions:[],
     saves:{int:1,wis:1}, skills:{arcana:2,history:1,investigation:1,insight:0},
     attacks:[{n:'Fire Bolt', bonus:5, dmg:'1d10 Fire', note:'Spell attack · 120 ft.'},{n:'Quarterstaff', bonus:1, dmg:'1d6-1 Bludgeoning', note:'Versatile (1d8) · Mastery: Topple'}],
     feats:[{n:'Magic Initiate (Wizard)', src:'Background (Sage)'}], classFeats:[],
     spells:{known:['Fire Bolt','Light','Mage Hand','Minor Illusion','Burning Hands','Detect Magic','Mage Armor','Shield','Sleep','Misty Step','Scorching Ray','Shatter','Web'], prep:['Burning Hands','Detect Magic','Shield','Misty Step','Scorching Ray','Shatter','Web'], slots:{}},
     inventory:[{n:'Spellbook',q:1,d:'All known spells'},{n:'Component Pouch',q:1,d:''},{n:'Robe',q:1,d:''},{n:'Ring of Protection',q:1,d:'',attuned:true},{n:'Cloak of Protection',q:1,d:'Found in the Spire vault'},{n:'Wand of Magic Missiles',q:1,d:'7 charges'}], currency:{cp:5,sp:10,ep:2,gp:120,pp:0},
     notes:{look:'Silver hair, violet eyes, ink-stained fingers.', story:'Apprentice of the Spire, seeking the lost pages of the Archmage Vaelin.', allies:'Familiar: owl Archimedes.', extra:'Fear of deep water.'}},
    {id:uid(), portrait:'🏹', name:'Kessa Quickpaw', class:'Rogue', subclass:'Thief', level:2, species:'Halfling', background:'Criminal', alignment:'Chaotic Good', xp:300, inspiration:true,
     abilities:{str:10,dex:16,con:12,int:13,wis:14,cha:14}, hp:{cur:15,max:15,temp:0}, hitDice:{used:0}, death:{s:0,f:0}, exhaustion:0, conditions:[],
     saves:{dex:1,int:1}, skills:{stealth:2,sleight:2,deception:1,acrobatics:1,perception:1},
     attacks:[{n:'Shortsword', bonus:5, dmg:'1d6+3 Piercing', note:'Finesse, Light · Mastery: Vex · Sneak Attack 1d6'},{n:'Shortbow', bonus:5, dmg:'1d6+3 Piercing', note:'80/320 · Mastery: Vex'}],
     feats:[{n:'Alert', src:'Background (Criminal)'}], classFeats:[],
     spells:{known:[], prep:[], slots:{}}, inventory:[{n:'Leather Armor',q:1,d:'AC 11 + Dex'},{n:'Thieves’ Tools',q:1,d:'Expertise'},{n:'Forgery Kit',q:1,d:'False papers as “Lady Vell”'},{n:'Cloak of Elvenkind',q:1,d:'Stolen. Do not wear in Port Merrow.',attuned:true},{n:'Bag of Holding',q:1,d:''}], currency:{cp:20,sp:15,ep:0,gp:28,pp:0},
     notes:{look:'Curly chestnut hair, lucky copper coin behind ear.', story:'Ran a shell game in Port Merrow; now runs from a mark gone wrong.', allies:'Contact: Fen, fence in the Docks.', extra:'Always pays debts.'}},
  ];
}
const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
const objOr = (x, d) => isObj(x) ? x : d;
const toNum = (x, d) => { const v = +x; return Number.isFinite(v) ? v : d; };
// sane ranges for numbers people type or import (B-017, B-018): never negative coins/XP, no 1e308 hit points
const LIM = {hp:9999, coin:999999999, xp:9999999, acb:20};
const intIn = (x, d, a, b) => clamp(Math.round(toNum(x, d)), a, b);
const toTxt = (x, max = 200) => (typeof x === 'string' ? x : typeof x === 'number' && Number.isFinite(x) ? String(x) : '').slice(0, max);
const objList = x => Array.isArray(x) ? x.filter(isObj).map(o => (typeof o.n === 'string' ? o : {...o, n:toTxt(o.n, 120)})) : [];
const txtList = x => Array.isArray(x) ? x.map(v => toTxt(v, 200)).filter(Boolean) : [];
/* HP max override (temporary max, e.g. necrotic damage or Aid): optional hp.maxOv; empty = off */
const hpMax = c => { const o = c.hp.maxOv; return Number.isFinite(o) && o >= 1 ? o : c.hp.max; };
function fixup(c){
  const ab = objOr(c.abilities, {});
  c.abilities = Object.fromEntries(['str','dex','con','int','wis','cha'].map(k => [k, clamp(Math.round(toNum(ab[k], 10)), 1, 30)]));
  const hp = objOr(c.hp, {cur:10, max:10, temp:0}), max = intIn(hp.max, 10, 1, LIM.hp);
  c.hp = {...hp, max, temp:intIn(hp.temp, 0, 0, LIM.hp)};
  if (hp.maxOv === '' || hp.maxOv == null || !Number.isFinite(Number(hp.maxOv)) || Math.trunc(Number(hp.maxOv)) < 1) delete c.hp.maxOv; else c.hp.maxOv = intIn(hp.maxOv, max, 1, LIM.hp);
  c.hp.cur = intIn(hp.cur, hpMax(c), 0, LIM.hp);
  c.hitDice = objOr(c.hitDice, {used:0}); c.death = objOr(c.death, {s:0,f:0});
  c.spells = objOr(c.spells, {}); c.spells.known = txtList(c.spells.known); c.spells.prep = txtList(c.spells.prep); c.spells.slots = objOr(c.spells.slots, {});
  ['attacks','feats','inventory'].forEach(k => c[k] = objList(c[k]));
  c.inventory.forEach(it => { if (it.cat == null || it.cat === '') delete it.cat; else it.cat = invCat(it.cat); });
  ['conditions','classFeats'].forEach(k => c[k] = txtList(c[k]));
  ['saves','skills','res','notes'].forEach(k => c[k] = objOr(c[k], {}));
  /* B-038/B-039: numeric fields end up in HTML and arithmetic; reduce them to bounded integers */
  c.res = Object.fromEntries(Object.entries(c.res).map(([k, v]) => [k, intIn(v, 0, 0, 20)]));
  c.inventory.forEach(it => { if (it.q != null) it.q = intIn(it.q, 1, 1, 9999); });
  if (isObj(c.condDur)) c.condDur = Object.fromEntries(Object.entries(c.condDur).filter(([, v]) => v != null).map(([k, v]) => [k, intIn(v, 1, 1, 999)])); else delete c.condDur;
  c.currency = objOr(c.currency, {cp:0,sp:0,ep:0,gp:0,pp:0});
  ['cp','sp','ep','gp','pp'].forEach(k => { if (c.currency[k] != null) c.currency[k] = intIn(c.currency[k], 0, 0, LIM.coin); });
  if (c.xp != null) c.xp = intIn(c.xp, 0, 0, LIM.xp);
  if (c.acBonus != null) c.acBonus = intIn(c.acBonus, 0, -LIM.acb, LIM.acb);
  c.name = toTxt(c.name, 80).trim() || 'Nameless';
  ['class','subclass','species','background','alignment'].forEach(k => { if (typeof c[k] !== 'string') c[k] = toTxt(c[k], 80); });
  ['player','portrait'].forEach(k => { if (c[k] != null && typeof c[k] !== 'string') c[k] = toTxt(c[k], 80); });
  let room = 19; const multi = [];
  /* a class appears once: a row repeating the first class gives its levels back to it, repeated rows are merged (B-028) */
  const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
  (Array.isArray(c.multi) ? c.multi : []).forEach(m => { if (!isObj(m) || !toTxt(m.class) || room < 1) return; const level = clamp(Math.round(toNum(m.level, 1)) || 1, 1, room); room -= level;
    const cls = toTxt(m.class, 80), twin = multi.find(x => same(x.class, cls)); if (same(cls, c.class)) return;
    if (twin){ twin.level += level; if (!twin.subclass) twin.subclass = toTxt(m.subclass, 80); return; }
    multi.push({class:cls, subclass:toTxt(m.subclass, 80), level}); });
  c.multi = multi;
  c.level = clamp(Math.round(toNum(c.level, 1)) || 1, 1 + c.multi.reduce((t, m) => t + m.level, 0), 20); c.exhaustion = clamp(Math.round(toNum(c.exhaustion, 0)), 0, 6);
  return c;
}
function save(){
  try { syncGrants(active()); } catch (e) {}
  stampHeroes(); writeLocal();
  savePrefs();
}
function savePrefs(){
  try { localStorage.setItem(PREF, JSON.stringify({chapter:G.chapter, libCat:G.libCat, adv:G.adv, sound:G.sound, theme:G.theme, coverOnStart:G.coverOnStart, shelfSort:G.shelfSort})); } catch (e) {}
}
async function load(){
  let data = null;
  let raw = null;
  let bad = false, noId = false;   // B-054: a hero without id gets one
  try { raw = localStorage.getItem(heroKey()); if (raw) data = JSON.parse(raw); } catch (e) { bad = true; }
  if (raw && !bad && !(isObj(data) && Array.isArray(data.chars))) bad = true;   // B-053: unreadable or wrong shape
  if (bad){ G.damaged = raw; data = null; try { const bk = 'grimoire-heroes-backup-v1:' + heroKey() + ':' + Date.now(); localStorage.setItem(bk, raw); } catch (e) {} }
  if (data && data.chars && (data.chars.length || me())){ G.chars = data.chars.filter(isObj).map(fixup); G.chars.forEach(c => { if (!c.id || typeof c.id !== 'string'){ c.id = uid(); noId = true; } }); G.activeId = data.activeId || G.chars[0]?.id || null; G.showCover = false; }
  else if (me()) { G.chars = []; G.activeId = null; }
  else { G.chars = sampleChars().map(fixup); G.activeId = G.chars[0].id; }
  G.chars.forEach(c => { c._sig = c._sig ? normSig(c._sig) : sigOf(c); });
  markBase(data?.chars ? raw : null);
  if (noId) try { save(); markBase(localStorage.getItem(heroKey())); } catch (e) {}
  try { Object.assign(G, JSON.parse(localStorage.getItem(PREF) || '{}')); } catch (e) {}
  if (!['manual','name','recent'].includes(G.shelfSort)) G.shelfSort = 'manual';
  if (!CHAPTERS.some(c => c.id === G.chapter)) G.chapter = 'hero';
}
const active = () => G.chars.find(c => c.id === G.activeId) || G.chars[0];

/* ================================================================== rules helpers */
const srdClass = c => (SRD.classes || []).find(k => k.n === c.class);
const clsInfo = c => srdClass(c) || QUICK.classes.find(k => k.n === c.class) || brewClass(c.class) || {};
const speciesInfo = c => (find(c.species, 'species') || {}).o || {};
const bgInfo = c => (find(c.background, 'backgrounds') || {}).o || {};
const hdSize = c => clsInfo(c).hd || 8;

/* multiclassing: c.class and c.subclass are the first class, c.level the total; c.multi holds the other classes */
const multi = c => c.multi || [];
function classList(c){
  const rest = multi(c);
  return [{class:c.class, subclass:c.subclass || '', level:Math.max(1, c.level - rest.reduce((t, m) => t + m.level, 0)), main:true}, ...rest.map((m, i) => ({...m, i}))];
}
const asClass = (c, e) => ({...c, class:e.class, subclass:e.subclass || '', level:e.level, multi:[]});
const hasClass = (c, n) => classList(c).some(e => e.class === n);
const classLabel = (c, subs) => multi(c).length ? classList(c).map(e => `${e.class}${subs && e.subclass ? ' (' + e.subclass + ')' : ''} ${e.level}`).join(' / ') : c.class + (subs && c.subclass ? ` (${c.subclass})` : '');
// subclass picker: every subclass the tome knows for a class (SRD, summaries, imported), stored by its short name
const shortSub = n => String(n).replace(/^(Path|College|Circle|Oath|Warrior) of (the )?/, '').replace(/ (Domain|Patron|Sorcery)$/, '');
function subsFor(cls){
  const list = [...ALL.filter(e => e.cat === 'subclasses' && (e.o.cls === cls || e.o.className === cls)).map(e => e.n), ...(QUICK.classes.find(k => k.n === cls)?.subsQuick || [])];
  return [...new Map(list.map(n => [norm(shortSub(n)), n])).values()].sort((a, b) => shortSub(a).localeCompare(shortSub(b)));
}
function subSelect(attrs, cls, cur){
  const list = subsFor(cls), same = n => cur && norm(shortSub(n)) === norm(shortSub(cur));
  return `<select ${attrs}><option value="">${list.length ? '— choose a subclass —' : '— none in the library —'}</option>${list.map(n => `<option value="${esc(shortSub(n))}" ${same(n) ? 'selected' : ''}>${esc(n)}</option>`).join('')}${cur && !list.some(same) ? `<option value="${esc(cur)}" selected>${esc(cur)}</option>` : ''}<option value="__custom">Other: type its name…</option></select>`;
}
const AB_ID = {strength:'str', dexterity:'dex', constitution:'con', intelligence:'int', wisdom:'wis', charisma:'cha'};
function mcNeed(cls){ const p = String(clsInfo({class:cls}).prim || ''); return {ids:(p.toLowerCase().match(/[a-z]+/g) || []).map(w => AB_ID[w]).filter(Boolean), any:/ or /i.test(p), text:p}; }
const mcMeets = (c, cls) => { const r = mcNeed(cls); return !r.ids.length || (r.any ? r.ids.some(a => (c.abilities[a] || 10) >= 13) : r.ids.every(a => (c.abilities[a] || 10) >= 13)); };
// proficiencies a class grants when it isn't your first one (SRD 5.2.1, Multiclassing)
const MC_PROF = {Barbarian:'Shields, Martial weapons', Bard:'Light armor, one skill of your choice, one musical instrument', Cleric:'Light and Medium armor, Shields', Druid:'Light armor, Shields',
  Fighter:'Light and Medium armor, Shields, Martial weapons', Monk:'none', Paladin:'Light and Medium armor, Shields, Martial weapons', Ranger:'Light and Medium armor, Shields, Martial weapons, one skill from the Ranger list',
  Rogue:"Light armor, one skill from the Rogue list, Thieves' Tools", Sorcerer:'none', Warlock:'Light armor', Wizard:'none'};
const mcProf = n => MC_PROF[n] ?? clsInfo({class:n}).mcProf ?? '';
function hdPools(c){
  const m = {}; classList(c).forEach(e => { const d = hdSize(asClass(c, e)); m[d] = (m[d] || 0) + e.level; });
  return Object.entries(m).map(([d, n]) => ({d:+d, n, used:multi(c).length ? (c.hitDice.by?.[d] || 0) : (c.hitDice.used || 0)})).sort((a, b) => b.d - a.d);
}
const hdText = c => hdPools(c).map(p => `${Math.max(0, p.n - p.used)} / ${p.n} d${p.d}`).join(' · ');
function subclassOf(c){
  if (!c.subclass) return null;
  const q = norm(c.subclass);
  const srd = (srdClass(c)?.subs || []).find(s => norm(s.n) === q || norm(s.n).includes(q));
  if (srd) return {...srd, src:'SRD 5.2.1'};
  const quick = QUICK.subclasses.find(s => norm(s.n) === q);
  if (quick) return {...quick, src:quick.srcBook};
  const ext = EXT.find(e => e.cat === 'subclasses' && (norm(e.n) === q || norm(e.o.shortName) === q || norm(shortSub(e.n)) === q));
  if (ext?.src === 'Homebrew') return {...ext.o, src:'Homebrew'};
  if (ext) return {n:ext.n, src:ext.src, ext};
  return null;
}
const SKILLS = DND.SKILLS || [];
function skillBonus(c, s){ const p = profFor(c.level), lv = c.skills?.[s.id] || 0; return mod(c.abilities[s.ab]) + (lv === 1 ? p : lv === 2 ? 2 * p : 0); }
function saveBonus(c, ab){ return mod(c.abilities[ab]) + (c.saves?.[ab] ? profFor(c.level) : 0); }
const hasFeat = (c, n) => (c.feats || []).some(f => norm(f.n) === norm(n));
const initBonus = c => mod(c.abilities.dex) + (hasFeat(c, 'Alert') ? profFor(c.level) : 0) + (+c.initBonus || 0);
const passive = (c, id) => 10 + skillBonus(c, SKILLS.find(s => s.id === id));

const ARMORS = (SRD.equipment || []).filter(e => e.acb !== undefined);
const WEAPONS = (SRD.equipment || []).filter(e => e.dmg);
/* a library name is found as whole words ("Ring of Mind Shielding" is not a Shield), longest name wins */
const hasWords = (hay, needle) => (' ' + hay + ' ').includes(' ' + needle + ' ');
const wordsOf = s => norm(s).replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
function baseOf(item, list, shortName){
  const nm = [item.base, item.n].filter(Boolean).map(wordsOf);
  for (const n of nm){
    let best = null;
    for (const a of list){ const an = wordsOf(shortName(a.n)); if (hasWords(n, an) && (!best || an.length > wordsOf(shortName(best.n)).length)) best = a; }
    if (best) return best;
  }
  return null;
}
const armorOf = item => baseOf(item, ARMORS, n => n.replace(/ armor$/i, ''));
const weaponOf = item => baseOf(item, WEAPONS, n => n);
/* "+1 Longsword", "Shield +2", "Armor (+1)": the plus is a magic bonus, 1 to 3; nothing else counts */
const magicPlus = n => { const m = String(n || '').match(/(?:^|[\s(])\+\s?([1-3])(?![\d])/); return m ? +m[1] : 0; };
const bnd = (v, lo, hi) => { const n = Math.trunc(Number(v)); return Number.isFinite(n) ? clamp(n, lo, hi) : 0; };
/* Everything an item does when carried on the body, read from the item first, then from its library entry (homebrew too), then from its name. */
function itemStats(it){
  const info = itemInfo(it), o = info.e?.o || {}, ar = armorOf(it), isSh = !!ar && /shield/i.test(ar.n);
  const hb0 = it.wd || (info.e?.src === 'Homebrew' && o.wd), w = ar || (hb0 && !it.base && !o.base) || (!it.base && !o.base && it.cat && it.cat !== 'Weapons') ? null : weaponOf({n:it.n, base:it.base || (info.e?.src === 'Homebrew' && o.base) || ''}), hb = info.e?.src === 'Homebrew', dm = String(it.wd || (hb && o.wd) || '').trim();
  const plus = magicPlus(it.n);
  const wb = it.wb != null ? bnd(it.wb, -3, 10) : hb && o.wb != null ? bnd(o.wb, -3, 10) : (w || dm) ? plus : 0;
  const acm = it.acm != null ? bnd(it.acm, -5, 10) : hb && o.acm != null ? bnd(o.acm, -5, 10) : ar ? plus : 0;
  const kind = ar ? (isSh ? 'shield' : 'armor') : (w || dm) ? 'weapon' : '';
  const equippable = !!kind || !!acm || !!wb || ['Weapons', 'Armor & Shields', 'Magic Items'].includes(info.cat) || info.att;
  return {info, ar, w, dm, wb, acm, kind, att:info.att, equippable};
}
/* equipped: a stored choice wins; armor from older saves was worn unless marked "carried" (worn:false) */
function isEq(it){
  if (typeof it.eq === 'boolean') return it.eq;
  return !!armorOf(it) && it.worn !== false;
}
/* equipped and, when the item asks for attunement, attuned: only then does it change anything */
const isLive = it => isEq(it) && (!itemInfo(it).att || !!it.attuned);
function acParts(c){
  const dex = mod(c.abilities.dex), parts = [];
  let body = null, bodyIt = null, shield = null, bonus = 0;
  for (const it of c.inventory || []){
    if (!isLive(it)) continue;
    const st = itemStats(it);
    if (st.kind === 'shield'){ if (!shield) shield = {it, st}; }
    else if (st.kind === 'armor'){ if (!body || st.ar.acb > body.ar.acb){ body = {it, st}; } }
    else if (st.acm && !/^(ring|cloak) of protection$/.test(norm(it.n)) && norm(it.n) !== 'bracers of defense') parts.push({k:'item', n:it.n, v:st.acm});
  }
  const mag = x => x ? x.st.acm : 0;
  let base;
  if (body) base = {n:body.it.n, v:body.st.ar.acb + (body.st.ar.dexb ? (body.st.ar.dexmax !== undefined ? Math.min(body.st.ar.dexmax, dex) : dex) : 0), sub:`${body.st.ar.acb}${body.st.ar.dexb ? ` + Dex${body.st.ar.dexmax ? ' (max ' + body.st.ar.dexmax + ')' : ''}` : ''}`};
  else if (hasClass(c, 'Barbarian')) base = {n:'Unarmored Defense', v:10 + dex + mod(c.abilities.con), sub:'10 + Dex + Con'};
  else if (hasClass(c, 'Monk') && !shield) base = {n:'Unarmored Defense', v:10 + dex + mod(c.abilities.wis), sub:'10 + Dex + Wis'};
  else base = {n:'No armor', v:10 + dex, sub:'10 + Dex'};
  const out = [{k:'base', n:base.n, v:base.v, sub:base.sub}];
  if (body && mag(body)) out.push({k:'item', n:`${body.it.n}: magic bonus`, v:mag(body)});
  if (shield) out.push({k:'shield', n:shield.it.n, v:(shield.st.ar.acb || 2) + mag(shield)});
  const att = (c.inventory || []).filter(it => it.attuned).map(it => norm(it.n));
  const prot = att.filter(n => /^(ring|cloak) of protection$/.test(n)).length;
  if (prot) out.push({k:'item', n:'Ring / Cloak of Protection', v:prot});
  if (att.includes('bracers of defense') && !body && !shield) out.push({k:'item', n:'Bracers of Defense', v:2});
  out.push(...parts);
  const adj = clamp(+c.acBonus || 0, -LIM.acb, LIM.acb);
  if (adj) out.push({k:'adj', n:'AC adjustment', v:adj});
  return out;
}
const getAC = c => Math.max(0, acParts(c).reduce((s, p) => s + p.v, 0));

const THIRD = {3:[2],4:[3],5:[3],6:[3],7:[4,2],8:[4,2],9:[4,2],10:[4,3],11:[4,3],12:[4,3],13:[4,3,2],14:[4,3,2],15:[4,3,2],16:[4,3,3],17:[4,3,3],18:[4,3,3],19:[4,3,3,1],20:[4,3,3,1]};
const isThird = c => (c.class === 'Fighter' && /eldritch knight/i.test(c.subclass || '')) || (c.class === 'Rogue' && /arcane trickster/i.test(c.subclass || ''));
const padSlots = a => Array.from({length:9}, (_, i) => a[i] || 0);
const FULL_SLOTS = [[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2,1],[4,3,3,3,2,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]];
const FULL_CASTERS = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'], HALF_CASTERS = ['Paladin', 'Ranger'];
// Multiclass Spellcaster: one shared table for every Spellcasting class, Pact Magic kept apart
function multiSlots(c){
  const per = classList(c).map(e => ({e, s:slotsFor(asClass(c, e))})).filter(x => x.s.type !== 'none');
  const std = per.filter(x => x.s.type === 'std'), pact = per.find(x => x.s.type === 'pact');
  const sum = k => per.some(x => x.s[k] !== undefined) ? per.reduce((t, x) => t + (x.s[k] || 0), 0) : undefined;
  const pactInfo = pact ? {n:Math.max(...pact.s.slots), lv:pact.s.slots.findIndex(n => n > 0) + 1} : null;
  let slots = padSlots([]);
  if (std.length === 1) slots = std[0].s.slots;
  else if (std.length > 1){
    const lv = std.reduce((t, {e}) => t + (FULL_CASTERS.includes(e.class) || clsInfo(e).caster === 'full' ? e.level : HALF_CASTERS.includes(e.class) || clsInfo(e).caster === 'half' ? Math.ceil(e.level / 2) : Math.floor(e.level / 3)), 0);
    slots = padSlots(FULL_SLOTS[clamp(lv, 1, 20) - 1]);
  }
  const base = {cantrips:sum('cantrips'), prepared:sum('prepared'), per:per.map(x => ({class:x.e.class, cantrips:x.s.cantrips, prepared:x.s.prepared}))};
  if (std.length) return {type:'std', slots, pact:pactInfo, ...base};
  if (pact) return {type:'pact', slots:pact.s.slots, ...base};
  return {type:'none', slots, ...base};
}
// Prepared-spell counts for official 2024 classes that are not in the SRD (they arrive as imported or homebrew classes); any other custom class has no table and stays a soft hint.
const PREP_EXTRA = {Artificer:[2,2,3,4,4,6,6,7,7,9,9,10,10,11,11,12,12,14,14,15]};
function slotsFor(c){
  if (multi(c).length) return multiSlots(c);
  const pad = padSlots;
  const row = srdClass(c)?.tbl?.[c.level - 1];
  if (row?.sp) return {type:c.class === 'Warlock' ? 'pact' : 'std', slots:pad(Array.from({length:9}, (_, i) => row.sp['spell_slots_level_' + (i + 1)] || 0)), cantrips:row.sp.cantrips_known, prepared:row.sp.prepared_spells};
  if (isThird(c)) return {type:'std', slots:pad(THIRD[c.level] || [])};
  const kind = !srdClass(c) && clsInfo(c).caster;
  if (kind === 'full') return {type:'std', slots:pad(FULL_SLOTS[c.level - 1]), prepared:PREP_EXTRA[c.class]?.[c.level - 1]};
  if (kind === 'half') return {type:'std', slots:pad(FULL_SLOTS[Math.ceil(c.level / 2) - 1]), prepared:PREP_EXTRA[c.class]?.[c.level - 1]};
  if (kind === 'third' && c.level >= 3) return {type:'std', slots:pad(THIRD[c.level] || [])};
  const pact = kind === 'pact' && (SRD.classes || []).find(k => k.n === 'Warlock')?.tbl?.[c.level - 1]?.sp;
  if (pact) return {type:'pact', slots:pad(Array.from({length:9}, (_, i) => pact['spell_slots_level_' + (i + 1)] || 0))};
  return {type:'none', slots:pad([])};
}
const isCaster = c => slotsFor(c).type !== 'none' || (c.spells?.known || []).length > 0;
/* 2024: Bard, Sorcerer and Warlock (and the Eldritch Knight / Arcane Trickster) only change their prepared list when they level up, so for them every known spell is always prepared.
   Artificer, Cleric, Druid, Paladin, Ranger and Wizard pick the list again after a Long Rest. A mixed multiclass is treated as the daily kind. */
const FIXED_PREP = ['Bard', 'Sorcerer', 'Warlock'];
const fixedPrep = c => { const cs = classList(c).map(e => asClass(c, e)).filter(v => slotsFor(v).type !== 'none'); return cs.length > 0 && cs.every(v => FIXED_PREP.includes(v.class) || isThird(v)); };
const spellLvOf = n => { const o = find(n, 'spells')?.o; return o ? +(o.lv ?? o.level ?? 0) : 1; };
const isPrepared = (c, n) => spellLvOf(n) === 0 || fixedPrep(c) || (c.spells.prep || []).includes(n);
/* Prepared list: hard limit from the class table (2024) and a "wall" on spell levels above the highest slot the hero has. Cantrips are exempt.
   No table (homebrew class) or no slots at all: no limit, the count stays a soft hint. Bard, Sorcerer, Warlock never prepare by hand. */
const maxSpellLv = c => { const i = slotsFor(c); if (i.type === 'none') return undefined; return Math.max(i.slots.reduce((m, n, k) => n > 0 ? k + 1 : m, 0), i.pact?.lv || 0); };
const prepCount = c => (c.spells.known || []).filter(n => spellLvOf(n) !== 0 && isPrepared(c, n)).length;
const prepBlock = (c, n) => {
  const lv = spellLvOf(n); if (lv === 0 || fixedPrep(c)) return '';
  const ml = maxSpellLv(c), cap = slotsFor(c).prepared;
  if (ml !== undefined && ml > 0 && lv > ml) return `${n} is level ${lv}, but your highest spell slot is level ${ml}.`;
  if (cap !== undefined && prepCount(c) >= cap) return `Prepared list full (${cap}). Unprepare a spell first.`;
  return '';
};
const abFor = cls => SPELL_AB[cls] || clsInfo({class:cls}).spellAb || 'int';
const spellAb = c => c.spellAbility || abFor((classList(c).find(e => slotsFor(asClass(c, e)).type !== 'none') || c).class);

const RES_LABEL = {rage_count:'Rage', second_wind_uses:'Second Wind', channel_divinity_charges:'Channel Divinity', wild_shape_uses:'Wild Shape', focus_points:'Focus Points', sorcery_points:'Sorcery Points', lay_on_hands_pool:'Lay on Hands (HP)'};
const SHORT_REST_RES = ['focus_points'];
/* SRD 5.2.1: one use back on a Short Rest (Second Wind, Rage, Wild Shape, Channel Divinity); Bardic Inspiration all back from Bard 5 (Font of Inspiration). */
const SHORT_REST_ONE = {second_wind_uses:null, rage_count:null, wild_shape_uses:null, channel_divinity_charges:null};
function shortRestPartial(c){
  const r = c.res || (c.res = {});
  Object.keys(SHORT_REST_ONE).forEach(k => { if (r[k] > 0) r[k] = r[k] - 1 || undefined; if (r[k] === undefined) delete r[k]; });
  const bard = (multi(c).length ? classList(c).find(e => e.class === 'Bard') : (c.class === 'Bard' ? c : null));
  if (bard && (bard.level || 0) >= 5) delete r.bardic_inspiration;
}
function resources(c){
  if (multi(c).length){
    const pool = [], stats = [];
    classList(c).forEach(e => { const r = resources(asClass(c, e));
      r.pool.forEach(x => { const had = pool.find(y => y.k === x.k); had ? had.max = Math.max(had.max, x.max) : pool.push(x); });
      r.stats.forEach(x => stats.some(y => y.k === x.k) || stats.push(x)); });
    return {pool, stats};
  }
  const cs = srdClass(c)?.tbl?.[c.level - 1]?.cs || {};
  const pool = [], stats = [];
  for (const [k, v] of Object.entries(cs)){
    if (RES_LABEL[k] && typeof v === 'number' && v > 0 && v <= 20) pool.push({k, n:RES_LABEL[k], max:v});
    else stats.push({k, n:title(k.replace(/_count$|_uses$/, '')), v: /die$/.test(k) ? 'd' + v : v});
  }
  benefits(c).uses.forEach(u => pool.some(x => x.k === u.k) || pool.push({k:u.k, n:u.n, max:u.max}));
  if (c.class === 'Bard') pool.push({k:'bardic_inspiration', n:'Bardic Inspiration', max:Math.max(1, mod(c.abilities.cha))});
  if (c.class === 'Paladin') stats.push({k:'loh', n:'Lay on Hands pool', v:5 * c.level + ' HP'});
  return {pool, stats};
}

/* ================================================================== class benefits
   What the features unlocked at the hero's level give (resistances, speeds, languages, feats, uses…), read from the structured
   "grants" of homebrew features. Nothing here is stored except the uses spent (c.res) and the feats it adds on its own (auto:true). */
function benefits(c){
  const out = {res:[], imm:[], cimm:[], spd:{}, lang:[], prof:[], feat:[], sp:[], uses:[], acts:[]}, add = (a, v) => (v || []).forEach(x => a.some(y => norm(y) === norm(x)) || a.push(x));
  classList(c).forEach(e => {
    const ac = asClass(c, e), where = ac.subclass || ac.class;
    [...(clsInfo(ac).f || []).map(f => ({f, w:ac.class})), ...(subclassOf(ac)?.f || []).map(f => ({f, w:where}))].filter(x => isObj(x.f.g) && x.f.l <= e.level).forEach(({f, w}) => {
      const g = f.g;
      add(out.res, g.res); add(out.imm, g.imm); add(out.cimm, g.cimm); add(out.lang, g.lang); add(out.prof, g.prof); add(out.sp, g.sp);
      add(out.feat, (g.feat || []).map(n => n + '\u0000' + w));
      Object.entries(g.spd || {}).forEach(([k, v]) => { out.spd[k] = Math.max(out.spd[k] || 0, v); });
      if (g.act?.length) out.acts.push({n:f.n, a:g.act, l:f.l, w});
      if (g.rest && g.n){
        const max = g.n === 'PB' ? profFor(c.level) : typeof g.n === 'string' ? Math.max(1, mod(c.abilities?.[g.n.toLowerCase()])) : g.n;
        if (max >= 1 && max <= 20 && !out.uses.some(u => u.n === f.n)) out.uses.push({k:'hb_' + norm(f.n).replace(/[^a-z0-9]+/g, '_'), n:f.n, max, rest:g.rest});
      }
    });
  });
  out.feat = out.feat.map(x => { const [n, w] = x.split('\u0000'); return {n, w}; });
  return out;
}
/** Feats a feature hands out are added to the hero by themselves, and taken away again only if the tome added them and the feature is no longer unlocked. */
function syncGrants(c){
  if (!isObj(c) || !Array.isArray(c.feats)) return;
  const want = benefits(c).feat, no = new Set((Array.isArray(c.noAuto) ? c.noAuto : []).map(norm));
  c.feats = c.feats.filter(f => !f.auto || want.some(w => norm(w.n) === norm(f.n)));
  want.forEach(w => { if (!no.has(norm(w.n)) && !c.feats.some(f => norm(f.n) === norm(w.n))) c.feats.push({n:w.n, src:'Class: ' + w.w, auto:true}); });
}
const ACT_WORD = {action:'Action', bonus:'Bonus Action', reaction:'Reaction'};
const speedWord = (k, v) => `${k === 'walk' ? 'Speed' : tc5(k)} ${v} ft.`;
/** One line for the Combat page: defenses and extra speeds that come from class features. */
function benefitLine(c){
  const b = benefits(c), bits = [b.res.length && 'Resistance: ' + b.res.join(', '), b.imm.length && 'Immunity: ' + b.imm.join(', '), b.cimm.length && 'Immune: ' + b.cimm.join(', '), ...Object.entries(b.spd).map(([k, v]) => speedWord(k, v))].filter(Boolean);
  return bits.length ? `<p class="muted small benLine"><b>From your class:</b> ${esc(bits.join(' · '))}</p>` : '';
}
function benefitCard(c){
  const b = benefits(c); if (!b.res.length && !b.imm.length && !b.cimm.length && !Object.keys(b.spd).length && !b.lang.length && !b.prof.length && !b.feat.length && !b.sp.length && !b.acts.length) return '';
  const row = (l, v) => v ? kv(l, esc(v)) : '';
  return card('Class benefits', `<p class="muted small">Read from the features you have unlocked. They follow your level.</p>
    ${row('Resistances', b.res.join(', '))}${row('Immunities', [...b.imm, ...b.cimm].join(', '))}${row('Speed', Object.entries(b.spd).map(([k, v]) => speedWord(k, v)).join(', '))}${row('Languages', b.lang.join(', '))}${row('Proficiencies', b.prof.join(', '))}${row('Always have', b.sp.join(', '))}${row('Feats added', b.feat.map(f => f.n).join(', '))}
    ${b.acts.length ? `<label class="f">On your turn</label><p class="grants">${b.acts.map(a => `<span class="chip light gr">${esc(a.n)} · ${a.a.map(x => ACT_WORD[x]).join(' / ')}</span>`).join(' ')}</p>` : ''}`);
}

/* ================================================================== dice */
function logRoll(label, detail, total, kind){
  const line = `${label}: ${detail} = ${total}`;
  G.log.unshift({line, kind, t:Date.now()}); G.log = G.log.slice(0, 50);
  const el = $('#diceLast'); if (el){ el.textContent = line; if (!reduceMotion()) el.animate([{transform:'translateX(-6px) rotate(-1deg)', opacity:.3}, {transform:'translateX(3px) rotate(.6deg)', opacity:1, offset:.45}, {transform:'none'}], {duration:420, easing:'ease-out'}); }
  toast('🎲 ' + line, kind);
}
function testRoll(label, bonus){
  const c = active(); const r = d20(G.adv);
  const exh = -2 * (c?.exhaustion || 0);
  const total = r.nat + bonus + exh;
  const kind = r.nat === 20 ? 'crit' : r.nat === 1 ? 'fumble' : '';
  logRoll(label, `${r.txt} ${fmt(bonus)}${exh ? ` (${exh} exhaustion)` : ''}`, total + (kind === 'crit' ? ' ✨ natural 20' : kind === 'fumble' ? ' 💀 natural 1' : ''), kind);
  return r.nat;
}

/* ================================================================== ui bits */
let toastT = null;
function toast(msg, kind = ''){
  let t = $('#toast');
  if (!t){ t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.className = 'toast ' + kind; t.textContent = msg; t.hidden = false;
  if (!reduceMotion()) t.animate([{opacity:0, transform:'translate(-50%,-8px) scale(.96)', filter:'blur(2px)'}, {opacity:1, transform:'translate(-50%,0)', filter:'blur(0)'}], {duration:360, easing:'cubic-bezier(.34,1.45,.55,1)'});
  clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600);
}
function modal(html, opts = {}){
  $('#modalBk')?.remove();
  const bk = document.createElement('div'); bk.className = 'modalBk'; bk.id = 'modalBk';
  bk.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(opts.label || 'Dialog')}">${html}</div>`;
  bk.addEventListener('click', e => { if (e.target === bk) closeModal(); });
  document.body.appendChild(bk);
  /* B-029: keyboard focus and screen readers stay inside the dialog */
  [...document.body.children].forEach(n => { if (n !== bk && n.id !== 'toast' && n.tagName !== 'SCRIPT' && !n.closest('[inert]')) n.setAttribute('inert', ''); });
  const f = bk.querySelector('[autofocus]') || bk.querySelector('.modal'); f.tabIndex = f.tabIndex < 0 ? -1 : f.tabIndex; f.focus({preventScroll:true});
  return bk;
}
function closeModal(){
  const m = $('#modalBk'); if (!m) return;
  document.querySelectorAll('body > [inert]').forEach(n => n.removeAttribute('inert'));
  if (G.needRender){ G.needRender = false; setTimeout(render, 0); }
  m.removeAttribute('id'); m.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  if (reduceMotion()){ m.remove(); return; }
  m.classList.add('closing'); m.style.pointerEvents = 'none'; setTimeout(() => m.remove(), 190);
}
const closeBtn = () => act('close', undefined, '✕ Close');
function confirmBox(text, okLabel, fn){
  modal(`<h2>${esc(text)}</h2><div class="row mt"><button type="button" class="btn danger" id="cfOk">${esc(okLabel)}</button>${act('close', undefined, 'Cancel', 'btn ghost')}</div>`, {label:text});
  $('#cfOk').onclick = () => { closeModal(); fn(); };
}

/* page-turn rustle, synthesised (no audio files, works offline) */
let actx = null;
function rustle(){
  if (!G.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const len = actx.sampleRate * .42, buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++){ const t = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(Math.PI * t), 2) * (0.6 + 0.4 * Math.sin(t * 40)); }
    const src = actx.createBufferSource(); src.buffer = buf;
    const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = .7;
    const g = actx.createGain(); g.gain.value = .22;
    src.connect(bp).connect(g).connect(actx.destination); src.start();
  } catch (e) {}
}

/* ================================================================== chapters & book */
const CHAPTERS = [
  {id:'hero', t:'Hero', s:'name · species · calling', h:'Hero Page'},
  {id:'abilities', t:'Attributes', s:'scores · saves · skills', h:'Attributes & Skills'},
  {id:'combat', t:'Combat', s:'HP · armor · attacks', h:'Combat & Vitality'},
  {id:'encounter', t:'Encounter', s:'initiative · rounds · foes', h:'Encounter Tracker'},
  {id:'traits', t:'Traits & Feats', s:'features · feats · gifts', h:'Traits & Feats'},
  {id:'spells', t:'Spellbook', s:'slots · known · prepared', h:'Spellbook'},
  {id:'pack', t:'Pack & Riches', s:'gear · arms · coin', h:'Pack & Riches'},
  {id:'chronicle', t:'Chronicle', s:'story · allies · notes', h:'Chronicle'},
  {id:'library', t:'Library', s:'the rules, offline', h:'Library of the Rules'},
  {id:'workshop', t:'Homebrew', s:'create · import · manage', h:'Homebrew'},
  {id:'npcs', t:'NPCs', s:'dossiers · groups · reveal', h:'NPC Dossiers'},
];
const BOOKISH = id => id === 'library' || id === 'workshop' || id === 'npcs';
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];

function render(){ renderShelf(); renderTabs(); renderPage(); }
const SHELF_MIN = 8;
function shelfList(){
  const q = (G.shelfQ || '').trim().toLowerCase(), many = G.chars.length >= SHELF_MIN;
  let l = G.chars.slice();
  if (many && q) l = l.filter(c => [c.name, c.species, c.class, c.subclass, classLabel(c)].join(' ').toLowerCase().includes(q));
  if (many && G.shelfSort === 'name') l.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, {sensitivity:'base'}));
  else if (many && G.shelfSort === 'recent') l.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return l;
}
function renderShelf(){
  const many = G.chars.length >= SHELF_MIN, list = shelfList(), bar = $('#shelfBar');
  bar.hidden = !many; $('#shelf').classList.toggle('many', many);
  if (many){
    const sel = $('#shelf_sort'); if (sel.value !== (G.shelfSort || 'manual')) sel.value = G.shelfSort || 'manual';
    const inp = $('#shelf_q'); if (inp.value !== (G.shelfQ || '')) inp.value = G.shelfQ || '';
    $('#shelfCount').textContent = list.length === G.chars.length ? G.chars.length + ' heroes' : list.length + ' of ' + G.chars.length;
  }
  $('#shelf').innerHTML = (many && !list.length ? '<p class="shelfNone">No hero matches “' + esc(G.shelfQ) + '”.</p>' : '') + list.map(c => `
    <button type="button" class="hero" data-act="pick" data-arg="${esc(c.id)}" aria-current="${c.id === G.activeId}">
      <span class="lv">Lv ${c.level}</span>
      <div class="p">${portrait(c)}</div>
      <div class="n">${esc(c.name)}</div>${!isMine(c) ? `<span class="owner" title="${esc(c.ownerName || 'Party member')}'s hero (read-only)">${esc(c.ownerName || 'Party')}</span>` : c._blocked && !plusOK() ? '<span class="owner local" title="Free accounts keep one hero in the cloud">on this device</span>' : ''}
      <div class="s">${esc(c.species)} ${multi(c).length ? esc(classLabel(c)) : esc(c.class) + (c.subclass ? ' · ' + esc(c.subclass) : '')}</div>
      <div class="hp" title="HP ${c.hp.cur}/${hpMax(c)}"><i style="width:${clamp(100 * c.hp.cur / Math.max(1, hpMax(c)), 0, 100)}%"></i></div>
    </button>`).join('') + act('wizard', undefined, '＋ New hero', 'shelfAdd');
  barsFrom($('#shelf'), 'shelf:');
}
function renderTabs(){
  $$('.topActions [data-act="go"]').forEach(b => b.setAttribute('aria-current', G.chapter === b.dataset.arg ? 'page' : 'false'));
  $('#chapTabs').innerHTML = CHAPTERS.map((ch, i) =>
    `<button type="button" class="tab" data-act="go" data-arg="${ch.id}" aria-current="${G.chapter === ch.id ? 'page' : 'false'}"><span class="no">${ROMAN[i]}</span>${ch.t}<small>${ch.s}</small></button>`).join('');
}
function pageHTML(id){
  const c = active(), ch = CHAPTERS.find(x => x.id === id), i = CHAPTERS.indexOf(ch);
  if (!c && !BOOKISH(id)) return `<header class="pageHead"><div><h2>An empty tome</h2><div class="sub">${me() ? 'Signed in as ' + esc(S.profile?.display_name || S.session.user.email) : 'No heroes yet'}</div></div></header>
    <div class="pageBody"><div class="emptyTome"><p class="lead">Every legend starts on a blank page.</p><p>Create your hero, or import one you exported before. Party members' heroes appear here once they are in your party.</p>
      <div class="row">${act('wizard', undefined, '＋ Create a hero', 'btn')}${act('import', undefined, 'Import a hero', 'btn ghost')}${CLOUD ? act('account', undefined, me() ? 'Account & party' : 'Sign in', 'btn ghost') : ''}</div></div></div>
    <div class="folio">${ROMAN[i]}</div>`;
  const body = (BOOKISH(id) || id === 'encounter' ? '' : roBanner(c)) + PAGES[id](c);
  return `<header class="pageHead">
      <div style="min-width:0"><h2>${BOOKISH(id) ? '' : portrait(c, 'mini')} ${BOOKISH(id) ? ch.h : esc(c.name) + ' · ' + ch.h}</h2>
      <div class="sub">${id === 'npcs' ? 'Identity files for the people of your campaign, and what your players may read of them' : id === 'workshop' ? 'Your own classes, subclasses, spells, feats, species, backgrounds, items and creatures' : id === 'library' ? 'System Reference Document 5.2.1' + (EXT.length ? ` + ${EXT.length} imported entries` : '') + ' · stored inside this file' : `Level ${c.level} ${esc(c.species)} ${esc(classLabel(c, true))} · ${esc(c.background)}${c.alignment ? ' · ' + esc(c.alignment) : ''}`}</div></div>
      <nav class="pageNav" aria-label="Turn page">
        <button type="button" class="btn small" data-act="prev" ${i <= 0 ? 'disabled' : ''} aria-label="Previous page">←</button>
        <button type="button" class="btn small" data-act="next" ${i >= CHAPTERS.length - 1 ? 'disabled' : ''} aria-label="Next page">→</button>
      </nav></header>
    <div class="pageBody">${body}</div>
    <div class="folio">${ROMAN[i]}</div>`;
}
const BARS = {};
function barsFrom(root, prefix){
  $$('.hpBar i, .hero .hp i', root).forEach((el, i) => {
    const k = prefix + (el.closest('[data-arg]')?.dataset.arg || i), to = el.style.width, from = BARS[k];
    BARS[k] = to;
    if (from && from !== to && !reduceMotion()) el.animate([{width:from}, {width:to}], {duration:650, easing:'cubic-bezier(.2,.7,.2,1)'});
  });
}
function renderPage(){
  const page = $('#page');
  page.innerHTML = pageHTML(G.chapter);
  G.pageHero = active()?.id ?? null;   // B-016: the hero these fields were drawn for
  lockReadOnly();
  barsFrom(page, G.chapter + ':' + G.activeId + ':');
  afterRender();
}
function afterRender(){
  if (G.chapter === 'spells') spellSearch($('#spell_q')?.value || '');
  if (G.chapter === 'library') renderLibList();
  if (G.chapter === 'pack') gearSearch();
}

/* ---- the page turn ---- */
function finishTurn(){
  const t = G.turning; if (!t) return;
  t.anims.forEach(a => { try { a.cancel(); } catch (e) {} });
  t.els.forEach(el => el.remove());
  $('#book').classList.remove('turning'); $('#book').style.minHeight = '';
  G.turning = null;
}
// Only the band of the page that is on screen turns. The copy keeps the boxes outside that band at their size
// but empties them, so a long spell list or library costs no more to turn than a short page.
function snapshot(el, band){
  const s = el.cloneNode(true);
  s.removeAttribute('id'); s.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
  s.style.boxShadow = 'none'; s.style.minHeight = '0';
  if (band){ const y = el.getBoundingClientRect().top; prune(el, s, y + band.top - 40, y + band.top + band.h + 40, 0); s.style.marginTop = -band.top + 'px'; }
  return s;
}
function prune(src, dst, y0, y1, depth){
  const a = src.children, b = dst.children;
  for (let i = a.length - 1; i >= 0; i--){
    const r = a[i].getBoundingClientRect(), d = b[i];
    if (!d || !r.height) continue;
    if (r.bottom < y0 || r.top > y1){ d.replaceChildren(); d.style.cssText += `;box-sizing:border-box;height:${r.height}px;overflow:hidden`; }
    else if (depth < 8 && a[i].children.length) prune(a[i], d, y0, y1, depth + 1);
  }
}
// the slice of the page between the top of the screen (or of the page) and the bottom of the screen
function visibleBand(page, H = page.offsetHeight){
  const r = page.getBoundingClientRect(), top = clamp(-r.top, 0, H - 1);
  return {top, h:clamp(innerHeight - r.top, top + 1, H) - top};
}
// A turning page is cut into vertical strips laid edge to edge in the x–z plane, so the sheet can bend.
// Each frame the spine angle and a curl term are integrated along the strips: the free edge leads while the
// page lifts, trails as it falls, and the whole sheet lands flat.
const smooth = t => t * t * t * (t * (t * 6 - 15) + 10);
const curlAt = (t, K) => -K * Math.sin(2 * Math.PI * t) * (1 - .35 * t) - K * .45 * Math.sin(Math.PI * t);
function curlLeaf(book, geo, content, {strips, delay = 0, dur = 1000, back = false, curl = 64, order = 0} = {}){
  const {top, left, w, h} = geo, sw = w / strips, els = [], segs = [];
  const put = (el, k, v) => { if (el['_' + k] !== v){ el['_' + k] = v; el.style[k] = v; } };
  for (let i = 0; i < strips; i++){
    const s = document.createElement('div'); s.className = 'strip';
    s.style.cssText = `top:${top}px;left:${left}px;width:${Math.ceil(sw) + 1}px;height:${h}px`;
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
  let raf = 0, t0 = 0, done, cancelled = false;
  const finished = new Promise(r => done = r);
  const frame = now => {
    if (cancelled) return;
    if (!t0) t0 = now;
    let t = clamp((now - t0 - delay) / dur, 0, 1);
    const p = back ? 1 - t : t, e = smooth(p), c = curlAt(p, curl);
    // a leaf lying flat on the left (forward, landed) or not yet lifted from it (backward) is out of sight;
    // while it flies, the stacking follows the side it is on, so earlier and later sheets never cross wrongly
    const hidden = back ? t <= 0 : t >= 1, right = e < .5;
    const zi = String(20 + (right === !back ? -order : order));
    let A = -180 * e, x = 0, z = 0;
    for (let i = 0; i < strips; i++){
      if (i){ const pa = A * Math.PI / 180; x += sw * Math.cos(pa); z += -sw * Math.sin(pa); A += c * wts[i]; }
      A = Math.max(-180, Math.min(0, A));
      const g = segs[i], ar = -A * Math.PI / 180;
      put(g.s, 'visibility', hidden ? 'hidden' : 'visible'); put(g.s, 'zIndex', zi);
      g.s.style.transform = `translate3d(${x.toFixed(1)}px,0,${(z + .5).toFixed(1)}px) rotateY(${A.toFixed(2)}deg)`;
      // there is no left-hand page in this book: a sheet fades as it sinks towards the left, so it never lies over the tabs
      const lit = Math.sin(ar), fade = clamp((A + 172) / 60, 0, 1).toFixed(3);
      put(g.f, 'opacity', fade); put(g.b, 'opacity', fade);
      put(g.shF, 'opacity', (A > -90 ? lit * .62 : 1).toFixed(2));
      put(g.shB, 'opacity', (A < -90 ? lit * .45 : 1).toFixed(2));
    }
    if (t < 1) raf = requestAnimationFrame(frame); else done();
  };
  raf = requestAnimationFrame(frame);
  return {els, finished, cancel(){ cancelled = true; cancelAnimationFrame(raf); done(); }};
}
function turnTo(id){
  if (id === G.chapter){ return; }
  finishTurn();
  const order = CHAPTERS.map(x => x.id), from = order.indexOf(G.chapter), to = order.indexOf(id);
  const dir = to > from ? 1 : -1, steps = Math.min(3, Math.abs(to - from));
  const book = $('#book'), page = $('#page');
  const bookTop = book.getBoundingClientRect().top;
  if (bookTop < 0) window.scrollTo({top:window.scrollY + bookTop - 8, behavior:'auto'});

  if (reduceMotion()){ G.chapter = id; save(); renderTabs(); renderPage(); return; }

  const oldH = page.offsetHeight, oldBand = visibleBand(page);
  const oldSnap = snapshot(page, oldBand);
  book.style.minHeight = book.offsetHeight + 'px';   // held before the new page renders, so a shorter page cannot pull the scroll up mid-turn
  G.chapter = id; save(); renderTabs(); renderPage();
  const band = visibleBand(page, Math.max(oldH, page.offsetHeight)), H = band.h;
  oldSnap.style.marginTop = -band.top + 'px';
  book.classList.add('turning');
  rustle();

  // jumping several chapters turns them as one sheet (loose blank leaves crossing each other looked broken), just quicker
  const narrow = page.offsetWidth < 640, strips = narrow ? 4 : 6, dur = (narrow ? 520 : 650) * (steps > 1 ? .85 : 1);
  const geo = {top:page.offsetTop + band.top, left:page.offsetLeft, w:page.offsetWidth, h:H};
  const els = [], anims = [];
  const shadow = document.createElement('div'); shadow.className = 'castShadow';
  shadow.style.cssText = `top:${geo.top}px;left:${geo.left}px;width:${geo.w}px;height:${H}px`; book.appendChild(shadow); els.push(shadow);
  const add = l => { els.push(...l.els); anims.push(l); return l; };
  if (dir > 0){
    add(curlLeaf(book, geo, oldSnap, {strips, dur}));
  } else {
    const under = document.createElement('div'); under.className = 'under';
    under.style.cssText = `top:${geo.top}px;left:${geo.left}px;width:${geo.w}px;height:${H}px;z-index:4`; under.appendChild(oldSnap); book.appendChild(under); els.push(under);
    add(curlLeaf(book, geo, snapshot(page, band), {strips, dur, back:true}));
  }
  anims.push(shadow.animate([{opacity:0}, {opacity:1, offset:.45}, {opacity:0}], {duration:dur, easing:'ease-in-out', fill:'both'}));
  inkIn(page, dur * (dir > 0 ? .55 : .7));
  G.turning = {els, anims};
  Promise.all(anims.map(a => a.finished.catch(() => {}))).then(() => { if (G.turning && G.turning.els === els) finishTurn(); });
}
// the new page's cards settle in like ink drying, one after another
function inkIn(page, delay){
  if (reduceMotion()) return;
  // opacity and transform only: they run on the compositor and never compete with the turning sheet
  $$('.pageBody > *, .pageBody .grid2 > *, .pageBody .grid3 > *, .pageBody .stack > *', page).slice(0, 10).forEach((el, i) =>
    el.animate([{opacity:.3, transform:'translateY(4px)'}, {opacity:1, transform:'none'}],
      {duration:480, delay:delay + i * 45, easing:'cubic-bezier(.2,.7,.2,1)', fill:'backwards'}));
}
function flipStep(d){ const o = CHAPTERS.map(x => x.id), i = o.indexOf(G.chapter) + d; if (i >= 0 && i < o.length) turnTo(o[i]); }

/* ================================================================== pages */
const card = (h, body, extra = '') => `<section class="card" ${extra}><h3>${h}</h3>${body}</section>`;
const kv = (k, v) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`;
/** Options for a select: keeps the hero's own value visible even when it is no longer in the list (deleted homebrew, import). */
const optsKeep = (list, cur) => (cur && !list.includes(cur) ? [...list, cur] : list).map(s => opt(s, cur, list.includes(s) ? s : `${s} (no longer available)`)).join('');
const opt = (v, cur, label) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(label ?? v)}</option>`;
const names = cat => [...new Set(ALL.filter(e => e.cat === cat).map(e => e.n))].sort();
function hpBar(c){
  const base = Math.max(1, c.hp.max), E = Math.max(1, hpMax(c)), cur = clamp(c.hp.cur, 0, E), tmp = Math.max(0, c.hp.temp || 0);
  const S = Math.max(E > base ? E : base, cur + tmp), pc = n => clamp(100 * n / S, 0, 100).toFixed(2) + '%';
  let extra = `<b class="tmp" style="left:${pc(cur)};width:${pc(Math.min(tmp, S - cur))}"></b>`;
  if (E < base) extra += `<b class="cut" title="Max HP reduced to ${E}" style="left:${pc(E)};right:0"></b>`;
  if (E > base){
    if (cur > base) extra += `<b class="xtra" style="left:${pc(base)};width:${pc(cur - base)}"></b>`;
    extra += `<b class="xo" title="Max HP raised to ${E}" style="left:${pc(base)};right:0"></b>`;
  }
  return `<div class="hpBar ${cur <= E / 2 ? 'low' : ''}${E < base ? ' cutMax' : E > base ? ' upMax' : ''}"><i style="width:${pc(cur)}"></i>${extra}</div>`;
}
const NATIVE = e => e.src === 'SRD' || e.src === 'Quick' || e.src === 'Homebrew';
const srcTag = e => e && e.src === 'Homebrew' ? '<span class="src brew" title="Made by you in Homebrew">Homebrew</span>' : e ? `<span class="src ${e.src === 'SRD' ? 'srd' : e.src === 'Quick' ? 'quick' : ''}" title="${e.src === 'Quick' ? 'Short table summary written for this tool' : e.src === 'SRD' ? 'System Reference Document 5.2.1 (CC-BY-4.0)' : 'Imported by you'}">${esc(e.src === 'Quick' ? 'Summary' : e.src)}</span>` : '';

/* ---- inventory model: an item keeps its own fields; anything missing is read from the library entry ---- */
const INV_CATS = ['Weapons', 'Armor & Shields', 'Magic Items', 'Potions & Consumables', 'Adventuring Gear', 'Tools & Kits', 'Ammunition', 'Treasure & Valuables', 'Quest & Misc'];
/* any category the pack does not know (hand-written files, other tools, old names) lands in a real group, never nowhere */
const INV_CAT_HINTS = [[/weapon/, 'Weapons'], [/armou?r|shield/, 'Armor & Shields'], [/ammo|ammunition|arrow|bolt|bullet/, 'Ammunition'],
  [/potion|consumable|scroll|poison|elixir/, 'Potions & Consumables'], [/magic|wondrous|\bring|\bwand|\bstaff|\brods?\b/, 'Magic Items'],
  [/tool|\bkits?\b|instrument/, 'Tools & Kits'], [/treasure|valuable|\bgems?\b|jewel|\bcoins?\b|\bart\b|trinket/, 'Treasure & Valuables'], [/gear|adventur|equipment/, 'Adventuring Gear']];
function invCat(x){
  if (INV_CATS.includes(x)) return x;
  const t = norm(toTxt(x, 80));
  return INV_CATS.find(k => norm(k) === t) || INV_CAT_HINTS.find(([re]) => re.test(t))?.[1] || 'Quest & Misc';
}
const RARITIES = ['', 'Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact'];
function libCat(e){
  if (!e) return '';
  const o = e.o, t = String(o.cat || o.type || '').toLowerCase();
  if (e.src === 'Homebrew' && o.hw) return 'Weapons';
  if (e.cat === 'items' || e.src !== 'SRD' && e.cat !== 'equipment'){
    if (/potion|scroll|^p$|^sc/.test(t) || /^potion|^spell scroll/i.test(e.n)) return 'Potions & Consumables';
    return 'Magic Items';
  }
  if (o.dmg || /weapon/.test(t)) return 'Weapons';
  if (o.acb !== undefined || /armor|shield/.test(t)) return 'Armor & Shields';
  if (/ammunition/.test(t)) return 'Ammunition';
  if (/tool|gaming|instrument/.test(t)) return 'Tools & Kits';
  if (/potion|poison|acid|alchemist|oil|antitoxin|healer/i.test(e.n)) return 'Potions & Consumables';
  return 'Adventuring Gear';
}
function libRar(e){
  const r = e?.o?.rar || e?.o?.rarity; if (!r || r === 'none') return '';
  return /varies|\(/i.test(r) ? r.replace(/\s*\(.*$/, '').replace(/^Rarity /, '') : title(r);
}
const libAtt = e => !!(e && (e.o.att || e.o.reqAttune));
function itemInfo(it){
  const e = it.custom ? null : findGear(it.n), o = e?.o || {}, a = armorOf(it);
  return {e,
    cat: invCat(it.cat || (a && !e?.cat?.startsWith('item') && e?.cat !== 'items' ? 'Armor & Shields' : !e && !a && weaponOf(it) ? 'Weapons' : libCat(e)) || 'Adventuring Gear'),
    type: it.type || (e ? String(o.cat || title(String(o.type || '').split('|')[0] || '')).replace(/ies$/, 'y').replace(/([^s])s$/, '$1') : ''),
    rar: it.rar ?? libRar(e), att: it.att ?? libAtt(e), wt: it.wt ?? o.wt ?? o.weight ?? 0,
    val: it.val || o.cost || '', armor: !!a};
}
const itemName = ({it, info}) => info.e ? `<button type="button" class="xref invLink" data-act="detailId" data-arg="${esc(info.e.id)}">${esc(it.n)}</button>`
  : it.desc ? `<button type="button" class="xref invLink" data-act="readItem" data-arg="${esc(it.n)}">${esc(it.n)}</button>` : `<b>${esc(it.n)}</b>`;
const attuneSlots = () => 3;
/* the pack's equip toggle: "Equipped" / "In pack", plus a warning chip when an equipped item is waiting for attunement */
function eqBtn(it, i){
  const st = itemStats(it); if (!st.equippable) return '';
  const on = isEq(it);
  return act('equip', i, on ? '✓ Equipped' : 'Equip', 'sb' + (on ? ' on' : ''), `aria-pressed="${on}" title="${on ? 'Back in the pack' : 'Wear or wield it: armor sets your AC, weapons join your attacks'}"`)
    + (on && st.att && !it.attuned ? ' <span class="chip light" title="Equipped, but it does nothing until you attune to it">needs attunement</span>' : '');
}
/* "Equipped" card of the Combat page: what you wear and wield, what it does right now, and the way to read its full text */
function gearBlurb(it, st){
  const o = st.info.e?.o || {}, raw = String(it.desc || o.x || it.d || '').replace(/[*_#>]/g, '').replace(/\s+/g, ' ').trim();
  const first = raw.replace(/^(Armor|Weapon|Wondrous Item|Ring|Rod|Staff|Wand)\s*\([^)]*\)\s*(\([^)]*\))?\s*/i, '').split(/(?<=[.!?])\s/)[0] || '';
  return first.length > 150 ? first.slice(0, 147).trimEnd() + '…' : first;
}
function equippedCard(c){
  const rows = (c.inventory || []).map((it, i) => ({it, i, st:itemStats(it)})).filter(x => isEq(x.it));
  const one = ({it, i, st}) => {
    const live = !st.att || it.attuned, ar = st.ar, str = c.abilities.str;
    const facts = [];
    if (st.kind === 'armor') facts.push(`AC ${ar.acb}${ar.dexb ? ' + Dex' + (ar.dexmax ? ' (max ' + ar.dexmax + ')' : '') : ''}`, ar.stealth ? 'Stealth: Disadvantage' : '', ar.strmin ? `Str ${ar.strmin}${str < ar.strmin ? ' (you have ' + str + ': Speed −10 ft.)' : ''}` : '');
    else if (st.kind === 'shield') facts.push('+2 AC');
    else if (st.kind === 'weapon'){ const a = gearAttacks(c).find(x => x.i === i); if (a) facts.push(`${fmt(+a.bonus || 0)} to hit`, a.dmg); }
    if (st.acm) facts.push(`${fmt(st.acm)} AC`);
    if (st.wb && st.kind !== 'weapon') facts.push(`${fmt(st.wb)} to attacks`);
    const det = st.info.e ? act('detailId', st.info.e.id, 'Details', 'sb') : (it.desc || it.d) ? act('readItem', it.n, 'Details', 'sb') : '';
    const blurb = gearBlurb(it, st);
    return `<div class="entry"><div class="row"><b>${itemName({it, info:st.info})}</b>${st.info.rar ? `<span class="chip light">${esc(st.info.rar)}</span>` : ''}
        ${live ? '' : '<span class="chip light" title="Equipped, but it does nothing until you attune to it">needs attunement</span>'}<span class="spacer"></span>
        ${live ? '' : act('attune', i, 'Attune', 'sb on')}${det}${act('equip', i, 'Unequip', 'sb x')}</div>
      ${facts.filter(Boolean).length ? `<div class="meta">${esc(facts.filter(Boolean).join(' · '))}</div>` : ''}${blurb ? `<div class="meta">${esc(blurb)}</div>` : ''}</div>`;
  };
  return card(`Equipped <span class="muted num">${rows.length}</span>`, `${rows.map(one).join('') || '<p class="empty">Nothing equipped. Open the pack and press Equip on a weapon, armor, shield or magic item.</p>'}
    <div class="row mt">${act('go', 'pack', 'Open the pack →')}</div>`);
}
function itemForm(it, actName, label, arg){
  return `<div class="fields mt">
    <div style="grid-column:1/-1"><label class="f" for="it_n">Name</label><input type="text" id="it_n" value="${esc(it.n || '')}" placeholder="e.g. Grandfather's Lucky Coin" style="width:100%"></div>
    <div><label class="f" for="it_cat">Category</label><select id="it_cat">${INV_CATS.map(k => opt(k, it.cat || 'Adventuring Gear')).join('')}</select></div>
    <div><label class="f" for="it_type">Type</label><input type="text" id="it_type" list="typeList" value="${esc(it.type || '')}" placeholder="Ring, Wand, Trinket…"><datalist id="typeList">${['Ring','Wand','Rod','Staff','Wondrous Item','Amulet','Cloak','Boots','Weapon','Armor','Potion','Scroll','Trinket','Gem','Art Object','Document','Key','Food & Drink','Container','Focus'].map(t => `<option value="${t}">`).join('')}</datalist></div>
    <div><label class="f" for="it_q">Quantity</label><input type="number" id="it_q" min="1" value="${it.q || 1}"></div>
    <div><label class="f" for="it_wt">Weight (lb, each)</label><input type="number" id="it_wt" min="0" step="0.1" value="${it.wt ?? ''}"></div>
    <div><label class="f" for="it_val">Value</label><input type="text" id="it_val" value="${esc(it.val || '')}" placeholder="e.g. 50 gp"></div>
    <div><label class="f" for="it_rar">Rarity</label><select id="it_rar">${RARITIES.map(r => opt(r, it.rar || '', r || 'Mundane')).join('')}</select></div>
    <div style="grid-column:1/-1"><label class="row"><input type="checkbox" id="it_att" ${it.att ? 'checked' : ''}> <b>Requires attunement</b></label></div>
    <div style="grid-column:1/-1"><h4 class="mt">When equipped <span class="muted">all optional</span></h4></div>
    <div><label class="f" for="it_base">Base item</label><input type="text" id="it_base" list="baseList" value="${esc(it.base || '')}" placeholder="Longsword, Chain Mail…"><datalist id="baseList">${[...WEAPONS, ...ARMORS].map(e => `<option value="${esc(e.n)}">`).join('')}</datalist></div>
    <div><label class="f" for="it_acm">AC bonus</label><input type="number" id="it_acm" min="-5" max="10" value="${it.acm ?? ''}" placeholder="0"></div>
    <div><label class="f" for="it_wd">Weapon damage</label><input type="text" id="it_wd" value="${esc(it.wd || '')}" placeholder="1d8 Slashing"></div>
    <div><label class="f" for="it_wb">Attack &amp; damage bonus</label><input type="number" id="it_wb" min="-3" max="10" value="${it.wb ?? ''}" placeholder="0"></div>
    <div><label class="f" for="it_wab">Weapon ability</label><select id="it_wab">${opt('str', it.wab || 'str', 'Strength')}${opt('dex', it.wab || 'str', 'Dexterity')}</select></div>
    <div style="grid-column:1/-1"><label class="f" for="it_d">Short note</label><input type="text" id="it_d" value="${esc(it.d || '')}" placeholder="Shown under the name: charges, who gave it…" style="width:100%"></div>
    <div style="grid-column:1/-1"><label class="f" for="it_desc">Description</label><textarea id="it_desc" placeholder="Full text of what it does (optional)">${esc(it.desc || '')}</textarea></div>
  </div><div class="row mt">${act(actName, arg, label, 'btn small')}</div>`;
}
function readItemForm(){
  const n = $('#it_n').value.trim(); if (!n){ toast('Give the item a name.'); return null; }
  const wt = parseFloat($('#it_wt').value), opt1 = (id, lo, hi) => { const v = parseInt($('#' + id).value, 10); return Number.isFinite(v) ? clamp(v, lo, hi) : undefined; };
  const base = $('#it_base').value.trim(), wd = $('#it_wd').value.trim();
  return {n, cat:$('#it_cat').value, type:$('#it_type').value.trim(), q:Math.max(1, num('it_q')), wt:isNaN(wt) ? undefined : wt,
    val:$('#it_val').value.trim(), rar:$('#it_rar').value, att:$('#it_att').checked, d:$('#it_d').value.trim(), desc:$('#it_desc').value.trim(),
    base:base || undefined, acm:opt1('it_acm', -5, 10), wd:wd || undefined, wb:opt1('it_wb', -3, 10), wab:wd && $('#it_wab').value === 'dex' ? 'dex' : undefined};
}
function gearSearch(){
  const box = $('#gearResults'); if (!box) return;
  const q = norm(G.gearQ || ''), fc = G.gearCat || '', att = G.gearAtt;
  if (!q && !fc && !att){ box.innerHTML = '<p class="muted">Type to search the SRD equipment and magic items, plus anything you imported.</p>'; return; }
  const list = ALL.filter(e => (e.cat === 'equipment' || e.cat === 'items') && (!q || e.lc.includes(q)) && (!fc || libCat(e) === fc) && (!att || libAtt(e)))
    .sort((a, b) => q ? (b.lc.startsWith(q) - a.lc.startsWith(q)) || a.n.localeCompare(b.n) : a.n.localeCompare(b.n));
  box.innerHTML = list.slice(0, 14).map(e => `<div class="kv"><span><button type="button" class="xref" data-act="detailId" data-arg="${esc(e.id)}">${esc(e.n)}</button> <span class="muted">${esc([libCat(e), libRar(e), libAtt(e) ? 'attunement' : '', e.o.cost].filter(Boolean).join(' · '))}</span></span>${act('addGear', e.id, '＋ Add')}</div>`).join('') +
    (list.length > 14 ? `<p class="muted">${list.length - 14} more: refine the search.</p>` : '') || '<p class="muted">No match. Use “Custom item” to create it.</p>';
}

function classCards(c, mc){
  const cl = clsInfo(c), sub = subclassOf(c), srd = srdClass(c);
  const feat = f => `<details class="fold"><summary>Lv ${f.l} · ${esc(f.n)}</summary><div class="in">${md(f.x)}</div></details>`;
  const now = (cl.f || []).filter(f => f.l <= c.level), later = (cl.f || []).filter(f => f.l > c.level);
  const subNow = sub?.f ? sub.f.filter(f => f.l <= c.level) : [];
  const tbl = srd ? `<details class="fold"><summary>${esc(c.class)} progression table</summary><div class="in tblWrap"><table class="ctable"><thead><tr><th>Lv</th><th>PB</th><th>Features</th>${Object.keys(srd.tbl[0].cs || {}).map(k => `<th>${esc(title(k))}</th>`).join('')}${srd.tbl[0].sp ? '<th>Slots</th>' : ''}</tr></thead><tbody>${srd.tbl.map(r => `<tr class="${r.l === c.level ? 'now' : ''}"><td>${r.l}</td><td>+${r.pb}</td><td class="wrap">${esc(r.f.join(', '))}</td>${Object.keys(srd.tbl[0].cs || {}).map(k => `<td>${esc(r.cs?.[k] ?? '')}</td>`).join('')}${r.sp ? `<td>${[1,2,3,4,5,6,7,8,9].map(i => r.sp['spell_slots_level_' + i]).filter(Boolean).join('·') || '—'}</td>` : ''}</tr>`).join('')}</tbody></table></div></details>` : '';
  return `${card(`${esc(c.class)} features <span class="muted">level ${c.level}${mc ? ' · multiclass' : ''}</span> ${srcTag(find(c.class, 'classes'))}`, `
        ${now.map(feat).join('') || '<p class="muted">Pick a class on the Hero page.</p>'}
        ${later.length ? `<details class="fold"><summary>Coming at higher levels (${later.length})</summary><div class="in">${later.map(feat).join('')}</div></details>` : ''}
        ${tbl}`)}
      ${card(`${mc ? esc(c.class) + ' subclass' : 'Subclass'}${c.subclass ? ': ' + esc(c.subclass) : ''}`, sub ? (sub.ext ? `<p>${sub.ext ? act('detailId', sub.ext.id, 'Read ' + esc(sub.n), 'chip') : ''}</p>` :
        `<p class="muted">${esc(sub.src || '')}${sub.sum ? ' · ' + esc(sub.sum) : ''}</p>${subNow.map(feat).join('') || '<p class="muted">No subclass features at this level yet.</p>'}`) :
        `<p class="muted">${c.subclass ? `“${esc(c.subclass)}” isn't in the library. The SRD has one subclass per class; import more from the Library, or note its features below.` : 'No subclass chosen yet (most classes pick one at level 3).'}</p>`)}`;
}
/* ================================================================== actions on your turn
   One list for the Combat page: equipped weapons, cantrips and prepared spells, class and subclass features, plus the standard actions,
   grouped by what they cost (Action, Bonus Action, Reaction). Features carry the activation the parser read from their text (g.act);
   SRD features without it are read once from their text and remembered. Plain strings and one pass over the features: nothing heavy. */
const TURN_MEMO = new Map();
function featActs(f){
  if (isObj(f.g)) return f.g.act || [];
  const k = f.n + '|' + String(f.x || '').length;
  if (!TURN_MEMO.has(k)){ let a = []; try { a = (grantsOf5(f.n, f.x || '').g || {}).act || []; } catch (e) {} TURN_MEMO.set(k, a); }
  return TURN_MEMO.get(k);
}
function turnFeatures(c){
  const seen = new Set(), out = [];
  classList(c).forEach(e => {
    const ac = asClass(c, e), where = ac.subclass || ac.class;
    [...(clsInfo(ac).f || []).map(f => ({f, w:ac.class})), ...(subclassOf(ac)?.f || []).map(f => ({f, w:where}))].filter(x => x.f.l <= e.level).forEach(({f, w}) => {
      const a = featActs(f); if (!a.length || seen.has(norm(f.n))) return;
      seen.add(norm(f.n)); out.push({f, w, a});
    });
  });
  return out;
}
const spellWhen = t => { t = String(t || '').trim(); return /^(1 )?bonus/i.test(t) ? 'bonus' : /^(1 )?reaction/i.test(t) ? 'reaction' : /^(1 )?action/i.test(t) ? 'action' : ''; };
/* the pool resource a turn feature tracks (its pips live on the action row) */
const turnPool = (f, pool) => { const key = 'hb_' + norm(f.n).replace(/[^a-z0-9]+/g, '_'); return pool.find(p => p.k === key || norm(p.n) === norm(f.n) || (norm(f.n) === 'font of magic' && p.k === 'sorcery_points')); };
const turnPoolKeys = c => { const pool = resources(c).pool; return new Set(turnFeatures(c).map(({f}) => turnPool(f, pool)?.k).filter(Boolean)); };
function turnActions(c){
  const G3 = {action:[], bonus:[], reaction:[]}, pool = resources(c).pool;
  gearAttacks(c).forEach(a => G3.action.push(`<div class="entry gearAtk"><div class="row"><b>${esc(a.n)}</b><span class="chip">Equipped</span><span class="chip light">${fmt(+a.bonus || 0)} to hit</span><span class="chip light">${esc(a.dmg || '')}</span><span class="spacer"></span>${act('gearAttack', a.i, 'Attack', 'btn small')}${act('equip', a.i, 'Unequip', 'sb x')}</div>${a.note ? `<div class="meta">${esc(a.note)}</div>` : ''}</div>`));
  const mine = new Set(c.attacks.map(a => norm(a.n)));
  c.attacks.forEach((a, i) => G3.action.push(`<div class="entry"><div class="row"><b>${esc(a.n)}</b><span class="chip light">${fmt(+a.bonus || 0)} to hit</span><span class="chip light">${esc(a.dmg || '')}</span><span class="spacer"></span>${act('attack', i, 'Attack', 'btn small')}${act('editAttack', i, 'Edit')}${act('delAttack', i, '✕', 'sb x', 'aria-label="Remove attack"')}</div>${a.note ? `<div class="meta">${esc(a.note)}</div>` : ''}</div>`));
  const known = c.spells?.known || [];
  known.forEach(n => {
    const o = find(n, 'spells')?.o || {}, lv = +(o.lv ?? o.level ?? 0), w = spellWhen(o.t); if (!w || mine.has(norm(n))) return;
    if (lv > 0 && !isPrepared(c, n)) return;
    G3[w].push(`<div class="entry"><div class="row"><button type="button" class="xref" data-act="detail" data-arg="${esc(n)}"><b>${esc(n)}</b></button><span class="chip light">${lv ? 'Level ' + lv : 'Cantrip'}</span>${o.conc ? '<span class="chip light">C</span>' : ''}${o.r ? `<span class="muted small">${esc(o.r)}</span>` : ''}<span class="spacer"></span>${act('cast', n, 'Cast', 'btn small')}</div></div>`);
  });
  turnFeatures(c).forEach(({f, w, a}) => {
    const r = turnPool(f, pool);
    const also = a.length > 1 ? ` <span class="muted small">also ${a.slice(1).map(x => ACT_WORD[x].toLowerCase()).join(', ')}</span>` : '';
    G3[a[0]].push(`<div class="entry"><details class="fold turnFt"><summary><b>${esc(f.n)}</b> <span class="chip light">${esc(w)} · Lv ${f.l}</span>${also}</summary><div class="in">${md(f.x || '')}</div></details>${r ? `<div class="row"><span class="pips">${Array.from({length:r.max}, (_, k) => `<button type="button" class="pip ${k < (c.res[r.k] || 0) ? 'used' : ''}" data-act="usePip" data-arg="${r.k}:${k}" aria-label="${esc(r.n)} ${k + 1}"></button>`).join('')}</span><span class="muted small">${esc(r.n)}: tap a dot when you use it</span></div>` : ''}</div>`);
  });
  const std = (QUICK.rules || []).filter(r => r.kind === 'Action').map(r => `<button type="button" class="chip light" data-act="detail" data-arg="${esc(r.n)}">${esc(r.n.replace(/ \(2024\)$/, ''))}</button>`).join('');
  const opp = find('Opportunity Attack') ? `<button type="button" class="chip light" data-act="detail" data-arg="Opportunity Attack">Opportunity Attack</button>` : '';
  const sec = (h, list, tail = '', empty = '') => `<h4>${h}</h4>${list.join('')}${tail}${!list.length && !tail ? `<p class="muted small">${empty}</p>` : ''}`;
  return sec('Action', G3.action, `<div class="row stdActs"><span class="muted small">Standard:</span>${std}</div>`)
    + sec('Bonus Action', G3.bonus, '', 'Nothing from your class, spells or gear right now.')
    + sec('Reaction', G3.reaction, opp ? `<div class="row stdActs"><span class="muted small">Standard:</span>${opp}</div>` : '', 'Nothing from your class or spells right now.')
    + `<h4>Free</h4><p class="muted small">Move up to your Speed (split it around your actions) and interact with one object for free. Talking, dropping something or standing up costs no action.</p>`;
}
const PAGES = {
hero(c){
  const p = profFor(c.level), sp = speciesInfo(c), bg = bgInfo(c), cl = clsInfo(c);
  const intro = [bg.x || quickFor('backgrounds', c.background)?.x, sp.x || quickFor('species', c.species)?.x, cl.x || quickFor('classes', c.class)?.x].filter(Boolean).join(' ');
  return `<p class="lead">Behold <b>${esc(c.name)}</b>, a <b>level ${c.level} ${esc(c.species)} ${esc(multi(c).length ? classLabel(c) : c.class)}</b>${c.subclass && !multi(c).length ? ` of the <i>${esc(c.subclass)}</i>` : ''}. ${esc(intro)}</p>
  <div class="rule"></div>
  <div class="grid2">
    ${card('Identity', `
      <label class="f" for="f_name">Hero name</label><input type="text" id="f_name" data-bind="name" maxlength="80" value="${esc(c.name)}" style="width:100%">
      <label class="f" for="f_player">Player</label><input type="text" id="f_player" data-bind="player" value="${esc(c.player || '')}" placeholder="${esc(S.profile?.display_name || 'Who plays this hero')}" style="width:100%">
      <div class="fields">
        <div><label class="f" for="f_portrait">Portrait</label><select id="f_portrait" data-bind="portrait">${PORTRAITS.map(e => opt(e, c.portrait)).join('')}</select></div>
        <div class="portraitPick"><span class="f">Picture</span><div class="row">${portrait(c, 'mid')}${act('portraitFile', undefined, c.img ? 'Change' : 'Upload image')}${c.img ? act('portraitClear', undefined, '✕', 'sb x', 'aria-label="Remove picture"') : ''}</div><input type="file" id="f_img" accept="image/*" class="sr" tabindex="-1"></div>
        <div><label class="f" for="f_align">Alignment</label><select id="f_align" data-bind="alignment">${ALIGN.map(a => opt(a, c.alignment)).join('')}</select></div>
        <div><label class="f" for="f_species">Species</label><select id="f_species" data-bind="species">${optsKeep(names('species'), c.species)}</select></div>
        <div><label class="f" for="f_bg">Background</label><select id="f_bg" data-bind="background">${optsKeep(names('backgrounds'), c.background)}</select></div>
        <div><label class="f" for="f_class">Class</label><select id="f_class" data-bind="class">${optsKeep(names('classes').filter(s => s === c.class || !multi(c).some(m => m.class === s)), c.class)}</select></div>
        <div><label class="f" for="f_sub">Subclass</label>${subSelect('id="f_sub" data-bind="subclass"', c.class, c.subclass)}</div>
        <div><label class="f" for="f_level">${multi(c).length ? 'Total level' : 'Level (1–20)'}</label><input type="number" id="f_level" data-bind="level" data-type="int" min="1" max="20" value="${c.level}"></div>
        <div><label class="f" for="f_xp">Experience</label><input type="number" id="f_xp" data-bind="xp" data-type="int" min="0" max="${LIM.xp}" value="${c.xp || 0}"></div>
      </div>
      <div class="mcBox">${multi(c).length ? `<h4>Multiclass <span class="muted">${esc(c.class)} ${classList(c)[0].level} is the first class</span></h4>
        ${multi(c).map((m, i) => `<div class="mcRow"><select data-mc="${i}:class" aria-label="Class">${optsKeep(names('classes').filter(s => s === m.class || !classList(c).some(e => e.class === s)), m.class)}</select>${subSelect(`data-mc="${i}:subclass" aria-label="${esc(m.class)} subclass"`, m.class, m.subclass)}<input type="number" data-mc="${i}:level" min="1" max="19" value="${m.level}" aria-label="Level in ${esc(m.class)}">${act('mcDel', i, '✕', 'sb x', 'aria-label="Remove this class"')}</div>`).join('')}` : ''}
        ${c.level < 20 ? `<div class="row">${act('mcAdd', undefined, '＋ Add a class (multiclass)', 'sb')}<span class="muted small">or take one from Level up, which checks the rules</span></div>` : ''}</div>
      <label class="row mt"><input type="checkbox" id="f_insp" data-bind="inspiration" ${c.inspiration ? 'checked' : ''}> <b>Heroic Inspiration</b> <span class="muted">reroll one D20; Humans regain it each Long Rest</span></label>
      <div class="rule"></div>
      ${kv('Proficiency Bonus', fmt(p))}${multi(c).length ? kv('Hit Dice', hdPools(c).map(p => p.n + 'd' + p.d).join(' + ')) : kv('Hit Die', 'd' + hdSize(c))}
      ${kv('Spellcasting', isCaster(c) ? spellAb(c).toUpperCase() + ' · DC ' + (8 + p + mod(c.abilities[spellAb(c)])) : '—')}
      <div class="rule"></div><h4>Record</h4>${heroInfo(c)}`)}
    ${card('At a glance', `
      ${kv('Armor Class', `<span class="big num">${getAC(c)}</span>`)}
      ${kv('Hit Points', `<span class="num">${c.hp.cur} / ${hpMax(c)}${c.hp.temp ? ` (+${c.hp.temp})` : ''}</span>`)}
      ${hpBar(c)}
      ${kv('Initiative', fmt(initBonus(c)) + ' ' + act('rollInit', undefined, 'Roll'))}
      ${kv('Speed', esc(c.speedOverride || (sp.speed ? sp.speed + ' ft.' : '30 ft.')))}
      ${kv('Passive Perception', passive(c, 'perception'))}
      ${kv('Passive Insight', passive(c, 'insight'))}
      <div class="row mt">${act('shortRest', undefined, 'Short Rest')}${act('longRest', undefined, 'Long Rest')}${act('go', 'combat', 'Combat page →')}</div>
      <div class="row mt">${c.level < 20 ? act('levelUp', undefined, `Level up to ${c.level + 1}`, 'btn small') : ''}${CAN_PRINT ? act('print', undefined, 'Print sheet / PDF', 'btn small ghost') : '<span class="muted">Printable sheet: open the downloaded file or the desktop app.</span>'}</div>
      <div class="rule"></div>
      <p class="muted">Tap any <span class="chip">gold label</span> or <button type="button" class="xref" data-act="detail" data-arg="Prone">underlined rule</button> to read it; tap <span class="dice" style="border-bottom:1px dashed">2d6</span> to roll it. Your heroes save automatically on this device.</p>
      <div class="row">${act('export', undefined, 'Export / share', 'btn small')}${act('import', undefined, 'Import', 'btn small ghost')}${act('duplicate', undefined, 'Duplicate', 'btn small ghost')}${act('deleteChar', undefined, 'Delete', 'btn small danger')}</div>`)}
  </div>
  <div class="grid2" style="margin-top:14px">
    ${card(`${esc(c.species)} traits ${srcTag(find(c.species, 'species'))}`, (sp.tr || []).map(t => `<details class="fold"><summary>${esc(t.n || 'Trait')}</summary><div class="in">${md(t.x)}</div></details>`).join('') || '<p class="muted">Pick a species to see its traits.</p>')}
    ${card(`${esc(c.background)} background ${srcTag(find(c.background, 'backgrounds'))}`, `
      ${kv('Ability scores', esc((bg.asi || []).join(' / ')))}
      ${kv('Feat', bg.feat ? `<button type="button" class="chip" data-act="detail" data-arg="${esc(bg.feat)}">${esc(bg.feat)}</button>` : '—')}
      ${kv('Skills', esc((bg.skills || []).join(', ')))}
      ${kv('Tools', esc((bg.tools || []).join(', ')))}
      ${bg.eq ? `<p class="muted">${esc(bg.eq)}</p>` : bg.x ? `<p class="muted">${esc(bg.x)}</p>` : ''}
      <p class="muted">2024: put +2 and +1 (or +1/+1/+1) into the three listed abilities.</p>`)}
  </div>`;
},

abilities(c){
  const p = profFor(c.level);
  const abs = ABIL.map(a => {
    const sc = c.abilities[a.id] || 10;
    return `<div class="ability"><div class="an">${a.id.toUpperCase()}</div><div class="sc num">${sc}</div><span class="mo num">${fmt(mod(sc))}</span>
      <div class="stepper">${act('stepAb', a.id + ':-1', '−', '', `aria-label="Lower ${a.n}"`)}${act('stepAb', a.id + ':1', '+', '', `aria-label="Raise ${a.n}"`)}</div>
      ${act('rollAb', a.id, 'Check')}</div>`;
  }).join('');
  const saves = ABIL.map(a => { const on = !!c.saves?.[a.id];
    return `<div class="skill"><button type="button" class="dot ${on ? 'p' : ''}" data-act="toggleSave" data-arg="${a.id}" aria-pressed="${on}" aria-label="${a.n} save proficiency">${on ? '●' : ''}</button><span class="nm"><b>${a.n}</b></span><span class="bonus">${fmt(saveBonus(c, a.id))}</span>${act('rollSave', a.id, 'Roll')}</div>`; }).join('');
  const skills = SKILLS.map(s => { const lv = c.skills?.[s.id] || 0;
    return `<div class="skill"><button type="button" class="dot ${lv === 1 ? 'p' : lv === 2 ? 'e' : ''}" data-act="cycleSkill" data-arg="${s.id}" title="None → Proficient → Expertise" aria-label="${esc(s.n)} proficiency">${lv === 2 ? '★' : lv === 1 ? '●' : ''}</button><span class="nm"><b>${esc(s.n)}</b> <span class="muted">${s.ab.toUpperCase()}</span></span><span class="bonus">${fmt(skillBonus(c, s))}</span>${act('rollSkill', s.id, 'Roll')}</div>`; }).join('');
  return `${card('Ability scores <span class="muted">modifier = (score − 10) ÷ 2, rounded down</span>', `<div class="gridAb">${abs}</div>
    <p class="muted">Proficiency Bonus <b>${fmt(p)}</b> at level ${c.level}. Tap a dot: empty → proficient ● → expertise ★ (double).${c.exhaustion ? ` Exhaustion ${c.exhaustion}: every D20 Test takes −${2 * c.exhaustion}.` : ''}</p>`)}
  <div class="grid2" style="margin-top:14px">${card('Saving throws', saves)}${card('Skills', skills)}</div>`;
},

combat(c){
  const sp = speciesInfo(c);
  const res = resources(c), own = turnPoolKeys(c); res.pool = res.pool.filter(r => !own.has(r.k));
  const weapons = (SRD.equipment || []).filter(e => e.dmg);
  return `<div class="combatTop">
    <div class="stack">
    ${card('Hit points', `${hpBar(c)}
      <div class="row mt"><span class="big num">${c.hp.cur}</span><span class="muted num">/ ${hpMax(c)}${c.hp.temp ? ` · ${c.hp.temp} temp` : ''}</span>${c.hp.cur > 0 && c.hp.cur <= hpMax(c) / 2 ? `<button type="button" class="chip light" data-act="detail" data-arg="Bloodied">Bloodied</button>` : ''}</div>
      <div class="row mt hpAmtRow"><label class="sr" for="hpAmt">Amount</label>${act('hpStep', '-5', '−5', 'sb hpStep', 'aria-label="Lower the amount by 5"')}${act('hpStep', '-1', '−', 'sb hpStep', 'aria-label="Lower the amount by 1"')}<input type="number" id="hpAmt" inputmode="numeric" value="${clamp(+G.hpAmt || 0, 0, LIM.hp) || (G.hpAmt === 0 ? 0 : 5)}" min="0" max="${LIM.hp}">${act('hpStep', '1', '+', 'sb hpStep', 'aria-label="Raise the amount by 1"')}${act('hpStep', '5', '+5', 'sb hpStep', 'aria-label="Raise the amount by 5"')}</div>
      <div class="row mt">${act('damage', undefined, 'Damage')}${act('heal', undefined, 'Heal')}${act('tempHP', undefined, 'Temp')}</div>
      <div class="rule"></div>
      <div class="kv"><label for="f_hpmax">Max HP</label><input type="number" id="f_hpmax" data-bind="hp.max" data-type="int" min="1" max="${LIM.hp}" value="${c.hp.max}"></div>
      <div class="kv"><label for="f_hpov">Max HP override</label><input type="number" id="f_hpov" data-bind="hp.maxOv" data-type="int" min="1" max="${LIM.hp}" placeholder="off" value="${c.hp.maxOv ?? ''}" title="Temporary max (necrotic damage lowers it, Aid raises it). Leave empty to turn it off."></div>
      ${kv('Hit Dice', `<span class="num">${hdText(c)}</span>`)}
      <div class="row mt">${act('spendHD', undefined, 'Spend Hit Die')}${act('shortRest', undefined, 'Short Rest')}${act('longRest', undefined, 'Long Rest')}</div>
      <p class="muted">Short Rest: spend Hit Dice, each heals the roll + Con. Long Rest (2024): regain all HP and all Hit Dice, reduce Exhaustion by 1.</p>`)}
      ${res.pool.length || res.stats.length ? card(`${multi(c).length ? 'Class' : esc(c.class)} resources`, `
        ${res.pool.map(r => `<div class="kv"><span>${esc(r.n)}</span><span class="pips">${Array.from({length:r.max}, (_, k) => `<button type="button" class="pip ${k < (c.res[r.k] || 0) ? 'used' : ''}" data-act="usePip" data-arg="${r.k}:${k}" aria-label="${esc(r.n)} ${k + 1}"></button>`).join('')}</span></div>`).join('')}
        ${res.stats.map(s => kv(esc(s.n), esc(s.v))).join('')}`) : ''}
    </div>
  <div class="stack">
  ${card('Actions on your turn <span class="muted">attacks roll to hit, then damage (doubled dice on a natural 20)</span>', `
    ${turnActions(c)}
    <details class="fold" id="atkFold"${S.atkOpen ? ' open' : ''}><summary>Add an attack</summary><div class="in">
    <div class="row"><label class="sr" for="atk_w">Weapon</label><select id="atk_w">${weapons.map(w => `<option value="${esc(w.n)}">${esc(w.n)} · ${esc(w.sum || w.dmg)}</option>`).join('')}</select>${act('addWeaponAttack', undefined, '＋ Add weapon attack')}</div>
    <div class="row mt"><input type="text" id="atk_n" placeholder="Name (e.g. Fire Bolt)"><input type="number" id="atk_b" placeholder="+hit"><input type="text" id="atk_d" placeholder="Damage (1d10 Fire)">${act('addAttack', undefined, '＋ Add custom')}</div></div></details>`)}
  ${equippedCard(c)}
  </div>
  </div>
  <div class="grid2" style="margin-top:14px">
    ${card('Death saves', `
      <p class="muted">At 0 HP roll a d20 each turn: 10+ succeeds, 3 successes stabilise, 3 failures kill. A 1 counts twice; a 20 wakes you with 1 HP.</p>
      ${kv('Successes', [1,2,3].map(n => act('setDeath', 's:' + n, n, 'sb' + ((c.death.s || 0) >= n ? ' on' : ''))).join(' '))}
      ${kv('Failures', [1,2,3].map(n => act('setDeath', 'f:' + n, n, 'sb' + ((c.death.f || 0) >= n ? ' on' : ''))).join(' '))}
      <div class="row mt">${act('rollDeath', undefined, 'Roll death save')}${act('setDeath', 'reset', 'Clear')}</div>`)}
    ${card('Armor & motion', `
      ${kv('Armor Class', `<span class="big num">${getAC(c)}</span>`)}
      <p class="muted acParts">${acParts(c).map(p => `${esc(p.n)} ${p.k === 'base' ? p.v : fmt(p.v)}`).join(' · ')}</p>
      <div class="kv"><label for="f_acb">AC adjustment</label><input type="number" id="f_acb" data-bind="acBonus" data-type="int" min="-${LIM.acb}" max="${LIM.acb}" value="${c.acBonus || 0}"></div>
      ${kv('Initiative', `${fmt(initBonus(c))}${hasFeat(c, 'Alert') ? ' <span class="muted">(Alert)</span>' : ''} ${act('rollInit', undefined, 'Roll')}`)}
      <div class="kv"><label for="f_spd">Speed</label><input type="text" id="f_spd" data-bind="speedOverride" value="${esc(c.speedOverride || '')}" placeholder="${esc(sp.speed ? sp.speed + ' ft.' : '30 ft.')}" style="width:110px"></div>
      ${benefitLine(c)}
      <label class="f">Exhaustion</label><div class="row">${[0,1,2,3,4,5,6].map(n => act('setExh', n, n, 'sb' + (c.exhaustion === n ? ' on' : ''), `aria-pressed="${c.exhaustion === n}"`)).join('')} <button type="button" class="xref" data-act="detail" data-arg="Exhaustion">rules</button></div>
      <label class="f">Conditions</label><div class="row">${(SRD.conditions || []).filter(k => k.n !== 'Exhaustion').map(k => act('toggleCond', k.n, esc(k.n), 'sb' + (c.conditions.includes(k.n) ? ' on' : ''), `aria-pressed="${c.conditions.includes(k.n)}"`)).join('')}</div>
      ${c.conditions.length ? `<p class="muted">Active: ${c.conditions.map(n => xref(n) + (c.condDur?.[n] ? ` (${c.condDur[n]} rd)` : '')).join(', ')}</p>` : ''}
      <label class="f">Concentration</label>
      <div class="row">${c.conc ? concChip(c) : '<span class="muted">Not concentrating. Cast a Concentration spell from the Spellbook.</span>'}</div>
      ${c.conc ? `<div class="row mt"><label class="sr" for="concDmg">Damage taken</label><input type="number" id="concDmg" min="1" placeholder="dmg" style="width:70px">${act('concSave', undefined, 'Con save')}</div>` : ''}
      <p class="muted">Damage above rolls the save by itself. ${act('go', 'encounter', 'Encounter tracker →')}</p>`)}
  </div>`;
},

traits(c){
  const cl = clsInfo(c);
  return `<div class="grid2">
    <div class="stack">
      ${classList(c).map(e => classCards(asClass(c, e), !e.main)).join('')}
      ${card('Custom features', `${c.classFeats.map((f, i) => `<div class="kv"><span>${esc(f)}</span>${act('delClassFeat', i, '✕', 'sb x', 'aria-label="Remove"')}</div>`).join('') || '<p class="muted">Anything the book doesn\'t cover: boons, blessings, homebrew.</p>'}
        <div class="row mt"><input type="text" id="cf_n" placeholder="Add a feature"> ${act('addClassFeat', undefined, '＋ Add')}</div>`)}
    </div>
    <div class="stack">
      ${benefitCard(c)}${card('Feats', `${c.feats.map((f, i) => { const e = find(f.n, 'feats') || find(f.n);
        return `<details class="fold"${f.src === 'Custom' && !f.d ? ' open' : ''}><summary>${esc(f.n)} <span class="muted">${esc(f.src || '')}</span> ${srcTag(e)}</summary><div class="in">${e ? entryBody(e) : (f.src === 'Custom' ? '' : '<p class="muted">Not in the library.</p>')}${f.src === 'Custom' ? `<label class="f" for="fp_${i}">Prerequisite</label><input type="text" id="fp_${i}" data-bind="feats.${i}.pre" maxlength="200" value="${esc(f.pre || '')}" placeholder="e.g. Level 4+, Strength 13+" style="width:100%"><label class="f" for="fd_${i}">What it does</label><textarea id="fd_${i}" data-bind="feats.${i}.d" maxlength="3000" rows="5" placeholder="Describe the feat: benefits, bonuses, limits…" style="width:100%">${esc(f.d || '')}</textarea>` : ''}<div class="row">${act('delFeat', i, 'Remove feat', 'sb x')}</div></div></details>`; }).join('') || '<p class="muted">Every 2024 background grants an Origin feat.</p>'}
        <div class="row mt"><label class="sr" for="feat_pick">Feat</label><select id="feat_pick">${ALL.filter(e => e.cat === 'feats').map(e => `<option value="${esc(e.n)}">${esc(e.n)} · ${esc(e.k)}${e.src !== 'SRD' ? ' (' + esc(e.src === 'Quick' ? 'summary' : e.src) + ')' : ''}</option>`).join('')}</select>${act('addFeat', undefined, '＋ Take')}</div>
        <div class="row mt"><label class="sr" for="feat_custom">Custom feat name</label><input type="text" id="feat_custom" maxlength="80" placeholder="Or a custom feat (name)">${act('addFeatCustom', undefined, '＋ Custom')}</div>`)}
      ${card('Proficiencies', `
        ${kv('Saving throws', esc((cl.saves || []).join(', ')))}
        ${kv(multi(c).length ? esc(c.class) + ' training' : 'Training', esc((cl.prof || []).join(', ')))}
        ${multi(c).map(m => kv(esc(m.class) + ' (multiclass)', esc(mcProf(m.class) || '—'))).join('')}
        ${multi(c).length ? '<p class="muted">Saving throw proficiencies come only from your first class.</p>' : ''}
        ${(cl.choice || []).map(x => `<p class="muted">${esc(x)}</p>`).join('')}
        <h4>Weapon Mastery</h4>
        <div>${(SRD.mastery || []).map(m => `<button type="button" class="chip light" data-act="detail" data-arg="${esc(m.n)}">${esc(m.n)}</button>`).join('')}</div>`)}
    </div>
  </div>`;
},

spells(c){
  const info = slotsFor(c), ab = spellAb(c), m = mod(c.abilities[ab]), p = profFor(c.level);
  if (!isCaster(c)) return card('Spellbook', `<p><b>${esc(c.name)}</b> is a ${esc(classLabel(c))} without spellcasting at this level.${hasClass(c, 'Fighter') || hasClass(c, 'Rogue') ? ' Eldritch Knights and Arcane Tricksters gain slots at level 3: set the subclass on the Hero page.' : ''} You can still keep spells from feats (Magic Initiate) here.</p>
    <div class="searchBar row mt"><input type="search" id="spell_q" placeholder="Search spells to add…" style="flex:1"></div><div id="spellResults"></div>`);
  const slots = info.slots.map((tot, i) => { if (!tot) return ''; const used = c.spells.slots[i + 1]?.used || 0;
    return `<div class="kv"><span>Level ${i + 1}</span><span class="pips">${Array.from({length:tot}, (_, k) => `<button type="button" class="pip ${k < used ? 'used' : ''}" data-act="slot" data-arg="${i + 1}:${k}" aria-label="Level ${i + 1} slot ${k + 1}"></button>`).join('')}</span></div>`; }).join('') || (info.pact ? '' : '<p class="muted">Cantrips only at this level.</p>');
  const pactUsed = c.spells.pact?.used || 0;
  const pact = info.pact ? `<h4>Pact Magic <span class="muted">Warlock slots, all return on a Short Rest</span></h4><div class="kv"><span>Level ${info.pact.lv}</span><span class="pips">${Array.from({length:info.pact.n}, (_, k) => `<button type="button" class="pip ${k < pactUsed ? 'used' : ''}" data-act="pactSlot" data-arg="${k}" aria-label="Pact slot ${k + 1}"></button>`).join('')}</span></div>` : '';
  const perClass = (info.per || []).length > 1 ? info.per.map(x => { const a = abFor(x.class), am = mod(c.abilities[a]);
    return kv(esc(x.class), `${a.toUpperCase()} · DC ${8 + am + p} · ${fmt(am + p)} to hit${x.prepared !== undefined ? ` · ${x.prepared} prepared` : ''}`); }).join('') : '';
  const fixed = fixedPrep(c), known = c.spells.known.map(n => ({n, e:find(n, 'spells')}));
  const lvOf = k => k.e?.o?.lv ?? k.e?.o?.level ?? 99;
  const grouped = list => { const g = {}; list.forEach(k => (g[lvOf(k)] = g[lvOf(k)] || []).push(k)); return Object.keys(g).sort((a, b) => a - b).map(lv => ({lv, rows:g[lv]})); };
  const lvName = lv => lv == 0 ? 'Cantrips' : lv == 99 ? 'Unlisted' : 'Level ' + lv;
  const nPrep = known.filter(k => lvOf(k) !== 0 && isPrepared(c, k.n)).length, cap = info.prepared;
  const ready = known.filter(k => isPrepared(c, k.n));
  const knownList = grouped(known).map(({lv, rows}) => `<h4>${lvName(lv)}</h4>` + rows.map(({n, e}) => {
    const o = e?.o || {}, on = isPrepared(c, n), cantrip = lvOf({e}) === 0;
    const state = cantrip ? '<span class="muted small">always ready</span>' : fixed ? '<span class="chip light" title="Prepared automatically">★ Prepared</span>' : (() => { const why = on ? '' : prepBlock(c, n); return act('prep', n, on ? '★ Prepared' : 'Prepare', 'sb' + (on ? ' on' : ''), `aria-pressed="${on}"` + (why ? ` aria-disabled="true" title="${esc(why)}" data-locked="1"` : '')) + (why && /highest spell slot/.test(why) ? ` <span class="muted small">needs a level ${lvOf({e})} slot</span>` : ''); })();
    return `<div class="entry"><div class="row"><button type="button" class="chip" data-act="detail" data-arg="${esc(n)}">${esc(n)}</button>${o.conc ? '<span class="chip light">C</span>' : ''}${o.rit ? '<span class="chip light">R</span>' : ''}<span class="spacer"></span>${state}${act('unlearn', n, 'Remove', 'sb x', `aria-label="Remove ${esc(n)} from known spells"`)}</div></div>`; }).join('')).join('');
  const readyList = grouped(ready).map(({lv, rows}) => `<h4>${lvName(lv)}</h4>` + rows.map(({n, e}) => {
    const o = e?.o || {};
    return `<details class="fold"><summary>${esc(n)} ${o.conc ? '<span class="chip light">C</span>' : ''}${o.rit ? '<span class="chip light">R</span>' : ''}<span class="spacer"></span><span class="muted">${esc(String(o.t || '').split(',')[0])}${o.r ? ' · ' + esc(o.r) : ''}</span></summary>
      <div class="in">${e ? entryBody(e) : '<p class="muted">Not in the library: add a note in the Chronicle or import a source.</p>'}
      <div class="row">${act('cast', n, 'Cast', 'btn small')}${lvOf({e}) !== 0 && !fixed ? act('prep', n, 'Unprepare', 'sb x') : ''}</div></div></details>`; }).join('')).join('');
  const over = cap !== undefined && nPrep > cap;
  const count = cap !== undefined ? ` <span class="chip ${over ? '' : 'light'}" id="prepCount" title="Prepared spells (cantrips do not count)">${nPrep} / ${cap}</span>` : '';
  const classNames = esc(multi(c).length ? (info.per || []).map(x => x.class).join(' / ') : c.class);
  return `<div class="grid2">
    <div class="stack">
    ${card(`Spellcasting · ${classNames}`, `
      ${c.conc ? `<div class="row" style="margin-bottom:6px"><span class="muted">Concentrating:</span>${concChip(c)}</div>` : ''}
      ${kv('Spell attack', `${fmt(m + p)} ${act('rollSpellAtk', undefined, 'Roll')}`)}
      ${kv('Save DC', `<span class="big num">${8 + m + p}</span>`)}
      <div class="kv"><label for="f_spellab">Casting ability</label><select id="f_spellab" data-bind="spellAbility">${['int','wis','cha'].map(a => opt(a, ab, a.toUpperCase())).join('')}</select></div>
      ${perClass ? `<div class="rule"></div>${perClass}` : ''}
      ${info.cantrips !== undefined ? kv('Cantrips known', `${known.filter(k => lvOf(k) === 0).length} / ${info.cantrips}`) : ''}
      ${cap !== undefined ? kv(fixed ? 'Spells known' : 'Prepared spells', `${nPrep} / ${cap}`) : ''}
      <div class="rule"></div>
      <h4>Spell slots ${info.type === 'pact' ? '<span class="muted">Pact Magic: all return on a Short Rest</span>' : '<span class="muted">tap to spend</span>'}</h4>
      ${slots}${pact}
      <div class="row mt">${act('resetSlots', undefined, 'Restore all slots')}</div>`)}
    ${card(`Known spells <span class="muted">${known.length}</span>`, `
      <p class="muted small">${fixed ? `${esc(classNames)} never re-pick their spells each day: every known spell is always prepared, and you change them when you level up.` : 'Everything you know or have in your spellbook. Mark the ones you want ready today with Prepare.'}</p>
      <div class="row"><label class="sr" for="spell_q">Search spells</label><input type="search" id="spell_q" placeholder="Search spells to add… (fire, heal, teleport)" style="flex:1">
      <label class="row muted"><input type="checkbox" id="spell_mine" ${G.spellMine !== false ? 'checked' : ''}> ${classNames} list</label></div>
      <div id="spellResults"></div>
      ${knownList || '<p class="empty">No spells yet. Search above and tap ＋ to add one.</p>'}`)}
    </div>
    ${card(`${fixed ? 'Ready to cast' : 'Prepared'}${count}`, `
      ${fixed ? '' : '<p class="muted small">Your list for today. Prepare more from Known spells, swap them after a Long Rest. Cantrips are always ready.</p>'}
      ${readyList || `<p class="empty">Nothing ready yet. ${fixed ? 'Add spells from the search on the left.' : 'Tap Prepare on a known spell.'}</p>`}`)}
  </div>`;
},

pack(c){
  const coins = c.currency, total = (coins.cp || 0) / 100 + (coins.sp || 0) / 10 + (coins.ep || 0) / 2 + (coins.gp || 0) + (coins.pp || 0) * 10;
  const items = c.inventory.map((it, i) => ({it, i, info:itemInfo(it)}));
  const wt = items.reduce((s, x) => s + (x.info.wt || 0) * (x.it.q || 1), 0);
  const cap = 15 * (c.abilities.str || 10), slots = attuneSlots(c);
  const attuned = items.filter(x => x.it.attuned), waiting = items.filter(x => x.info.att && !x.it.attuned);
  const counts = {}; items.forEach(x => counts[x.info.cat] = (counts[x.info.cat] || 0) + 1);
  const q = norm(G.invQ || ''), fc = G.invCat || '';
  const shown = items.filter(x => (!fc || (fc === '__eq' ? isEq(x.it) : x.info.cat === fc)) && (!q || norm(x.it.n + ' ' + (x.info.type || '') + ' ' + (x.it.d || '')).includes(q)));
  const groups = INV_CATS.map(k => ({k, rows:shown.filter(x => x.info.cat === k)})).filter(g => g.rows.length);
  const slotBox = k => { const x = attuned[k];
    return x ? `<div class="aslot on"><div class="aslotN">${k + 1}</div><div class="aslotBody"><b>${itemName(x)}</b><div class="meta">${esc([x.info.type, x.info.rar].filter(Boolean).join(' · '))}</div></div>
      <div class="row">${act('attune', x.i, 'End attunement', 'sb')}</div></div>`
      : `<div class="aslot"><div class="aslotN">${k + 1}</div><div class="aslotBody"><b class="muted">Empty slot</b><div class="meta">${waiting.length ? 'Pick an item on the right' : 'No item waiting to be attuned'}</div></div></div>`; };
  const row = ({it, i, info}) => `<div class="inv">
      <div class="invQ num">×${it.q || 1}</div>
      <div class="invN"><div class="row" style="gap:4px 8px">${itemName({it, info})}
        ${info.rar ? `<span class="chip light rar-${esc(norm(info.rar).replace(/\W.*$/, '').replace(/ /g, ''))}">${esc(info.rar)}</span>` : ''}
        ${info.att ? `<span class="chip ${it.attuned ? '' : 'light'}" title="Requires attunement">${it.attuned ? '◆ Attuned' : '◇ Attunement'}</span>` : ''}
        ${eqBtn(it, i)}</div>
        <div class="meta">${esc([info.type, info.wt ? info.wt * (it.q || 1) + ' lb' : '', info.val ? info.val : '', it.d].filter(Boolean).join(' · '))}</div></div>
      <div class="invA">${act('qty', i + ':-1', '−', 'sb', 'aria-label="One fewer"')}${act('qty', i + ':1', '+', 'sb', 'aria-label="One more"')}${act('editItem', i, 'Edit')}${act('delItem', i, '✕', 'sb x', 'aria-label="Remove item"')}</div></div>`;
  return `${card(`Attunement <span class="muted num">${attuned.length} / ${slots} slots</span>`, `<div class="attune">
      <div class="aslots">${Array.from({length:Math.max(slots, attuned.length)}, (_, k) => slotBox(k)).join('')}</div>
      <div class="await"><h4>Carried, not attuned <span class="muted">${waiting.length}</span></h4>
        ${waiting.map(x => `<div class="kv"><span>${itemName(x)} <span class="muted">${esc(x.info.rar || '')}</span></span>${act('attune', x.i, 'Attune', 'sb' + (attuned.length >= slots ? '' : ' on'))}</div>`).join('') || '<p class="muted">Items that require attunement show up here when they are in your pack.</p>'}
        <p class="muted">Attuning takes a Short Rest focused on the item. You can be attuned to ${slots} items at once; ending attunement is instant.</p></div></div>`)}
  <div class="grid2" style="margin-top:14px">
    ${card(`Inventory <span class="muted num">${c.inventory.length} entries · ${Math.round(wt * 10) / 10} / ${cap} lb</span>`, `
      <div class="row"><label class="sr" for="inv_q">Filter inventory</label><input type="search" id="inv_q" value="${esc(G.invQ || '')}" placeholder="Filter your pack…" style="flex:1"></div>
      <div class="row mt">${act('invCat', '', `All <span class="muted">${items.length}</span>`, 'sb' + (!fc ? ' on' : ''))}${act('invCat', '__eq', `Equipped <span class="muted">${items.filter(x => isEq(x.it)).length}</span>`, 'sb' + (fc === '__eq' ? ' on' : ''))}${INV_CATS.filter(k => counts[k]).map(k => act('invCat', k, `${esc(k)} <span class="muted">${counts[k]}</span>`, 'sb' + (fc === k ? ' on' : ''))).join('')}</div>
      <div id="invList">${groups.map(g => `<h4>${esc(g.k)}</h4>${g.rows.map(row).join('')}`).join('') || `<p class="empty">${items.length ? 'Nothing matches this filter.' : 'Empty pack. Add items from the book or create your own.'}</p>`}</div>
      ${wt > cap ? `<p class="muted"><b>Over capacity:</b> you carry more than 15 × Str.</p>` : ''}`)}
    <div class="stack">
      ${card('Add items', `
        <div class="libTabs">${act('addTab', 'book', 'From the book', 'sb' + (G.addTab !== 'custom' ? ' on' : ''))}${act('addTab', 'custom', 'Custom item', 'sb' + (G.addTab === 'custom' ? ' on' : ''))}</div>
        ${G.addTab === 'custom' ? itemForm({}, 'addCustom', '＋ Add to pack') : `
        <div class="row mt"><label class="sr" for="gear_q">Search equipment and magic items</label><input type="search" id="gear_q" value="${esc(G.gearQ || '')}" placeholder="Search: rope, longsword, cloak, +1…" style="flex:1 1 180px">
          <label class="sr" for="gear_cat">Category</label><select id="gear_cat">${['', ...INV_CATS].map(k => opt(k, G.gearCat || '', k || 'Any category')).join('')}</select>
          <label class="row muted"><input type="checkbox" id="gear_att" ${G.gearAtt ? 'checked' : ''}> attunement</label></div>
        <div id="gearResults"></div>`}`)}
      ${card(`Coin purse <span class="muted num">≈ ${total.toFixed(1)} gp</span>`, `
        <div class="fields">${['cp','sp','ep','gp','pp'].map(k => `<div><label class="f" for="coin_${k}">${k.toUpperCase()}</label><input type="number" id="coin_${k}" data-bind="currency.${k}" data-type="int" min="0" max="${LIM.coin}" value="${coins[k] || 0}"></div>`).join('')}</div>
        <p class="muted">1 pp = 10 gp · 1 gp = 2 ep = 10 sp = 100 cp. Edits save as you type.</p>
        <div class="rule"></div><h4>Add or spend</h4>
        <div class="row coinCalc"><label class="sr" for="coinAmt">Amount</label><input type="text" id="coinAmt" inputmode="decimal" value="${esc(G.coinAmt ?? '')}" placeholder="e.g. 3">
          <label class="sr" for="coinKind">Coin</label><select id="coinKind">${['pp','gp','ep','sp','cp'].map(k => opt(k, G.coinKind || 'gp', k.toUpperCase())).join('')}</select>
          ${act('coinAdd', undefined, '＋ Add', 'sb')}${act('coinSpend', undefined, '− Spend', 'sb')}</div>
        <p class="muted" id="coinMsg" role="status">Spending uses the coins you pick first, then smaller ones, then a bigger coin with change back.</p>`)}
      <details class="fold"><summary>Weapons table (${(SRD.equipment || []).filter(e => e.dmg).length})</summary><div class="in tblWrap"><table class="ctable"><thead><tr><th>Weapon</th><th>Damage</th><th>Mastery</th><th>Properties</th></tr></thead><tbody>${(SRD.equipment || []).filter(e => e.dmg).map(w => `<tr><td>${xref(w.n)}</td><td>${esc(w.dmg + ' ' + w.dt)}</td><td>${w.m ? xref(w.m) : ''}</td><td class="wrap">${esc((w.props || []).join(', '))}</td></tr>`).join('')}</tbody></table></div></details>
      <details class="fold"><summary>Armor table (${ARMORS.length})</summary><div class="in tblWrap"><table class="ctable"><thead><tr><th>Armor</th><th>AC</th><th>Str</th><th>Stealth</th></tr></thead><tbody>${ARMORS.map(a => `<tr><td>${xref(a.n)}</td><td>${esc(a.ac)}</td><td>${a.strmin || '—'}</td><td>${a.stealth ? 'Disadvantage' : '—'}</td></tr>`).join('')}</tbody></table></div></details>
    </div>
  </div>`;
},

chronicle(c){
  const n = c.notes, xp = c.xp || 0, next = XP_TABLE[c.level] ?? null, prev = XP_TABLE[c.level - 1] || 0;
  const pct = next ? clamp(100 * (xp - prev) / (next - prev), 0, 100) : 100;
  return `<div class="grid2">
    ${card('Appearance & story', `
      <label class="f" for="n_look">Appearance</label><textarea id="n_look" data-bind="notes.look">${esc(n.look || '')}</textarea>
      <label class="f" for="n_story">Backstory</label><textarea id="n_story" data-bind="notes.story" style="min-height:150px">${esc(n.story || '')}</textarea>
      <label class="f" for="n_allies">Allies & organizations</label><textarea id="n_allies" data-bind="notes.allies">${esc(n.allies || '')}</textarea>
      <label class="f" for="n_extra">Secrets, debts & extra</label><textarea id="n_extra" data-bind="notes.extra">${esc(n.extra || '')}</textarea>
      <p class="muted">Saved as you write.</p>`)}
    ${card('Adventurer’s aids', `
      <h4>Experience</h4>
      ${kv('Current XP', `<span class="num">${xp.toLocaleString('en')}</span>`)}
      ${next ? kv(`Level ${c.level + 1} at`, `<span class="num">${next.toLocaleString('en')}</span>`) : kv('Level', '20, the summit')}
      <div class="hpBar" style="margin:6px 0"><i style="width:${pct}%;background:linear-gradient(90deg,var(--gold2),var(--gold))"></i></div>
      <div class="row">${[50,100,250,500].map(v => act('addXP', v, '+' + v)).join('')}${c.level < 20 ? act('levelUp', undefined, `Level up to ${c.level + 1}`, 'btn small' + (xp >= (next || Infinity) ? '' : ' ghost')) : ''}</div>
      <div class="rule"></div><h4>Carrying</h4>
      <p class="muted">Carry up to 15 × Str (${15 * (c.abilities.str || 10)} lb). Push, drag or lift 30 × Str. Tiny halves it; Large and bigger double it.</p>
      <div class="rule"></div><h4>Share this hero</h4>
      <div class="row">${act('export', undefined, 'Export JSON', 'btn small')}${act('duplicate', undefined, 'Duplicate', 'btn small ghost')}</div>`)}
  </div>`;
},

workshop(){ return workshopHTML(); },
npcs(){ return npcsHTML(); },
library(){
  const cats = CATS.filter(k => ALL.some(e => e.cat === k.id));
  const f = G.libF;
  const srcs = [...new Set(ALL.filter(e => e.cat === G.libCat).map(e => e.src))];
  let filters = '';
  if (G.libCat === 'spells') filters = `<select id="lf_lv" data-lib="lv" aria-label="Spell level"><option value="">All levels</option>${[0,1,2,3,4,5,6,7,8,9].map(n => opt(n, f.lv, n ? 'Level ' + n : 'Cantrips')).join('')}</select>
    <select id="lf_cls" data-lib="cls" aria-label="Class list"><option value="">All classes</option>${(SRD.classes || []).filter(k => k.sp).map(k => opt(k.n, f.cls)).join('')}</select>`;
  if (G.libCat === 'monsters') filters = `<select id="lf_cr" data-lib="cr" aria-label="Challenge rating"><option value="">Any CR</option>${['0-1','2-4','5-10','11-16','17-30'].map(r => opt(r, f.cr, 'CR ' + r)).join('')}</select>`;
  if (G.libCat === 'items') filters = `<select id="lf_rar" data-lib="rar" aria-label="Rarity"><option value="">Any rarity</option>${['Common','Uncommon','Rare','Very Rare','Legendary','Artifact','Varies'].map(r => opt(r, f.rar)).join('')}</select>`;
  if (srcs.length > 1) filters += `<select id="lf_src" data-lib="src" aria-label="Source"><option value="">All sources</option>${srcs.map(s => opt(s, f.src, s === 'Quick' ? 'Summaries' : s)).join('')}</select>`;
  return `<div class="libTabs" role="tablist">${cats.map(k => act('libCat', k.id, `${k.t} <span class="muted">${ALL.filter(e => e.cat === k.id).length}</span>`, 'sb' + (G.libCat === k.id ? ' on' : ''), `role="tab" aria-selected="${G.libCat === k.id}"`)).join('')}${act('libCat', 'import', 'Import & offline', 'sb' + (G.libCat === 'import' ? ' on' : ''))}</div>
  ${G.libCat === 'import' ? importPane() : `
  <div class="libBar"><label class="sr" for="lib_q">Search</label><input type="search" id="lib_q" value="${esc(G.libQ)}" placeholder="Search ${esc(CAT_NAME[G.libCat] || '')}…">${filters}</div>
  <div class="libGrid"><div class="libList" id="libList" role="listbox" aria-label="${esc(CAT_NAME[G.libCat] || '')}"></div><div class="libDetail card" id="libDetail">${G.libSel && byId(G.libSel) ? entryCard(byId(G.libSel)) : '<p class="muted">Choose an entry to read it here.</p>'}</div></div>`}`;
},
};

/* ---- library list (re-rendered on typing without rebuilding the page) ---- */
function libFiltered(){
  const q = norm(G.libQ), f = G.libF;
  let list = ALL.filter(e => e.cat === G.libCat);
  if (q) list = list.filter(e => e.lc.includes(q) || (e.k || '').toLowerCase().includes(q));
  if (f.src) list = list.filter(e => e.src === f.src);
  if (G.libCat === 'spells'){
    if (f.lv !== undefined && f.lv !== '') list = list.filter(e => String(e.o.lv ?? e.o.level) === String(f.lv));
    if (f.cls) list = list.filter(e => !e.o.cls || e.o.cls.includes(f.cls));
  }
  if (G.libCat === 'monsters' && f.cr){ const [a, b] = f.cr.split('-').map(Number); list = list.filter(e => { const v = crNum(e.o.cr); return v >= a && v <= b; }); }
  if (G.libCat === 'items' && f.rar) list = list.filter(e => norm(e.o.rar || e.o.rarity) === norm(f.rar));
  if (q) list.sort((a, b) => (b.lc.startsWith(q) - a.lc.startsWith(q)) || a.n.localeCompare(b.n));
  return list;
}
const crNum = v => { if (v && typeof v === 'object') v = v.cr; if (typeof v === 'number') return v; const m = String(v || '').match(/^(\d+)\/(\d+)$/); return m ? m[1] / m[2] : +v || 0; };
function renderLibList(){
  const box = $('#libList'); if (!box) return;
  const list = libFiltered(), max = 400;
  box.innerHTML = list.slice(0, max).map(e => `<button type="button" role="option" data-act="libPick" data-arg="${esc(e.id)}" aria-selected="${e.id === G.libSel}"><span>${esc(e.n)}</span> ${e.src !== 'SRD' ? srcTag(e) : ''}<span class="k">${esc(e.k || '')}</span></button>`).join('') +
    (list.length > max ? `<p class="muted" style="padding:8px 10px">${list.length - max} more: refine your search.</p>` : '') +
    (!list.length ? '<p class="muted" style="padding:8px 10px">Nothing matches.</p>' : '');
}

/* ---- entry rendering ---- */
function entryMeta(e){
  const o = e.o;
  if (!NATIVE(e)) return extMeta(e);
  switch (e.cat){
    case 'spells': return `${o.lv ? `Level ${o.lv} ${esc(o.sc)}` : `${esc(o.sc)} cantrip`}${o.cls?.length ? ' (' + esc(o.cls.join(', ')) + ')' : ''}`;
    case 'feats': return `${esc(o.ty || '')} feat${o.pre ? ' · Prerequisite: ' + esc(o.pre) : ''}${o.rep ? ' · Repeatable' : ''}`;
    case 'items': return `${[o.cat, o.rar].filter(Boolean).map(esc).join(', ')}${o.att ? ' (requires attunement)' : ''}`;
    case 'equipment': return `${esc(o.cat || '')} · ${esc(o.cost || '')}${o.wt ? ' · ' + o.wt + ' lb' : ''}`;
    case 'monsters': return `${esc(o.sz)} ${esc(title(o.ty))}, ${esc(o.al)}`;
    case 'species': return `${esc(o.ty || 'Humanoid')} · ${esc(o.size || '')} · Speed ${o.speed} ft.${o.life ? ' · ' + esc(o.life) : ''}`;
    case 'classes': return `Hit Die d${o.hd} · Primary ${esc(o.prim)}`;
    case 'subclasses': return `${esc(o.cls || '')} subclass${o.srcBook ? ' · ' + esc(o.srcBook) : ''}${o.sum ? ' · ' + esc(o.sum) : ''}`;
    case 'features': return `${esc(o.sub || o.cls)} · level ${o.l}`;
    case 'rules': return esc(o.kind || '');
    default: return '';
  }
}
function entryBody(e){
  const o = e.o;
  if (!NATIVE(e)) return extBody(e);
  const quick = e.src === 'SRD' ? quickFor(e.cat, e.n) : null;
  const tip = quick && quick.x ? `<p class="muted"><span class="src quick">In short</span> ${esc(quick.x)}</p>` : '';
  switch (e.cat){
    case 'spells': return `${e.src === 'Homebrew' && o.fx ? `<p class="fxLine"><b>Effect.</b> ${esc(spellFxText(o))}</p>` : ''}${kv('Casting Time', esc(o.t) + (o.rit ? ' or Ritual' : ''))}${kv('Range', esc(o.r))}${kv('Components', esc(o.c))}${kv('Duration', (o.conc && !/concentration/i.test(o.d) ? 'Concentration, ' : '') + esc(o.d))}${tip}${md(o.x)}${(o.h || (e.src === 'Homebrew' && spellFxHigher(o))) ? `<div class="prose"><p><b><i>Using a Higher-Level Spell Slot.</i></b> ${inline(esc(o.h || spellFxHigher(o)))}</p></div>` : ''}`;
    case 'species': return `${tip}${o.x && e.src !== 'SRD' ? `<p>${esc(o.x)}</p>` : ''}${(o.tr || []).map(t => `${t.n ? `<h4>${esc(t.n)}</h4>` : ''}${md(t.x)}`).join('')}${(o.subs || []).map(s => `<details class="fold"><summary>${esc(s.n)}</summary><div class="in">${s.tr.map(t => `<h4>${esc(t.n)}${t.l > 1 ? ` <span class="muted">level ${t.l}</span>` : ''}</h4>${md(t.x)}`).join('')}</div></details>`).join('')}`;
    case 'backgrounds': return `${kv('Ability Scores', esc((o.asi || []).join(', ')))}${kv('Feat', o.feat ? xref(o.feat) : '—')}${kv('Skills', esc((o.skills || []).join(', ')))}${kv('Tools', esc((o.tools || []).join(', ')))}${o.eq ? `<p><b>Equipment.</b> ${esc(o.eq)}</p>` : ''}${o.x ? `<p>${esc(o.x)}</p>` : ''}`;
    case 'classes': {
      const t = o.tbl ? `<details class="fold"><summary>Class table</summary><div class="in tblWrap"><table class="ctable"><thead><tr><th>Lv</th><th>PB</th><th>Features</th></tr></thead><tbody>${o.tbl.map(r => `<tr><td>${r.l}</td><td>+${r.pb}</td><td class="wrap">${esc(r.f.join(', '))}</td></tr>`).join('')}</tbody></table></div></details>` : '';
      return `${o.x ? `<p>${esc(o.x)}</p>` : ''}${kv('Saving Throws', esc((o.saves || []).join(', ')))}${kv('Proficiencies', esc((o.prof || []).join(', ')))}${(o.choice || []).map(x => `<p class="muted">${esc(x)}</p>`).join('')}
        ${o.sp ? `<details class="fold"><summary>Spellcasting (${esc(o.sp.ab)})</summary><div class="in">${o.sp.info.map(i => `<h4>${esc(i.n)}</h4>${md(i.x)}`).join('')}</div></details>` : ''}${t}
        ${e.src === 'Homebrew' ? classExtraHtml(o) : ''}${(o.f || []).map(f => `<details class="fold"><summary>Lv ${f.l} · ${esc(f.n)}</summary><div class="in">${grantChips(f.g)}${md(f.x)}</div></details>`).join('')}
        ${(o.subs || []).map(s => `<details class="fold"><summary>Subclass · ${esc(s.n)}</summary><div class="in"><p><i>${esc(s.sum || '')}</i></p>${md(s.x)}${(s.f || []).map(f => `<h4>Lv ${f.l} · ${esc(f.n)}</h4>${md(f.x)}`).join('')}</div></details>`).join('')}
        ${(o.subsQuick || []).length ? `<p class="muted">Subclasses: ${o.subsQuick.map(s => QUICK.subclasses.some(q => q.n === s) ? xref(s) : esc(s)).join(' · ')}</p>` : ''}`;
    }
    case 'subclasses': return `${o.sum && e.src === 'Homebrew' ? `<p><i>${esc(o.sum)}</i></p>` : ''}${md(o.x)}${(o.f || []).map(featHtml).join('')}`;
    case 'equipment': return `${o.sum ? kv('Damage', esc(o.sum)) : ''}${o.ac ? kv('Armor Class', esc(o.ac)) : ''}${o.strmin ? kv('Strength', o.strmin) : ''}${o.stealth ? kv('Stealth', 'Disadvantage') : ''}${o.props ? kv('Properties', o.props.map(p => xref(p)).join(', ')) : ''}${o.m ? kv('Mastery', xref(o.m)) : ''}${md(o.x)}`;
    case 'monsters': return statblock(o);
    default: return `${tip}${md(o.x)}`;
  }
}
function statblock(o){
  const ab = ['STR','DEX','CON','INT','WIS','CHA'];
  const sec = (h, arr) => arr && arr.length ? `<h4>${h}</h4>` + arr.map(a => `<div class="prose"><p><b><i>${esc(a.n)}.</i></b> ${inline(esc(a.x)).replace(/\n/g, '<br>')}</p></div>`).join('') : '';
  return `<div class="statblock">
    ${kv('Armor Class', esc(o.ac))}${kv('Hit Points', esc(o.hp))}${kv('Speed', esc(o.spd))}
    <div class="abl">${o.ab.map((v, i) => `<div><b>${ab[i]}</b><span class="num">${v} (${fmt(mod(v))})</span></div>`).join('')}</div>
    ${o.sv ? kv('Saving Throws', esc(o.sv)) : ''}${o.sk ? kv('Skills', esc(o.sk)) : ''}
    ${o.vul ? kv('Vulnerabilities', esc(o.vul)) : ''}${o.res ? kv('Resistances', esc(o.res)) : ''}${o.imm ? kv('Immunities', esc(o.imm)) : ''}${o.cimm ? kv('Condition Immunities', esc(o.cimm)) : ''}
    ${kv('Senses', esc(o.sen))}${o.lang ? kv('Languages', esc(o.lang)) : ''}${kv('Challenge', `${crStr(o.cr)}${o.xp ? ` (${o.xp.toLocaleString('en')} XP)` : ''}${o.pb ? ` · PB +${o.pb}` : ''}`)}${o.gear ? kv('Gear', esc(o.gear)) : ''}
    ${sec('Traits', o.tr)}${sec('Actions', o.act)}${sec('Bonus Actions', o.bon)}${sec('Reactions', o.re)}${sec('Legendary Actions', o.leg)}</div>`;
}
function entryActions(e){
  const c = active(); if (!c) return '';
  switch (e.cat){
    case 'spells': return c.spells.known.includes(e.n) ? '<span class="chip light">In your spellbook</span>' : act('learn', e.n, '＋ Add to spellbook', 'btn small');
    case 'feats': return hasFeat(c, e.n) ? '<span class="chip light">Taken</span>' : act('takeFeat', e.n, '＋ Take feat', 'btn small');
    case 'species': return c.species === e.n ? '' : act('become', 'species:' + e.n, `Make ${esc(c.name)} a ${esc(e.n)}`, 'btn small ghost');
    case 'classes': return c.class === e.n ? '' : act('become', 'class:' + e.n, `Make ${esc(c.name)} a ${esc(e.n)}`, 'btn small ghost');
    case 'backgrounds': return c.background === e.n ? '' : act('become', 'background:' + e.n, 'Use this background', 'btn small ghost');
    case 'subclasses': return act('become', 'subclass:' + e.n, 'Use this subclass', 'btn small ghost');
    case 'equipment': case 'items': return act('addGear', e.id, '＋ Add to pack', 'btn small');
    default: return '';
  }
}
function entryCard(e){
  let body, meta; try { body = entryBody(e); meta = entryMeta(e); } catch (err) { body = '<p class="muted">This entry has a shape the Library cannot display.</p>'; meta = ''; }
  return `<div class="head"><h2>${esc(e.n)}</h2>${srcTag(e)}<span class="spacer"></span>${entryActions(e)}${brewable(e) ? act('brewFrom', e.id, 'Copy to Homebrew', 'btn small ghost', 'title="Open it in the Homebrew editor as a starting point for your own version"') : ''}</div>
    <div class="meta">${meta}</div><div class="rule"></div>${body}`;
}
function showEntry(e){
  if (!e) return;
  AUTOLINK = e.src !== 'SRD';
  let card; try { card = entryCard(e); } finally { AUTOLINK = false; }
  modal(`${card.replace('<span class="spacer"></span>', '<span class="spacer"></span>' + closeBtn())}`, {label:e.n});
}
function showDetail(name){
  const e = find(name);
  if (e) return showEntry(e);
  modal(`<div class="head"><h2>${esc(name)}</h2><span class="spacer"></span>${closeBtn()}</div><p class="muted">This isn't in the library yet. The SRD covers the core rules; you can import more sources from <b>Library → Import & offline</b>.</p>`);
}
const findGear = n => find(n, 'equipment') || find(n, 'items');

/* ================================================================== 5etools import */
const MAP5 = {spell:'spells', feat:'feats', race:'species', subrace:'species', background:'backgrounds', item:'items', baseitem:'equipment', itemGroup:'items', magicvariant:'items',
  monster:'monsters', condition:'conditions', disease:'conditions', status:'conditions', class:'classes', subclass:'subclasses', classFeature:'features', subclassFeature:'features',
  optionalfeature:'other', action:'rules', variantrule:'rules', sense:'rules', skill:'rules', deity:'other', language:'other', reward:'other', trap:'other', hazard:'other', object:'other', vehicle:'other', boon:'other', charoption:'other', psionic:'other', recipe:'other', deck:'other', card:'other'};
const RAR = {none:'Mundane', unknown:'Unknown'};
const txt5 = v => typeof v === 'string' ? v : typeof v === 'number' && isFinite(v) ? String(v) : '';
const F5 = ['source','cls','level','school','rarity','className','subclassShortName','page'];
function key5(cat, o){
  switch (cat){
    case 'spells': return (o.level ? `Lv ${o.level}` : 'Cantrip') + ' · ' + (SCHOOL[o.school] || o.school || '');
    case 'monsters': { const cr = typeof o.cr === 'object' ? o.cr?.cr : o.cr; return cr !== undefined ? 'CR ' + txt5(cr) : txt5(o.source); }
    case 'items': return title(RAR[o.rarity] || txt5(o.rarity));
    case 'features': return `${o.subclassShortName || o.className || ''} ${o.level || ''}`.trim();
    case 'subclasses': return o.className || '';
    default: return txt5(o.source);
  }
}
function ingest5(json, packName){
  const out = [];
  for (const [k, arr] of Object.entries(json || {})){
    if (k.startsWith('_') || !Array.isArray(arr)) continue;
    const cat = MAP5[k] || 'other';
    arr.forEach(o => { if (o && typeof o === 'object' && typeof o.name === 'string'){
      const c = {...o, _kind:k}; F5.forEach(f => { if (f in c && typeof c[f] !== 'string' && typeof c[f] !== 'number') delete c[f]; });
      try { out.push({cat, n:o.name, o:c, src:packName, k:key5(cat, c)}); } catch (e) {}
    } });
  }
  return out;
}
function extMeta(e){
  const o = e.o, src = o.source ? ` · ${esc(o.source)}${o.page ? ' p.' + esc(o.page) : ''}` : '';
  if (e.cat === 'spells'){
    const time = [].concat(o.time || []).map(t => `${t.number || ''} ${t.unit || ''}`.trim()).join(' or ');
    return `${o.level ? `Level ${esc(o.level)} ${esc(SCHOOL[o.school] || o.school || '')}` : `${esc(SCHOOL[o.school] || o.school || '')} cantrip`}${time ? ' · ' + esc(time) : ''}${src}`;
  }
  if (e.cat === 'monsters'){
    const size = Array.isArray(o.size) ? o.size.map(s => ({T:'Tiny',S:'Small',M:'Medium',L:'Large',H:'Huge',G:'Gargantuan'}[s] || s)).join('/') : '';
    const type = typeof o.type === 'object' ? o.type?.type : o.type;
    return `${esc(size)} ${esc(title(type || ''))}${src}`;
  }
  if (e.cat === 'items') return `${esc(title(RAR[o.rarity] || o.rarity || ''))}${o.reqAttune ? ' (requires attunement' + (typeof o.reqAttune === 'string' ? ' ' + esc(o.reqAttune) : '') + ')' : ''}${src}`;
  return `${esc(title(o._kind || e.cat))}${src}`;
}
function extBody(e){
  const o = e.o;
  let head = '';
  if (e.cat === 'spells'){
    const rng = o.range ? (o.range.distance ? `${o.range.distance.amount ?? ''} ${o.range.distance.type}`.trim() : o.range.type) : '';
    const comp = o.components ? [o.components.v && 'V', o.components.s && 'S', o.components.m && ('M' + (typeof o.components.m === 'string' ? ` (${o.components.m})` : o.components.m?.text ? ` (${o.components.m.text})` : ''))].filter(Boolean).join(', ') : '';
    const dur = [].concat(o.duration || []).map(d => d.type === 'timed' ? `${d.concentration ? 'Concentration, up to ' : ''}${d.duration?.amount} ${d.duration?.type}` : title(d.type)).join(' or ');
    head = `${rng ? kv('Range', esc(rng)) : ''}${comp ? kv('Components', esc(comp)) : ''}${dur ? kv('Duration', esc(dur)) : ''}`;
  }
  if (e.cat === 'monsters' && o.str !== undefined){
    const ac = [].concat(o.ac ?? []).map(a => typeof a === 'object' ? a.ac + (a.from ? ` (${a.from.join(', ').replace(/\{@\w+ ([^|}]+)[^}]*\}/g, '$1')})` : '') : a).join(', ');
    const spd = o.speed ? Object.entries(o.speed).filter(([k]) => k !== 'canHover').map(([k, v]) => `${k === 'walk' ? '' : k + ' '}${typeof v === 'object' ? v.number : v} ft.`).join(', ') : '';
    const blocks = [['Traits', o.trait], ['Actions', o.action], ['Bonus Actions', o.bonus], ['Reactions', o.reaction], ['Legendary Actions', o.legendary]];
    return `<div class="statblock">${kv('Armor Class', esc(ac))}${kv('Hit Points', esc(o.hp ? (o.hp.average ?? '') + (o.hp.formula ? ` (${o.hp.formula})` : '') : ''))}${kv('Speed', esc(spd))}
      <div class="abl">${['str','dex','con','int','wis','cha'].map(a => `<div><b>${a.toUpperCase()}</b><span class="num">${esc(o[a])} (${fmt(mod(o[a]))})</span></div>`).join('')}</div>
      ${o.senses ? kv('Senses', esc([].concat(o.senses).join(', ')) + (o.passive ? `, passive Perception ${esc(o.passive)}` : '')) : ''}${o.languages ? kv('Languages', esc([].concat(o.languages).join(', '))) : ''}
      ${o.cr ? kv('Challenge', esc(typeof o.cr === 'object' ? o.cr.cr : o.cr)) : ''}
      ${(o.spellcasting || []).length ? `<h4>Spellcasting</h4><div class="prose">${r5(o.spellcasting.map(s => ({...s, type:'spellcasting'})))}</div>` : ''}
      ${blocks.map(([h, arr]) => arr ? `<h4>${h}</h4><div class="prose">${r5(arr.map(a => ({...a, type:'entries'})), 1)}</div>` : '').join('')}</div>`;
  }
  if (o._copy && !o.entries) head += `<p class="muted">This entry copies “${esc(o._copy.name)}” (${esc(o._copy.source || '')}) with changes; import that source too to see the full text.</p>`;
  const higher = o.entriesHigherLevel ? prose5(o.entriesHigherLevel) : '';
  return head + prose5(o.entries || o.entry || []) + higher;
}
const IDB = {
  db: null,
  open(){ return this.db ? Promise.resolve(this.db) : new Promise((res, rej) => {
    const r = indexedDB.open('grimoire-library', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('packs', {keyPath:'id'});
    r.onsuccess = () => res(this.db = r.result); r.onerror = () => rej(r.error); }); },
  async all(){ const db = await this.open(); return new Promise((res, rej) => { const q = db.transaction('packs').objectStore('packs').getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); },
  async put(p){ const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('packs', 'readwrite'); t.objectStore('packs').put(p); t.oncomplete = res; t.onerror = () => rej(t.error); }); },
  async del(id){ const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('packs', 'readwrite'); t.objectStore('packs').delete(id); t.oncomplete = res; t.onerror = () => rej(t.error); }); },
};
let PACKS = [];
async function loadPacks(){
  try { PACKS = await IDB.all(); } catch (e) { PACKS = []; }
  EXT.length = 0;
  BREW_ITEMS = cleanBrew(PACKS.find(p => p.id === BREW_ID)?.items); brewMarkClean();
  PACKS = PACKS.filter(p => p.id !== BREW_ID);
  PACKS.forEach(p => ingest5(p.data, p.name).forEach(x => EXT.push(x)));
  BREW_ITEMS.forEach(it => EXT.push(brewEntry(it)));
}
async function importJSON(text, name){
  let json;
  try { json = JSON.parse(text); } catch (e) { toast(`${name}: not valid JSON.`); return 0; }
  const items = ingest5(json, name);
  if (!items.length){ toast(`${name}: no entries found. Expecting community 5e JSON, e.g. {"spell":[…]}`); return 0; }
  const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const pack = {id, name, added:Date.now(), count:items.length, data:json};
  try { await IDB.put(pack); } catch (e) { toast('This browser blocked storage, so the import lasts only until you close the page.'); }
  PACKS.push(pack); items.forEach(x => EXT.push(x));
  return items.length;
}
async function importFiles(files){
  let n = 0;
  for (const f of files) n += await importJSON(await f.text(), f.name.replace(/\.json$/i, ''));
  if (n){ buildIndex(); toast(`Imported ${n} entries. They stay on this device, offline.`); renderPage(); }
}
function importPane(){
  return `<div class="grid2" style="margin-top:12px">
    ${card('Already inside this file', `<p>The whole <b>SRD 5.2.1</b>, the free 2024 rules reference released by Wizards of the Coast under CC-BY-4.0, is bundled into this page: ${Object.entries(SRD.meta?.counts || {}).filter(([k]) => CAT_NAME[k]).map(([k, v]) => `${v} ${CAT_NAME[k].toLowerCase()}`).join(', ')}, plus every class feature and subclass in it.</p>
      <p>It needs no connection. Save this page as a file (or keep the downloaded copy) and it works on a plane.</p>
      <p class="muted">Rules marked <span class="src quick">Summary</span> are this tool's own short notes on SRD rules, written for quick reading at the table.</p>`)}
    ${card('Add your own sources', `<p>Import your own homebrew as JSON in the common community 5e format (lists such as <code>{"spell":[…]}</code>, <code>{"monster":[…]}</code>, <code>{"item":[…]}</code>). Entries are stored in this browser's database and stay available offline.</p>
      <div class="drop" id="dropZone"><p>Drop .json files here</p><label class="btn small" for="imp_file" style="display:inline-block">Choose files</label><input type="file" id="imp_file" accept=".json,application/json" multiple class="sr"></div>
      <div class="row mt"><label class="sr" for="imp_url">URL</label><input type="text" id="imp_url" placeholder="…or paste a URL to a JSON file" style="flex:1">${act('importUrl', undefined, 'Fetch')}</div>
      <p class="muted">Only import material you own or that is openly licensed. The SRD is free to use; other rulebooks belong to their publishers.</p>`)}
  </div>
  ${card('Imported sources', PACKS.length ? PACKS.map(p => `<div class="kv"><span><b>${esc(p.name)}</b> <span class="muted">${p.count} entries · ${new Date(p.added).toLocaleDateString()}</span></span>${act('delPack', p.id, 'Remove', 'sb x')}</div>`).join('') : '<p class="muted">Nothing imported yet.</p>', 'style="margin-top:14px"')}`;
}

/* ================================================================== homebrew workshop: your own classes, subclasses, spells… in the same shape as the SRD */
const BREW_ID = 'homebrew', FREE_BREW = 3;
const HB_RARITY_LIST = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact'];
const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];
/* pickers shared by the weapon and spell editors (2024 rules) */
const DMG_TYPES = ['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'];
const DIE_SIDES = [4, 6, 8, 10, 12, 20, 100];
const WEAPON_CATS = ['Simple Melee', 'Martial Melee', 'Simple Ranged', 'Martial Ranged'];
const WEAPON_PROPS = ['Ammunition', 'Finesse', 'Heavy', 'Light', 'Loading', 'Reach', 'Thrown', 'Two-Handed', 'Versatile'];
const WEAPON_MASTERY = ['Cleave', 'Graze', 'Nick', 'Push', 'Sap', 'Slow', 'Topple', 'Vex'];
const CAST_TIMES = ['Action', 'Bonus Action', 'Reaction', '1 minute', '10 minutes', '1 hour', '8 hours', '12 hours', '24 hours'];
const SPELL_RANGES = ['Self', 'Touch', '5 feet', '10 feet', '30 feet', '60 feet', '90 feet', '120 feet', '150 feet', '300 feet', '500 feet', '1 mile', 'Sight', 'Unlimited', 'Self (10-foot Emanation)', 'Self (15-foot Cone)', 'Self (30-foot Line)'];
const SPELL_DURATIONS = ['Instantaneous', '1 round', '1 minute', '10 minutes', '1 hour', '8 hours', '24 hours', '7 days', 'Until dispelled', 'Special'];
const SPELL_SHAPES = ['Cone', 'Cube', 'Cylinder', 'Emanation', 'Line', 'Sphere'];
const SAVE_ABS = [['str', 'Strength'], ['dex', 'Dexterity'], ['con', 'Constitution'], ['int', 'Intelligence'], ['wis', 'Wisdom'], ['cha', 'Charisma']];
const diceParse = v => { const m = String(v || '').match(/^(\d+)d(\d+)$/i); return m ? {n:+m[1], d:+m[2]} : {n:'', d:''}; };
const diceStr = (n, d) => { n = parseInt(n, 10); d = parseInt(d, 10); return n > 0 && d > 0 ? `${n}d${d}` : ''; };
const diceField = (id, label, v) => { const p = diceParse(v);
  return `<div><label class="f" for="${id}">${esc(label)}</label><div class="bwDice"><input type="number" id="${id}" min="0" max="99" value="${p.n}" placeholder="0" aria-label="${esc(label)}: number of dice"><span aria-hidden="true">d</span><select id="${id}_d" aria-label="${esc(label)}: die"><option value="">—</option>${DIE_SIDES.map(d => opt(d, p.d, 'd' + d)).join('')}</select></div></div>`; };
const readDice = id => diceStr($('#' + id)?.value, $('#' + id + '_d')?.value);
const pickField = (id, label, v, list, blank) => `<div><label class="f" for="${id}">${esc(label)}</label><select id="${id}" style="width:100%">${blank !== undefined ? opt('', v ?? '', blank) : ''}${list.map(x => Array.isArray(x) ? opt(x[0], v ?? '', x[1]) : opt(x, v ?? '')).join('')}</select></div>`;
// one form per kind: [key, label, type, options/placeholder]
const BREW = {
  classes:{t:'Class', hint:'Appears in the class menus, in Level up and in multiclassing.', f:[
    ['n', 'Name', 'text', 'e.g. Blood Hunter'], ['hd', 'Hit Die', 'select', ['6', '8', '10', '12']], ['prim', 'Primary ability', 'text', 'e.g. Intelligence, or Strength or Dexterity'],
    ['saves', 'Saving throw proficiencies', 'abil'], ['prof', 'Armor, weapons and tools', 'text', 'Light armor, Simple weapons'], ['choice', 'Skills', 'text', 'Choose 2: Arcana, History, Insight'],
    ['caster', 'Spellcasting', 'select', [['', 'None'], ['full', 'Full caster (slots like a Wizard)'], ['half', 'Half caster (like a Paladin)'], ['third', 'Third caster (from level 3)'], ['pact', 'Pact Magic (like a Warlock)']]],
    ['spellAb', 'Spellcasting ability', 'select', [['', '—'], ['int', 'Intelligence'], ['wis', 'Wisdom'], ['cha', 'Charisma']]],
    ['mcProf', 'Proficiencies when multiclassing into it', 'text', 'Light armor'], ['x', 'Description', 'area', 'What the class is about'],
    ['f', 'Features', 'feats', '1 Hunter\'s Bane: You gain…\n2 Blood Maledict: …\n3 Subclass: choose an order.\n4 Ability Score Improvement']]},
  subclasses:{t:'Subclass', hint:'Appears in the subclass menu of its class.', f:[
    ['n', 'Name', 'text', 'e.g. Order of the Ghostslayer'], ['cls', 'Class', 'class'], ['sum', 'In one line', 'text', 'Hunters of the restless dead'], ['x', 'Description', 'area'],
    ['f', 'Features', 'feats', '3 Rite of the Dawn: …\n7 Ethereal Step: …']]},
  spells:{t:'Spell', hint:'Search it from the Spellbook; it shows on the lists of the classes you tick.', f:[
    ['n', 'Name', 'text', 'e.g. Ember Lash'], ['lv', 'Level', 'select', [['0', 'Cantrip'], ...[1,2,3,4,5,6,7,8,9].map(n => [String(n), 'Level ' + n])]], ['sc', 'School', 'select', SCHOOLS],
    ['t', 'Casting time', 'combo', CAST_TIMES], ['r', 'Range', 'combo', SPELL_RANGES], ['c', 'Components', 'comps'], ['d', 'Duration', 'combo', SPELL_DURATIONS],
    ['conc', 'Concentration', 'check'], ['rit', 'Ritual', 'check'], ['cls', 'Spell lists', 'classes'], ['fx', 'What it does', 'fx'],
    ['x', 'Effect text', 'area', 'Anything the pickers above can’t say. The rules line they write is added on top of it.'], ['h', 'Using a higher-level slot (optional)', 'area', 'Left empty, it is written for you from the “Grows” pickers.']]},
  feats:{t:'Feat', hint:'Offered in Traits & Feats and at Ability Score Improvements.', f:[
    ['n', 'Name', 'text'], ['ty', 'Category', 'select', ['Origin', 'General', 'Fighting Style', 'Epic Boon']], ['pre', 'Prerequisite', 'text', 'Level 4+'], ['rep', 'Repeatable', 'check'], ['x', 'Benefit', 'area']]},
  species:{t:'Species', hint:'Appears in the species menu of the Hero page.', f:[
    ['n', 'Name', 'text'], ['ty', 'Creature type', 'text', 'Humanoid'], ['size', 'Size', 'select', ['Medium', 'Small', 'Small or Medium', 'Large']], ['speed', 'Speed (feet)', 'number', '30'],
    ['x', 'Description', 'area'], ['tr', 'Traits', 'traits', 'Darkvision: You see in dim light within 60 feet…\nStone Skin: …']]},
  backgrounds:{t:'Background', hint:'Appears in the background menu of the Hero page.', f:[
    ['n', 'Name', 'text'], ['asi', 'Ability scores', 'abil'], ['feat', 'Origin feat', 'feat'], ['skills', 'Skills', 'text', 'Insight, Religion'], ['tools', 'Tools', 'text', "Calligrapher's Supplies"],
    ['eq', 'Equipment', 'text', '50 GP of gear'], ['x', 'Description', 'area']]},
  items:{t:'Magic item', hint:'Add it to a pack from Pack & Riches or the Library.', f:[
    ['n', 'Name', 'text'], ['cat', 'Type', 'select', ['Wondrous Item', 'Armor', 'Weapon', 'Ring', 'Rod', 'Staff', 'Wand', 'Potion', 'Scroll']], ['rar', 'Rarity', 'select', RARITIES.slice(1)],
    ['att', 'Requires attunement', 'check'], ['base', 'Base item (when equipped)', 'text', 'Longsword, Chain Mail…'], ['acm', 'AC bonus (when equipped)', 'number', '1'], ['wb', 'Attack and damage bonus', 'number', '1'], ['wd', 'Weapon damage (no base item)', 'text', '1d8 Slashing'], ['x', 'Description', 'area']]},
  weapons:{t:'Weapon', hint:'Add it to a pack from Pack & Riches or the Library; equipped, it joins your attacks.', f:[
    ['n', 'Name', 'text', 'e.g. Emberfang'], ['wc', 'Weapon type', 'select', WEAPON_CATS], ['dd', 'Damage dice', 'dice'], ['dt', 'Damage type', 'select', DMG_TYPES],
    ['props', 'Properties', 'multi', WEAPON_PROPS], ['vd', 'Versatile damage (two hands)', 'dice'], ['mast', 'Mastery', 'select', [['', 'None'], ...WEAPON_MASTERY]],
    ['rn', 'Normal range (feet)', 'number', '80'], ['rl', 'Long range (feet)', 'number', '320'],
    ['mb', 'Magic bonus', 'select', [['0', 'None'], ['1', '+1'], ['2', '+2'], ['3', '+3']]], ['rar', 'Rarity', 'select', ['Mundane', ...HB_RARITY_LIST]], ['att', 'Requires attunement', 'check'],
    ['wt', 'Weight (lb)', 'number', '3'], ['val', 'Cost', 'text', '15 gp'],
    ['sp', 'Special abilities', 'area', 'e.g. Flame Lash: once per turn, deal an extra 1d6 Fire damage to a creature you hit.'], ['x', 'Description', 'area']]},
  monsters:{t:'Creature', hint:'Add it to fights from the Encounter page.', f:[
    ['n', 'Name', 'text'], ['sz', 'Size', 'select', ['Tiny', 'Small', 'Medium', 'Small or Medium', 'Large', 'Huge', 'Gargantuan']], ['ty', 'Type', 'text', 'monstrosity'], ['al', 'Alignment', 'text', 'unaligned'],
    ['ac', 'Armor Class', 'number', '13'], ['hp', 'Hit Points', 'text', '45 (6d10 + 12)'], ['spd', 'Speed', 'text', '30 ft., fly 60 ft.'], ['ab', 'Ability scores', 'scores'],
    ['cr', 'Challenge rating', 'text', '3'], ['sv', 'Saving throws', 'text', 'Dex +5, Wis +3'], ['sk', 'Skills', 'text', 'Perception +4, Stealth +5'],
    ['res', 'Resistances', 'text', 'Cold, Fire'], ['imm', 'Immunities', 'text', 'Poison; Poisoned'], ['sen', 'Senses', 'text', 'darkvision 60 ft., passive Perception 12'], ['lang', 'Languages', 'text', '—'],
    ['tr', 'Traits', 'traits', 'Keen Smell: Advantage on Wisdom (Perception) checks that rely on smell.'], ['act', 'Actions', 'traits', 'Bite: Melee Attack Roll: +5, reach 5 ft. Hit: 10 (2d6 + 3) Piercing damage.'],
    ['bon', 'Bonus actions', 'traits', 'Nimble Escape: The creature takes the Disengage or Hide action.'], ['re', 'Reactions', 'traits', 'Parry: The creature adds 2 to its AC against one melee attack that would hit it.'],
    ['leg', 'Legendary actions', 'traits', 'Swoop: The creature moves up to half its Speed.']]},
};
let BREW_ITEMS = [];
const brewPack = () => ({id:BREW_ID, name:'Homebrew', kind:'brew', added:Date.now(), count:BREW_ITEMS.length, items:BREW_ITEMS});
const brewKey = (cat, o) => cat === 'spells' ? (+o.lv ? `Lv ${hbStr(o.lv)} · ${hbStr(o.sc)}` : `Cantrip · ${hbStr(o.sc)}`) : cat === 'feats' ? hbStr(o.ty) : cat === 'subclasses' ? hbStr(o.cls) : cat === 'classes' ? `d${hbStr(o.hd)} · ${hbStr(o.prim)}` : cat === 'items' ? hbStr(o.rar) : cat === 'weapons' ? `${hbStr(o.wc)} · ${hbStr(o.dd)} ${hbStr(o.dt)}` : cat === 'monsters' ? 'CR ' + hbStr(o.cr) : '';
const cleanBrew = list => (Array.isArray(list) ? list : []).filter(it => isObj(it) && typeof it.cat === 'string' && Object.hasOwn(BREW, it.cat) && isObj(it.o) && typeof it.o.n === 'string' && it.o.n.trim())
  .map(it => ({...it, o:{...it.o, n:it.o.n.trim().slice(0, 80)}}));
/* a homebrew weapon is stored as the form (so it can be edited) and shown to the rest of the tome as a Magic item that carries weapon damage, so the pack, Equip and the attacks already know it */
const brewEntry = it => ({cat:it.cat === 'weapons' ? 'items' : it.cat, n:it.o.n, o:it.cat === 'weapons' ? weaponAsItem(it.o) : it.o, src:'Homebrew', k:brewKey(it.cat, it.o), id:'brew:' + it.id});
function weaponAsItem(o){
  const props = (Array.isArray(o.props) ? o.props : []).filter(p => WEAPON_PROPS.includes(p)), mb = clamp(parseInt(o.mb, 10) || 0, 0, 3), wc = o.wc || 'Martial Melee';
  const dd = hbStr(o.dd) || '1d6', dt = hbStr(o.dt) || 'Slashing', rng = +o.rn > 0 ? `${+o.rn}/${+o.rl > 0 ? +o.rl : +o.rn * 4} ft.` : '';
  const pt = props.map(p => p === 'Versatile' && o.vd ? `Versatile (${o.vd})` : (p === 'Ammunition' || p === 'Thrown') && rng ? `${p} (range ${rng})` : p);
  const L = [`*Weapon (${wc})*${mb ? ', ' + fmt(mb) + ' to attack and damage rolls' : ''}`, `**Damage.** ${dd}${mb ? fmt(mb) : ''} ${dt}${o.vd && props.includes('Versatile') ? `, ${o.vd} two-handed` : ''}`];
  if (pt.length) L.push(`**Properties.** ${pt.join(', ')}`);
  if (o.mast) L.push(`**Mastery.** ${o.mast}`);
  if (rng && !props.some(p => p === 'Ammunition' || p === 'Thrown')) L.push(`**Range.** ${rng}`);
  if (hbStr(o.sp)) L.push(`**Special.** ${hbStr(o.sp)}`);
  if (hbStr(o.x)) L.push(hbStr(o.x));
  return {n:o.n, cat:`Weapon (${wc})`, rar:o.rar === 'Mundane' ? '' : hbStr(o.rar), att:!!o.att, wd:`${dd} ${dt}`, wb:mb || undefined, wt:+o.wt > 0 ? +o.wt : undefined, cost:hbStr(o.val) || undefined,
    hw:{wc, props, vd:hbStr(o.vd), mast:hbStr(o.mast), rng, sp:!!hbStr(o.sp)}, x:L.join('\n\n')};
}
/* the rules line a spell's pickers write, in the 2024 wording */
function spellFxText(o){
  const f = o.fx; if (!isObj(f)) return '';
  const dmg = f.dd ? `${f.dd} ${f.dt || ''} damage`.replace(/\s+/g, ' ').trim() : '', area = f.shape ? `${+f.size > 0 ? f.size + '-foot ' : ''}${f.shape}` : '', ab = (SAVE_ABS.find(a => a[0] === f.ab) || [])[1];
  const L = [];
  if (f.mode === 'attack') L.push(`Make a spell attack roll${area ? ` against each creature in a ${area}` : ' against a target within range'}. On a hit: ${dmg || 'the effect applies'}.`);
  else if (f.mode === 'save') L.push(`${area ? `Each creature in a ${area}` : 'The target'} makes a ${ab || ''} saving throw. Failure: ${dmg || 'the effect applies'}. Success: ${dmg && f.half ? 'half damage' : 'no effect'}.`.replace('a  saving', 'a saving'));
  else if (dmg) L.push(`${area ? `Each creature in a ${area} takes` : 'The target takes'} ${dmg}.`);
  else if (area) L.push(`Area: ${area}.`);
  if (f.heal) L.push(`The target regains ${f.heal}${f.hm ? ' plus your spellcasting ability modifier' : ''} Hit Points.`);
  return L.join(' ');
}
function spellFxHigher(o){
  const f = o.fx; if (!isObj(f)) return '';
  const what = f.dd ? 'damage' : f.heal ? 'healing' : '';
  if (!what) return '';
  if (+o.lv === 0){ const p = diceParse(f.dd); return f.cant && p.n ? `The damage increases by ${p.n}d${p.d} when you reach levels 5 (${p.n * 2}d${p.d}), 11 (${p.n * 3}d${p.d}) and 17 (${p.n * 4}d${p.d}).` : ''; }
  return f.up ? `The ${what} increases by ${f.up} for each spell slot level above ${o.lv}.` : '';
}
const brewClass = n => BREW_ITEMS.find(it => it.cat === 'classes' && it.o.n === n)?.o;
async function saveBrew(){
  brewStamp();
  try { await IDB.put(brewPack()); } catch (e) { toast('This browser blocked storage, so your homebrew lasts only until you close the page.'); }
  if (CLOUD && me()) schedulePush();
}
/* ---- homebrew follows the account ----
   Every entry has an id and an updatedAt (device clock). brewStamp, called by every save, gives the time to the entries
   that changed and writes a tombstone for the ones that are gone. The cloud keeps one row per entry (table homebrew).
   A sync (brewReconcile) never drops an entry that exists only here, lets the later edit win per entry, and a delete
   wins over an older edit. The tombstones live on the device until the cloud has them. */
const brewSigOf = it => JSON.stringify([it.cat, it.o]);
let BREW_SIG = new Map();
function brewMarkClean(){ BREW_SIG = new Map(BREW_ITEMS.map(it => [it.id, brewSigOf(it)])); }
const BREW_TOMB = 'grimoire-brew-tomb-v1', BREW_OWNER = 'grimoire-brew-owner-v1';
function brewTombLoad(){ try { const t = JSON.parse(localStorage.getItem(BREW_TOMB) || '{}'); return isObj(t) ? t : {}; } catch (e) { return {}; } }
function brewTombSave(t){ try { Object.keys(t).length ? localStorage.setItem(BREW_TOMB, JSON.stringify(t)) : localStorage.removeItem(BREW_TOMB); } catch (e) {} }
function brewStamp(){
  const now = Date.now(), seen = new Set(), tomb = brewTombLoad();
  let gone = false;
  for (const it of BREW_ITEMS){ seen.add(it.id); const sig = brewSigOf(it); if (BREW_SIG.get(it.id) !== sig){ it.updatedAt = now; BREW_SIG.set(it.id, sig); } }
  for (const id of [...BREW_SIG.keys()]) if (!seen.has(id)){ BREW_SIG.delete(id); if (CLOUD){ tomb[id] = now; gone = true; } }
  if (gone) brewTombSave(tomb);
}
// local: the entries here; rows: the cloud rows {id, data:{cat, o, updatedAt}, deleted}; tomb: {id: deletedAt}.
// Returns the merged list, the entries to send, the deletes to send and whether this device's list changed.
function brewReconcile(local, rows, tomb){
  const cloud = new Map(rows.map(r => [r.id, r])), taken = new Set(), items = [], push = [], del = [];
  const key = it => it.cat + '\u0000' + norm(it.o.n), when = it => +it.updatedAt || 0;
  let changed = false;
  for (const r of rows){
    const rt = +r.data?.updatedAt || 0, l = local.find(x => x.id === r.id);
    if (l) taken.add(l);
    if (r.deleted){
      if (l && when(l) > rt){ items.push(l); push.push(l); }     // edited here after it was deleted elsewhere: it lives on
      else if (l) changed = true;
      continue;
    }
    const [it] = cleanBrew([{id:r.id, cat:r.data?.cat, o:r.data?.o, updatedAt:rt}]);
    if (!it){ if (l){ items.push(l); push.push(l); } continue; }  // a row this version cannot read: keep ours, leave theirs
    if (!l){
      if (tomb[r.id] != null && tomb[r.id] >= rt){ del.push({id:r.id, at:tomb[r.id]}); continue; }   // deleted here, the cloud still has it
      const twin = local.find(x => !taken.has(x) && !cloud.has(x.id) && key(x) === key(it));        // the same entry made on two devices
      if (twin){ taken.add(twin); if (when(twin) > rt){ items.push({...twin, id:r.id}); push.push({...twin, id:r.id}); } else items.push(it); changed = true; continue; }
      items.push(it); changed = true; continue;
    }
    if (when(l) > rt){ items.push(l); push.push(l); }
    else if (when(l) < rt){ items.push(it); changed = true; }
    else items.push(l);
  }
  for (const l of local) if (!taken.has(l)){ items.push(l); if (!cloud.has(l.id)) push.push(l); }
  return {items, push, del, changed};
}
const BREW_MISSING = /schema cache|does not exist|could not find|HTTP 404|PGRST20\d/i;
async function syncBrew(){
  if (S.brewOff || !me()) return;
  let rows;
  try { rows = await db('/homebrew?select=id,data,deleted,updated_at'); }
  catch (e){ if (BREW_MISSING.test(e.message)){ S.brewOff = true; return; } throw e; }   // table not created yet: homebrew stays on this device
  let prev = null; try { prev = localStorage.getItem(BREW_OWNER); } catch (e) {}
  let moved = false;
  if (prev && prev !== me()){                       // another account used this device: keep its entries aside, never mix them in
    if (BREW_ITEMS.length){ try { localStorage.setItem('grimoire-brew-backup-v1:' + prev, JSON.stringify(BREW_ITEMS)); } catch (e) {} }
    BREW_ITEMS = []; brewMarkClean(); brewTombSave({}); moved = true;
  }
  const tomb = brewTombLoad(), r = brewReconcile(BREW_ITEMS, rows || [], tomb);
  BREW_ITEMS = r.items; brewMarkClean();
  if (r.changed || moved){
    try { await IDB.put(brewPack()); } catch (e) {}
    reloadBrew();
    if (!G.turning && !$('#modalBk') && !isTyping()) render(); else G.needRender = true;
  }
  try { localStorage.setItem(BREW_OWNER, me()); } catch (e) {}
  const out = r.push.map(it => ({id:it.id, owner:me(), data:{cat:it.cat, o:it.o, updatedAt:+it.updatedAt || 0}, deleted:false}))
    .concat(r.del.map(d => ({id:d.id, owner:me(), data:{updatedAt:d.at}, deleted:true})));
  for (let i = 0; i < out.length; i += 50) await db('/homebrew?on_conflict=id', {method:'POST', body:out.slice(i, i + 50), prefer:'resolution=merge-duplicates,return=minimal'});
  if (Object.keys(tomb).length){ const now = brewTombLoad(); for (const id of Object.keys(tomb)) delete now[id]; brewTombSave(now); }
}

function reloadBrew(){ for (let i = EXT.length - 1; i >= 0; i--) if (EXT[i].src === 'Homebrew') EXT.splice(i, 1); BREW_ITEMS.forEach(it => EXT.push(brewEntry(it))); buildIndex(); }

const brewLines = s => String(s || '').split('\n').map(l => l.trim()).filter(Boolean);
// "3 Name: text" ↔ {l, n, x}; "Name: text" ↔ {n, x}
const parseFeats = s => brewLines(s).map(l => { const m = l.match(/^(\d{1,2})\s*[.)·-]?\s*([^:]+?)\s*(?::\s*(.*))?$/); return m ? {l:clamp(+m[1], 1, 20), n:m[2], x:m[3] || ''} : null; }).filter(Boolean).sort((a, b) => a.l - b.l);
const parseTraits = s => brewLines(s).map(l => { const m = l.match(/^([^:]{1,60}):\s*(.*)$/); return m ? {n:m[1].trim(), x:m[2]} : {n:'', x:l}; });
const featsText = f => (f || []).map(x => `${x.l} ${x.n}${x.x ? ': ' + x.x : ''}`).join('\n');
const traitsText = t => (t || []).map(x => (x.n ? x.n + ': ' : '') + x.x).join('\n');

function brewField([k, label, type, extra], o){
  const id = 'bw_' + k, v = o[k];
  const lab = `<label class="f" for="${id}">${esc(label)}</label>`;
  switch (type){
    case 'text': case 'number': return `<div>${lab}<input type="${type}" id="${id}" value="${esc(v ?? '')}" placeholder="${esc(extra || '')}" style="width:100%"></div>`;
    case 'select': return `<div>${lab}<select id="${id}" style="width:100%">${extra.map(x => Array.isArray(x) ? opt(x[0], v ?? '', x[1]) : opt(x, v ?? '')).join('')}</select></div>`;
    case 'class': return `<div>${lab}<select id="${id}" style="width:100%">${names('classes').map(n => opt(n, v)).join('')}</select></div>`;
    case 'feat': return `<div>${lab}<select id="${id}" style="width:100%"><option value="">—</option>${names('feats').map(n => opt(n, v)).join('')}</select></div>`;
    case 'check': return `<label class="row bwCheck"><input type="checkbox" id="${id}" ${v ? 'checked' : ''}> ${esc(label)}</label>`;
    case 'abil': { const set = (v || []).map(a => String(a).slice(0, 3).toUpperCase());
      return `<div class="bwWide"><span class="f">${esc(label)}</span><div class="row">${ABIL.map(a => `<label class="row"><input type="checkbox" class="${id}" value="${a.id.toUpperCase()}" ${set.includes(a.id.toUpperCase()) ? 'checked' : ''}> ${a.id.toUpperCase()}</label>`).join('')}</div></div>`; }
    case 'classes': return `<div class="bwWide"><span class="f">${esc(label)}</span><div class="row">${names('classes').map(n => `<label class="row"><input type="checkbox" class="${id}" value="${esc(n)}" ${(v || []).includes(n) ? 'checked' : ''}> ${esc(n)}</label>`).join('')}</div></div>`;
    case 'scores': { const ab = v || [10, 10, 10, 10, 10, 10];
      return `<div class="bwWide"><span class="f">${esc(label)}</span><div class="bwScores">${ABIL.map((a, i) => `<label>${a.id.toUpperCase()}<input type="number" class="${id}" min="1" max="30" value="${ab[i]}"></label>`).join('')}</div></div>`; }
    case 'combo': return `<div>${lab}<input type="text" id="${id}" list="${id}_l" value="${esc(v ?? '')}" style="width:100%" autocomplete="off"><datalist id="${id}_l">${extra.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>`;
    case 'dice': return diceField(id, label, v);
    case 'multi': return `<div class="bwWide"><span class="f">${esc(label)}</span><div class="row">${extra.map(n => `<label class="row"><input type="checkbox" class="${id}" value="${esc(n)}" ${(v || []).includes(n) ? 'checked' : ''}> ${esc(n)}</label>`).join('')}</div></div>`;
    case 'comps': { const set = String(v || '').toUpperCase(), mat = String(v || '').match(/M\s*\(([^)]*)\)/i)?.[1] || '';
      return `<div class="bwWide"><span class="f">${esc(label)}</span><div class="row">${['V', 'S', 'M'].map(k => `<label class="row"><input type="checkbox" class="${id}" value="${k}" ${new RegExp('(^|[^A-Z])' + k + '([^A-Z]|$)').test(set.replace(/\([^)]*\)/g, '')) ? 'checked' : ''}> ${k === 'V' ? 'Verbal' : k === 'S' ? 'Somatic' : 'Material'}</label>`).join('')}</div>
        <label class="f" for="${id}_m">Material (when ticked)</label><input type="text" id="${id}_m" value="${esc(mat)}" placeholder="a pinch of ash" style="width:100%"></div>`; }
    case 'fx': { const f = isObj(v) ? v : {};
      return `<div class="bwWide"><span class="f">${esc(label)}</span><p class="muted small">Optional. Fill what applies and the entry writes the rules line for you.</p><div class="bwFx">
        ${pickField('bw_fx_mode', 'How it works', f.mode, [['attack', 'Spell attack roll'], ['save', 'Saving throw']], 'Nothing to roll')}
        ${pickField('bw_fx_ab', 'Saving throw', f.ab, SAVE_ABS)}
        ${diceField('bw_fx_dd', 'Damage dice', f.dd)}${pickField('bw_fx_dt', 'Damage type', f.dt, DMG_TYPES, '—')}
        <label class="row bwCheck"><input type="checkbox" id="bw_fx_half" ${f.half ? 'checked' : ''}> Half damage on a save</label>
        ${diceField('bw_fx_heal', 'Healing dice', f.heal)}<label class="row bwCheck"><input type="checkbox" id="bw_fx_hm" ${f.hm ? 'checked' : ''}> Add your spellcasting modifier</label>
        ${pickField('bw_fx_shape', 'Area', f.shape, SPELL_SHAPES, 'Single target')}<div><label class="f" for="bw_fx_size">Size (feet)</label><input type="number" id="bw_fx_size" min="0" max="500" value="${esc(f.size ?? '')}" placeholder="20"></div>
        <div class="bwWide"><span class="f">Grows</span></div>
        ${diceField('bw_fx_up', 'Extra per slot level above', f.up)}<label class="row bwCheck"><input type="checkbox" id="bw_fx_cant" ${f.cant ? 'checked' : ''}> Cantrip: more dice at levels 5, 11 and 17</label>
      </div></div>`; }
    case 'area': return `<div class="bwWide">${lab}<textarea id="${id}" placeholder="${esc(extra || '')}">${esc(v || '')}</textarea></div>`;
    case 'feats': return `<div class="bwWide">${lab}<p class="muted small">One per line: the level, the name, a colon, then the text.</p><textarea id="${id}" style="min-height:140px" placeholder="${esc(extra)}">${esc(featsText(v))}</textarea></div>`;
    case 'traits': return `<div class="bwWide">${lab}<p class="muted small">One per line: the name, a colon, then the text.</p><textarea id="${id}" placeholder="${esc(extra)}">${esc(traitsText(v))}</textarea></div>`;
  }
  return '';
}
function readBrew(cat){
  const o = {};
  for (const [k, , type] of BREW[cat].f){
    const el = $('#bw_' + k), all = $$('.bw_' + k);
    if (type === 'check') o[k] = !!el?.checked;
    else if (type === 'abil' || type === 'classes') o[k] = all.filter(x => x.checked).map(x => x.value);
    else if (type === 'scores') o[k] = all.map(x => clamp(parseInt(x.value, 10) || 10, 1, 30));
    else if (type === 'dice') o[k] = readDice('bw_' + k);
    else if (type === 'multi') o[k] = all.filter(x => x.checked).map(x => x.value);
    else if (type === 'comps'){ const ch = all.filter(x => x.checked).map(x => x.value), mat = ($('#bw_' + k + '_m')?.value || '').trim(); o[k] = ch.map(x => x === 'M' && mat ? `M (${mat})` : x).join(', '); }
    else if (type === 'fx'){ const f = {mode:$('#bw_fx_mode')?.value || '', ab:$('#bw_fx_ab')?.value || '', dd:readDice('bw_fx_dd'), dt:$('#bw_fx_dt')?.value || '', half:!!$('#bw_fx_half')?.checked, heal:readDice('bw_fx_heal'), hm:!!$('#bw_fx_hm')?.checked,
        shape:$('#bw_fx_shape')?.value || '', size:clamp(parseInt($('#bw_fx_size')?.value, 10) || 0, 0, 500) || '', up:readDice('bw_fx_up'), cant:!!$('#bw_fx_cant')?.checked};
      o[k] = Object.fromEntries(Object.entries(f).filter(([, x]) => x)); }
    else if (type === 'feats') o[k] = parseFeats(el.value);
    else if (type === 'traits') o[k] = parseTraits(el.value);
    else o[k] = el.value.trim();
  }
  if (cat === 'classes'){ o.hd = +o.hd || 8; o.prof = o.prof ? o.prof.split(/,\s*/) : []; o.choice = o.choice ? [o.choice] : []; }
  if (cat === 'spells') o.lv = +o.lv || 0;
  if (cat === 'weapons'){ o.mb = parseInt(o.mb, 10) || 0; o.rn = +o.rn || ''; o.rl = +o.rl || ''; o.wt = +o.wt || ''; }
  if (cat === 'species') o.speed = +o.speed || 30;
  if (cat === 'backgrounds'){ o.skills = o.skills ? o.skills.split(/,\s*/) : []; o.tools = o.tools ? [o.tools] : []; }
  if (cat === 'monsters'){ o.cr = isNaN(+o.cr) ? o.cr : +o.cr; o.ac = o.ac || '10'; o.hp = o.hp || '10'; }
  return o;
}
/* ---- the Homebrew page: a home with everything you made (create · find · import), and an editor with a live preview */
const BREW_ICON = {classes:'🛡️', subclasses:'🔱', spells:'✨', feats:'🏅', species:'🧝', backgrounds:'📜', items:'💍', weapons:'⚔️', monsters:'🐉'};
const BREW_DESC = {classes:'Hit die, proficiencies, spellcasting and features by level', subclasses:'A new path for any class', spells:'Level, school, components, damage or save, scaling and the classes that learn it',
  feats:'Origin, general, fighting style or epic boon', species:'Size, speed and traits', backgrounds:'Ability scores, origin feat, skills and gear',
  items:'Rarity, type and attunement', weapons:'Dice, damage type, properties, mastery and magic bonus', monsters:'A full stat block, ready for the Encounter page'};
const brewCount = k => BREW_ITEMS.filter(it => it.cat === k).length;
const brewFreeNote = () => plusOK() ? '' : `<p class="muted small">Free plan: ${Math.max(0, FREE_BREW - BREW_ITEMS.length)} of ${FREE_BREW} creations left. ${act('plus', undefined, 'Unlimited with Grimoire+', 'sb')}</p>`;
function workshopHTML(){ return G.brewView === 'edit' ? brewEditorHTML() : brewHomeHTML(); }
const brewRow = it => `<div class="hbRow"><span class="ico" aria-hidden="true">${BREW_ICON[it.cat]}</span>
  <span class="t"><button type="button" class="xref" data-act="detailId" data-arg="brew:${esc(it.id)}">${esc(it.o.n)}</button><span class="muted small">${esc(BREW[it.cat].t)}${brewKey(it.cat, it.o) ? ' · ' + esc(brewKey(it.cat, it.o)) : ''}</span></span>
  <span class="row">${act('brewEdit', it.id, 'Edit', 'sb', `aria-label="Edit ${esc(it.o.n)}"`)}${act('brewDup', it.id, 'Duplicate', 'sb', `aria-label="Duplicate ${esc(it.o.n)}"`)}${act('brewDel', it.id, 'Delete', 'sb x', `aria-label="Delete ${esc(it.o.n)}"`)}</span></div>`;
/* the list is grouped by kind (and inside a kind by spell level, subclass class or rarity), each group folded until opened, so a long collection does not mean a long scroll */
const BREW_SUB = {spells:it => +it.o.lv ? 'Level ' + (+it.o.lv) : 'Cantrips', subclasses:it => hbStr(it.o.cls) || 'No class', items:it => hbStr(it.o.rar) || 'No rarity'};
const BREW_CAP = 40;
function brewListHTML(){
  const f = Object.hasOwn(BREW, G.brewFilter || '') ? G.brewFilter : '', q = norm(G.brewQ || '');
  const list = BREW_ITEMS.filter(it => (!f || it.cat === f) && (!q || norm(it.o.n).includes(q))).sort((a, b) => a.o.n.localeCompare(b.o.n));
  if (!list.length) return '<p class="empty">Nothing matches. Try another word or kind.</p>';
  const open = G.brewOpen || (G.brewOpen = {}), kinds = Object.keys(BREW).filter(k => list.some(it => it.cat === k));
  const forced = !!q || !!f || kinds.length === 1 || list.length <= 12;   // a search, a kind picked, a single kind or a short list: nothing to fold
  const rows = (k, arr) => {
    const sub = BREW_SUB[k];
    if (!sub) return capRows(k, '', arr);
    const m = new Map(); arr.forEach(it => { const g = sub(it); (m.get(g) || m.set(g, []).get(g)).push(it); });
    const keys = [...m.keys()].sort((a, b) => k === 'spells' ? (a === 'Cantrips' ? -1 : b === 'Cantrips' ? 1 : parseInt(a.slice(6)) - parseInt(b.slice(6))) : k === 'items' ? HB_RARITY_LIST.indexOf(a) - HB_RARITY_LIST.indexOf(b) : a.localeCompare(b));
    return keys.map(g => `<div class="hbSub"><h5>${esc(g)} <span class="muted">${m.get(g).length}</span></h5>${capRows(k, g, m.get(g))}</div>`).join('');
  };
  const capRows = (k, g, arr) => {
    const id = k + '/' + g, all = (G.brewAll || {})[id] || arr.length <= BREW_CAP;
    return arr.slice(0, all ? arr.length : BREW_CAP).map(brewRow).join('') + (all ? '' : `<div class="row">${act('brewMore', id, `Show all ${arr.length}`, 'sb')}</div>`);
  };
  return kinds.map(k => {
    const arr = list.filter(it => it.cat === k), on = forced || open[k];
    return `<section class="hbGrp"><h4>${forced && kinds.length === 1 ? '' : act('brewGrp', k, `<span aria-hidden="true">${on ? '▾' : '▸'}</span> ${BREW_ICON[k]} ${esc(BREW[k].t)} <span class="muted">${arr.length}</span>`, 'hbGrpBtn', `aria-expanded="${on}"`)}</h4>${on ? `<div class="hbGrpBody">${rows(k, arr)}</div>` : ''}</section>`;
  }).join('');
}
const HB_GUIDE = {
  '# Spell:':'Level (Cantrip or 1–9), School, Casting time, Range, Components, Duration, Concentration, Ritual, Classes; text; “## Using a Higher-Level Spell Slot”.',
  '# Feat:':'Category (Origin, General, Fighting Style, Epic Boon), Prerequisite, Repeatable; text.',
  '# Species:':'Creature type, Size, Speed; text; “## Traits” with one “**Name.** text” per trait.',
  '# Background:':'Ability scores (three), Origin feat, Skills (two), Tools (one), Equipment; text.',
  '# Class:':'Hit die, Primary ability, Saving throws (two), Proficiencies, Skills (“Choose 2: …”), Spellcasting (none, full, half, third, pact), Spellcasting ability, Multiclassing; “## Features” with “### Level 1: Name”.',
  '# Subclass:':'Class, Summary; text; “## Features” with “### Level 3: Name”.',
  '# Item:':'Type, Rarity, Attunement; optional Base item, AC bonus, Attack and damage bonus, Weapon damage; text.',
  '# Creature:':'Size, Type, Alignment, Armor class, Hit points, Speed, Ability scores (six numbers), Challenge, Saving throws, Skills, Resistances, Immunities, Senses, Languages; traits as “**Name.** text”; “## Actions”, “## Bonus Actions”, “## Reactions”, “## Legendary Actions”.',
};
function brewHomeHTML(){
  const n = BREW_ITEMS.length, f = Object.hasOwn(BREW, G.brewFilter || '') ? G.brewFilter : '';
  return `<div class="hbIntro"><p>Make your own content and it joins every menu of the tome: hero pages, level up, the spellbook, the pack and encounters. ${CLOUD && me() && !S.brewOff ? 'It follows your account on every device you sign in with' : 'It stays on this device'}; export it to back it up or share it with your table.</p>
    <div class="row">${act('brewGo', 'create', '＋ Create new', 'btn')}${act('brewGo', 'import', '⇩ Import…', 'btn ghost', 'aria-label="Go to Import: files, Markdown and 5etools"')}<label class="btn ghost" for="brew_file">Import file</label><input type="file" id="brew_file" accept=".json,application/json" class="sr">${n ? act('brewExport', undefined, `Export all (${n})`, 'btn ghost') : ''}</div>${brewFreeNote()}</div>
  <section class="hbSec" id="hb_create" aria-labelledby="hb_create_h"><h3 id="hb_create_h">Create something new</h3>
    <div class="hbTiles">${Object.entries(BREW).map(([k, b]) => `<button type="button" class="hbTile" data-act="brewNewKind" data-arg="${k}"><span class="ico" aria-hidden="true">${BREW_ICON[k]}</span><b>${esc(b.t)}</b><span class="d">${esc(BREW_DESC[k])}</span>${brewCount(k) ? `<span class="n">${brewCount(k)} made</span>` : ''}</button>`).join('')}</div></section>
  <section class="hbSec" aria-labelledby="hb_mine_h"><h3 id="hb_mine_h">Your homebrew <span class="muted">${n}</span></h3>
    ${n ? `<div class="row hbBar"><label class="sr" for="brew_q">Search your homebrew</label><input type="search" id="brew_q" placeholder="Search your homebrew" value="${esc(G.brewQ || '')}">
      <div class="libTabs" role="group" aria-label="Show only">${act('brewFilter', '', `All <span class="muted">${n}</span>`, 'sb' + (f ? '' : ' on'), `aria-pressed="${!f}"`)}${Object.keys(BREW).filter(brewCount).map(k => act('brewFilter', k, `${esc(BREW[k].t)} <span class="muted">${brewCount(k)}</span>`, 'sb' + (f === k ? ' on' : ''), `aria-pressed="${f === k}"`)).join('')}</div></div>
      <div class="hbList" id="hb_list" aria-live="polite">${brewListHTML()}</div>`
    : '<div class="empty"><p><b>Nothing here yet.</b></p><p>Pick a kind above to create your first piece of homebrew, or import a file below.</p></div>'}</section>
  <section class="hbSec" id="hb_import" aria-labelledby="hb_imp_h"><h3 id="hb_imp_h" tabindex="-1">Import</h3>
    <div class="drop" id="brewDrop"><p><b>Drop a .md or .json file here</b></p>
      <p class="muted small">Homebrew written in Markdown, a Grimoire homebrew export, or a 5etools-style file with spells, creatures, items, feats, species, backgrounds, classes or subclasses. Every entry is checked against the rules (names, levels, schools, skills, feats, proficiencies, ability scores, sizes, challenge, hit points, bonuses…); you see the errors and warnings and choose what to keep.</p>
      <div class="row" style="justify-content:center;gap:8px"><label class="btn small" for="brew_file2">Choose file</label><input type="file" id="brew_file2" accept=".json,.md,.markdown,.txt,application/json,text/markdown,text/plain" class="sr">${act('brewMdPaste', undefined, 'Paste Markdown', 'btn small ghost')}${act('brewMdTemplate', undefined, 'Markdown template', 'btn small ghost')}${n ? act('brewExportMd', undefined, 'Export as Markdown', 'btn small ghost') : ''}</div></div>
    <div class="hb5" id="hb5"><h4>From 5etools</h4>
      <p class="muted small">Pick a list or paste a 5e.tools data link (or just a file name like <code>spells/spells-efa.json</code>). Your browser fetches it straight from the source, then you get the same check and tick-list as any import. No AI, nothing leaves your device.</p>
      <div class="row hb5Row"><label class="sr" for="hb5_pre">Ready-made lists</label><select id="hb5_pre"><option value="">Choose a list…</option>${HB5_PRESETS.map(([g, l]) => `<optgroup label="${esc(g)}">${l.map(([f, t]) => `<option value="${esc(f)}">${esc(t)}</option>`).join('')}</optgroup>`).join('')}</select></div>
      <div class="row hb5Row"><label class="sr" for="hb5_url">5etools link or file</label><input type="text" id="hb5_url" inputmode="url" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="https://5e.tools/data/spells/spells-efa.json">
        <label class="sr" for="hb5_src">Only this source (optional)</label><input type="text" id="hb5_src" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="Source, e.g. EFA or PHB, XGE" class="hb5Src">
        <label class="sr" for="hb5_ed">Rules edition</label><select id="hb5_ed" title="Which edition of the rules to bring in"><option value="">Any edition</option><option value="one">2024 rules only</option><option value="classic">2014 rules only</option></select></div>
      <div class="row hb5Row">${act('brew5Fetch', undefined, 'Fetch and check', 'btn small')}${act('brew5Paste', undefined, 'Paste JSON instead', 'btn small ghost')}</div>
      <p class="hb5Warn" role="note"><b>⚠ Check what you import.</b> 5etools data is converted automatically, so some entries may come out incomplete or not quite right (effects, scaling, special rules). Read the warnings in the preview and look over each entry after importing. Book content belongs to its publishers: use it for your own table.</p></div>
    <details class="hbGuide"><summary>How to write homebrew in Markdown</summary>
      <p>Each entry starts with a heading that says what it is, then one field per line, then the text. Italian names work too.</p>
      <pre># Spell: Ember Lash
- Level: 1
- School: Evocation
- Casting time: Action
- Range: 30 feet
- Components: V, S, M (a pinch of ash)
- Duration: Instantaneous
- Classes: Sorcerer, Wizard

A whip of embers… 2d8 Fire damage.

## Using a Higher-Level Spell Slot
The damage increases by 1d8 for each slot level above 1.</pre>
      <ul class="small">${Object.entries(HB_GUIDE).map(([k, t]) => `<li><b>${esc(k)}</b>: ${esc(t)}</li>`).join('')}</ul>
      <p class="muted small">The template has a full example of each kind. “Export as Markdown” writes your homebrew in the same format, so you can edit it in any text editor and import it back.</p></details>
    <p class="muted small">Want to start from an existing rule? Open any spell, creature, feat… in the ${act('go', 'library', 'Library', 'xref')} and press <b>Copy to Homebrew</b>.</p></section>`;
}
function brewEditorHTML(){
  const editing = G.brewEdit && BREW_ITEMS.find(it => it.id === G.brewEdit);
  const cat = editing ? editing.cat : Object.hasOwn(BREW, G.brewCat || '') ? G.brewCat : 'classes', B = BREW[cat];
  const o = editing ? editing.o : G.brewDraft?.cat === cat ? G.brewDraft.o : {};
  const verb = editing ? 'Edit' : 'New';
  return `<nav class="hbCrumb" aria-label="Breadcrumb">${act('brewHome', undefined, '← Homebrew', 'sb')}<span aria-hidden="true">›</span><span aria-current="page">${verb} ${esc(B.t.toLowerCase())}${editing ? ': ' + esc(editing.o.n) : ''}</span></nav>
    ${editing ? '' : `<div class="libTabs" role="group" aria-label="What are you making?">${Object.entries(BREW).map(([k, b]) => act('brewCat', k, `<span aria-hidden="true">${BREW_ICON[k]}</span> ${esc(b.t)}`, 'sb' + (k === cat ? ' on' : ''), `aria-pressed="${k === cat}"`)).join('')}</div>`}
    <div class="hbEdit">
      ${card(`<span aria-hidden="true">${BREW_ICON[cat]}</span> ${verb} ${esc(B.t.toLowerCase())}`, `<p class="muted">${esc(B.hint)}</p>
        <form class="bwForm" id="bwForm" data-cat="${cat}" onsubmit="return false">${B.f.map(f => brewField(f, o)).join('')}</form>
        <div class="row mt hbActs">${act('brewSave', undefined, editing ? 'Save changes' : `＋ Add ${esc(B.t.toLowerCase())}`, 'btn')}${act('brewHome', undefined, 'Cancel', 'btn ghost')}${editing ? '<span class="spacer"></span>' + act('brewDel', editing.id, 'Delete', 'btn ghost') : ''}</div>${editing ? '' : brewFreeNote()}`)}
      <aside class="card hbPrev" aria-label="Preview"><h3>Preview</h3><div id="bwPreview">${brewPreview(cat, o)}</div></aside>
    </div>`;
}
function brewChecksHTML(cat, o){
  const r = checkBrew(cat, o, {});
  return `<div class="hbChecks" aria-live="polite"><h4>Checks</h4>${r.err.length + r.warn.length ? hbMsgs(r.err, r.warn) : '<p class="hbOk"><span aria-hidden="true">✓</span> No problems found.</p>'}</div>`;
}
function brewPreview(cat, o){
  if (!o || !String(o.n || '').trim()) return '<p class="muted">Give it a name and the entry appears here as it will in the tome, with a check against the rules.</p>';
  return brewChecksHTML(cat, o) + brewPreviewEntry(cat, o);
}
function brewPreviewEntry(cat, o){
  try { o = checkBrew(cat, o, {}).o; const e = brewEntry({cat, o, id:'preview'});
    return `<div class="head"><h2>${esc(o.n)}</h2>${srcTag(e)}</div><div class="meta">${entryMeta(e)}</div><div class="rule"></div>${entryBody(e)}`; }
  catch (err) { return '<p class="muted">The preview appears as you fill in the form.</p>'; }
}
let brewPrevQ = 0;
function brewLivePreview(){
  cancelAnimationFrame(brewPrevQ);
  brewPrevQ = requestAnimationFrame(() => { const f = $('#bwForm'), box = $('#bwPreview'); if (!f || !box) return; try { box.innerHTML = brewPreview(f.dataset.cat, readBrew(f.dataset.cat)); } catch (e) {} });
}
const brewTop = () => { const p = $('#page'); if (p && p.getBoundingClientRect().top < 0) p.scrollIntoView({block:'start', behavior:reduceMotion() ? 'auto' : 'smooth'}); };
async function brewImport(file){
  try { await brewImport0(file); } catch (e) { toast('That file could not be read as homebrew.'); }
}
async function brewImport0(file){
  const text = await file.text(), name = file.name.replace(/\.(json|md|markdown|txt)$/i, '');
  if (/\.(md|markdown|txt)$/i.test(file.name) || (!/^\s*[{\[]/.test(text) && /^#\s+\S/m.test(text))) return brewMdText(text, name);
  let j; try { j = JSON.parse(text); } catch (e) { toast('That file is not valid JSON.'); return; }
  if (!Array.isArray(j?.grimoireHomebrew)){
    const r = from5(j);
    if (r.items.length) return brewReview(r.items, file.name.replace(/\.json$/i, ''), {skip:r.skip});
    toast(`Nothing Homebrew can use in that file${r.skip ? ` (${r.skip} entries of kinds it has no form for)` : ''}. It takes a Grimoire homebrew export or 5etools-style JSON: one entry, or a file like {"spell":[…]}.`); return;
  }
  const items = cleanBrew(j.grimoireHomebrew), bad = j.grimoireHomebrew.length - items.length;
  if (!items.length){ toast(`No usable entries in that file${bad ? ` (${bad} skipped: each needs a known kind and a text name)` : ''}.`); return; }
  brewReview(items, name, {notes:bad ? [`${bad} ${bad === 1 ? 'entry was' : 'entries were'} left out: each needs a known kind and a text name.`] : []});
}
// same rule for every import: an entry with the same kind and name is replaced, anything else is added
async function mergeBrew(items){
  let n = 0;
  items.forEach(it => { const had = BREW_ITEMS.find(x => x.cat === it.cat && norm(x.o.n) === norm(it.o.n)); if (had) had.o = it.o; else { BREW_ITEMS.push({id:uid(), cat:it.cat, o:it.o}); n++; } });
  await saveBrew(); reloadBrew(); renderPage();
  return n;
}
const ACT_BREW = {
  brewCat(k){ G.brewCat = k; G.brewEdit = null; G.brewDraft = null; G.brewView = 'edit'; renderPage(); },
  brewNewKind(k){ if (!Object.hasOwn(BREW, k)) return; G.brewCat = k; G.brewEdit = null; G.brewDraft = null; G.brewView = 'edit'; renderPage(); brewTop(); $('#bw_n')?.focus({preventScroll:true}); },
  brewHome(){ G.brewView = 'home'; G.brewEdit = null; G.brewDraft = null; renderPage(); brewTop(); },
  brewGo(w){
    const imp = w === 'import', t = $(imp ? '#hb_import' : '#hb_create'); t?.scrollIntoView({block:'start', behavior:reduceMotion() ? 'auto' : 'smooth'});
    (imp ? $('#hb_imp_h') : t?.querySelector('.hbTile'))?.focus({preventScroll:true}); },
  brewFilter(k){ G.brewFilter = k; renderPage(); },
  brewGrp(k){ const o = G.brewOpen || (G.brewOpen = {}); o[k] = !o[k]; const l = $('#hb_list'); if (l) l.innerHTML = brewListHTML(); },
  brewMore(id){ (G.brewAll || (G.brewAll = {}))[id] = true; const l = $('#hb_list'); if (l) l.innerHTML = brewListHTML(); },
  brewEdit(id){ const it = BREW_ITEMS.find(x => x.id === id); if (!it) return; closeModal(); G.brewCat = it.cat; G.brewEdit = id; G.brewDraft = null; G.brewView = 'edit';
    if (G.chapter !== 'workshop') turnTo('workshop'); else { renderPage(); brewTop(); } $('#bw_n')?.focus({preventScroll:true}); },
  async brewDup(id){
    const it = BREW_ITEMS.find(x => x.id === id); if (!it) return;
    if (!plusOK() && BREW_ITEMS.length >= FREE_BREW) return plusModal('brew');
    let n = 'Copy of ' + it.o.n, i = 2; while (BREW_ITEMS.some(x => x.cat === it.cat && norm(x.o.n) === norm(n))) n = `Copy of ${it.o.n} ${i++}`;
    const copy = {id:uid(), cat:it.cat, o:{...structuredClone(it.o), n:n.slice(0, 80)}};
    BREW_ITEMS.push(copy); await saveBrew(); reloadBrew(); renderPage(); toast(`${copy.o.n} added. Edit it to make it your own.`);
  },
  async brewSave(){
    const cat = G.brewCat in BREW ? G.brewCat : 'classes', o = readBrew(cat);
    if (!o.n){ toast('Give it a name first.'); $('#bw_n')?.focus(); return; }
    const chk = checkBrew(cat, o, {});
    if (chk.err.length){ brewLivePreview(); toast(`Can’t save yet: ${chk.err[0]}${chk.err.length > 1 ? ` And ${chk.err.length - 1} more problem${chk.err.length > 2 ? 's' : ''}, listed under Checks.` : ''}`); return; }
    const editing = G.brewEdit && BREW_ITEMS.find(x => x.id === G.brewEdit);
    if (editing && (cat === 'classes' || cat === 'subclasses') && isObj(editing.o)){   // what the form has no box for (grants, level table…) stays on a feature that keeps its level and name
      (o.f || []).forEach(f => { const was = (editing.o.f || []).find(x => x.l === f.l && x.n === f.n && x.g); if (was) f.g = structuredClone(was.g); });
      if (cat === 'classes') ['ct', 'adv', 'eq'].forEach(k => { if (editing.o[k] != null) o[k] = structuredClone(editing.o[k]); });
    }
    const chk2 = checkBrew(cat, o, {}); Object.assign(o, chk2.o);
    if (!editing && !plusOK() && BREW_ITEMS.length >= FREE_BREW) return plusModal('brew');
    if (BREW_ITEMS.some(x => x.cat === cat && norm(x.o.n) === norm(o.n) && x !== editing)){ toast(`You already have a ${BREW[cat].t.toLowerCase()} called ${o.n}.`); return; }
    if (editing) editing.o = o; else BREW_ITEMS.push({id:uid(), cat, o});
    G.brewEdit = null; G.brewDraft = null; G.brewView = 'home'; G.brewQ = ''; await saveBrew(); reloadBrew(); render(); brewTop(); toast(`${o.n} ${editing ? 'updated' : 'joins the tome'}.`);
  },
  brewDel(id){ const it = BREW_ITEMS.find(x => x.id === id); if (!it) return;
    confirmBox(`Delete ${it.o.n}? Heroes that use it keep its name.`, 'Delete', async () => { BREW_ITEMS = BREW_ITEMS.filter(x => x !== it); if (G.brewEdit === id){ G.brewEdit = null; G.brewView = 'home'; } await saveBrew(); reloadBrew(); render(); toast(`${it.o.n} deleted.`); }); },
  brewExport(){
    const txt = JSON.stringify({grimoireHomebrew:BREW_ITEMS.map(({cat, o}) => ({cat, o}))}, null, 1);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], {type:'application/json'})); a.download = 'grimoire-homebrew.json'; document.body.appendChild(a); a.click(); a.remove();
    navigator.clipboard?.writeText(txt).then(() => toast('Downloaded, and copied to the clipboard too.'), () => {});
  },
};

/* ================================================================== homebrew checks
   One set of rules for everything that becomes homebrew: Markdown files, 5etools files, Grimoire exports and the editor.
   checkBrew(cat, o) gives errors (the entry can't be used as it is: it is not imported and the editor won't save it)
   and warnings (it works, but probably isn't what you meant), and tidies what it understands ("d10" → 10, "1/4" → 0.25,
   "stealth" → "Stealth"…). */
const HB_SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
const HB_TYPES = ['aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 'fey', 'fiend', 'giant', 'humanoid', 'monstrosity', 'ooze', 'plant', 'undead'];
const HB_FEAT_TYPES = ['Origin', 'General', 'Fighting Style', 'Epic Boon'];
const HB_ITEM_TYPES = ['Wondrous Item', 'Armor', 'Weapon', 'Ring', 'Rod', 'Staff', 'Wand', 'Potion', 'Scroll'];
const HB_RARITY = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact'];
const HB_DMG = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];
const HB_CR = [0, 0.125, 0.25, 0.5, ...Array.from({length:30}, (_, i) => i + 1)];
const HB_DICE = [2, 3, 4, 6, 8, 10, 12, 20, 100];
// Italian names people write, mapped to the tome's English ones
const HB_IT = {abiurazione:'Abjuration', invocazione:'Evocation', evocazione:'Conjuration', divinazione:'Divination', ammaliamento:'Enchantment', illusione:'Illusion', necromanzia:'Necromancy', trasmutazione:'Transmutation',
  origine:'Origin', generale:'General', 'stile di combattimento':'Fighting Style', 'dono epico':'Epic Boon',
  minuscola:'Tiny', piccola:'Small', media:'Medium', grande:'Large', enorme:'Huge', mastodontica:'Gargantuan', 'piccola o media':'Small or Medium',
  'oggetto meraviglioso':'Wondrous Item', armatura:'Armor', arma:'Weapon', anello:'Ring', verga:'Rod', bastone:'Staff', bacchetta:'Wand', pozione:'Potion', pergamena:'Scroll',
  comune:'Common', 'non comune':'Uncommon', raro:'Rare', rara:'Rare', 'molto raro':'Very Rare', 'molto rara':'Very Rare', leggendario:'Legendary', leggendaria:'Legendary', artefatto:'Artifact',
  forza:'str', destrezza:'dex', costituzione:'con', intelligenza:'int', saggezza:'wis', carisma:'cha', for:'str', des:'dex', cos:'con', sag:'wis', car:'cha'};
const hbKey = s => String(s ?? '').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
const hbStr = v => typeof v === 'string' ? v.trim() : typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
const hbList = v => (Array.isArray(v) ? v.map(hbStr) : hbStr(v).split(/\s*[,;]\s*/)).map(s => s.replace(/^and\s+|^e\s+/i, '').replace(/\.$/, '').trim()).filter(Boolean);
/** Pick the canonical spelling from a list (case, Italian names); null when it isn't there. */
const hbPick = (list, v) => { const k = hbKey(v); if (!k) return null; const it = HB_IT[k]; return list.find(x => hbKey(x) === k || (it && x === it)) || null; };
function hbLev(a, b){
  a = hbKey(a); b = hbKey(b);
  const d = Array.from({length:b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++){ let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++){ const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } }
  return d[b.length];
}
const hbSuggest = (v, list) => { let best = null, bd = 99; for (const x of list){ const d = hbLev(v, x); if (d < bd){ bd = d; best = x; } }
  return best && bd <= Math.max(2, Math.floor(hbStr(v).length / 3)) ? ` Did you mean “${best}”?` : ''; };
const hbAbil = s => { const k = hbKey(s).replace(/[^a-z]/g, ''); return ABIL_ID[k] || (HB_IT[k] && ABIL_ID[HB_IT[k]]) || null; };
const hbAbilName = id => ABIL.find(a => a.id === id)?.n || id;
const hbMod = v => Math.floor(((+v || 10) - 10) / 2);
const hbPB = cr => cr < 5 ? 2 : Math.min(9, 2 + Math.ceil((cr - 4) / 4));
function hbBool(v, W, label){
  if (typeof v === 'boolean' || typeof v === 'number') return !!v;
  const k = hbKey(v);
  if (/^(yes|y|true|x|sì|si|1|✓|✔)\b/.test(k)) return true;
  if (!k || /^(no|n|false|0|-|—|none|nessuna?)$/.test(k)) return false;
  W(`${label}: “${v}” is not yes or no, so it was read as no.`); return false;
}
function hbLevelNum(v){
  if (typeof v === 'number') return v;
  const k = hbKey(v); if (/^(cantrip|trucchetto|0)$/.test(k)) return 0;
  const m = k.match(/(\d+)/); return m ? +m[1] : NaN;
}
const hbSkillNames = () => SKILLS.map(s => s.n);
const hbSkill = s => hbPick(hbSkillNames(), s) || hbPick(hbSkillNames(), String(s).replace(/\s*\(.*\)$/, '')) || SKILLS.find(k => k.id === hbKey(s))?.n || null;
const hbClassNames = ctx => [...new Set([...names('classes'), ...(ctx?.classes || [])])];
const hbFeatNames = ctx => [...new Set([...names('feats'), ...(ctx?.feats || []).map(f => f.n)])];
const hbFeat = (n, ctx) => { const k = norm(n); return (ctx?.feats || []).find(f => norm(f.n) === k) || ALL.find(e => e.cat === 'feats' && e.lc === k)?.o || null; };
const hbTools = () => ALL.filter(e => e.cat === 'equipment' && /artisan|instrument|gaming|other tools/i.test(e.o.cat || '')).map(e => e.n);
const hbWeapons = () => ALL.filter(e => e.cat === 'equipment' && /weapon/i.test(e.o.cat || '')).map(e => e.n);
// "one kind of Artisan's Tools", "a Musical Instrument of your choice"…
const HB_ANY_TOOL = /\b(one|any|choose|choice|a|an)\b.*\b(artisan'?s? tools?|musical instruments?|gaming sets?|tools?|instruments?|kits?)\b|\b(artisan'?s? tools?|musical instruments?|gaming sets?)\b.*\b(choice|choose|one|any)\b/i;
const hbTool = t => hbPick(hbTools(), t) || (HB_ANY_TOOL.test(t) ? hbStr(t) : null);
function hbProf(t){
  const s = hbStr(t).replace(/^(tool|tools|strumento|strumenti)\s*:\s*/i, '');
  if (/^(light|medium|heavy|all)\s+armou?r(\s+training)?$/i.test(s) || /^shields?$/i.test(s) || /^(simple|martial)\s+weapons?$/i.test(s)) return true;
  if (/^(simple|martial)\s+weapons?\s+(that|with)\b/i.test(s) || /^(armature|armi|scudi?)\b/i.test(s)) return true;
  const sing = s.replace(/es$|s$/i, '');
  return !!(hbPick(hbWeapons(), s) || hbPick(hbWeapons(), sing) || hbTool(s));
}
function hbTraits(arr, what, E, W){
  const seen = new Set();
  return (Array.isArray(arr) ? arr : []).map(t => isObj(t) ? {...t, n:hbStr(t.n), x:hbStr(t.x).replace(/\s*\n+\s*/g, ' ')} : {n:'', x:hbStr(t)}).filter(t => t.n || t.x).map(t => {
    if (!t.n) W(`A ${what} has no name: write it as “Name: text”.`);
    else if (!t.x) W(`${what[0].toUpperCase() + what.slice(1)} “${t.n}” has no text.`);
    if (t.n && seen.has(norm(t.n))) W(`${what[0].toUpperCase() + what.slice(1)} “${t.n}” appears twice.`);
    seen.add(norm(t.n)); return t;
  });
}
function hbFeatures(arr, E, W){
  return (Array.isArray(arr) ? arr : []).filter(isObj).map(f => {
    const l = typeof f.l === 'number' ? f.l : parseInt(f.l, 10), n = hbStr(f.n), x = hbStr(f.x).replace(/\s*\n+\s*/g, ' ');
    if (!Number.isInteger(l) || l < 1 || l > 20) E(`Feature “${n || '?'}” has level “${f.l ?? ''}”: features go from level 1 to 20.`);
    if (!n) W(`A level ${f.l} feature has no name.`); else if (!x) W(`Feature “${n}” has no text.`);
    const g = hbGrants(f.g);
    return {l:Number.isInteger(l) ? clamp(l, 1, 20) : 1, n, x, ...(g ? {g} : {})};
  }).sort((a, b) => a.l - b.l);
}
/* What a feature gives, as structured data next to its text: activation, resistances, immunities, speeds, languages, feats, proficiencies, spells, uses, forced save. Anything unknown is dropped. */
const HB_ACT = ['action', 'bonus', 'reaction'], HB_REST = ['short', 'long', 'short or long'], HB_SPD = ['walk', 'fly', 'swim', 'climb', 'burrow'];
function hbGrants(g){
  if (!isObj(g)) return null;
  const arr = (v, max = 12) => (Array.isArray(v) ? v : []).filter(x => typeof x === 'string').map(x => x.trim().slice(0, 60)).filter(Boolean).slice(0, max), out = {};
  const a = arr(g.act, 3).filter(x => HB_ACT.includes(x)); if (a.length) out.act = a;
  for (const k of ['res', 'imm']){ const v = arr(g[k]).filter(x => DMGT5.includes(x.toLowerCase())).map(tc5); if (v.length) out[k] = v; }
  for (const k of ['cimm', 'lang', 'feat', 'prof', 'sp']){ const v = arr(g[k]); if (v.length) out[k] = v; }
  if (isObj(g.spd)){ const sp = Object.fromEntries(Object.entries(g.spd).filter(([k, v]) => HB_SPD.includes(k) && Number.isFinite(+v) && +v > 0 && +v <= 300).map(([k, v]) => [k, Math.round(+v)])); if (Object.keys(sp).length) out.spd = sp; }
  if (g.asi === true) out.asi = true;
  if (HB_REST.includes(g.rest)) out.rest = g.rest;
  if (Number.isInteger(g.n) && g.n >= 1 && g.n <= 20 || ['PB', 'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].includes(g.n)) out.n = g.n;
  if (isObj(g.sv) && Object.hasOwn(ABN5, g.sv.ab)){ out.sv = {ab:g.sv.ab}; if (g.sv.dc === 'spell' || (Number.isInteger(g.sv.dc) && g.sv.dc >= 1 && g.sv.dc <= 40)) out.sv.dc = g.sv.dc; }
  const d = arr(g.dice, 6).filter(x => /^\d+d\d+$/.test(x)); if (d.length) out.dice = d;
  return Object.keys(out).length ? out : null;
}
/** The chips under a feature: what the tome could read out of its text. */
function grantChips(g){
  if (!isObj(g)) return '';
  const c = [], chip = (t, k = '') => c.push(`<span class="chip light gr ${k}">${esc(t)}</span>`);
  (g.act || []).forEach(a => chip({action:'Action', bonus:'Bonus Action', reaction:'Reaction'}[a], 'act'));
  if (g.rest) chip(`${g.n ? (g.n === 1 ? '1 use' : g.n === 'PB' ? 'Proficiency Bonus uses' : g.n + ' modifier uses') + ' · ' : ''}back on ${g.rest} rest`, 'use');
  else if (g.n) chip(g.n === 1 ? '1 use' : g.n + ' uses', 'use');
  (g.res || []).forEach(x => chip('Resistance: ' + x, 'res')); (g.imm || []).forEach(x => chip('Immunity: ' + x, 'res')); (g.cimm || []).forEach(x => chip('Immune: ' + x, 'res'));
  Object.entries(g.spd || {}).forEach(([k, v]) => chip(`${k === 'walk' ? 'Speed' : tc5(k) + ' speed'} ${v} ft.`, 'spd'));
  (g.lang || []).forEach(x => chip('Language: ' + x)); (g.prof || []).forEach(x => chip('Proficiency: ' + x));
  (g.feat || []).forEach(x => chip('Feat: ' + x, 'feat')); if (g.asi) chip('Ability Score Improvement', 'feat');
  (g.sp || []).forEach(x => chip('Spell: ' + x, 'sp'));
  if (g.sv) chip(`${ABN5[g.sv.ab]} save${g.sv.dc ? ' vs ' + (g.sv.dc === 'spell' ? 'spell DC' : 'DC ' + g.sv.dc) : ''}`, 'sv');
  (g.dice || []).forEach(x => chip('Dice: ' + x));
  return c.length ? `<p class="grants">${c.join(' ')}</p>` : '';
}
const featHtml = f => `<h4>Lv ${f.l} · ${esc(f.n)}</h4>${grantChips(f.g)}${md(f.x)}`;
const classExtraHtml = o => {
  const ct = hbTable(o.ct), parts = [];
  if (ct){
    const grp = []; ct.cols.forEach(c => { const l = grp[grp.length - 1]; (l && l.g === c.g) ? l.n++ : grp.push({g:c.g, n:1}); });
    const feats = lv => (o.f || []).filter(f => f.l === lv).map(f => f.n).join(', ') || '—';
    parts.push(`<details class="fold"><summary>Class table (by level)</summary><div class="in tblWrap"><table class="ctable"><thead>${grp.some(x => x.g) ? `<tr><th colspan="3"></th>${grp.map(x => `<th colspan="${x.n}">${esc(x.g)}</th>`).join('')}</tr>` : ''}<tr><th>Lv</th><th>PB</th><th>Features</th>${ct.cols.map(c => `<th>${esc(c.n)}</th>`).join('')}</tr></thead><tbody>${ct.rows.map((r, i) => `<tr><td>${i + 1}</td><td>+${Math.ceil((i + 1) / 4) + 1}</td><td class="wrap">${esc(feats(i + 1))}</td>${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`);
  }
  const ad = o.adv; if (isObj(ad)){
    const bits = [...(ad.opt || []).map(x => `<b>${esc(x.n)}</b>: ${Object.entries(x.by).map(([l, n]) => `${n} known at level ${l}`).join(', ')}`), ...(ad.feat || []).map(x => `<b>${esc(x.n)}</b> feat at level ${Object.keys(x.by).join(', ')}`)];
    if (bits.length) parts.push(`<p class="muted small">${bits.join(' · ')}</p>`);
  }
  if (o.eq) parts.push(`<p class="muted small"><b>Starting equipment.</b> ${esc(o.eq)}</p>`);
  return parts.join('');
};
/** The class table kept as the shape above, nothing else. */
function hbTable(t){
  if (!isObj(t) || !Array.isArray(t.cols) || !Array.isArray(t.rows) || t.rows.length !== 20 || t.cols.length > 16) return null;
  const cols = t.cols.filter(isObj).map(c => ({n:hbStr(c.n).slice(0, 30), g:hbStr(c.g).slice(0, 40)}));
  if (cols.length !== t.cols.length) return null;
  return {cols, rows:t.rows.map(r => Array.isArray(r) ? cols.map((_, i) => hbStr(r[i]).slice(0, 12)) : cols.map(() => ''))};
}
function hbClassExtra(o){
  const ct = hbTable(o.ct); if (ct) o.ct = ct; else delete o.ct;
  if (isObj(o.adv)){
    const clean = l => (Array.isArray(l) ? l : []).filter(isObj).map(x => ({n:hbStr(x.n).slice(0, 40), by:isObj(x.by) ? Object.fromEntries(Object.entries(x.by).filter(([k, v]) => /^\d{1,2}$/.test(k) && +k >= 1 && +k <= 20 && Number.isInteger(v) && v >= 1 && v <= 20)) : {}})).filter(x => x.n && Object.keys(x.by).length);
    const a = {}; const f = clean(o.adv.feat), op = clean(o.adv.opt); if (f.length) a.feat = f; if (op.length) a.opt = op;
    if (Object.keys(a).length) o.adv = a; else delete o.adv;
  } else delete o.adv;
  if (o.eq) o.eq = hbStr(o.eq).slice(0, 600); else delete o.eq;
}
function hbSkillList(v, E, W, label = 'skill'){
  const out = [];
  hbList(v).forEach(s => { const k = hbSkill(s); if (!k) E(`“${s}” is not a ${label} of the rules.` + hbSuggest(s, hbSkillNames())); else if (out.includes(k)) W(`${k} is listed twice.`); else out.push(k); });
  return out;
}
function hbAbilList(v, E, W){
  const out = [];
  hbList(v).forEach(a => { const id = hbAbil(a); if (!id) E(`“${a}” is not an ability score.` + hbSuggest(a, ABIL.map(x => x.n))); else if (out.includes(id.toUpperCase())) W(`${hbAbilName(id)} is listed twice.`); else out.push(id.toUpperCase()); });
  return out;
}
function hbSize(v){ const k = hbKey(v); if (k === 'small or medium' || HB_IT[k] === 'Small or Medium') return 'Small or Medium';
  const two = k.split(/\s+(?:or|o)\s+/); if (two.length === 2 && two.every(x => hbPick(HB_SIZES, x))) return two.map(x => hbPick(HB_SIZES, x)).join(' or ');
  return hbPick(HB_SIZES, v); }
const hbType = s => HB_TYPES.find(t => hbKey(s).replace(/^(a|an)\s+/, '').startsWith(t)) || null;
const hbCr = v => { const s = hbKey(isObj(v) ? v.cr : v).replace(/\s*\(.*$/, ''); if (/^1\/(2|4|8)$/.test(s)) return 1 / +s.slice(2); const n = s === '' ? NaN : +s; return HB_CR.includes(n) ? n : null; };
// "Dex +5, Wis +3" → [{a:'dex', b:5}]
function hbBonuses(s, kind, E){
  return hbList(s).map(p => { const m = p.replace(/\s*\([^)]*\)\s*$/, '').match(/^(.+?)\s*([+−-])\s*(\d+)$/);
    if (!m){ E(`“${p}” should read like “${kind === 'save' ? 'Dex +5' : 'Perception +4'}”.`); return null; }
    const b = (m[2] === '+' ? 1 : -1) * +m[3];
    if (kind === 'save'){ const a = hbAbil(m[1]); if (!a){ E(`Saving throw “${m[1]}” is not an ability score.` + hbSuggest(m[1], ABIL.map(x => x.n))); return null; } return {a, b, n:m[1]}; }
    const k = hbSkill(m[1]); if (!k){ E(`“${m[1]}” is not a skill of the rules.` + hbSuggest(m[1], hbSkillNames())); return null; }
    return {k, b, a:SKILLS.find(x => x.n === k)?.ab}; }).filter(Boolean);
}
const hbDamageList = (s, W, label, conditionsToo) => hbList(s).forEach(p => {
  const w = hbKey(p).replace(/^(from|to)\s+/, '').split(/[\s(]/)[0];
  if (!HB_DMG.includes(w) && !(conditionsToo && COND_NAMES.some(c => hbKey(c) === w))) W(`${label}: “${p}” is not a damage type${conditionsToo ? ' or condition' : ''} of the rules.` + hbSuggest(w, conditionsToo ? HB_DMG.concat(COND_NAMES) : HB_DMG));
});
const HB_RULES = {
  spells(o, E, W, ctx){
    const lv = hbLevelNum(o.lv);
    if (!Number.isInteger(lv) || lv < 0 || lv > 9) E(`Level “${o.lv ?? ''}” is not 0 (cantrip) to 9.`); else o.lv = lv;
    const sc = hbPick(SCHOOLS, o.sc);
    if (!hbStr(o.sc)) E('No school of magic.'); else if (!sc) E(`“${hbStr(o.sc)}” is not a school of magic.` + hbSuggest(hbStr(o.sc), SCHOOLS)); else o.sc = sc;
    o.t = hbStr(o.t).replace(/^1 action$/i, 'Action').replace(/^1 bonus action$/i, 'Bonus Action').replace(/^1 reaction/i, 'Reaction');
    if (!o.t) W('No casting time.');
    else if (!/^(action|bonus action|reaction|\d+\s+(minutes?|hours?)|1 round)\b/i.test(o.t)) W(`Unusual casting time “${o.t}”: the rules use Action, Bonus Action, Reaction or a number of minutes or hours.`);
    else if (/^reaction$/i.test(o.t)) W('A Reaction spell should say what triggers it: “Reaction, which you take when …”.');
    o.r = hbStr(o.r);
    if (!o.r) W('No range.'); else if (!/^(self|touch|sight|unlimited|special|\d+\s*(feet|foot|ft\.?|miles?)\b)/i.test(o.r)) W(`Unusual range “${o.r}”: write it like “60 feet”, “Self”, “Touch” or “Self (15-foot Cone)”.`);
    o.c = hbStr(o.c);
    if (!o.c) W('No components.');
    else { const parts = o.c.replace(/\([^)]*\)/g, '').split(/\s*,\s*/).map(s => s.trim().toUpperCase()).filter(Boolean), bad = parts.filter(p => !['V', 'S', 'M'].includes(p));
      if (bad.length) E(`Components can only be V, S and M, not “${bad.join(', ')}”.`);
      if (new Set(parts).size < parts.length) W('A component is listed twice.');
      if (parts.includes('M') && !/M\s*\(/i.test(o.c)) W('The M component should name its material in brackets: “M (a pinch of ash)”.'); }
    o.d = hbStr(o.d);
    if (/^concentration/i.test(o.d)){ o.conc = true; o.d = o.d.replace(/^concentration,?\s*/i, '').trim(); if (o.d && !/^up to/i.test(o.d)) o.d = 'up to ' + o.d; }
    if (!o.d) W('No duration.');
    o.conc = hbBool(o.conc, W, 'Concentration'); o.rit = hbBool(o.rit, W, 'Ritual');
    if (o.conc && /instantaneous/i.test(o.d)) E('An Instantaneous spell can’t need Concentration.');
    if (o.conc && o.d && !/^up to/i.test(o.d)) o.d = 'up to ' + o.d;
    const cl = hbClassNames(ctx);
    o.cls = hbList(o.cls).map(c => { const k = hbPick(cl, c); if (!k) W(`Class “${c}” is not in the tome, so the spell won’t show on its list.` + hbSuggest(c, cl)); return k || c; });
    if (!o.cls.length) W('On no class list: heroes will only find it by searching.');
    if (isObj(o.fx)){ const f = o.fx;
      f.mode = ['attack', 'save'].includes(f.mode) ? f.mode : ''; f.ab = SAVE_ABS.some(a => a[0] === f.ab) ? f.ab : '';
      ['dd', 'heal', 'up'].forEach(k => { if (f[k] && !/^\d+d\d+$/i.test(f[k])) delete f[k]; });
      f.dt = hbPick(DMG_TYPES, f.dt) || ''; f.shape = SPELL_SHAPES.includes(f.shape) ? f.shape : ''; f.size = f.shape && +f.size > 0 ? +f.size : '';
      if (f.mode === 'save' && !f.ab) E('Saving throw: pick the ability it uses.');
      if (f.dd && !f.dt) W('Damage dice without a damage type.'); if (f.dt && !f.dd) f.dt = '';
      if (f.half && !(f.mode === 'save' && f.dd)) f.half = false;
      if (f.mode !== 'save') f.ab = '';
      if (f.cant && o.lv !== 0) f.cant = false; if (o.lv === 0 && f.up) f.up = '';
      if (f.up && o.lv === 9) W('A level 9 spell can’t grow with a higher slot.');
      o.fx = Object.fromEntries(Object.entries(f).filter(([, x]) => x)); if (!Object.keys(o.fx).length) delete o.fx; }
    o.x = hbStr(o.x); o.h = hbStr(o.h);
    if (!o.x) W('No effect text.');
    if (o.lv === 0 && /slot/i.test(o.h)) W('Cantrips don’t use spell slots: say how it grows at levels 5, 11 and 17 instead.');
    if (o.lv === 0 && o.rit) W('Cantrips are not cast as rituals.');
  },
  weapons(o, E, W){
    const wc = hbPick(WEAPON_CATS, o.wc); if (!wc) E(`“${hbStr(o.wc)}” is not a weapon type: ${WEAPON_CATS.join(', ')}.`); else o.wc = wc;
    o.dd = hbStr(o.dd); if (!/^\d+d\d+$/i.test(o.dd)) E('Damage dice: pick how many dice and which die.'); else if (!DIE_SIDES.includes(+o.dd.split(/d/i)[1])) W(`Unusual die ${o.dd}.`);
    const dt = hbPick(DMG_TYPES, o.dt); if (!dt) E('Pick a damage type.'); else o.dt = dt;
    o.props = (Array.isArray(o.props) ? o.props : hbList(o.props)).map(p => hbPick(WEAPON_PROPS, p)).filter(Boolean);
    if (o.props.includes('Light') && o.props.includes('Heavy')) W('A weapon can’t be both Light and Heavy.');
    if (o.props.includes('Two-Handed') && o.props.includes('Versatile')) W('Two-Handed and Versatile don’t go together.');
    o.vd = hbStr(o.vd); if (o.vd && !/^\d+d\d+$/i.test(o.vd)) E('Versatile damage must be dice like 1d10.');
    if (o.props.includes('Versatile') && !o.vd) W('Versatile needs its two-handed damage dice.'); if (o.vd && !o.props.includes('Versatile')) W('Versatile damage is ignored unless the Versatile property is ticked.');
    o.mast = hbPick(WEAPON_MASTERY, o.mast) || '';
    const mb = parseInt(o.mb, 10) || 0; if (mb < 0 || mb > 3) W('The magic bonus is kept between +0 and +3.'); o.mb = clamp(mb, 0, 3);
    o.rar = hbStr(o.rar) === 'Mundane' || !hbStr(o.rar) ? 'Mundane' : hbPick(HB_RARITY_LIST, o.rar) || (E(`“${o.rar}” is not a rarity.`), o.rar);
    if (o.mb && o.rar === 'Mundane') W('A magic bonus makes it a magic weapon: pick a rarity (+1 is usually Uncommon, +2 Rare, +3 Very Rare).');
    if (o.att && o.rar === 'Mundane') W('A mundane weapon doesn’t need attunement.');
    o.att = hbBool(o.att, W, 'Attunement');
    const rn = parseInt(o.rn, 10) || 0, rl = parseInt(o.rl, 10) || 0; o.rn = rn > 0 ? rn : ''; o.rl = rl > 0 ? rl : ''; if (o.rl && o.rl < o.rn) W('Long range is shorter than normal range.');
    if ((o.props.includes('Ammunition') || o.props.includes('Thrown')) && !o.rn) W('Ammunition and Thrown weapons need a range (80/320 for a longbow, 20/60 for a javelin).');
    if (/ranged/i.test(o.wc) && !o.props.includes('Ammunition') && !o.props.includes('Thrown') && !o.rn) W('A ranged weapon normally has a range.');
    o.wt = +o.wt > 0 ? +o.wt : ''; o.val = hbStr(o.val); o.sp = hbStr(o.sp); o.x = hbStr(o.x);
    if (!o.sp && !o.x) W('No description.');
  },
  feats(o, E, W){
    if (!hbStr(o.ty)){ W('No category, so it is a General feat.'); o.ty = 'General'; }
    else { const t = hbPick(HB_FEAT_TYPES, o.ty); if (!t) E(`“${o.ty}” is not a feat category: use Origin, General, Fighting Style or Epic Boon.` + hbSuggest(o.ty, HB_FEAT_TYPES)); else o.ty = t; }
    o.pre = hbStr(o.pre); o.rep = hbBool(o.rep, W, 'Repeatable');
    const lm = o.pre.match(/level\s*(\d+)|(\d+)(?:st|nd|rd|th)?[- ]level|livello\s*(\d+)/i), lv = lm ? +(lm[1] || lm[2] || lm[3]) : 0;
    if (lm && (lv < 1 || lv > 20)) E(`Prerequisite level ${lv} is outside 1–20.`);
    if (o.ty === 'Origin' && lv > 1) W('Origin feats are taken at level 1, so they normally have no level prerequisite.');
    if (o.ty === 'General' && !lv) W('General feats normally need “Level 4+”.');
    if (o.ty === 'Epic Boon' && lv !== 19) W('Epic Boons normally need “Level 19+”.');
    if (o.ty === 'Fighting Style' && !/fighting style/i.test(o.pre)) W('Fighting Style feats normally need “Fighting Style Feature”.');
    for (const m of o.pre.matchAll(/([A-Za-zÀ-ú]+)\s+(\d{1,2})\+/g)){
      if (/^(level|livello)$/i.test(m[1])) continue;
      if (!hbAbil(m[1])) W(`Prerequisite “${m[0]}” doesn’t name an ability score.`); else if (+m[2] < 1 || +m[2] > 30) E(`Prerequisite score ${m[2]} is outside 1–30.`);
    }
    o.x = hbStr(o.x); if (!o.x) W('No benefit text.');
    const asi = o.x.match(/increase .{0,60}?score.{0,40}? by (\d+)/i); if (asi && +asi[1] > 2) W(`An increase of ${asi[1]} to an ability score is more than any feat in the rules gives.`);
    if (/score/i.test(o.x) && /maximum of (\d+)/i.test(o.x) && +o.x.match(/maximum of (\d+)/i)[1] > 20 && o.ty !== 'Epic Boon') W('Only Epic Boons raise a score above 20.');
  },
  species(o, E, W){
    if (!hbStr(o.size)){ W('No size, so it is Medium.'); o.size = 'Medium'; }
    else { const s = hbSize(o.size); if (!s) E(`“${o.size}” is not a size: use Small, Medium, “Small or Medium” or Large.` + hbSuggest(o.size, [...HB_SIZES, 'Small or Medium'])); else { o.size = s; if (!['Small', 'Medium', 'Small or Medium', 'Large'].includes(s)) W(`${s} is unusual for a playable species.`); } }
    if (o.speed === undefined || o.speed === null || hbStr(o.speed) === ''){ W('No speed, so it is 30 feet.'); o.speed = 30; }
    else { const sp = parseInt(o.speed, 10); if (!Number.isFinite(sp) || sp < 0 || sp > 120) E(`Speed “${o.speed}” must be a number of feet from 0 to 120.`); else { o.speed = sp; if (sp % 5) W(`Speed ${sp} is not a multiple of 5 feet.`); } }
    o.ty = hbStr(o.ty) || 'Humanoid';
    if (!hbType(o.ty)) W(`“${o.ty}” is not a creature type of the rules.` + hbSuggest(o.ty, HB_TYPES));
    o.x = hbStr(o.x); o.tr = hbTraits(o.tr, 'trait', E, W);
    if (!o.tr.length) W('No traits.');
  },
  backgrounds(o, E, W, ctx){
    const raw = hbList(o.asi); o.asi = hbAbilList(o.asi, E, W);
    if (!raw.length) W('No ability scores: 2024 backgrounds list three (this looks like an older background).'); else if (o.asi.length && o.asi.length !== 3) W(`${o.asi.length} ability scores; 2024 backgrounds list exactly three.`);
    o.feat = hbStr(o.feat);
    if (!o.feat) W('No origin feat.');
    else { const f = hbFeat(o.feat, ctx); if (!f) W(`Feat “${o.feat}” is not in the tome.` + hbSuggest(o.feat, hbFeatNames(ctx)));
      else { if (f.ty && f.ty !== 'Origin') W(`${f.n} is a ${f.ty} feat, not an Origin feat.`); if (!/\(/.test(o.feat)) o.feat = f.n; } }
    o.skills = hbSkillList(o.skills, E, W);
    if (o.skills.length !== 2) W(`${o.skills.length} skill${o.skills.length === 1 ? '' : 's'}; backgrounds give exactly two.`);
    o.tools = hbList(o.tools).map(t => { const k = hbTool(t); if (!k) W(`Tool “${t}” is not in the rules’ tool list.` + hbSuggest(t, hbTools())); return k || t; });
    if (!o.tools.length) W('No tool proficiency.'); else if (o.tools.length > 1) W('Backgrounds give one tool proficiency.');
    o.eq = hbStr(o.eq); if (!o.eq) W('No starting equipment.');
    o.x = hbStr(o.x);
  },
  classes(o, E, W){
    const hd = parseInt(String(o.hd ?? '').replace(/^\s*1?d/i, ''), 10);
    if (![6, 8, 10, 12].includes(hd)) E(`Hit Die “${o.hd ?? ''}” must be d6, d8, d10 or d12.`); else o.hd = hd;
    o.prim = hbStr(o.prim);
    if (!o.prim) W('No primary ability.');
    else o.prim.split(/\s*(?:,|\band\b|\bor\b|\be\b|\bo\b)\s*/i).filter(Boolean).forEach(w => { if (!hbAbil(w)) E(`Primary ability “${w}” is not an ability score.` + hbSuggest(w, ABIL.map(x => x.n))); });
    const sv = hbList(o.saves); o.saves = hbAbilList(o.saves, E, W);
    if (!sv.length) E('No saving throw proficiencies: a class has two.'); else if (o.saves.length && o.saves.length !== 2) W(`${o.saves.length} saving throws; classes are proficient in exactly two.`);
    o.prof = hbList(o.prof); o.prof.forEach(p => { if (!hbProf(p)) W(`Proficiency “${p}” is not armor training, a weapon group, a weapon or a tool of the rules.`); });
    const ch = (Array.isArray(o.choice) ? o.choice : [o.choice]).map(hbStr).filter(Boolean).join('; ');
    o.choice = ch ? [ch] : [];
    if (!ch) W('No skill choices.');
    else { const m = ch.match(/^(?:choose|pick|scegli)\s+(\w+)\s*(?:skills?|abilità)?\s*(?:from|tra|fra)?\s*:?\s*(.+)$/i);
      if (!m) W('Skills should read “Choose 2: Arcana, History, Insight”.');
      else { const words = {one:1, two:2, three:3, four:4, uno:1, una:1, due:2, tre:3, quattro:4}, n = /^\d+$/.test(m[1]) ? +m[1] : words[hbKey(m[1])];
        const list = m[2].replace(/\.$/, '').split(/\s*,\s*|\s+or\s+|\s+o\s+/).map(s => s.replace(/^(or|o)\s+/i, '').trim()).filter(Boolean);
        const any = /^any\b|^qualsiasi\b/i.test(m[2]);
        if (!n || n < 1 || n > 6) E(`“Choose ${m[1]}” should be a number of skills from 1 to 6.`);
        if (!any){ const ok = list.filter(s => { const k = hbSkill(s); if (!k) E(`“${s}” is not a skill of the rules.` + hbSuggest(s, hbSkillNames())); return k; }); if (n && ok.length && n > ok.length) E(`Choose ${n} from only ${ok.length} skills.`); } } }
    const cast = {'':'', none:'', no:'', nessuno:'', full:'full', 'full caster':'full', completo:'full', half:'half', 'half caster':'half', mezzo:'half', third:'third', 'third caster':'third', '1/3':'third', '1/2':'half', terzo:'third', pact:'pact', 'pact magic':'pact', patto:'pact'};
    const ck = hbKey(o.caster); if (!(ck in cast)) E(`Spellcasting “${o.caster}” must be none, full, half, third or pact.`); else o.caster = cast[ck];
    const sa = hbStr(o.spellAb) ? hbAbil(o.spellAb) : '';
    if (hbStr(o.spellAb) && !sa) E(`Spellcasting ability “${o.spellAb}” is not an ability score.`);
    else if (sa && !['int', 'wis', 'cha'].includes(sa)) W(`${hbAbilName(sa)} is an unusual spellcasting ability (the rules use Intelligence, Wisdom or Charisma).`);
    o.spellAb = sa || '';
    if (o.caster && !o.spellAb) E('A spellcasting class needs a spellcasting ability.');
    if (!o.caster && o.spellAb) W('A spellcasting ability is set but the class casts no spells.');
    o.mcProf = hbStr(o.mcProf); o.x = hbStr(o.x); hbClassExtra(o);
    o.f = hbFeatures(o.f, E, W);
    if (!o.f.length) W('No features.');
    else { if (!o.f.some(f => f.l === 1)) W('No feature at level 1.'); if (!o.f.some(f => /subclass|sottoclasse/i.test(f.n + ' ' + f.x))) W('No feature says when the subclass is chosen (2024 classes choose it at level 3).'); }
  },
  subclasses(o, E, W, ctx){
    o.cls = hbStr(o.cls);
    if (!o.cls) E('No class: say which class this subclass belongs to.');
    else { const cl = hbClassNames(ctx), k = hbPick(cl, o.cls); if (!k) W(`Class “${o.cls}” is not in the tome: the subclass will show up once that class exists.` + hbSuggest(o.cls, cl)); else o.cls = k; }
    o.sum = hbStr(o.sum); o.x = hbStr(o.x);
    o.f = hbFeatures(o.f, E, W);
    if (!o.f.length) W('No features.'); else if (o.f[0].l < 3) W('2024 subclasses start at level 3, and this one has a feature earlier.');
  },
  items(o, E, W){
    if (!hbStr(o.cat)){ W('No type, so it is a Wondrous Item.'); o.cat = 'Wondrous Item'; }
    else { const t = hbPick(HB_ITEM_TYPES, o.cat) || hbPick(HB_ITEM_TYPES, String(o.cat).replace(/s$/i, '')); if (!t) E(`“${o.cat}” is not an item type: use ${HB_ITEM_TYPES.join(', ')}.` + hbSuggest(o.cat, HB_ITEM_TYPES)); else o.cat = t; }
    if (!hbStr(o.rar)){ W('No rarity, so it is Common.'); o.rar = 'Common'; }
    else { const r = hbPick(HB_RARITY, o.rar);
      if (r) o.rar = r;
      else if (/^(unknown|varies|mundane|none|sconosciuta|variabile)\b/i.test(o.rar)) W(`Rarity “${o.rar}” is not one of ${HB_RARITY.join(', ')}; it is kept as written.`);
      else E(`“${o.rar}” is not a rarity: use ${HB_RARITY.join(', ')}.` + hbSuggest(o.rar, HB_RARITY)); }
    o.att = hbBool(o.att, W, 'Attunement');
    o.x = hbStr(o.x); if (!o.x) W('No description.');
    if (o.cat === 'Potion' && o.att) W('Potions are not normally attuned.');
    /* optional: what the item does once equipped (read by itemStats) */
    o.base = hbStr(o.base); o.wd = hbStr(o.wd);
    if (o.base && ![...WEAPONS, ...ARMORS].some(e => norm(e.n) === norm(o.base))){ const hit = [...WEAPONS, ...ARMORS].find(e => norm(e.n) === norm(o.base) + ' armor' || wordsOf(e.n) === wordsOf(o.base)); if (hit) o.base = hit.n; else W(`Base item “${o.base}” is not a weapon or armor of the SRD, so it is ignored.`); }
    if (o.wd && !/^\d*d\d+/i.test(o.wd)) W(`Weapon damage “${o.wd}” should start with dice, like “1d8 Slashing”.`);
    [['acm', -5, 10, 'AC bonus'], ['wb', -3, 10, 'Attack and damage bonus']].forEach(([k, lo, hi, lab]) => {
      const t = hbStr(o[k]).replace(/[−–]/g, '-').replace(/^\+/, ''); delete o[k]; if (!t) return;
      if (!/^-?\d+$/.test(t)){ W(`${lab} “${t}” is not a whole number, so it is ignored.`); return; }
      const n = parseInt(t, 10); if (n < lo || n > hi) W(`${lab} ${n} is outside ${lo} to ${hi}, so it was kept inside.`); o[k] = clamp(n, lo, hi); });
    if (!o.base) delete o.base; if (!o.wd) delete o.wd;
  },
  monsters(o, E, W){
    if (!hbStr(o.sz)){ W('No size, so it is Medium.'); o.sz = 'Medium'; }
    else { const s = hbSize(o.sz); if (!s) E(`“${o.sz}” is not a size.` + hbSuggest(o.sz, HB_SIZES)); else o.sz = s; }
    o.ty = hbStr(o.ty); if (!o.ty) W('No creature type.'); else if (!hbType(o.ty)) W(`“${o.ty}” is not a creature type of the rules.` + hbSuggest(o.ty.split(/[\s(]/)[0], HB_TYPES));
    o.al = hbStr(o.al); if (!o.al) W('No alignment.'); else if (!/^(unaligned|neutral|any( \w+)* alignment|(lawful|neutral|chaotic) (good|neutral|evil)|typically .+)$/i.test(o.al)) W(`Unusual alignment “${o.al}”.`);
    if (!Array.isArray(o.ab) || o.ab.length !== 6) E('Ability scores: six numbers, in the order STR DEX CON INT WIS CHA.');
    else { o.ab = o.ab.map(v => parseInt(v, 10)); if (o.ab.some(v => !Number.isInteger(v) || v < 1 || v > 30)) E('Each ability score must be a whole number from 1 to 30.'); }
    const ab = Array.isArray(o.ab) && o.ab.length === 6 ? o.ab : [10, 10, 10, 10, 10, 10], mods = Object.fromEntries(AB5.map((a, i) => [a, hbMod(ab[i])]));
    o.ac = hbStr(o.ac); const acm = o.ac.match(/^(\d+)/);
    if (!acm) E(`Armor Class “${o.ac}” must start with a number.`); else if (+acm[1] < 1 || +acm[1] > 30) E(`Armor Class ${acm[1]} is outside 1–30.`);
    o.hp = hbStr(o.hp); const hpm = o.hp.match(/^(\d+)/);
    if (!hpm || +hpm[1] < 1) E(`Hit Points “${o.hp}” must start with a number of at least 1.`);
    else { const f = o.hp.match(/\(\s*(\d+)d(\d+)\s*(?:([+−-])\s*(\d+))?\s*\)/);
      if (f){ const n = +f[1], d = +f[2], z = f[3] ? (f[3] === '+' ? 1 : -1) * +f[4] : 0, avg = Math.floor(n * (d + 1) / 2) + z;
        if (avg !== +hpm[1]) W(`Hit Points ${hpm[1]} don’t match ${n}d${d}${z ? (z > 0 ? ' + ' : ' − ') + Math.abs(z) : ''}, whose average is ${avg}.`);
        if (z !== n * mods.con) W(`The Hit Point bonus should be ${n * mods.con} (${n} dice × Constitution modifier ${fmt(mods.con)}).`);
        if (!HB_DICE.includes(d)) W(`Hit Dice d${d} are unusual.`); } }
    o.spd = hbStr(o.spd); if (!o.spd) W('No speed.'); else if (!/\d+\s*(ft|feet|m\b)/i.test(o.spd)) W(`Speed “${o.spd}” should read like “30 ft., fly 60 ft.”.`);
    const cr = hbCr(o.cr);
    if (cr === null) E(`Challenge “${o.cr ?? ''}” must be 0, 1/8, 1/4, 1/2 or 1 to 30.`); else o.cr = cr;
    const pb = hbPB(cr ?? 0);
    o.sv = hbStr(o.sv); hbBonuses(o.sv, 'save', E).forEach(s => { const want = mods[s.a] + pb; if (s.b !== want) W(`${s.n} save ${fmt(s.b)}: with ${hbAbilName(s.a)} ${fmt(mods[s.a])} and Proficiency Bonus +${pb} it is normally ${fmt(want)}.`); });
    o.sk = hbStr(o.sk); const sk = hbBonuses(o.sk, 'skill', E);
    sk.forEach(s => { const m = mods[s.a] ?? 0; if (s.b !== m + pb && s.b !== m + 2 * pb) W(`${s.k} ${fmt(s.b)}: with ${hbAbilName(s.a)} ${fmt(m)} and Proficiency Bonus +${pb} it is normally ${fmt(m + pb)} (or ${fmt(m + 2 * pb)} with Expertise).`); });
    o.sen = hbStr(o.sen);
    const pp = o.sen.match(/passive perception\s*(\d+)/i), per = sk.find(s => s.k === 'Perception'), wantPP = 10 + (per ? per.b : mods.wis);
    if (!pp) W(`Senses should end with the passive Perception (${wantPP}).`); else if (+pp[1] !== wantPP) W(`Passive Perception ${pp[1]} should be ${wantPP} (10 + ${per ? 'Perception' : 'Wisdom modifier'}).`);
    o.lang = hbStr(o.lang) || '—';
    ['vul', 'res', 'imm'].forEach(k => { o[k] = hbStr(o[k]); });
    hbDamageList(o.vul, W, 'Vulnerabilities'); hbDamageList(o.res, W, 'Resistances'); hbDamageList(o.imm.replace(/;/g, ','), W, 'Immunities', true);
    ['tr', 'act', 'bon', 're', 'leg'].forEach(k => { o[k] = hbTraits(o[k], k === 'tr' ? 'trait' : 'action', E, W); });
    if (!o.act.length) W('No actions.');
    const best = Math.max(mods.str, mods.dex), cast = Math.max(mods.int, mods.wis, mods.cha);
    [...o.act, ...o.bon, ...o.re, ...o.leg].forEach(a => {
      for (const m of a.x.matchAll(/Attack Roll:\s*\+(\d+)/gi)){ const b = +m[1]; if (![mods.str + pb, mods.dex + pb, cast + pb].includes(b)) W(`${a.n}: attack bonus +${b}; with these scores it is normally ${fmt(best + pb)}${cast + pb !== best + pb ? ` (or ${fmt(cast + pb)} for spells)` : ''}.`); }
      for (const m of a.x.matchAll(/\bDC\s*(\d+)/g)){ const dc = +m[1]; if (!Object.values(mods).some(v => 8 + v + pb === dc)) W(`${a.n}: DC ${dc} doesn’t match 8 + Proficiency Bonus + any ability modifier (from ${8 + pb + Math.min(...Object.values(mods))} to ${8 + pb + Math.max(...Object.values(mods))}).`); }
    });
  },
};
function hbStrings(x, out = []){ if (typeof x === 'string') out.push(x); else if (Array.isArray(x)) x.forEach(v => hbStrings(v, out)); else if (isObj(x)) Object.values(x).forEach(v => hbStrings(v, out)); return out; }
/** ctx: {classes, feats} met in the same file, so a subclass can name a class that arrives with it. */
function checkBrew(cat, src, ctx = {}){
  const o = structuredClone(isObj(src) ? src : {}), err = [], warn = [];
  const E = m => { if (!err.includes(m)) err.push(m); }, W = m => { if (!warn.includes(m)) warn.push(m); };
  o.n = hbStr(o.n);
  if (!o.n) E('No name.'); else if (o.n.length > 80){ W('Name longer than 80 characters, so it was shortened.'); o.n = o.n.slice(0, 80).trim(); }
  if (!Object.hasOwn(HB_RULES, cat)){ E('Unknown kind of entry.'); return {o, err, warn}; }
  try { HB_RULES[cat](o, E, W, ctx); } catch (e) { E('This entry could not be checked: ' + e.message); }
  const odd = [...new Set(hbStrings([o.x, o.h, o.tr, o.act, o.bon, o.re, o.leg, o.f]).flatMap(s => [...s.matchAll(/\b\d*d(\d+)\b/g)].map(m => +m[1])).filter(d => !HB_DICE.includes(d)))];
  if (odd.length) W(`Unusual dice in the text: ${odd.map(d => 'd' + d).join(', ')}.`);
  if (o.n && ALL.some(e => e.cat === cat && e.src === 'SRD' && e.lc === norm(o.n))) W(`The SRD already has a ${BREW[cat].t.toLowerCase()} called ${o.n}: both will show, and the SRD one opens first.`);
  return {o, err, warn};
}
const hbCtx = items => ({classes:items.filter(it => it.cat === 'classes').map(it => hbStr(it.o?.n)).filter(Boolean), feats:items.filter(it => it.cat === 'feats' && isObj(it.o)).map(it => ({n:hbStr(it.o.n), ty:hbPick(HB_FEAT_TYPES, it.o.ty) || it.o.ty}))});

/* ================================================================== Markdown ↔ homebrew
   One entry per "# Kind: Name" heading, then "- Field: value" lines, then the text. "## Section" headings hold
   higher-level slots (spells), traits (species), features by level (classes, subclasses) and the stat block sections
   (creatures). English and Italian names both work; the template from the Homebrew page shows every field. */
const HB_KIND = {spell:'spells', spells:'spells', cantrip:'spells', incantesimo:'spells', trucchetto:'spells', feat:'feats', talento:'feats',
  species:'species', race:'species', lineage:'species', specie:'species', razza:'species', background:'backgrounds', class:'classes', classe:'classes',
  subclass:'subclasses', sottoclasse:'subclasses', archetype:'subclasses', archetipo:'subclasses', item:'items', 'magic item':'items', oggetto:'items', 'oggetto magico':'items',
  creature:'monsters', monster:'monsters', npc:'monsters', 'stat block':'monsters', creatura:'monsters', mostro:'monsters', png:'monsters'};
const HB_F_ALL = {name:'n', nome:'n', description:'x', descrizione:'x'};
const HB_F = {
  spells:{level:'lv', livello:'lv', school:'sc', scuola:'sc', 'casting time':'t', time:'t', 'tempo di lancio':'t', range:'r', gittata:'r', components:'c', componenti:'c', duration:'d', durata:'d',
    concentration:'conc', concentrazione:'conc', ritual:'rit', rituale:'rit', classes:'cls', class:'cls', 'spell lists':'cls', 'spell list':'cls', lists:'cls', classi:'cls', liste:'cls', 'liste di incantesimi':'cls',
    'at higher levels':'h', 'higher levels':'h', 'using a higher-level spell slot':'h', 'livelli superiori':'h', effect:'x', effetto:'x'},
  feats:{category:'ty', type:'ty', categoria:'ty', tipo:'ty', prerequisite:'pre', prerequisites:'pre', prerequisito:'pre', prerequisiti:'pre', requisiti:'pre', repeatable:'rep', ripetibile:'rep', benefit:'x', beneficio:'x'},
  species:{'creature type':'ty', type:'ty', tipo:'ty', 'tipo di creatura':'ty', size:'size', taglia:'size', speed:'speed', 'velocità':'speed', velocita:'speed'},
  backgrounds:{'ability scores':'asi', abilities:'asi', ability:'asi', caratteristiche:'asi', 'punteggi di caratteristica':'asi', feat:'feat', 'origin feat':'feat', talento:'feat', 'talento di origine':'feat',
    skills:'skills', 'skill proficiencies':'skills', 'abilità':'skills', abilita:'skills', 'competenze nelle abilità':'skills', tools:'tools', tool:'tools', 'tool proficiency':'tools', 'tool proficiencies':'tools',
    strumenti:'tools', strumento:'tools', 'competenza negli strumenti':'tools', equipment:'eq', 'starting equipment':'eq', equipaggiamento:'eq'},
  classes:{'hit die':'hd', 'hit dice':'hd', 'dado vita':'hd', 'dadi vita':'hd', 'primary ability':'prim', 'caratteristica primaria':'prim', 'saving throws':'saves', 'saving throw proficiencies':'saves', saves:'saves',
    'tiri salvezza':'saves', proficiencies:'prof+', competenze:'prof+', armor:'prof+', armour:'prof+', 'armor training':'prof+', weapons:'prof+', tools:'prof+', armature:'prof+', armi:'prof+', strumenti:'prof+',
    skills:'choice', 'skill proficiencies':'choice', 'abilità':'choice', abilita:'choice', spellcasting:'caster', incantatore:'caster', 'spellcasting ability':'spellAb', 'caratteristica da incantatore':'spellAb',
    multiclassing:'mcProf', multiclass:'mcProf', 'multiclass proficiencies':'mcProf', multiclasse:'mcProf'},
  subclasses:{class:'cls', classe:'cls', summary:'sum', tagline:'sum', 'in one line':'sum', sottotitolo:'sum', riassunto:'sum'},
  items:{type:'cat', tipo:'cat', category:'cat', rarity:'rar', 'rarità':'rar', rarita:'rar', attunement:'att', 'requires attunement':'att', sintonia:'att', 'richiede sintonia':'att', 'base item':'base', base:'base', 'oggetto base':'base', 'ac bonus':'acm', 'armor class bonus':'acm', 'bonus ca':'acm', 'attack bonus':'wb', 'damage bonus':'wb', 'attack and damage bonus':'wb', 'weapon bonus':'wb', 'bonus attacco':'wb', 'weapon damage':'wd', damage:'wd', danno:'wd'},
  monsters:{size:'sz', taglia:'sz', type:'ty', tipo:'ty', alignment:'al', allineamento:'al', 'armor class':'ac', ac:'ac', ca:'ac', 'classe armatura':'ac', 'hit points':'hp', hp:'hp', pf:'hp', 'punti ferita':'hp',
    speed:'spd', 'velocità':'spd', velocita:'spd', 'saving throws':'sv', saves:'sv', 'tiri salvezza':'sv', skills:'sk', 'abilità':'sk', abilita:'sk', resistances:'res', 'damage resistances':'res', resistenze:'res',
    immunities:'imm+', 'damage immunities':'imm+', 'condition immunities':'imm+', 'immunità':'imm+', immunita:'imm+', vulnerabilities:'vul', 'damage vulnerabilities':'vul', 'vulnerabilità':'vul',
    senses:'sen', sensi:'sen', languages:'lang', lingue:'lang', linguaggi:'lang', challenge:'cr', cr:'cr', gs:'cr', 'grado di sfida':'cr', 'ability scores':'ab', abilities:'ab', caratteristiche:'ab',
    str:'ab0', dex:'ab1', con:'ab2', int:'ab3', wis:'ab4', cha:'ab5', for:'ab0', des:'ab1', cos:'ab2', sag:'ab4', car:'ab5', strength:'ab0', dexterity:'ab1', constitution:'ab2', intelligence:'ab3', wisdom:'ab4', charisma:'ab5'},
};
const HB_FIELD_RE = /^\s*(?:[-*+]\s+)?(?:\*\*|__)?([^:*_|\n]{1,40}?)(?:\*\*|__)?\s*:\s*(?:\*\*|__)?\s*(.*?)\s*$/;
const HB_LEVEL_RE = /^(?:level|lv\.?|livello|liv\.?)?\s*(\d{1,2})(?:st|nd|rd|th|°)?(?:[- ]level)?\s*[:.\-–—·)]\s*(.+)$/i;
function hbKindOf(h){
  let m = h.match(/^([^:–—|]+?)\s*[:–—|]\s*(.+)$/); if (m && HB_KIND[hbKey(m[1])]) return {cat:HB_KIND[hbKey(m[1])], n:m[2].trim()};
  m = h.match(/^(.+?)\s*[(\[]([^)\]]+)[)\]]\s*$/); if (m && HB_KIND[hbKey(m[2])]) return {cat:HB_KIND[hbKey(m[2])], n:m[1].trim()};
  return null;
}
const hbUnmark = s => s.replace(/^\*{1,3}(.+?)\*{1,3}$/, '$1').trim();
/** Markdown lines → the paragraph text md() shows: soft-wrapped lines joined, lists and tables kept, ### headings as run-ins. */
function hbMdText(lines){
  const out = []; let para = [], lead = '';
  const flush = () => { if (para.length){ out.push(lead + para.join(' ')); para = []; lead = ''; } };
  for (const raw of lines){
    const l = raw.trim();
    if (!l){ flush(); continue; }
    const h = l.match(/^#{3,6}\s+(.+)$/); if (h){ flush(); lead = `**${hbUnmark(h[1]).replace(/[.:]$/, '')}.** `; continue; }
    if (/^\|?\s*:?-{2,}/.test(l) && /-\s*\|/.test(l + '|')){ continue; }   // table separator row
    if (/^\|.*\|$/.test(l)){ flush(); out.push(l.replace(/^\||\|$/g, '').split('|').map(c => c.trim()).join(' | ')); continue; }
    if (/^[-*+•]\s+/.test(l)){ flush(); out.push('- ' + l.replace(/^[-*+•]\s+/, '')); continue; }
    if (/^>\s?/.test(l)){ para.push(l.replace(/^>\s?/, '')); continue; }
    if (lead && !para.length){ para.push(l); continue; }
    para.push(l);
  }
  flush();
  return out.join('\n').trim();
}
const hbFlat = lines => hbMdText(lines).split('\n').map(l => l.replace(/^- /, '• ')).join(' ');
/** "**Name.** text", "***Name.*** text", "- Name: text" or a ### heading start an entry; other lines continue it. */
function hbEntries(lines){
  const out = []; let cur = null;
  for (const raw of lines){
    const l = raw.trim(); if (!l) continue;
    let m = l.match(/^#{3,6}\s+(.+)$/);
    if (m){ cur = {n:hbUnmark(m[1]).replace(/[.:]$/, ''), x:''}; out.push(cur); continue; }
    m = l.match(/^(?:[-*+]\s+)?(\*{2,3}|__)(.+?)\1\s*(.*)$/) || l.match(/^(?:[-*+]\s+)?(\*)([^*]+?\.)\*\s*(.*)$/);
    if (m){ cur = {n:m[2].trim().replace(/[.:]$/, ''), x:m[3].replace(/^[.:]\s*/, '').trim()}; out.push(cur); continue; }
    m = l.match(/^[-*+]\s+([^:]{1,60}):\s*(.*)$/);
    if (m){ cur = {n:m[1].trim(), x:m[2].trim()}; out.push(cur); continue; }
    const t = l.replace(/^[-*+]\s+/, '• ');
    if (cur) cur.x = (cur.x ? cur.x + ' ' : '') + t; else { cur = {n:'', x:t}; out.push(cur); }
  }
  return out;
}
function hbFeatureEntries(lines, W){
  const out = []; let cur = null;
  for (const raw of lines){
    const l = raw.trim(); if (!l) continue;
    const h = l.match(/^#{3,6}\s+(.+)$/), item = l.match(/^[-*+]\s+(.+)$/);
    const head = h ? hbUnmark(h[1]) : item ? hbUnmark(item[1].replace(/^\*\*(.+?)\*\*/, '$1')) : null;
    const lm = head && head.match(HB_LEVEL_RE);
    if (lm){ const rest = lm[2].match(/^([^:]{1,60}?)\s*:\s*(.*)$/); cur = {l:+lm[1], n:hbUnmark((rest ? rest[1] : lm[2]).trim()).replace(/[.:]$/, ''), x:h ? '' : (rest ? rest[2] : '')}; out.push(cur); continue; }
    if (h){ W(`Feature heading “${h[1]}” has no level: write it as “### Level 3: Name”.`); cur = null; continue; }
    if (cur) cur.x = (cur.x ? cur.x + ' ' : '') + l.replace(/^[-*+]\s+/, '• ');
    else W(`Text “${l.slice(0, 40)}…” is not under a feature, so it was left out.`);
  }
  return out;
}
const HB_MON_SEC = {traits:'tr', trait:'tr', tratti:'tr', actions:'act', action:'act', azioni:'act', 'bonus actions':'bon', 'azioni bonus':'bon', reactions:'re', reazioni:'re',
  'legendary actions':'leg', 'azioni leggendarie':'leg'};
const HB_HIGHER = /higher|upcast|livell[io] superior|slot di livello superiore/i;
/* ---- Forgiving Markdown: clean pasted text, work out what each entry is, and put it in the shape parseBrewMd reads ---- */
const HB_ENT = {amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ', ensp:' ', emsp:' ', thinsp:' ', ndash:'–', mdash:'—', lsquo:'‘', rsquo:'’', ldquo:'“', rdquo:'”', hellip:'…', bull:'•', middot:'·', deg:'°', times:'×', minus:'−', plusmn:'±', frac12:'½', frac14:'¼', frac34:'¾', rarr:'→', larr:'←', shy:'', copy:'©', reg:'®', trade:'™'};
function hbCleanText(raw, notes){
  let t = String(raw || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/[​-‍⁠­]/g, '').replace(/ /g, ' ').replace(/\t/g, '  ');
  let n = 0; const bump = s => { n++; return s; };
  if (/<[a-z/][^>]*>/i.test(t)){
    t = t.replace(/<br\s*\/?>/gi, () => bump('\n')).replace(/<\/p>|<\/div>/gi, () => bump('\n\n')).replace(/<li[^>]*>/gi, () => bump('\n- '))
      .replace(/<h([1-6])[^>]*>/gi, (m, d) => bump('\n' + '#'.repeat(+d) + ' ')).replace(/<\/h[1-6]>/gi, () => bump('\n'))
      .replace(/<\/?(?:b|strong)\b[^>]*>/gi, () => bump('**')).replace(/<\/?(?:i|em)\b[^>]*>/gi, () => bump('*'))
      .replace(/<tr[^>]*>/gi, () => bump('\n|')).replace(/<\/t[dh]>/gi, () => bump(' |')).replace(/<t[dh][^>]*>/gi, () => bump(' '))
      .replace(/<\/?[a-z][^>]*>/gi, () => bump(''));
  }
  t = t.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e) => {
    let r;
    if (e[0] === '#'){ const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); r = cp > 31 && cp < 0x110000 ? String.fromCodePoint(cp) : ''; }
    else r = Object.hasOwn(HB_ENT, e.toLowerCase()) ? HB_ENT[e.toLowerCase()] : null;
    return r == null ? m : bump(r);
  });
  t = t.split('\n').filter(l => !/^\s*(```|~~~)/.test(l)).join('\n');
  if (n) notes.push(`Cleaned ${n} HTML ${n === 1 ? 'tag or entity' : 'tags and entities'} (like &nbsp; or <br>) into plain text.`);
  return t;
}
const HB_CAT_LABEL = {spells:'Spell', feats:'Feat', species:'Species', backgrounds:'Background', classes:'Class', subclasses:'Subclass', items:'Item', monsters:'Creature'};
const HB_WORD_KIND = {class:'classes', subclass:'subclasses', archetype:'subclasses', spell:'spells', cantrip:'spells', feat:'feats', species:'species', race:'species', background:'backgrounds', item:'items', 'magic item':'items', creature:'monsters', monster:'monsters', npc:'monsters'};
/** "Armorer (Artificer subclass)", "The Artificer Class", "Spell – Ember Lash" → {n, cat?, cls?}. */
function hbTitle(h){
  const n = hbUnmark(String(h).replace(/\s+#+$/, '')).replace(/[.:]$/, '').trim();
  let m = n.match(/^(.+?)\s*[(\[]\s*([^)\]]*?)\s*\b(subclass|archetype)\b\s*(?:of\s+([^)\]]+))?[)\]]$/i);
  if (m) return {n:m[1].trim(), cat:'subclasses', cls:(m[2] || m[4] || '').replace(/^(?:a|an|the)\s+|\s+(?:class|of)$/gi, '').trim()};
  m = n.match(/^(.+?)\s*[(\[]\s*(class|spell|cantrip|feat|species|race|background|item|magic item|creature|monster|npc)\s*[)\]]$/i);
  if (m) return {n:m[1].trim(), cat:HB_WORD_KIND[m[2].toLowerCase()]};
  m = n.match(/^(?:the\s+)?(.+?)\s+(class|subclass|archetype|spell|feat|species|race|background|creature|monster)$/i);
  if (m && m[1].split(/\s+/).length <= 5) return {n:m[1].trim(), cat:HB_WORD_KIND[m[2].toLowerCase()]};
  m = n.match(/^(class|subclass|archetype|spell|feat|species|race|background|creature|monster)\s+(?:of\s+|-\s*)?(.+)$/i);
  if (m && !/^(of|the|and)\b/i.test(m[2])) return {n:m[2].trim(), cat:HB_WORD_KIND[m[1].toLowerCase()]};
  return {n};
}
/** "Level 3: Name", "3rd-level: Name", "Name (Level 3)", "Lv 5 – Name" → {l, n}. */
function hbLevelHead(s){
  const t = hbUnmark(String(s).trim()).replace(/[*_]+$/, '').trim(); let m;
  m = t.match(/^(?:level|lvl|lv\.?|livello|liv\.?)\s*(\d{1,2})\b\s*[:.\-–—·)]*\s*(.*)$/i) || t.match(/^(\d{1,2})(?:st|nd|rd|th|°)?[- ]level\s*[:.\-–—·)]*\s*(.*)$/i) || t.match(/^(\d{1,2})(?:st|nd|rd|th|°)\s*[:.\-–—·)]\s*(.+)$/i);
  if (m && +m[1] >= 1 && +m[1] <= 20){ const n = hbUnmark(m[2].trim()).replace(/[.:]$/, ''); return {l:+m[1], n:n || `Level ${m[1]} feature`}; }
  m = t.match(/^(.+?)\s*[(\[]\s*(?:level|lvl|lv\.?|livello)\s*(\d{1,2})\s*[)\]]$/i);
  if (m && +m[2] >= 1 && +m[2] <= 20) return {l:+m[2], n:hbUnmark(m[1]).replace(/[.:]$/, '')};
  return null;
}
const HB_STRUCT = /^(features?|class features?|subclass features?|traits?|species traits?|actions?|bonus actions?|reactions?|legendary actions?|description|effect|benefits?|(?:using a )?higher[- ]level spell slot|at higher levels|equipment|starting equipment|proficiencies|multiclassing|privilegi.*|tratti|azioni.*|reazioni|descrizione)$/i;
const HB_NOTITLE = /^(?:pack|homebrew|notes?|changelog|index|contents|table of contents|indice)\b/i;
// “#Spell: Name” (no space after #) is still a title
const hbHeadingOf = l => { const m = l.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/) || l.match(/^(#{1,6})(?=[A-Za-z])([A-Za-z][^#\n]*?)\s*#*\s*$/); return m ? {d:m[1].length, t:m[2].trim()} : null; };
function hbInfer(title, lines, featCount){
  if (title.cat) return {cat:title.cat, why:'its title'};
  const keys = new Set(), head = lines.slice(0, 40);
  for (const l of head){ if (hbHeadingOf(l)) break; const m = l.trim().match(HB_FIELD_RE) || l.trim().match(/^\|\s*([^|]{1,40}?)\s*\|\s*(.*?)\s*\|?\s*$/); if (m) keys.add(hbKey(m[1].replace(/\s*\(.*\)$/, '').replace(/\*+/g, ''))); }
  const has = (...k) => k.some(x => keys.has(x)), text = head.join('\n');
  if (has('hit die', 'hit dice', 'dado vita', 'dadi vita', 'primary ability', 'caratteristica primaria')) return {cat:'classes', why:'its Hit Die / Primary ability'};
  if (has('armor class', 'ac', 'ca', 'classe armatura') && has('hit points', 'hp', 'pf', 'punti ferita')) return {cat:'monsters', why:'its Armor Class and Hit Points'};
  if ((text.match(/\b(STR|DEX|CON|INT|WIS|CHA)\b\s*:?\s*\d/gi) || []).length >= 3) return {cat:'monsters', why:'its ability scores'};
  if (has('casting time', 'tempo di lancio', 'components', 'componenti') || /^\s*[*_]{1,2}(?:level\s*\d|\d(?:st|nd|rd|th)-level|\w+ cantrip)/im.test(text)) return {cat:'spells', why:'its casting time / components'};
  if (has('rarity', 'rarità', 'rarita') || /^\s*[*_]{1,2}[^,\n]+,\s*(?:common|uncommon|rare|very rare|legendary|artifact)\b/im.test(text)) return {cat:'items', why:'its rarity'};
  if (has('origin feat', 'talento di origine') || (has('ability scores', 'punteggi di caratteristica') && has('skill proficiencies', 'skills', 'equipment', 'tool proficiencies'))) return {cat:'backgrounds', why:'its origin feat / skills'};
  if (has('prerequisite', 'prerequisites', 'prerequisito', 'prerequisiti', 'repeatable', 'ripetibile') || /\b(?:general|origin|fighting style|epic boon) feat\b/i.test(text)) return {cat:'feats', why:'its prerequisite / category'};
  if (has('creature type', 'tipo di creatura') || (has('size', 'taglia') && has('speed', 'velocità', 'velocita'))) return {cat:'species', why:'its size / speed'};
  if (featCount){
    if (has('class', 'classe', 'parent class') || /\b(sub-?class|archetype)\b/i.test(text)) return {cat:'subclasses', why:'its level features and parent class'};
    return {cat:featCount >= 8 ? 'classes' : 'subclasses', why:`its ${featCount} level features`};
  }
  return null;
}
/** Step 1 of the import: any reasonable Markdown or pasted web text in, the strict “# Kind: Name” layout out. */
function hbLenient(raw, def){
  const notes = [], hints = {}, lines = hbCleanText(raw, notes).split('\n').map(l => l.replace(/\s+$/, ''));
  const hd = lines.map(hbHeadingOf), isStruct = h => !!h && (!!hbLevelHead(h.t) || HB_STRUCT.test(hbUnmark(h.t).replace(/[.:]$/, '')));
  const kinded = h => !!h && !!hbKindOf(hbUnmark(h.t)), titled = h => !!h && !isStruct(h) && (kinded(h) || !HB_NOTITLE.test(hbUnmark(h.t)));
  const levels = body => body.filter(l => { const h = hbHeadingOf(l); return h && hbLevelHead(h.t); }).length;
  const minD = Math.min(...hd.filter(titled).map(h => h.d), 4);
  let at = [], Lv = minD, found = false;
  for (Lv = minD; Lv <= 3 && !found; Lv++){
    at = []; hd.forEach((h, i) => { if (titled(h) && h.d === Lv) at.push(i); });
    found = at.some(i => kinded(hd[i])) || at.some((i, k) => { const b = lines.slice(i + 1, at[k + 1] ?? lines.length); return def || hbInfer(hbTitle(hd[i].t), b, levels(b)); });
  }
  Lv--;
  const blocks = [];
  if (!found && minD > 3){   // no heading at all: the first short line is the name
    const k = lines.findIndex(l => l.trim());
    if (k < 0) return {text:'', notes, hints};
    const first = lines[k].trim(), nameLike = first.length <= 60 && !HB_FIELD_RE.test(first) && !hbHeadingOf(first) && !hbLevelHead(first);
    blocks.push({title:hbTitle(nameLike ? first.replace(/^[*_#\s]+|[*_\s]+$/g, '') : ''), kinded:false, body:lines.slice(nameLike ? k + 1 : 0), line:k + 1, shift:0});
  } else {
    if (!found){ Lv = minD; at = []; hd.forEach((h, i) => { if (titled(h) && h.d === Lv) at.push(i); }); }
    at.forEach((i, k) => blocks.push({title:hbTitle(hd[i].t), kinded:kinded(hd[i]), labelled:hd[i].t, body:lines.slice(i + 1, at[k + 1] ?? lines.length), line:i + 1, shift:Lv - 1}));
  }
  const out = [];
  for (const b of blocks){
    let cat, why = '', name = b.title.n;
    if (b.kinded){ const k = hbKindOf(hbUnmark(b.labelled)); cat = k.cat; name = k.n; }
    const body = b.body.map(l => { const h = hbHeadingOf(l); return h && b.shift ? '#'.repeat(Math.max(2, h.d - b.shift)) + ' ' + h.t : l; });
    // level features: headings, bold run-ins, or short plain "Level 3: Name" lines
    const pre = [], secs = [], feats = []; let cur = pre, inFeat = false;
    for (const l of body){
      const h = hbHeadingOf(l), t = l.trim();
      if (h){
        const lv = hbLevelHead(h.t);
        if (lv){ const f = {l:lv.l, n:lv.n, lines:[]}; feats.push(f); cur = f.lines; inFeat = true; continue; }
        if (/^(features?|class features?|subclass features?|privilegi.*)$/i.test(hbUnmark(h.t).replace(/[.:]$/, ''))){ cur = pre; inFeat = false; continue; }
        if (h.d <= 2){ const s = {t:h.t, lines:[]}; secs.push(s); cur = s.lines; inFeat = false; continue; }
        cur.push(l); continue;
      }
      const run = t.match(/^\*\*(.{3,70}?)\*\*\s*(.*)$/), lvr = run && hbLevelHead(run[1]);
      if (lvr){ const f = {l:lvr.l, n:lvr.n, lines:run[2] ? [run[2]] : []}; feats.push(f); cur = f.lines; inFeat = true; continue; }
      const plain = t.length <= 70 && !/[.!?]$/.test(t) && !/^[-*+|>]/.test(t) && /^(?:level|lvl|lv\.?|livello|liv\.?)\s*\d|^\d{1,2}(?:st|nd|rd|th)[- ]level/i.test(t) && hbLevelHead(t);
      if (plain){ const f = {l:plain.l, n:plain.n, lines:[]}; feats.push(f); cur = f.lines; inFeat = true; continue; }
      cur.push(l);
    }
    if (!cat){
      const inf = def ? {cat:def, why:'your choice'} : hbInfer(b.title, pre.concat(...secs.map(s => s.lines)), feats.length);
      if (!inf){ if (feats.length || secs.length || pre.some(l => l.trim())) notes.push(`“${name || 'An entry'}” (line ${b.line}) could not be recognised. In Paste Markdown choose what it is, or write “# Spell: ${name || 'Name'}”.`); continue; }
      cat = inf.cat; why = inf.why;
    }
    if (!name){ name = 'Untitled'; notes.push(`An entry (line ${b.line}) has no name: it was called “Untitled”.`); }
    const at0 = out.length;
    out.push(`# ${HB_CAT_LABEL[cat]}: ${name}`, '');
    if (cat === 'subclasses' && b.title.cls && !pre.some(l => /^\s*[-*+]?\s*\**\s*(class|classe)\s*\**\s*:/i.test(l))) out.push(`- Class: ${b.title.cls}`);
    const fieldKeys = Object.assign({}, HB_F_ALL, HB_F[cat]);
    pre.forEach(l => {   // two-column tables "| Hit die | d8 |" become "- Hit die: d8"
      const m = l.trim().match(/^\|\s*([^|]{1,40}?)\s*\|\s*([^|]*?)\s*\|?\s*$/);
      if (m && Object.hasOwn(fieldKeys, hbKey(m[1].replace(/\*+/g, ''))) && m[2].trim()) out.push(`- ${m[1].replace(/\*+/g, '').trim()}: ${m[2].replace(/\*+/g, '').trim()}`);
      else if (!(m && /^:?-{2,}/.test(m[1]))) out.push(l);
    });
    secs.forEach(s => { out.push('', `## ${s.t}`, ...s.lines); });
    if (feats.length){ out.push('', '## Features'); feats.forEach(f => out.push('', `### Level ${f.l}: ${f.n}`, '', ...f.lines)); }
    out.push('');
    const hint = [], lbl = HB_CAT_LABEL[cat];
    if (!b.kinded && why) hint.push(`Read as a ${lbl === 'Creature' ? 'creature' : lbl.toLowerCase()} from ${why}. If that is wrong, choose the kind in Paste Markdown or write “# Kind: ${name}” (for example “# Spell: ${name}”).`);
    if ((cat === 'classes' || cat === 'subclasses') && !feats.length) hint.push('No level features found: write each one as “### Level 3: Name” or “Name (Level 3)”.');
    if (feats.some((f, i) => feats.findIndex(g => g.l === f.l && g.n === f.n) !== i)) hint.push('Two features have the same level and name: check for a copy-paste repeat.');
    if (hint.length) hints[at0 + 1] = hint;
  }
  return {text:out.join('\n'), notes, hints};
}
/** Parse a whole Markdown file. Returns {items:[{cat, o, src, pw}], notes}: pw are the parser's own warnings for that entry, notes those for the file. */
function parseBrewMd(text, def){
  const len = hbLenient(text, def), hints = len.hints;
  const lines = len.text.split('\n'), items = [], notes = len.notes.slice();
  let i = 0;
  if (lines[0]?.trim() === '---'){ const end = lines.indexOf('---', 1); if (end > 0) i = end + 1; }
  let cur = null;
  const start = (kind, line) => { cur = {cat:kind.cat, n:kind.n, line, fields:{}, body:[], secs:[], pw:[], head:true}; items.push(cur); };
  for (; i < lines.length; i++){
    const l = lines[i], t = l.trim(), h1 = t.match(/^#\s*(?=\S)([^#].*)$/), h2 = t.match(/^##\s*(?=\S)([^#].*)$/);
    if (h1){ const k = hbKindOf(hbUnmark(h1[1])); if (k) start(k, i + 1); else { if (items.length) notes.push(`Line ${i + 1}: “${t}” doesn’t say what it is (write “# Spell: ${hbUnmark(h1[1])}”), so it and its text were skipped.`); cur = null; } continue; }
    if (!cur) continue;   // a title or notes before the first entry
    if (/^---+$/.test(t) || /^\*\*\*+$/.test(t) || /^___+$/.test(t)) continue;
    if (h2){ cur.head = false; cur.secs.push({t:hbUnmark(h2[1]).replace(/[.:]$/, ''), lines:[], line:i + 1}); continue; }
    if (cur.secs.length){ cur.secs[cur.secs.length - 1].lines.push(l); continue; }
    const fm = t.match(HB_FIELD_RE), key = fm && hbKey(fm[1].replace(/\s*\(.*\)$/, ''));
    const fk = key && (HB_F[cur.cat][key] || HB_F_ALL[key]);
    if (fk && (cur.head || /^\s*([-*+]\s+|\*\*)/.test(l))){ (cur.fields[fk] = cur.fields[fk] || []).push(fm[2]); continue; }
    // "STR 18 (+4)  DEX 14 (+2) …" on one line, or a | STR | DEX | table
    if (cur.cat === 'monsters'){
      const pairs = [...t.matchAll(/\b(STR|DEX|CON|INT|WIS|CHA|FOR|DES|COS|SAG|CAR)\b\s*:?\s*(\d{1,2})/gi)];
      if (pairs.length >= 3){ pairs.forEach(p => { (cur.fields['ab' + ['str', 'dex', 'con', 'int', 'wis', 'cha'].indexOf(hbAbil(p[1]))] = [p[2]]); }); continue; }
      const hdr = t.match(/^\|?\s*(STR|FOR)\s*\|/i);
      if (hdr){ const cols = t.replace(/^\||\|$/g, '').split('|').map(c => hbAbil(c.trim())); let j = i + 1;
        while (j < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[j])) j++;
        if (j < lines.length){ const vals = lines[j].replace(/^\s*\||\|\s*$/g, '').split('|').map(c => parseInt(c, 10)); cols.forEach((a, k) => { if (a) cur.fields['ab' + AB5.indexOf(a)] = [String(vals[k])]; }); i = j; continue; } }
    }
    if (cur.head && t && fm && !/^\s*[-*+]?\s*\*{0,3}(hit|miss|failure|success|trigger|response)\b/i.test(t) && /^\s*([-*+]\s+|\*\*)/.test(l))
      cur.pw.push(`Line ${i + 1}: “${fm[1].trim()}” is not a ${BREW[cur.cat].t.toLowerCase()} field, so it was kept as text.`);
    if (t) cur.head = false;
    cur.body.push(l);
  }
  return {items:items.map(hbMdBuild).map(it => { const n = +String(it.src).replace(/\D/g, ''); if (hints[n]) it.pw.unshift(...hints[n]); return it; }), notes};
}
function hbMdBuild(e){
  const f = k => (e.fields[k] || []).join(', ').trim(), o = {n:f('n') || e.n}, pw = e.pw, body = e.body.slice();
  const secText = s => hbMdText(s.lines);
  const runIn = s => { const t = secText(s); return t ? `**${s.t}.** ${t.replace(/\n/g, '\n')}` : ''; };
  const takeFirst = re => { const k = body.findIndex(l => l.trim()); if (k < 0) return null; const m = body[k].trim().match(re); if (m) body.splice(k, 1); return m; };
  const xs = [];
  switch (e.cat){
    case 'spells': {
      Object.assign(o, {lv:f('lv'), sc:f('sc'), t:f('t'), r:f('r'), c:f('c'), d:f('d'), conc:f('conc'), rit:f('rit'), cls:f('cls'), h:f('h')});
      if (!o.lv && !o.sc){ const m = takeFirst(/^\*{1,2}_?(?:level\s*(\d)\s+(\w+)|(\d)(?:st|nd|rd|th)-level\s+(\w+)|(\w+)\s+cantrip)(?:\s*\(([^)]*)\))?_?\*{1,2}$/i);
        if (m){ o.lv = m[1] || m[3] || (m[5] ? '0' : ''); o.sc = m[2] || m[4] || m[5]; if (m[6] && !o.cls) o.cls = m[6]; } }
      // "***At Higher Levels.*** When you cast…" as a bold run-in (the way books and 5e wikis print it) goes to its own field
      const hi = body.findIndex(l => { const m = l.trim().match(/^(?:\*{2,3}|_{2,3})\s*([^*_]{3,60}?)\s*[.:]?\s*(?:\*{2,3}|_{2,3})\s*[.:]?\s*(.*)$/); return m && HB_HIGHER.test(m[1]); });
      if (hi >= 0){ let end = hi + 1; while (end < body.length && body[end].trim()) end++;
        const [first, ...more] = body.splice(hi, end - hi); o.h = [o.h, [first.trim().replace(/^(?:\*{2,3}|_{2,3})[^*_]*(?:\*{2,3}|_{2,3})\s*[.:]?\s*/, ''), ...more.map(l => l.trim())].filter(Boolean).join(' ')].filter(Boolean).join(' '); }
      xs.push(hbMdText(body));
      e.secs.forEach(s => { if (HB_HIGHER.test(s.t)) o.h = [o.h, hbFlat(s.lines)].filter(Boolean).join(' '); else if (/^(effect|description|effetto|descrizione)$/i.test(s.t)) xs.push(secText(s)); else xs.push(runIn(s)); });
      break;
    }
    case 'feats': Object.assign(o, {ty:f('ty'), pre:f('pre'), rep:f('rep')}); xs.push(hbMdText(body)); e.secs.forEach(s => xs.push(/^(benefits?|description|benefici|descrizione)$/i.test(s.t) ? secText(s) : runIn(s))); break;
    case 'species':
      Object.assign(o, {ty:f('ty'), size:f('size'), speed:f('speed'), tr:[]}); xs.push(hbMdText(body));
      e.secs.forEach(s => { if (/^(traits?|tratti|tratti della specie|species traits)$/i.test(s.t)) o.tr.push(...hbEntries(s.lines)); else if (/^(description|descrizione)$/i.test(s.t)) xs.push(secText(s)); else o.tr.push({n:s.t, x:hbFlat(s.lines)}); });
      break;
    case 'backgrounds': Object.assign(o, {asi:f('asi'), feat:f('feat'), skills:f('skills'), tools:f('tools'), eq:f('eq')}); xs.push(hbMdText(body)); e.secs.forEach(s => xs.push(/^(description|descrizione)$/i.test(s.t) ? secText(s) : runIn(s))); break;
    case 'classes': case 'subclasses': {
      if (e.cat === 'classes') Object.assign(o, {hd:f('hd'), prim:f('prim'), saves:f('saves'), prof:f('prof+'), choice:f('choice'), caster:f('caster'), spellAb:f('spellAb'), mcProf:f('mcProf')});
      else Object.assign(o, {cls:f('cls'), sum:f('sum')});
      o.f = []; xs.push(hbMdText(body));
      e.secs.forEach(s => { const lm = s.t.match(HB_LEVEL_RE);
        if (lm) o.f.push({l:+lm[1], n:lm[2].trim(), x:hbFlat(s.lines)});
        else if (/^(features|class features|subclass features|privilegi|privilegi di classe|privilegi della sottoclasse|capacità)$/i.test(s.t)) o.f.push(...hbFeatureEntries(s.lines, m => pw.push(m)));
        else if (/^(description|descrizione)$/i.test(s.t)) xs.push(secText(s));
        else { pw.push(`Section “${s.t}” is not a feature (write “## Level 3: ${s.t}”), so it was added to the description.`); xs.push(runIn(s)); } });
      break;
    }
    case 'items': {
      Object.assign(o, {cat:f('cat'), rar:f('rar'), att:f('att'), base:f('base'), acm:f('acm'), wb:f('wb'), wd:f('wd')});
      if (!o.cat && !o.rar){ const m = takeFirst(/^[*_]{1,2}([^,*_]+),\s*([^(*_]+?)\s*(\(requires attunement([^)]*)\))?[*_]{1,2}$/i); if (m){ o.cat = m[1].trim(); o.rar = m[2].trim(); if (m[3]){ o.att = 'yes'; if (m[4]?.trim()) body.unshift(`*Requires attunement ${m[4].trim()}.*`); } } }
      const at = hbKey(o.att); if (/^(yes|sì|si)\b.+|^\(?(by|da|requires)\b/.test(at)){ const by = o.att.replace(/^(yes|sì|si)[,\s]*/i, '').replace(/^\(|\)$/g, '').trim(); o.att = 'yes'; if (by) body.unshift(`*Requires attunement ${by.replace(/^requires attunement\s*/i, '')}.*`); }
      xs.push(hbMdText(body)); e.secs.forEach(s => xs.push(/^(description|descrizione)$/i.test(s.t) ? secText(s) : runIn(s)));
      break;
    }
    case 'monsters': {
      Object.assign(o, {sz:f('sz'), ty:f('ty'), al:f('al'), ac:f('ac'), hp:f('hp'), spd:f('spd'), cr:f('cr'), sv:f('sv'), sk:f('sk'), res:f('res'), imm:(e.fields['imm+'] || []).join('; '), vul:f('vul'), sen:f('sen'), lang:f('lang')});
      if (!o.sz && !o.ty){ const m = takeFirst(/^[*_]{1,2}(Tiny|Small|Medium|Large|Huge|Gargantuan)(?: or (?:Tiny|Small|Medium|Large|Huge|Gargantuan))?\s+([^,*_]+),\s*([^*_]+)[*_]{1,2}$/i); if (m){ o.sz = m[0].replace(/^[*_]+/, '').match(/^(\w+(?: or \w+)?)/)[1]; o.ty = m[2].trim(); o.al = m[3].trim(); } }
      const abv = f('ab'); o.ab = !abv ? null : /\(/.test(abv) ? [...abv.matchAll(/(\d+)\s*\(/g)].map(m => +m[1]) : (abv.match(/\d+/g) || []).map(Number);
      if (!o.ab && AB5.some((a, k) => e.fields['ab' + k])) o.ab = AB5.map((a, k) => parseInt(f('ab' + k), 10));
      if (!o.ab) o.ab = [];
      o.tr = []; o.act = []; o.bon = []; o.re = []; o.leg = [];
      const pre = hbEntries(body); if (pre.length) o.tr.push(...pre);
      e.secs.forEach(s => { const k = HB_MON_SEC[hbKey(s.t)]; if (k) o[k].push(...hbEntries(s.lines).filter(a => !(k === 'leg' && !a.n && /legendary action|azioni leggendarie/i.test(a.x)))); else { pw.push(`Section “${s.t}” is not Traits, Actions, Bonus Actions, Reactions or Legendary Actions, so it was read as traits.`); o.tr.push(...hbEntries(s.lines)); } });
      break;
    }
  }
  if (e.cat !== 'monsters') o.x = [f('x'), ...xs].filter(Boolean).join('\n').trim();
  return {cat:e.cat, o, src:'line ' + e.line, pw};
}
/** Homebrew → Markdown in the same format, so an export can be edited in any text editor and imported back. */
function brewToMd(list){
  const L = [], yes = v => v ? 'yes' : 'no', fl = s => hbStr(s).replace(/\s*\n+\s*/g, ' ');
  const field = (k, v) => { v = Array.isArray(v) ? v.filter(Boolean).join(', ') : hbStr(v); if (v) L.push(`- ${k}: ${v}`); };
  const text = x => { if (hbStr(x)){ L.push(''); L.push(hbStr(x).replace(/\n/g, '\n\n')); } };
  const ents = arr => (arr || []).forEach(t => L.push(t.n ? `**${fl(t.n).replace(/[.:]$/, '')}.** ${fl(t.x)}` : fl(t.x)));
  for (const {cat, o} of list.map(it => it.cat === 'weapons' ? {cat:'items', o:{...weaponAsItem(it.o), cat:'Weapon', rar:it.o.rar === 'Mundane' ? '' : it.o.rar}} : it)){
    if (L.length) L.push('', '---', '');
    L.push(`# ${BREW[cat].t === 'Magic item' ? 'Item' : BREW[cat].t}: ${o.n}`, '');
    switch (cat){
      case 'spells': field('Level', +o.lv ? o.lv : 'Cantrip'); field('School', o.sc); field('Casting time', o.t); field('Range', o.r); field('Components', o.c); field('Duration', o.d);
        field('Concentration', yes(o.conc)); field('Ritual', yes(o.rit)); field('Classes', o.cls); text([spellFxText(o), o.x].filter(Boolean).join('\n\n')); if (hbStr(o.h) || spellFxHigher(o)) L.push('', '## Using a Higher-Level Spell Slot', '', fl(o.h || spellFxHigher(o))); break;
      case 'feats': field('Category', o.ty); field('Prerequisite', o.pre); if (o.rep) field('Repeatable', 'yes'); text(o.x); break;
      case 'species': field('Creature type', o.ty); field('Size', o.size); field('Speed', o.speed); text(o.x); if ((o.tr || []).length){ L.push('', '## Traits', ''); ents(o.tr); } break;
      case 'backgrounds': field('Ability scores', (o.asi || []).map(a => hbAbilName(hbAbil(a)))); field('Origin feat', o.feat); field('Skills', o.skills); field('Tools', o.tools); field('Equipment', o.eq); text(o.x); break;
      case 'classes': field('Hit die', o.hd ? 'd' + o.hd : ''); field('Primary ability', o.prim); field('Saving throws', (o.saves || []).map(a => hbAbilName(hbAbil(a)))); field('Proficiencies', o.prof);
        field('Skills', (o.choice || []).join('; ')); field('Spellcasting', o.caster || 'none'); if (o.spellAb) field('Spellcasting ability', hbAbilName(o.spellAb)); field('Multiclassing', o.mcProf); text(o.x);
        if ((o.f || []).length){ L.push('', '## Features'); o.f.forEach(x => L.push('', `### Level ${x.l}: ${fl(x.n)}`, '', fl(x.x))); } break;
      case 'subclasses': field('Class', o.cls); field('Summary', o.sum); text(o.x);
        if ((o.f || []).length){ L.push('', '## Features'); o.f.forEach(x => L.push('', `### Level ${x.l}: ${fl(x.n)}`, '', fl(x.x))); } break;
      case 'items': field('Type', o.cat); field('Rarity', o.rar); field('Attunement', yes(o.att)); field('Base item', o.base); field('AC bonus', o.acm); field('Attack and damage bonus', o.wb); field('Weapon damage', o.wd); text(o.x); break;
      case 'monsters': field('Size', o.sz); field('Type', o.ty); field('Alignment', o.al); field('Armor class', o.ac); field('Hit points', o.hp); field('Speed', o.spd);
        field('Ability scores', (o.ab || []).join(' ')); field('Challenge', crStr(o.cr)); field('Saving throws', o.sv); field('Skills', o.sk); field('Vulnerabilities', o.vul); field('Resistances', o.res);
        field('Immunities', o.imm); field('Senses', o.sen); field('Languages', o.lang);
        [['Traits', o.tr], ['Actions', o.act], ['Bonus Actions', o.bon], ['Reactions', o.re], ['Legendary Actions', o.leg]].forEach(([h, a]) => { if ((a || []).length){ L.push('', '## ' + h, ''); ents(a); } }); break;
    }
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}
const HB_MD_TEMPLATE = `# Grimoire homebrew template
Each entry starts with "# Kind: Name". Kinds: Spell, Feat, Species, Background, Class, Subclass, Item, Creature
(Italian works too: Incantesimo, Talento, Specie, Background, Classe, Sottoclasse, Oggetto, Creatura).
Then one "- Field: value" per line, then the text. Delete the examples you don't need.
The label is optional: a plain title is read from its fields (Hit die, Casting time…), and class features can be written
"Level 3: Name", "3rd-level: Name" or "Name (Level 3)". Pasted web text with HTML and &nbsp; is cleaned up. The check window tells you what it guessed.

# Spell: Ember Lash

- Level: 1
- School: Evocation
- Casting time: Action
- Range: 30 feet
- Components: V, S, M (a pinch of ash)
- Duration: Instantaneous
- Concentration: no
- Ritual: no
- Classes: Sorcerer, Wizard

A whip of embers lashes one creature you can see within range. Make a ranged spell attack against it. On a hit, the target takes 2d8 Fire damage.

## Using a Higher-Level Spell Slot

The damage increases by 1d8 for each spell slot level above 1.

# Feat: Ashen Resolve

- Category: General
- Prerequisite: Level 4+, Constitution 13+
- Repeatable: no

You gain the following benefits.

**Ability Score Increase.** Increase your Constitution score by 1, to a maximum of 20.

**Smoulder.** When you take Fire damage, you can take a Reaction to reduce it by 1d10 + your Constitution modifier.

# Species: Emberkin

- Creature type: Humanoid
- Size: Small or Medium
- Speed: 30

Folk touched by an elemental hearth, with warm skin and eyes like coals.

## Traits

**Darkvision.** You have Darkvision with a range of 60 feet.
**Hearthblood.** You have Resistance to Fire damage.

# Background: Lamplighter

- Ability scores: Dexterity, Intelligence, Wisdom
- Origin feat: Alert
- Skills: Perception, Stealth
- Tools: Tinker's Tools
- Equipment: Choose A or B: (A) Tinker's Tools, Lamp, 2 Flasks of Oil, 10 GP; or (B) 50 GP

You kept the city's lamps burning through the long nights.

# Class: Ember Knight

- Hit die: d10
- Primary ability: Strength and Charisma
- Saving throws: Strength, Charisma
- Proficiencies: Light armor, Medium armor, Shields, Simple weapons, Martial weapons
- Skills: Choose 2: Athletics, Insight, Intimidation, Persuasion
- Spellcasting: half
- Spellcasting ability: Charisma
- Multiclassing: Light armor, Shields

Warriors who carry a living flame in their oath.

## Features

### Level 1: Burning Oath

Your weapon attacks deal an extra 1d4 Fire damage.

### Level 2: Spellcasting

You learn to cast spells from the Paladin spell list.

### Level 3: Ember Knight Subclass

You choose an Ember Knight subclass.

### Level 4: Ability Score Improvement

You gain the Ability Score Improvement feat or another feat for which you qualify.

# Subclass: Order of the Last Coal

- Class: Ember Knight
- Summary: Keepers of the final flame

Knights sworn to carry the last ember of a dying world.

## Features

### Level 3: Coal Ward

When an ally within 10 feet takes damage, you can take a Reaction to grant them 1d8 Temporary Hit Points.

### Level 7: Fire That Stays

Your Burning Oath damage increases to 1d6.

# Item: Lantern of the Long Night

- Type: Wondrous Item
- Rarity: Uncommon
- Attunement: no

While lit, this lantern sheds Bright Light in a 30-foot radius and Dim Light for an additional 30 feet. Invisible creatures in the bright light are outlined in a soft glow.

# Item: Emberbrand

- Type: Weapon
- Rarity: Rare
- Attunement: yes
- Base item: Longsword
- Attack and damage bonus: +1

Equip it from the pack and it joins your attacks as a Longsword with the bonus. While you are attuned, it sheds light and you can set the blade on fire as a Bonus Action. Optional lines for items worn on the body: "AC bonus" (+1 to Armor Class), "Weapon damage" (1d8 Slashing, when there is no base item).

# Creature: Cinder Hound

- Size: Medium
- Type: Elemental
- Alignment: Unaligned
- Armor class: 13
- Hit points: 22 (4d8 + 4)
- Speed: 40 ft.
- Ability scores: 14 16 12 4 12 6
- Challenge: 1
- Skills: Perception +3
- Immunities: Fire
- Senses: Darkvision 60 ft., passive Perception 13
- Languages: —

**Pack Tactics.** The hound has Advantage on an attack roll against a creature if at least one of the hound's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition.

## Actions

**Bite.** Melee Attack Roll: +5, reach 5 ft. Hit: 7 (1d8 + 3) Piercing damage plus 3 (1d6) Fire damage.
`;

/* ================================================================== 5etools JSON → Workshop homebrew
   Turns community 5e JSON (the 5etools format) into the same shapes the Workshop forms write, so an imported
   spell, creature or class can be edited, exported and shared like anything forged by hand. */
const SIZE5 = {T:'Tiny', S:'Small', M:'Medium', L:'Large', H:'Huge', G:'Gargantuan', V:'Small or Medium'};
const AB5 = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABN5 = {str:'Strength', dex:'Dexterity', con:'Constitution', int:'Intelligence', wis:'Wisdom', cha:'Charisma'};
const ITEM5 = {W:'Weapon', M:'Weapon', R:'Weapon', A:'Weapon', AF:'Weapon', LA:'Armor', MA:'Armor', HA:'Armor', S:'Armor', RG:'Ring', RD:'Rod', ST:'Staff', WD:'Wand', P:'Potion', SC:'Scroll'};
const ALIGN5 = {L:'lawful', N:'neutral', NX:'neutral', NY:'neutral', C:'chaotic', G:'good', E:'evil', U:'unaligned', A:'any alignment'};
const tc5 = s => String(s).replace(/(^|[\s(/-])([a-z])/g, (m, a, b) => a + b.toUpperCase());   // title case that leaves "Calligrapher's" alone
const FEAT5 = {O:'Origin', G:'General', FS:'Fighting Style', EB:'Epic Boon'};
const ATK5 = {mw:'Melee Weapon', rw:'Ranged Weapon', ms:'Melee Spell', rs:'Ranged Spell', m:'Melee', r:'Ranged'};
/** {@tag text|source|display} → the plain text the Workshop stores; dice stay as "2d6 + 3" so the tome still rolls them. */
let LINKS5 = false;   // on while text is written for display (class and subclass features): {@spell …}, {@item …}… then stay as "[label](xref:name)" links
const LINK5 = new Set(['spell', 'item', 'skill', 'creature', 'feat', 'race', 'background', 'class', 'action', 'variantrule', 'sense', 'optfeature', 'deity']);
const linked5 = fn => (...a) => { const o = LINKS5; LINKS5 = true; try { return fn(...a); } finally { LINKS5 = o; } };
function plain5(s){
  s = typeof s === 'number' ? String(s) : typeof s === 'string' ? s : '';
  let prev;
  do {
    prev = s;
    s = s.replace(/\{@(\w+)\s*([^{}]*?)\}/g, (m, t, body) => {
      const p = body.split('|'), txt = p[0].trim();
      switch (t){
        case 'b': case 'bold': return `**${txt}**`;
        case 'i': case 'italic': return `*${txt}*`;
        case 'hit': case 'd20': { const n = parseInt(txt, 10) || 0; return n < 0 ? String(n) : '+' + n; }
        case 'dc': return 'DC ' + txt;
        case 'chance': return (p[1] || txt + '%');
        case 'recharge': return `(Recharge ${txt ? txt + '–6' : '6'})`;
        case 'atk': return txt.split(',').map(a => ATK5[a.trim()] || a).join(' or ') + ' Attack:';
        case 'atkr': return txt.split(',').map(a => ATK5[a.trim()] || a).join(' or ') + ' Attack Roll:';
        case 'h': return 'Hit: ';
        case 'm': return 'Miss: ';
        case 'hom': return 'Hit or Miss: ';
        case 'actSave': return `${ABN5[txt] || tc5(txt)} Saving Throw:`;
        case 'actSaveFail': return 'Failure:';
        case 'actSaveSuccess': return 'Success:';
        case 'actSaveSuccessOrFail': return 'Failure or Success:';
        case 'actTrigger': return 'Trigger:';
        case 'actResponse': return 'Response:';
        case 'spell': case 'item': case 'skill': case 'creature': case 'feat': case 'race': case 'background': case 'class': case 'action': case 'variantrule': case 'sense': case 'optfeature': case 'deity': {
          const lab = (p[2] || txt).trim().replace(/[\[\]()|]/g, ''), nm = txt.replace(/[\[\]()|:]/g, '');
          const pre = {race:'species', variantrule:'rule', optfeature:'feature'}[t] || t;
          return LINKS5 && nm && lab ? `[[${pre}:${nm}${lab.toLowerCase() === nm.toLowerCase() ? '' : '|' + lab}]]` : lab; }
        case 'dice': case 'damage': case 'autodice': return txt;
        case 'scaledice': case 'scaledamage': return p[2] || txt;
        case 'note': case 'filter': case 'link': case '5etools': case 'book': case 'adventure': case 'footnote': case 'area': case 'loader': case 'homebrew': case 'color': case 'highlight': case 'help': case 'style': case 'code': case 'sup': case 'sub': case 'strike': case 'kbd': case 'font': return txt;
        default: return (p[2] || txt).trim();
      }
    });
  } while (s !== prev);
  return s.replace(/[ \t]+/g, ' ').trim();
}
/** 5etools "entries" → Workshop text: one paragraph per line, "**Name.** text" run-ins, "- " lists and "a | b" tables, as md() reads them. */
function lines5(e, out = []){
  if (e == null) return out;
  if (typeof e === 'string' || typeof e === 'number'){ const t = plain5(e); if (t) out.push(t); return out; }
  if (Array.isArray(e)){ e.forEach(x => lines5(x, out)); return out; }
  if (!isObj(e)) return out;
  const nm = e.name ? `**${plain5(e.name).replace(/[.:]\s*$/, '')}.** ` : '';
  switch (e.type){
    case 'list': (e.items || []).forEach(it => { const t = flat5(it); if (t) out.push('- ' + t); }); return out;
    case 'table': {
      const cell = c => isObj(c) ? (c.roll ? String(c.roll.exact ?? `${c.roll.min}–${c.roll.max}`) : flat5(c.entry ?? c.entries ?? '')) : plain5(c);
      const rows = (e.rows || []).map(r => (Array.isArray(r) ? r : r?.row || []).map(cell));
      if (e.caption) out.push(`**${plain5(e.caption)}**`);
      if (e.colLabels) rows.unshift(e.colLabels.map(plain5));
      rows.forEach(r => out.push(r.length > 1 ? r.map(c => c || '—').join(' | ') : '- ' + (r[0] || '')));
      out.push('');
      return out;
    }
    case 'item': { const t = flat5(e.entry ?? e.entries); if (nm || t) out.push(nm + t); return out; }
    case 'abilityDc': out.push(`**${plain5(e.name)} save DC** = 8 + your Proficiency Bonus + your ${(e.attributes || []).map(a => ABN5[a] || a).join(' or ')} modifier`); return out;
    case 'abilityAttackMod': out.push(`**${plain5(e.name)} attack modifier** = your Proficiency Bonus + your ${(e.attributes || []).map(a => ABN5[a] || a).join(' or ')} modifier`); return out;
    case 'spellcasting': out.push(nm + flat5(spellList5(e))); return out;
    case 'refOptionalfeature': { const nm2 = String(e.optionalfeature || '').split('|')[0]; if (nm2) out.push('- ' + tc5(nm2)); return out; }
    case 'image': case 'gallery': case 'hr': case 'statblock': case 'refClassFeature': case 'refSubclassFeature': return out;
  }
  const sub = lines5(e.entries ?? e.entry ?? [], []);
  if (nm){ if (sub.length && !/^(- |\*\*)| \| /.test(sub[0])) sub[0] = nm + sub[0]; else sub.unshift(nm.trim()); }
  out.push(...sub);
  return out;
}
const text5 = e => lines5(e).join('\n').replace(/\n{3,}/g, '\n\n').trim();
const textL5 = linked5(text5);
/** The same text on one line, for the one-per-line lists of the forms (features, traits, actions). */
const flat5 = e => lines5(e).filter(Boolean).map(l => l.replace(/^- /, '• ').split(' | ').join(' – ')).join(' ').slice(0, LINKS5 ? 8000 : 4000);
const flatL5 = linked5(flat5);
function spellList5(s){
  const out = [].concat(s.headerEntries || []);
  if (s.will) out.push('At will: ' + s.will.join(', '));
  for (const [k, v] of Object.entries(s.daily || {})) out.push(`${k.replace(/e$/, '')}/day${k.endsWith('e') ? ' each' : ''}: ${[].concat(v).join(', ')}`);
  for (const [lv, v] of Object.entries(s.spells || {})) out.push(`${lv === '0' ? 'Cantrips' : 'Level ' + lv}${v.slots ? ` (${v.slots} slots)` : ''}: ${(v.spells || []).join(', ')}`);
  return out.concat(s.footerEntries || []);
}
const names5 = (x, key) => [].concat(x ?? []).map(v => typeof v === 'string' ? tc5(plain5(v)) : isObj(v) ? (v.special ? plain5(v.special) : `${v.preNote ? plain5(v.preNote) + ' ' : ''}${names5(v[key], key)}${v.note ? ' ' + plain5(v.note) : ''}`.trim()) : '').filter(Boolean).join(', ');
const bonus5 = x => isObj(x) ? Object.entries(x).filter(([k]) => typeof x[k] === 'string').map(([k, v]) => `${tc5(k)} ${v}`).join(', ') : '';
const crNum5 = c => { const v = String(isObj(c) ? c.cr : c ?? ''); if (/^1\/(2|4|8)$/.test(v)) return 1 / +v.slice(2); return v === '' || isNaN(+v) ? v : +v; };
function time5(t){
  return [].concat(t || []).map(x => { if (!isObj(x)) return plain5(x);
    const n = x.number || 1, u = x.unit || '';
    const base = u === 'action' ? 'Action' : u === 'bonus' ? 'Bonus Action' : u === 'reaction' ? 'Reaction' : `${n} ${u}${n > 1 ? 's' : ''}`;
    return base + (x.condition ? ', ' + plain5(x.condition) : ''); }).join(' or ');
}
function range5(r){
  if (!isObj(r)) return '';
  const d = r.distance || {}, amt = d.amount;
  if (r.type === 'point') return d.type === 'self' ? 'Self' : d.type === 'touch' ? 'Touch' : d.type === 'sight' ? 'Sight' : d.type === 'unlimited' ? 'Unlimited' : `${amt ?? ''} ${d.type === 'feet' ? 'feet' : d.type === 'miles' ? (amt === 1 ? 'mile' : 'miles') : d.type || ''}`.trim();
  if (r.type === 'special') return 'Special';
  return `Self (${amt ?? ''}-${d.type === 'miles' ? 'mile' : 'foot'} ${r.type})`;
}
function comp5(c){
  if (!isObj(c)) return '';
  const m = c.m ? 'M' + (typeof c.m === 'string' ? ` (${plain5(c.m)})` : c.m.text ? ` (${plain5(c.m.text)})` : '') : '';
  return [c.v && 'V', c.s && 'S', m].filter(Boolean).join(', ');
}
function dur5(d){
  return [].concat(d || []).map(x => { if (!isObj(x)) return '';
    if (x.type === 'instant') return 'Instantaneous';
    if (x.type === 'timed'){ const a = x.duration?.amount ?? 1, u = x.duration?.type || ''; return `${x.concentration ? 'up to ' : ''}${a} ${u}${a > 1 ? 's' : ''}`; }
    if (x.type === 'permanent') return (x.ends || []).includes('dispel') ? 'Until dispelled' : 'Permanent';
    return tc5(x.type || 'special'); }).filter(Boolean).join(' or ');
}
function pre5(list){
  return [].concat(list || []).filter(isObj).map(p => {
    const parts = [];
    if (p.level) parts.push(`Level ${isObj(p.level) ? p.level.level : p.level}+${isObj(p.level) && p.level.class ? ' ' + p.level.class.name : ''}`);
    if (p.ability) parts.push(p.ability.filter(isObj).map(a => Object.entries(a).map(([k, v]) => `${ABN5[k] || k} ${v}+`).join(' and ')).join(' or '));
    if (p.race) parts.push(p.race.map(r => tc5(r.name || '')).join(' or '));
    if (p.feat) parts.push(p.feat.map(f => tc5(String(f).split('|')[0])).join(', '));
    if (p.spellcasting || p.spellcasting2020 || p.spellcastingFeature) parts.push('Spellcasting or Pact Magic feature');
    if (p.proficiency) parts.push(p.proficiency.map(x => Object.entries(x).map(([k, v]) => `${tc5(v)} ${k === 'armor' ? 'Armor Training' : k === 'weapon' ? 'weapon proficiency' : k}`).join(', ')).join(' or '));
    if (p.other) parts.push(plain5(p.other));
    if (p.otherSummary) parts.push(plain5(p.otherSummary.entry || ''));
    return parts.filter(Boolean).join(', ');
  }).filter(Boolean).join('; or ');
}
const flags5 = x => [].concat(x || []).flatMap(o => isObj(o) ? Object.keys(o).filter(k => o[k] === true) : []);
const acts5 = arr => [].concat(arr || []).filter(isObj).map(a => ({n:plain5(a.name || ''), x:flatL5(a.entries ?? a.entry ?? '')})).filter(a => a.n || a.x);
// one converter per 5etools list; each returns the object a Workshop form would save
/* ---- spells: the structured "What it does" picker, read from 5etools' own tags (deterministic, no guessing beyond them) ---- */
function fx5(o, pw){
  const blob = JSON.stringify(o.entries || []), hi = JSON.stringify(o.entriesHigherLevel || []), f = {};
  const dm = blob.match(/\{@damage ([^}|]+)\}/), dd = dm ? dm[1].replace(/\s+/g, '') : '';
  const sv = [].concat(o.savingThrow || [])[0], dts = [].concat(o.damageInflict || []).map(t => hbPick(DMG_TYPES, t)).filter(Boolean);
  if ([].concat(o.spellAttack || []).length) f.mode = 'attack'; else if (sv && /^\d+d\d+$/i.test(dd)){ f.mode = 'save'; f.ab = String(sv).slice(0, 3).toLowerCase(); }
  if (/^\d+d\d+$/i.test(dd) && dts.length){ f.dd = dd; f.dt = dts[0]; if (dts.length > 1) pw.push(`Several damage types (${dts.join(', ')}): the effect picker holds ${dts[0]}, the text keeps them all.`); }
  else if (dm && dd) pw.push(`Damage “${dm[1]}” is not plain dice, so it stays in the text only.`);
  if (f.mode === 'save' && f.dd && /half as much damage|half damage/i.test(blob)) f.half = true;
  const sh = blob.match(/(\d+)-foot(?:-radius)?[- ]?(?:\{@variantrule )?(Cone|Cube|Cylinder|Emanation|Line|Sphere)/i); if (sh){ f.shape = tc5(sh[2].toLowerCase()); f.size = +sh[1]; }
  const hl = blob.match(/regains? (?:a number of )?\{@variantrule Hit Points[^}]*\} equal to \{@(?:dice|damage) (\d+d\d+)\}/i); if (hl){ f.heal = hl[1]; if (/plus your spellcasting ability modifier/i.test(blob)) f.hm = true; }
  const up = hi.match(/\{@scale(?:damage|dice) [^|}]*\|[^|}]*\|(\d+d\d+)\}/i); if (up && (f.dd || f.heal) && !(+o.level === 0)) f.up = up[1];
  if (+o.level === 0 && o.scalingLevelDice && f.dd) f.cant = true;
  return Object.keys(f).length ? f : null;
}
/* ---- weapons and base items: 5etools codes → the Weapon form's pickers ---- */
const DMG5 = {P:'Piercing', S:'Slashing', B:'Bludgeoning', N:'Necrotic', R:'Radiant', F:'Fire', C:'Cold', A:'Acid', L:'Lightning', T:'Thunder', O:'Force', Y:'Psychic', I:'Poison'};
const PROP5 = {A:'Ammunition', F:'Finesse', H:'Heavy', L:'Light', LD:'Loading', R:'Reach', T:'Thrown', '2H':'Two-Handed', V:'Versatile'};
const PROPX5 = {S:'Special', RLD:'Reload', BF:'Burst fire', AF:'Ammunition (firearm)', OTH:'Other'};
const ONE5 = new Set(['XPHB', 'XDMG', 'XMM', 'EFA']);   // 2024-rules books (their entries carry no edition field)
let BASE5 = new Map();   // base items by "name|source", so a magic weapon can borrow its dice from "Longsword|XPHB"
const base5 = ref => { if (!ref) return null; const [n, src = 'PHB'] = String(ref).split('|'); return BASE5.get(norm(n) + '|' + src.toLowerCase()) || BASE5.get(norm(n)) || null; };
const setBase5 = list => { BASE5 = new Map(); (Array.isArray(list) ? list : []).filter(b => isObj(b) && b.name).forEach(b => { const k = norm(b.name); BASE5.set(k + '|' + String(b.source || 'PHB').toLowerCase(), b); if (!BASE5.has(k) || b.edition === 'one') BASE5.set(k, b); }); };
const money5 = v => { v = +v; return !(v > 0) ? '' : v >= 100 ? `${+(v / 100).toFixed(2)} gp` : v >= 10 ? `${+(v / 10).toFixed(1)} sp` : `${v} cp`; };
// fields that change how an item plays but the Workshop has no place for: said out loud in the preview instead of lost silently
const NOMAP5 = {charges:'charges', recharge:'recharge', attachedSpells:'spells it casts', bonusWeaponDamage:'separate damage bonus', bonusWeaponAttack:'separate attack bonus', bonusSavingThrow:'saving throw bonus', bonusSpellAttack:'spell attack bonus', bonusSpellSaveDc:'spell save DC bonus',
  critThreshold:'critical range', grantsProficiency:'granted proficiency', resist:'damage resistance', immune:'damage immunity', ability:'ability score change', speed:'speed change', modifySpeed:'speed change', curse:'curse', sentient:'sentient item', ammoType:'ammunition type', strength:'strength requirement', stealth:'stealth penalty', containerCapacity:'container capacity'};
function unmapped5(o, pw){
  const hit = Object.keys(NOMAP5).filter(k => o[k] != null && o[k] !== false && !(k === 'strength' && !o[k]) && !(k === 'stealth' && !o[k]) && !(k === 'ammoType'));
  if (hit.length) pw.push(`Not carried over (the text keeps it): ${[...new Set(hit.map(k => NOMAP5[k]))].join(', ')}.`);
}
function weapon5(w, bi, pw){
  const cat = String(w.weaponCategory || '').toLowerCase(), melee = String(w.type).split('|')[0] === 'M';
  if (!/^(simple|martial)$/.test(cat)) pw.push('The file gives no Simple or Martial type, so Martial is assumed.');
  const codes = [].concat(w.property || []).map(p => String(p).split('|')[0]), props = [...new Set(codes.map(c => PROP5[c]).filter(Boolean))], odd = codes.filter(c => !PROP5[c]);
  if (odd.length) pw.push(`Properties with no tick box were left out: ${odd.map(c => PROPX5[c] || c).join(', ')}.`);
  const mn = String([].concat(w.mastery || [])[0] || '').split('|')[0], mast = hbPick(WEAPON_MASTERY, mn) || '';
  if (mn && !mast) pw.push(`Mastery “${mn}” is not one of the 2024 ones, so it was left empty.`);
  if (!mn && w.edition !== 'one' && !bi) pw.push('No weapon mastery in the file (older edition entries have none).');
  const rg = String(w.range || '').match(/^(\d+)\s*\/\s*(\d+)$/), vers = codes.includes('V');
  if (w.dmg2 && !vers) pw.push(`Second damage “${w.dmg2}” has no Versatile property, so it was left out.`);
  if (!/^\d+d\d+$/i.test(String(w.dmg1).replace(/\s+/g, ''))) pw.push(`Damage “${w.dmg1}” is a flat number: the form only holds dice like 1d6, so it needs fixing in the file.`);
  const mb = parseInt(w.bonusWeapon, 10) || 0, rar = String(w.rarity || 'none');
  const out = {n:w.name, wc:`${cat === 'simple' ? 'Simple' : 'Martial'} ${melee ? 'Melee' : 'Ranged'}`, dd:String(w.dmg1).replace(/\s+/g, ''), dt:DMG5[w.dmgType], props, vd:vers && w.dmg2 ? String(w.dmg2) : '', mast,
    rn:rg ? +rg[1] : '', rl:rg ? +rg[2] : '', mb, rar:rar === 'none' || rar === 'None' ? (mb ? 'Uncommon' : 'Mundane') : tc5(rar), att:!!w.reqAttune, wt:+w.weight || '', val:money5(w.value),
    sp:'', x:(typeof w.reqAttune === 'string' ? `*Requires attunement ${plain5(w.reqAttune)}.*\n` : '') + textL5(w.entries)};
  if (!out.x) out.x = `${out.wc} weapon: ${out.dd} ${out.dt}${props.length ? '. Properties: ' + props.join(', ') : ''}${rg ? ` (range ${rg[1]}/${rg[2]})` : ''}${mast ? '. Mastery: ' + mast : ''}.`;
  if (!HB_RARITY_LIST.includes(out.rar) && out.rar !== 'Mundane'){ pw.push(`Rarity “${out.rar}” is not a known one, so ${mb ? ['Uncommon', 'Rare', 'Very Rare'][mb - 1] : 'Rare'} was picked: change it if the book says otherwise.`); out.rar = mb ? ['Uncommon', 'Rare', 'Very Rare'][mb - 1] : 'Rare'; }
  if (rar === 'none' && mb) pw.push('The file has no rarity for this magic weapon, so Uncommon was picked: change it if the book says otherwise.');
  unmapped5(w, pw);
  const r = {_cat:'weapons', ...out}; if (pw.length) r._pw = pw; return r;
}
/* ---- classes and subclasses: what 5etools says in structure, and what the feature text says in plain words (no guessing: only phrases the rules always use) ---- */
const src5 = x => x || 'PHB';
/** "Font of Magic|Sorcerer|XPHB|2" (class) or "Wind Speaker|Sorcerer||Storm|XGE|1" (subclass), each with an optional "|source" at the end → its parts. */
function ref5(r, sub){
  const str = isObj(r) ? String(r.classFeature || r.subclassFeature || '') : String(r), p = str.split('|');
  return {n:p[0], cs:p[2] || '', l:parseInt(p[sub ? 5 : 3], 10) || 0, gain:isObj(r) && !!r.gainSubclassFeature};
}
/** A feature written as "_copy" (same text, other class or level) gets the text of the one it copies. */
function copy5(f, all){
  if (!isObj(f._copy) || f.entries) return f;
  const c = f._copy, b = all.find(x => isObj(x) && x !== f && x.name === c.name && x.className === (c.className || f.className) && src5(x.classSource) === src5(c.classSource ?? f.classSource) && (c.level == null || +x.level === +c.level) && (x.subclassShortName || '') === (c.subclassShortName || f.subclassShortName || ''));
  return b ? {...b, ...f, entries:b.entries} : f;
}
const DMGT5 = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];
const dmgList5 = s => DMGT5.filter(d => new RegExp('\\b' + d + '\\b', 'i').test(s)).map(tc5);
const ABKEY5 = {strength:'str', dexterity:'dex', constitution:'con', intelligence:'int', wisdom:'wis', charisma:'cha'};
/** What a feature gives, read from its text: activation, resistances, immunities, speeds, languages, feats, proficiencies, spells, uses and the save it forces. */
function grantsOf5(name, entries, spells, noTextSpells){
  const raw = JSON.stringify(entries ?? ''), t = plain5(text5(entries)).replace(/\*\*/g, ''), g = {};
  const uniq = a => [...new Set(a)].filter(Boolean);
  const hits = []; const at = (re, v) => { const m = re.exec(t); if (m) hits.push([m.index, v]); };
  at(/\b(?:as|use|using) (?:a|your) reaction\b/i, 'reaction'); at(/\buse (?:a|your) bonus action\b|\bas a bonus action\b|\bbonus action to\b/i, 'bonus'); at(/\buse (?:an|your) action\b|\bas an action\b|\bMagic action\b|\bTake the Magic action\b/i, 'action');
  const act = uniq(hits.sort((a, b) => a[0] - b[0]).map(h => h[1])); if (act.length) g.act = act;
  const res = uniq([...t.matchAll(/(?<!ignore |ignores )resistance to ([^.;]*?) damage/gi)].flatMap(m => dmgList5(m[1]))); if (res.length) g.res = res;
  const imm = uniq([...t.matchAll(/immunity to ([^.;]*?) damage/gi)].flatMap(m => dmgList5(m[1]))); if (imm.length) g.imm = imm;
  const cimm = uniq([...raw.matchAll(/immun(?:e|ity) to (?:the )?\{@condition ([^|}]+)/gi)].map(m => tc5(m[1]))); if (cimm.length) g.cimm = cimm;
  const spd = {}; for (const m of t.matchAll(/(flying|swimming|climbing|burrowing|walking) speed (?:of|equal to|increases by) (\d+) feet/gi)) { const k = {flying:'fly', swimming:'swim', climbing:'climb', burrowing:'burrow', walking:'walk'}[m[1].toLowerCase()]; if (!(k in spd)) spd[k] = +m[2]; }
  if (Object.keys(spd).length) g.spd = spd;
  if (/\b(speak|read|write|understand|learn)\b/i.test(t)){ const lg = uniq([...raw.matchAll(/\{@language ([^|}]+)/g)].map(m => m[1].trim())); if (lg.length) g.lang = lg; }
  const feat = uniq([...raw.matchAll(/gain (?:the |an? )?\{@feat ([^|}]+)/gi)].map(m => m[1].trim())); if (/^ability score improvement$/i.test(name) || feat.some(f => /^ability score improvement$/i.test(f))) g.asi = true;
  const fs2 = feat.filter(f => !/^ability score improvement$/i.test(f)); if (fs2.length) g.feat = fs2;
  const pr = uniq([...[...raw.matchAll(/proficiency in (?:the )?\{@skill ([^|}]+)/gi)].map(m => tc5(m[1])), ...[...t.matchAll(/(?:proficiency|training) with ((?:light|medium|heavy|simple|martial)[a-z ,]*?(?:armor|weapons|shields?))/gi)].map(m => tc5(m[1]))]);
  if (pr.length) g.prof = pr;
  const sp = uniq([...(spells || []), ...(!noTextSpells && /always have|always prepared|you (?:can )?cast (?:it|the spell|each of|these)|without expending a spell slot|you know (?:the|these)|you learn (?:the|these)/i.test(t) ? [...raw.matchAll(/\{@spell ([^|}]+)/g)].map(m => tc5(m[1].trim())) : [])]); if (sp.length) g.sp = sp;
  const rests = t.split(/(?<=[.!?])\s+/).map(se => { const m = se.match(/finish (?:a|an) (short|long)(?: or (short|long))? rest/i); return m && /(?:can't|cannot|regain|expended|once\b|until)/i.test(se) ? {v:m[2] ? 'short or long' : m[1].toLowerCase(), hard:/(?:can't|cannot|until)/i.test(se)} : null; }).filter(Boolean);
  const rest = rests.find(r => r.hard) || rests[0]; if (rest) g.rest = rest.v;
  const nt = t.match(/a number of times equal to your (proficiency bonus|(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) modifier)/i);
  if (nt) g.n = /proficiency/i.test(nt[1]) ? 'PB' : ABKEY5[nt[1].split(' ')[0].toLowerCase()].toUpperCase();
  else if (/\btwice\b/i.test(t) && g.rest) g.n = 2; else if (g.rest && /\b(?:once|one use|you can't do so again|can't use (?:this|it) again)/i.test(t)) g.n = 1;
  const sv = t.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/i);
  if (sv && /(?:must|makes?|attempts?|against)/i.test(t)){ g.sv = {ab:ABKEY5[sv[1].toLowerCase()]}; if (/spell save DC/i.test(t)) g.sv.dc = 'spell'; else { const dc = raw.match(/\{@dc (\d+)\}/); if (dc) g.sv.dc = +dc[1]; } }
  const dice = uniq([...raw.matchAll(/\{@(?:damage|dice) (\d+d\d+)/g)].map(m => m[1])); if (dice.length) g.dice = dice;
  return Object.keys(g).length ? {g} : {};
}
/** 5etools "additionalSpells" (spells a subclass always has) → {level: [names]} */
function addSpells5(a){
  const out = {};
  for (const blk of [].concat(a || [])){
    if (!isObj(blk)) continue;
    for (const kind of ['prepared', 'known', 'innate', 'expanded']){
      const src = blk[kind]; if (!isObj(src)) continue;
      const walk = (v, l) => { if (Array.isArray(v)) v.forEach(x => typeof x === 'string' ? (out[l] = out[l] || []).push(tc5(x.split('|')[0])) : isObj(x) && x.choose ? null : walk(x, l)); else if (isObj(v)) Object.entries(v).forEach(([k, x]) => /^\d+$/.test(k) && !(l && l > 0 && kind === 'innate') ? walk(x, +k) : walk(x, l)); };
      for (const [k, v] of Object.entries(src)) if (/^\d+$/.test(k)) walk(v, +k);
    }
  }
  for (const k of Object.keys(out)) out[k] = [...new Set(out[k])];
  return out;
}
/** The level table of a class: one column per 5etools column, 20 rows. */
function table5(groups){
  if (!Array.isArray(groups)) return null;
  const cols = [], rows = Array.from({length:20}, () => []);
  const ord = i => ['1st', '2nd', '3rd'][i] || (i + 1) + 'th';
  for (const gp of groups){
    if (!isObj(gp)) continue;
    const labels = (gp.colLabels || []).map(plain5), data = gp.rowsSpellProgression || gp.rows || [];
    if (!labels.length || !Array.isArray(data) || data.length > 20) continue;
    labels.forEach((lb, i) => { if (gp.rowsSpellProgression){ const sl = data.some(r => r[i]); if (!sl) return; }
      cols.push({n:gp.rowsSpellProgression ? ord(i) : lb, g:gp.rowsSpellProgression ? 'Spell slots' : (gp.title ? plain5(gp.title) : '')});
      const j = cols.length - 1; data.forEach((r, ri) => { const c = r[i]; rows[ri][j] = isObj(c) ? (c.type === 'bonus' ? '+' + c.value : c.type === 'dice' ? (c.toRoll || []).map(d => d.number + 'd' + d.faces).join('+') : String(c.value ?? '')) : (c === 0 && !gp.rowsSpellProgression && lb !== 'Sorcery Points' ? '—' : c === 0 ? '—' : String(c ?? '')); }); });
  }
  return cols.length && cols.length <= 16 ? {cols, rows} : null;
}
/** Feats and options a class hands out at set levels (Epic Boon, Metamagic…). */
function adv5(o){
  const out = {};
  const feats = [].concat(o.featProgression || []).filter(isObj).map(f => ({n:plain5(f.name || ''), by:f.progression || {}})).filter(f => f.n && Object.keys(f.by).length); if (feats.length) out.feat = feats;
  const opt = [].concat(o.optionalfeatureProgression || []).filter(isObj).map(f => ({n:plain5(f.name || ''), by:isObj(f.progression) ? f.progression : Array.isArray(f.progression) ? Object.fromEntries(f.progression.map((v, i) => [i + 1, v]).filter(([, v]) => v)) : {}})).filter(f => f.n && Object.keys(f.by).length); if (opt.length) out.opt = opt;
  return Object.keys(out).length ? out : null;
}
const FROM5 = {
  spell:{cat:'spells', to:o => { const pw = [], sp = {n:o.name, lv:clamp(+o.level || 0, 0, 9), sc:SCHOOL[o.school] || tc5(o.school || 'Evocation'), t:time5(o.time), r:range5(o.range), c:comp5(o.components), d:dur5(o.duration),
    conc:[].concat(o.duration || []).some(d => d?.concentration), rit:!!o.meta?.ritual, cls:[...new Set([...(o.classes?.fromClassList || []), ...(o.classes?.fromClassListVariant || [])].map(c => c.name))],
    x:textL5(o.entries), h:flatL5([].concat(o.entriesHigherLevel || []).map(e => isObj(e) ? e.entries : e))};
    const fx = fx5(o, pw); if (fx) sp.fx = fx; if (pw.length) sp._pw = pw; return sp; }},
  feat:{cat:'feats', to:o => ({n:o.name, ty:FEAT5[String(o.category || 'G').split(':')[0]] || 'General', pre:pre5(o.prerequisite), rep:!!o.repeatable, x:textL5(o.entries)})},
  race:{cat:'species', to:o => {
    const sz = [].concat(o.size || ['M']).map(s => SIZE5[s] || s), named = [].concat(o.entries || []).filter(e => isObj(e) && e.name);
    return {n:o.name, ty:tc5([].concat(o.creatureTypes || ['humanoid']).join(' or ')), size:sz.join(' or '), speed:+(isObj(o.speed) ? o.speed.walk : o.speed) || 30,
      x:textL5([].concat(o.entries || []).filter(e => !(isObj(e) && e.name))), tr:named.map(e => ({n:plain5(e.name), x:flatL5(e.entries ?? e.entry)}))};
  }},
  background:{cat:'backgrounds', to:o => {
    const a = [].concat(o.ability || [])[0] || {}, from = a.choose?.weighted?.from || a.choose?.from || Object.keys(a).filter(k => ABN5[k]);
    const hang = [].concat(o.entries || []).find(e => isObj(e) && e.type === 'list' && /hang/.test(e.style || ''));
    const eq = hang?.items?.find(i => /^equipment/i.test(i.name || ''));
    const feat = flags5(o.feats)[0] || Object.keys([].concat(o.feats || [])[0] || {})[0] || '';
    return {n:o.name, asi:from.map(k => k.toUpperCase()), feat:tc5(feat.split('|')[0].replace(/;\s*(.+)$/, ' ($1)')), skills:flags5(o.skillProficiencies).map(tc5),
      tools:flags5(o.toolProficiencies).map(tc5), eq:eq ? flat5(eq.entry ?? eq.entries) : '', x:textL5([].concat(o.entries || []).filter(e => e !== hang))};
  }},
  item:{cat:'items', to:o => {
    o = o.inherits ? {...o.inherits, ...o, name:o.name} : o;
    const pw = [], bi = base5(o.baseItem), w = bi && !o.dmg1 ? {...bi, ...o} : o;   // a magic weapon lists only what it changes from its base weapon
    const wty = String(w.type || '').split('|')[0];
    if (w.dmg1 && DMG5[w.dmgType] && (wty === 'M' || wty === 'R')) return weapon5(w, bi, pw);
    const ty = String(o.type || '').split('|')[0], rar = tc5(o.rarity || 'common'), out = {n:o.name, cat:o.wondrous ? 'Wondrous Item' : ITEM5[ty] || (o.weapon || o.weaponCategory ? 'Weapon' : o.armor ? 'Armor' : 'Wondrous Item'), rar:rar === 'None' ? 'Common' : rar,
      att:!!o.reqAttune, x:(typeof o.reqAttune === 'string' ? `*Requires attunement ${plain5(o.reqAttune)}.*\n` : '') + textL5(o.entries)};
    const bn = String(o.baseItem || '').split('|')[0];
    if (bn) out.base = bn;
    const bac = parseInt(o.bonusAc, 10), bw = parseInt(o.bonusWeapon, 10); if (bac) out.acm = bac; if (bw) out.wb = bw;
    if (o.baseItem && !bi && (out.cat === 'Weapon')) pw.push(`Base weapon “${bn}” was not in the file, so its damage dice are not filled in. Import the base items file too (Weapons and armor) and run this again.`);
    unmapped5(o, pw);
    if (pw.length) out._pw = pw;
    return out;
  }},
  monster:{cat:'monsters', to:o => {
    const ty = isObj(o.type) ? `${isObj(o.type.type) ? (o.type.type.choose || []).join(' or ') : o.type.type || ''}${o.type.tags ? ` (${o.type.tags.map(t => isObj(t) ? t.tag : t).join(', ')})` : ''}` : o.type || '';
    const al = [].concat(o.alignment || []).every(a => typeof a === 'string') ? [].concat(o.alignment || []).map(a => ALIGN5[a] || a).join(' ') : 'any alignment';
    const ac = [].concat(o.ac || []).map(a => isObj(a) ? (a.special ? plain5(a.special) : `${a.ac}${a.from ? ` (${a.from.map(plain5).join(', ')})` : ''}${a.condition ? ' ' + plain5(a.condition) : ''}`) : a).join(', ');
    const hp = isObj(o.hp) ? (o.hp.special ? plain5(o.hp.special) : `${o.hp.average ?? ''}${o.hp.formula ? ` (${o.hp.formula})` : ''}`) : String(o.hp ?? '');
    const sp = isObj(o.speed) ? Object.entries(o.speed).filter(([k, v]) => k !== 'canHover' && k !== 'choose' && k !== 'alternate' && v != null && v !== true).map(([k, v]) => `${k === 'walk' ? '' : k + ' '}${isObj(v) ? `${v.number} ft. ${plain5(v.condition || '')}`.trim() : v + ' ft.'}${k === 'fly' && o.speed.canHover ? ' (hover)' : ''}`).join(', ') : String(o.speed ?? '30') + ' ft.';
    const casts = [].concat(o.spellcasting || []).filter(isObj).map(s => ({n:plain5(s.name || 'Spellcasting'), x:flatL5(spellList5(s)), as:s.displayAs || 'trait'}));
    return {n:o.name, sz:[].concat(o.size || ['M']).map(s => SIZE5[s] || s).join(' or '), ty, al, ac:ac || '10', hp:hp || '10', spd:sp, ab:AB5.map(a => clamp(+o[a] || 10, 1, 30)), cr:crNum5(o.cr),
      sv:bonus5(o.save), sk:bonus5(o.skill), vul:names5(o.vulnerable, 'vulnerable'), res:names5(o.resist, 'resist'),
      imm:[names5(o.immune, 'immune'), names5(o.conditionImmune, 'conditionImmune')].filter(Boolean).join('; '),
      sen:[...[].concat(o.senses || []).map(plain5), o.passive != null ? `passive Perception ${o.passive}` : ''].filter(Boolean).join(', '), lang:[].concat(o.languages || []).map(plain5).join(', ') || '—',
      tr:[...acts5(o.trait), ...casts.filter(c => c.as === 'trait')], act:[...acts5(o.action), ...casts.filter(c => c.as === 'action')], bon:[...acts5(o.bonus), ...casts.filter(c => c.as === 'bonus')],
      re:acts5(o.reaction), leg:acts5(o.legendary)};
  }},
  class:{cat:'classes', to:(o, json) => {
    const sp = o.startingProficiencies || {}, prof = x => [].concat(x || []).map(v => isObj(v) ? plain5(v.full || v.proficiency || '') : plain5(v)).filter(Boolean);
    const gear = p => [...prof(p.armor).map(a => /armor|shield/i.test(a) ? tc5(a) : tc5(a) + ' armor'), ...prof(p.weapons).map(w => /weapon/i.test(w) ? tc5(w) : tc5(w) + ' weapons'), ...prof(p.tools).map(tc5)];
    const sk = [].concat(sp.skills || []).map(s => s.choose ? `Choose ${s.choose.count || 1}: ${(s.choose.from || []).map(tc5).join(', ')}` : isObj(s) && s.any ? `Choose any ${s.any}` : '').filter(Boolean);
    const all = json?.classFeature || [], mine = f => isObj(f) && f.className === o.name && src5(f.classSource) === src5(o.source);
    let feats;
    if (Array.isArray(o.classFeatures) && o.classFeatures.length){   // the class lists its own features, with the exact level of each: no duplicates from other editions
      feats = o.classFeatures.map(r => { const k = ref5(r), f = all.find(x => mine(x) && x.name === k.n && +x.level === k.l); return f ? {...copy5(f, all), _gs:k.gain} : null; }).filter(Boolean);
    } else feats = all.filter(f => isObj(f) && f.className === o.name && (!f.classSource || !o.source || f.classSource === o.source));
    const mc = o.multiclassing?.proficienciesGained || {};
    const out = {n:o.name, hd:[6, 8, 10, 12].includes(+o.hd?.faces) ? +o.hd.faces : 8,
      prim:[].concat(o.primaryAbility || []).map(p => Object.keys(p).filter(k => p[k]).map(k => ABN5[k] || k).join(' and ')).join(' or '),
      saves:[].concat(o.proficiency || []).map(a => String(a).toUpperCase()), prof:gear(sp),
      choice:sk, caster:{full:'full', '1/2':'half', '1/3':'third', pact:'pact', artificer:'half'}[o.casterProgression] || '', spellAb:o.spellcastingAbility || '',
      mcProf:gear(mc).join(', '), x:'',
      f:feats.map(f => ({l:clamp(+f.level || 1, 1, 20), n:plain5(f.name), x:flatL5(f.entries), ...(/^(spellcasting|pact magic)$/i.test(f.name) ? {} : grantsOf5(f.name, f.entries))})).sort((a, b) => a.l - b.l)};
    const ct = table5(o.classTableGroups), adv = adv5(o); if (ct) out.ct = ct; if (adv) out.adv = adv;
    const eq = o.startingEquipment?.entries ? flat5(o.startingEquipment.entries) : ''; if (eq) out.eq = eq.replace(/\*/g, '').slice(0, 600);
    return out;
  }},
  subclass:{cat:'subclasses', to:(o, json) => {
    const short = o.shortName || o.name, all = json?.subclassFeature || [];
    const mine = f => isObj(f) && f.className === o.className && f.subclassShortName === short && (!f.subclassSource || !o.source || f.subclassSource === o.source);
    let fs;
    if (Array.isArray(o.subclassFeatures) && o.subclassFeatures.length){
      // the subclass lists its features with their exact level; a "_copy" feature (a 2014 subclass reprinted for the 2024 class) borrows its text
      fs = o.subclassFeatures.map(r => { const k = ref5(r, true); const f = all.find(x => mine(x) && x.name === k.n && src5(x.classSource) === src5(k.cs) && +x.level === k.l); return f ? copy5(f, all) : null; }).filter(Boolean);
    } else fs = all.filter(f => mine(f) && (!f.classSource || !o.classSource || f.classSource === o.classSource));
    fs.sort((a, b) => (a.level || 0) - (b.level || 0));
    const intro = fs.find(f => f.name === o.name || f.name === short);
    // the features the intro names ({"type":"refSubclassFeature"}) are not always in the subclass's own list
    if (intro) for (const m of JSON.stringify(intro.entries || []).matchAll(/"subclassFeature":"([^"]+)"/g)){
      const k = ref5(m[1], true), p = m[1].split('|');
      if (fs.some(f => f.name === k.n)) continue;
      const f = all.find(x => mine(x) && x.name === k.n && src5(x.classSource) === src5(p[2]) && +x.level === k.l);
      if (f) fs.push(copy5(f, all));
    }
    fs.sort((a, b) => (a.level || 0) - (b.level || 0));
    // features the intro hands out ("Wind Speaker", "Tempestuous Magic") arrive with the intro: in the 2024 class that is level 3, not level 1
    const kids = new Set(JSON.stringify(intro?.entries || []).match(/"subclassFeature":"[^"|]+/g)?.map(m => m.split('"').pop()) || []);
    const lv = f => kids.has(f.name) && intro ? Math.max(+f.level || 1, +intro.level || 1) : (+f.level || 3);
    const adds = addSpells5(o.additionalSpells);
    // spells a level hands out go on the feature of that level named "… Spells", else on the first feature of that level; with them, spells named in the text are not guessed at
    const body = fs.filter(f => f !== intro), target = {};
    Object.keys(adds).forEach(l => { target[l] = body.find(f => lv(f) === +l && /spells$/i.test(f.name)) || body.find(f => lv(f) === +l); });
    const hasAdds = Object.keys(adds).length > 0;
    const feat = f => { const l = clamp(lv(f), 1, 20); return {l, n:plain5(f.name), x:flatL5(f.entries), ...grantsOf5(f.name, f.entries, target[l] === f ? adds[l] : null, hasAdds)}; };
    const out = {n:o.name, cls:o.className || '', sum:'', x:intro ? textL5(intro.entries) : '', f:fs.filter(f => f !== intro).map(feat).sort((a, b) => a.l - b.l), _sh:short, _ed:o.classSource ? (ONE5.has(o.classSource) ? 'one' : 'classic') : ''};
    if (intro && Object.keys(adds).length && !out.f.some(f => f.g?.sp)){ const l = +Object.keys(adds)[0]; out.f.unshift({l, n:plain5(intro.name), x:'', ...grantsOf5(intro.name, [], adds[l])}); }
    return out;
  }},
};
FROM5.magicvariant = FROM5.item;
FROM5.baseitem = {cat:'weapons', to:o => { if (!(o.dmg1 && DMG5[o.dmgType])) throw 0; return weapon5(o, null, []); }};   // armor and gear have no Workshop form: they count as left out
/** One entry copied from the 5e.tools page (a bare object, or a plain array of them) has no {"spell":[…]} around it: guess the list from its shape. */
function kind5Of(o){
  if (!isObj(o) || typeof o.name !== 'string') return null;
  if (typeof o.level === 'number' && (o.school !== undefined || o.time || o.range)) return 'spell';
  if (o.cr !== undefined && (o.ac || o.hp)) return 'monster';
  if (o.hd || (o.classFeatures && !o.className)) return 'class';
  if (o.className && (o.shortName || o.subclassFeatures)) return 'subclass';
  if (o.rarity !== undefined || o.baseItem) return 'item';
  if (o.dmg1 && o.weaponCategory) return 'baseitem';
  if (o.startingEquipment || (o.skillProficiencies && o.speed === undefined && !o.size)) return 'background';
  if (o.size && o.speed !== undefined) return 'race';
  if (o.category || o.prerequisite || o.ability) return 'feat';
  return null;
}
function wrap5(json){
  if (Array.isArray(json)){
    const out = {}; json.forEach(o => { const k = kind5Of(o); if (k) (out[k] = out[k] || []).push(o); });
    return out;
  }
  if (isObj(json) && !Object.keys(json).some(k => Array.isArray(json[k]) && Object.hasOwn(FROM5, k))){ const k = kind5Of(json); if (k) return {[k]:[json]}; }
  return json;
}
/** Read a whole 5etools file. Returns {items:[{cat, o, src}], skip}: skip counts entries of kinds the Workshop has no form for. */
function from5(json, base){
  const items = []; let skip = 0;
  json = wrap5(json);
  if (!isObj(json)) return {items, skip};
  setBase5(base || json.baseitem);
  for (const [k, arr] of Object.entries(json)){
    if (k.startsWith('_') || !Array.isArray(arr)) continue;
    const conv = Object.hasOwn(FROM5, k) ? FROM5[k] : null;
    for (const raw of arr){
      if (!isObj(raw) || typeof raw.name !== 'string' || k === 'classFeature' || k === 'subclassFeature') continue;   // features travel with their class
      if (!conv || (k === 'item' && raw.rarity === 'none' && !raw.wondrous)){ skip++; continue; }
      // a "_copy" entry only lists its changes from another one in the same file
      const base = raw._copy && arr.find(b => isObj(b) && b !== raw && b.name === raw._copy.name && (!raw._copy.source || b.source === raw._copy.source));
      const o = base ? {...base, ...raw} : raw;
      try { const out = conv.to(o, json); if (out?.n?.trim()){ const {_cat, _pw, _sh, _ed, ...rest} = out; items.push({cat:_cat || conv.cat, o:rest, src:String(raw.source || ''), ed:_ed || raw.edition || (ONE5.has(raw.source) ? 'one' : 'classic'), ...(_pw ? {pw:_pw} : {}), ...(_sh ? {sh:_sh} : {})}); } else skip++; }
      catch (e) { skip++; }
    }
  }
  return {items, skip};
}
// The 5etools entry an imported Library source holds, or an SRD entry, as a ready-to-edit Workshop draft.
function brewDraftFrom(e){
  if (!e || !Object.hasOwn(BREW, e.cat)) return null;
  let o = null;
  if (NATIVE(e)) o = structuredClone(e.o);
  else if (e.o?._kind && Object.hasOwn(FROM5, e.o._kind)){
    const pack = PACKS.find(p => p.name === e.src)?.data;
    try { o = FROM5[e.o._kind].to(e.o, pack); } catch (err) { o = null; }
  }
  if (!o) return null;
  for (const [k, , type] of BREW[e.cat].f) if ((type === 'feats' || type === 'traits') && Array.isArray(o[k])) o[k] = o[k].map(t => ({...t, x:String(t.x || '').replace(/\s*\n+\s*/g, ' ')}));
  return {cat:e.cat, o};
}
const brewable = e => !!e && e.src !== 'Homebrew' && Object.hasOwn(BREW, e.cat) && (NATIVE(e) || Object.hasOwn(FROM5, e.o?._kind || ''));
let BREW5 = null;   // checked entries waiting in the review window
const hbMsgs = (err, warn) => err.length + warn.length ? `<ul class="hbMsgs">${err.map(m => `<li class="e"><span aria-hidden="true">✕</span> ${esc(m)}</li>`).join('')}${warn.map(m => `<li class="w"><span aria-hidden="true">⚠</span> ${esc(m)}</li>`).join('')}</ul>` : '';
const hbBadge = it => it.err.length ? `<span class="hbBadge e">${it.err.length} error${it.err.length > 1 ? 's' : ''}</span>` : it.warn.length ? `<span class="hbBadge w">${it.warn.length} warning${it.warn.length > 1 ? 's' : ''}</span>` : '<span class="hbBadge ok">ready</span>';
/** Every import ends here: each entry is checked, errors keep it out, warnings are shown, and you tick what to bring in. */
function brewReview(list, name, {skip = 0, notes = []} = {}){
  const ctx = hbCtx(list), seen = new Map();
  BREW5 = list.map(it => { const r = checkBrew(it.cat, it.o, ctx); r.warn.unshift(...(it.pw || [])); return {cat:it.cat, src:it.src || '', ...r}; });
  BREW5.forEach(it => { const k = it.cat + '|' + norm(it.o.n); if (it.o.n && seen.has(k)) it.warn.push(`Another ${BREW[it.cat].t.toLowerCase()} in this file has the same name; the one further down wins.`); seen.set(k, it); });
  const has = it => BREW_ITEMS.some(x => x.cat === it.cat && norm(x.o.n) === norm(it.o.n));
  const nE = BREW5.filter(it => it.err.length).length, nW = BREW5.filter(it => !it.err.length && it.warn.length).length, nOk = BREW5.length - nE - nW;
  const many = BREW5.length > 60;
  const groups = Object.keys(BREW).map(k => [k, BREW5.map((it, i) => [it, i]).filter(([it]) => it.cat === k)]).filter(([, l]) => l.length);
  modal(`<div class="head"><h2>Import into Homebrew</h2><span class="spacer"></span>${closeBtn()}</div>
    <p class="muted">${esc(name)}: ${BREW5.length} ${BREW5.length === 1 ? 'entry' : 'entries'} checked${skip ? `, ${skip} of kinds Homebrew has no form for left out` : ''}. Tick the ones you want; each one can be edited afterwards.${many ? ' The file is big, so nothing is ticked yet.' : ''}</p>
    <p class="hbSum" role="status"><span class="hbBadge ok">${nOk} ready</span> <span class="hbBadge w">${nW} with warnings</span> <span class="hbBadge e">${nE} with errors</span>${nE ? ' <span class="muted small">Entries with errors can’t be imported: fix them in the file and import it again.</span>' : ''}</p>
    ${notes.length ? `<details class="hbNotes"${notes.length < 4 ? ' open' : ''}><summary>${notes.length} note${notes.length > 1 ? 's' : ''} about the file</summary><ul class="hbMsgs">${notes.map(m => `<li class="w"><span aria-hidden="true">⚠</span> ${esc(m)}</li>`).join('')}</ul></details>` : ''}
    <div class="row b5Bar"><label class="sr" for="b5_q">Filter</label><input type="search" id="b5_q" placeholder="Filter by name" autofocus>
      <label class="row small"><input type="checkbox" id="b5_prob"> Only problems</label>
      <button type="button" class="sb" id="b5_all">Tick shown</button><button type="button" class="sb" id="b5_none">Untick all</button></div>
    <div class="b5List">${groups.map(([k, l]) => `<h4>${esc(BREW[k].t)} <span class="muted">${l.length}</span></h4>${l.map(([it, i]) =>
      `<div class="b5Row${it.err.length ? ' bad' : ''}" data-n="${esc(norm(it.o.n))}" data-p="${it.err.length + it.warn.length ? 1 : 0}"><label class="row"><input type="checkbox" class="b5" value="${i}" ${it.err.length ? 'disabled' : many ? '' : 'checked'}>
        <span>${esc(it.o.n || '(no name)')} <span class="muted">${esc([brewKey(it.cat, it.o), it.src].filter(Boolean).join(' · '))}${has(it) ? ' · replaces yours' : ''}</span> ${hbBadge(it)}</span></label>${hbMsgs(it.err, it.warn)}</div>`).join('')}`).join('')}</div>
    <div class="row mt">${act('brew5Add', undefined, 'Add ticked', 'btn')}${act('close', undefined, 'Cancel', 'btn ghost')}<span class="muted" id="b5_n"></span></div>`, {label:'Import into Homebrew'});
  const count = () => { $('#b5_n').textContent = `${$$('.b5:checked').length} ticked`; };
  const filt = () => { const q = norm($('#b5_q').value), p = $('#b5_prob').checked; $$('.b5Row').forEach(r => { r.hidden = (!!q && !r.dataset.n.includes(q)) || (p && r.dataset.p !== '1'); }); };
  $('#b5_q').oninput = filt; $('#b5_prob').onchange = filt;
  $('#b5_all').onclick = () => { $$('.b5Row').forEach(r => { const c = r.querySelector('input'); if (!r.hidden && !c.disabled) c.checked = true; }); count(); };
  $('#b5_none').onclick = () => { $$('.b5').forEach(x => { x.checked = false; }); count(); };
  $('.b5List').onchange = count; count();
}
function brewMdText(text, name, def){
  const r = parseBrewMd(text, def || '');
  if (!r.items.length){ toast(`No entries in ${name}: give each one a title, ideally “# Spell: Ember Lash”. In Paste Markdown you can say what the entries are; the Markdown template shows the full format.`); return; }
  brewReview(r.items, name, {notes:r.notes});
}
function brewDownload(txt, fname, type){
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], {type})); a.download = fname; document.body.appendChild(a); a.click(); a.remove();
}
Object.assign(ACT_BREW, {
  async brew5Add(){
    const picked = cleanBrew($$('.b5:checked').map(x => BREW5?.[+x.value]).filter(it => it && !it.err.length).map(({cat, o}) => ({cat, o})));
    if (!picked.length){ toast('Tick at least one entry.'); return; }
    closeModal(); BREW5 = null;
    G.brewCat = picked[0].cat; G.brewEdit = null; G.brewDraft = null; G.brewView = 'home'; G.brewFilter = ''; G.brewQ = '';
    const n = await mergeBrew(picked);
    toast(`${picked.length} ${picked.length === 1 ? 'entry joins' : 'entries join'} your homebrew (${n} new). Open any of them to edit it.`);
  },
  brewMdTemplate(){ brewDownload(HB_MD_TEMPLATE, 'grimoire-homebrew-template.md', 'text/markdown'); toast('Template downloaded: open it in any text editor, change it, then import it here.'); },
  brewExportMd(){ brewDownload(brewToMd(BREW_ITEMS), 'grimoire-homebrew.md', 'text/markdown'); toast(`${BREW_ITEMS.length} entries written as Markdown.`); },
  brewMdPaste(){
    modal(`<div class="head"><h2>Paste Markdown</h2><span class="spacer"></span>${closeBtn()}</div>
      <p class="muted">Paste one or more entries, copied from a book, a web page or a document: titles, “Level 3: Name” features, bold text, tables and HTML are all understood, and Grimoire guesses what each entry is. Nothing is added until you check it and tick what to keep.</p>
      <label class="row small" for="hb_kind">If an entry has no label, read it as <select id="hb_kind"><option value="">whatever it looks like</option>${Object.keys(HB_CAT_LABEL).map(k => `<option value="${k}">${HB_CAT_LABEL[k]}</option>`).join('')}</select></label>
      <label class="sr" for="hb_md">Markdown</label><textarea id="hb_md" style="width:100%;min-height:260px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px" placeholder="# Feat: Ashen Resolve&#10;- Category: General&#10;- Prerequisite: Level 4+&#10;&#10;You gain the following benefits…" autofocus></textarea>
      <div class="row mt">${act('brewMdCheck', undefined, 'Check', 'btn')}${act('close', undefined, 'Cancel', 'btn ghost')}</div>`, {label:'Paste Markdown'});
  },
  brewMdCheck(){ const t = $('#hb_md')?.value || ''; if (!t.trim()){ toast('Paste some Markdown first.'); return; } brewMdText(t, 'Pasted text', $('#hb_kind')?.value || ''); },
  brewFrom(id){
    const e = byId(id), d = brewDraftFrom(e);
    if (!d){ toast('Homebrew has no form for this kind of entry.'); return; }
    G.brewCat = d.cat; G.brewEdit = null; G.brewDraft = d; G.brewView = 'edit'; closeModal();
    if (G.chapter === 'workshop'){ renderPage(); brewTop(); } else turnTo('workshop');
    toast(`${d.o.n} is in the ${BREW[d.cat].t.toLowerCase()} form: change what you like, then press Add.`);
  },
});


/* ---- fetch straight from 5etools (or its GitHub mirror) and review ---- */
const HB5_MIRROR = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/';
const HB5_SPELLBOOKS = [['xphb', 'Player’s Handbook 2024'], ['phb', 'Player’s Handbook 2014'], ['xge', 'Xanathar’s Guide to Everything'], ['tce', 'Tasha’s Cauldron of Everything'], ['efa', 'Eberron: Forge of the Artificer'],
  ['ftd', 'Fizban’s Treasury of Dragons'], ['scc', 'Strixhaven'], ['aag', 'Astral Adventurer’s Guide'], ['egw', 'Explorer’s Guide to Wildemount'], ['ggr', 'Guildmasters’ Guide to Ravnica'], ['bmt', 'The Book of Many Things'],
  ['idrotf', 'Icewind Dale: Rime of the Frostmaiden'], ['ai', 'Acquisitions Incorporated'], ['llk', 'Lost Laboratory of Kwalish'], ['sato', 'Sigil and the Outlands'], ['frhof', 'Forgotten Realms: Heroes of Faerûn'], ['wow', 'Warcraft (WoW)'], ['au', 'Unearthed Arcana']];
const HB5_CLASSES = ['Artificer', 'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard', 'Sidekick'];
const HB5_BESTIARIES = [['xmm', 'Monster Manual 2025'], ['mm', 'Monster Manual 2014'], ['xdmg', 'Dungeon Master’s Guide 2024'], ['dmg', 'Dungeon Master’s Guide 2014'], ['mpmm', 'Mordenkainen Presents: Monsters of the Multiverse'], ['vgm', 'Volo’s Guide to Monsters'],
  ['mtf', 'Mordenkainen’s Tome of Foes'], ['ftd', 'Fizban’s Treasury of Dragons'], ['bgg', 'Bigby Presents: Glory of the Giants'], ['efa', 'Eberron: Forge of the Artificer'], ['egw', 'Explorer’s Guide to Wildemount'], ['phb', 'Player’s Handbook 2014']];
// [group, [[data file, label]]]: what the “Ready-made lists” picker offers, one group per kind of entry
const HB5_PRESETS = [
  ['Spells', HB5_SPELLBOOKS.map(([k, t]) => [`spells/spells-${k}.json`, t])],
  ['Classes and subclasses', HB5_CLASSES.map(c => [`class/class-${c.toLowerCase()}.json`, c + ' (with its subclasses)'])],
  ['Feats, species, backgrounds', [['feats.json', 'Feats'], ['races.json', 'Species (races)'], ['backgrounds.json', 'Backgrounds']]],
  ['Items', [['items-base.json', 'Weapons (base items)'], ['items.json', 'Magic items and magic weapons'], ['magicvariants.json', 'Magic variants (+1 weapons, armor of resistance…)']]],
  ['Creatures', HB5_BESTIARIES.map(([k, t]) => [`bestiary/bestiary-${k}.json`, t])],
];
/* A 5e.tools page link (backgrounds.html#merchant_xphb,flstsource:…) → the data file(s) behind that page, the entry the link points at, and the books ticked in its filter. */
const HB5_PAGES = {backgrounds:['backgrounds.json'], feats:['feats.json'], races:['races.json'], items:['items.json', 'items-base.json']};
const HB5_INDEXED = {spells:'spells', bestiary:'bestiary'};   // one file per book, listed in <dir>/index.json
const hb5Slug = x => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function hb5Page(u){
  const m = u.pathname.match(/\/([a-z0-9-]+)\.html$/i), page = m ? m[1].toLowerCase() : '';
  const hash = (() => { try { return decodeURIComponent(u.hash.slice(1)); } catch (e) { return u.hash.slice(1); } })(), parts = hash.split(',').filter(Boolean);
  const first = parts[0] && !/^flst/i.test(parts[0]) ? parts[0] : '';
  const ix = first.lastIndexOf('_'), entry = first ? {name:ix > 0 ? first.slice(0, ix) : first, src:ix > 0 ? first.slice(ix + 1).toUpperCase() : ''} : null;
  const fl = parts.find(x => /^flstsource:/i.test(x)), books = fl ? fl.replace(/^flstsource:/i, '').split('~').filter(x => /=1$/.test(x)).map(x => x.split('=')[0].toUpperCase()) : [];
  if (page === 'classes'){
    if (!entry || !/^[a-z0-9-]+$/i.test(entry.name)) return {err:'Open the class on 5e.tools first, so the link names it (classes.html#artificer_efa), then paste that link.'};
    // "state:sub_storm_xge=b1" in the link = the subclass ticked on the page (short name, book): it comes along even from another book than the class
    const subs = parts.map(x => x.match(/^state:sub_(.+)_([a-z0-9]+)=b1$/i)).filter(Boolean).map(m => ({slug:hb5Slug(m[1]), src:m[2].toUpperCase()}));
    return {files:[`class/class-${entry.name.toLowerCase()}.json`], books:entry.src ? [entry.src] : [], ...(subs.length ? {subs} : {})};   // the class file also holds its subclasses and features
  }
  if (Object.hasOwn(HB5_PAGES, page)) return {files:HB5_PAGES[page], entry, books:entry ? [] : books};
  if (Object.hasOwn(HB5_INDEXED, page)){
    const want = entry && entry.src ? [entry.src] : books;
    if (!want.length) return {err:`The ${page} page has one file per book. Open the page with the book you want ticked in its Source filter, or open one ${page === 'spells' ? 'spell' : 'creature'}, then paste that link.`};
    return {indexed:HB5_INDEXED[page], books:want, entry};
  }
  return {err:`The ${page || 'site'} page has no Workshop form: Homebrew holds classes, subclasses, spells, feats, species, backgrounds, magic items, weapons and creatures. Pages that work: classes, spells, feats, races, backgrounds, items and bestiary.`, page:true};
}
/** What the person typed → the data path inside 5etools ("spells/spells-efa.json"), or an error to show. */
function hb5Path(v){
  v = String(v || '').trim(); if (!v) return {err:'Pick a list or paste a link first.'};
  let path = v;
  if (/^https?:\/\//i.test(v) || /^(www\.)?5e\.tools\//i.test(v)){
    let u; try { u = new URL(/^https?:/i.test(v) ? v : 'https://' + v); } catch (e) { return {err:'That is not a valid link.'}; }
    if (/(^|\.)5e\.tools$/i.test(u.hostname) && !/\/data\//.test(u.pathname)) return hb5Page(u);
    path = u.pathname;
    if (!/\/data\//.test(path) && !/githubusercontent\.com$/i.test(u.hostname)) return {err:'Only 5etools data links work here (…/data/…json). For anything else use Choose file or Paste JSON.', direct:v};
  }
  path = path.replace(/^.*\/data\//, '').replace(/^\/+/, '').replace(/^data\//, '');
  if (!/\.json$/i.test(path)) return {err:'It has to end in .json, like spells/spells-efa.json.'};
  if (/\.\.|[?#\s]/.test(path)) return {err:'That path does not look right.'};
  return {path};
}
async function hb5Get(url, ms = 30000){
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, {signal:ac.signal, cache:'no-cache'}); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } finally { clearTimeout(t); }
}
/** 5e.tools first; if the browser or the site refuses (CORS, offline…), the same file from the open 5etools mirror on GitHub. */
async function hb5Load(path){
  const tries = [['5e.tools', 'https://5e.tools/data/' + path], ['the 5etools mirror on GitHub', HB5_MIRROR + path]];
  let last;
  for (const [from, url] of tries){ try { return {json:await hb5Get(url), from}; } catch (e) { last = e; } }
  throw last;
}
// 2024 rules win when the same name exists in both editions; an entry twice in the same edition is kept for the checker to flag
function hb5Prefer24(list){
  const has24 = new Set(list.filter(it => it.ed === 'one').map(it => it.cat + '|' + norm(it.o.n)));
  const out = list.filter(it => !(it.ed !== 'one' && has24.has(it.cat + '|' + norm(it.o.n))));
  return {out, dropped:list.length - out.length};
}
async function hb5Review(json, name, srcWanted, from, entry, notes0 = [], subs = []){
  json = wrap5(json);
  let base = null, notes = [...notes0, 'Converted automatically from 5etools data: it can be incomplete or slightly off, so read the warnings and check each entry after importing.'];
  if (!json.baseitem && Array.isArray(json.item) && json.item.some(i => isObj(i) && i.baseItem && !i.dmg1) && from){
    try { base = (await hb5Load('items-base.json')).json.baseitem; } catch (e) { notes.push('Magic weapons borrow their dice from the base items file, which could not be loaded now: they come in without damage until you import “Weapons (base items)” first.'); }
  }
  if (Array.isArray(json.spell) && json.spell.some(sp => isObj(sp) && !sp.classes)){
    // 5etools keeps "which class gets which spell" in one separate file
    try { const lk = (await hb5Load('spells/sources.json')).json;
      json = {...json, spell:json.spell.map(sp => { if (!isObj(sp) || sp.classes) return sp; const cl = (lk?.[sp.source]?.[sp.name]?.class || []).filter(c => !c.definedInSource); return cl.length ? {...sp, classes:{fromClassList:cl}} : sp; })}; }
    catch (e) { notes.push('The class lists of the spells could not be loaded now, so the spells come in without a class: tick the classes in each one afterwards.'); }
  }
  const r = from5(json, base);
  let list = r.items, skip = r.skip;
  if (entry && !json.class){   // the link points at one entry
    const sl = hb5Slug(entry.name), before = list.length; list = list.filter(it => hb5Slug(it.o.n) === sl && (!entry.src || it.src.toUpperCase() === entry.src));
    if (!list.length){ toast(`“${entry.name}” (${entry.src || 'any book'}) is not in that file, or has no Workshop form.`); return; }
    notes.push(`Only the entry the link points at: ${before - list.length} others hidden.`);
  } else if (srcWanted && srcWanted.length){
    const w = [].concat(srcWanted).map(x => String(x).toLowerCase()), before = list.length;
    // with subclasses ticked in the link, the class comes with just those (not every subclass of the class book)
    list = list.filter(it => subs.length && it.cat === 'subclasses' ? subs.some(s => s.slug === hb5Slug(it.sh) && s.src === it.src.toUpperCase()) : w.includes(it.src.toLowerCase()));
    if (!list.length){ toast(`Nothing from ${w.join(', ').toUpperCase()} in that file.`); return; }
    if (before - list.length) notes.push(`Only ${w.length > 3 ? w.length + ' books' : 'source ' + w.join(', ').toUpperCase()}: ${before - list.length} other entries hidden.`);
  }
  const ed = $('#hb5_ed')?.value;   // the edition picker next to the link box
  if (ed){ const before = list.length; list = list.filter(it => ed === 'one' ? it.ed === 'one' : it.ed !== 'one');
    if (!list.length){ toast(`Nothing for the ${ed === 'one' ? '2024' : '2014'} rules in that file: pick “Any edition”.`); return; }
    if (before - list.length) notes.push(`${before - list.length} ${ed === 'one' ? 'older-edition' : '2024-edition'} entries hidden by the edition choice.`); }
  const d = hb5Prefer24(list); list = d.out; if (d.dropped) notes.push(`${d.dropped} older-edition ${d.dropped === 1 ? 'entry was' : 'entries were'} left out because the 2024 version of the same name is in the file.`);
  if (!list.length){ toast(`Nothing Homebrew can use in that file${skip ? ` (${skip} entries of kinds it has no form for)` : ''}.`); return; }
  brewReview(list, name + (from ? ` (from ${from})` : ''), {skip, notes});
}
Object.assign(ACT_BREW, {
  brew5Pre(){ const v = $('#hb5_pre')?.value; if (v){ $('#hb5_url').value = v; } },
  async brew5Fetch(){
    const h = hb5Path($('#hb5_url')?.value);
    if (h.err){ toast(h.err); return; }
    const typed = ($('#hb5_src')?.value || '').trim(), books = typed ? typed.toUpperCase().split(/[\s,;+]+/).filter(Boolean) : h.books || [];
    toast('Fetching…');
    try {
      let files = h.files || [], got, from = '';
      if (h.path) files = [h.path];
      if (h.indexed){
        const idx = (await hb5Load(h.indexed + '/index.json')).json, key = Object.keys(idx);
        files = [...new Set(books.map(b => key.find(k => k.toUpperCase() === b)).filter(Boolean).map(k => `${h.indexed}/${idx[k]}`))];
        if (!files.length){ toast(`None of those books has ${h.indexed} files on 5etools.`); return; }
        if (files.length > 15){ toast(`That link ticks ${files.length} books at once: tick fewer in the Source filter (up to 15) or type one book in the Source box.`); return; }
      }
      const json = {}, miss = [];
      for (const f of files){
        try { got = await hb5Load(f); } catch (e) { if (files.length === 1) throw e; miss.push(f.split('/').pop()); continue; }
        from = got.from;
        if (!isObj(got.json)) throw new Error('not 5etools data');
        for (const [k, v] of Object.entries(got.json)) if (Array.isArray(v)) json[k] = (json[k] || []).concat(v);
      }
      if (miss.length === files.length) throw new Error('none loaded');
      const name = h.indexed ? `${h.indexed} · ${books.join(', ')}` : files[0].split('/').pop().replace(/\.json$/i, '') + (files.length > 1 ? ` + ${files.length - 1} more` : '');
      await hb5Review(json, name, books, from, h.entry, miss.length ? [`Could not load ${miss.join(', ')}: those files are left out.`] : [], h.subs || []);
    } catch (e) { toast('Could not fetch that file. Check the link, or open it in a new tab, copy everything and use Paste JSON.'); }
  },
  brew5Paste(){
    modal(`<div class="head"><h2>Paste 5etools JSON</h2><span class="spacer"></span>${closeBtn()}</div>
      <p class="muted">Open the data file in 5e.tools (or any 5etools-style source), select all, copy and paste it here. You see what each entry becomes, and what could not be carried over, before anything is added.</p>
      <label class="sr" for="hb5_json">JSON</label><textarea id="hb5_json" style="width:100%;min-height:240px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px" placeholder='{"spell":[{"name":"Ember Lash", …}]}' autofocus></textarea>
      <div class="row mt">${act('brew5PasteGo', undefined, 'Check', 'btn')}${act('close', undefined, 'Cancel', 'btn ghost')}</div>`, {label:'Paste 5etools JSON'});
  },
  async brew5PasteGo(){
    const t = $('#hb5_json')?.value || ''; if (!t.trim()){ toast('Paste the JSON first.'); return; }
    let j; try { j = JSON.parse(t); } catch (e) { toast('That is not valid JSON.'); return; }
    if (!isObj(j) && !Array.isArray(j)){ toast('Expected 5etools data: one entry, or a file like {"spell":[…]}.'); return; }
    await hb5Review(j, 'Pasted JSON', '', '');
  },
});

/* ================================================================== spell search on the spellbook page */
const SPELL_PAGE = 30;
function spellFilterBar(){
  const sp = ALL.filter(e => e.cat === 'spells'), lvs = [...new Set(sp.map(e => e.o.lv ?? e.o.level).filter(v => v != null))].sort((a, b) => a - b);
  const schools = [...new Set(sp.map(e => e.o.sc).filter(Boolean))].sort(), hasBrew = sp.some(e => e.src === 'Homebrew');
  const on = (v, k) => 'sb' + (String(G[k] ?? '') === String(v) ? ' on' : '');
  return `<div class="spFilt" role="group" aria-label="Spell filters">
    <div class="row"><span class="muted small">Level</span>${act('spellF', 'spellLv:', 'All', on('', 'spellLv'))}${lvs.map(l => act('spellF', 'spellLv:' + l, l == 0 ? 'Cantrips' : String(l), on(l, 'spellLv'), `aria-label="${l == 0 ? 'Cantrips' : 'Level ' + l}"`)).join('')}</div>
    <div class="row"><label class="muted small" for="spell_sc">School</label><select id="spell_sc"><option value="">All schools</option>${schools.map(x => `<option value="${esc(x)}"${G.spellSc === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>
    ${hasBrew ? `${act('spellF', 'spellSrc:', 'All sources', on('', 'spellSrc'))}${act('spellF', 'spellSrc:SRD', 'SRD', on('SRD', 'spellSrc'))}${act('spellF', 'spellSrc:Homebrew', 'Homebrew', on('Homebrew', 'spellSrc'))}` : ''}</div></div>`;
}
function spellSearch(q){
  const box = $('#spellResults'); if (!box) return;
  G.spellQ = q; q = norm(q);
  const c = active(), mine = $('#spell_mine')?.checked, lv = G.spellLv ?? '', sc = G.spellSc || '', sr = G.spellSrc || '';
  const filtering = !!(q || lv !== '' || sc || sr);
  const bar = spellFilterBar();
  if (!filtering && !G.spellBrowse){
    const n = ALL.filter(e => e.cat === 'spells').length;
    box.innerHTML = `${bar}<p class="muted small">${n} spells in the library. Type a name, pick a level or school, or ${act('spellBrowse', undefined, 'browse them all', 'sb')}.</p>`; return;
  }
  const mc = classList(c);
  const all = ALL.filter(e => e.cat === 'spells' && (!q || e.lc.includes(q) || norm(e.o.sc || '').includes(q)) && (lv === '' || (e.o.lv ?? e.o.level) == lv) && (!sc || e.o.sc === sc)
    && (!sr || (sr === 'SRD' ? e.src !== 'Homebrew' : e.src === 'Homebrew')) && (!mine || !e.o.cls || mc.some(x => e.o.cls.includes(x.class))))
    .sort((a, b) => ((a.o.lv ?? a.o.level ?? 99) - (b.o.lv ?? b.o.level ?? 99)) || (q ? (b.lc.startsWith(q) - a.lc.startsWith(q)) : 0) || a.n.localeCompare(b.n));
  const max = G.spellMax || SPELL_PAGE, list = all.slice(0, max);
  let last = null;
  const rows = list.map(e => { const l = e.o.lv ?? e.o.level ?? 99, head = l !== last ? `<h4>${l == 0 ? 'Cantrips' : l == 99 ? 'Unlisted' : 'Level ' + l}</h4>` : ''; last = l;
    return `${head}<div class="entry"><div class="row"><button type="button" class="chip" data-act="detailId" data-arg="${esc(e.id)}">${esc(e.n)}</button><span class="meta">${esc(e.k)}</span> ${e.src !== 'SRD' ? srcTag(e) : ''}<span class="spacer"></span>${c.spells.known.includes(e.n) ? '<span class="muted">known</span>' : act('learn', e.n, '＋ Learn')}</div></div>`; }).join('');
  box.innerHTML = `${bar}<div class="spRes"><p class="muted small" role="status">${all.length} ${all.length === 1 ? 'spell' : 'spells'}${filtering ? ' match' : ''}${mine ? ' on your class list' : ''}${filtering ? ` ${act('spellF', 'clear:', 'Clear filters', 'sb')}` : ''}</p>`
    + (rows || '<p class="muted">No match.</p>')
    + (all.length > max ? `<div class="row mt">${act('spellMore', undefined, `Show ${Math.min(SPELL_PAGE, all.length - max)} more`, 'btn small')}<span class="muted small">${max} of ${all.length}</span></div>` : '') + '</div><div class="rule"></div><h4 class="muted">Known spells</h4>';
}

/* ================================================================== omnibox */
let omniSel = 0;
function omniResults(q){
  q = norm(q); if (!q) return [];
  return ALL.filter(e => e.lc.includes(q)).sort((a, b) => (b.lc.startsWith(q) - a.lc.startsWith(q)) || (b.lc === q) - (a.lc === q) || (PRI[a.src] ?? 1) - (PRI[b.src] ?? 1) || a.n.length - b.n.length).slice(0, 24);
}
function renderOmni(){
  const box = $('#omniList'), q = $('#omni').value, res = omniResults(q);
  if (!q){ box.hidden = true; return; }
  omniSel = clamp(omniSel, 0, Math.max(0, res.length - 1));
  box.innerHTML = res.map((e, i) => `<button type="button" data-act="detailId" data-arg="${esc(e.id)}" class="${i === omniSel ? 'sel' : ''}"><span>${esc(e.n)}</span> ${e.src !== 'SRD' ? srcTag(e) : ''}<span class="k">${esc(CAT_NAME[e.cat] || e.cat)}${e.k ? ' · ' + esc(e.k) : ''}</span></button>`).join('') || '<p class="muted" style="padding:8px">Nothing in the library by that name.</p>';
  box.hidden = false;
}

/* ================================================================== actions */
function mut(fn, full = true){ const c = active(); fn(c); save(); full ? render() : renderPage(); }
const num = id => parseInt($('#' + id)?.value, 10) || 0;
/* HP amounts are never negative (B-006): "-50" damage or healing does nothing. */
/* Purse arithmetic: values in copper. ep = 50 cp, gp = 100, pp = 1000. */
const COIN_V = {cp:1, sp:10, ep:50, gp:100, pp:1000}, COIN_ORDER = ['pp','gp','ep','sp','cp'];
const coinTotal = cur => COIN_ORDER.reduce((t, k) => t + (cur[k] || 0) * COIN_V[k], 0);
/** Pay `cost` copper, starting with `pref` coins, then smaller ones, then one larger coin at a time with change in gp/sp/cp. Returns {purse, paid, change} or null when there is not enough. */
function coinSpend(cur, cost, pref = 'gp'){
  cost = Math.round(cost); if (!(cost > 0) || coinTotal(cur) < cost) return null;
  const run = partialLower => {
    const p = {cp:0, sp:0, ep:0, gp:0, pp:0}; COIN_ORDER.forEach(k => { p[k] = cur[k] || 0; });
    const paid = {}, change = {}; let need = cost;
    const take = (k, n) => { n = Math.min(n, p[k]); if (n > 0){ p[k] -= n; paid[k] = (paid[k] || 0) + n; need -= n * COIN_V[k]; } };
    take(pref, Math.floor(need / COIN_V[pref]));
    const lower = COIN_ORDER.filter(k => COIN_V[k] < COIN_V[pref]);
    if (need > 0){   // smaller coins: only when they can settle the rest, otherwise keep them and take change from a bigger coin
      const q = {...p}; let r = need; lower.forEach(k => { r -= Math.min(q[k], Math.floor(r / COIN_V[k])) * COIN_V[k]; });
      if (r === 0 || partialLower) lower.forEach(k => take(k, Math.floor(need / COIN_V[k])));
    }
    if (need > 0){   // bigger coins one at a time, smallest first; then any smaller ones left
      const up = COIN_ORDER.filter(k => COIN_V[k] > COIN_V[pref]).reverse().concat(lower.slice().reverse());
      for (const k of up){ while (need > 0 && p[k] > 0) take(k, 1); if (need <= 0) break; }
    }
    if (need > 0) return null;
    let back = -need;
    for (const k of ['gp','sp','cp']){ const n = Math.floor(back / COIN_V[k]); if (n){ p[k] += n; change[k] = n; back -= n * COIN_V[k]; } }
    return {purse:p, paid, change};
  };
  const extra = () => {   // B-052: one more coin of the chosen kind, with change
    const n = Math.ceil(cost / COIN_V[pref]); if ((cur[pref] || 0) < n) return null;
    const p = {cp:0, sp:0, ep:0, gp:0, pp:0}; COIN_ORDER.forEach(k => { p[k] = cur[k] || 0; }); p[pref] -= n;
    const change = {}; let back = n * COIN_V[pref] - cost;
    for (const k of ['gp','sp','cp']){ const m = Math.floor(back / COIN_V[k]); if (m){ p[k] += m; change[k] = m; back -= m * COIN_V[k]; } }
    return {purse:p, paid:{[pref]:n}, change};
  };
  return run(false) || run(true) || extra();
}
const coinAmountLabel = (cp, k) => (cp % COIN_V[k] === 0 ? cp / COIN_V[k] + ' ' + k.toUpperCase() : cp + ' CP');
const coinWords = o => COIN_ORDER.filter(k => o[k]).map(k => `${o[k]} ${k.toUpperCase()}`).join(', ');
/** Read "3", "2.5" or "2,5" as copper-exact units of coin k; null when not a positive amount. */
function coinAmount(txt, k){ const n = parseFloat(String(txt).replace(',', '.')); const cp = Math.round(n * COIN_V[k]); return Number.isFinite(n) && n > 0 && Math.abs(cp - n * COIN_V[k]) < 1e-6 && cp <= LIM.coin * 1000 ? cp : null; }
const hpNum = id => clamp(num(id), 0, LIM.hp);
function weaponAttack(c, w, plus = 0){
  const props = (w.props || []).map(norm);
  const finesse = props.includes('finesse'), ranged = /ranged/i.test(w.cat || '');
  const ab = ranged ? 'dex' : finesse && mod(c.abilities.dex) > mod(c.abilities.str) ? 'dex' : 'str';
  const m = mod(c.abilities[ab]), dm = m + plus;
  return {n:w.n, bonus:m + profFor(c.level) + plus, dmg:`${w.dmg}${dm ? fmt(dm) : ''} ${w.dt}`, note:[plus && fmt(plus) + ' magic weapon', w.sum && w.sum.replace(/^\S+ \S+,?\s*/, ''), (w.props || []).join(', '), w.m && 'Mastery: ' + w.m].filter(Boolean).join(' · ')};
}
/* weapons from the pack that are equipped (and attuned when they need it): they show up with the attacks, nothing is copied into c.attacks */
function gearAttacks(c){
  const out = [];
  (c.inventory || []).forEach((it, i) => {
    if (!isLive(it)) return;
    const st = itemStats(it); if (st.kind !== 'weapon') return;
    let a;
    if (st.w) a = weaponAttack(c, st.w, st.wb);
    else {
      const hw = st.info.e?.src === 'Homebrew' ? st.info.e.o.hw : null, m = st.dm.match(/^(\d*d\d+)\s*(.*)$/i);
      const ab = hw ? (/ranged/i.test(hw.wc) || (hw.props.includes('Finesse') && mod(c.abilities.dex) > mod(c.abilities.str)) ? 'dex' : 'str') : it.wab === 'dex' ? 'dex' : 'str', md = mod(c.abilities[ab]) + st.wb;
      a = {n:it.n, bonus:mod(c.abilities[ab]) + profFor(c.level) + st.wb, dmg:m ? `${m[1]}${md ? fmt(md) : ''} ${m[2]}`.trim() : st.dm,
        note:[st.wb && fmt(st.wb) + ' magic weapon', hw && hw.props.length && hw.props.map(p => p === 'Versatile' && hw.vd ? `Versatile (${hw.vd})` : p).join(', '), hw && hw.mast && 'Mastery: ' + hw.mast, hw && hw.rng && 'Range ' + hw.rng, it.d].filter(Boolean).join(' · ')};
    }
    out.push({...a, n:it.n, i});
  });
  return out;
}
/* ================================================================== portraits */
const portrait = (c, cls = '') => c.img ? `<img class="portrait ${cls}" src="${esc(c.img)}" alt="">` : `<span class="portraitEmoji ${cls}" aria-hidden="true">${esc(c.portrait || '🧝')}</span>`;
function shrinkImage(file){
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => {
      const S = 360, k = Math.min(1, S / Math.max(img.width, img.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/jpeg', .84)); };
      img.onerror = rej; img.src = r.result; };
    r.onerror = rej; r.readAsDataURL(file);
  });
}

/* ================================================================== concentration */
function concCheck(c, dmg){
  if (!c.conc || dmg <= 0) return;
  if (c.hp.cur <= 0){ logRoll('Concentration', `${c.name} drops to 0 HP`, `${c.conc.n} ends`, 'fumble'); c.conc = null; return; }
  const dc = Math.min(30, Math.max(10, Math.floor(dmg / 2)));
  const adv = hasFeat(c, 'War Caster') ? 1 : G.adv;
  const r = d20(adv), b = saveBonus(c, 'con'), exh = -2 * (c.exhaustion || 0), tot = r.nat + b + exh;
  const ok = r.nat !== 1 && tot >= dc;
  logRoll(`Concentration (${c.conc.n}) DC ${dc}`, `${r.txt} ${fmt(b)}${exh ? ' ' + exh : ''} Con save`, `${tot} · ${ok ? 'holds' : 'broken!'}`, ok ? '' : 'fumble');
  if (!ok) c.conc = null;
}
function applyDamage(c, a){
  const soak = Math.min(c.hp.temp || 0, a); c.hp.temp = (c.hp.temp || 0) - soak;
  const before = c.hp.cur, over = (a - soak) - before;
  c.hp.cur = Math.max(0, before - (a - soak));
  if (c.hp.cur === 0){
    const d = c.death = c.death || {s:0, f:0};
    if (before === 0 && a - soak > 0) d.f = Math.min(3, (d.f || 0) + 1);      // damage at 0 HP = one failed death save
    else if (before > 0) c.death = {s:0, f:0};
    if (over >= hpMax(c)){ toast(`${c.name} takes massive damage: dies instantly under the 2024 rules (mark 3 failed saves).`); }
  }
  concCheck(c, a);
}
const concChip = c => c.conc ? `<span class="chip conc" title="Concentrating">◎ ${esc(c.conc.n)} <button type="button" class="chipX" data-act="dropConc" data-arg="${esc(c.id)}" aria-label="End concentration">✕</button></span>` : '';
function castSpell(c, name){
  const e = find(name, 'spells'), o = e?.o || {}, lv = +(o.lv ?? o.level ?? 0);
  const conc = !!(o.conc || /concentration/i.test(o.d || '') || (o.duration || []).some?.(d => d.concentration));
  let used = 0;
  if (lv > 0){
    const info = slotsFor(c), pk = c.spells.pact = c.spells.pact || {used:0};
    if (info.pact && lv <= info.pact.lv && pk.used < info.pact.n){ pk.used++; used = info.pact.lv; }
    for (let L = lv; L <= 9 && !used; L++){
      const tot = info.slots[L - 1] || 0, s = c.spells.slots[L] = c.spells.slots[L] || {used:0};
      if (s.used < tot){ s.used++; used = L; }
    }
    if (!used){ toast(`No spell slot of level ${lv} or higher left.`); return; }
  }
  let msg = `${c.name} casts ${name}${used ? ` with a level ${used} slot` : ''}`;
  if (conc){ if (c.conc) msg += `, ending ${c.conc.n}`; c.conc = {n:name}; msg += '. Concentrating.'; }
  save(); renderPage(); toast(msg);
}

/* ================================================================== encounter tracker */
const ENC_KEY = 'grimoire-encounter-v1';
G.enc = {round:1, turn:0, list:[]};
try { const raw = localStorage.getItem(ENC_KEY); if (raw) G.enc = JSON.parse(raw); } catch (e) {}
const saveEnc = () => { try { localStorage.setItem(ENC_KEY, JSON.stringify(G.enc)); } catch (e) {} };
const heroOf = r => r.hero ? G.chars.find(c => c.id === r.hero) : null;
function encView(r){
  const h = heroOf(r);
  if (h) return {n:h.name, hp:h.hp.cur, max:hpMax(h), temp:h.hp.temp || 0, ac:getAC(h), conds:(h.conditions || []).map(n => ({n, r:h.condDur?.[n] ?? null})), hero:h};
  return {n:r.n, hp:r.hp, max:r.max, temp:r.temp || 0, ac:r.ac, conds:r.conds || []};
}
function encSort(){ const cur = G.enc.list[G.enc.turn]?.id; G.enc.list.sort((a, b) => (b.init ?? -99) - (a.init ?? -99) || (b.dex || 0) - (a.dex || 0)); G.enc.turn = Math.max(0, G.enc.list.findIndex(r => r.id === cur)); }
function startTurn(r){
  const h = heroOf(r), v = encView(r), ended = [];
  if (h){ h.condDur = h.condDur || {}; for (const n of Object.keys(h.condDur)){ if (h.condDur[n] == null) continue; h.condDur[n]--; if (h.condDur[n] <= 0){ delete h.condDur[n]; h.conditions = h.conditions.filter(x => x !== n); ended.push(n); } } save(); }
  else { r.conds = (r.conds || []).map(c => c.r == null ? c : {...c, r:c.r - 1}).filter(c => { if (c.r !== null && c.r <= 0){ ended.push(c.n); return false; } return true; }); }
  toast(`Round ${G.enc.round}: ${v.n}'s turn${ended.length ? ` · ended: ${ended.join(', ')}` : ''}${h?.conc ? ` · concentrating on ${h.conc.n}` : ''}`);
}
function monsterRow(e, k){
  const o = e.o;
  const hp = parseInt(o.hp) || o.hp?.average || 10, ac = parseInt(o.ac) || (Array.isArray(o.ac) ? (o.ac[0]?.ac ?? o.ac[0]) : 10);
  const dex = o.ab ? mod(o.ab[1]) : mod(o.dex);
  return {id:uid(), n:e.n + (k ? ' ' + k : ''), ref:e.id, init:null, dex, hp, max:hp, ac:+ac || 10, conds:[]};
}
const condOptions = () => (SRD.conditions || []).map(c => c.n).concat(['Bloodied', 'Hasted', 'Blessed', 'Hexed', 'Marked', 'Raging', 'Dodging']);

PAGES.encounter = function(c){
  const E = G.enc, cur = E.list[E.turn];
  const rows = E.list.map((r, i) => {
    const v = encView(r), on = i === E.turn, pct = clamp(100 * v.hp / Math.max(1, v.max), 0, 100);
    return `<div class="combatant ${on ? 'now' : ''} ${v.hp <= 0 ? 'down' : ''}">
      <div class="cInit"><label class="sr" for="init_${r.id}">Initiative</label><input type="number" id="init_${r.id}" data-enc="init" data-id="${r.id}" value="${r.init ?? ''}" placeholder="–">${act('encRollOne', r.id, '🎲', 'sb', 'title="Roll initiative" aria-label="Roll initiative"')}</div>
      <div class="cMain">
        <div class="row" style="gap:4px 8px">${on ? '<span class="chip">▶ Turn</span>' : ''}${v.hero ? `<button type="button" class="xref invLink" data-act="pick" data-arg="${esc(v.hero.id)}">${portrait(v.hero, 'mini')} ${esc(v.n)}</button>` : r.ref ? `<button type="button" class="xref invLink" data-act="detailId" data-arg="${esc(r.ref)}">${esc(v.n)}</button>` : `<b>${esc(v.n)}</b>`}
          <span class="chip light">AC ${v.ac}</span>${v.hero ? concChip(v.hero) : ''}
          ${v.conds.map(k => `<button type="button" class="chip light cond" data-act="encDelCond" data-arg="${r.id}|${esc(k.n)}" title="Remove ${esc(k.n)}">${esc(k.n)}${k.r != null ? ` · ${k.r}r` : ''} ✕</button>`).join('')}</div>
        <div class="row" style="margin-top:4px"><div class="hpBar ${pct <= 50 ? 'low' : ''}" style="flex:1;min-width:90px"><i style="width:${pct}%"></i></div><span class="num muted">${v.hp}/${v.max}${v.temp ? ' +' + v.temp : ''}</span></div>
      </div>
      <div class="cAct">
        <div class="row"><label class="sr" for="amt_${r.id}">Amount</label><input type="number" id="amt_${r.id}" min="0" value="" placeholder="0" style="width:64px">${act('encDmg', r.id, 'Dmg')}${act('encHeal', r.id, 'Heal')}</div>
        <div class="row" style="margin-top:4px"><label class="sr" for="cn_${r.id}">Condition</label><select id="cn_${r.id}">${condOptions().map(n => `<option>${esc(n)}</option>`).join('')}</select><label class="sr" for="cr_${r.id}">Rounds</label><input type="number" id="cr_${r.id}" min="1" placeholder="rds" style="width:56px" title="Rounds (empty = until removed)">${act('encAddCond', r.id, '＋')}${act('encDel', r.id, '✕', 'sb x', 'aria-label="Remove from encounter"')}</div>
      </div></div>`;
  }).join('');
  const mons = ALL.filter(e => e.cat === 'monsters');
  return `${card(`Round <span class="big num">${E.round}</span> <span class="muted">${cur ? 'Turn: ' + esc(encView(cur).n) : 'Add combatants to begin'}</span>`, `
      <div class="row">${act('encPrev', undefined, '← Previous', 'btn small ghost')}${act('encNext', undefined, 'Next turn →', 'btn')}${act('encRollAll', undefined, 'Roll initiative for all')}${act('encSort', undefined, 'Sort')}${act('encClear', undefined, 'Clear encounter', 'sb x')}</div>
      <p class="muted">Durations count down at the start of that creature's turn. Damage to a concentrating hero rolls the Constitution save for you (DC 10 or half the damage, max 30).</p>`)}
    <div class="encList">${rows || '<p class="empty">No one in the fight yet. Add your heroes and some foes below.</p>'}</div>
    <div class="grid3" style="margin-top:14px">
      ${card('Heroes', `<div class="row">${G.chars.map(h => act('encAddHero', h.id, (G.enc.list.some(r => r.hero === h.id) ? '✓ ' : '＋ ') + esc(h.name), 'sb' + (G.enc.list.some(r => r.hero === h.id) ? ' on' : ''))).join('')}</div>`)}
      ${card('Creatures from the book', `<label class="sr" for="enc_m">Creature</label><input type="text" id="enc_m" list="monList" placeholder="Goblin Warrior, Owlbear…" style="width:100%"><datalist id="monList">${mons.map(e => `<option value="${esc(e.n)}">`).join('')}</datalist>
        <div class="row mt"><label class="muted" for="enc_k">How many</label><input type="number" id="enc_k" value="1" min="1" max="20" style="width:64px">${act('encAddMon', undefined, '＋ Add')}</div>`)}
      ${card('Custom combatant', `<div class="fields"><div><label class="f" for="enc_cn">Name</label><input type="text" id="enc_cn" placeholder="Bandit chief"></div><div><label class="f" for="enc_ci">Initiative</label><input type="number" id="enc_ci"></div><div><label class="f" for="enc_ch">HP</label><input type="number" id="enc_ch" value="10"></div><div><label class="f" for="enc_ca">AC</label><input type="number" id="enc_ca" value="12"></div></div>
        <div class="row mt">${act('encAddCustom', undefined, '＋ Add')}</div>`)}
    </div>`;
};

/* ================================================================== guided level up */
const ASI_LEVELS = {Fighter:[4,6,8,12,14,16,19], Rogue:[4,8,10,12,16,19]};
/* 2024: when the Constitution modifier changes, max HP changes as if it had been that from level 1 (B-022) */
/* Max HP never drops below 1 per level and damage taken stays the same; what a low Constitution could not take away
   (max kept at the floor, damage beyond 0 HP) is remembered in hp.conAdj, so − then + gives back the same HP (B-026).
   The max part survives damage (B-032); the cur part is dropped as soon as the current HP change for any other reason. */
function conHp(c, oldCon){
  const lv = c.level || 1, n = (mod(c.abilities.con || 10) - mod(oldCon || 10)) * lv; if (!n) return 0;
  const hp = c.hp, max0 = +hp.max || 0, cur0 = +hp.cur || 0, a = hp.conAdj, fresh = !!a && a.m === max0, freshC = fresh && a.c === cur0;
  const raw = max0 - (fresh ? +a.max || 0 : 0) + n, max = clamp(raw, lv, LIM.hp);
  const dmg = max0 - cur0 + (freshC ? +a.cur || 0 : 0), dying = cur0 === 0 && !(freshC && a.cur);
  const want = dying ? 0 : max - dmg, cur = clamp(want, 0, max);
  hp.max = max; hp.cur = cur;
  if (max !== raw || cur !== want) hp.conAdj = {max:max - raw, cur:cur - want, m:max, c:cur}; else delete hp.conAdj;
  return max - max0;
}
/* feats already taken are not offered again unless repeatable (B-025) */
const featOffered = (c, e) => !!(e.o?.rep) || !hasFeat(c, e.n);
function luTarget(c){
  const list = classList(c), pick = String(G.lu?.cls ?? '0');
  if (pick.startsWith('new:')) return {class:pick.slice(4), subclass:'', level:0, isNew:true};
  return list[+pick] || list[0];
}
function afterLevel(c, t){
  const x = {...c, level:c.level + 1, multi:multi(c).map(m => ({...m}))};
  if (t.isNew) x.multi.push({class:t.class, subclass:'', level:1}); else if (!t.main) x.multi[t.i].level++;
  return x;
}
function levelPlan(c){
  const T = luTarget(c), v = asClass(c, T), N = T.level + 1, cl = clsInfo(v), srd = srdClass(v), sub = subclassOf(v);
  const feats = (cl.f || []).filter(f => f.l === N);
  const subFeats = (sub?.f || []).filter(f => f.l === N);
  /* SRD classes list each feature once in .f (first level); later ASI levels are only in the class table (B-021) */
  const asi = feats.some(f => /ability score improvement/i.test(f.n)) || (srd ? (srd.tbl?.[N - 1]?.f || []).some(f => /ability score improvement/i.test(f)) : (ASI_LEVELS[T.class] || [4,8,12,16,19]).includes(N));
  const boon = feats.some(f => /epic boon/i.test(f.n)) || (!srd && N === 19);
  const needSub = !T.subclass && (feats.some(f => /subclass/i.test(f.n)) || (!srd && N === 3));
  const old = slotsFor(c), nx = slotsFor(afterLevel(c, T));
  const ro = srd?.tbl?.[N - 2]?.cs || {}, rn = srd?.tbl?.[N - 1]?.cs || {};
  const resDiff = Object.keys(rn).filter(k => rn[k] !== ro[k]).map(k => `${title(k.replace(/_count$|_uses$/, ''))}: ${ro[k] ?? '—'} → ${rn[k]}`);
  return {T, CN:N, N:c.level + 1, feats, subFeats, asi, boon, needSub, old, nx, resDiff, pbOld:profFor(c.level), pbNew:profFor(c.level + 1)};
}
/** Ability increase a feat grants ("Increase your Strength or Dexterity score by 1, to a maximum of 20"): {abs, cap}, or null (B-031). */
function featAsi(e){
  const x = String(e?.o?.x || e?.o?.d || ''), k = e?.k || e?.o?.ty || '', cap = +(x.match(/maximum of (\d+)/i)?.[1]) || (/epic boon/i.test(k) ? 30 : 20);
  const m = x.match(/Increase your ([A-Za-z, ]+?) score by 1/i);
  if (m){ const abs = ABIL.filter(a => new RegExp('\\b' + a.n + '\\b', 'i').test(m[1])).map(a => a.id); if (abs.length) return {abs, cap}; }
  return /one ability score of your choice by 1/i.test(x) || /epic boon/i.test(k) ? {abs:ABIL.map(a => a.id), cap} : null;
}
function luFeatAb(){
  const sel = $('#lu_boonab'), row = $('#lu_featab'); if (!sel || !row) return;
  const fe = ALL.find(e => e.cat === 'feats' && e.n === $('#lu_feat')?.value), fa = featAsi(fe);
  row.hidden = !fa;
  [...sel.options].forEach(o => { o.disabled = !!fa && !fa.abs.includes(o.value); });
  if (fa && sel.selectedOptions[0]?.disabled) sel.value = fa.abs[0];
}
function openLevelUp(keep){
  const c = active(); if (c.level >= 20){ toast(`${c.name} is already level 20.`); return; }
  if (!keep || !G.lu) G.lu = {roll:null, cls:'0'}; else G.lu.roll = null;
  const P = levelPlan(c), T = P.T, hd = hdSize(asClass(c, T)), con = mod(c.abilities.con), avg = Math.floor(hd / 2) + 1;
  const extra = (c.species === 'Dwarf' ? 1 : 0) + (hasFeat(c, 'Tough') ? 2 : 0);
  const slotRows = P.nx.slots.map((n, i) => n !== P.old.slots[i] ? `<tr><td>Level ${i + 1}</td><td>${P.old.slots[i] || 0}</td><td><b>${n}</b></td></tr>` : '').join('');
  const abSel = id => `<select id="${id}">${ABIL.map(a => `<option value="${a.id}">${a.n} (${c.abilities[a.id]})</option>`).join('')}</select>`;
  const featList = ALL.filter(e => { if (e.cat !== 'feats') return false; const k = e.k || e.o.ty || ''; return !/fighting style/i.test(k) && !/^ability score improvement$/i.test(e.n) && (P.boon || !/epic boon/i.test(k)) && featOffered(c, e); });
  const list = classList(c), blockers = list.filter(e => !mcMeets(c, e.class)).map(e => e.class);
  const others = names('classes').filter(n => !list.some(e => e.class === n));
  const clsSel = `<label class="sr" for="lu_cls">Class to advance</label><select id="lu_cls">${list.map((e, i) => `<option value="${i}" ${String(G.lu.cls) === String(i) ? 'selected' : ''}>${esc(e.class)} ${e.level} → ${e.level + 1}</option>`).join('')}
    ${others.length ? `<optgroup label="Multiclass into a new class">${others.map(n => { const ok = !blockers.length && mcMeets(c, n);
      return `<option value="new:${esc(n)}" ${ok ? '' : 'disabled'} ${G.lu.cls === 'new:' + n ? 'selected' : ''}>${esc(n)} 1${ok ? '' : ' · needs 13 ' + esc(mcNeed(n).text)}</option>`; }).join('')}</optgroup>` : ''}</select>`;
  const html = `<div class="head"><h2>${esc(c.name)} reaches level ${P.N}</h2><span class="spacer"></span>${closeBtn()}</div>
    <div class="row">${clsSel}</div>
    ${blockers.length ? `<p class="muted small">Multiclassing needs 13 in the primary ability of every class you have: ${blockers.map(b => `${esc(b)} (${esc(mcNeed(b).text)})`).join(', ')}.</p>` : ''}
    ${T.isNew ? `<p class="muted small"><b>New class.</b> You gain its level 1 features${mcProf(T.class) && mcProf(T.class) !== 'none' ? ` and these proficiencies: ${esc(mcProf(T.class))}` : ', but no extra proficiencies'}. Not its saving throws. Spell slots now follow the Multiclass Spellcaster table.</p>` : ''}
    <div class="meta">${esc(T.class)} ${P.CN}${T.subclass ? ' · ' + esc(T.subclass) : ''} · Proficiency Bonus ${fmt(P.pbOld)}${P.pbNew !== P.pbOld ? ` → <b>${fmt(P.pbNew)}</b>` : ''}</div>
    <div class="rule"></div>
    <h4>1 · Hit Points</h4>
    <div class="row"><label class="row"><input type="radio" name="lu_hp" value="avg" checked> Take the average: ${avg} ${fmt(con)} Con${extra ? ` +${extra}` : ''} = <b>${Math.max(1, avg + con) + extra}</b></label></div>
    <div class="row mt"><label class="row"><input type="radio" name="lu_hp" value="roll"> Roll 1d${hd} ${fmt(con)} Con${extra ? ` +${extra}` : ''}</label>${act('luRoll', undefined, 'Roll', 'sb')}<span id="luRolled" class="muted"></span></div>
    ${extra ? `<p class="muted">${c.species === 'Dwarf' ? 'Dwarven Toughness +1. ' : ''}${hasFeat(c, 'Tough') ? 'Tough +2.' : ''}</p>` : ''}
    <h4>2 · New features</h4>
    ${[...P.feats, ...P.subFeats].map(f => `<details class="fold"><summary>${esc(f.n)}</summary><div class="in">${grantChips(f.g)}${md(f.x)}</div></details>`).join('') || '<p class="muted">No new class features listed at this level in the library.</p>'}
    ${P.needSub ? `<h4>3 · Choose your subclass</h4>${subSelect('id="lu_sub" style="width:100%"', T.class, '')}` : ''}
    ${P.asi || P.boon ? `<h4>${P.needSub ? 4 : 3} · ${P.boon ? 'Epic Boon or Ability Score Improvement' : 'Ability Score Improvement or feat'}</h4>
      <div class="stack" style="gap:6px">
        <label class="row"><input type="radio" name="lu_asi" value="two" checked> +2 to ${abSel('lu_a1')}</label>
        <label class="row"><input type="radio" name="lu_asi" value="split"> +1 to ${abSel('lu_b1')} and +1 to ${abSel('lu_b2')}</label>
        <label class="row"><input type="radio" name="lu_asi" value="feat"> Feat: <select id="lu_feat">${featList.map(e => `<option value="${esc(e.n)}">${esc(e.n)} · ${esc(e.k)}</option>`).join('')}</select></label>
        <label class="row" id="lu_featab">This feat also gives +1 to ${abSel('lu_boonab')}</label>
        <p class="muted">+2 and +1/+1 can't take a score above 20${P.boon ? '; an Epic Boon raises one score by 1, up to 30' : '; a feat with an Ability Score Increase (such as Grappler) adds its +1 up to 20'}.</p></div>` : ''}
    ${slotRows || P.nx.cantrips !== P.old.cantrips || P.nx.prepared !== P.old.prepared ? `<h4>Spellcasting</h4><div class="tblWrap"><table class="ctable"><thead><tr><th>Slots</th><th>Now</th><th>Level ${P.N}</th></tr></thead><tbody>${slotRows}
      ${P.nx.cantrips !== P.old.cantrips && P.nx.cantrips !== undefined ? `<tr><td>Cantrips known</td><td>${P.old.cantrips ?? 0}</td><td><b>${P.nx.cantrips}</b></td></tr>` : ''}
      ${P.nx.prepared !== P.old.prepared && P.nx.prepared !== undefined ? `<tr><td>Prepared spells</td><td>${P.old.prepared ?? 0}</td><td><b>${P.nx.prepared}</b></td></tr>` : ''}</tbody></table></div>
      <p class="muted">After levelling, pick the new spells on the Spellbook page.</p>` : ''}
    ${P.resDiff.length ? `<h4>Class resources</h4><p>${P.resDiff.map(esc).join(' · ')}</p>` : ''}
    <div class="row mt">${act('luApply', undefined, `Become level ${P.N}`, 'btn')}${act('close', undefined, 'Not yet', 'btn ghost')}</div>`;
  const open = keep && $('#modalBk .modal');
  if (open) open.innerHTML = html; else modal(html, {label:'Level up'});
  luFeatAb();
}
function applyLevelUp(){
  const c = active(), P = levelPlan(c), T = P.T, hd = hdSize(asClass(c, T)), con = mod(c.abilities.con);
  const extra = (c.species === 'Dwarf' ? 1 : 0) + (hasFeat(c, 'Tough') ? 2 : 0);
  const mode = $('input[name="lu_hp"]:checked')?.value;
  if (mode === 'roll' && G.lu.roll == null){ toast('Press Roll first, or take the average.'); return; }
  const gain = Math.max(1, (mode === 'roll' ? G.lu.roll : Math.floor(hd / 2) + 1) + con) + extra;
  const notes = [`+${gain} HP`], con0 = c.abilities.con;
  if (P.needSub){ const s = $('#lu_sub').value.trim(); if (s){ const sc = s.replace(/^(Path|College|Circle|Oath|Warrior) of (the )?/, '').replace(/ (Domain|Patron|Sorcery)$/, '');
    if (T.isNew) T.subclass = sc; else if (T.main) c.subclass = sc; else c.multi[T.i].subclass = sc; notes.push(sc); } }
  if (P.asi || P.boon){
    /* 2024: the Ability Score Improvement stops at 20; only an Epic Boon feat gives +1 up to 30 (B-027) */
    const m = $('input[name="lu_asi"]:checked')?.value;
    /* never lowers a score already above the cap (B-005) */
    const up = (ab, n, cap = 20) => { const v = c.abilities[ab] || 10; c.abilities[ab] = Math.max(v, Math.min(cap, v + n)); return c.abilities[ab] - v; };
    const gained = (ab, g) => g ? `${ab.toUpperCase()} +${g}` : `${ab.toUpperCase()} already ${c.abilities[ab]}`;
    if (m === 'two'){ const a = $('#lu_a1').value; notes.push(gained(a, up(a, 2))); }
    else if (m === 'split'){ const a = $('#lu_b1').value, b = $('#lu_b2').value; if (a === b){ toast('Pick two different abilities for +1/+1.'); return; } notes.push(gained(a, up(a, 1)) + ', ' + gained(b, up(b, 1))); }
    else if (m === 'feat'){ const f = $('#lu_feat')?.value; if (!f){ toast('No feat left to pick: choose an ability increase.'); return; }
      const fe = ALL.find(e => e.cat === 'feats' && e.n === f), fa = featAsi(fe); let ab = $('#lu_boonab')?.value;
      c.feats.push({n:f, src:`Level ${P.N}`}); notes.push(f);
      if (fa){ if (!fa.abs.includes(ab)) ab = fa.abs[0]; notes.push(gained(ab, up(ab, 1, fa.cap))); } }
  }
  if (T.isNew){ c.multi = multi(c); c.multi.push({class:T.class, subclass:T.subclass || '', level:1}); notes.unshift(`${T.class} 1`); }
  else if (!T.main) c.multi[T.i].level++;
  c.level = P.N; c.hp.max += gain; c.hp.cur += gain;
  const conGain = conHp(c, con0); if (conGain) notes[0] = `+${gain + conGain} HP (${fmt(conGain)} from Constitution, all levels)`;
  if ((c.xp || 0) < XP_TABLE[c.level - 1]) c.xp = XP_TABLE[c.level - 1];
  save(); closeModal(); render();
  toast(`${c.name} is now level ${c.level}: ${notes.join(' · ')}.`);
}

/* ================================================================== printable sheet (works in the downloaded file and the desktop app) */
const CAN_PRINT = window.self === window.top || !/^https?:$/.test(location.protocol);   // hidden only inside the sandboxed preview frame
function sheetHTML(c){
  const p = profFor(c.level), sp = speciesInfo(c), cl = clsInfo(c), info = slotsFor(c), ab = spellAb(c);
  const box = (label, val, cls = '') => `<div class="sBox ${cls}"><div class="sVal">${val}</div><div class="sLab">${label}</div></div>`;
  const abil = ABIL.map(a => {
    const sk = SKILLS.filter(s => s.ab === a.id);
    return `<div class="sAb"><div class="sAbHead"><span>${a.n}</span></div><div class="sAbNums"><div><b>${fmt(mod(c.abilities[a.id]))}</b><small>Modifier</small></div><div><b>${c.abilities[a.id]}</b><small>Score</small></div></div>
      <div class="sSk"><span class="dotP ${c.saves?.[a.id] ? 'on' : ''}"></span><span class="num">${fmt(saveBonus(c, a.id))}</span> Saving Throw</div>
      ${sk.map(s => { const lv = c.skills?.[s.id] || 0; return `<div class="sSk"><span class="dotP ${lv ? 'on' : ''} ${lv === 2 ? 'ex' : ''}"></span><span class="num">${fmt(skillBonus(c, s))}</span> ${esc(s.n)}</div>`; }).join('')}</div>`;
  }).join('');
  const feats = [...classList(c).flatMap(e => { const v = asClass(c, e), tag = multi(c).length ? e.class + ' ' : '';
    return [...(clsInfo(v).f || []).filter(f => f.l <= v.level).map(f => `<b>${esc(f.n)}</b> <i>(${esc(tag)}${f.l})</i>`), ...(subclassOf(v)?.f || []).filter(f => f.l <= v.level).map(f => `<b>${esc(f.n)}</b> <i>(${esc(v.subclass)} ${f.l})</i>`)]; }), ...c.classFeats.map(esc)];
  const spells = c.spells.known.map(n => { const o = find(n, 'spells')?.o || {}; return {n, lv:+(o.lv ?? o.level ?? 0), t:String(o.t || '').split(',')[0], r:o.r || '', cr:(o.conc ? 'C' : '') + (o.rit ? 'R' : ''), prep:isPrepared(c, n)}; }).sort((a, b) => a.lv - b.lv || a.n.localeCompare(b.n));
  const attuned = c.inventory.filter(i => i.attuned);
  return `<section class="sPage">
    <header class="sHead"><div class="sName"><div class="sVal">${esc(c.name)}</div><div class="sLab">Character Name${c.player ? ' · Player: ' + esc(c.player) : ''}</div></div>
      ${box('Background', esc(c.background))}${box('Class', esc(classLabel(c)))}${box('Species', esc(c.species))}${box('Subclass', esc(classList(c).map(e => e.subclass).filter(Boolean).join(' / ') || '—'))}${box('Level', c.level, 'sm')}${box('XP', (c.xp || 0).toLocaleString('en'), 'sm')}</header>
    <div class="sRow">${box('Armor Class', getAC(c), 'shield')}${box('Hit Points', `${c.hp.cur} / ${c.hp.max}${c.hp.temp ? ' (+' + c.hp.temp + ')' : ''}`, 'wide')}${box('Hit Dice', hdText(c))}${box('Death Saves', `✓ ${'○'.repeat(3)}  ✗ ${'○'.repeat(3)}`)}${box('Prof. Bonus', fmt(p), 'sm')}${box('Initiative', fmt(initBonus(c)), 'sm')}${box('Speed', esc(c.speedOverride || (sp.speed ? sp.speed + ' ft.' : '30 ft.')), 'sm')}${box('Size', esc(sp.size || 'Medium'), 'sm sz')}${box('Passive Perc.', passive(c, 'perception'), 'sm')}</div>
    <div class="sCols"><div class="sLeft">${abil}<div class="sAb">${box('Heroic Inspiration', c.inspiration ? '◆' : '◇', 'flat')}</div></div>
      <div class="sRight">
        <div class="sPanel"><h3>Weapons & Damage Cantrips</h3><table><thead><tr><th>Name</th><th>Atk / DC</th><th>Damage & Type</th><th>Notes</th></tr></thead><tbody>${[...gearAttacks(c), ...c.attacks].map(a => `<tr><td>${esc(a.n)}</td><td>${fmt(+a.bonus || 0)}</td><td>${esc(a.dmg)}</td><td>${esc(a.note || '')}</td></tr>`).join('')}${'<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>'.repeat(Math.max(0, 4 - c.attacks.length - gearAttacks(c).length))}</tbody></table></div>
        <div class="sPanel"><h3>Class Features</h3><p>${feats.join(' · ') || '&nbsp;'}</p></div>
        <div class="sPanel sHalf"><div><h3>Species Traits</h3><p>${(sp.tr || []).map(t => `<b>${esc(t.n)}</b>`).join(' · ') || '&nbsp;'}</p></div><div><h3>Feats</h3><p>${c.feats.map(f => `<b>${esc(f.n)}</b>`).join(' · ') || '&nbsp;'}</p></div></div>
        <div class="sPanel"><h3>Equipment Training & Proficiencies</h3><p>${esc([...(cl.prof || []), ...multi(c).filter(m => mcProf(m.class) && mcProf(m.class) !== 'none').map(m => `${m.class}: ${mcProf(m.class)}`)].join(' · '))}</p></div>
      </div></div>
    <footer class="sFoot">Grimoire of Heroes · 2024 rules · ${esc(c.name)} · page 1</footer>
  </section>
  <section class="sPage">
    <div class="sRow">${box('Spellcasting Ability', ab.toUpperCase())}${box('Spellcasting Modifier', fmt(mod(c.abilities[ab])), 'sm')}${box('Spell Save DC', 8 + p + mod(c.abilities[ab]), 'sm')}${box('Spell Attack Bonus', fmt(p + mod(c.abilities[ab])), 'sm')}</div>
    <div class="sPanel"><h3>Spell Slots</h3><div class="sSlots">${info.slots.map((n, i) => `<div><b>Level ${i + 1}</b> <span>${n ? '□'.repeat(n) : '—'}</span></div>`).join('')}</div></div>
    <div class="sPanel"><h3>Cantrips & Prepared Spells</h3><table><thead><tr><th>Lv</th><th>Name</th><th>Casting Time</th><th>Range</th><th>C/R</th><th>Prep</th></tr></thead><tbody>${spells.map(s => `<tr><td>${s.lv || 'C'}</td><td>${esc(s.n)}</td><td>${esc(s.t)}</td><td>${esc(s.r)}</td><td>${s.cr}</td><td>${s.prep || !s.lv ? '●' : '○'}</td></tr>`).join('')}${'<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>'.repeat(Math.max(0, 8 - spells.length))}</tbody></table></div>
    <div class="sCols2">
      <div class="sPanel"><h3>Appearance</h3><p>${esc(c.notes.look || '')}</p><h3>Backstory & Personality</h3><p>${esc(c.notes.story || '')}</p><h3>Allies & Notes</h3><p>${esc([c.notes.allies, c.notes.extra].filter(Boolean).join(' — '))}</p></div>
      <div class="sPanel"><h3>Equipment</h3><p>${c.inventory.map(i => `${i.q > 1 ? i.q + '× ' : ''}${esc(i.n)}`).join(' · ')}</p>
        <h3>Magic Item Attunement</h3><div class="sAtt">${[0, 1, 2].map(k => `<div>◇ ${esc(attuned[k]?.n || '')}</div>`).join('')}</div>
        <h3>Coins</h3><div class="sCoins">${['cp','sp','ep','gp','pp'].map(k => `<div><b>${c.currency[k] || 0}</b><small>${k.toUpperCase()}</small></div>`).join('')}</div></div>
    </div>
    <footer class="sFoot">Grimoire of Heroes · 2024 rules · ${esc(c.name)} · page 2</footer>
  </section>`;
}
function printSheet(){
  let el = $('#printSheet'); if (!el){ el = document.createElement('div'); el.id = 'printSheet'; document.body.appendChild(el); }
  el.innerHTML = sheetHTML(active());
  document.documentElement.classList.add('printing');
  addEventListener('afterprint', () => document.documentElement.classList.remove('printing'), {once:true});
  setTimeout(() => window.print(), 60);
}

/* ================================================================== theme */
function applyTheme(){ document.documentElement.dataset.book = G.theme === 'night' ? 'night' : 'day'; const b = $('#themeBtn'); if (b){ b.setAttribute('aria-pressed', String(G.theme === 'night')); b.title = G.theme === 'night' ? 'Parchment pages' : 'Night pages'; } window.Aspetto?.sync(G.theme === 'night' ? 'night' : 'day'); }

/* ================================================================== cover */
function fillCover(){
  const c = active(), box = $('#coverHero'); if (!box || !c) return;
  box.innerHTML = `<div class="coverFrame">${portrait(c, 'big')}</div><p class="coverWho"><b>${esc(c.name)}</b><br><span>Level ${c.level} ${esc(c.species)} ${esc(classLabel(c))}</span></p>`;
  const chk = $('#coverStart'); if (chk) chk.checked = G.coverOnStart !== false;
}

const ACT_EXTRA = {
  portraitFile(){ $('#f_img').click(); },
  portraitClear(){ mut(c => { delete c.img; }); },
  dropConc(id){ const c = G.chars.find(x => x.id === id) || active(); if (c.conc){ toast(`${c.name} stops concentrating on ${c.conc.n}.`); c.conc = null; save(); render(); } },
  cast(n){ castSpell(active(), n); },
  concSave(){ const c = active(); const d = num('concDmg'); if (!c.conc){ toast('Not concentrating.'); return; } concCheck(c, Math.max(1, d)); save(); renderPage(); },
  levelUp(){ openLevelUp(); },
  luRoll(){ const c = active(), r = rollExpr('1d' + hdSize(asClass(c, luTarget(c)))); G.lu.roll = r.total; $('#luRolled').textContent = `rolled ${r.total}`; const rb = $('input[name="lu_hp"][value="roll"]'); if (rb) rb.checked = true; },
  luApply(){ applyLevelUp(); },
  print(){ if (!plusOK()) return plusModal('pdf'); printSheet(); },
  aspetto(){ window.Aspetto?.open(); },
  theme(){ if (G.theme !== 'night' && !plusOK()) return plusModal('themes'); G.theme = G.theme === 'night' ? 'day' : 'night'; save(); applyTheme(); },
  encAddHero(id){ if (G.enc.list.some(r => r.hero === id)){ G.enc.list = G.enc.list.filter(r => r.hero !== id); } else { const h = G.chars.find(c => c.id === id); G.enc.list.push({id:uid(), hero:id, init:null, dex:mod(h.abilities.dex)}); } saveEnc(); renderPage(); },
  encAddMon(){ const n = $('#enc_m').value.trim(), e = find(n, 'monsters'); if (!e){ toast('Pick a creature from the list.'); return; }
    const k = clamp(num('enc_k') || 1, 1, 20); const have = G.enc.list.filter(r => r.ref === e.id).length;
    for (let i = 1; i <= k; i++){ const r = monsterRow(e, k > 1 || have ? have + i : 0); r.init = rollExpr('1d20').total + r.dex; G.enc.list.push(r); }
    encSort(); saveEnc(); renderPage(); toast(`${k} × ${e.n} join the fight (initiative rolled).`); },
  encAddCustom(){ const n = $('#enc_cn').value.trim(); if (!n){ toast('Name the combatant.'); return; } const hp = Math.max(1, num('enc_ch'));
    G.enc.list.push({id:uid(), n, init:$('#enc_ci').value === '' ? null : num('enc_ci'), dex:0, hp, max:hp, ac:num('enc_ca') || 10, conds:[]}); encSort(); saveEnc(); renderPage(); },
  encRollOne(id){ const r = G.enc.list.find(x => x.id === id), h = heroOf(r);
    if (h){ const nat = d20(G.adv).nat; r.init = nat + initBonus(h); logRoll(`${h.name} initiative`, `[${nat}] ${fmt(initBonus(h))}`, r.init); } else { r.init = rollExpr('1d20').total + (r.dex || 0); }
    encSort(); saveEnc(); renderPage(); },
  encRollAll(){ G.enc.list.forEach(r => { const h = heroOf(r); r.init = d20(h ? G.adv : 0).nat + (h ? initBonus(h) : r.dex || 0); }); G.enc.turn = 0; G.enc.round = 1; encSort(); G.enc.turn = 0; saveEnc(); renderPage(); toast('Initiative rolled. Round 1 begins.'); if (G.enc.list[0]) startTurn(G.enc.list[0]); saveEnc(); },
  encSort(){ encSort(); saveEnc(); renderPage(); },
  encNext(){ const E = G.enc; if (!E.list.length) return; E.turn++; if (E.turn >= E.list.length){ E.turn = 0; E.round++; } startTurn(E.list[E.turn]); saveEnc(); render(); },
  encPrev(){ const E = G.enc; if (!E.list.length) return; E.turn--; if (E.turn < 0){ E.turn = E.list.length - 1; E.round = Math.max(1, E.round - 1); } saveEnc(); renderPage(); },
  encClear(){ confirmBox('Clear the encounter?', 'Clear', () => { G.enc = {round:1, turn:0, list:[]}; saveEnc(); renderPage(); }); },
  encDel(id){ const i = G.enc.list.findIndex(r => r.id === id); G.enc.list.splice(i, 1); if (G.enc.turn >= G.enc.list.length) G.enc.turn = 0; saveEnc(); renderPage(); },
  encDmg(id){ const r = G.enc.list.find(x => x.id === id); if (!isMine(heroOf(r))) return toast(`${heroOf(r).name} belongs to ${heroOf(r).ownerName || 'a party member'}, who tracks it.`); const _r = r, a = hpNum('amt_' + id), h = heroOf(r); if (!a) return;
    if (h){ applyDamage(h, a); save(); } else { const soak = Math.min(r.temp || 0, a); r.temp = (r.temp || 0) - soak; r.hp = Math.max(0, r.hp - (a - soak)); if (r.hp === 0) toast(`${r.n} drops!`); }
    saveEnc(); render(); },
  encHeal(id){ const r = G.enc.list.find(x => x.id === id); if (!isMine(heroOf(r))) return toast(`${heroOf(r).name} belongs to ${heroOf(r).ownerName || 'a party member'}, who tracks it.`); const _r = r, a = hpNum('amt_' + id), h = heroOf(r); if (!a) return;
    if (h){ h.hp.cur = Math.min(hpMax(h), h.hp.cur + a); if (h.hp.cur > 0) h.death = {s:0, f:0}; save(); } else r.hp = Math.min(r.max, r.hp + a); saveEnc(); render(); },
  encAddCond(id){ const r = G.enc.list.find(x => x.id === id); if (!isMine(heroOf(r))) return toast(`${heroOf(r).name} belongs to ${heroOf(r).ownerName || 'a party member'}, who tracks it.`); const _r = r, h = heroOf(r), n = $('#cn_' + id).value, rd = $('#cr_' + id).value === '' ? null : Math.max(1, num('cr_' + id));
    if (h){ if (!h.conditions.includes(n)) h.conditions.push(n); h.condDur = h.condDur || {}; if (rd) h.condDur[n] = rd; else delete h.condDur[n]; save(); }
    else { r.conds = (r.conds || []).filter(c => c.n !== n); r.conds.push({n, r:rd}); }
    saveEnc(); render(); },
  encDelCond(arg){ const [id, n] = arg.split('|'), r = G.enc.list.find(x => x.id === id), h = heroOf(r);
    if (h){ h.conditions = h.conditions.filter(x => x !== n); if (h.condDur) delete h.condDur[n]; save(); } else r.conds = r.conds.filter(c => c.n !== n);
    saveEnc(); render(); },
};

function rollAttack(a){
  if (!a) return;
  const nat = testRoll(a.n, +a.bonus || 0);
  const m = String(a.dmg || '').match(/^[\dd+\-\s]+/); if (!m) return;
  let ex = m[0].replace(/\s/g, ''); if (nat === 20) ex = ex.replace(/(\d*)d(\d+)/g, (s, n, f) => `${2 * (+n || 1)}d${f}`);
  const r = rollExpr(ex); setTimeout(() => logRoll(a.n + ' damage', `${ex} ${r.parts}`, r.total + ' ' + (String(a.dmg).replace(/^[\dd+\-\s]+/, '').trim())), 700);
}
const ACT = {
  pick(id){ G.activeId = id; save(); render(); },
  go(id){ turnTo(id); },
  prev(){ flipStep(-1); }, next(){ flipStep(1); },
  close(){ closeModal(); },
  detail(n){ showDetail(n); },
  detailId(id){ $('#omniList').hidden = true; showEntry(byId(id)); },
  roll(expr, el){ const r = rollExpr(expr); logRoll(el?.closest('.modal')?.querySelector('h2')?.textContent || expr, `${expr} ${r.parts}`, r.total); },
  die(s){ const ex = num('diceMod'), r = rollExpr(`1d${s}`); const total = r.total + ex;
    if (+s === 20) return testRoll('d20', ex);
    logRoll('d' + s, r.parts + (ex ? ' ' + fmt(ex) : ''), total); },
  rollExpr(){ const ex = $('#diceExpr').value.trim(); if (!/\d*d\d+/.test(ex)) { toast('Type dice like 2d6+3'); return; } const r = rollExpr(ex); logRoll(ex, r.parts, r.total); },
  adv(v){ G.adv = G.adv === +v ? 0 : +v; save(); syncTray(); },
  log(){ modal(`<div class="head"><h2>Roll history</h2><span class="spacer"></span>${closeBtn()}</div><ul class="logList">${G.log.map(l => `<li>${esc(l.line)}</li>`).join('') || '<li class="muted">No rolls yet.</li>'}</ul>`, {label:'Roll history'}); },
  sound(){ G.sound = !G.sound; save(); syncTray(); if (G.sound) rustle(); },
  stepAb(arg){ const [ab, d] = arg.split(':'); let hpN = 0;
    mut(c => { const v = c.abilities[ab] || 10; c.abilities[ab] = clamp(v + +d, 1, 30); if (ab === 'con') hpN = conHp(c, v); }, false);
    if (hpN){ render(); toast(`Max HP ${fmt(hpN)}: the Constitution modifier counts at every level.`); } },
  rollAb(ab){ const c = active(); testRoll(ab.toUpperCase() + ' check', mod(c.abilities[ab])); },
  rollSave(ab){ testRoll(ab.toUpperCase() + ' save', saveBonus(active(), ab)); },
  rollSkill(id){ const s = SKILLS.find(x => x.id === id); testRoll(s.n, skillBonus(active(), s)); },
  rollInit(){ testRoll('Initiative', initBonus(active())); },
  rollSpellAtk(){ const c = active(); testRoll('Spell attack', mod(c.abilities[spellAb(c)]) + profFor(c.level)); },
  toggleSave(ab){ mut(c => c.saves[ab] = c.saves[ab] ? 0 : 1, false); },
  cycleSkill(id){ mut(c => c.skills[id] = ((c.skills[id] || 0) + 1) % 3, false); },
  coinAdd(){ const k = $('#coinKind').value, cp = coinAmount($('#coinAmt').value, COIN_V[k] ? k : 'gp'); G.coinKind = k; G.coinAmt = $('#coinAmt').value;
    if (cp == null){ toast('Type an amount above zero (whole copper pieces).'); return; }
    mut(c => { const n = Math.round(cp / COIN_V[k]); const t = Math.round(cp); c.currency = objOr(c.currency, {cp:0,sp:0,ep:0,gp:0,pp:0}); if (cp % COIN_V[k] === 0) c.currency[k] = Math.min(LIM.coin, (c.currency[k] || 0) + n); else c.currency.cp = Math.min(LIM.coin, (c.currency.cp || 0) + t); });
    G.coinAmt = ''; toast(`Added ${coinAmountLabel(cp, k)}.`); },
  coinSpend(){ const k = $('#coinKind').value, cp = coinAmount($('#coinAmt').value, k); G.coinKind = k;
    if (cp == null){ toast('Type an amount above zero (whole copper pieces).'); return; }
    const cur = active().currency || {}, r = coinSpend(cur, cp, k);
    if (!r){ toast(`Not enough money: you have ${(coinTotal(cur) / 100).toFixed(2).replace(/\.?0+$/, '')} gp, ${coinAmountLabel(cp, k)} needed.`, 'err'); return; }
    mut(c => { Object.assign(c.currency, r.purse); }); G.coinAmt = '';
    toast(`Spent ${coinAmountLabel(cp, k)}: paid ${coinWords(r.paid)}${Object.keys(r.change).length ? `, change ${coinWords(r.change)}` : ''}.`); },
  hpStep(arg){ const el = $('#hpAmt'); if (!el) return; const v = clamp(hpNum('hpAmt') + (parseInt(arg, 10) || 0), 0, LIM.hp); el.value = v; G.hpAmt = v; },
  damage(){ mut(c => applyDamage(c, hpNum('hpAmt'))); },
  heal(){ mut(c => { c.hp.cur = Math.min(hpMax(c), c.hp.cur + hpNum('hpAmt')); if (c.hp.cur > 0) c.death = {s:0, f:0}; }); },
  tempHP(){ mut(c => c.hp.temp = Math.max(c.hp.temp || 0, hpNum('hpAmt'))); },
  setExh(n){ mut(c => c.exhaustion = +n, false); },
  toggleCond(n){ mut(c => { const i = c.conditions.indexOf(n); if (i >= 0){ c.conditions.splice(i, 1); if (c.condDur) delete c.condDur[n]; } else c.conditions.push(n); }, false); },
  setDeath(arg){ mut(c => { if (arg === 'reset') { c.death = {s:0, f:0}; return; } const [k, n] = arg.split(':'); c.death[k] = (c.death[k] || 0) === +n ? +n - 1 : +n; }, false); },
  rollDeath(){ const c = active(); const r = 1 + Math.floor(Math.random() * 20);
    if (r === 20){ c.death = {s:0, f:0}; c.hp.cur = Math.max(1, c.hp.cur); logRoll('Death save', '[20]', '20 · you regain 1 HP!', 'crit'); }
    else if (r === 1){ c.death.f = Math.min(3, (c.death.f || 0) + 2); logRoll('Death save', '[1]', `two failures (${c.death.f}/3)`, 'fumble'); }
    else if (r >= 10){ c.death.s = Math.min(3, (c.death.s || 0) + 1); logRoll('Death save', `[${r}]`, `success ${c.death.s}/3${c.death.s >= 3 ? ' · stable' : ''}`); }
    else { c.death.f = Math.min(3, (c.death.f || 0) + 1); logRoll('Death save', `[${r}]`, `failure ${c.death.f}/3${c.death.f >= 3 ? ' · the hero has fallen' : ''}`, 'fumble'); }
    save(); renderPage(); },
  usePip(arg){ const [k, i] = arg.split(':'); mut(c => { const used = c.res[k] || 0; c.res[k] = +i < used ? +i : +i + 1; }, false); },
  spendHD(){ const c = active(), p = hdPools(c).find(x => x.n - x.used > 0); if (!p){ toast('No Hit Dice left. They return on a Long Rest.'); return; }
    const r = rollExpr('1d' + p.d), heal = Math.max(1, r.total + mod(c.abilities.con));
    if (multi(c).length){ c.hitDice.by = c.hitDice.by || {}; c.hitDice.by[p.d] = (c.hitDice.by[p.d] || 0) + 1; }
    c.hitDice.used = (c.hitDice.used || 0) + 1; c.hp.cur = Math.min(hpMax(c), c.hp.cur + heal); save(); render();
    logRoll('Hit Die', `${r.parts} ${fmt(mod(c.abilities.con))} Con`, `+${heal} HP`); },
  shortRest(){ mut(c => { const info = slotsFor(c); if (info.type === 'pact') c.spells.slots = {}; if (info.pact) c.spells.pact = {used:0}; SHORT_REST_RES.forEach(k => delete c.res[k]); benefits(c).uses.filter(u => /short/.test(u.rest)).forEach(u => delete c.res[u.k]); shortRestPartial(c); }); toast('Short Rest: spend Hit Dice to heal.' + (hasClass(active(), 'Warlock') ? ' Pact slots restored.' : '')); },
  longRest(){ mut(c => { c.hp.cur = hpMax(c); c.hp.temp = 0; c.hitDice.used = 0; c.hitDice.by = {}; c.spells.slots = {}; c.spells.pact = {used:0}; c.res = {}; c.death = {s:0, f:0}; c.exhaustion = Math.max(0, (c.exhaustion || 0) - 1); if (c.species === 'Human') c.inspiration = true; }); toast('Long Rest: HP, Hit Dice, slots and resources restored; Exhaustion −1.'); },
  slot(arg){ const [lv, k] = arg.split(':').map(Number); mut(c => { const s = c.spells.slots[lv] = c.spells.slots[lv] || {used:0}; s.used = k < s.used ? k : k + 1; }, false); },
  resetSlots(){ mut(c => { c.spells.slots = {}; c.spells.pact = {used:0}; }, false); },
  mcAdd(){ const c = active(); if (c.level >= 20){ toast('Level 20 is the most a hero can reach.'); return; }
    const pick = names('classes').find(n => !hasClass(c, n)); if (!pick) return;
    mut(c => { c.multi = multi(c); c.multi.push({class:pick, subclass:'', level:1}); c.level++; }); toast(`${pick} 1 added: total level ${active().level}. Change the class in the list.`); },
  mcDel(i){ const c = active(), m = multi(c)[+i]; if (!m) return;
    confirmBox(`Remove ${m.class} ${m.level}? The total level drops by ${m.level}.`, 'Remove', () => mut(c => { c.multi.splice(+i, 1); c.level = Math.max(1, c.level - m.level); })); },
  pactSlot(k){ mut(c => { const s = c.spells.pact = c.spells.pact || {used:0}; s.used = +k < s.used ? +k : +k + 1; }, false); },
  prep(n){ const c0 = active(); if (!(c0.spells.prep || []).includes(n)){ const why = prepBlock(c0, n); if (why){ toast(why); return; } }
    mut(c => { const i = c.spells.prep.indexOf(n); i >= 0 ? c.spells.prep.splice(i, 1) : c.spells.prep.push(n); }, false); },
  unlearn(n){ mut(c => { c.spells.known = c.spells.known.filter(x => x !== n); c.spells.prep = c.spells.prep.filter(x => x !== n); }, false); },
  spellF(arg){ const [k, v] = arg.split(':'); if (k === 'clear'){ G.spellLv = ''; G.spellSc = ''; G.spellSrc = ''; G.spellQ = ''; const i = $('#spell_q'); if (i) i.value = ''; } else G[k] = v; G.spellMax = SPELL_PAGE; spellSearch($('#spell_q')?.value || ''); },
  spellBrowse(){ G.spellBrowse = true; spellSearch($('#spell_q')?.value || ''); },
  spellMore(){ G.spellMax = (G.spellMax || SPELL_PAGE) + SPELL_PAGE; spellSearch($('#spell_q')?.value || ''); },
  learn(n){ const c = active(); if (!c.spells.known.includes(n)){ c.spells.known.push(n); save(); } toast(`${n} added to ${c.name}'s spellbook.`); refreshAfterModalAction(); },
  takeFeat(n){ const c = active(); if (!hasFeat(c, n)){ c.feats.push({n, src:'Library'}); save(); } toast(`${c.name} takes ${n}.`); refreshAfterModalAction(); },
  become(arg){ const i = arg.indexOf(':'), k = arg.slice(0, i), v = arg.slice(i + 1); mut(c => { c[k] = k === 'subclass' ? v.replace(/^(Path|College|Circle|Oath|Warrior) of (the )?/, '').replace(/ (Domain|Patron|Sorcery)$/, '') : v; if (k === 'class') c.subclass = ''; }); closeModal(); toast(`${active().name}: ${k} is now ${active()[k]}.`); },
  addGear(id){ const e = byId(id), c = active(); const ex = c.inventory.find(it => !it.custom && norm(it.n) === norm(e.n) && !libAtt(e));
    if (ex) ex.q = (ex.q || 1) + 1; else { const n = {n:e.n, q:1, d:''}; if (itemStats(n).equippable) n.eq = false; c.inventory.push(n); } save(); toast(`${e.n} packed.`);
    if (G.chapter === 'pack' && !$('#modalBk')) { renderPage(); return; } refreshAfterModalAction(); },
  addCustom(){ const it = readItemForm(); if (!it) return; it.custom = true; mut(c => c.inventory.push(it), false); toast(`${it.n} added.`); },
  editItem(i){ const c = active(), it = c.inventory[+i], info = itemInfo(it);
    modal(`<div class="head"><h2>Edit item</h2><span class="spacer"></span>${closeBtn()}</div>${itemForm({...it, cat:info.cat, type:info.type, rar:info.rar, att:info.att, wt:it.wt ?? (info.wt || undefined), val:info.val}, 'saveItem', 'Save', i)}`, {label:'Edit item'}); },
  saveItem(i){ const f = readItemForm(); if (!f) return; mut(c => { const it = c.inventory[+i]; const renamed = norm(f.n) !== norm(it.n); Object.assign(it, f); if (renamed && !findGear(f.n)) it.custom = true; if (!it.att) it.attuned = false; }, false); closeModal(); },
  readItem(n){ const it = active().inventory.find(x => x.n === n); if (!it) return; const info = itemInfo(it);
    modal(`<div class="head"><h2>${esc(it.n)}</h2><span class="src">Custom</span><span class="spacer"></span>${closeBtn()}</div><div class="meta">${esc([info.cat, info.type, info.rar, info.att ? 'requires attunement' : '', info.val].filter(Boolean).join(' · '))}</div><div class="rule"></div>${md(it.desc || it.d || '')}`, {label:it.n}); },
  attune(i){ const c = active(), it = c.inventory[+i];
    if (!it.attuned && c.inventory.filter(x => x.attuned).length >= attuneSlots(c)){ toast(`All ${attuneSlots(c)} attunement slots are in use. End one first.`); return; }
    mut(c2 => { c2.inventory[+i].attuned = !it.attuned; }, false); toast(it.attuned ? `Attuned to ${it.n}.` : `Attunement to ${it.n} ended.`); },
  invCat(k){ G.invCat = k; renderPage(); },
  addTab(k){ G.addTab = k; renderPage(); },
  attack(i){ rollAttack(active().attacks[+i]); },
  gearAttack(i){ const a = gearAttacks(active()).find(x => x.i === +i); if (a) rollAttack(a); },
  addAttack(){ const n = $('#atk_n').value.trim(); if (!n) { toast('Give the attack a name.'); return; } S.atkOpen = true; mut(c => c.attacks.push({n, bonus:num('atk_b'), dmg:$('#atk_d').value.trim() || '1d6', note:''}), false); },
  addWeaponAttack(){ const w = (SRD.equipment || []).find(e => e.n === $('#atk_w').value); if (w) { S.atkOpen = true; mut(c => c.attacks.push(weaponAttack(c, w)), false); } },
  editAttack(i){ const a = active().attacks[+i];
    modal(`<div class="head"><h2>Edit attack</h2><span class="spacer"></span>${closeBtn()}</div>
      <label class="f" for="ea_n">Name</label><input type="text" id="ea_n" value="${esc(a.n)}" style="width:100%" autofocus>
      <div class="fields"><div><label class="f" for="ea_b">Attack bonus</label><input type="number" id="ea_b" value="${+a.bonus || 0}"></div><div><label class="f" for="ea_d">Damage</label><input type="text" id="ea_d" value="${esc(a.dmg || '')}"></div></div>
      <label class="f" for="ea_t">Note</label><input type="text" id="ea_t" value="${esc(a.note || '')}" style="width:100%">
      <div class="row mt">${act('saveAttack', i, 'Save', 'btn')}${act('close', undefined, 'Cancel', 'btn ghost')}</div>`, {label:'Edit attack'}); },
  saveAttack(i){ mut(c => Object.assign(c.attacks[+i], {n:$('#ea_n').value.trim() || c.attacks[+i].n, bonus:num('ea_b'), dmg:$('#ea_d').value.trim(), note:$('#ea_t').value.trim()}), false); closeModal(); },
  delAttack(i){ mut(c => c.attacks.splice(+i, 1), false); },
  addFeat(){ const n = $('#feat_pick').value; mut(c => { if (!hasFeat(c, n)) c.feats.push({n, src:'Added'}); }, false); },
  addFeatCustom(){ const n = $('#feat_custom').value.trim(); if (n) mut(c => c.feats.push({n, src:'Custom', pre:'', d:''}), false); },
  delFeat(i){ mut(c => { const [f] = c.feats.splice(+i, 1); if (f?.auto) c.noAuto = [...new Set([...(Array.isArray(c.noAuto) ? c.noAuto : []), f.n])]; }, false); },
  addClassFeat(){ const n = $('#cf_n').value.trim(); if (n) mut(c => c.classFeats.push(n), false); },
  delClassFeat(i){ mut(c => c.classFeats.splice(+i, 1), false); },
  qty(arg){ const [i, d] = arg.split(':').map(Number); const it = active().inventory[i];
    if ((it.q || 1) + d <= 0) return confirmBox(`Remove ${it.n}?`, 'Remove', () => mut(c => c.inventory.splice(i, 1), false));
    mut(c => { c.inventory[i].q = (it.q || 1) + d; }, false); },
  delItem(i){ mut(c => c.inventory.splice(+i, 1), false); },
  equip(i){ const c = active(), it = c.inventory[+i]; if (!it) return;
    const on = !isEq(it), st = itemStats(it), notes = [];
    mut(c2 => { const x = c2.inventory[+i];
      if (on && (st.kind === 'armor' || st.kind === 'shield')) c2.inventory.forEach((o, j) => { if (j !== +i && isEq(o) && itemStats(o).kind === st.kind){ o.eq = false; if (armorOf(o)) o.worn = false; notes.push(`${o.n} put back in the pack (one ${st.kind === 'shield' ? 'shield' : 'suit of armor'} at a time)`); } });
      x.eq = on; if (armorOf(x)){ if (on) delete x.worn; else x.worn = false; } }, false);
    if (on && st.att && !it.attuned) notes.push('needs attunement before it does anything');
    if (on && st.kind === 'armor' && st.ar.strmin && c.abilities.str < st.ar.strmin) notes.push(`needs Strength ${st.ar.strmin}: your Speed drops by 10 ft.`);
    toast(`${it.n} ${on ? 'equipped' : 'back in the pack'}${notes.length ? ': ' + notes.join('; ') : '.'}`); },
  wear(i){ ACT.equip(i); },
  addXP(v){ mut(c => c.xp = intIn((c.xp || 0) + +v, c.xp || 0, 0, LIM.xp), false); },
  libCat(id){ G.libCat = id; G.libQ = ''; G.libF = {}; G.libSel = null; save(); renderPage(); },
  libPick(id){ G.libSel = id; const d = $('#libDetail'); d.innerHTML = entryCard(byId(id)); $$('#libList [aria-selected="true"]').forEach(b => b.setAttribute('aria-selected', 'false'));
    const b = $(`#libList [data-arg="${CSS.escape(id)}"]`); if (b) b.setAttribute('aria-selected', 'true');
    if (matchMedia('(max-width:980px)').matches) d.scrollIntoView({behavior:'smooth', block:'start'}); },
  async importUrl(){ const u = $('#imp_url').value.trim(); if (!u) return;
    try { const r = await fetch(u); if (!r.ok) throw new Error(r.status); const n = await importJSON(await r.text(), u.split('/').pop().replace(/\.json.*$/i, '')); if (n){ buildIndex(); toast(`Imported ${n} entries.`); renderPage(); } }
    catch (e) { toast('That URL could not be fetched here (blocked or offline). Download the file and choose it instead.'); } },
  async delPack(id){ try { await IDB.del(id); } catch (e) {} PACKS = PACKS.filter(p => p.id !== id); await loadPacks(); buildIndex(); renderPage(); toast('Source removed.'); },
  wizard(){ openWizard(); },
  doWizard(){ doWizard(); },
  duplicate(){ const src = active(), c = JSON.parse(JSON.stringify(src)); LOCAL_FIELDS.concat(['createdAt']).forEach(k => delete c[k]); c.id = uid(); c.owner = me() || undefined;
    c.name = copyName(src); if (!isMine(src)) c.player = S.profile?.display_name || '';
    fixup(c); G.chars.push(c); G.activeId = c.id; save(); render(); toast(`${c.name} is yours to change.`); },
  deleteChar(){ if (G.chars.length <= 1 && !me()){ toast('This is your last hero, so it stays.'); return; }
    confirmBox(`Delete ${active().name}?`, 'Delete hero', () => { const gone = active(); if (me() && gone._rev){ S.tomb.push(gone.id); saveTomb(); }
      G.chars = G.chars.filter(c => c.id !== G.activeId); G.activeId = G.chars[0]?.id || null; save(); render(); toast('Hero deleted.'); }); },
  export(){ const c = active(), txt = JSON.stringify(heroData(c));
    modal(`<div class="head"><h2>Export ${esc(c.name)}</h2><span class="spacer"></span>${closeBtn()}</div><p class="muted">Copy this text, or download it, then use Import on any device.</p>
      <label class="sr" for="expTxt">Character JSON</label><textarea id="expTxt" style="min-height:180px" readonly>${esc(txt)}</textarea>
      <div class="row mt">${act('copyExport', undefined, 'Copy', 'btn small')}${act('downloadChar', undefined, 'Download .json', 'btn small ghost')}</div>
      <h4 class="mt">Back up every hero</h4><p class="muted">One file with all ${backupHeroes().length} of your heroes. Import it on any device to bring them all back.</p>
      <div class="row">${act('exportAll', undefined, `Export all heroes (${backupHeroes().length})`, 'btn small ghost')}</div>`, {label:'Export'}); },
  exportAll(){ const list = backupHeroes(); if (!list.length){ toast('There are no heroes of yours to back up.'); return; }
    const file = {grimoire:'heroes', version:1, exported:new Date().toISOString(), heroes:list.map(heroData)};
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(file, null, 1)], {type:'application/json'}));
    a.download = 'grimoire-heroes-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove();
    toast(`${list.length} hero${list.length === 1 ? '' : 'es'} saved in one file.`); },
  async copyExport(){ const t = $('#expTxt'); try { await navigator.clipboard.writeText(t.value); toast('Copied.'); } catch (e) { t.select(); toast('Selected: press Ctrl+C / ⌘C to copy.'); } },
  downloadChar(){ const c = active(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(heroData(c), null, 2)], {type:'application/json'})); a.download = c.name.replace(/\W+/g, '-') + '.json'; document.body.appendChild(a); a.click(); a.remove(); },
  import(){ modal(`<div class="head"><h2>Import a hero</h2><span class="spacer"></span>${closeBtn()}</div><p class="muted">Paste exported JSON, or choose a .json file. A backup made with "Export all heroes" brings back every hero in it.</p>
      <label class="sr" for="impTxt">Character JSON</label><textarea id="impTxt" style="min-height:160px"></textarea>
      <div class="row mt">${act('doImport', undefined, 'Import', 'btn small')}<label class="btn small ghost" for="impFile">Choose file</label><input type="file" id="impFile" accept=".json" class="sr"></div>`, {label:'Import'});
    $('#impFile').onchange = async e => { const f = e.target.files[0]; if (f){ $('#impTxt').value = await f.text(); ACT.doImport(); } }; },
  doImport(){
    let o; try { o = JSON.parse($('#impTxt').value); } catch (e) {}
    if (Array.isArray(o) || (isObj(o) && Array.isArray(o.heroes))){ importBackup(Array.isArray(o) ? o : o.heroes); return; }
    if (!isObj(o) || o.name == null || o.name === '' || !isObj(o.abilities)){ toast('That is not a hero exported from this tome.'); return; }
    const prev = G.activeId;
    try { LOCAL_FIELDS.concat(['owner', 'createdAt']).forEach(k => delete o[k]); o.id = uid(); G.chars.push(fixup(o)); G.activeId = o.id; render(); }
    catch (e) { console.warn('Import rejected', e); G.chars = G.chars.filter(h => h.id !== o.id); G.activeId = prev; render(); toast('That hero file is damaged, so nothing was imported.'); return; }
    save(); closeModal(); toast(G.saveFailed ? `${o.name} is on the page but could not be saved.` : `${o.name} joins the tome.`, G.saveFailed ? 'fumble' : ''); },
  retrySave(){ save(); toast(G.saveFailed ? 'Still no room: free some space and try again.' : 'Saved. Your heroes are safe again.', G.saveFailed ? 'fumble' : ''); },
  enter(){ const bk = $('#coverBk'); G.showCover = false; if (reduceMotion()){ bk.remove(); welcome(); return; } rustle(); bk.classList.add('opening'); setTimeout(() => { bk.remove(); welcome(); }, 1100); },
  welcome(){ $('#coverBk')?.remove(); welcome(true); },
};
Object.assign(ACT, ACT_EXTRA);
// First-launch letter for beta readers: what the tome is, where it is going, and the Founder offer.
const WELCOME_KEY = 'grimoire-welcome-beta1';
function welcome(force){
  try { if (!force && localStorage.getItem(WELCOME_KEY)) return; localStorage.setItem(WELCOME_KEY, '1'); } catch (e) { if (!force) return; }
  const site = CFG.siteUrl || '';
  modal(`<div class="head"><h2>Welcome to the beta</h2><span class="spacer"></span>${closeBtn()}</div>
    <p>Thank you for opening the tome this early. <b>Grimoire of Heroes</b> is a character sheet that behaves like a book: every hero, spell and rule of the SRD 5.2.1 in one place, working offline, built for the table rather than for forms.</p>
    <h4>What you can do today</h4>
    <ul class="perks"><li>Build heroes with guided level up, spells, gear and notes</li><li>Run fights with the encounter tracker and the dice tray</li><li>Search the whole SRD from any page (Ctrl+K or /)</li><li>Sign in to keep your heroes in sync and share a party</li></ul>
    ${SUBS ? `<h4>Where it is going</h4>
    <p>The tome stays free: unlimited heroes on your device, the full SRD and the combat tools. After the beta, <b>Grimoire<span class="plus">+</span></b> (${esc(PRICES.monthly)} or ${esc(PRICES.yearly)}) will add sync of every hero, hero history, parties, the printable sheet and themes. During the beta all of it is free.</p>
    <div class="planBox founder" style="margin:12px 0"><span class="tag">First 100 only</span><b>Founder</b><span>${esc(PRICES.founder)}: Grimoire<span class="plus">+</span> for life, for the readers who believe in the tome first.</span></div>` : `<h4>Free, all of it</h4>
    <p>The whole tome is free for everyone: unlimited heroes, sync between your devices, hero history, parties, the printable sheet, night pages and homebrew. There is no subscription.${DONATE ? ' If the tome earns a place at your table and you want to help HighBrew keep it growing, you can buy us a coffee.' : ''}</p>`}
    <p class="muted small">This is a beta: things can break. Export heroes you care about, and tell HighBrew what to fix.${LEGAL ? ` <a href="${LEGAL}" target="_blank" rel="noopener">Terms and privacy</a>.` : ''}</p>
    <div class="row mt">${act('close', undefined, 'Start writing', 'btn')}${!SUBS ? coffee('btn ghost') : CLOUD ? act('plus', undefined, 'See the Founder plan', 'btn ghost') : site ? `<span class="muted small">Founder plans open on <b>${esc(site)}</b></span>` : ''}</div>`, {label:'Welcome to the beta'});
}
function refreshAfterModalAction(){
  const m = $('#modalBk .modal'); const h = m?.querySelector('h2')?.textContent;
  renderPage();
  if (m && h){ const e = find(h); if (e) showEntry(e); }
  else if (G.chapter === 'library' && G.libSel) ACT.libPick(G.libSel);
}
function syncTray(){
  $$('[data-act="adv"]').forEach(b => b.setAttribute('aria-pressed', String(G.adv === +b.dataset.arg)));
  $('#soundBtn')?.setAttribute('aria-pressed', String(!!G.sound));
}

/* ---- new hero ---- */
function openWizard(){
  modal(`<div class="head"><h2>Summon a new hero</h2><span class="spacer"></span>${closeBtn()}</div>
    <label class="f" for="w_name">Name</label><input type="text" id="w_name" maxlength="80" value="Bryn the Bold" style="width:100%" autofocus>
    <div class="fields">
      <div><label class="f" for="w_p">Portrait</label><select id="w_p">${PORTRAITS.map(e => opt(e, '')).join('')}</select></div>
      <div><label class="f" for="w_s">Species</label><select id="w_s">${names('species').map(s => opt(s, 'Human')).join('')}</select></div>
      <div><label class="f" for="w_b">Background</label><select id="w_b">${names('backgrounds').map(s => opt(s, 'Soldier')).join('')}</select></div>
      <div><label class="f" for="w_c">Class</label><select id="w_c">${names('classes').map(s => opt(s, 'Fighter')).join('')}</select></div>
      <div><label class="f" for="w_l">Level</label><input type="number" id="w_l" value="1" min="1" max="20"></div>
      <div><label class="f" for="w_a">Ability scores</label><select id="w_a"><option value="std">Standard array (15, 14, 13, 12, 10, 8)</option><option value="roll">Roll 4d6, drop lowest</option><option value="avg">All 12s</option></select></div>
    </div>
    <p class="muted">Scores go to your class's key abilities first. Then add your background's +2/+1 on the Attributes page.</p>
    <div class="row mt">${act('doWizard', undefined, 'Inscribe hero', 'btn')}${act('close', undefined, 'Cancel', 'btn ghost')}</div>`, {label:'New hero'});
}
const rollStat = () => { const r = [1,2,3,4].map(() => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b); return r[1] + r[2] + r[3]; };
const PRIORITY = {Barbarian:'str con dex wis cha int',Fighter:'str con dex wis cha int',Paladin:'str cha con wis dex int',Ranger:'dex wis con str cha int',Rogue:'dex int wis cha con str',Monk:'dex wis con str cha int',Bard:'cha dex con wis int str',Cleric:'wis con str cha dex int',Druid:'wis con dex int cha str',Sorcerer:'cha con dex wis int str',Warlock:'cha con dex wis int str',Wizard:'int con dex wis cha str'};
function doWizard(){
  const style = $('#w_a').value, cls = $('#w_c').value;
  const arr = style === 'std' ? [15,14,13,12,10,8] : style === 'roll' ? Array.from({length:6}, rollStat) : [12,12,12,12,12,12];
  const pri = (PRIORITY[cls] || 'str dex con int wis cha').split(' ');
  const sorted = [...arr].sort((a, b) => b - a), abilities = {};
  pri.forEach((ab, i) => abilities[ab] = sorted[i]);
  const bgE = find($('#w_b').value, 'backgrounds'), bg = bgE?.o || {};
  const c = fixup({id:uid(), owner:me() || undefined, player:S.profile?.display_name || '', portrait:$('#w_p').value, name:$('#w_name').value.trim() || 'Nameless', class:cls, subclass:'', level:clamp(Math.round(+$('#w_l').value) || 1, 1, 20),
    species:$('#w_s').value, background:$('#w_b').value, alignment:'True Neutral', xp:0, inspiration:false, abilities, hp:{cur:10,max:10,temp:0},
    feats:bg.feat ? [{n:bg.feat, src:'Background'}] : [], inventory:[{n:'Traveler’s Clothes',q:1,d:''},{n:'Rations',q:5,d:''},{n:'Pouch',q:1,d:''}], currency:{cp:0,sp:0,ep:0,gp:15,pp:0}});
  c.xp = XP_TABLE[c.level - 1];
  (clsInfo(c).saves || []).forEach(s => { const id = ABIL_ID[String(s).toLowerCase()]; if (id) c.saves[id] = 1; });
  (bg.skills || []).forEach(s => { const f = SKILLS.find(k => norm(k.n) === norm(s)); if (f) c.skills[f.id] = 1; });
  const hd = hdSize(c), con = mod(abilities.con);
  c.hp.max = Math.max(1, hd + con + (c.level - 1) * Math.max(1, Math.floor(hd / 2) + 1 + con)); c.hp.cur = c.hp.max;
  c.spellAbility = SPELL_AB[cls] || 'int';
  G.chars.push(c); G.activeId = c.id; closeModal(); save(); render(); toast(G.saveFailed ? `${c.name} is on the page but could not be saved.` : `${c.name} joins the tome.`, G.saveFailed ? 'fumble' : '');
  if (G.chapter !== 'hero') turnTo('hero');
}

/* ================================================================== accounts & sync (Supabase, plain REST, no library)
   Local-first: every device keeps its own copy and works offline; when signed in, own heroes are pushed and
   everyone's visible heroes (own + party members') are pulled. Conflicts resolve by the latest edit time.
   Party members' heroes are read-only here; the database enforces the same with row-level security. */
const CFG = window.GRIMOIRE_CONFIG || {};
const CLOUD = !!(CFG.supabaseUrl && CFG.supabaseKey && /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)[:/])/.test(CFG.supabaseUrl) && !/YOUR-PROJECT/.test(CFG.supabaseUrl));
const SESS_KEY = 'grimoire-session-v1';
const S = {session:null, profile:null, parties:[], members:[], status:CLOUD ? 'out' : 'local', lastSync:0, tomb:[], busy:null, err:'', bill:null};
try { S.session = JSON.parse(localStorage.getItem(SESS_KEY) || 'null'); } catch (e) {}
const me = () => S.session?.user?.id || null;
const isMine = c => !c || !me() || !c.owner || c.owner === me();
const heroKey = () => me() ? KEY + ':' + me() : KEY;
const tombKey = () => 'grimoire-tomb-v1:' + me();
const deviceName = () => /iPad/.test(navigator.userAgent) || /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1 ? 'iPad'
  : /iPhone/.test(navigator.userAgent) ? 'iPhone' : /Android/.test(navigator.userAgent) ? 'Android' : /Windows/.test(navigator.userAgent) ? 'Windows PC' : /Mac/.test(navigator.userAgent) ? 'Mac' : 'browser';
const LOCAL_FIELDS = ['_sig', '_dirty', '_rev', '_blocked', 'ownerName', 'updatedAt', 'editedOn'];
/* Backups (B-015): every hero of yours in one file; importing it adds them as new heroes, skipping exact copies already in the tome. */
const backupHeroes = () => G.chars.filter(c => isMine(c));
/* B-024: a copy gets a name no other hero has, within the 80-character limit fixup keeps: "X (copy)", "X (copy 2)"…
   Copying a copy numbers it again instead of piling up "(copy) (copy)". */
function copyName(src){
  const mine = isMine(src), who = String(src.ownerName || 'party').slice(0, 30);
  const base = String(src.name || 'Nameless').replace(/ \(copy(?: \d+)?(?: of .*'s)?\)$/, '') || 'Nameless';
  const taken = new Set(G.chars.map(c => c.name));
  for (let i = 1; ; i++){
    const n = i === 1 ? '' : ' ' + i, tag = mine ? ` (copy${n})` : ` (copy${n} of ${who}'s)`;
    const name = (base.slice(0, 80 - tag.length).trimEnd() || 'Nameless') + tag;
    if (!taken.has(name)) return name;
  }
}
const sameHeroKey = c => { const o = heroData(c); ['id', 'owner', 'createdAt'].forEach(k => delete o[k]); return sigHash(JSON.stringify(o)); };
function importBackup(list){
  // B-024: count copies, so two identical heroes in the file both come back; only as many as the tome already holds are skipped.
  const have = new Map(), prev = G.activeId, added = [];
  for (const c of G.chars){ const k = sameHeroKey(c); have.set(k, (have.get(k) || 0) + 1); }
  let bad = 0, same = 0;
  for (const raw of list){
    if (!isObj(raw) || raw.name == null || raw.name === '' || !isObj(raw.abilities)){ bad++; continue; }
    let h; try { h = JSON.parse(JSON.stringify(raw)); LOCAL_FIELDS.concat(['owner', 'createdAt']).forEach(k => delete h[k]); h.id = uid(); fixup(h); }
    catch (e) { console.warn('Backup hero rejected', e); bad++; continue; }
    const k = sameHeroKey(h), n = have.get(k) || 0; if (n > 0){ have.set(k, n - 1); same++; continue; }
    added.push(h);
  }
  if (!added.length){ toast(same ? `Every hero in that file is already in the tome${bad ? `; ${bad} damaged entr${bad === 1 ? 'y' : 'ies'} skipped` : ''}.` : 'That file has no heroes this tome can read.', same ? '' : 'fumble'); if (same) closeModal(); return; }
  try { G.chars.push(...added); G.activeId = added[0].id; render(); }
  catch (e) { console.warn('Backup import rejected', e); const ids = new Set(added.map(h => h.id)); G.chars = G.chars.filter(h => !ids.has(h.id)); G.activeId = prev; render(); toast('That backup is damaged, so nothing was imported.', 'fumble'); return; }
  save(); closeModal();
  const extra = [same && `${same} already here`, bad && `${bad} damaged skipped`].filter(Boolean).join(', ');
  const n = `${added.length} hero${added.length === 1 ? '' : 'es'}`;
  toast(G.saveFailed ? `${n} on the page but not saved: no room on this device.` : `${n} back in the tome${extra ? ` (${extra})` : ''}.`, G.saveFailed ? 'fumble' : '');
}
const heroData = c => { const o = {}; for (const k in c) if (!LOCAL_FIELDS.includes(k)) o[k] = c[k]; return o; };
/* _sig is a short fingerprint of the hero's data (two 53-bit cyrb53 hashes), not a second copy of the hero:
   it only answers "did this hero change?". Saves made before kept the whole hero as text (starting with "{"):
   normSig turns those into the same fingerprint, so an unchanged hero still looks unchanged. */
function cyrb53(s, seed){
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < s.length; i++){ ch = s.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
const sigHash = s => 's' + cyrb53(s, 0) + '.' + cyrb53(s, 1);
const normSig = x => typeof x === 'string' && x.startsWith('{') ? sigHash(x) : x;
const sigOf = c => sigHash(JSON.stringify(heroData(c)));
// called from save(): own heroes that changed since the last look get a fresh edit stamp and wait to be pushed
function stampHeroes(){
  for (const c of G.chars){
    if (!isMine(c)) continue;
    if (me() && !c.owner) c.owner = me();
    if (me() && !c.player && S.profile?.display_name) c.player = S.profile.display_name;
    const sig = sigOf(c);
    if (sig !== c._sig){ c._sig = sig; c.updatedAt = Date.now(); c.editedOn = deviceName(); if (me()) c._dirty = true; if (!c.createdAt) c.createdAt = c.updatedAt; }
  }
  if (me()) schedulePush();
}

/* ---- HTTP ---- */
const API = p => CFG.supabaseUrl.replace(/\/+$/, '') + p;
const redirectUrl = () => /^https:/.test(location.protocol) ? location.origin + location.pathname : (CFG.siteUrl || '');
function saveSession(s){ S.session = s; try { s ? localStorage.setItem(SESS_KEY, JSON.stringify(s)) : localStorage.removeItem(SESS_KEY); } catch (e) {} }
function takeSession(j){ saveSession({access_token:j.access_token, refresh_token:j.refresh_token, expires_at:Date.now() + (j.expires_in || 3600) * 1000, user:{id:j.user.id, email:j.user.email}}); }
async function authCall(path, body, method = 'POST'){
  const h = {apikey:CFG.supabaseKey, 'Content-Type':'application/json'};
  if (S.session && /^\/user/.test(path)) h.Authorization = 'Bearer ' + S.session.access_token;
  const r = await fetch(API('/auth/v1' + path), {method, headers:h, body:body ? JSON.stringify(body) : undefined});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.msg || j.error_description || j.message || j.error || ('HTTP ' + r.status));
  return j;
}
let refreshing = null;
async function refresh(){
  if (!S.session?.refresh_token) throw new Error('signed out');
  refreshing = refreshing || authCall('/token?grant_type=refresh_token', {refresh_token:S.session.refresh_token}).then(takeSession).finally(() => refreshing = null);
  return refreshing;
}
async function db(path, {method = 'GET', body, prefer} = {}, retry = true){
  if (!S.session) throw new Error('signed out');
  if (S.session.expires_at - 60000 < Date.now()) await refresh();
  const h = {apikey:CFG.supabaseKey, Authorization:'Bearer ' + S.session.access_token, 'Content-Type':'application/json'};
  if (prefer) h.Prefer = prefer;
  const r = await fetch(API('/rest/v1' + path), {method, headers:h, body:body ? JSON.stringify(body) : undefined});
  if (r.status === 401 && retry){ await refresh(); return db(path, {method, body, prefer}, false); }
  const t = await r.text(), j = t ? JSON.parse(t) : null;
  if (!r.ok) throw new Error(j?.message || ('HTTP ' + r.status));
  return j;
}

async function db0(path){
  try { const r = await fetch(API('/rest/v1' + path), {method:'POST', headers:{apikey:CFG.supabaseKey, 'Content-Type':'application/json'}, body:'{}'}); return r.ok ? r.json() : null; } catch (e) { return null; }
}

/* ---- sync ---- */
let pushT = null;
function schedulePush(){ clearTimeout(pushT); pushT = setTimeout(() => sync(), 1500); }
function setStatus(s, err = ''){ S.status = s; S.err = err; syncBadge(); }
async function sync(){
  if (!CLOUD || !me()) return;
  if (S.busy) return S.busy.then(() => sync());
  if (!navigator.onLine){ setStatus('offline'); return; }
  setStatus('syncing');
  S.busy = (async () => {
    try {
      await push();
      await pull();
      await syncBrew();
      await syncNpc();
      await flushTickets().catch(() => {});
      S.lastSync = Date.now(); setStatus('synced');
    } catch (e) {
      if (/signed out|invalid.*(token|grant)|refresh/i.test(e.message)){ setStatus('expired', e.message); }
      else setStatus(navigator.onLine ? 'error' : 'offline', e.message);
    }
  })();
  await S.busy; S.busy = null;
}
const QUOTA = /grimoire_plus_required/;
async function push(){
  const dirty = G.chars.filter(c => isMine(c) && c._dirty && !(c._blocked && !plusOK()));
  if (!dirty.length && !S.tomb.length) return;
  const sent = new Map(dirty.map(c => [c.id, c._sig]));
  const rows = dirty.map(c => ({id:c.id, owner:me(), data:{...heroData(c), updatedAt:c.updatedAt, editedOn:c.editedOn}, deleted:false}))
    .concat(S.tomb.map(id => ({id, owner:me(), data:{}, deleted:true})));
  const send = body => db('/heroes?on_conflict=id', {method:'POST', body, prefer:'resolution=merge-duplicates,return=representation'});
  let out;
  try { out = await send(rows); }
  catch (e) {
    if (!QUOTA.test(e.message)) throw e;
    // free account over its one cloud hero: send one by one, keep the refused ones on this device
    out = [];
    for (const row of rows){
      try { out.push(...(await send([row]) || [])); }
      catch (e2) { if (!QUOTA.test(e2.message)) throw e2; const c = G.chars.find(x => x.id === row.id); if (c && !c._blocked){ c._blocked = true; S.newlyBlocked = true; } }
    }
  }
  for (const r of out || []){
    const c = G.chars.find(x => x.id === r.id);
    if (c){ c._rev = r.updated_at; c._blocked = false; if (c._sig === sent.get(c.id)) c._dirty = false; }
  }
  S.tomb = []; saveTomb(); writeLocal();
  if (S.newlyBlocked){ S.newlyBlocked = false; toast('Free accounts keep one hero in the cloud. The others stay safe on this device; Grimoire+ syncs them all.'); }
}
async function pull(){
  const [rows, profiles, links, bill] = await Promise.all([
    db('/heroes?select=id,owner,data,deleted,updated_at'),
    db('/profiles?select=id,display_name'),
    db('/party_members?select=party_id,user_id,parties(id,name,code,created_by,active)'),
    db('/rpc/billing_info', {method:'POST', body:{}}).catch(() => null),
  ]);
  if (bill) setBill(bill);
  const names = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name]));
  S.profile = (profiles || []).find(p => p.id === me()) || S.profile;
  const pmap = {};
  for (const l of links || []) if (l.parties) pmap[l.party_id] = l.parties;
  S.parties = Object.values(pmap);
  S.members = (links || []).filter(l => l.user_id !== me()).map(l => ({id:l.user_id, party:l.party_id, name:names[l.user_id] || 'Player'}));
  const local = new Map(G.chars.map(c => [c.id, c])), seen = new Set(), next = [];
  for (const r of rows || []){
    seen.add(r.id);
    const l = local.get(r.id), rTime = r.data?.updatedAt || 0;
    const keepLocal = l && isMine(l) && l._dirty && (l.updatedAt || 0) > rTime;
    if (r.deleted){ if (keepLocal) next.push(l); continue; }
    if (keepLocal){ l._rev = r.updated_at; next.push(l); continue; }
    const h = fixup({...r.data, id:r.id, owner:r.owner});
    if (l?._blocked) h._blocked = false;
    h._rev = r.updated_at; h.updatedAt = rTime; h.editedOn = r.data.editedOn; h._sig = sigOf(h); h._dirty = false;
    next.push(h);
  }
  for (const c of G.chars) if (!seen.has(c.id) && isMine(c) && (c._dirty || !c._rev || c._blocked)) next.push(c);
  next.forEach(c => c.ownerName = c.owner === me() ? (S.profile?.display_name || 'You') : (names[c.owner] || 'Party member'));
  next.sort((a, b) => (a.owner === me() ? 0 : 1) - (b.owner === me() ? 0 : 1) || (a.createdAt || 0) - (b.createdAt || 0));
  const changed = JSON.stringify(next.map(c => [c.id, c._rev, c._sig])) !== JSON.stringify(G.chars.map(c => [c.id, c._rev, c._sig]));
  G.chars = next;
  if (!G.chars.some(c => c.id === G.activeId)) G.activeId = G.chars[0]?.id || null;
  writeLocal();
  if (changed){ if (!G.turning && !$('#modalBk') && !isTyping()) render(); else G.needRender = true; }
}
const isTyping = () => /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) && !!document.activeElement.closest('#page');
/* ---- several tabs on one device (B-002) ----
   Every tab keeps the whole hero list in memory and writes it whole. To stop one tab wiping heroes made in another,
   each tab remembers the list it last read or wrote (the base). When the stored list changes under it, the two are
   merged by hero id: heroes that are new on either side are kept, heroes that were in the base and are gone on one
   side were deleted there, and a hero changed on both sides keeps its latest edit, with a warning. */
let baseRaw = null, baseSig = new Map();
function markBase(raw){
  baseRaw = raw; baseSig = new Map();
  try { (JSON.parse(raw || 'null')?.chars || []).forEach(c => { if (isObj(c) && c.id) baseSig.set(c.id, normSig(c._sig) || ''); }); } catch (e) {}
}
function mergeStored(raw){
  let data = null; try { data = JSON.parse(raw); } catch (e) {}
  if (!isObj(data) || !Array.isArray(data.chars)) return {changed:false, clash:[]};
  const fresh = baseRaw == null && !G.chars.some(c => c.createdAt);   // this tab never saved: only untouched samples to lose
  const theirs = new Map(data.chars.filter(c => isObj(c) && c.id).map(c => [c.id, {...c, _sig:normSig(c._sig)}])), clash = [], next = [];
  let changed = false;
  for (const c of fresh ? [] : G.chars){
    const t = theirs.get(c.id);
    if (!t){ if (baseSig.has(c.id)) changed = true; else next.push(c); continue; }   // deleted in the other tab, or new here
    theirs.delete(c.id);
    if (t._sig === c._sig){ next.push(c); continue; }
    const mineChanged = c._sig !== baseSig.get(c.id), theirsChanged = t._sig !== baseSig.get(c.id);
    if (mineChanged && theirsChanged) clash.push(c.name);
    if (mineChanged && (!theirsChanged || (c.updatedAt || 0) > (t.updatedAt || 0))){ next.push(c); continue; }
    let h; try { h = fixup(t); h._sig = t._sig; } catch (e) { next.push(c); continue; }
    next.push(h); changed = true;
  }
  for (const t of theirs.values()){                       // new in the other tab (or deleted here, if it was in the base)
    if (!fresh && baseSig.has(t.id)) continue;
    try { const h = fixup(t); h._sig = t._sig; next.push(h); changed = true; } catch (e) {}
  }
  if (fresh) changed = true;
  G.chars = next;
  if (!G.chars.some(c => c.id === G.activeId)) G.activeId = (fresh && data.activeId) || G.chars[0]?.id || null;
  return {changed, clash};
}
const renderSoon = () => { if (G.needRender && !G.turning && !$('#modalBk') && !isTyping()){ G.needRender = false; setTimeout(render, 0); } };
function otherTabSaved(e){
  if (e.storageArea !== localStorage || e.key !== heroKey() || e.newValue == null || e.newValue === baseRaw) return;
  const r = mergeStored(e.newValue); markBase(e.newValue);
  if (r.clash.length) toast(`${r.clash.join(', ')} changed in another tab too: the latest edit is kept.`, 'fumble');
  if (r.changed){ G.needRender = true; renderSoon(); }
}
addEventListener('storage', otherTabSaved);
document.addEventListener('focusout', () => setTimeout(renderSoon, 0));
function writeLocal(){
  try {
    const now = localStorage.getItem(heroKey());   // another tab wrote since we last looked (and its event has not arrived yet)
    if (now != null && now !== baseRaw){ const r = mergeStored(now); if (r.clash.length) toast(`${r.clash.join(', ')} changed in another tab too: the latest edit is kept.`, 'fumble'); if (r.changed) G.needRender = true; }
  } catch (e) {}
  const raw = JSON.stringify({chars:G.chars, activeId:G.activeId});
  try { localStorage.setItem(heroKey(), raw); G.saveFailed = false; markBase(raw); }
  catch (e) { console.warn('Hero save failed', e); G.saveFailed = true; }
  saveWarn(); if (G.needRender) setTimeout(renderSoon, 0); return !G.saveFailed;
}
/* A failed save stays on screen until a save succeeds: toasts never cover or replace it. */
function saveWarn(){
  let w = $('#saveWarn');
  if (!G.saveFailed){ w?.remove(); return; }
  if (w) return;
  w = document.createElement('div'); w.id = 'saveWarn'; w.className = 'toast fumble'; w.setAttribute('role', 'alert');
  w.style.cssText = 'top:auto;bottom:max(12px, env(safe-area-inset-bottom, 0px));z-index:96;width:min(640px, 92vw)';
  w.innerHTML = `<b>Not saved.</b> This device is out of storage space for the tome, so your latest changes will be lost when you close the page. Export your heroes, delete ones you no longer need, then ${act('retrySave', undefined, 'Try again', 'btn small')} ${act('exportAll', undefined, 'Export all heroes', 'btn small ghost')}`;
  document.body.appendChild(w);
}
function saveTomb(){ try { localStorage.setItem(tombKey(), JSON.stringify(S.tomb)); } catch (e) {} }
function loadTomb(){ try { S.tomb = JSON.parse(localStorage.getItem(tombKey()) || '[]'); } catch (e) { S.tomb = []; } }

/* ---- signing in & out ---- */
async function afterSignIn(name, before){
  S.brewOff = false; loadTomb(); loadBill();
  const mine = await db('/profiles?select=id,display_name&id=eq.' + me());
  S.profile = mine?.[0] || null;
  if (!S.profile || (name && name !== S.profile.display_name)){
    const rows = await db('/profiles?on_conflict=id', {method:'POST', body:[{id:me(), display_name:name || S.profile?.display_name || S.session.user.email.split('@')[0]}], prefer:'resolution=merge-duplicates,return=representation'});
    S.profile = rows?.[0] || S.profile;
  }
  await switchStore();
  await sync();
  offerMigration(before);
}
async function switchStore(){
  let data = null;
  try { data = JSON.parse(localStorage.getItem(heroKey()) || 'null'); } catch (e) {}
  G.chars = (data?.chars || []).map(fixup); G.activeId = data?.activeId || G.chars[0]?.id || null;
  try { markBase(data?.chars ? localStorage.getItem(heroKey()) : null); } catch (e) { markBase(null); }
  render(); syncBadge();
}
function offerMigration(before){
  const flag = 'grimoire-migrated-v1:' + me();
  if (localStorage.getItem(flag)) return;
  let local = null; try { local = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  const heroes = (local?.chars || before || []).filter(c => !G.chars.some(x => x.id === c.id));
  try { localStorage.setItem(flag, '1'); } catch (e) {}
  if (!heroes.length) return;
  modal(`<div class="head"><h2>Bring your heroes along?</h2><span class="spacer"></span>${closeBtn()}</div>
    <p>This device has <b>${heroes.length}</b> hero${heroes.length > 1 ? 'es' : ''} saved without an account: ${heroes.map(c => esc(c.name)).join(', ')}.</p>
    <p class="muted">Pick the ones that are yours. They move into your account and appear on every device you sign in with. Skipped heroes stay on this device, in “no account” mode.</p>
    <div class="stack" style="gap:6px">${heroes.map(c => `<label class="row"><input type="checkbox" class="migr" value="${esc(c.id)}" ${/Valeria Thorne|Eldrin Moonwhisper|Kessa Quickpaw/.test(c.name) ? '' : 'checked'}> ${portrait(c, 'mini')} <b>${esc(c.name)}</b> <span class="muted">level ${c.level} ${esc(c.class)}</span></label>`).join('')}</div>
    <div class="row mt">${act('migrate', undefined, 'Move into my account', 'btn')}${act('close', undefined, 'Not now', 'btn ghost')}</div>`, {label:'Bring heroes along'});
  G.migrCands = heroes;
}
function signOut(){
  try { if (S.session) fetch(API('/auth/v1/logout'), {method:'POST', headers:{apikey:CFG.supabaseKey, Authorization:'Bearer ' + S.session.access_token}}).catch(() => {}); } catch (e) {}
  saveSession(null); S.profile = null; S.parties = []; S.members = []; S.bill = null; setStatus('out');
  load().then(render);
}
// links from confirmation and password-reset mails land here with the session in the URL fragment
function readAuthRedirect(){
  if (!CLOUD || !/access_token=/.test(location.hash)) return null;
  const q = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, '', location.pathname + location.search);
  if (!q.get('access_token')) return null;
  const tok = q.get('access_token'), payload = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  saveSession({access_token:tok, refresh_token:q.get('refresh_token'), expires_at:Date.now() + (+q.get('expires_in') || 3600) * 1000, user:{id:payload.sub, email:payload.email}});
  return q.get('type') || 'signin';
}

/* ---- UI ---- */
const STATUS_TXT = {local:'On this device only', out:'Not signed in', synced:'Synced', syncing:'Syncing…', offline:'Offline: changes wait on this device', error:'Sync problem', expired:'Sign in again'};
function syncBadge(){
  const b = $('#cloudBtn'); if (!b) return;
  b.hidden = !CLOUD; if (!CLOUD) return;
  b.dataset.state = S.status;
  b.title = STATUS_TXT[S.status] + (S.err ? ': ' + S.err : '');
  $('#cloudName').textContent = me() ? (S.profile?.display_name || S.session.user.email) : 'Sign in';
}
/* ---- Grimoire+ ----
   The server decides (sync quota, parties, history): see supabase/schema.sql. The app only mirrors it to explain
   what is locked, and gates the two purely local extras (PDF sheet, night pages) on the same answer. */
// For now the tome is free for everyone, with no subscription. Set subscriptions:true in config.js to bring Grimoire+ back
// (and turn the paywall on in app_settings); everything below still works as it did.
const SUBS = CFG.subscriptions === true;
// "Buy me a coffee": the donation link appears only when donateUrl (config.js) holds an https address.
const DONATE = /^https:\/\/\S+$/i.test(CFG.donateUrl || '') ? CFG.donateUrl : '';
const coffee = (cls = 'sb') => DONATE ? `<a class="${cls} coffee" href="${esc(DONATE)}" target="_blank" rel="noopener">☕ Buy HighBrew a coffee</a>` : '';
{ const cc = document.getElementById('coverCoffee'); if (cc && DONATE) cc.innerHTML = ` · <a href="${esc(DONATE)}" target="_blank" rel="noopener">buy us a coffee</a>`; }
const PRICES = Object.assign({monthly:'€1.99 / month', yearly:'€14.99 / year', founder:'€24.99 once'}, CFG.prices || {});
const BILL_KEY = 'grimoire-bill-v1';
function setBill(b){
  const was = plusOK(); S.bill = b;
  // just became Grimoire+ (bought on another device, or the webhook was slower than the return): send the waiting heroes
  if (!was && plusOK() && G.chars.some(c => c._blocked)){ G.chars.forEach(c => { if (c._blocked){ c._blocked = false; c._dirty = true; } }); schedulePush(); }
  try { localStorage.setItem(BILL_KEY, JSON.stringify({paywall:!!b.paywall})); if (me()) localStorage.setItem(BILL_KEY + ':' + me(), JSON.stringify(b)); } catch (e) {} }
function loadBill(){ try { S.bill = JSON.parse(localStorage.getItem(BILL_KEY + ':' + me()) || 'null'); } catch (e) { S.bill = null; } }
const paywallOn = () => { if (S.bill) return !!S.bill.paywall; try { return !!JSON.parse(localStorage.getItem(BILL_KEY) || '{}').paywall; } catch (e) { return false; } };
const plusOK = () => !SUBS || !CLOUD || !paywallOn() || !!(me() && S.bill?.plus);
const PLUS_WHY = {pdf:'The printable sheet and PDF are part of Grimoire+.', themes:'Night pages and the other themes are part of Grimoire+.',
  history:'Grimoire+ keeps a history of every hero, so you can bring back yesterday\'s sheet.', party:'Creating a party is part of Grimoire+. Joining one is free for everybody.',
  sync:'A free account keeps one hero in the cloud. Grimoire+ syncs all of them, on every device.',
  brew:`The free plan holds ${FREE_BREW} homebrew creations. Grimoire+ makes Homebrew unlimited.`};
async function billing(body){
  if (S.session.expires_at - 60000 < Date.now()) await refresh();
  const r = await fetch(API('/functions/v1/billing'), {method:'POST', headers:{apikey:CFG.supabaseKey, Authorization:'Bearer ' + S.session.access_token, 'Content-Type':'application/json'},
    body:JSON.stringify({returnUrl:redirectUrl(), ...body})});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error({founder_sold_out:'The 100 founder places are all taken.', already_lifetime:'You already have Grimoire+ for life.', no_customer:'There is no payment to manage yet.'}[j.error] || j.error || ('HTTP ' + r.status));
  return j;
}
// payment pages open in the browser tab; the desktop app has no browser of its own, so it sends you to the web tome
const IN_EXE = location.port === '52474';
const LEGAL = CFG.legalUrl || (CFG.siteUrl ? CFG.siteUrl.replace(/\/?$/, '/') + 'legal.html' : /^https?:$/.test(location.protocol) ? 'legal.html' : '');
function openPay(url){ location.href = url; }
function exePayModal(){
  const site = CFG.siteUrl || '';
  modal(`<div class="head"><h2>Grimoire<span class="plus">+</span> from the web tome</h2><span class="spacer"></span>${closeBtn()}</div>
    <p>Payments open in your browser. Go to ${site ? `<b>${esc(site)}</b>` : 'the web version of the tome'}, sign in with this same account and choose Grimoire+ from the account page.</p>
    <p class="muted">The plan belongs to your account, so this app unlocks by itself a moment later.</p>
    <div class="row mt">${site ? `<button type="button" class="btn ghost" id="copySite">Copy the address</button>` : ''}${act('syncNow', undefined, 'I have paid: check now', 'btn')}</div>`, {label:'Grimoire+'});
  $('#copySite')?.addEventListener('click', () => navigator.clipboard?.writeText(site).then(() => toast('Address copied.'), () => toast(site)));
}
function plusModal(why){
  const b = S.bill || {}, left = b.founder_left ?? 0;
  const perks = ['Every hero synced between PC, tablet and phone', 'History of each hero: restore an earlier sheet', 'Create a party: your companions join free and read each other\'s heroes', 'Printable sheet and PDF', 'Night pages and themes', 'Unlimited homebrew'];
  const buy = (plan, label, cls) => me() ? act('checkout', plan, label, cls) : '';
  modal(`<div class="head"><h2>Grimoire<span class="plus">+</span></h2><span class="spacer"></span>${closeBtn()}</div>
    ${why && PLUS_WHY[why] ? `<p><b>${esc(PLUS_WHY[why])}</b></p>` : ''}
    <ul class="perks">${perks.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="muted">Free forever: unlimited heroes on this device, the whole SRD, the combat tracker, guided level up, export and import.</p>
    ${me() ? `<div class="plans">
      <div class="planBox best"><span class="tag">Best value</span><b>Yearly</b><span>${esc(PRICES.yearly)}</span>${buy('yearly', 'Choose yearly', 'btn')}</div>
      <div class="planBox"><b>Monthly</b><span>${esc(PRICES.monthly)}</span>${buy('monthly', 'Choose monthly', 'btn ghost')}</div>
      ${left > 0 ? `<div class="planBox founder"><span class="tag">${left} of 100 left</span><b>Founder</b><span>${esc(PRICES.founder)} · for life</span>${buy('founder', 'Become a founder', 'btn ghost')}</div>` : ''}
    </div>
    <p class="muted small">Payments are handled by Stripe (sold through Link), which takes care of VAT and receipts. Cancel any time from your account.${LEGAL ? ` <a href="${LEGAL}" target="_blank" rel="noopener">Terms and privacy</a>.` : ''}</p><p id="acMsg" class="muted"></p>`
    : `<div class="row mt">${act('account', 'up', 'Create a free account first', 'btn')}${act('account', 'in', 'Sign in', 'btn ghost')}</div>`}`, {label:'Grimoire+'});
}
function planLine(){
  const b = S.bill;
  if (!SUBS) return `<p><b>Free</b> · every feature, for everyone, with no subscription.</p>${DONATE || b?.can_manage ? `<div class="row">${coffee()}${b?.can_manage ? act('manage', undefined, 'Payments', 'sb') : ''}</div>` : ''}`;
  if (!b) return '<p class="muted">Plan: checking…</p>';
  if (!b.paywall) return '<p><b>Grimoire+ beta</b> · every feature is free while the tome is in beta.</p>';
  const d = b.period_end ? new Date(b.period_end).toLocaleDateString() : '';
  if (b.plus) return `<p><b>Grimoire<span class="plus">+</span></b> · ${b.plan === 'founder' ? 'Founder, for life' : b.plan === 'gift' ? 'gift' : b.plan === 'yearly' ? 'yearly' : 'monthly'}${b.status === 'past_due' ? ' · <span class="warn">payment failed, please update your card</span>' : d ? (b.cancel_at_period_end ? ' · ends on ' : ' · renews on ') + d : ''}</p>
    ${b.can_manage ? `<div class="row">${act('manage', undefined, 'Manage subscription', 'sb')}</div>` : ''}`;
  return `<p><b>Free plan</b> · one hero in the cloud, unlimited heroes on this device.</p><div class="row">${act('plus', undefined, 'See Grimoire+', 'btn small')}${b.can_manage ? act('manage', undefined, 'Payments', 'sb') : ''}</div>`;
}
async function historyModal(c){
  modal(`<div class="head"><h2>History · ${esc(c.name)}</h2><span class="spacer"></span>${closeBtn()}</div><p class="muted" id="hiList">Loading…</p>`, {label:'Hero history'});
  try {
    const rows = await db(`/hero_history?hero_id=eq.${encodeURIComponent(c.id)}&select=id,saved_at,lv:data->level,hp:data->hp->cur,name:data->>name&order=saved_at.desc&limit=60`);
    const el = $('#hiList'); if (!el) return;
    el.outerHTML = rows.length ? `<p class="muted">A copy is kept before each change, at most every half hour (the latest 60).</p><div class="hist">${rows.map(r =>
      `<div class="kv"><span>${new Date(r.saved_at).toLocaleString()}</span><b>${esc(r.name || c.name)} · Lv ${esc(r.lv ?? '?')} · ${esc(r.hp ?? '?')} HP ${act('restoreHero', r.id, 'Restore', 'sb')}</b></div>`).join('')}</div>`
      : '<p class="muted">No earlier versions yet. The first copy is saved the next time this hero changes.</p>';
  } catch (e) { const el = $('#hiList'); if (el) el.textContent = e.message; }
}
async function billingReturn(){
  const q = new URLSearchParams(location.search), st = q.get('billing');
  if (!st) return;
  q.delete('billing'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
  if (st !== 'success' || !me()) return;
  toast('Thank you! Grimoire+ is being switched on…');
  for (let i = 0; i < 6 && !S.bill?.plus; i++){ await new Promise(r => setTimeout(r, 2500)); try { setBill(await db('/rpc/billing_info', {method:'POST', body:{}})); } catch (e) {} }
  if (S.bill?.plus){ toast('Grimoire+ is on. Welcome, patron of the tome.'); render(); }
  else toast('The payment went through; Grimoire+ will switch on within a few minutes.');
}

const ago = t => { if (!t) return '—'; const s = (Date.now() - t) / 1000; return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : new Date(t).toLocaleDateString(); };
function accountModal(view){
  if (!me()){
    const v = view || 'in';
    modal(`<div class="head"><h2>${v === 'up' ? 'Create your account' : v === 'reset' ? 'Reset your password' : 'Sign in to your tome'}</h2><span class="spacer"></span>${closeBtn()}</div>
      <p class="muted">${v === 'up' ? 'One account per player. Your heroes follow you to every device; your party can read them.' : v === 'reset' ? 'We will mail you a link to choose a new password.' : 'Your heroes, on the PC and on the iPad, always the same.'}</p>
      ${v === 'up' ? `<label class="f" for="ac_name">Player name</label><input type="text" id="ac_name" autocomplete="nickname" placeholder="Capo" style="width:100%">` : ''}
      <label class="f" for="ac_mail">Email</label><input type="email" id="ac_mail" autocomplete="email" style="width:100%" autofocus>
      ${v !== 'reset' ? `<label class="f" for="ac_pw">Password</label><input type="password" id="ac_pw" autocomplete="${v === 'up' ? 'new-password' : 'current-password'}" minlength="6" style="width:100%">` : ''}
      <div class="row mt">${act(v === 'up' ? 'signUp' : v === 'reset' ? 'sendReset' : 'signIn', undefined, v === 'up' ? 'Create account' : v === 'reset' ? 'Send link' : 'Sign in', 'btn')}<span id="acMsg" class="muted"></span></div>
      <div class="rule"></div>
      <div class="row">${v !== 'in' ? act('account', 'in', 'I have an account', 'sb') : act('account', 'up', 'New here? Create an account', 'sb')}${v === 'in' ? act('account', 'reset', 'Forgot password', 'sb') : ''}</div>`, {label:'Account'});
    return;
  }
  const p = S.parties[0], mates = S.members.filter(m => !p || m.party === p.id);
  const mineN = G.chars.filter(c => c.owner === me()).length, theirs = G.chars.length - mineN;
  modal(`<div class="head"><h2>${esc(S.profile?.display_name || 'Your account')}</h2><span class="spacer"></span>${closeBtn()}</div>
    <div class="meta">${esc(S.session.user.email)} · ${STATUS_TXT[S.status]}${S.err ? ' (' + esc(S.err) + ')' : ''} · last sync ${ago(S.lastSync)}</div>
    <div class="rule"></div>
    <div class="fields"><div><label class="f" for="ac_dn">Player name</label><input type="text" id="ac_dn" value="${esc(S.profile?.display_name || '')}"></div><div style="align-self:end">${act('saveName', undefined, 'Save name', 'sb')}</div></div>
    <p>${mineN} hero${mineN === 1 ? '' : 'es'} of yours${theirs ? ` · ${theirs} from your party, read-only` : ''}${G.chars.some(c => c._blocked) ? ` · ${G.chars.filter(c => c._blocked).length} only on this device` : ''}.</p>
    <h4>${SUBS ? 'Plan' : 'Support the tome'}</h4>
    ${planLine()}
    <h4>Party</h4>
    ${p ? `<p><b>${esc(p.name)}</b> · invite code <span class="chip">${esc(p.code)}</span></p>
      ${p.active === false ? `<p class="warn">${p.created_by === me() ? 'Your Grimoire+ has lapsed, so the party is paused: members cannot see each other\'s heroes until you renew.' : 'The party is paused until its creator renews Grimoire+.'}</p>` : ''}
      <p class="muted">Members: ${[S.profile?.display_name || 'You', ...mates.map(m => m.name)].map(esc).join(', ')}. Everyone in the party can read the others' heroes; only the owner can change a hero.</p>
      <div class="row">${act('leaveParty', p.id, 'Leave party', 'sb x')}</div>`
    : `<p class="muted">Make a party and give the code to your companions, or join theirs. Party members can read each other's heroes.${plusOK() ? '' : ' Creating a party needs Grimoire+; joining is free.'}</p>
      <div class="row"><label class="sr" for="pt_name">Party name</label><input type="text" id="pt_name" placeholder="The Millford Company">${act('createParty', undefined, 'Create party', 'sb')}</div>
      <div class="row mt"><label class="sr" for="pt_code">Invite code</label><input type="text" id="pt_code" placeholder="Code (e.g. 7F3A1C)" style="text-transform:uppercase;width:150px">${act('joinParty', undefined, 'Join', 'sb')}</div>`}
    <div class="rule"></div>
    <div class="row">${act('syncNow', undefined, 'Sync now', 'btn small')}${act('ticket', undefined, 'Report a bug or idea', 'btn small ghost')}${act('signOut', undefined, 'Sign out', 'btn small ghost')}<span class="spacer"></span>${act('deleteAccount', undefined, 'Delete account', 'sb x')}</div>
    ${LEGAL ? `<p class="muted small"><a href="${LEGAL}" target="_blank" rel="noopener">Terms and privacy</a></p>` : ''}`, {label:'Account'});
}
async function busyBtn(el, fn){
  const msg = $('#acMsg'); if (el) el.disabled = true;
  try { await fn(); } catch (e) { if (msg) msg.textContent = e.message; else toast(e.message); }
  finally { if (el) el.disabled = false; }
}
const ACT_CLOUD = {
  account(v){ accountModal(v); },
  async signIn(_, el){ await busyBtn(el, async () => {
    const j = await authCall('/token?grant_type=password', {email:$('#ac_mail').value.trim(), password:$('#ac_pw').value});
    const before = G.chars; takeSession(j); closeModal(); toast('Welcome back.'); await afterSignIn(undefined, before); }); },
  async signUp(_, el){ await busyBtn(el, async () => {
    const name = $('#ac_name').value.trim(); if (!name) throw new Error('Add your player name.');
    const j = await authCall('/signup' + (redirectUrl() ? '?redirect_to=' + encodeURIComponent(redirectUrl()) : ''), {email:$('#ac_mail').value.trim(), password:$('#ac_pw').value, data:{display_name:name}});
    if (j.access_token){ const before = G.chars; takeSession(j); closeModal(); await afterSignIn(name, before); toast(`Welcome, ${name}.`); }
    else { $('#acMsg').textContent = 'Check your mail and tap the confirmation link, then sign in.'; } }); },
  async sendReset(_, el){ await busyBtn(el, async () => {
    await authCall('/recover' + (redirectUrl() ? '?redirect_to=' + encodeURIComponent(redirectUrl()) : ''), {email:$('#ac_mail').value.trim()});
    $('#acMsg').textContent = 'Link sent. Open it on this device to set a new password.'; }); },
  async setPassword(_, el){ await busyBtn(el, async () => { await authCall('/user', {password:$('#ac_newpw').value}, 'PUT'); closeModal(); toast('Password changed.'); }); },
  async saveName(_, el){ await busyBtn(el, async () => { const n = $('#ac_dn').value.trim(); if (!n) return;
    const r = await db('/profiles?on_conflict=id', {method:'POST', body:[{id:me(), display_name:n}], prefer:'resolution=merge-duplicates,return=representation'});
    S.profile = r?.[0] || S.profile; G.chars.forEach(c => { if (c.owner === me()) { c.ownerName = n; c.player = c.player || n; } }); save(); syncBadge(); toast('Name saved.'); accountModal(); }); },
  async createParty(_, el){ if (!plusOK()) return plusModal('party'); await busyBtn(el, async () => { const n = $('#pt_name').value.trim() || 'Adventuring party';
    await db('/rpc/create_party', {method:'POST', body:{p_name:n}}); await sync(); accountModal(); }); },
  async joinParty(_, el){ await busyBtn(el, async () => { const code = $('#pt_code').value.trim().toUpperCase(); if (!code) return;
    const r = await db('/rpc/join_party', {method:'POST', body:{p_code:code}}).catch(e => { throw /party_inactive/.test(e.message) ? new Error('That party is paused: its creator needs to renew Grimoire+.') : e; });
    if (!r) throw new Error('No party with that code.');
    await sync(); toast(`You joined ${r.name || 'the party'}.`); accountModal(); }); },
  leaveParty(id){ confirmBox('Leave this party?', 'Leave', async () => { try { await db(`/party_members?party_id=eq.${id}&user_id=eq.${me()}`, {method:'DELETE'}); await sync(); toast('You left the party.'); } catch (e) { toast(e.message); } }); },
  async syncNow(){ await sync(); if ($('#modalBk')) accountModal(); toast(STATUS_TXT[S.status]); },
  signOut(){ confirmBox('Sign out on this device?', 'Sign out', signOut); },
  plus(why){ plusModal(why); },
  async checkout(plan, el){ if (IN_EXE) return exePayModal(); await busyBtn(el, async () => { const j = await billing({action:'checkout', plan}); openPay(j.url); }); },
  async manage(_, el){ if (IN_EXE) return exePayModal(); await busyBtn(el, async () => { const j = await billing({action:'portal'}); openPay(j.url); }); },
  history(){ const c = active(); if (!c || !isMine(c)) return; if (!plusOK()) return plusModal('history'); historyModal(c); },
  async restoreHero(hid){ const c = active(); if (!c || !isMine(c)) return;
    try { const [row] = await db(`/hero_history?id=eq.${+hid}&select=data`); if (!row) return;
      const h = fixup({...row.data, id:c.id, owner:c.owner}); h.player = h.player || c.player;
      Object.keys(c).forEach(k => { if (!LOCAL_FIELDS.includes(k)) delete c[k]; }); Object.assign(c, heroData(h));
      closeModal(); save(); render(); toast(`${c.name} is back as they were. The version you replaced is in the history too.`);
    } catch (e) { toast(e.message); } },
  deleteAccount(){ confirmBox('Delete your account, its heroes in the cloud and any subscription? Heroes on this device stay.', 'Delete for good', async () => {
    try { await billing({action:'delete_account'}); const keep = G.chars.filter(c => c.owner === me()).map(c => { const h = {...c}; LOCAL_FIELDS.forEach(k => delete h[k]); delete h.owner; return h; });
      try { localStorage.removeItem(heroKey()); localStorage.removeItem(BILL_KEY + ':' + me()); localStorage.setItem(KEY, JSON.stringify({chars:keep, activeId:keep[0]?.id || null})); } catch (e) {}
      saveSession(null); S.profile = null; S.parties = []; S.members = []; S.bill = null; setStatus('out'); await load(); render(); toast('Your account is deleted. Your heroes stay on this device.');
    } catch (e) { toast(e.message); } }); },
  migrate(){ const ids = $$('.migr:checked').map(x => x.value);
    const add = (G.migrCands || []).filter(c => ids.includes(c.id)).map(c => { const h = fixup(JSON.parse(JSON.stringify(c))); LOCAL_FIELDS.forEach(k => delete h[k]); h.owner = me(); return h; });
    G.chars.push(...add); if (!G.activeId && add[0]) G.activeId = add[0].id; closeModal(); save(); render(); toast(`${add.length} hero${add.length === 1 ? '' : 'es'} moved into your account.`); },
};
Object.assign(ACT, ACT_CLOUD);
Object.assign(ACT, ACT_BREW);
function passwordModal(){
  modal(`<div class="head"><h2>Choose a new password</h2><span class="spacer"></span>${closeBtn()}</div>
    <label class="f" for="ac_newpw">New password</label><input type="password" id="ac_newpw" autocomplete="new-password" minlength="6" style="width:100%" autofocus>
    <div class="row mt">${act('setPassword', undefined, 'Save password', 'btn')}<span id="acMsg" class="muted"></span></div>`, {label:'New password'});
}

/* ================================================================== tickets: bugs, ideas and wrong data
   A report is written on the device first (a queue in localStorage) and sent when there is a connection and an account,
   so it is never lost offline. The server (supabase/migrations/2026-11-18-tickets.sql) decides who wrote it, keeps the
   status and reply for admins only, and an admin is whoever is listed in the admins table: the page only asks. */
const TK_KEY = 'grimoire-ticketq-v1';
const TK_KINDS = {bug:'Bug', idea:'Idea', data:'Wrong data'};
const TK_SEV = {low:'Low', medium:'Medium', high:'High', critical:'Critical'};
const TK_ST = {open:'Open', working:'In progress', done:'Solved'};
const TK = {q:[], mine:null, all:null, shot:null, ctx:null, busy:false, off:false, adminFor:null, admin:false, filter:'active'};
try { const q = JSON.parse(localStorage.getItem(TK_KEY) || '[]'); if (Array.isArray(q)) TK.q = q.filter(t => t && t.id && t.title).slice(0, 50); } catch (e) {}
const tkSave = () => { try { localStorage.setItem(TK_KEY, JSON.stringify(TK.q)); } catch (e) {} };
function tkDevice(){
  const u = navigator.userAgent || '';
  const os = /Android/.test(u) ? 'Android' : /iPhone|iPad|iPod/.test(u) ? 'iOS' : /Windows/.test(u) ? 'Windows' : /Mac/.test(u) ? 'macOS' : /Linux/.test(u) ? 'Linux' : 'unknown system';
  const br = /Edg\//.test(u) ? 'Edge' : /Firefox\//.test(u) ? 'Firefox' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : 'unknown browser';
  let app = ''; try { if (matchMedia('(display-mode: standalone)').matches) app = ' · installed app'; } catch (e) {}
  return `${os} · ${br} · ${innerWidth}×${innerHeight} @${devicePixelRatio || 1}x${app}`.slice(0, 200);
}
async function tkVersion(){
  try { const ks = (await caches.keys()).filter(k => /^grimoire-/.test(k)).sort(); if (ks.length) return ks[ks.length - 1].replace(/^grimoire-/, '').slice(0, 40); } catch (e) {}
  return 'web';
}
function tkShrink(file){
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1100 / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      let q = .72, d = c.toDataURL('image/jpeg', q);
      while (d.length > 400000 && q > .3){ q -= .1; d = c.toDataURL('image/jpeg', q); }
      d.length > 400000 ? rej(new Error('That picture is too large.')) : res(d);
    };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That file is not a picture.')); };
    im.src = url;
  });
}
async function tkIsAdmin(){
  if (!CLOUD || !me()) return false;
  if (TK.adminFor === me()) return TK.admin;
  try { TK.admin = (await db('/rpc/is_admin', {method:'POST', body:{}})) === true; TK.adminFor = me(); } catch (e) { TK.admin = false; }
  return TK.admin;
}
async function flushTickets(){
  if (!CLOUD || !me() || TK.busy || TK.off || !navigator.onLine) return;
  const todo = TK.q.filter(t => !t.user || t.user === me());
  if (!todo.length) return;
  TK.busy = true;
  try {
    for (const t of todo){
      try {
        await db('/tickets?on_conflict=id', {method:'POST', prefer:'resolution=ignore-duplicates,return=minimal',
          body:[{id:t.id, kind:t.kind, severity:t.severity, title:t.title, body:t.body, page:t.page, app_version:t.app_version, device:t.device, screenshot:t.screenshot || null}]});
        TK.q = TK.q.filter(x => x.id !== t.id); tkSave();
      } catch (e) {
        if (e instanceof TypeError) break;                                   // no network: try again later
        if (BREW_MISSING.test(e.message)){ TK.off = true; break; }          // the server is not ready yet
        if (/tickets_rate_limit/.test(e.message)){ t.err = 'Too many reports in the last hour: this one will be sent later.'; break; }
        t.err = e.message.slice(0, 160);
      }
    }
    tkSave();
  } finally { TK.busy = false; }
}
const tkWhen = t => t ? new Date(t).toLocaleDateString(undefined, {day:'numeric', month:'short'}) : '';
function tkMineHtml(){
  const waiting = TK.q.filter(t => !t.user || t.user === me() || !me());
  const wait = waiting.map(t => `<div class="tkCard"><div class="tkMeta"><span class="chip">${esc(TK_KINDS[t.kind] || 'Bug')}</span> <span class="chip">Waiting to be sent</span></div>
    <b>${esc(t.title)}</b>${t.err ? `<div class="tkMeta warn">${esc(t.err)}</div>` : ''}</div>`).join('');
  const rows = (TK.mine || []).map(t => `<div class="tkCard"><div class="tkMeta"><span class="chip">${esc(TK_KINDS[t.kind] || 'Bug')}</span> <span class="chip tkSt ${esc(t.status)}">${esc(TK_ST[t.status] || t.status)}</span> ${esc(tkWhen(t.created_at))}</div>
    <b>${esc(t.title)}</b>${t.reply ? `<div class="tkReply"><b>Reply</b><br>${esc(t.reply)}</div>` : ''}</div>`).join('');
  if (!wait && !rows) return '<p class="muted">No reports yet.</p>';
  return wait + rows;
}
async function tkLoadMine(){
  const box = () => $('#tkMine');
  if (box()) box().innerHTML = tkMineHtml();
  if (!CLOUD || !me() || !navigator.onLine || TK.off) return;
  try {
    TK.mine = await db(`/tickets?select=id,kind,severity,title,status,reply,replied_at,created_at&owner=eq.${me()}&order=created_at.desc&limit=30`);
    if (box()) box().innerHTML = tkMineHtml();
  } catch (e) { if (BREW_MISSING.test(e.message)) TK.off = true; }
}
async function ticketModal(){
  TK.shot = null;
  TK.ctx = {page:G.chapter || '', ver:'', device:tkDevice()};
  const cloudNote = !CLOUD ? 'This copy of the tome has no cloud, so reports stay on this device.' : !me() ? 'You are not signed in: the report is kept here and sent as soon as you sign in.' : '';
  modal(`<div class="head"><h2>Report a bug or idea</h2><span class="spacer"></span>${closeBtn()}</div>
    <p class="muted">Tell us what went wrong, what you would like, or which data is wrong. ${esc(cloudNote)}</p>
    <div class="fields"><div><label class="f" for="tk_kind">What is it?</label><select id="tk_kind">${Object.entries(TK_KINDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
      <div><label class="f" for="tk_sev">How bad is it?</label><select id="tk_sev"><option value="low">Low: small annoyance</option><option value="medium" selected>Medium</option><option value="high">High: a feature is broken</option><option value="critical">Critical: I lose data</option></select></div></div>
    <label class="f" for="tk_title">Title</label><input type="text" id="tk_title" maxlength="120" placeholder="Short summary" style="width:100%" autofocus>
    <label class="f" for="tk_body">What happened? What did you expect?</label><textarea id="tk_body" maxlength="4000" placeholder="Steps, what you saw, what you expected"></textarea>
    <label class="f" for="tk_file">Screenshot (optional)</label><input type="file" id="tk_file" accept="image/*">
    <div id="tkPrev" class="tkPrev"></div>
    <p class="muted small" id="tkCtx"></p>
    <div class="row mt">${act('tkSend', undefined, 'Send report', 'btn')}<span id="tkMsg" class="muted" role="status"></span></div>
    <div id="tkAdminBox"></div>
    <h4>Your reports</h4><div id="tkMine"></div>`, {label:'Report a bug or idea'});
  $('#tk_file').onchange = async e => {
    const f = e.target.files && e.target.files[0]; TK.shot = null; $('#tkPrev').innerHTML = ''; if (!f) return;
    try { TK.shot = await tkShrink(f); $('#tkPrev').innerHTML = `<img src="${TK.shot}" alt="Screenshot to send">${act('tkNoShot', undefined, 'Remove picture', 'sb')}`; }
    catch (err) { $('#tkMsg').textContent = err.message; e.target.value = ''; }
  };
  TK.ctx.ver = await tkVersion();
  const c = $('#tkCtx'); if (c) c.textContent = `Sent with it: the chapter you were on (${TK.ctx.page || 'none'}), the app version (${TK.ctx.ver}) and your device (${TK.ctx.device}). No email, no hero data.`;
  tkLoadMine();
  if (await tkIsAdmin()){ const b = $('#tkAdminBox'); if (b) b.innerHTML = `<div class="rule"></div><div class="row">${act('tkAdmin', undefined, 'Admin: all reports', 'btn small')}</div>`; }
}
async function tkAdminModal(){
  modal(`<div class="head"><h2>All reports</h2><span class="spacer"></span>${closeBtn()}</div>
    <div class="row"><label class="sr" for="tk_filter">Show</label><select id="tk_filter"><option value="active">Open and in progress</option><option value="open">Open</option><option value="working">In progress</option><option value="done">Solved</option><option value="all">All</option></select></div>
    <div id="tkAll"><p class="muted">Loading…</p></div>`, {label:'All reports'});
  $('#tk_filter').value = TK.filter;
  $('#tk_filter').onchange = e => { TK.filter = e.target.value; tkAdminDraw(); };
  try {
    TK.all = await db('/tickets?select=id,owner,author_name,kind,severity,title,body,page,app_version,device,has_shot,status,reply,replied_at,created_at&order=created_at.desc&limit=200');
    tkAdminDraw();
  } catch (e) { const b = $('#tkAll'); if (b) b.textContent = e.message; }
}
function tkAdminDraw(){
  const box = $('#tkAll'); if (!box) return;
  const f = TK.filter, rows = (TK.all || []).filter(t => f === 'all' ? true : f === 'active' ? t.status !== 'done' : t.status === f);
  box.innerHTML = rows.length ? rows.map(t => `<div class="tkCard" data-tk="${esc(t.id)}">
    <div class="tkMeta"><span class="chip">${esc(TK_KINDS[t.kind] || t.kind)}</span> <span class="chip tkSev ${esc(t.severity)}">${esc(TK_SEV[t.severity] || t.severity)}</span> <span class="chip tkSt ${esc(t.status)}">${esc(TK_ST[t.status] || t.status)}</span> ${esc(tkWhen(t.created_at))} · ${esc(t.author_name || 'someone')}</div>
    <div class="tkMeta">${esc(t.page || '—')} · ${esc(t.app_version || '—')} · ${esc(t.device || '—')}</div>
    <b>${esc(t.title)}</b>${t.body ? `<div class="tkBody">${esc(t.body)}</div>` : ''}
    ${t.has_shot ? `<div class="row mt">${act('tkShot', t.id, 'Show screenshot', 'sb')}</div><div class="tkShotBox"></div>` : ''}
    <div class="fields"><div><label class="f" for="tk_st_${esc(t.id)}">Status</label><select id="tk_st_${esc(t.id)}" class="tk_st">${Object.entries(TK_ST).map(([k, v]) => `<option value="${k}"${k === t.status ? ' selected' : ''}>${v}</option>`).join('')}</select></div></div>
    <label class="f" for="tk_rp_${esc(t.id)}">Reply</label><textarea id="tk_rp_${esc(t.id)}" class="tk_rp" maxlength="2000">${esc(t.reply)}</textarea>
    <div class="row mt">${act('tkAdminSave', t.id, 'Save', 'btn small')}${act('tkAdminDel', t.id, 'Delete', 'sb x')}<span class="tkRowMsg muted"></span></div></div>`).join('') : '<p class="muted">Nothing here.</p>';
}
const tkCard = id => $$('#tkAll .tkCard').find(c => c.dataset.tk === id);
const ACT_TICKETS = {
  ticket(){ ticketModal(); },
  tkNoShot(){ TK.shot = null; $('#tkPrev').innerHTML = ''; const f = $('#tk_file'); if (f) f.value = ''; },
  async tkSend(_, el){
    const title = $('#tk_title').value.trim(), msg = $('#tkMsg');
    if (!title){ msg.textContent = 'Add a short title.'; $('#tk_title').focus(); return; }
    const ctx = TK.ctx || {};
    TK.q.push({id:uid(), user:me() || null, kind:$('#tk_kind').value, severity:$('#tk_sev').value, title:title.slice(0, 120), body:$('#tk_body').value.trim().slice(0, 4000),
      page:String(ctx.page || '').slice(0, 60), app_version:String(ctx.ver || '').slice(0, 40), device:String(ctx.device || '').slice(0, 200), screenshot:TK.shot || undefined, at:Date.now()});
    TK.q = TK.q.slice(-50); tkSave();
    $('#tk_title').value = ''; $('#tk_body').value = ''; ACT.tkNoShot(); el.disabled = true;
    msg.textContent = 'Saved on this device.';
    await flushTickets();
    if (el.isConnected) el.disabled = false;
    const left = TK.q.length;
    if ($('#tkMsg')) $('#tkMsg').textContent = left ? (CLOUD && me() ? 'Saved: it will be sent when the connection is back.' : 'Saved: it will be sent after you sign in.') : 'Sent. Thank you!';
    tkLoadMine();
  },
  tkAdmin(){ tkAdminModal(); },
  async tkShot(id, el){
    const c = tkCard(id); if (!c) return;
    try { const [r] = await db(`/tickets?id=eq.${encodeURIComponent(id)}&select=screenshot`);
      c.querySelector('.tkShotBox').innerHTML = r && r.screenshot ? `<img class="tkShotImg" src="${esc(r.screenshot)}" alt="Screenshot of the report">` : '<p class="muted">No screenshot.</p>'; el.remove(); }
    catch (e) { toast(e.message); }
  },
  async tkAdminSave(id, el){
    const c = tkCard(id); if (!c) return; const m = c.querySelector('.tkRowMsg'); el.disabled = true;
    try {
      const status = c.querySelector('.tk_st').value, reply = c.querySelector('.tk_rp').value.trim().slice(0, 2000);
      await db(`/tickets?id=eq.${encodeURIComponent(id)}`, {method:'PATCH', body:{status, reply}, prefer:'return=minimal'});
      const t = (TK.all || []).find(x => x.id === id); if (t){ t.status = status; t.reply = reply; }
      m.textContent = 'Saved.';
    } catch (e) { m.textContent = e.message; }
    finally { el.disabled = false; }
  },
  tkAdminDel(id){ confirmBox('Delete this report for good?', 'Delete', async () => {
    try { await db(`/tickets?id=eq.${encodeURIComponent(id)}`, {method:'DELETE', prefer:'return=minimal'}); TK.all = (TK.all || []).filter(t => t.id !== id); tkAdminModal(); }
    catch (e) { toast(e.message); } }); },
};
Object.assign(ACT, ACT_TICKETS);

/* ---- read-only heroes: party members' sheets can be read and rolled, never changed ---- */
const READ_SAFE = new Set(['spellF','spellBrowse','spellMore','pick','go','prev','next','close','detail','detailId','roll','die','rollExpr','adv','log','sound','rollAb','rollSave','rollSkill','rollInit','rollSpellAtk','attack','gearAttack',
  'readItem','invCat','addTab','libCat','libPick','importUrl','delPack','wizard','doWizard','duplicate','export','exportAll','copyExport','downloadChar','import','doImport','enter','print','theme','aspetto','retrySave',
  ...Object.keys(ACT_CLOUD)]);
const blockedFor = (name) => { const c = active(); return c && !isMine(c) && !READ_SAFE.has(name) && !/^(enc|brew|np[A-Z]|tk[A-Z]|ticket$)/.test(name) && !$('#modalBk .acct'); };
function roBanner(c){
  return isMine(c) ? '' : `<div class="roNote">${portrait(c, 'mini')}<span><b>${esc(c.ownerName || 'A party member')}</b>'s hero: you can read it and roll its dice; only ${esc(c.ownerName || 'its owner')} can change it.</span>${act('duplicate', undefined, 'Make my own copy', 'sb')}</div>`;
}
function lockReadOnly(){
  const c = active(), ro = !!c && !isMine(c);
  $('#page').classList.toggle('ro', ro);
  if (!ro || BOOKISH(G.chapter) || G.chapter === 'encounter') return;
  $$('#page .pageBody input, #page .pageBody select, #page .pageBody textarea').forEach(el => { if (!/^(spell_q|spell_sc|lib_q|gear_q|inv_q|spell_mine|gear_cat|gear_att|atk_w)$/.test(el.id)) el.disabled = true; });
}
function heroInfo(c){
  if (!c) return '';
  const rows = [];
  if (CLOUD && me()) rows.push(kv('Owner', esc(c.owner === me() || !c.owner ? (S.profile?.display_name || 'You') + ' (you)' : c.ownerName || 'Party member')));
  rows.push(kv('Created', c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'));
  rows.push(kv('Last change', `${ago(c.updatedAt)}${c.editedOn ? ' · ' + esc(c.editedOn) : ''}`));
  if (CLOUD && me() && isMine(c)) rows.push(kv('Cloud', c._blocked && !plusOK() ? `<span class="muted">only on this device</span> ${act('plus', 'sync', 'Grimoire+', 'sb')}`
    : c._dirty ? '<span class="muted">waiting to sync</span>' : c._rev ? `✓ saved ${act('history', undefined, 'History', 'sb')}` : '<span class="muted">not yet saved</span>'));
  else if (CLOUD && !me()) rows.push(kv('Cloud', act('account', 'in', 'Sign in to sync', 'sb')));
  return rows.join('');
}
/** A new version is ready: say so and let the person reload when it suits them (nothing is reloaded by itself, so no typing is lost). */
function updateBar(){
  if ($('#updBar')) return;
  const b = document.createElement('div'); b.id = 'updBar'; b.setAttribute('role', 'status');
  b.innerHTML = `A new version of the tome is ready. <button type="button" class="sb" id="updGo">Reload now</button><button type="button" class="sb" id="updX" aria-label="Dismiss">✕</button>`;
  document.body.appendChild(b);
  $('#updGo').onclick = () => location.reload(); $('#updX').onclick = () => b.remove();
}
window.updateBar = updateBar;   // also reachable by the tests
function registerSW(){
  if (!('serviceWorker' in navigator) || !document.querySelector('link[rel="manifest"]') || location.port === '52474') return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => { const w = reg.installing; w?.addEventListener('statechange', () => {
      if (w.state === 'installed' && navigator.serviceWorker.controller) updateBar(); }); });
    // an app left open for days looks for a new version whenever it comes back to the front
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    reg.update().catch(() => {});
  }).catch(() => {});
  try { navigator.storage?.persist?.(); } catch (e) {}
}
async function cloudBoot(){
  syncBadge(); registerSW();
  if (!CLOUD) return;
  const type = readAuthRedirect();
  addEventListener('online', () => sync());
  addEventListener('offline', () => setStatus('offline'));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });
  setInterval(() => { if (document.visibilityState === 'visible') sync(); }, 60000);
  if (!me()){ db0('/rpc/billing_info').then(b => b && setBill(b)); return; }
  loadBill();
  if (type === 'recovery') passwordModal();
  try { await afterSignIn(); if (type === 'signup') toast('Email confirmed. Welcome to the tome.'); billingReturn(); }
  catch (e) { setStatus(navigator.onLine ? 'error' : 'offline', e.message); }
}

/* ================================================================== wiring */
function setPath(obj, path, v){ const ks = path.split('.'); let o = obj; ks.slice(0, -1).forEach(k => o = o[k] = o[k] || {}); o[ks[ks.length - 1]] = v; }
/* B-016: a field writes only to the hero it was drawn for. If another tab deleted that hero meanwhile,
   what is typed is not saved anywhere (never onto whichever hero became active) and the page says so. */
function heroGone(){
  if (G.goneWarned !== G.pageHero){ G.goneWarned = G.pageHero; toast('This hero was deleted in another tab: what you typed here is not saved.', 'fumble'); }
  G.needRender = true;
}
function bindValue(el, done){
  const id = G.pageHero === undefined ? active()?.id : G.pageHero, c = G.chars.find(h => h.id === id), path = el.dataset.bind;
  if (!c){ heroGone(); return; }
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset.type === 'int'){   // B-017, B-018: the field's own min/max hold, typed or pasted
    // B-035: read the number the field shows ("1e3" is 1000, "2.9" keeps 2), not just its leading digits
    const f = Number(String(v).trim()), n = Number.isFinite(f) ? Math.trunc(f) : (parseInt(v, 10) || 0), lo = el.min === '' ? -LIM.coin : +el.min, hi = el.max === '' ? LIM.coin : +el.max;
    v = clamp(n, lo, hi);
    if (done && el.value !== '' && el.value !== String(v)) el.value = v;   // on change (not mid-typing) show what was kept
  }
  if (path === 'level') v = clamp(v, 1 + multi(c).reduce((t, m) => t + m.level, 0), 20);
  if (path === 'hp.max'){ v = Math.max(1, v); setPath(c, path, v); c.hp.cur = Math.min(c.hp.cur, hpMax(c)); save(); if (!G.chars.includes(c)) heroGone(); return; }
  if (path === 'hp.maxOv'){ if (String(el.value).trim() === '') delete c.hp.maxOv; else c.hp.maxOv = Math.max(1, v); c.hp.cur = Math.min(c.hp.cur, hpMax(c)); save(); if (!G.chars.includes(c)) heroGone(); return; }
  if (path === 'name' && !String(v).trim()) return;
  if (path === 'class' && v !== c.class) c.subclass = '';
  setPath(c, path, v);
  save();
  if (!G.chars.includes(c)) heroGone();   // this save found it deleted in the other tab
}
function mcValue(el){
  const [i, k] = el.dataset.mc.split(':');
  mut(c => { const m = c.multi[+i]; if (!m) return;
    if (k === 'level'){ const first = classList(c)[0].level, rest = c.multi.reduce((t, x, j) => t + (j === +i ? 0 : x.level), 0);
      m.level = clamp(parseInt(el.value, 10) || 1, 1, Math.max(1, 20 - first - rest)); c.level = first + rest + m.level; }
    else { m[k] = el.value.trim(); if (k === 'class') m.subclass = ''; } });
}
function wire(){
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    const fn = ACT[el.dataset.act]; if (!fn) return;
    e.preventDefault();
    if (blockedFor(el.dataset.act)){ toast(`${active().name} belongs to ${active().ownerName || 'a party member'}: read-only here.`); return; }
    fn(el.dataset.arg, el, e);
    if (el.classList.contains('dbtn') && el.dataset.act === 'die' && !reduceMotion()) el.animate([{transform:'rotate(0) scale(1)'}, {transform:'rotate(-200deg) scale(1.12)', offset:.6}, {transform:'rotate(-360deg) scale(1)'}], {duration:520, easing:'cubic-bezier(.3,.8,.3,1)'});
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'hb5_pre'){ ACT_BREW.brew5Pre(); return; }
    if (e.target.id === 'shelf_sort'){ G.shelfSort = e.target.value; savePrefs(); renderShelf(); return; }
    const el = e.target;
    if (el.tagName === 'SELECT' && el.value === '__custom'){   // subclass picker: swap in a text field for one the library doesn't have
      const t = document.createElement('input'); t.type = 'text'; for (const a of el.attributes) t.setAttribute(a.name, a.value);
      t.placeholder = 'Type the subclass name'; el.replaceWith(t); t.focus(); return; }
    if (el.dataset.bind && !isMine(active())){ renderPage(); return; }
    if (el.dataset.mc !== undefined){ if (isMine(active())) mcValue(el); else renderPage(); return; }
    if (el.id === 'lu_feat'){ luFeatAb(); return; }
    if (el.id === 'lu_cls'){ G.lu.cls = el.value; openLevelUp(true); return; }
    if (el.dataset.bind){ bindValue(el, true); const quiet = el.tagName === 'TEXTAREA' || /^currency\.|^notes\./.test(el.dataset.bind); quiet ? null : render(); return; }
    if (el.dataset.lib !== undefined){ G.libF[el.dataset.lib] = el.value; renderLibList(); return; }
    if (el.id === 'spell_sc'){ G.spellSc = el.value; G.spellMax = SPELL_PAGE; spellSearch($('#spell_q').value); }
    if (el.id === 'spell_mine'){ G.spellMine = el.checked; spellSearch($('#spell_q').value); }
    if (el.id === 'imp_file') importFiles([...el.files]);
    if ((el.id === 'brew_file' || el.id === 'brew_file2') && el.files[0]){ brewImport(el.files[0]); el.value = ''; }
    if (el.id === 'f_img' && el.files[0] && isMine(active())) shrinkImage(el.files[0]).then(d => mut(c => { c.img = d; })).catch(() => toast('That image could not be read.'));
    if (el.id === 'coverStart'){ G.coverOnStart = el.checked; save(); }
    if (el.id === 'gear_cat'){ G.gearCat = el.value; gearSearch(); }
    if (el.id === 'gear_att'){ G.gearAtt = el.checked; gearSearch(); }
  });
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.bind && !isMine(active())) return;
    if (el.dataset.bind && (el.tagName === 'TEXTAREA' || /^currency\./.test(el.dataset.bind))){ bindValue(el); return; }
    if (el.id === 'hpAmt') G.hpAmt = hpNum('hpAmt');
    if (el.id === 'coinAmt') G.coinAmt = el.value;
    if (el.id === 'spell_q'){ G.spellMax = SPELL_PAGE; spellSearch(el.value); }
    if (el.id === 'gear_q'){ G.gearQ = el.value; gearSearch(); }
    if (el.id === 'inv_q'){ G.invQ = el.value; const pos = el.selectionStart; renderPage(); const n = $('#inv_q'); n.focus(); n.setSelectionRange(pos, pos); }
    if (el.id === 'shelf_q'){ G.shelfQ = el.value; renderShelf(); }
    if (el.id === 'lib_q'){ G.libQ = el.value; renderLibList(); }
    if (el.id === 'brew_q'){ G.brewQ = el.value; const l = $('#hb_list'); if (l) l.innerHTML = brewListHTML(); }
    if (el.closest?.('#bwForm')) brewLivePreview();
    if (el.id === 'omni'){ omniSel = 0; renderOmni(); }
  });
  const omni = $('#omni');
  omni.addEventListener('keydown', e => {
    const res = $$('#omniList button');
    if (e.key === 'ArrowDown'){ omniSel = Math.min(res.length - 1, omniSel + 1); renderOmni(); e.preventDefault(); }
    else if (e.key === 'ArrowUp'){ omniSel = Math.max(0, omniSel - 1); renderOmni(); e.preventDefault(); }
    else if (e.key === 'Enter' && res[omniSel]){ e.preventDefault(); const b = res[omniSel]; omni.blur(); setTimeout(() => b.click(), 0); }
    else if (e.key === 'Escape'){ omni.value = ''; renderOmni(); omni.blur(); }
  });
  document.addEventListener('toggle', e => { if (e.target.id === 'atkFold') S.atkOpen = e.target.open; }, true);
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.omni')) $('#omniList').hidden = true; });
  document.addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if (e.key === 'Escape'){ closeModal(); return; }
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)){ e.preventDefault(); omni.focus(); omni.select(); return; }
    if (typing || $('#modalBk') || $('#coverBk')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') flipStep(1);
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') flipStep(-1);
  });
  // swipe to turn
  const book = $('#book'); let sx = 0, sy = 0, st = 0;
  book.addEventListener('touchstart', e => { if (e.target.closest('input,textarea,select,.libList,.tblWrap')) { st = 0; return; } const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); }, {passive:true});
  book.addEventListener('touchend', e => { if (!st) return; const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Date.now() - st < 600 && Math.abs(dx) > 70 && Math.abs(dy) < 50) flipStep(dx < 0 ? 1 : -1); st = 0; }, {passive:true});
  // drag & drop import
  document.addEventListener('dragover', e => { const z = e.target.closest?.('#dropZone, #brewDrop'); if (z){ e.preventDefault(); z.classList.add('over'); } });
  document.addEventListener('dragleave', e => { const z = e.target.closest?.('#dropZone, #brewDrop'); if (z) z.classList.remove('over'); });
  document.addEventListener('drop', e => { const z = e.target.closest?.('#dropZone, #brewDrop'); if (z && z.id === 'brewDrop'){ e.preventDefault(); z.classList.remove('over'); const f = [...e.dataTransfer.files].find(f => /json/i.test(f.type) || /\.json$/i.test(f.name)); f ? brewImport(f) : toast('Drop a .json file.'); return; }
    if (z){ e.preventDefault(); z.classList.remove('over'); importFiles([...e.dataTransfer.files].filter(f => /json/i.test(f.type) || /\.json$/i.test(f.name))); } });
}

// The paper textures are SVG noise filters; Chrome re-runs those for every element that paints them,
// so bake each one into a PNG once and point the CSS tokens at the bitmap.
async function bakeTextures(){
  const root = document.documentElement, cs = getComputedStyle(root);
  await Promise.all(['--grain', '--fibre', '--blotch', '--ring'].map(name => new Promise(res => {
    const m = cs.getPropertyValue(name).match(/url\("?(data:image\/svg\+xml[^"]+)"?\)/); if (!m) return res();
    const img = new Image();
    img.onload = () => { try {
      const cv = document.createElement('canvas'); cv.width = img.naturalWidth || 240; cv.height = img.naturalHeight || 240;
      cv.getContext('2d').drawImage(img, 0, 0); root.style.setProperty(name, `url("${cv.toDataURL('image/png')}")`);
    } catch (e) {} res(); };
    img.onerror = () => res(); img.src = m[1];
  })));
}
/* ================================================================== NPC dossiers (for the DM)
   A DM keeps NPCs as typewritten identity files, groups them in folders (an NPC can sit in several) and decides what the
   party may read: the NPC as a whole, the name, the picture, every fact, every section, the game stats. Secret notes
   never leave the DM's own table. What the players read is a copy built here without the hidden parts (npPublic) and
   stored in its own table (npc_public), so a bug in the page cannot show them a secret: it is not in their table.
   Same sync idea as homebrew: one row per entry, latest edit wins, a delete leaves a tombstone. */
const NP_KEY = 'grimoire-npc-v1', NP_TOMB = 'grimoire-npc-tomb-v1', NP_PUB = 'grimoire-npc-pub-v1', NP_SHARED = 'grimoire-npc-shared-v1', NP_OWNER = 'grimoire-npc-owner-v1';
const NP_ATT = ['', 'Allied', 'Friendly', 'Neutral', 'Wary', 'Hostile'];
// [key, label, kind, where it sits on the card: l (left table) or r (right table)]
const NP_FACTS = [['species', 'Species', 't', 'l'], ['age', 'Age', 't', 'l'], ['born', 'Born', 't', 'l'], ['height', 'Height', 't', 'l'], ['weight', 'Weight', 't', 'l'],
  ['marks', 'Distinguishing marks', 't', 'l'], ['languages', 'Languages', 't', 'l'],
  ['role', 'Role', 't', 'r'], ['align', 'Alignment', 't', 'r'], ['attitude', 'Attitude to the party', 'a', 'r'], ['civil', 'Marital status', 't', 'r'], ['home', 'Residence', 't', 'r']];
// every section is optional and can be reordered; these are only starting points
const NP_SECS = {
  profile:['Profile & role', 'Who they are, in a few lines.'], rep:['Reputation', 'What people say about them.'], char:['Character & habits', 'One trait per line.'],
  priv:['Private life', 'Family, friends, vices.'], moves:['Known movements', 'Where they go and when.'], gear:['Abilities & gear', 'What they can do, what they carry.'],
  notes:['Notes', 'Anything else.'],
  skills:['Known abilities', 'What the party has seen them do.'], known:['What the party knows', 'Only what the characters have learned so far.'],
  ties:['Ties to the party', 'Favours, debts, shared secrets, grudges.'], places:['Places we met', 'One place per line, with the session or date.'],
  pcrel:['Relationship with each PC', 'One line per character: Name: how they feel about them.'], ibf:['Ideals · bonds · flaws', 'Three lines.'], hooks:['Quest hooks', 'What they want from the party.'],
  rumors:['Rumors', 'True, false and half true.'], allies:['Allies & enemies', 'Who stands with them, who against.'], sched:['Daily routine', 'Hour by hour.'],
  wares:['Services & prices', 'For merchants, healers, guides.'], look:['Appearance & clothing', 'What the party sees.'],
  politics:['Politics & beliefs', 'Side, faith, causes.'], timeline:['Timeline of encounters', 'One line per meeting: date · place · what happened.'],
};
const NP_TPL = [
  {id:'party', t:'Party contact', d:'Skills, what the party knows, ties, places met, timeline', secs:['skills', 'known', 'ties', 'pcrel', 'places', 'timeline', 'notes']},
  {id:'dossier', t:'Full dossier', d:'Like a guard file: profile, reputation, habits, private life, movements, gear', secs:['profile', 'rep', 'char', 'priv', 'moves', 'gear', 'politics', 'notes']},
  {id:'merchant', t:'Merchant or informant', d:'Services, rumors, routine, hooks', secs:['profile', 'wares', 'rumors', 'sched', 'hooks']},
  {id:'villain', t:'Villain or rival', d:'Reputation, allies, hooks, timeline', secs:['profile', 'rep', 'allies', 'hooks', 'timeline']},
  {id:'blank', t:'Blank card', d:'Just a name and a profile', secs:['profile']},
];
const NP_ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
let NPCS = [];                 // [{id, kind:'npc'|'group', o, updatedAt}]
let NP_SH = {u:null, list:[]}; // what other people revealed to me: {u: my id, list:[{id, owner, party, kind, o, by}]}

const npId = v => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v) ? v : null;
const npStr = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
const NP_IMG = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;
/** The only door for data from outside this page (cloud rows, the other tables): types, lengths and the picture are checked. */
function npClean(o, group){
  o = isObj(o) ? o : {};
  if (group) return {n:npStr(o.n, 80).trim() || 'Group', ids:Array.isArray(o.ids) ? [...new Set(o.ids.filter(x => typeof x === 'string' && x.length <= 64))].slice(0, 300) : [], shown:!!o.shown, party:npId(o.party)};
  const out = {n:npStr(o.n, 80).trim() || 'Unnamed', alias:npStr(o.alias, 80), img:typeof o.img === 'string' && o.img.length <= 160000 && NP_IMG.test(o.img) ? o.img : '',
    shown:!!o.shown, nameShown:!!o.nameShown, imgShown:!!o.imgShown, party:npId(o.party), facts:{}, secs:[], stats:null, links:[], secret:npStr(o.secret, 4000), voice:npStr(o.voice, 1500), quotes:npStr(o.quotes, 2000)};
  if (Array.isArray(o.links)) out.links = o.links.slice(0, 60).filter(x => isObj(x) && typeof x.to === 'string' && x.to.length <= 64).map(x => ({to:x.to, rel:npStr(x.rel, 60).trim(), show:!!x.show}));
  for (const [k] of NP_FACTS){ const f = isObj(o.facts) ? o.facts[k] : null; if (isObj(f) && typeof f.v === 'string' && f.v.trim()) out.facts[k] = {v:f.v.trim().slice(0, 200), show:!!f.show}; }
  if (Array.isArray(o.secs)) out.secs = o.secs.slice(0, 40).filter(isObj).map(x => ({id:npStr(x.id, 40) || uid(), k:npStr(x.k, 20), t:npStr(x.t, 80).trim() || 'Section', body:npStr(x.body, 4000), show:!!x.show}));
  if (isObj(o.stats)){
    const s = o.stats, ab = Array.isArray(s.abil) ? s.abil : [];
    out.stats = {on:!!s.on, show:!!s.show, ac:npStr(s.ac, 12), hp:npStr(s.hp, 20), speed:npStr(s.speed, 30), cr:npStr(s.cr, 8), abil:NP_ABIL.map((_, i) => clamp(parseInt(ab[i], 10) || 10, 1, 30)), text:npStr(s.text, 2000)};
  }
  return out;
}
function npItem(id, data){
  if (typeof id !== 'string' || id.length < 4 || id.length > 64 || !isObj(data)) return null;
  const group = data.kind === 'group';
  return {id, kind:group ? 'group' : 'npc', o:npClean(data.o, group), updatedAt:+data.updatedAt || 0};
}
function npLoad(){
  try { const l = JSON.parse(localStorage.getItem(NP_KEY) || '[]'); NPCS = Array.isArray(l) ? l.map(x => npItem(x?.id, x)).filter(Boolean) : []; } catch (e) { NPCS = []; }
  try { const s = JSON.parse(localStorage.getItem(NP_SHARED) || 'null'); if (isObj(s) && Array.isArray(s.list)) NP_SH = {u:s.u, list:s.list.map(x => ({...x, o:npClean(x.o, x.kind === 'group')}))}; } catch (e) {}
}
function npPersist(){
  try { localStorage.setItem(NP_KEY, JSON.stringify(NPCS.map(it => ({id:it.id, kind:it.kind, o:it.o, updatedAt:it.updatedAt})))); }
  catch (e) { toast('This browser is full, so your NPCs could not be saved here. Remove a picture or an old NPC.'); }
}
const npTombGet = () => { try { const t = JSON.parse(localStorage.getItem(NP_TOMB) || '{}'); return isObj(t) ? t : {}; } catch (e) { return {}; } };
const npTombSet = t => { try { Object.keys(t).length ? localStorage.setItem(NP_TOMB, JSON.stringify(t)) : localStorage.removeItem(NP_TOMB); } catch (e) {} };
const npPubGet = () => { try { const t = JSON.parse(localStorage.getItem(NP_PUB + ':' + me()) || '{}'); return isObj(t) ? t : {}; } catch (e) { return {}; } };
const npPubSet = t => { try { localStorage.setItem(NP_PUB + ':' + me(), JSON.stringify(t)); } catch (e) {} };
const npShared = () => NP_SH.u && NP_SH.u === me() ? NP_SH.list : [];
const npCanShare = () => !!(CLOUD && me() && S.parties?.length && !S.npcOff);
const npNpcs = () => NPCS.filter(x => x.kind === 'npc'), npGroups = () => NPCS.filter(x => x.kind === 'group');
const npGet = id => NPCS.find(x => x.id === id);
function npTouch(it){ it.updatedAt = Math.max(Date.now(), (it.updatedAt || 0) + 1); }
function npSyncSoon(){ if (CLOUD && me()) schedulePush(); }

/** What the party may read of an entry, or null when nothing. Pure: this is the one place that decides what leaves the DM's table. */
function npPublic(it, all = NPCS){
  const o = it.o;
  if (it.kind === 'group'){
    if (!o.shown || !o.party) return null;
    return {n:o.n, party:o.party, ids:o.ids.filter(id => all.some(x => x.id === id && x.kind === 'npc' && x.o.shown && x.o.party === o.party))};
  }
  if (!o.shown || !o.party) return null;
  const out = {n:o.nameShown ? o.n : (o.alias || 'Unknown figure'), img:o.imgShown ? o.img : '', party:o.party, facts:{}, secs:[], stats:null};
  for (const k in o.facts) if (o.facts[k].show) out.facts[k] = {v:o.facts[k].v, show:true};
  out.secs = o.secs.filter(s => s.show && s.body.trim()).map(s => ({id:s.id, k:s.k, t:s.t, body:s.body, show:true}));
  if (o.stats?.on && o.stats.show) out.stats = {...o.stats, show:true};
  out.links = o.links.filter(l => l.show && all.some(x => x.id === l.to && x.kind === 'npc' && x.o.shown && x.o.party === o.party)).map(l => ({to:l.to, rel:l.rel, show:true}));   // only toward NPCs the party can see
  return out;
}

// ---- merging with the cloud (same rules as homebrew: the later edit wins per entry, a delete beats an older edit) ----
function npReconcile(local, rows, tomb){
  const items = [], push = [], del = [], seen = new Set();
  let changed = false;
  for (const r of rows){
    const rt = +r.data?.updatedAt || 0, l = local.find(x => x.id === r.id);
    if (l) seen.add(l.id);
    if (r.deleted){
      if (l && l.updatedAt > rt){ items.push(l); push.push(l); } else if (l) changed = true;
      continue;
    }
    const it = npItem(r.id, {...r.data, updatedAt:rt});
    if (!it){ if (l){ items.push(l); push.push(l); } continue; }
    if (!l){
      if (tomb[r.id] != null && tomb[r.id] >= rt){ del.push({id:r.id, at:tomb[r.id]}); continue; }
      items.push(it); changed = true; continue;
    }
    if (l.updatedAt > rt){ items.push(l); push.push(l); }
    else if (l.updatedAt < rt){ items.push(it); changed = true; }
    else items.push(l);
  }
  for (const l of local) if (!seen.has(l.id)){ items.push(l); push.push(l); }
  return {items, push, del, changed};
}
const npIdleNote = () => { const a = document.activeElement; return !!a?.classList?.contains('np_note') && !NOTES[npNoteId(a.dataset.npc, a.dataset.note)]?.dirty; };   // a note box with nothing unsent does not block a redraw
const npRerender = () => { if (G.chapter === 'npcs'){ if (!G.turning && !$('#modalBk') && (!isTyping() || npIdleNote())) renderPage(); else G.needRender = true; } };
async function syncNpc(){
  if (S.npcOff || !me()) return;
  let rows;
  try { rows = await db('/npcs?select=id,data,deleted,updated_at'); }
  catch (e){ if (BREW_MISSING.test(e.message)){ S.npcOff = true; npRerender(); return; } throw e; }
  let prev = null; try { prev = localStorage.getItem(NP_OWNER); } catch (e) {}
  let moved = false;
  if (prev && prev !== me()){                    // another account used this device: its NPCs stay aside, never mixed in
    if (NPCS.length){ try { localStorage.setItem('grimoire-npc-backup-v1:' + prev, JSON.stringify(NPCS)); } catch (e) {} }
    NPCS = []; npTombSet({}); moved = true;
  }
  const tomb = npTombGet(), r = npReconcile(NPCS, rows || [], tomb);
  NPCS = r.items;
  if (r.changed || moved){ npPersist(); npRerender(); }
  try { localStorage.setItem(NP_OWNER, me()); } catch (e) {}
  const mine = r.push.map(it => ({id:it.id, owner:me(), party_id:it.o.party || null, data:{kind:it.kind, o:it.o, updatedAt:it.updatedAt}, deleted:false}))
    .concat(r.del.map(d => ({id:d.id, owner:me(), data:{updatedAt:d.at}, deleted:true})));
  for (let i = 0; i < mine.length; i += 10) await db('/npcs?on_conflict=id', {method:'POST', body:mine.slice(i, i + 10), prefer:'resolution=merge-duplicates,return=minimal'});
  // what the party may read: only the entries whose public copy changed since the last time
  const sigs = npPubGet(), pub = [], now = Date.now(), next = {};
  for (const it of NPCS){
    const p = npPublic(it), sig = p ? JSON.stringify(p) : '', old = sigs[it.id];
    next[it.id] = [sig, p ? p.party : old?.[1] || null];
    if (sig !== (old?.[0] || '')){
      if (p) pub.push({id:it.id, owner:me(), party_id:p.party, data:{kind:it.kind, o:p, updatedAt:now}, deleted:false});
      else if (old?.[1]) pub.push({id:it.id, owner:me(), party_id:old[1], data:{updatedAt:now}, deleted:true});
    }
  }
  for (const id of Object.keys(sigs)) if (!next[id]){                // deleted here: take it away from the players too
    if (sigs[id][0] && sigs[id][1]) pub.push({id, owner:me(), party_id:sigs[id][1], data:{updatedAt:now}, deleted:true});
  }
  // A row the server refuses (row-level security: the hero's party is gone, or this account left it) must not sink the whole sync
  // into "Sync problem" every minute: send the batch, and on a refusal retry one by one and skip only the refused rows.
  const pubPost = body => db('/npc_public?on_conflict=id', {method:'POST', body, prefer:'resolution=merge-duplicates,return=minimal'});
  const refused = [];
  for (let i = 0; i < pub.length; i += 10){
    const part = pub.slice(i, i + 10);
    try { await pubPost(part); }
    catch (e){
      if (!/row-level security|violates|HTTP 403/i.test(e.message)) throw e;
      for (const row of part){
        try { await pubPost([row]); }
        catch (e2){ if (!/row-level security|violates|HTTP 403/i.test(e2.message)) throw e2; refused.push(row.id); }
      }
    }
  }
  if (refused.length && !S.pubWarned){ S.pubWarned = true; toast('Some NPCs could not be shared with the party (you are no longer in that party). They stay safe on your device.', 'fumble'); }
  npPubSet(next);
  if (Object.keys(tomb).length){ const t = npTombGet(); for (const id of Object.keys(tomb)) delete t[id]; npTombSet(t); }
  await npPullShared();
  await npNotesSync();
}
async function npPullShared(){
  let rows;
  try { rows = await db('/npc_public?select=id,owner,party_id,data,deleted,updated_at'); }
  catch (e){ if (BREW_MISSING.test(e.message)){ S.npcOff = true; return; } throw e; }
  const who = id => S.members.find(m => m.id === id)?.name || 'Your DM';
  const list = (rows || []).filter(r => r.owner !== me() && !r.deleted && isObj(r.data)).map(r => ({id:r.id, owner:r.owner, party:r.party_id, kind:r.data.kind === 'group' ? 'group' : 'npc', o:npClean(r.data.o, r.data.kind === 'group'), by:who(r.owner)}));
  const same = JSON.stringify(list) === JSON.stringify(npShared());
  NP_SH = {u:me(), list};
  try { localStorage.setItem(NP_SHARED, JSON.stringify(NP_SH)); } catch (e) {}
  if (!same) npRerender();
}

// ---- players' notes (npc_notes) ----
// Per revealed NPC: one note for the whole party (everyone, the DM too, reads and edits it) and one private note per player.
// Each row has a version the server bumps; an update says "only if it is still version N". When someone else got there first
// the two texts are merged line by line (nothing typed is ever thrown away) and the update is retried.
const NP_NOTES = 'grimoire-npc-notes-v1';
let NOTES = {};                // {noteId: {id, npc, party, scope, body, base, ver, dirty, by, err}}
const npNoteId = (npc, scope) => scope === 'party' ? 'party:' + npc : 'own:' + me() + ':' + npc;
function npNotesLoad(){
  try { const s = JSON.parse(localStorage.getItem(NP_NOTES) || 'null'); NOTES = isObj(s) && s.u === me() && isObj(s.n) ? s.n : {}; } catch (e) { NOTES = {}; }
}
function npNotesSave(){ try { localStorage.setItem(NP_NOTES, JSON.stringify({u:me(), n:NOTES})); } catch (e) {} }
/** Three-way merge by lines: mine and theirs both changed `base`. Theirs stays; my new lines are added; nothing of mine is lost. */
function npMerge(base, mine, theirs){
  if (mine === theirs || mine === base) return theirs;
  if (theirs === base) return mine;
  const t = theirs.split('\n'), b = new Set(base.split('\n')), seen = new Set(t);
  const add = mine.split('\n').filter(l => l.trim() && !b.has(l) && !seen.has(l));
  return (add.length ? [...t, ...add].join('\n') : theirs).slice(0, 4000);
}
const npNoteRowOk = r => isObj(r) && typeof r.id === 'string' && typeof r.npc_id === 'string' && (r.scope === 'party' || r.scope === 'own') && typeof r.body === 'string';
const npNoteSel = '?select=id,npc_id,party_id,scope,author,body,version';
const npNoteBy = id => id === me() ? 'you' : S.members.find(m => m.id === id)?.name || 'a player';
function npNoteTake(r, n){          // a server row arrives: a clean note is replaced, an edited one is merged
  const by = npNoteBy(r.author);
  if (!n) return NOTES[r.id] = {id:r.id, npc:r.npc_id, party:r.party_id, scope:r.scope, body:r.body, base:r.body, ver:+r.version || 1, dirty:false, by};
  if (n.dirty){ n.body = npMerge(n.base, n.body, r.body); n.merged = n.body !== r.body; }
  else { n.body = r.body; n.merged = false; }
  n.base = r.body; n.ver = +r.version || 1; n.by = by; n.party = r.party_id;
  return n;
}
async function npNotesSync(){
  if (S.noteOff || !me()) return;
  if (npNotesSync.u !== me()){ npNotesSync.u = me(); npNotesLoad(); }
  let rows;
  try { rows = await db('/npc_notes' + npNoteSel); }
  catch (e){ if (BREW_MISSING.test(e.message)){ S.noteOff = true; npRerender(); return; } throw e; }
  const seen = new Set();
  for (const r of (rows || []).filter(npNoteRowOk)){ seen.add(r.id); npNoteTake(r, NOTES[r.id]); }
  for (const id of Object.keys(NOTES)) if (!seen.has(id) && !NOTES[id].dirty) delete NOTES[id];   // hidden again or deleted: gone from view
  for (const n of Object.values(NOTES)){
    if (!n.dirty) continue;
    for (let k = 0; k < 3 && n.dirty; k++){
      let out = null;
      try {
        if (!n.ver) out = await db('/npc_notes' + npNoteSel, {method:'POST', body:[{id:n.id, npc_id:n.npc, party_id:n.party, scope:n.scope, body:n.body}], prefer:'return=representation'});
        else out = await db(`/npc_notes?id=eq.${encodeURIComponent(n.id)}&version=eq.${n.ver}` + npNoteSel.replace('?', '&'), {method:'PATCH', body:{body:n.body}, prefer:'return=representation'});
      } catch (e){
        if (/row-level security|violates/i.test(e.message)){ n.err = 'This NPC is no longer revealed, so the note cannot be saved.'; n.dirty = false; break; }
        if (!/duplicate|already exists|conflict/i.test(e.message)) throw e;
      }
      const row = Array.isArray(out) ? out.find(npNoteRowOk) : null;
      if (row && row.body === n.body){ n.dirty = false; n.err = ''; npNoteTake(row, n); n.merged = !!n.merged; break; }
      // someone else wrote first: take their version, merge mine into it and try again on top of it
      const cur = (await db('/npc_notes' + npNoteSel + '&id=eq.' + encodeURIComponent(n.id)))?.find(npNoteRowOk);
      if (!cur){ n.err = 'This NPC is no longer revealed, so the note cannot be saved.'; n.dirty = false; break; }
      npNoteTake(cur, n);
    }
  }
  npNotesSave(); npNotesPaint(); npRerender();
}
/** A note changed on the server while its box is open and has nothing unsent: update it in place, without moving the cursor away. */
function npNotesPaint(){
  for (const el of $$('.np_note')){
    const n = NOTES[npNoteId(el.dataset.npc, el.dataset.note)];
    if (n && !n.dirty && el.value !== n.body) el.value = n.body;
    const st = $('#np_note_st_' + el.dataset.note); if (st && n) st.textContent = npNoteStatus(n);
  }
}
const npNoteStatus = n => n.err ? n.err : n.dirty ? 'Saving…' : n.merged ? 'Merged with a newer edit from ' + n.by + '.' : n.ver ? (n.scope === 'party' && n.by ? 'Last edit by ' + n.by + '.' : 'Saved.') : '';
function npNoteSet(npc, party, scope, body){
  const id = npNoteId(npc, scope), n = NOTES[id] || (NOTES[id] = {id, npc, party, scope, body:'', base:'', ver:0, dirty:false, by:'you'});
  n.body = body.slice(0, 4000); n.dirty = true; n.err = ''; n.merged = false; n.party = party;
  npNotesSave(); npSyncSoon();
}
function npNotesHTML(npc, party){
  if (!CLOUD || !me() || S.npcOff || !party) return '';
  if (npNotesSync.u !== me()){ npNotesSync.u = me(); npNotesLoad(); }
  if (S.noteOff) return `<section class="npSec npNotes"><h3>Players' notes</h3><p class="muted small">Notes are not set up on the server yet.</p></section>`;
  const box = (scope, title, hint) => {
    const n = NOTES[npNoteId(npc, scope)];
    const st = n ? npNoteStatus(n) : '';
    return `<div class="npNote"><label for="np_note_${scope}"><b>${title}</b> <span class="muted small">${hint}</span></label>
      <textarea id="np_note_${scope}" class="np_note" data-note="${scope}" data-npc="${esc(npc)}" data-party="${esc(party)}" maxlength="4000" rows="5" placeholder="${scope === 'party' ? 'What the party has learned, promises made, who owes whom…' : 'Your own thoughts. Nobody else can read this.'}">${esc(n ? n.body : '')}</textarea>
      <div class="muted small" id="np_note_st_${scope}" role="status">${esc(st)}</div></div>`;
  };
  return `<section class="npSec npNotes" aria-labelledby="np_nh"><h3 id="np_nh">Players' notes</h3>
    ${box('party', 'Party notes', 'Everyone in the party and the DM can read and edit this.')}${box('own', 'My private notes', 'Only you can read this.')}</section>`;
}

// ---- drawing a card ----
const npBody = t => {
  const L = String(t || '').split('\n').map(l => l.trim().replace(/^[-•*]\s+/, '')).filter(Boolean);
  return L.length > 1 ? `<ul>${L.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : L.length ? `<p>${esc(L[0])}</p>` : '';
};
/** o: a full NPC (the DM) or the public copy (a player). dm marks what the party cannot see. */
function npCardHTML(o, {dm = false, by = '', names = id => npGet(id)?.o.n} = {}){
  const hid = on => dm && !on ? ' hid' : '';
  const tbl = side => {
    const rows = NP_FACTS.filter(f => f[3] === side && o.facts[f[0]]?.v).map(([k, label]) => `<div class="${hid(o.facts[k].show).trim()}"><dt>${esc(label)}:</dt><dd>${esc(o.facts[k].v)}</dd></div>`).join('');
    return rows ? `<div class="npBox"><dl>${rows}</dl></div>` : '';
  };
  const photo = `<div class="npPhoto${hid(o.imgShown)}"><span class="clip" aria-hidden="true"></span><div class="fr">${o.img ? `<img src="${esc(o.img)}" alt="Portrait of ${esc(o.n)}">` : '<span aria-hidden="true">?</span>'}</div></div>`;
  const secs = o.secs.filter(s => dm || (s.show && s.body.trim())).map(s => `<section class="npBox${hid(s.show)}"><h4>${esc(s.t)}</h4>${npBody(s.body) || '<p>—</p>'}</section>`).join('');
  const sb = o.stats && o.stats.on ? `<section class="npBox wide${hid(o.stats.show)}"><h4>Game stats</h4>
    <dl><div><dt>AC · HP · Speed:</dt><dd>${esc([o.stats.ac, o.stats.hp, o.stats.speed].map(x => x || '—').join(' · '))}${o.stats.cr ? ` · CR ${esc(o.stats.cr)}` : ''}</dd></div>
    <div><dt>${NP_ABIL.map(a => a.toUpperCase()).join(' ')}:</dt><dd>${o.stats.abil.map(v => `${v} (${fmt(mod(v))})`).join(' · ')}</dd></div></dl>${o.stats.text ? npBody(o.stats.text) : ''}</section>` : '';
  const lk = o.links.map(l => ({n:names(l.to), l})).filter(x => x.n);
  const lkb = lk.length ? `<section class="npBox"><h4>Connections</h4><ul>${lk.map(x => `<li class="${hid(x.l.show).trim()}"><b>${esc(x.n)}</b>${x.l.rel ? ' · ' + esc(x.l.rel) : ''}</li>`).join('')}</ul></section>` : '';
  const dmb = dm && (o.secret.trim() || o.voice.trim() || o.quotes.trim()) ? [['Secrets, layer by layer', o.secret, true], ['Voice & mannerisms', o.voice], ['Quotes', o.quotes]].filter(x => x[1].trim()).map(([t, b, n]) => `<section class="npBox hid dmOnly"><h4>${t} <small>(DM only)</small></h4>${n ? `<ol>${b.split('\n').map(l => l.trim()).filter(Boolean).map(l => `<li>${esc(l)}</li>`).join('')}</ol>` : npBody(b)}</section>`).join('') : '';
  return `<article class="npCard" aria-label="Dossier of ${esc(o.n)}">
    <div class="npTop"><div class="npHead"><div class="npKicker">Dossier — subject</div><h3 class="npName${hid(o.nameShown)}">${esc(o.n)}</h3></div>${photo}
      <div class="npFactsWrap">${tbl('l')}${tbl('r')}</div></div>
    ${secs || sb || lkb || dmb ? `<div class="npSecs">${secs}${lkb}${sb}${dmb}</div>` : ''}
    ${by ? `<div class="npFoot">Dossier kept by ${esc(by)}.</div>` : ''}</article>`;
}

// ---- the page ----
const NP_UI = {view:'list', edit:null, draft:null, filter:'', q:'', open:null};
function npEye(label, checked, attrs){ return `<label class="npEye" title="Players can read this"><input type="checkbox" ${checked ? 'checked' : ''} ${attrs} aria-label="Players can read: ${esc(label)}"><span aria-hidden="true">👁</span> <span class="small">players</span></label>`; }
function npcsHTML(){
  if (NP_UI.view === 'edit' && NP_UI.draft) return npEditorHTML();
  if (NP_UI.view === 'card') return npCardPageHTML();
  return npListHTML();
}
function npShareNote(){
  if (!CLOUD) return 'NPCs stay on this device. Sign-in and a party are needed to reveal them to your players.';
  if (!me()) return `NPCs stay on this device until you sign in. ${act('account', undefined, 'Sign in', 'sb')}`;
  if (S.npcOff) return 'Sharing is not set up on the server yet, so your NPCs stay on this device for now.';
  if (!S.parties.length) return `You are not in a party yet: create one or join one to reveal NPCs to your players. ${act('account', undefined, 'Account & party', 'sb')}`;
  return `Your players are in <b>${esc(S.parties[0].name)}</b>. Each NPC, folder, fact and section is hidden until you reveal it; secret notes never leave your account.`;
}
function npLineHTML(it){
  const o = it.o, grps = npGroups().filter(g => g.o.ids.includes(it.id));
  return `<div class="npLine"><span class="th">${o.img ? `<img src="${esc(o.img)}" alt="">` : '🕵️'}</span>
    <div class="t"><button type="button" class="xref" data-act="npOpen" data-arg="${esc(it.id)}"><b>${esc(o.n)}</b></button>
      <div class="muted small">${esc([o.facts.role?.v, o.facts.attitude?.v].filter(Boolean).join(' · ') || ' ')}</div>
      <div>${o.shown ? '<span class="npTag on">Revealed to players</span>' : '<span class="npTag">Hidden</span>'}${grps.map(g => `<span class="npTag">📁 ${esc(g.o.n)}</span>`).join('')}</div></div>
    <div class="acts">${act('npOpen', it.id, 'Open', 'sb')}${act('npEdit', it.id, 'Edit', 'sb')}${act('npToggle', it.id, o.shown ? 'Hide from players' : 'Reveal to players', 'sb')}${act('npDup', it.id, 'Duplicate', 'sb')}${act('npDel', it.id, 'Delete', 'sb x')}</div></div>`;
}
function npListHTML(){
  const q = norm(NP_UI.q), f = NP_UI.filter, grp = npGet(f);
  const list = npNpcs().filter(it => (!q || norm(it.o.n + ' ' + Object.values(it.o.facts).map(x => x.v).join(' ')).includes(q)) && (!f || (f === '_none' ? !npGroups().some(g => g.o.ids.includes(it.id)) : grp?.o.ids.includes(it.id))))
    .sort((a, b) => a.o.n.localeCompare(b.o.n, undefined, {sensitivity:'base'}));
  const groups = npGroups().sort((a, b) => a.o.n.localeCompare(b.o.n));
  return `<p class="npIntro">Typewritten files on the people of your campaign. ${npShareNote()}</p>
    <div class="npBar">${act('npNew', undefined, '＋ New NPC', 'btn')}${act('npGroupEdit', '', '＋ New group', 'btn ghost')}
      <label class="sr" for="np_q">Search NPCs</label><input type="search" id="np_q" placeholder="Search NPCs" value="${esc(NP_UI.q)}" autocomplete="off"></div>
    ${groups.length || npNpcs().length ? `<div class="npChips" role="group" aria-label="Filter by group">
      <button type="button" class="npChip" data-act="npFilter" data-arg="" aria-pressed="${!f}">All (${npNpcs().length})</button>
      ${groups.map(g => `<button type="button" class="npChip" data-act="npFilter" data-arg="${esc(g.id)}" aria-pressed="${f === g.id}">📁 ${esc(g.o.n)} (${g.o.ids.filter(id => npGet(id)).length})</button>`).join('')}
      ${groups.length ? `<button type="button" class="npChip" data-act="npFilter" data-arg="_none" aria-pressed="${f === '_none'}">No group</button>` : ''}</div>` : ''}
    ${groups.length ? `<section class="npSec" aria-labelledby="np_gh"><h3 id="np_gh">Groups</h3>${groups.map(g => `<div class="npGrp"><span><b>${esc(g.o.n)}</b> <span class="muted small">${g.o.ids.filter(id => npGet(id)).length} NPCs</span> ${g.o.shown ? '<span class="npTag on">Revealed</span>' : '<span class="npTag">Hidden</span>'}</span>
      <span class="row">${act('npGroupToggle', g.id, g.o.shown ? 'Hide' : 'Reveal', 'sb')}${act('npGroupEdit', g.id, 'Edit', 'sb')}${act('npGroupDel', g.id, 'Delete', 'sb x')}</span></div>`).join('')}</section>` : ''}
    <section class="npSec" aria-labelledby="np_lh"><h3 id="np_lh">${grp ? esc(grp.o.n) : 'Your NPCs'} <span class="muted">${list.length}</span></h3><div id="np_list">${npListRows(list)}</div></section>
    ${npSharedHTML()}`;
}
const npListRows = list => list.length ? list.map(npLineHTML).join('') : `<div class="empty"><p><b>${npNpcs().length ? 'Nothing matches.' : 'No NPCs yet.'}</b></p>${npNpcs().length ? '' : '<p>Make the first one: pick a template, fill what you know, and reveal to your players only what they have learned.</p>'}</div>`;
function npSharedHTML(){
  const l = npShared(); if (!l.length) return '';
  const npcs = l.filter(x => x.kind === 'npc'), groups = l.filter(x => x.kind === 'group'), used = new Set();
  const line = x => `<div class="npLine"><span class="th">${x.o.img ? `<img src="${esc(x.o.img)}" alt="">` : '🕵️'}</span><div class="t"><button type="button" class="xref" data-act="npOpenShared" data-arg="${esc(x.id)}"><b>${esc(x.o.n)}</b></button><div class="muted small">${esc(x.o.facts.role?.v || ' ')}</div></div></div>`;
  const blocks = groups.map(g => { const m = npcs.filter(n => g.o.ids.includes(n.id)); m.forEach(n => used.add(n.id)); return m.length ? `<details class="npGrp" open><summary><b>📁 ${esc(g.o.n)}</b> <span class="muted small">${m.length}</span></summary>${m.map(line).join('')}</details>` : ''; }).join('');
  const rest = npcs.filter(n => !used.has(n.id));
  return `<section class="npSec" aria-labelledby="np_sh"><h3 id="np_sh">Revealed to you <span class="muted">${npcs.length}</span></h3><p class="muted small">What your DM has let you read. Only what the characters know is here.</p>${blocks}${rest.map(line).join('')}</section>`;
}
function npCardPageHTML(){
  const sh = npShared().find(x => x.id === NP_UI.open), it = sh ? null : npGet(NP_UI.open);
  if (!sh && !it){ NP_UI.view = 'list'; return npListHTML(); }
  return `<div class="npBar">${act('npBack', undefined, '← All NPCs', 'btn ghost')}${it ? act('npEdit', it.id, 'Edit', 'btn') + act('npToggle', it.id, it.o.shown ? 'Hide from players' : 'Reveal to players', 'btn ghost') : ''}</div>
    ${it && !it.o.shown ? '<p class="muted small">Hidden from players. Dashed boxes and 🔒 mark what they cannot read even once you reveal this NPC.</p>' : it ? '<p class="muted small">Revealed to players. Dashed boxes and 🔒 mark what they still cannot read.</p>' : ''}
    ${sh ? npCardHTML(sh.o, {by:sh.by, names:id => npShared().find(x => x.id === id && x.kind === 'npc')?.o.n}) : npCardHTML(it.o, {dm:true, by:S.profile?.display_name || ''})}
    ${sh ? npNotesHTML(sh.id, sh.party) : it.o.shown ? npNotesHTML(it.id, it.o.party) : ''}`;
}

// ---- the editor ----
function npNewDraft(tpl){
  const t = NP_TPL.find(x => x.id === tpl) || NP_TPL[0];
  return npClean({n:'', secs:t.secs.map(k => ({id:uid(), k, t:NP_SECS[k][0], body:'', show:false}))});
}
function npEditorHTML(){
  const d = NP_UI.draft, canShare = npCanShare();
  const factField = ([k, label, kind]) => {
    const f = d.facts[k] || {v:'', show:false};
    const input = kind === 't' ? `<input type="text" class="np_fv" data-k="${k}" value="${esc(f.v)}" maxlength="200" aria-label="${esc(label)}">`
      : `<select class="np_fv" data-k="${k}" aria-label="${esc(label)}">${NP_ATT.map(x => opt(x, f.v, x || '—')).join('')}</select>`;
    return `<div><span class="f">${esc(label)}</span><div class="row">${input}${npEye(label, f.show, `class="np_fs" data-k="${k}"`)}</div></div>`;
  };
  const used = new Set(d.secs.map(s => s.k));
  const secEd = (s, i) => `<div class="npSecEd"><div class="hd"><input type="text" class="np_st" data-i="${i}" value="${esc(s.t)}" maxlength="80" aria-label="Section title">
      ${npEye(s.t, s.show, `class="np_ss" data-i="${i}"`)}
      ${act('npSecUp', i, '↑', 'sb', `aria-label="Move ${esc(s.t)} up" ${i ? '' : 'disabled'}`)}${act('npSecDown', i, '↓', 'sb', `aria-label="Move ${esc(s.t)} down" ${i < d.secs.length - 1 ? '' : 'disabled'}`)}${act('npSecDel', i, '✕', 'sb x', `aria-label="Remove ${esc(s.t)}"`)}</div>
      <label class="sr" for="np_sb${i}">${esc(s.t)}</label><textarea id="np_sb${i}" class="np_sb" data-i="${i}" maxlength="4000" placeholder="${esc(NP_SECS[s.k]?.[1] || 'One line per bullet.')}">${esc(s.body)}</textarea></div>`;
  const stt = d.stats || {on:false, show:false, ac:'', hp:'', speed:'', cr:'', abil:[10, 10, 10, 10, 10, 10], text:''};
  return `<div class="npBar">${act('npBack', undefined, '← Back', 'btn ghost')}${act('npSave', undefined, 'Save NPC', 'btn')}</div>
  <form id="npForm" class="npEdWrap" onsubmit="return false"><div>
    ${card('Identity', `
      <label class="f" for="np_n">Name</label><div class="row"><input type="text" id="np_n" value="${esc(d.n === 'Unnamed' ? '' : d.n)}" maxlength="80" style="flex:1;min-width:0" autocomplete="off">${npEye('name', d.nameShown, 'id="np_ns"')}</div>
      <label class="f" for="np_al">Name shown while hidden</label><input type="text" id="np_al" value="${esc(d.alias)}" maxlength="80" placeholder="Hooded stranger" style="width:100%">
      <div class="row mt"><span class="portraitPick">${d.img ? `<img class="portrait mid" src="${esc(d.img)}" alt="">` : '<span class="portraitEmoji mid" aria-hidden="true">🕵️</span>'}</span>
        <label class="btn ghost" for="np_img">${d.img ? 'Change picture' : 'Upload picture'}</label><input type="file" id="np_img" accept="image/*" class="sr">${d.img ? act('npImgClear', undefined, 'Remove', 'sb x') : ''}${npEye('picture', d.imgShown, 'id="np_is"')}</div>
      <label class="row mt"><input type="checkbox" id="np_shown" ${d.shown ? 'checked' : ''} ${canShare || d.shown ? '' : 'disabled'}> <b>Reveal this NPC to my players</b></label>
      <p class="npHint">${canShare ? 'Off: nobody else sees it. On: the party reads the name, picture, facts and sections that have the 👁 ticked, and nothing else.' : esc(npShareNote().replace(/<[^>]+>/g, ''))}</p>`)}
    ${card('Facts', `<p class="npHint">Leave empty what you do not need. Tick 👁 for each fact the players may read.</p><div class="npFacts">${NP_FACTS.map(factField).join('')}</div>`)}
    ${card('Sections', `<p class="npHint">Optional and in the order you want. One line makes a paragraph, several lines make bullets.</p>${d.secs.map(secEd).join('') || '<p class="muted">No sections yet.</p>'}
      <div class="row mt"><label class="sr" for="np_add">Add a section</label><select id="np_add">${Object.keys(NP_SECS).filter(k => !used.has(k)).map(k => `<option value="${k}">${esc(NP_SECS[k][0])}</option>`).join('')}<option value="">Custom section…</option></select>${act('npSecAdd', undefined, '＋ Add section', 'sb')}</div>`)}
    ${card('Game stats (optional)', `<label class="row"><input type="checkbox" id="np_st_on" ${stt.on ? 'checked' : ''}> This NPC has a stat block</label>
      <div class="npStats mt">${[['ac', 'AC'], ['hp', 'HP'], ['speed', 'Speed'], ['cr', 'CR']].map(([k, l]) => `<label>${l}<input type="text" id="np_st_${k}" value="${esc(stt[k])}" maxlength="30"></label>`).join('')}</div>
      <div class="npStats mt">${NP_ABIL.map((a, i) => `<label>${a.toUpperCase()}<input type="number" class="np_ab" min="1" max="30" value="${stt.abil[i]}"></label>`).join('')}</div>
      <label class="f" for="np_st_text">Attacks and traits</label><textarea id="np_st_text" style="width:100%;min-height:80px" maxlength="2000">${esc(stt.text)}</textarea>
      <div class="mt">${npEye('game stats', stt.show, 'id="np_st_show"')}</div>`)}
    ${card('Connections to other NPCs', `<p class="npHint">Family, rivals, employers… as many as you like. A player sees a connection only if you tick 👁 and that NPC is revealed too.</p>${d.links.map((l, i) => `<div class="row mt"><select class="np_lt" data-i="${i}" aria-label="Connected NPC">${npNpcs().filter(x => x.id !== (NP_UI.edit || '')).map(x => opt(x.id, l.to, x.o.n)).join('')}${npGet(l.to) ? '' : opt(l.to, l.to, '(deleted NPC)')}</select><input type="text" class="np_lr" data-i="${i}" value="${esc(l.rel)}" maxlength="60" placeholder="Brother, employer, rival…" aria-label="Relation" style="flex:1;min-width:0">${npEye('connection', l.show, `class="np_ls" data-i="${i}"`)}${act('npLinkDel', i, '✕', 'sb x', 'aria-label="Remove connection"')}</div>`).join('')}
      <div class="row mt">${act('npLinkAdd', undefined, '＋ Add connection', 'sb', npNpcs().filter(x => x.id !== (NP_UI.edit || '')).length ? '' : 'disabled')}${npNpcs().filter(x => x.id !== (NP_UI.edit || '')).length ? '' : '<span class="muted small">Save at least one other NPC first.</span>'}</div>`)}
    ${card('Secrets and table notes (only you)', `<p class="npHint">These three never leave your account: they are not part of what the players receive.</p>
      <label class="f" for="np_secret">Secrets, layer by layer</label><p class="npHint">One layer per line, from what a clever guess finds to the deepest truth.</p><textarea id="np_secret" style="width:100%;min-height:110px" maxlength="4000" placeholder="Takes bribes from the guild&#10;The bribes pay for his sister's cure&#10;He is the one who burned the archive">${esc(d.secret)}</textarea>
      <label class="f" for="np_voice">Voice & mannerisms</label><textarea id="np_voice" style="width:100%;min-height:70px" maxlength="1500" placeholder="Slow, gravelly; taps the table when lying">${esc(d.voice)}</textarea>
      <label class="f" for="np_quotes">Quotes</label><textarea id="np_quotes" style="width:100%;min-height:70px" maxlength="2000" placeholder="One line each, to read aloud">${esc(d.quotes)}</textarea>`)}
    <div class="row mt">${act('npSave', undefined, 'Save NPC', 'btn')}${act('npBack', undefined, 'Cancel', 'btn ghost')}</div>
  </div><div class="npPrev"><h3 class="muted small">Preview (🔒 = hidden from players)</h3><div id="np_prev">${npCardHTML(d, {dm:true})}</div></div></form>`;
}
/** The form as an NPC; used by the live preview, the reorder buttons and Save. */
function npRead(){
  const d = NP_UI.draft; if (!d || !$('#npForm')) return d;
  const o = {...d, n:$('#np_n').value.trim(), alias:$('#np_al').value.trim(), nameShown:$('#np_ns').checked, imgShown:$('#np_is').checked, shown:$('#np_shown').checked, secret:$('#np_secret').value, voice:$('#np_voice').value, quotes:$('#np_quotes').value, facts:{}};
  $$('#npForm .np_fv').forEach(el => { const v = el.value.trim(), k = el.dataset.k; if (v) o.facts[k] = {v, show:!!$(`#npForm .np_fs[data-k="${k}"]`)?.checked}; });
  o.secs = d.secs.map((s, i) => ({...s, t:$(`#npForm .np_st[data-i="${i}"]`).value.trim() || 'Section', body:$(`#np_sb${i}`).value, show:$(`#npForm .np_ss[data-i="${i}"]`).checked}));
  o.links = d.links.map((l, i) => ({to:$(`#npForm .np_lt[data-i="${i}"]`).value, rel:$(`#npForm .np_lr[data-i="${i}"]`).value.trim(), show:$(`#npForm .np_ls[data-i="${i}"]`).checked}));
  o.stats = {on:$('#np_st_on').checked, show:$('#np_st_show').checked, ac:$('#np_st_ac').value, hp:$('#np_st_hp').value, speed:$('#np_st_speed').value, cr:$('#np_st_cr').value, abil:$$('#npForm .np_ab').map(x => x.value), text:$('#np_st_text').value};
  return NP_UI.draft = npClean(o);
}
function npPreview(){
  const o = npRead(), box = $('#np_prev'); if (o && box) box.innerHTML = npCardHTML({...o, n:o.n === 'Unnamed' ? 'Unnamed' : o.n}, {dm:true});
}
function npShow(view, extra = {}){ Object.assign(NP_UI, {view}, extra); if (G.chapter !== 'npcs') turnTo('npcs'); else renderPage(); window.scrollTo({top:Math.max(0, ($('#book')?.getBoundingClientRect().top || 0) + scrollY - 8), behavior:'auto'}); }
function npGroupModal(id){
  const g = id ? npGet(id) : null, o = g ? g.o : {n:'', ids:[], shown:false};
  modal(`<div class="head"><h2>${g ? 'Edit group' : 'New group'}</h2><span class="spacer"></span>${closeBtn()}</div>
    <label class="f" for="np_gn">Group name</label><input type="text" id="np_gn" value="${esc(o.n)}" maxlength="80" placeholder="The Gilded Court" style="width:100%" autofocus>
    <label class="row mt"><input type="checkbox" id="np_gs" ${o.shown ? 'checked' : ''} ${npCanShare() || o.shown ? '' : 'disabled'}> Players can see this group (it lists only the NPCs you have revealed)</label>
    <p class="f mt">Members <span class="muted small">(an NPC can be in many groups)</span></p>
    <div class="npMemb" style="max-height:40vh;overflow:auto">${npNpcs().sort((a, b) => a.o.n.localeCompare(b.o.n)).map(n => `<label class="row"><input type="checkbox" class="np_gm" value="${esc(n.id)}" ${o.ids.includes(n.id) ? 'checked' : ''}> ${esc(n.o.n)}</label>`).join('') || '<p class="muted">Make some NPCs first.</p>'}</div>
    <div class="row mt">${act('npGroupSave', id || '', 'Save group', 'btn')}${act('close', undefined, 'Cancel', 'btn ghost')}</div>`, {label:'Group'});
}
function npShareGuard(want){
  if (want && !npCanShare()){ toast(CLOUD && me() && !S.npcOff ? 'Create or join a party first: that is who reads what you reveal.' : 'Sharing needs an account, a party and the NPC tables on the server.'); return false; }
  return true;
}
function npDone(it){ npTouch(it); npPersist(); npSyncSoon(); }
const ACT_NPC = {
  npNew(){ modal(`<div class="head"><h2>New NPC</h2><span class="spacer"></span>${closeBtn()}</div><p class="muted">Pick the sections to start from. You can add, remove and reorder them later.</p>
    ${NP_TPL.map(t => `<button type="button" class="btn ghost" style="display:block;width:100%;text-align:left;margin:6px 0" data-act="npCreate" data-arg="${t.id}"><b>${esc(t.t)}</b><br><span class="small">${esc(t.d)}</span></button>`).join('')}`, {label:'New NPC'}); },
  npCreate(t){ closeModal(); NP_UI.edit = null; npShow('edit', {draft:npNewDraft(t)}); $('#np_n')?.focus({preventScroll:true}); },
  npEdit(id){ const it = npGet(id); if (!it) return; NP_UI.edit = id; npShow('edit', {draft:npClean(JSON.parse(JSON.stringify(it.o)))}); },
  npOpen(id){ npShow('card', {open:id}); },
  npOpenShared(id){ npShow('card', {open:id}); },
  npBack(){ NP_UI.draft = null; NP_UI.edit = null; npShow('list'); },
  npFilter(g){ NP_UI.filter = g; renderPage(); },
  npSave(){
    const o = npRead(); if (!o) return;
    if (!o.n || o.n === 'Unnamed'){ toast('Give the NPC a name.'); $('#np_n')?.focus(); return; }
    if (o.shown && !npShareGuard(true)) o.shown = false;
    if (o.shown) o.party = S.parties[0].id;
    const it = NP_UI.edit && npGet(NP_UI.edit);
    if (it){ it.o = o; npDone(it); } else { const n = {id:uid(), kind:'npc', o, updatedAt:0}; NPCS.push(n); npDone(n); NP_UI.edit = n.id; }
    toast('NPC saved.'); NP_UI.draft = null; npShow('card', {open:NP_UI.edit});
  },
  npToggle(id){
    const it = npGet(id); if (!it) return; const want = !it.o.shown;
    if (!npShareGuard(want)) return;
    it.o.shown = want; if (want) it.o.party = S.parties[0].id; npDone(it);
    toast(want ? `${it.o.n} is now revealed to your players (only what is ticked).` : `${it.o.n} is hidden from your players.`); renderPage();
  },
  npDup(id){ const it = npGet(id); if (!it) return; const n = {id:uid(), kind:'npc', o:npClean(JSON.parse(JSON.stringify(it.o))), updatedAt:0}; n.o.n = (n.o.n + ' (copy)').slice(0, 80); n.o.shown = false; n.o.party = null; n.o.secs.forEach(s => s.id = uid()); NPCS.push(n); npDone(n); renderPage(); toast('Duplicated: the copy is hidden from players.'); },
  npDel(id){ const it = npGet(id); if (!it) return; confirmBox(`Delete ${it.o.n}?`, 'Delete', () => {
    NPCS = NPCS.filter(x => x.id !== id); npNpcs().forEach(n => { if (n.o.links.some(l => l.to === id)){ n.o.links = n.o.links.filter(l => l.to !== id); npTouch(n); } }); npGroups().forEach(g => { if (g.o.ids.includes(id)){ g.o.ids = g.o.ids.filter(x => x !== id); npTouch(g); } });
    if (CLOUD){ const t = npTombGet(); t[id] = Date.now(); npTombSet(t); }
    npPersist(); npSyncSoon(); if (NP_UI.view === 'card') NP_UI.view = 'list'; renderPage(); toast('NPC deleted.'); }); },
  npImgClear(){ npRead(); NP_UI.draft.img = ''; NP_UI.draft.imgShown = false; renderPage(); },
  npSecAdd(){ const d = npRead(), k = $('#np_add')?.value || ''; if (d.secs.length >= 40) return toast('That is plenty of sections.');
    d.secs.push({id:uid(), k, t:k ? NP_SECS[k][0] : 'New section', body:'', show:false}); renderPage(); const n = $$('#npForm .np_st'); n[n.length - 1]?.focus(); n[n.length - 1]?.select(); },
  npSecUp(i){ const d = npRead(); i = +i; if (i > 0){ [d.secs[i - 1], d.secs[i]] = [d.secs[i], d.secs[i - 1]]; renderPage(); $(`#npForm [data-act="npSecUp"][data-arg="${i - 1}"]`)?.focus(); } },
  npSecDown(i){ const d = npRead(); i = +i; if (i < d.secs.length - 1){ [d.secs[i + 1], d.secs[i]] = [d.secs[i], d.secs[i + 1]]; renderPage(); $(`#npForm [data-act="npSecDown"][data-arg="${i + 1}"]`)?.focus(); } },
  npSecDel(i){ const d = npRead(); d.secs.splice(+i, 1); renderPage(); },
  npLinkAdd(){ const d = npRead(), t = npNpcs().find(x => x.id !== NP_UI.edit); if (t){ d.links.push({to:t.id, rel:'', show:false}); renderPage(); } },
  npLinkDel(i){ const d = npRead(); d.links.splice(+i, 1); renderPage(); },
  npGroupEdit(id){ npGroupModal(id); },
  npGroupSave(id){
    const name = $('#np_gn').value.trim(); if (!name){ toast('Give the group a name.'); return; }
    let shown = $('#np_gs').checked; if (shown && !npShareGuard(true)) shown = false;
    const ids = $$('.np_gm').filter(x => x.checked).map(x => x.value);
    let g = id && npGet(id);
    if (!g){ g = {id:uid(), kind:'group', o:npClean({n:name}, true), updatedAt:0}; NPCS.push(g); }
    g.o = npClean({n:name, ids, shown, party:shown ? S.parties[0].id : g.o.party}, true); npDone(g);
    closeModal(); renderPage(); },
  npGroupToggle(id){ const g = npGet(id); if (!g) return; const want = !g.o.shown; if (!npShareGuard(want)) return; g.o.shown = want; if (want) g.o.party = S.parties[0].id; npDone(g); renderPage(); },
  npGroupDel(id){ const g = npGet(id); if (!g) return; confirmBox(`Delete the group ${g.o.n}? The NPCs inside stay.`, 'Delete', () => {
    NPCS = NPCS.filter(x => x.id !== id); if (NP_UI.filter === id) NP_UI.filter = '';
    if (CLOUD){ const t = npTombGet(); t[id] = Date.now(); npTombSet(t); }
    npPersist(); npSyncSoon(); renderPage(); }); },
};
function npWire(){
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'np_q'){ NP_UI.q = el.value; const l = $('#np_list'); if (l){ const q = norm(NP_UI.q); l.innerHTML = npListRows(npNpcs().filter(it => (!NP_UI.filter || npGet(NP_UI.filter)?.o.ids.includes(it.id) || NP_UI.filter === '_none') && (!q || norm(it.o.n + ' ' + Object.values(it.o.facts).map(x => x.v).join(' ')).includes(q))).sort((a, b) => a.o.n.localeCompare(b.o.n))); } return; }
    if (el.closest?.('#npForm')) npPreview();
    if (el.classList?.contains('np_note')){ npNoteSet(el.dataset.npc, el.dataset.party, el.dataset.note, el.value); const st = $('#np_note_st_' + el.dataset.note); if (st) st.textContent = 'Saving…'; }
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.closest?.('#npForm') && el.id !== 'np_img') npPreview();
    if (el.id === 'np_img' && el.files[0]){ npRead(); shrinkImage(el.files[0]).then(d => { NP_UI.draft.img = d; renderPage(); }).catch(() => toast('That image could not be read.')); el.value = ''; }
  });
}

Object.assign(ACT, ACT_NPC);
/* B-053: the saved heroes could not be read. A copy of the original text is kept in a backup key and offered as a download. */
function damagedWarn(){
  if (!G.damaged) return;
  const w = document.createElement('div'); w.id = 'damagedWarn'; w.className = 'toast fumble'; w.setAttribute('role', 'alert');
  w.style.cssText = 'top:auto;bottom:max(12px, env(safe-area-inset-bottom, 0px));z-index:96;width:min(640px, 92vw)';
  w.innerHTML = '<b>Your saved heroes could not be read (damaged data).</b> A copy of the original is kept on this device. Example heroes are shown instead; <a download="grimoire-damaged-save.txt" href="data:text/plain;charset=utf-8,' + encodeURIComponent(G.damaged) + '">download the copy</a> to try to recover it. <button class="btn small" type="button" id="damagedOk">OK</button>';
  document.body.appendChild(w); $('#damagedOk').onclick = () => w.remove();
}
async function boot(){
  bakeTextures();
  await load();
  npLoad();
  await loadPacks();
  buildIndex();
  if (!CHAPTERS.some(c => c.id === G.chapter)) G.chapter = 'hero';
  window.Aspetto?.attach({modal, closeBtn, plusOK, plusModal, setTone:t => { G.theme = t; save(); applyTheme(); }});
  applyTheme(); wire(); npWire(); render(); syncTray(); cloudBoot(); damagedWarn();
  if (!G.showCover && G.coverOnStart === false){ $('#coverBk')?.remove(); welcome(); }
  else { fillCover(); $('#coverBk').hidden = false; }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

