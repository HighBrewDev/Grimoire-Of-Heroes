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
]};
