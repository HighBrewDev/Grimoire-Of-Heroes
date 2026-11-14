const {assert, fx} = require('../lib');

module.exports = {sezione:'cronaca', test:[
  ['le note si salvano mentre si scrive', async ({open}) => {
    const app = await open(); await app.go('chronicle');
    await app.page.fill('#n_story', 'Una nuova storia.');
    assert.strictEqual((await app.hero()).notes.story, 'Una nuova storia.');
  }],
  ['le note restano dopo la ricarica', async ({open}) => {
    const app = await open(); await app.go('chronicle');
    await app.page.fill('#n_allies', 'Gilda dei cartografi');
    await app.reload(); await app.go('hero'); await app.go('chronicle');
    assert.strictEqual(await app.page.inputValue('#n_allies'), 'Gilda dei cartografi');
  }],
  ['i pulsanti XP aggiungono esperienza', async ({open}) => {
    const app = await open(); await app.go('chronicle');
    await app.click('addXP', '500'); await app.click('addXP', '50');
    assert.strictEqual((await app.hero()).xp, 1450);
    assert.ok(/Current XP\s*1,450/.test(await app.text('#page')));
  }],
  ['mostra gli XP del livello successivo', async ({open}) => {
    const app = await open(); await app.go('chronicle');
    assert.ok(/Level 4 at\s*2,700/.test(await app.text('#page')));
  }],
  ['al livello 20 non c\'è livello successivo', async ({open}) => {
    const app = await open({heroes:[fx.blank({level:20, xp:355000})]}); await app.go('chronicle');
    const t = await app.text('#page');
    assert.ok(/20, the summit/.test(t)); assert.ok(!/Level up to 21/.test(t));
  }],
  ['note lunghe (20.000 caratteri) e caratteri speciali si salvano intatte', async ({open}) => {
    const app = await open(); await app.go('chronicle');
    const txt = 'Ünïcødé «citazione» — 🐉 <b>non grassetto</b> & "virgolette"\n'.repeat(300).slice(0, 20000);
    await app.page.fill('#n_extra', txt);
    assert.strictEqual((await app.hero()).notes.extra, txt);
    await app.reload(); await app.go('hero'); await app.go('chronicle');
    assert.strictEqual(await app.page.inputValue('#n_extra'), txt);
  }],
  ['il pulsante Level up si evidenzia quando gli XP bastano', async ({open}) => {
    const app = await open({heroes:[fx.hero(fx.VALERIA, {xp:2700})]}); await app.go('chronicle');
    const cls = await app.page.locator('#page [data-act="levelUp"]').getAttribute('class');
    assert.ok(!/ghost/.test(cls), cls);
  }],
  ['aspetto del personaggio: si salva e resta dopo la ricarica', async ({open}) => {
    const app = await open(); await app.go('chronicle');
    await app.page.fill('#n_look', 'Cicatrice sull\'occhio sinistro');
    assert.strictEqual((await app.hero()).notes.look, 'Cicatrice sull\'occhio sinistro');
    await app.reload(); await app.go('hero'); await app.go('chronicle');
    assert.strictEqual(await app.page.inputValue('#n_look'), 'Cicatrice sull\'occhio sinistro');
  }],
  ['note con HTML restano testo e non eseguono codice dopo la ricarica', async ({open}) => {
    const app = await open(); await app.go('chronicle');
    await app.page.fill('#n_story', '</textarea><img src=x onerror="window.__xss=1">');
    await app.reload(); await app.go('hero'); await app.go('chronicle');
    assert.strictEqual(await app.page.evaluate(() => window.__xss), undefined);
    assert.strictEqual(await app.page.inputValue('#n_story'), '</textarea><img src=x onerror="window.__xss=1">');
  }],
  ['le note sono per eroe: cambiando eroe non si mescolano', async ({open}) => {
    const app = await open(); await app.go('chronicle');
    const first = (await app.store()).activeId;
    await app.page.fill('#n_story', 'Solo del primo eroe');
    await app.click('pick', 'teldrin'); await app.go('chronicle');
    assert.ok(!(await app.page.inputValue('#n_story')).includes('Solo del primo eroe'));
    assert.strictEqual((await app.heroById(first)).notes.story, 'Solo del primo eroe');
  }],
  ['gli XP aggiunti restano dopo la ricarica', async ({open}) => {
    const app = await open(); await app.go('chronicle');
    await app.click('addXP', '500');
    const xp = (await app.hero()).xp;
    await app.reload(); await app.go('hero'); await app.go('chronicle');
    assert.strictEqual((await app.hero()).xp, xp);
    assert.ok(new RegExp('Current XP\\s*' + xp.toLocaleString('en-US')).test(await app.text('#page')));
  }],
  ['i quattro campi di note sono separati: scrivere in uno non cambia gli altri', async ({open}) => {
    const app = await open(); await app.go('chronicle');
    const prima = (await app.hero()).notes;
    await app.page.fill('#n_allies', 'Solo alleati');
    const dopo = (await app.hero()).notes;
    assert.strictEqual(dopo.allies, 'Solo alleati');
    for (const k of ['look', 'story', 'extra']) assert.strictEqual(dopo[k], prima[k], k);
  }],
]};
