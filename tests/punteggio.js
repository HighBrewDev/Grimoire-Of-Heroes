#!/usr/bin/env node
// Calcola i punteggi del giorno dai risultati in tests/risultati/ e da docs/bug-beta.md, e riscrive docs/scoreboard.md.
// Uso: node tests/punteggio.js            (usa il file di risultati più recente)
//      DATA=2026-11-09 node tests/punteggio.js
// Lo storico (punteggi, bug già contati) sta in tests/risultati/storico.json, così ogni bug pesa una volta sola.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RIS = path.join(__dirname, 'risultati');
const STORICO = path.join(RIS, 'storico.json');

const SEZIONI = [
  ['eroe', 'Eroe (creazione, nome, specie, background)'],
  ['caratteristiche', 'Caratteristiche (punteggi, modificatori, TS, abilità)'],
  ['combattimento', 'Combattimento (PF, CA, attacchi, riposi)'],
  ['incontro', 'Incontro (iniziativa, round)'],
  ['tratti', 'Tratti e talenti'],
  ['incantesimi', 'Incantesimi (slot, preparati, multiclasse)'],
  ['zaino', 'Zaino e monete'],
  ['cronaca', 'Cronaca'],
  ['biblioteca', 'Biblioteca (ricerca regole)'],
  ['workshop', 'Workshop homebrew'],
  ['levelup', 'Level up e multiclasse'],
  ['importexport', 'Import/export e salvataggio'],
  ['telefono', 'Telefono (390x844)'],
  ['robustezza', 'Robustezza (console, offline, input strani)'],
];
const NOME = Object.fromEntries(SEZIONI);

// Sezione di ogni bug già noto; per i bug nuovi si indovina dal campo "Dove" (poi conviene aggiungerli qui).
const BUG_SEZIONE = {
  'B-001':'workshop', 'B-002':'importexport', 'B-003':'importexport', 'B-004':'importexport', 'B-005':'levelup', 'B-006':'combattimento',
  'B-007':'importexport', 'B-008':'eroe', 'B-009':'eroe', 'B-010':'importexport', 'B-011':'workshop', 'B-012':'importexport',
  'B-013':'zaino', 'B-014':'eroe', 'B-015':'importexport',
  'B-021':'levelup', 'B-022':'levelup', 'B-023':'combattimento', 'B-024':'importexport', 'B-025':'levelup',
};
const INDIZI = [
  [/390|telefono|mobile|tocco/i, 'telefono'], [/workshop|homebrew/i, 'workshop'], [/level ?up|multiclass/i, 'levelup'],
  [/import|export|salvat|localstorage|schede/i, 'importexport'], [/incantesim|spell|slot/i, 'incantesimi'], [/zaino|pack|monet|oggett/i, 'zaino'],
  [/incontro|encounter|iniziativa/i, 'incontro'], [/combattimento|combat|PF|CA\b/i, 'combattimento'], [/tratti|talent|feat/i, 'tratti'],
  [/attributi|caratteristic|abilit/i, 'caratteristiche'], [/cronaca|chronicle|note/i, 'cronaca'], [/library|biblioteca|ricerca/i, 'biblioteca'],
  [/eroe|wizard|scaffale|nome/i, 'eroe'],
];
const PESO = {critica:-10, alta:-5, media:-2, bassa:-1, ux:-1};

const giorno = d => new Date(d + 'T00:00:00Z');
const meno = (d, n) => new Date(giorno(d).getTime() - n * 864e5).toISOString().slice(0, 10);

function leggiBug(){
  const md = fs.readFileSync(path.join(ROOT, 'docs', 'bug-beta.md'), 'utf8');
  const aperti = md.split(/^## Aperti/m)[1]?.split(/^## Risolti/m)[0] || '';
  const risolti = md.split(/^## Risolti/m)[1]?.split(/^## Diario/m)[0] || '';
  const parse = (txt, stato) => txt.split(/^### /m).slice(1).map(b => {
    const m = b.match(/^(B-\d+)\s*\[([^\]]+)\](?:\s*\[([^\]]+)\])?\s*(.*)/);
    if (!m) return null;
    const tag = (m[2] + ' ' + (m[3] || '')).toLowerCase();
    const grav = ['critica', 'alta', 'media', 'bassa'].find(g => tag.includes(g)) || (tag.includes('ux') ? 'ux' : 'media');
    const ux = tag.includes('ux');
    const trovato = (b.match(/Trovato da:[^\n]*?(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
    const chiuso = (b.match(/Risolto\**\s*(?:il\s*)?(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
    const dove = (b.match(/- Dove:([^\n]*)/) || [])[1] || m[4];
    const sezione = BUG_SEZIONE[m[1]] || (INDIZI.find(([re]) => re.test(dove + ' ' + m[4])) || [])[1] || 'robustezza';
    return {id:m[1], grav, ux, peso:ux && grav === 'bassa' ? PESO.ux : PESO[grav], titolo:m[4].trim(), trovato, chiuso, stato, sezione};
  }).filter(Boolean);
  return [...parse(aperti, 'aperto'), ...parse(risolti, 'risolto')];
}

function main(){
  const files = fs.readdirSync(RIS).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  if (!files.length) throw new Error('Nessun risultato in tests/risultati: esegui prima node tests/run.js');
  const oggi = process.env.DATA || files[files.length - 1].slice(0, 10);
  const res = Object.fromEntries(files.map(f => [f.slice(0, 10), JSON.parse(fs.readFileSync(path.join(RIS, f), 'utf8'))]));
  const R = res[oggi]; if (!R) throw new Error('Nessun risultato per ' + oggi);
  const ieri = Object.keys(res).filter(d => d < oggi).sort().pop() || null;
  const st = fs.existsSync(STORICO) ? JSON.parse(fs.readFileSync(STORICO, 'utf8')) : {giorni:{}, bugContati:{}, bugPremiati:{}};
  // se si ricalcola lo stesso giorno, i bug contati quel giorno si ricontano
  for (const k of ['bugContati', 'bugPremiati']) for (const [id, d] of Object.entries(st[k])) if (d === oggi) delete st[k][id];

  const bug = leggiBug(), finestra = meno(oggi, 1);
  const esitoIeri = new Map((ieri ? res[ieri].risultati : []).map(r => [r.sezione + '|' + r.test, r.esito]));
  const S = {};
  for (const [id] of SEZIONI) S[id] = {id, sup:0, tot:0, fall:[], regr:[], nuovi:[], premi:[], aperti:[], punti:0};
  for (const r of R.risultati){
    const s = S[r.sezione] || (S[r.sezione] = {id:r.sezione, sup:0, tot:0, fall:[], regr:[], nuovi:[], premi:[], aperti:[], punti:0});
    s.tot++;
    if (r.esito === 'superato'){ s.sup++; s.punti += 1; }
    else { s.fall.push(r); s.punti -= 3; if (esitoIeri.get(r.sezione + '|' + r.test) === 'superato'){ s.regr.push(r); s.punti -= 5; } }
  }
  for (const b of bug){
    const s = S[b.sezione];
    if (b.stato === 'aperto') s.aperti.push(b);
    if (b.trovato && b.trovato >= finestra && b.trovato <= oggi && !st.bugContati[b.id]){ s.nuovi.push(b); s.punti += b.peso; st.bugContati[b.id] = oggi; }
    if (b.stato === 'risolto' && b.chiuso && b.chiuso >= finestra && b.chiuso <= oggi && !st.bugPremiati[b.id]){
      const t = R.risultati.filter(r => r.test.startsWith(b.id + ' '));
      if (t.length && t.every(r => r.esito === 'superato')){ s.premi.push(b); s.punti += 3; st.bugPremiati[b.id] = oggi; }
    }
  }
  const ordine = Object.values(S);
  st.giorni[oggi] = {commit:R.commit, totale:ordine.reduce((t, s) => t + s.punti, 0), superati:R.superati, totali:R.totali,
    sezioni:Object.fromEntries(ordine.map(s => [s.id, {punti:s.punti, sup:s.sup, tot:s.tot}]))};
  const giorni = Object.keys(st.giorni).filter(d => d <= oggi).sort();
  const ultimi7 = giorni.filter(d => d > meno(oggi, 7));
  const prec = giorni.filter(d => d < oggi).pop();
  const tutto = (d, id) => { const x = st.giorni[d]?.sezioni?.[id]; return x && x.tot > 0 && x.sup === x.tot; };
  for (const s of ordine){
    const v = ultimi7.map(d => st.giorni[d].sezioni[s.id]?.punti).filter(x => x !== undefined);
    s.media = v.reduce((a, b) => a + b, 0) / v.length;
    const p = prec ? st.giorni[prec].sezioni[s.id]?.punti : undefined;
    s.tend = p === undefined ? '—' : s.punti > p ? '↑' : s.punti < p ? '↓' : '=';
    const tre = giorni.slice(-3);
    const gravi = s.aperti.some(b => b.grav === 'alta' || b.grav === 'critica');
    s.stato = s.punti < 0 || s.regr.length ? 'ROSSO' : tre.length === 3 && tre.every(d => tutto(d, s.id)) && !gravi ? 'VERDE' : 'GIALLO';
  }
  const tot = st.giorni[oggi].totale, totPrec = prec ? st.giorni[prec].totale : undefined;
  const tendTot = totPrec === undefined ? '— (primo giorno)' : tot > totPrec ? `↑ (ieri ${totPrec})` : tot < totPrec ? `↓ (ieri ${totPrec})` : `= (ieri ${totPrec})`;
  fs.writeFileSync(STORICO, JSON.stringify(st, null, 1) + '\n');

  const f1 = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
  const segno = n => (n > 0 ? '+' : '') + n;
  const classifica = [...ordine].sort((a, b) => a.punti - b.punti || a.sup / Math.max(1, a.tot) - b.sup / Math.max(1, b.tot));
  const L = [];
  L.push('# Scoreboard di Grimoire of Heroes', '');
  L.push(`Aggiornato il **${oggi}** sul commit \`${R.commit}\` di main dall'agente "Test e punteggio". Fase intensiva fino al 23 novembre 2026: il lavoro del team si sceglie da questi punteggi.`, '');
  L.push('## Regole (sono la legge per tutto il team)', '');
  L.push('- Test superato **+1**, test fallito **−3**.');
  L.push('- Bug nuovo aperto dai beta tester nelle ultime 24 ore (docs/bug-beta.md, nella sua sezione): critica **−10**, alta **−5**, media **−2**, bassa/[UX] **−1**. Ogni bug conta una volta sola.');
  L.push('- Bug chiuso (in "Risolti" da meno di 24 ore) con test di regressione che ora passa: **+3**.');
  L.push('- Test che passava ieri e oggi fallisce (regressione): **−5** in più.');
  L.push('- Stato: **ROSSO** se il punteggio di oggi è negativo o c\'è una regressione; **VERDE** se tutti i test della sezione passano da 3 giorni di fila e non ci sono bug alti o critici aperti; altrimenti **GIALLO**.');
  L.push('- I test sono in `tests/` (Playwright, server locale, niente rete). Non si cambia un test per farlo passare se l\'app è sbagliata: si corregge l\'app. Ogni bug aperto automatizzabile ha un test con il suo ID nel nome.');
  L.push('- Eseguire: `node tests/run.js` (tutto, scrive `tests/risultati/AAAA-MM-GG.json`), poi `node tests/punteggio.js`. Una sezione sola: `node tests/run.js telefono`; un test: `node tests/run.js --grep B-005`.', '');
  L.push('## Oggi', '');
  L.push(`- Test superati: **${R.superati} / ${R.totali}**`);
  L.push(`- Punteggio totale: **${segno(tot)}**, tendenza ${tendTot}`);
  L.push(`- Sezioni rosse: ${ordine.filter(s => s.stato === 'ROSSO').map(s => s.id).join(', ') || 'nessuna'}`, '');
  L.push('| Sezione | Punteggio oggi | Media 7 gg | Tendenza | Test superati | Bug aperti | Stato |');
  L.push('|---|---:|---:|:---:|---:|---|---|');
  for (const s of ordine) L.push(`| ${NOME[s.id] || s.id} | ${segno(s.punti)} | ${f1(s.media)} | ${s.tend} | ${s.sup}/${s.tot} | ${s.aperti.map(b => `${b.id} (${b.ux && b.grav === 'bassa' ? 'UX' : b.grav})`).join(', ') || '—'} | ${s.stato === 'ROSSO' ? '🔴' : s.stato === 'VERDE' ? '🟢' : '🟡'} ${s.stato} |`);
  L.push('', '## Dettaglio delle sezioni', '');
  for (const s of classifica){
    const righe = [];
    if (s.fall.length) righe.push(...s.fall.map(r => `  - ✗ ${r.test}${s.regr.includes(r) ? ' **(regressione, −5)**' : ''}: ${String(r.errore || '').replace(/\s+/g, ' ').replace(/\|/g, '/').slice(0, 220)}`));
    if (s.nuovi.length) righe.push(...s.nuovi.map(b => `  - Bug nuovo ${b.id} [${b.grav}${b.ux ? ', UX' : ''}] ${b.peso}: ${b.titolo}`));
    if (s.premi.length) righe.push(...s.premi.map(b => `  - Bug chiuso ${b.id} con test che passa +3: ${b.titolo}`));
    const conto = `${s.sup} × +1, ${s.fall.length} × −3${s.regr.length ? `, ${s.regr.length} × −5` : ''}${s.nuovi.length ? `, bug nuovi ${s.nuovi.reduce((t, b) => t + b.peso, 0)}` : ''}${s.premi.length ? `, bug chiusi +${3 * s.premi.length}` : ''}`;
    L.push(`- **${s.id}** ${segno(s.punti)} (${conto})${righe.length ? '' : ': tutto verde oggi.'}`, ...righe);
  }
  L.push('', '## Classifica (dalla peggiore alla migliore)', '');
  classifica.forEach((s, i) => L.push(`${i + 1}. ${s.id} ${segno(s.punti)} · ${s.sup}/${s.tot} · ${s.stato}`));
  L.push('', '## Storico', '', '```');
  for (const d of giorni) { const g = st.giorni[d]; L.push(`${d}  totale ${segno(g.totale).padStart(5)}  test ${g.superati}/${g.totali}  ${g.commit || ''}`); }
  L.push('```', '');
  fs.writeFileSync(path.join(ROOT, 'docs', 'scoreboard.md'), L.join('\n'));
  console.log(`Totale ${segno(tot)} · ${R.superati}/${R.totali} · peggiori: ${classifica.slice(0, 3).map(s => `${s.id} ${segno(s.punti)}`).join(', ')}`);
}
main();
