const {assert, fx} = require('../lib');
const abil = async (app, id) => app.page.evaluate(id => { const a = [...document.querySelectorAll('.ability')].find(x => x.querySelector('.an')?.textContent === id);
  return a ? {sc:a.querySelector('.sc').textContent.trim(), mo:a.querySelector('.mo').textContent.trim()} : null; }, id);
const rowBonus = async (app, act, arg) => app.page.evaluate(([act, arg]) => document.querySelector(`[data-act="${act}"][data-arg="${arg}"]`)?.closest('.skill')?.querySelector('.bonus')?.textContent.trim(), [act, arg]);

module.exports = {sezione:'caratteristiche', test:[
  ['punteggi e modificatori mostrati per tutte e sei le caratteristiche', async ({open}) => {
    const app = await open(); await app.go('abilities');
    const want = {STR:['16', '+3'], DEX:['14', '+2'], CON:['15', '+2'], INT:['10', '+0'], WIS:['12', '+1'], CHA:['11', '+0']};
    for (const [k, [sc, mo]] of Object.entries(want)) assert.deepStrictEqual(await abil(app, k), {sc, mo}, k);
  }],
  ['il pulsante + alza il punteggio, salva e ricalcola il modificatore', async ({open}) => {
    const app = await open(); await app.go('abilities');
    await app.click('stepAb', 'str:1'); await app.click('stepAb', 'str:1');
    assert.strictEqual((await app.hero()).abilities.str, 18);
    assert.deepStrictEqual(await abil(app, 'STR'), {sc:'18', mo:'+4'});
  }],
  ['i punteggi restano fra 1 e 30', async ({open}) => {
    const app = await open({heroes:[fx.blank({abilities:{str:30,dex:1,con:10,int:10,wis:10,cha:10}})]}); await app.go('abilities');
    await app.click('stepAb', 'str:1'); await app.click('stepAb', 'dex:-1');
    const h = await app.hero();
    assert.strictEqual(h.abilities.str, 30); assert.strictEqual(h.abilities.dex, 1);
    assert.deepStrictEqual(await abil(app, 'DEX'), {sc:'1', mo:'-5'});
  }],
  ['tiro salvezza: competenza aggiunge il bonus di competenza', async ({open}) => {
    const app = await open(); await app.go('abilities');
    assert.strictEqual(await rowBonus(app, 'toggleSave', 'dex'), '+2');
    await app.click('toggleSave', 'dex');
    assert.strictEqual((await app.hero()).saves.dex, 1);
    assert.strictEqual(await rowBonus(app, 'toggleSave', 'dex'), '+4');
    await app.click('toggleSave', 'dex');
    assert.strictEqual(await rowBonus(app, 'toggleSave', 'dex'), '+2');
  }],
  ['abilità: nessuna → competenza → maestria → nessuna', async ({open}) => {
    const app = await open(); await app.go('abilities');
    const steps = [];
    for (let i = 0; i < 3; i++){ await app.click('cycleSkill', 'stealth'); steps.push([(await app.hero()).skills.stealth, await rowBonus(app, 'cycleSkill', 'stealth')]); }
    assert.deepStrictEqual(steps, [[1, '+4'], [2, '+6'], [0, '+2']]);
  }],
  ['il bonus di competenza sale con il livello (livello 5 → +3)', async ({open}) => {
    const app = await open();
    await app.set('#f_level', '5');
    assert.strictEqual((await app.hero()).level, 5);
    await app.go('abilities');
    assert.ok(/Proficiency Bonus \+3 at level 5/.test(await app.text('#page')));
    assert.strictEqual(await rowBonus(app, 'toggleSave', 'str'), '+6');
  }],
  ['Percezione passiva = 10 + bonus di Percezione', async ({open}) => {
    const app = await open();
    const v = await app.page.evaluate(() => [...document.querySelectorAll('.kv')].find(k => /Passive Perception/.test(k.textContent))?.lastElementChild?.textContent.trim());
    assert.strictEqual(v, '13');
  }],
  ['lo sfinimento toglie 2 per livello alle prove (testo della pagina)', async ({open}) => {
    const app = await open(); await app.go('combat');
    await app.click('setExh', '2');
    assert.strictEqual((await app.hero()).exhaustion, 2);
    await app.go('abilities');
    assert.ok(/Exhaustion 2: every D20 Test takes −4/.test(await app.text('#page')));
  }],
  ['B-026 Costituzione abbassata e rialzata col − / +: i PF tornano quelli di prima (Mago 20, PF 82)', async ({open}) => {
    const app = await open({heroes:[fx.blank({class:'Wizard', subclass:'Evoker', level:20, xp:355000, hp:{cur:82,max:82,temp:0}})]}); await app.go('abilities');
    for (let i = 0; i < 9; i++) await app.click('stepAb', 'con:-1');
    let h = await app.hero();
    assert.ok(h.hp.max >= 20, `Cos 1 al livello 20: PF massimi ${h.hp.max} (almeno 1 per livello = 20)`);
    for (let i = 0; i < 9; i++) await app.click('stepAb', 'con:1');
    h = await app.hero();
    assert.deepStrictEqual([h.abilities.con, h.hp.max, h.hp.cur], [10, 82, 82], `dopo Cos 10 → 1 → 10 PF ${h.hp.cur}/${h.hp.max} invece di 82/82`);
  }],
]};
