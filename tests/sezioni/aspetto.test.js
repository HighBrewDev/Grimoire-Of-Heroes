const {assert} = require('../lib');
const attr = (app, a) => app.page.evaluate(n => document.documentElement.getAttribute(n), a);
const css = (app, v) => app.page.evaluate(n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), v);

module.exports = {sezione:'aspetto', test:[
  ['Aspetto: la finestra elenca i temi e i tre livelli di effetti', async ({open}) => {
    const app = await open();
    await app.click('aspetto');
    assert.strictEqual(await app.page.locator('#modalBk [data-aspetto-theme]').count(), 5);
    assert.strictEqual(await app.page.locator('#modalBk [data-aspetto-fx]').count(), 3);
    assert.strictEqual(await app.page.locator('#modalBk [data-aspetto-theme="pergamena"]').getAttribute('aria-checked'), 'true');
  }],
  ['Aspetto: scegliere Brace cambia i token e il tono, e resta dopo il ricaricamento', async ({open}) => {
    const app = await open();
    const before = await css(app, '--leather');
    await app.click('aspetto');
    await app.page.click('[data-aspetto-theme="brace"]');
    assert.strictEqual(await attr(app, 'data-theme'), 'brace');
    assert.strictEqual(await attr(app, 'data-book'), 'night');
    assert.notStrictEqual(await css(app, '--leather'), before);
    await app.page.reload(); await app.page.waitForSelector('#app');
    assert.strictEqual(await attr(app, 'data-theme'), 'brace');
  }],
  ['Aspetto: il bottone sole/luna riporta al tema base del tono', async ({open}) => {
    const app = await open();
    await app.click('aspetto'); await app.page.click('[data-aspetto-theme="bosco"]');
    assert.strictEqual(await attr(app, 'data-theme'), 'bosco');
    await app.page.keyboard.press('Escape'); await app.page.evaluate(() => document.querySelector('#modalBk')?.remove());
    await app.page.evaluate(() => document.querySelectorAll('body > [inert]').forEach(n => n.removeAttribute('inert')));
    await app.click('theme');
    assert.strictEqual(await attr(app, 'data-book'), 'night');
    assert.strictEqual(await attr(app, 'data-theme'), null, 'Notte è il tema base, senza data-theme');
  }],
  ['Aspetto: effetti spenti = niente grana e movimento azzerato', async ({open}) => {
    const app = await open();
    await app.click('aspetto'); await app.page.click('[data-aspetto-fx="off"]');
    assert.strictEqual(await attr(app, 'data-effects'), 'off');
    assert.strictEqual(await css(app, '--grainOp'), '0');
    assert.strictEqual(await app.page.evaluate(() => getComputedStyle(document.querySelector('.btn')).transitionDuration), '1e-05s');
  }],
  ['Aspetto: con prefers-reduced-motion parte su Ridotti', async ({open}) => {
    const app = await open({reducedMotion:'reduce'});
    assert.strictEqual(await attr(app, 'data-effects'), 'reduced');
  }],
  ['Aspetto: i temi non toccano gli eroi salvati', async ({open}) => {
    const app = await open();
    const a = JSON.stringify((await app.store()).chars.map(c => c.id + c.name));
    await app.click('aspetto'); await app.page.click('[data-aspetto-theme="marea"]');
    assert.strictEqual(JSON.stringify((await app.store()).chars.map(c => c.id + c.name)), a);
  }],
]};
