const {assert, fx} = require('../lib');
const invRows = app => app.page.locator('#invList .inv').count();

module.exports = {sezione:'zaino', test:[
  ['oggetto personalizzato: aggiunto con categoria, quantità e peso', async ({open}) => {
    const app = await open(); await app.go('pack');
    await app.click('addTab', 'custom');
    await app.page.fill('#it_n', 'Moneta fortunata'); await app.set('#it_cat', 'Treasure & Valuables');
    await app.page.fill('#it_q', '3'); await app.page.fill('#it_wt', '0.5');
    await app.click('addCustom');
    const it = (await app.hero()).inventory.find(i => i.n === 'Moneta fortunata');
    assert.ok(it, 'oggetto non salvato');
    assert.deepStrictEqual([it.q, it.cat, it.custom], [3, 'Treasure & Valuables', true]);
    assert.ok((await app.text('#invList')).includes('Moneta fortunata'));
  }],
  ['quantità: + aumenta, − a 1 chiede conferma e toglie', async ({open}) => {
    const app = await open(); await app.go('pack');
    const i = (await app.hero()).inventory.findIndex(x => x.n === 'Rope');
    await app.click('qty', i + ':1');
    assert.strictEqual((await app.hero()).inventory[i].q, 2);
    await app.click('qty', i + ':-1'); await app.click('qty', i + ':-1');
    await app.confirm();
    assert.ok(!(await app.hero()).inventory.some(x => x.n === 'Rope'));
  }],
  ['monete: modificare le monete salva mentre si scrive', async ({open}) => {
    const app = await open(); await app.go('pack');
    await app.page.fill('#coin_gp', '100'); await app.page.fill('#coin_pp', '2');
    const c = (await app.hero()).currency;
    assert.deepStrictEqual([c.gp, c.pp], [100, 2]);
    await app.reload(); await app.go('hero'); await app.go('pack');
    assert.strictEqual(await app.page.inputValue('#coin_gp'), '100');
  }],
  ['il totale della borsa in mo è giusto', async ({open}) => {
    const app = await open(); await app.go('pack');
    // 12 mr + 30 ma + 45 mo = 0,12 + 3 + 45 = 48,1 (arrotondato a 48.1)
    assert.ok(/≈ 48\.1 gp/.test(await app.text('#page')));
  }],
  ['filtro dello zaino', async ({open}) => {
    const app = await open(); await app.go('pack');
    await app.page.fill('#inv_q', 'rope');
    assert.strictEqual(await invRows(app), 1);
    assert.ok((await app.text('#invList')).includes('Rope'));
    await app.page.fill('#inv_q', 'zzzz');
    assert.ok((await app.text('#invList')).includes('Nothing matches this filter.'));
  }],
  ['sintonia: si sintonizza un oggetto e la CA sale (Cloak of Protection)', async ({open}) => {
    const app = await open({activeId:'teldrin'}); await app.go('pack');
    const i = (await app.hero()).inventory.findIndex(x => x.n === 'Cloak of Protection');
    await app.page.locator(`.await [data-act="attune"][data-arg="${i}"]`).click();
    assert.strictEqual((await app.hero()).inventory[i].attuned, true);
    await app.go('combat');
    // Des 14 → 12, Ring + Cloak of Protection +2
    assert.ok(/Armor Class\s*14/.test(await app.text('#page')));
  }],
  ['massimo 3 oggetti in sintonia', async ({open}) => {
    const inv = ['Ring of Protection', 'Cloak of Protection', 'Cloak of Elvenkind', 'Amulet of Health'].map((n, k) => ({n, q:1, d:'', attuned:k < 3}));
    const app = await open({heroes:[fx.blank({inventory:inv})]}); await app.go('pack');
    await app.page.locator('.await [data-act="attune"][data-arg="3"]').click();
    assert.ok(!(await app.hero()).inventory[3].attuned, 'quarto oggetto in sintonia');
    assert.ok(/attunement slots are in use/.test(await app.toast()));
  }],
  ["aggiungere dall'equipaggiamento del libro", async ({open}) => {
    const app = await open({heroes:[fx.blank()]}); await app.go('pack');
    await app.page.fill('#gear_q', 'rope');
    await app.page.locator('#gearResults [data-act="addGear"] >> visible=true').first().click();
    const inv = (await app.hero()).inventory;
    assert.strictEqual(inv.length, 1); assert.ok(/rope/i.test(inv[0].n));
  }],
  ['peso trasportato e capacità (15 × For)', async ({open}) => {
    const app = await open({heroes:[fx.blank({abilities:{str:8,dex:10,con:10,int:10,wis:10,cha:10}, inventory:[{n:'Chain Mail', q:3, d:''}]})]}); await app.go('pack');
    const t = await app.text('#page');
    assert.ok(/165 \/ 120 lb/.test(t), 'peso/capacità non mostrati');
    assert.ok(/Over capacity/.test(t));
  }],
  ['B-013 oggetti con categoria sconosciuta restano visibili e si cancellano', async ({open}) => {
    const inv = Array.from({length:5}, (_, k) => ({n:'Trophy ' + (k + 1), q:1, custom:true, cat:'Treasure', d:'trofeo'})).concat([{n:'Strano', q:1, custom:true, cat:'Boh', d:''}]);
    const app = await open({heroes:[fx.blank({inventory:inv})]}); await app.go('pack');
    assert.strictEqual(await invRows(app), 6);
    await app.page.fill('#inv_q', 'trophy');
    assert.strictEqual(await invRows(app), 5);
    const h = await app.hero();
    assert.ok(h.inventory.every(i => i.cat !== 'Treasure'), 'categoria non normalizzata');
    await app.page.fill('#inv_q', '');
    await app.click('delItem', '0');
    assert.strictEqual((await app.hero()).inventory.length, 5);
  }],
  ['B-017 monete: un valore negativo non viene salvato', async ({open}) => {
    const app = await open(); await app.go('pack');
    await app.set('#coin_gp', '-100'); await app.set('#coin_pp', '-3');
    const c = (await app.hero()).currency;
    assert.ok(c.gp >= 0 && c.pp >= 0, `monete salvate: ${c.gp} gp, ${c.pp} pp`);
  }],
  ['B-017 esperienza: un valore negativo non viene salvato', async ({open}) => {
    const app = await open(); await app.go('hero');
    await app.set('#f_xp', '-5000');
    const xp = (await app.hero()).xp;
    assert.ok(xp >= 0, `XP salvata: ${xp}`);
    assert.strictEqual(await app.page.locator('#f_xp').inputValue(), String(xp), 'il campo mostra un valore diverso da quello salvato');
  }],
  ['B-017 import: monete negative o enormi vengono riportate in un intervallo sensato', async ({open}) => {
    const app = await open();
    await app.click('import'); await app.page.fill('#impTxt', JSON.stringify({name:'Tesoriere', abilities:{str:10}, class:'Fighter', level:1, currency:{sp:-5, gp:1e308, pp:'tanti'}})); await app.click('doImport');
    const s = await app.store(), h = s.chars.find(c => c.name === 'Tesoriere');
    assert.ok(h, 'eroe non importato');
    const c = h.currency;
    assert.ok(['cp','sp','ep','gp','pp'].every(k => c[k] == null || (Number.isSafeInteger(c[k]) && c[k] >= 0)), 'monete importate: ' + JSON.stringify(c));
    await app.go('pack');
    assert.ok(!/e\+\d/.test(await app.text('#page')), 'monete in notazione esponenziale');
  }],
  ['oggetto personalizzato con HTML nel nome: mostrato come testo, nessun elemento iniettato', async ({open}) => {
    const app = await open(); await app.go('pack');
    await app.click('addTab', 'custom');
    await app.page.fill('#it_n', '<img src=x onerror=window.__x=1><b>Gemma</b>');
    await app.click('addCustom');
    assert.strictEqual(await app.page.locator('#invList img').count(), 0);
    assert.ok((await app.text('#invList')).includes('<img src=x'), 'il nome deve comparire come testo');
    assert.strictEqual(await app.page.evaluate(() => window.__x), undefined);
    assert.deepStrictEqual(app.pageErrors, []);
  }],
  ['oggetto personalizzato senza nome non viene creato', async ({open}) => {
    const app = await open(); await app.go('pack');
    const prima = (await app.hero()).inventory.length;
    await app.click('addTab', 'custom'); await app.page.fill('#it_n', '   ');
    await app.click('addCustom');
    assert.strictEqual((await app.hero()).inventory.length, prima);
  }],
  ['oggetto personalizzato: resta dopo la ricarica', async ({open}) => {
    const app = await open(); await app.go('pack');
    await app.click('addTab', 'custom'); await app.page.fill('#it_n', 'Chiave di ferro');
    await app.click('addCustom');
    await app.reload(); await app.go('hero'); await app.go('pack');
    assert.ok((await app.hero()).inventory.some(i => i.n === 'Chiave di ferro'));
    assert.ok((await app.text('#invList')).includes('Chiave di ferro'));
  }],
  ['Denari: Spend paga con la moneta scelta, poi le più piccole, poi una più grande con il resto', async ({open}) => {
    const app = await open(); await app.go('pack');
    const spend = async (purse, amt, kind) => {
      for (const k of ['cp', 'sp', 'ep', 'gp', 'pp']) await app.page.fill('#coin_' + k, String(purse[k] || 0));
      await app.set('#coinKind', kind); await app.page.fill('#coinAmt', String(amt)); await app.click('coinSpend');
      const c = (await app.hero()).currency; return [c.cp, c.sp, c.ep, c.gp, c.pp];
    };
    // [cp, sp, ep, gp, pp]
    assert.deepStrictEqual(await spend({gp:5}, 3, 'gp'), [0, 0, 0, 2, 0]);
    assert.deepStrictEqual(await spend({pp:2}, 3, 'gp'), [0, 0, 0, 7, 1], 'solo platino: ne cede uno e riceve 7 mo di resto');
    assert.deepStrictEqual(await spend({sp:40}, 3, 'gp'), [0, 10, 0, 0, 0], 'solo argento: 30 ma');
    assert.deepStrictEqual(await spend({pp:1, gp:1, sp:2}, 3, 'gp'), [0, 2, 0, 8, 0], 'oro e argento non bastano: platino con il resto, l\u2019argento resta');
    await spend({cp:7, sp:4, gp:1, pp:1}, 4.5, 'gp');
    const c = (await app.hero()).currency;
    assert.strictEqual(c.cp + c.sp * 10 + c.ep * 50 + c.gp * 100 + c.pp * 1000, 7 + 40 + 100 + 1000 - 450, 'il totale cala esattamente di 4,5 mo');
    assert.ok(/Not enough money/.test(await spend({cp:5, gp:1}, 5, 'gp').then(() => app.toast())));
    assert.deepStrictEqual([(await app.hero()).currency.cp, (await app.hero()).currency.gp], [5, 1], 'se non basta, nulla cambia');
  }],
  ['Denari: Add e Spend dalla borsa, con messaggio e senza toccare il saldo se non basta', async ({open}) => {
    const app = await open(); await app.go('pack');
    await app.page.fill('#coin_cp', '0'); await app.page.fill('#coin_sp', '0'); await app.page.fill('#coin_gp', '0'); await app.page.fill('#coin_pp', '2');
    await app.set('#coinKind', 'gp'); await app.page.fill('#coinAmt', '3'); await app.click('coinSpend');
    let c = (await app.hero()).currency;
    assert.deepStrictEqual([c.pp, c.gp, c.sp, c.cp], [1, 7, 0, 0]);
    assert.ok(/Spent 3 GP: paid 1 PP, change 7 GP/.test(await app.toast()), await app.toast());
    await app.set('#coinKind', 'sp'); await app.page.fill('#coinAmt', '25'); await app.click('coinAdd');
    c = (await app.hero()).currency; assert.strictEqual(c.sp, 25);
    await app.set('#coinKind', 'pp'); await app.page.fill('#coinAmt', '50'); await app.click('coinSpend');
    assert.ok(/Not enough money/.test(await app.toast()), await app.toast());
    assert.deepStrictEqual((await app.hero()).currency.pp, 1);
    await app.set('#coinKind', 'gp'); await app.page.fill('#coinAmt', '0.5'); await app.click('coinSpend');
    assert.ok((await app.hero()).currency.gp !== undefined);
    await app.page.fill('#coinAmt', 'abc'); await app.click('coinAdd');
    assert.ok(/amount above zero/.test(await app.toast()), await app.toast());
    assert.ok(/≈ \d/.test(await app.text('#page')));
  }],
  ['B-052 Denari: Spend con la moneta scelta come più grande e senza spiccioli dice "Not enough" anche se il saldo basta', async ({open}) => {
    const app = await open(); await app.go('pack');
    const spend = async (purse, amt, kind) => {
      for (const k of ['cp', 'sp', 'ep', 'gp', 'pp']) await app.page.fill('#coin_' + k, String(purse[k] || 0));
      await app.set('#coinKind', kind); await app.page.fill('#coinAmt', String(amt)); await app.click('coinSpend');
      return app.toast();
    };
    // 41 mo + 3 mr, paga 2,22 mo: servono 3 mo con 78 mr di resto
    assert.ok(/^Spent/.test(await spend({gp:41, cp:3}, 2.22, 'gp')), '41 gp + 3 cp, 2,22 gp');
    assert.ok(/^Spent/.test(await spend({pp:1}, 0.5, 'pp')), '1 pp, 0,5 pp');
    assert.ok(/^Spent/.test(await spend({ep:13, cp:8}, 1.48, 'ep')), '13 ep + 8 cp, 74 cp in ep');
  }],
]};
