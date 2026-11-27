// Misura del lag di digitazione (non fa parte della suite): node tests/misura-lag.js
// Per ogni campo e finestra scrive 60 caratteri e misura, per ogni tasto, il tempo fino a due frame dopo (ms). Chromium headless a rendering software: conta il confronto.
const {chromium} = require('playwright');
const {open, startServer, fx} = require('./lib');
const campi = [
  ['Note: aspetto (n_look)', async app => { await app.go('chronicle'); return '#n_look'; }],
  ['Cronaca: storia (n_story)', async app => { await app.go('chronicle'); return '#n_story'; }],
  ['Workshop: testo arma (bw_x)', async app => { await app.go('workshop'); await app.click('brewNewKind', 'weapons'); return '#bw_x'; }],
];
(async () => {
  const srv = await startServer(); const browser = await chromium.launch();
  const out = [];
  for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
    for (const [nome, prep] of campi) {
      const res = [];
      for (let prova = 0; prova < 3; prova++) {
        const app = await open(browser, srv.base, {heroes: [fx.blank({})], viewport: {width: w, height: h}, mobile});
        const sel = await prep(app); await app.page.focus(sel);
        const t = await app.page.evaluate(async () => {
          const el = document.activeElement, v = [];
          for (let i = 0; i < 60; i++) {
            const t0 = performance.now();
            el.value += 'a'; el.dispatchEvent(new InputEvent('input', {bubbles: true, data: 'a'}));
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            v.push(performance.now() - t0);
          }
          return v;
        });
        res.push(...t); await app.context.close();
      }
      res.sort((a, b) => a - b);
      out.push(`${w}\t${nome}\tmediana ${res[res.length >> 1].toFixed(1)}\tp95 ${res[Math.floor(res.length * .95)].toFixed(1)}\tmax ${res[res.length - 1].toFixed(1)}`);
    }
  }
  console.log(out.join('\n')); await browser.close(); srv.stop();
})().catch(e => { console.error(e); process.exit(1); });
