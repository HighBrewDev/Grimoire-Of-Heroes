const {assert, fx} = require('../lib');
const enc = app => app.page.evaluate(() => JSON.parse(localStorage.getItem('grimoire-encounter-v1') || 'null'));
async function custom(app, n, init, hp = 10, ca = 12){
  await app.page.fill('#enc_cn', n); await app.page.fill('#enc_ci', init === null ? '' : String(init));
  await app.page.fill('#enc_ch', String(hp)); await app.page.fill('#enc_ca', String(ca));
  await app.click('encAddCustom');
}
const names = async app => (await enc(app)).list.map(r => r.n || r.hero);

module.exports = {sezione:'incontro', test:[
  ['aggiungere un eroe al combattimento', async ({open}) => {
    const app = await open(); await app.go('encounter');
    await app.click('encAddHero', 'tvaleria');
    const e = await enc(app);
    assert.strictEqual(e.list.length, 1); assert.strictEqual(e.list[0].hero, 'tvaleria');
    assert.ok((await app.text('.encList')).includes('Valeria Thorne'));
  }],
  ["i combattenti sono ordinati per iniziativa", async ({open}) => {
    const app = await open(); await app.go('encounter');
    await custom(app, 'Lento', 5); await custom(app, 'Rapido', 18); await custom(app, 'Medio', 11);
    assert.deepStrictEqual(await names(app), ['Rapido', 'Medio', 'Lento']);
  }],
  ['turno successivo e nuovo round dopo l\'ultimo', async ({open}) => {
    const app = await open(); await app.go('encounter');
    await custom(app, 'A', 15); await custom(app, 'B', 10);
    await app.click('encNext');
    let e = await enc(app); assert.deepStrictEqual([e.round, e.turn], [1, 1]);
    await app.click('encNext');
    e = await enc(app); assert.deepStrictEqual([e.round, e.turn], [2, 0]);
    assert.ok(/Round\s*2/.test(await app.text('#page .card')));
  }],
  ['turno precedente torna al round prima', async ({open}) => {
    const app = await open(); await app.go('encounter');
    await custom(app, 'A', 15); await custom(app, 'B', 10);
    await app.click('encNext'); await app.click('encNext'); await app.click('encPrev');
    const e = await enc(app); assert.deepStrictEqual([e.round, e.turn], [1, 1]);
  }],
  ['tira l\'iniziativa per tutti e inizia il round 1', async ({open}) => {
    const app = await open(); await app.go('encounter');
    await app.click('encAddHero', 'tvaleria'); await app.click('encAddHero', 'tkessa'); await custom(app, 'Bandito', null);
    await app.click('encRollAll');
    const e = await enc(app);
    assert.ok(e.list.every(r => Number.isFinite(r.init)), 'iniziativa mancante');
    assert.deepStrictEqual([e.round, e.turn], [1, 0]);
    const inits = e.list.map(r => r.init);
    assert.deepStrictEqual(inits, [...inits].sort((a, b) => b - a));
  }],
  ['creature del libro: 2 Goblin Warrior numerati', async ({open}) => {
    const app = await open(); await app.go('encounter');
    await app.page.fill('#enc_m', 'Goblin Warrior'); await app.page.fill('#enc_k', '2'); await app.click('encAddMon');
    const n = (await names(app)).sort();
    assert.deepStrictEqual(n, ['Goblin Warrior 1', 'Goblin Warrior 2']);
  }],
  ['danni e cure a un combattente', async ({open}) => {
    const app = await open(); await app.go('encounter');
    await custom(app, 'Orco', 10, 15);
    const id = (await enc(app)).list[0].id;
    await app.page.fill('#amt_' + id, '6'); await app.click('encDmg', id);
    assert.strictEqual((await enc(app)).list[0].hp, 9);
    await app.page.fill('#amt_' + id, '20'); await app.click('encHeal', id);
    assert.strictEqual((await enc(app)).list[0].hp, 15);
  }],
  ['danni a un eroe nel combattimento cambiano i suoi PF', async ({open}) => {
    const app = await open(); await app.go('encounter');
    await app.click('encAddHero', 'tvaleria');
    const id = (await enc(app)).list[0].id;
    await app.page.fill('#amt_' + id, '7'); await app.click('encDmg', id);
    assert.strictEqual((await app.heroById('tvaleria')).hp.cur, 25);
  }],
  ['una condizione di 1 round finisce all\'inizio del turno successivo', async ({open}) => {
    const app = await open(); await app.go('encounter');
    await custom(app, 'A', 15); await custom(app, 'B', 10);
    const b = (await enc(app)).list[1].id;
    await app.set('#cn_' + b, 'Prone'); await app.page.fill('#cr_' + b, '1'); await app.click('encAddCond', b);
    assert.strictEqual((await enc(app)).list[1].conds.length, 1);
    await app.click('encNext');
    assert.strictEqual((await enc(app)).list[1].conds.length, 0);
  }],
  ['il combattimento resta dopo la ricarica della pagina', async ({open}) => {
    const app = await open(); await app.go('encounter');
    await custom(app, 'Persistente', 12); await app.click('encNext');
    await app.reload();
    await app.go('hero'); await app.go('encounter');
    assert.ok((await app.text('.encList')).includes('Persistente'));
  }],
  ['svuotare il combattimento', async ({open}) => {
    const app = await open(); await app.go('encounter');
    await custom(app, 'X', 1); await app.click('encClear'); await app.confirm();
    const e = await enc(app); assert.deepStrictEqual([e.list.length, e.round], [0, 1]);
  }],
  ['B-037 cura dal tracciatore a un eroe a 0 PF: i tiri contro la morte si azzerano come con Heal', async ({open}) => {
    const h = fx.hero(fx.VALERIA, {hp:{cur:0, max:32, temp:0}, death:{s:1, f:2}});
    const app = await open({heroes:[h, fx.hero(fx.ELDRIN)], activeId:h.id}); await app.go('encounter');
    await app.clickJS('encAddHero', h.id);
    const rid = (await enc(app)).list.find(r => r.hero === h.id).id;
    await app.page.fill('#amt_' + rid, '5'); await app.clickJS('encHeal', rid);
    const c = await app.heroById(h.id);
    assert.strictEqual(c.hp.cur, 5);
    assert.deepStrictEqual([c.death.s || 0, c.death.f || 0], [0, 0], `a 5 PF i tiri contro la morte restano ${JSON.stringify(c.death)}`);
  }],
  ['XSS: il nome di un combattente personalizzato con HTML non esegue codice', async ({open}) => {
    const app = await open(); await app.go('encounter');
    await custom(app, '<img src=x onerror="window.__en=1">', 12);
    await app.page.waitForTimeout(300);
    assert.strictEqual(await app.page.evaluate(() => window.__en), undefined, 'onerror eseguito dal nome del combattente');
    assert.strictEqual((await names(app)).length, 1);
  }],
  ['il combattimento personalizzato resta dopo la ricarica', async ({open}) => {
    const app = await open(); await app.go('encounter');
    await custom(app, 'Goblin', 14, 7, 13); await app.reload(); await app.go('encounter');
    assert.deepStrictEqual(await names(app), ['Goblin']);
    assert.ok((await app.text('.encList')).includes('Goblin'));
  }],
]};
