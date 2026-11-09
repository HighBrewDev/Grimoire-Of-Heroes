#!/usr/bin/env node
// Esegue tutti i file tests/sezioni/*.test.js e scrive tests/risultati/AAAA-MM-GG.json.
// Uso: node tests/run.js            (tutta la suite, scrive il file del giorno)
//      node tests/run.js eroe zaino  (solo quelle sezioni, non scrive nulla)
//      node tests/run.js --grep B-005
const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const {chromium} = require('playwright');
const {open, startServer, ROOT} = require('./lib');

const args = process.argv.slice(2);
const gi = args.indexOf('--grep'), grep = gi >= 0 ? args.splice(gi, 2)[1] : null;
const only = args.filter(a => !a.startsWith('--'));
const full = !only.length && !grep;
const TIMEOUT = 30000;

// messaggio d'errore su una riga, senza il diff di assert
const pulisci = m => String(m).replace(/\u001b\[[0-9;]*m/g, '').split(/\s*\+ actual - expected/)[0].split('\n').slice(0, 6).join(' ').replace(/\s+\S+ !== \S+\s*$/, '').replace(/\s+/g, ' ').trim().slice(0, 600);
module.exports = {pulisci};

const today = process.env.DATA || new Date().toISOString().slice(0, 10);

async function main(){
  const dir = path.join(__dirname, 'sezioni');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.test.js')).sort();
  const suites = files.map(f => ({file:f, ...require(path.join(dir, f))})).filter(s => !only.length || only.includes(s.sezione));
  const server = await startServer();
  const browser = await chromium.launch();
  const out = [];
  try {
    for (const s of suites){
      for (const [nome, fn, flags = {}] of s.test){
        if (grep && !nome.includes(grep)) continue;
        const apps = [];
        const ctx = {browser, base:server.base, open:async (o = {}) => { const a = await open(browser, server.base, o); apps.push(a); return a; }};
        const t0 = Date.now(); let errore = null;
        try {
          await Promise.race([fn(ctx), new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout dopo ${TIMEOUT / 1000} s`)), TIMEOUT))]);
          const pe = apps.flatMap(a => a.pageErrors);
          if (pe.length && !flags.allowPageErrors) throw new Error('PAGEERROR ' + pe.slice(0, 3).join(' | '));
        } catch (e) { errore = pulisci(e && e.message || e); }
        for (const a of apps) await a.context.close().catch(() => {});
        const r = {sezione:s.sezione, test:nome, esito:errore ? 'fallito' : 'superato', durata:Date.now() - t0, errore};
        out.push(r);
        console.log(`${errore ? '✗' : '✓'} [${s.sezione}] ${nome} (${r.durata} ms)${errore ? '\n    ' + errore : ''}`);
      }
    }
  } finally { await browser.close(); server.stop(); }
  const ok = out.filter(r => r.esito === 'superato').length;
  console.log(`\n${ok} / ${out.length} superati`);
  if (full){
    let commit = ''; try { commit = execSync('git rev-parse --short HEAD', {cwd:ROOT}).toString().trim(); } catch (e) {}
    const file = path.join(__dirname, 'risultati', today + '.json');
    fs.mkdirSync(path.dirname(file), {recursive:true});
    fs.writeFileSync(file, JSON.stringify({data:today, commit, totali:out.length, superati:ok, risultati:out}, null, 1) + '\n');
    console.log('Scritto ' + path.relative(ROOT, file));
  }
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
