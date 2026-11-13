const {assert, fx} = require('../lib');
const listNames = app => app.page.$$eval('#libList [data-act="libPick"] span:first-child', els => els.map(e => e.textContent));

module.exports = {sezione:'biblioteca', test:[
  ['la biblioteca mostra gli incantesimi SRD', async ({open}) => {
    const app = await open(); await app.go('library');
    const n = (await listNames(app)).length;
    assert.ok(n >= 300, 'incantesimi in lista: ' + n);
  }],
  ['ricerca "fireball" e lettura della voce', async ({open}) => {
    const app = await open(); await app.go('library');
    await app.page.fill('#lib_q', 'fireball');
    const names = await listNames(app);
    assert.strictEqual(names[0], 'Fireball');
    await app.page.locator('#libList [data-act="libPick"]').first().click();
    const d = await app.text('#libDetail');
    assert.ok(/8d6/.test(d) && /Fire damage/.test(d), d.slice(0, 200));
  }],
  ['filtro per livello e classe', async ({open}) => {
    const app = await open(); await app.go('library');
    await app.set('#lf_lv', '3'); await app.set('#lf_cls', 'Wizard');
    const names = await listNames(app);
    assert.ok(names.includes('Fireball') && names.includes('Counterspell'));
    assert.ok(!names.includes('Revivify'), 'Revivify non è un incantesimo da Mago');
  }],
  ['creature: ricerca "owlbear"', async ({open}) => {
    const app = await open({prefs:{libCat:'monsters'}}); await app.go('library');
    await app.click('libCat', 'monsters');
    await app.page.fill('#lib_q', 'owlbear');
    const names = await listNames(app);
    assert.ok(names.includes('Owlbear'), names.join(', '));
    await app.page.locator('#libList [data-act="libPick"]').first().click();
    assert.ok(/Armor Class/.test(await app.text('#libDetail')));
  }],
  ['ricerca senza risultati', async ({open}) => {
    const app = await open(); await app.go('library');
    await app.page.fill('#lib_q', 'qwxzv');
    assert.ok((await app.text('#libList')).includes('Nothing matches.'));
  }],
  ['ricerca globale delle regole: "Grappled" e Invio apre la regola', async ({open}) => {
    const app = await open();
    await app.page.fill('#omni', 'grappled');
    await app.page.waitForSelector('#omniList button');
    assert.ok((await app.text('#omniList')).includes('Grappled'));
    await app.page.press('#omni', 'Enter');
    await app.page.waitForSelector('#modalBk .modal h2');
    assert.ok((await app.text('#modalBk h2')).includes('Grappled'));
  }],
  ['scorciatoia Ctrl+K porta alla ricerca', async ({open}) => {
    const app = await open();
    await app.page.keyboard.press('Control+k');
    assert.strictEqual(await app.page.evaluate(() => document.activeElement?.id), 'omni');
  }],
  ['un termine sottolineato apre la regola (Prone)', async ({open}) => {
    const app = await open();
    await app.click('detail', 'Prone');
    await app.page.waitForSelector('#modalBk .modal h2');
    assert.ok((await app.text('#modalBk h2')).includes('Prone'));
  }],
  ['ricerca con caratteri da espressione regolare non dà errori', async ({open}) => {
    const app = await open(); await app.go('library');
    for (const q of ['(', '[a-', '.*', '\\', '<b>']) await app.page.fill('#lib_q', q);
    assert.deepStrictEqual([...app.consoleErrors, ...app.pageErrors], []);
  }],
  ['svuotare la ricerca ripristina la lista completa', async ({open}) => {
    const app = await open(); await app.go('library');
    const tot = (await listNames(app)).length;
    await app.page.fill('#lib_q', 'qwxzv'); await app.page.fill('#lib_q', '');
    assert.strictEqual((await listNames(app)).length, tot);
  }],
  ['la ricerca ignora le maiuscole ("FIREBALL")', async ({open}) => {
    const app = await open(); await app.go('library');
    await app.page.fill('#lib_q', 'FIREBALL');
    assert.strictEqual((await listNames(app))[0], 'Fireball');
  }],
]};
