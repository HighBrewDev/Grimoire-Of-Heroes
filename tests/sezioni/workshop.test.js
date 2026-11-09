const {assert, fx} = require('../lib');
const file = (name, obj) => ({name, mimeType:'application/json', buffer:Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj))});
async function brewSpell(app, name){
  await app.click('brewNewKind', 'spells');
  await app.page.fill('#bw_n', name); await app.set('#bw_lv', '1');
  await app.page.locator('.bw_cls[value="Wizard"]').check();
  await app.page.fill('#bw_x', 'A whip of embers deals 2d8 Fire damage.');
  await app.click('brewSave');
  await app.page.waitForFunction(n => document.getElementById('page').textContent.includes('Your homebrew') && [...document.querySelectorAll('[data-act="detailId"]')].some(b => b.textContent === n), name);
}
const creations = app => app.page.$$eval('[data-act="brewEdit"]', b => b.length);

module.exports = {sezione:'workshop', test:[
  ['creare un incantesimo homebrew', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await brewSpell(app, 'Ember Lash');
    assert.strictEqual(await creations(app), 1);
  }],
  ["l'homebrew resta dopo la ricarica (IndexedDB)", async ({open}) => {
    const app = await open(); await app.go('workshop');
    await brewSpell(app, 'Ember Lash');
    await app.reload(); await app.go('hero'); await app.go('workshop');
    assert.ok((await app.text('#page')).includes('Ember Lash'));
  }],
  ["l'incantesimo homebrew si trova in biblioteca e nel libro degli incantesimi", async ({open}) => {
    const app = await open({activeId:'teldrin'}); await app.go('workshop');
    await brewSpell(app, 'Ember Lash');
    await app.go('library'); await app.page.fill('#lib_q', 'ember lash');
    assert.ok((await app.text('#libList')).includes('Ember Lash'));
    await app.go('spells'); await app.page.fill('#spell_q', 'ember');
    await app.click('learn', 'Ember Lash');
    assert.ok((await app.hero()).spells.known.includes('Ember Lash'));
  }],
  ['senza nome non si salva', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await app.click('brewNewKind', 'feats'); await app.click('brewSave');
    assert.ok(/Give it a name first/.test(await app.toast()));
    assert.strictEqual(await creations(app), 0);
  }],
  ['nome doppio dello stesso tipo rifiutato', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await brewSpell(app, 'Ember Lash');
    await app.click('brewNewKind', 'spells'); await app.page.fill('#bw_n', 'ember lash'); await app.click('brewSave');
    assert.ok(/already have a spell called/.test(await app.toast()));
    await app.click('brewHome');
    assert.strictEqual(await creations(app), 1);
  }],
  ['specie homebrew compare nel menu della pagina Eroe', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await app.click('brewNewKind', 'species'); await app.page.fill('#bw_n', 'Popolo del Muschio'); await app.click('brewSave');
    await app.page.waitForFunction(() => document.querySelectorAll('[data-act="brewEdit"]').length === 1);
    await app.go('hero');
    await app.set('#f_species', 'Popolo del Muschio');
    assert.strictEqual((await app.hero()).species, 'Popolo del Muschio');
  }],
  ['cancellare una creazione', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await brewSpell(app, 'Ember Lash');
    await app.page.locator('[data-act="brewDel"]').first().click(); await app.confirm();
    await app.page.waitForFunction(() => !document.querySelector('[data-act="brewEdit"]'));
  }],
  ['import di un export Grimoire: unisce e scarta le voci non valide', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await app.page.setInputFiles('#brew_file', file('hb.json', {grimoireHomebrew:[{cat:'feats', o:{n:'Talento Uno', ty:'General', x:'…'}}, {cat:'spells', o:{n:42, lv:1}}, {cat:'__proto__', o:{n:'X'}}]}));
    await app.page.waitForFunction(() => document.querySelectorAll('[data-act="brewEdit"]').length === 1);
    assert.ok(/1 homebrew entries merged \(1 new\), 2 skipped/.test(await app.toast()), await app.toast());
  }],
  ['B-001 homebrew con nome numerico non blocca la ricarica', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await app.page.setInputFiles('#brew_file', file('hb.json', {grimoireHomebrew:[{cat:'spells', o:{n:42, lv:1}}, {cat:'spells', o:{n:{a:1}, lv:1}}]}));
    await app.page.waitForTimeout(300);
    await app.reload();
    assert.ok((await app.text('#page h2')).length > 0, 'pagina vuota');
    assert.deepStrictEqual(app.pageErrors, []);
  }],
  ['import 5etools: finestra di scelta e voci aggiunte', async ({open}) => {
    const app = await open(); await app.go('workshop');
    const j = {spell:[{name:'Test Bolt', source:'X', level:1, school:'V', time:[{number:1, unit:'action'}], range:{type:'point', distance:{type:'feet', amount:60}}, components:{v:true, s:true}, duration:[{type:'instant'}], entries:['Deal {@damage 2d6} fire damage.']}],
      feat:[{name:'Test Feat', source:'X', category:'G', entries:['You gain a bonus.']}]};
    await app.page.setInputFiles('#brew_file', file('five.json', j));
    await app.page.waitForSelector('#modalBk .b5List');
    assert.strictEqual(await app.page.locator('.b5:checked').count(), 2);
    await app.click('brew5Add');
    await app.page.waitForFunction(() => document.querySelectorAll('[data-act="brewEdit"]').length === 2);
  }],
  ['duplicare una creazione crea "Copy of …"', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await brewSpell(app, 'Ember Lash');
    await app.page.locator('[data-act="brewDup"]').first().click();
    await app.page.waitForFunction(() => document.querySelectorAll('[data-act="brewEdit"]').length === 2);
    assert.ok((await app.text('#hb_list')).includes('Copy of Ember Lash'));
  }],
  ['ricerca fra le proprie creazioni', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await brewSpell(app, 'Ember Lash'); await brewSpell(app, 'Frost Veil');
    await app.page.fill('#brew_q', 'frost');
    await app.page.waitForFunction(() => document.querySelectorAll('#hb_list [data-act="brewEdit"]').length === 1);
    assert.ok((await app.text('#hb_list')).includes('Frost Veil'));
  }],
  ['modificare una creazione e salvare', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await brewSpell(app, 'Ember Lash');
    await app.page.locator('[data-act="brewEdit"]').first().click();
    await app.page.fill('#bw_n', 'Ember Whip'); await app.click('brewSave');
    await app.page.waitForFunction(() => /Ember Whip/.test(document.getElementById('hb_list')?.textContent || ''));
    assert.strictEqual(await creations(app), 1);
  }],
  ['file non JSON rifiutato con un messaggio', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await app.page.setInputFiles('#brew_file', file('rotto.json', '{non json'));
    await app.page.waitForFunction(() => /not valid JSON/.test(document.getElementById('toast')?.textContent || ''));
  }],
]};
