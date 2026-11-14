const {assert, fx} = require('../lib');

module.exports = {sezione:'tratti', test:[
  ['prendere un talento dal libro', async ({open}) => {
    const app = await open(); await app.go('traits');
    await app.set('#feat_pick', 'Grappler'); await app.click('addFeat');
    const f = (await app.hero()).feats.map(f => f.n);
    assert.ok(f.includes('Grappler'), f.join(', '));
    assert.ok((await app.text('#page')).includes('Grappler'));
  }],
  ['lo stesso talento non viene aggiunto due volte', async ({open}) => {
    const app = await open(); await app.go('traits');
    await app.set('#feat_pick', 'Alert'); await app.click('addFeat');
    assert.strictEqual((await app.hero()).feats.filter(f => f.n === 'Alert').length, 1);
  }],
  ['talento personalizzato', async ({open}) => {
    const app = await open(); await app.go('traits');
    await app.page.fill('#feat_custom', 'Benedizione del fiume'); await app.click('addFeatCustom');
    const f = (await app.hero()).feats.find(f => f.n === 'Benedizione del fiume');
    assert.ok(f && f.src === 'Custom');
  }],
  ['rimuovere un talento', async ({open}) => {
    const app = await open(); await app.go('traits');
    await app.clickJS('delFeat', '0');
    assert.deepStrictEqual((await app.hero()).feats.map(f => f.n), ['Alert']);
  }],
  ['privilegio personalizzato: aggiungi e rimuovi', async ({open}) => {
    const app = await open(); await app.go('traits');
    await app.page.fill('#cf_n', 'Marchio del drago'); await app.click('addClassFeat');
    assert.deepStrictEqual((await app.hero()).classFeats, ['Improved Critical (19–20)', 'Marchio del drago']);
    await app.click('delClassFeat', '0');
    assert.deepStrictEqual((await app.hero()).classFeats, ['Marchio del drago']);
  }],
  ['le capacità della classe sono elencate (Fighter: Second Wind, Action Surge)', async ({open}) => {
    const app = await open(); await app.go('traits');
    const t = await app.text('#page');
    assert.ok(/Second Wind/.test(t) && /Action Surge/.test(t));
  }],
  ['competenze: tiri salvezza della classe', async ({open}) => {
    const app = await open(); await app.go('traits');
    const v = await app.page.evaluate(() => [...document.querySelectorAll('#page .kv')].find(k => /^Saving throws/.test(k.textContent.trim()))?.lastElementChild?.textContent.trim());
    assert.strictEqual(v, 'STR, CON');
  }],
  ['il talento Alert aggiunge il bonus di competenza all\'iniziativa', async ({open}) => {
    const app = await open({heroes:[fx.hero(fx.VALERIA, {feats:[]})]});
    const init = () => app.page.evaluate(() => [...document.querySelectorAll('#page .kv')].find(k => /^Initiative/.test(k.textContent.trim()))?.lastElementChild?.textContent.trim());
    assert.ok((await init()).startsWith('+2'));
    await app.go('traits'); await app.set('#feat_pick', 'Alert'); await app.click('addFeat'); await app.go('hero');
    assert.ok((await init()).startsWith('+4'), await init());
  }],
  ['talento personalizzato con HTML nel nome non esegue codice', async ({open}) => {
    const app = await open(); await app.go('traits');
    await app.page.fill('#feat_custom', '<img src=x onerror="window.__xss=1">'); await app.click('addFeatCustom');
    assert.strictEqual(await app.page.evaluate(() => window.__xss), undefined);
    assert.deepStrictEqual(app.pageErrors, []);
  }],
  ['privilegio personalizzato senza nome non viene aggiunto', async ({open}) => {
    const app = await open(); await app.go('traits');
    const prima = (await app.hero()).classFeats.length;
    await app.page.fill('#cf_n', '   '); await app.click('addClassFeat');
    assert.strictEqual((await app.hero()).classFeats.length, prima);
  }],
  ['i talenti restano dopo la ricarica', async ({open}) => {
    const app = await open(); await app.go('traits');
    await app.set('#feat_pick', 'Grappler'); await app.click('addFeat');
    await app.reload(); await app.go('traits');
    assert.ok((await app.text('#page')).includes('Grappler'));
  }],
  ['talento personalizzato resta dopo la ricarica', async ({open}) => {
    const app = await open(); await app.go('traits');
    await app.page.fill('#feat_custom', 'Maestro del vento'); await app.click('addFeatCustom');
    await app.reload(); await app.go('traits');
    assert.ok((await app.text('#page')).includes('Maestro del vento'));
  }],
  ['privilegio personalizzato resta dopo la ricarica', async ({open}) => {
    const app = await open(); await app.go('traits');
    await app.page.fill('#cf_n', 'Colpo del corvo'); await app.click('addClassFeat');
    await app.reload(); await app.go('traits');
    assert.ok((await app.hero()).classFeats.includes('Colpo del corvo'));
    assert.ok((await app.text('#page')).includes('Colpo del corvo'));
  }],
]};
