const {assert, fx} = require('../lib');
const hpAct = async (app, act, n) => { await app.page.fill('#hpAmt', String(n)); await app.click(act); };
const ac = app => app.page.evaluate(() => [...document.querySelectorAll('#page .kv')].find(k => /^Armor Class/.test(k.textContent.trim()))?.querySelector('.big')?.textContent.trim());

module.exports = {sezione:'combattimento', test:[
  ['danni: tolgono PF e salvano', async ({open}) => {
    const app = await open(); await app.go('combat');
    await hpAct(app, 'damage', 5);
    assert.strictEqual((await app.hero()).hp.cur, 27);
    assert.ok((await app.text('#page')).includes('27'));
  }],
  ['i PF temporanei assorbono i danni per primi', async ({open}) => {
    const app = await open(); await app.go('combat');
    await hpAct(app, 'tempHP', 5); await hpAct(app, 'damage', 8);
    const h = await app.hero();
    assert.deepStrictEqual([h.hp.cur, h.hp.temp], [29, 0]);
  }],
  ['i PF non scendono sotto 0 e a 0 i tiri contro la morte ripartono', async ({open}) => {
    const app = await open({heroes:[fx.hero(fx.VALERIA, {death:{s:1, f:1}})]}); await app.go('combat');
    await hpAct(app, 'damage', 100);
    const h = await app.hero();
    assert.strictEqual(h.hp.cur, 0); assert.deepStrictEqual(h.death, {s:0, f:0});
  }],
  ['la cura non supera i PF massimi', async ({open}) => {
    const app = await open({heroes:[fx.hero(fx.VALERIA, {hp:{cur:20, max:32, temp:0}})]}); await app.go('combat');
    await hpAct(app, 'heal', 50);
    assert.strictEqual((await app.hero()).hp.cur, 32);
  }],
  ['CA: armatura a maglia 16 + scudo 2 = 18, regolazione +1 = 19', async ({open}) => {
    const app = await open(); await app.go('combat');
    assert.strictEqual(await ac(app), '18');
    await app.set('#f_acb', '1');
    assert.strictEqual(await ac(app), '19');
    assert.strictEqual((await app.hero()).acBonus, 1);
  }],
  ['CA senza armatura: 10 + Des; Barbaro aggiunge Cos', async ({open}) => {
    const app = await open({heroes:[fx.blank({class:'Barbarian', abilities:{str:15,dex:14,con:16,int:8,wis:10,cha:10}})]}); await app.go('combat');
    assert.strictEqual(await ac(app), '15');
    await app.go('hero'); await app.set('#f_class', 'Wizard'); await app.go('combat');
    assert.strictEqual(await ac(app), '12');
  }],
  ['aggiungere un attacco con arma calcola bonus e danni', async ({open}) => {
    const app = await open({heroes:[fx.hero(fx.VALERIA, {attacks:[]})]}); await app.go('combat');
    await app.set('#atk_w', 'Greataxe'); await app.click('addWeaponAttack');
    const a = (await app.hero()).attacks[0];
    assert.strictEqual(a.n, 'Greataxe'); assert.strictEqual(a.bonus, 5);
    assert.ok(/^1d12\+3 Slashing$/.test(a.dmg), a.dmg);
  }],
  ['attacco personalizzato: aggiungi e rimuovi', async ({open}) => {
    const app = await open(); await app.go('combat');
    await app.page.fill('#atk_n', 'Pugno di fuoco'); await app.page.fill('#atk_b', '4'); await app.page.fill('#atk_d', '2d6 Fire');
    await app.click('addAttack');
    let h = await app.hero();
    assert.deepStrictEqual(h.attacks.map(a => a.n), ['Longsword', 'Javelin', 'Pugno di fuoco']);
    assert.strictEqual(h.attacks[2].bonus, 4);
    await app.click('delAttack', '2');
    h = await app.hero();
    assert.strictEqual(h.attacks.length, 2);
  }],
  ['tiro di attacco scrive tiro e danni nello storico', async ({open}) => {
    const app = await open(); await app.go('combat');
    await app.click('attack', '0');
    await app.page.waitForTimeout(900);
    await app.click('log');
    const t = await app.text('.logList');
    assert.ok(/Longsword/.test(t) && /damage/.test(t), t);
  }],
  ['riposo lungo: PF, Dadi Vita e slot pieni, sfinimento −1', async ({open}) => {
    const app = await open({heroes:[fx.hero(fx.VALERIA, {hp:{cur:5, max:32, temp:3}, hitDice:{used:2}, exhaustion:2})]}); await app.go('combat');
    await app.click('longRest');
    const h = await app.hero();
    assert.deepStrictEqual([h.hp.cur, h.hp.temp, h.hitDice.used, h.exhaustion], [32, 0, 0, 1]);
  }],
  ['spendere un Dado Vita cura e lo segna come usato', async ({open}) => {
    const app = await open({heroes:[fx.hero(fx.VALERIA, {hp:{cur:5, max:32, temp:0}})]}); await app.go('combat');
    await app.click('spendHD');
    const h = await app.hero();
    assert.strictEqual(h.hitDice.used, 1);
    assert.ok(h.hp.cur >= 6 && h.hp.cur <= 17, 'cura fuori da 1d10+2: ' + h.hp.cur);
  }],
  ['condizioni: attiva e disattiva Prone', async ({open}) => {
    const app = await open(); await app.go('combat');
    await app.click('toggleCond', 'Prone');
    assert.deepStrictEqual((await app.hero()).conditions, ['Prone']);
    await app.click('toggleCond', 'Prone');
    assert.deepStrictEqual((await app.hero()).conditions, []);
  }],
  ['tiri contro la morte: segna successi e fallimenti', async ({open}) => {
    const app = await open(); await app.go('combat');
    await app.click('setDeath', 's:2'); await app.click('setDeath', 'f:1');
    assert.deepStrictEqual((await app.hero()).death, {s:2, f:1});
    await app.click('setDeath', 'reset');
    assert.deepStrictEqual((await app.hero()).death, {s:0, f:0});
  }],
  ['B-006 danni negativi non danno PF temporanei', async ({open}) => {
    const app = await open(); await app.go('combat');
    await hpAct(app, 'damage', -50);
    const h = await app.hero();
    assert.strictEqual(h.hp.temp, 0, `PF temporanei ${h.hp.temp} dopo danni -50`);
    assert.ok(h.hp.cur <= 32, `PF ${h.hp.cur}/32`);
  }],
  ['B-006 una cura negativa non porta i PF sotto zero', async ({open}) => {
    const app = await open(); await app.go('combat');
    await hpAct(app, 'heal', -100);
    const h = await app.hero();
    assert.ok(h.hp.cur >= 0, `PF ${h.hp.cur}/32 dopo cura -100`);
  }],
  ['B-018 CA e PF restano in un intervallo sensato (regolazione -999, PF 1e308 da import)', async ({open}) => {
    const app = await open(); await app.go('combat');
    await app.set('#f_acb', '-999');
    const v = parseInt(await ac(app), 10);
    assert.ok(v >= 0, `CA mostrata ${v}`);
    await app.click('import'); await app.page.fill('#impTxt', JSON.stringify({name:'Enorme', abilities:{str:10}, class:'Fighter', level:20, hp:{cur:1e308, max:1e308, temp:1e308}})); await app.click('doImport');
    await app.go('combat');
    const t = await app.text('#page');
    assert.ok(!/e\+\d/.test(t), 'PF in notazione esponenziale: ' + (t.match(/.{0,20}e\+\d+.{0,20}/) || [''])[0]);
  }],
  ['B-023 riposo breve: Second Wind recupera un uso', async ({open}) => {
    const app = await open(); await app.go('combat');
    const pips = await app.page.$$eval('#page [data-act="usePip"]', b => b.map(x => x.dataset.arg));
    assert.ok(pips.length >= 2, 'mancano i segnalini di Second Wind');
    for (const a of pips) await app.clickJS('usePip', a);
    assert.strictEqual((await app.hero()).res.second_wind_uses, 2);
    await app.click('shortRest');
    assert.strictEqual((await app.hero()).res.second_wind_uses || 0, 1, 'dopo il riposo breve Second Wind è ancora 0/2');
  }],
]};
