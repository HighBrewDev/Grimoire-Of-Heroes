// Misura del frame time e screenshot prima/dopo del livello effetti. Uso: node effects/bench.js [cartella-screenshot]
// Chromium headless gira in software: i numeri sono utili per CONFRONTARE i livelli, non come valori assoluti del telefono.
// Sul telefono si usa il pulsante "Misura frame time" della pagina effects/demo.html.
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path');
const {startServer} = require('../tests/lib');
const OUT = process.argv[2] || path.join(__dirname, 'risultati');
const VIEWS = [['1440', {viewport:{width:1440, height:900}}, 1], ['390', {viewport:{width:390, height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:1}, 4]];  // 390: CPU rallentata 4x
(async () => {
  fs.mkdirSync(OUT, {recursive:true});
  const srv = await startServer(), b = await chromium.launch(), rows = [];
  for (const [vn, ctxOpt, slow] of VIEWS) for (const lvl of ['off', 'reduced', 'full']){
    const ctx = await b.newContext(ctxOpt), p = await ctx.newPage(), cdp = await ctx.newCDPSession(p);
    if (slow > 1) await cdp.send('Emulation.setCPUThrottlingRate', {rate:slow});
    await p.goto(`${srv.base}effects/demo.html?fx=${lvl}&cover=1`); await p.waitForTimeout(1200);
    await p.screenshot({path:path.join(OUT, `copertina-${lvl}-${vn}.png`)});
    const cover = await p.evaluate(() => window.__fx.measure(2500));
    await p.evaluate(() => { document.getElementById('coverBk').hidden = true; });
    await p.waitForTimeout(300);
    // capitoli che cambiano e dado che rotola mentre si misura
    const trans = await p.evaluate(async () => { const m = window.__fx.measure(2500);
      for (let i = 0; i < 4; i++) { await new Promise(r => setTimeout(r, 450)); document.getElementById(i % 2 ? 'ch1' : 'ch2').click(); }
      document.getElementById('d20').click(); return m; });
    await p.waitForTimeout(300); await p.screenshot({path:path.join(OUT, `capitolo-${lvl}-${vn}.png`)});
    await p.evaluate(() => window.__dice[20].roll(20)); await p.waitForTimeout(1500);   // a dado fermo
    await p.locator('#dice').scrollIntoViewIfNeeded(); await p.screenshot({path:path.join(OUT, `dado-${lvl}-${vn}.png`)});
    rows.push({vista:vn, livello:lvl, copertina:cover, transizioniEDado:trans});
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'misure.json'), JSON.stringify(rows, null, 1));
  console.log('vista livello | copertina mediana/p95/lenti | transizioni+dado mediana/p95/lenti');
  for (const r of rows) console.log(r.vista.padEnd(5), r.livello.padEnd(8), '|', [r.copertina.medianMs, r.copertina.p95Ms, r.copertina.slow].join('/'), '|', [r.transizioniEDado.medianMs, r.transizioniEDado.p95Ms, r.transizioniEDado.slow].join('/'));
  await b.close(); srv.stop();
})();
