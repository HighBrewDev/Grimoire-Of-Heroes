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
    await app.go('hero'); // il pulsante Import è nel capitolo Eroe
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
  ['B-018 PF massimi enormi scritti nel campo restano in un intervallo sensato', async ({open}) => {
    const app = await open(); await app.go('combat');
    await app.set('#f_hpmax', '999999999999');
    const hp = (await app.hero()).hp;
    assert.ok(hp.max <= 9999 && hp.max >= 1, `PF massimi salvati ${hp.max}`);
    assert.strictEqual(await app.page.locator('#f_hpmax').inputValue(), String(hp.max), 'il campo mostra un valore diverso da quello salvato');
  }],
  ['B-018 import con PF 1e308: PF salvati entro 9999 e Combattimento senza notazione esponenziale', async ({open}) => {
    const app = await open();
    await app.click('import'); await app.page.fill('#impTxt', JSON.stringify({name:'Enorme', abilities:{str:10}, class:'Fighter', level:20, hp:{cur:1e308, max:1e308, temp:1e308}})); await app.click('doImport');
    const h = (await app.store()).chars.find(c => c.name === 'Enorme');
    assert.ok(h, 'eroe non importato');
    assert.ok([h.hp.cur, h.hp.max, h.hp.temp].every(v => Number.isSafeInteger(v) && v >= 0 && v <= 9999), 'PF importati: ' + JSON.stringify(h.hp));
    await app.go('combat');
    const t = await app.text('#page');
    assert.ok(!/e\+\d/.test(t), 'PF in notazione esponenziale: ' + (t.match(/.{0,20}e\+\d+.{0,20}/) || [''])[0]);
  }],
  ['B-035 PF massimi scritti come 1e3: il campo non mostra un valore diverso da quello salvato e i PF attuali non crollano a 1', async ({open}) => {
    const app = await open(); await app.go('combat');
    await app.set('#f_hpmax', '1e3');
    const h = await app.hero(), shown = await app.page.inputValue('#f_hpmax');
    assert.strictEqual(shown, String(h.hp.max), `il campo mostra "${shown}" ma i PF massimi salvati sono ${h.hp.max}`);
    assert.strictEqual(h.hp.cur, 32, `PF attuali di Valeria da 32 a ${h.hp.cur} (${h.hp.cur}/${h.hp.max})`);
  }],
  ['B-036 danno a 0 PF: un fallimento in più ai tiri contro la morte, non tutti azzerati', async ({open}) => {
    const app = await open(); await app.go('combat');
    await app.page.fill('#hpAmt', '32'); await app.click('damage');
    await app.clickJS('setDeath', 'f:2');
    assert.strictEqual((await app.hero()).death.f, 2);
    await app.page.fill('#hpAmt', '3'); await app.click('damage');
    const d = (await app.hero()).death;
    assert.strictEqual(d.f, 3, `dopo 3 danni a 0 PF i fallimenti sono ${d.f} (prima 2)`);
  }],
  // B-023 esteso (aggiornamento power user 10/11 sera): altre risorse che le regole 2024 restituiscono (in parte) col riposo breve.
  ...[
    ['Barbarian', 5, 'rage_count', 3, 2, 'Rage (Barbaro 5) recupera un uso'],
    ['Druid', 5, 'wild_shape_uses', 2, 1, 'Wild Shape (Druido 5) recupera un uso'],
    ['Paladin', 5, 'channel_divinity_charges', 2, 1, 'Channel Divinity (Paladino 5) recupera un uso'],
    ['Cleric', 6, 'channel_divinity_charges', 3, 2, 'Channel Divinity (Chierico 6) recupera un uso'],
    ['Bard', 5, 'bardic_inspiration', 3, 0, 'Bardic Inspiration (Bardo 5, Font of Inspiration) torna tutta'],
  ].map(([cls, lv, k, spent, atteso, nome]) => ['B-023 riposo breve: ' + nome, async ({open}) => {
    const h = fx.blank({name:'Riposo ' + cls, class:cls, level:lv, abilities:{str:14,dex:12,con:14,int:10,wis:16,cha:16}, hp:{cur:40,max:40,temp:0}, res:{[k]:spent}});
    const app = await open({heroes:[h]}); await app.go('combat');
    const pips = await app.page.$$eval(`#page [data-act="usePip"][data-arg^="${k}:"]`, b => b.length);
    assert.ok(pips >= spent, `segnalini ${k}: ${pips}, attesi almeno ${spent}`);
    await app.click('shortRest');
    const used = (await app.hero()).res?.[k] || 0;
    assert.strictEqual(used, atteso, `dopo il riposo breve ${k} usati ${used} (prima ${spent}), attesi ${atteso}`);
  }]),
  ['riposo breve: i Focus Points del Monaco tornano tutti', async ({open}) => {
    const h = fx.blank({name:'Monaco', class:'Monk', level:5, hp:{cur:38,max:38,temp:0}, res:{focus_points:5}});
    const app = await open({heroes:[h]}); await app.go('combat');
    await app.click('shortRest');
    assert.strictEqual((await app.hero()).res?.focus_points || 0, 0, 'Focus Points ancora spesi dopo il riposo breve');
  }],
  ['riposo lungo: tutte le risorse di classe tornano', async ({open}) => {
    const h = fx.blank({name:'Barbaro', class:'Barbarian', level:5, hp:{cur:20,max:55,temp:0}, res:{rage_count:3}});
    const app = await open({heroes:[h]}); await app.go('combat');
    await app.click('longRest');
    const c = await app.hero();
    assert.strictEqual(c.res?.rage_count || 0, 0, 'Rage ancora spesa dopo il riposo lungo');
    assert.strictEqual(c.hp.cur, 55, `PF dopo il riposo lungo ${c.hp.cur}/55`);
  }],
  ['B-036 danno massiccio: un danno che supera i PF massimi oltre lo 0 uccide (o lo dice)', async ({open}) => {
    const h = fx.blank({name:'Paladino', class:'Paladin', level:5, hp:{cur:40,max:40,temp:0}});
    const app = await open({heroes:[h]}); await app.go('combat');
    await app.page.fill('#hpAmt', '90'); await app.click('damage');
    const c = await app.hero(), t = (await app.toast()) + ' ' + (await app.text('#page'));
    assert.strictEqual(c.hp.cur, 0);
    assert.ok((c.death?.f || 0) >= 3 || /instant|massive|dies|is dead|killed/i.test(t), `danno 90 a 40 PF: fallimenti ${c.death?.f || 0}/3 e nessun avviso di morte istantanea`);
  }],
  ['una cura a 0 PF rialza l\'eroe e azzera i tiri contro la morte', async ({open}) => {
    const app = await open({heroes:[fx.hero(fx.VALERIA, {hp:{cur:0, max:32, temp:0}, death:{s:1, f:2}})]}); await app.go('combat');
    await hpAct(app, 'heal', 5);
    const h = await app.hero();
    assert.deepStrictEqual([h.hp.cur, h.death], [5, {s:0, f:0}], `PF ${h.hp.cur}, tiri contro la morte ${JSON.stringify(h.death)}`);
  }],
  ['un danno pari ai PF attuali porta a 0 senza uccidere né segnare fallimenti', async ({open}) => {
    const app = await open(); await app.go('combat');
    await hpAct(app, 'damage', 32);
    const h = await app.hero();
    assert.deepStrictEqual([h.hp.cur, h.death.f], [0, 0], `PF ${h.hp.cur}, fallimenti ${h.death.f}`);
  }],
  ['i PF dopo danno e cura restano dopo la ricarica della pagina', async ({open}) => {
    const app = await open(); await app.go('combat');
    await hpAct(app, 'damage', 9); await hpAct(app, 'heal', 4);
    await app.reload(); await app.go('combat');
    assert.strictEqual((await app.hero()).hp.cur, 27);
    assert.ok((await app.text('#page')).includes('27'));
  }],
  ['i PF temporanei restano dopo la ricarica e non finiscono nei PF massimi', async ({open}) => {
    const app = await open(); await app.go('combat');
    await hpAct(app, 'tempHP', 7);
    await app.reload();
    const h = await app.hero();
    assert.deepStrictEqual([h.hp.cur, h.hp.max, h.hp.temp], [32, 32, 7]);
  }],
]};
