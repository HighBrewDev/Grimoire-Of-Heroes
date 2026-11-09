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
]};
