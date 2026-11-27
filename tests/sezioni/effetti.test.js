// Livello effetti (effects/): pagina di prova effects/demo.html, fuori dall'app. Suite breve di proposito.
const {assert} = require('../lib');
const demo = async (ctx, fx, extra = '') => {
  const page = await ctx.browser.newPage({viewport:{width:1100, height:800}});
  page.setDefaultTimeout(8000); page.errs = [];
  page.on('pageerror', e => page.errs.push(e.message));
  await page.goto(`${ctx.base}effects/demo.html?fx=${fx}${extra}`);
  await page.waitForFunction(() => window.__fx);
  return page;
};
module.exports = {sezione:'effetti', test:[
  ['effetti spenti: nessuna brace, nessun nome di transizione, il cambio capitolo funziona', async ctx => {
    const p = await demo(ctx, 'off'); await p.evaluate(() => { document.getElementById('coverBk').hidden = false; }); await p.waitForTimeout(400);
    await p.evaluate(() => { document.getElementById('coverBk').hidden = true; });
    assert.strictEqual(await p.locator('.fxEmbers').count(), 0);
    await p.click('#ch2'); await p.waitForSelector('#page h2:has-text("Capitolo B")');
    assert.strictEqual(await p.evaluate(() => document.documentElement.dataset.fxVt || ''), '');
    assert.deepStrictEqual(p.errs, []); await p.close();
  }],
  ['effetti pieni: le braci compaiono sulla copertina e spariscono passando a spenti', async ctx => {
    const p = await demo(ctx, 'full', '&cover=1');
    await p.waitForSelector('#coverBk .fxEmbers');
    await p.selectOption('#lvl', 'off'); await p.waitForSelector('.fxEmbers', {state:'detached'});
    assert.deepStrictEqual(p.errs, []); await p.close();
  }],
  ['transizione fra capitoli: aggiorna la pagina e pulisce lo stato anche con effetti pieni', async ctx => {
    const p = await demo(ctx, 'full');
    await p.click('#ch2'); await p.waitForSelector('#page h2:has-text("Capitolo B")');
    await p.waitForFunction(() => !document.documentElement.dataset.fxVt);
    assert.deepStrictEqual(p.errs, []); await p.close();
  }],
  ['dadi 3D: il lancio mostra i valori già tirati, anche d100 e più dadi insieme', async ctx => {
    const p = await demo(ctx, 'full');
    const r = await p.evaluate(async () => { await window.__fx.rollDice([{s:20, v:17}, {s:6, v:4}, {s:10, v:10}, {s:100, v:64}]);
      return (await import('/effects/dice3d.js')).shown(); });
    assert.deepStrictEqual(r, [17, 4, 10, 't6', 'u4']); assert.deepStrictEqual(p.errs, []); await p.close();
  }],
  ['dadi 3D: con effetti spenti non nasce nessun layer', async ctx => {
    const p = await demo(ctx, 'off');
    await p.evaluate(() => window.__fx.rollDice([{s:20, v:5}]));
    assert.strictEqual(await p.locator('canvas').count(), 0); await p.close();
  }],
  ['misura frame time: restituisce mediana, p95 e frame lenti', async ctx => {
    const p = await demo(ctx, 'reduced');
    const m = await p.evaluate(() => window.__fx.measure(500));
    assert.ok(m.frames > 5 && m.medianMs > 0 && m.p95Ms >= m.medianMs, JSON.stringify(m)); await p.close();
  }],
]};
