const {assert, fx} = require('../lib');
const pips = (app, lv) => app.page.locator(`[data-act="slot"][data-arg^="${lv}:"]`).count();

module.exports = {sezione:'incantesimi', test:[
  ['slot del Mago di livello 4: 4 di 1°, 3 di 2°', async ({open}) => {
    const app = await open({activeId:'teldrin'}); await app.go('spells');
    assert.deepStrictEqual([await pips(app, 1), await pips(app, 2), await pips(app, 3)], [4, 3, 0]);
  }],
  ['spendere uno slot e ripristinarli tutti', async ({open}) => {
    const app = await open({activeId:'teldrin'}); await app.go('spells');
    await app.click('slot', '1:0'); await app.click('slot', '1:1');
    assert.strictEqual((await app.hero()).spells.slots['1'].used, 2);
    await app.click('resetSlots');
    assert.deepStrictEqual((await app.hero()).spells.slots, {});
  }],
  ['preparare e togliere un incantesimo', async ({open}) => {
    const app = await open({activeId:'teldrin'}); await app.go('spells');
    await app.clickJS('prep', 'Sleep');
    assert.ok((await app.hero()).spells.prep.includes('Sleep'));
    assert.ok(/Prepared spells\s*8 \/ \d+/.test(await app.text('#page')));
    await app.clickJS('prep', 'Sleep');
    assert.ok(!(await app.hero()).spells.prep.includes('Sleep'));
  }],
  ['cercare e imparare un incantesimo', async ({open}) => {
    const app = await open({activeId:'teldrin'}); await app.go('spells');
    await app.page.fill('#spell_q', 'magic missile');
    await app.click('learn', 'Magic Missile');
    assert.ok((await app.hero()).spells.known.includes('Magic Missile'));
  }],
  ['lanciare un incantesimo di concentrazione usa uno slot e segna la concentrazione', async ({open}) => {
    const app = await open({activeId:'teldrin'}); await app.go('spells');
    await app.clickJS('cast', 'Web');
    const h = await app.hero();
    assert.strictEqual(h.spells.slots['2'].used, 1); assert.strictEqual(h.conc?.n, 'Web');
  }],
  ['senza slot rimasti il lancio è rifiutato', async ({open}) => {
    const app = await open({activeId:'teldrin', heroes:[fx.party()[0], fx.hero(fx.ELDRIN, {spells:{...fx.ELDRIN.spells, slots:{2:{used:3}, 3:{used:0}}}})]});
    await app.go('spells');
    await app.clickJS('cast', 'Shatter');
    assert.strictEqual((await app.hero()).spells.slots['2'].used, 3);
    assert.ok(/No spell slot of level 2/.test(await app.toast()));
  }],
  ['multiclasse Mago 3 / Chierico 2: slot da incantatore di livello 5 (4/3/2)', async ({open}) => {
    const h = fx.hero(fx.ELDRIN, {level:5, multi:[{class:'Cleric', subclass:'', level:2}]});
    const app = await open({heroes:[h]}); await app.go('spells');
    assert.deepStrictEqual([await pips(app, 1), await pips(app, 2), await pips(app, 3), await pips(app, 4)], [4, 3, 2, 0]);
  }],
  ['multiclasse Paladino 5 / Stregone 3: metà arrotondata per eccesso (livello 6: 4/3/3)', async ({open}) => {
    const h = fx.blank({class:'Paladin', level:8, abilities:{str:15,dex:10,con:12,int:8,wis:10,cha:15}, multi:[{class:'Sorcerer', subclass:'', level:3}]});
    const app = await open({heroes:[h]}); await app.go('spells');
    assert.deepStrictEqual([await pips(app, 1), await pips(app, 2), await pips(app, 3), await pips(app, 4)], [4, 3, 3, 0]);
  }],
  ['Warlock: slot del Patto tornano con un riposo breve', async ({open}) => {
    const app = await open({heroes:[fx.blank({class:'Warlock', level:3, abilities:{str:8,dex:12,con:12,int:10,wis:10,cha:16}})]}); await app.go('spells');
    const n = await app.page.locator('[data-act="pactSlot"], [data-act="slot"][data-arg^="2:"]').count();
    assert.strictEqual(n, 2, 'slot del Patto: ' + n);
    await app.page.locator('[data-act="pactSlot"], [data-act="slot"][data-arg^="2:"]').first().click();
    const used = h => (h.spells.pact?.used || 0) + (h.spells.slots['2']?.used || 0);
    assert.strictEqual(used(await app.hero()), 1);
    await app.go('combat'); await app.click('shortRest');
    assert.strictEqual(used(await app.hero()), 0);
  }],
  ['un Guerriero senza sottoclasse arcana non ha slot', async ({open}) => {
    const app = await open(); await app.go('spells');
    assert.ok(/without spellcasting/.test(await app.text('#page')));
    assert.strictEqual(await app.page.locator('[data-act="slot"]').count(), 0);
  }],
  ['CD e attacco con incantesimi del Mago (Int 17, livello 4)', async ({open}) => {
    const app = await open({activeId:'teldrin'}); await app.go('spells');
    const t = await app.text('#page');
    assert.ok(/Save DC\s*13/.test(t) && /Spell attack\s*\+5/.test(t));
  }],
]};
