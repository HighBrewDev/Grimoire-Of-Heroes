const {assert, fx} = require('../lib');
const G = (g, extra = {}) => ({g, ...extra});
const SUB = {n:'Storm Sorcery', cls:'Sorcerer', sum:'', x:'Air magic.', f:[
  {l:3, n:'Wind Speaker', x:'You speak Primordial.', g:{lang:['Primordial']}},
  {l:3, n:'Alert Gift', x:'You gain the Alert feat.', g:{feat:['Alert']}},
  {l:6, n:'Heart of the Storm', x:'Resistance to lightning and thunder.', g:{res:['Lightning', 'Thunder'], act:['reaction']}},
  {l:18, n:'Wind Soul', x:'Immunity and fly 60.', g:{imm:['Lightning'], spd:{fly:60}, rest:'short or long', n:1, act:['action']}}]};
const file = {name:'storm.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify({grimoireHomebrew:[{cat:'subclasses', o:SUB}]}))};
async function setup(open, level){
  const hero = fx.hero(fx.ELDRIN, {name:'Tempesta', class:'Sorcerer', subclass:'Storm', level, abilities:{...fx.ELDRIN.abilities, cha:16}, feats:[]});
  const app = await open({heroes:[hero], activeId:hero.id}); await app.go('workshop');
  await app.page.setInputFiles('#brew_file', file); await app.page.waitForSelector('#modalBk .b5List');
  await app.page.click('#b5_all'); await app.page.locator('[data-act="brew5Add"]').click();
  await app.page.waitForFunction(() => /joins? your homebrew/.test(document.getElementById('toast')?.textContent || ''));
  return app;
}
module.exports = {sezione:'beneficiClasse', test:[
  ['la scheda mostra i benefici sbloccati al livello e non quelli futuri', async ({open}) => {
    const app = await setup(open, 6);
    await app.go('traits'); const t = await app.text('#page');
    assert.ok(/Class benefits/.test(t) && /Lightning, Thunder/.test(t) && /Primordial/.test(t), t.slice(0, 300));
    assert.ok(!/Fly 60/i.test(t), 'il volo è del livello 18');
    await app.go('combat'); const c = await app.text('#page');
    assert.ok(/From your class: Resistance: Lightning, Thunder/.test(c), c.slice(0, 300));
  }],
  ['talenti concessi: aggiunti da soli, mai doppi, tolti solo se automatici e il livello scende', async ({open}) => {
    const app = await setup(open, 6);
    const alerts = async () => { await app.go('traits'); return app.page.locator('#page details.fold summary', {hasText:/^Alert/}).count(); };
    const rest = async () => { await app.go('combat'); await app.click('shortRest'); };
    assert.strictEqual(await alerts(), 1, 'aggiunto da solo');
    assert.ok(/Class: Storm/.test(await app.text('#page')), 'dice da dove viene');
    await rest(); assert.strictEqual(await alerts(), 1, 'un altro salvataggio non lo raddoppia');
    // il livello scende sotto il 3: il talento automatico sparisce
    await app.go('hero'); await app.page.fill('#f_level', '2'); await app.page.locator('#f_level').blur();
    assert.strictEqual(await alerts(), 0, 'tolto perché aggiunto da solo');
    await app.go('hero'); await app.page.fill('#f_level', '6'); await app.page.locator('#f_level').blur();
    assert.strictEqual(await alerts(), 1, 'torna al livello 6');
    // chi lo toglie a mano non lo rivede
    await app.go('traits'); await app.page.locator('#page details.fold summary', {hasText:/^Alert/}).click(); await app.page.locator('[data-act="delFeat"]').first().click(); await rest();
    assert.strictEqual(await alerts(), 0, 'tolto a mano resta tolto');
  }],
  ['usi: pallini per Wind Soul al livello 18, tornano con il riposo breve', async ({open}) => {
    const app = await setup(open, 18);
    await app.go('combat'); await app.page.waitForSelector('[data-act="usePip"]');
    const pip = app.page.locator('[data-act="usePip"][data-arg^="hb_wind_soul"]'); assert.strictEqual(await pip.count(), 1);
    await pip.first().click(); assert.ok(await app.page.locator('.pip.used').count() >= 1);
    await app.click('shortRest'); assert.strictEqual(await app.page.locator('.pip.used').count(), 0, 'il riposo breve ricarica');
  }],
]};
