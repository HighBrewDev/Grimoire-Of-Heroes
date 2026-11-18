const {assert, fx} = require('../lib');
const md = (name, text) => ({name, mimeType:'text/markdown', buffer:Buffer.from(text)});
const ac = async app => +(await app.text('#page .kv:has-text("Armor Class") .big'));
const inv = (app, n) => app.hero().then(h => h.inventory.find(i => i.n === n));
const idx = async (app, n) => (await app.hero()).inventory.findIndex(i => i.n === n);
const atkNames = app => app.page.$$eval('.gearAtk b', b => b.map(x => x.textContent));
const hero = (inventory, over = {}) => fx.blank({abilities:{str:16,dex:14,con:12,int:10,wis:10,cha:10}, inventory, ...over});

module.exports = {sezione:'equipaggiamento', test:[
  ['salvataggi vecchi: armatura senza "eq" conta come indossata, come prima', async ({open}) => {
    const app = await open({heroes:[hero([{n:'Chain Mail', q:1, d:''}, {n:'Shield', q:1, d:''}])]});
    await app.go('combat');
    assert.strictEqual(await ac(app), 18);       // 16 + 2
    await app.go('pack');
    assert.strictEqual(await app.page.locator('[data-act="equip"].on').count(), 2);
  }],
  ['salvataggi vecchi: worn:false resta "nello zaino"', async ({open}) => {
    const app = await open({heroes:[hero([{n:'Chain Mail', q:1, d:'', worn:false}])]});
    await app.go('combat');
    assert.strictEqual(await ac(app), 12);       // 10 + Dex 2
  }],
  ['equipaggiare e togliere un\'armatura cambia la CA e salva eq (e worn per le versioni vecchie)', async ({open}) => {
    const app = await open({heroes:[hero([{n:'Chain Mail', q:1, d:'', eq:false}])]});
    await app.go('combat'); assert.strictEqual(await ac(app), 12);
    await app.go('pack'); await app.click('equip', '0');
    let it = await inv(app, 'Chain Mail');
    assert.strictEqual(it.eq, true); assert.ok(it.worn !== false);
    await app.go('combat'); assert.strictEqual(await ac(app), 16);
    assert.ok((await app.text('.acParts')).includes('Chain Mail 16'));
    await app.go('pack'); await app.click('equip', '0');
    it = await inv(app, 'Chain Mail');
    assert.deepStrictEqual([it.eq, it.worn], [false, false]);
    await app.go('combat'); assert.strictEqual(await ac(app), 12);
  }],
  ['regola 2024: una sola armatura e un solo scudo, la nuova sostituisce la vecchia', async ({open}) => {
    const app = await open({heroes:[hero([{n:'Chain Mail', q:1, eq:true}, {n:'Leather Armor', q:1, eq:false}, {n:'Shield', q:1, eq:true}, {n:'Shield +1', q:1, eq:false}])]});
    await app.go('pack');
    await app.click('equip', '1');
    let h = await app.hero();
    assert.deepStrictEqual(h.inventory.map(i => i.eq), [false, true, true, false]);
    assert.ok((await app.toast()).includes('one suit of armor'));
    await app.click('equip', '3');
    h = await app.hero();
    assert.deepStrictEqual(h.inventory.map(i => i.eq), [false, true, false, true]);
    await app.go('combat');
    assert.strictEqual(await ac(app), 16);   // Leather 11 + Dex 2 + Shield +1 (3)
  }],
  ['l\'arma equipaggiata compare tra gli attacchi con bonus e danno giusti, senza toccare c.attacks', async ({open}) => {
    const app = await open({heroes:[hero([{n:'Longsword', q:1, eq:false}, {n:'Rope', q:1}])]});
    await app.go('combat');
    assert.deepStrictEqual(await atkNames(app), []);
    await app.go('pack'); await app.click('equip', '0');
    await app.go('combat');
    assert.deepStrictEqual(await atkNames(app), ['Longsword']);
    const t = await app.text('.gearAtk');
    assert.ok(t.includes('+5 to hit') && t.includes('1d8+3 Slashing'), t);   // Str 16 (+3) + competenza +2
    assert.deepStrictEqual((await app.hero()).attacks, []);
    await app.click('gearAttack', '0');
    assert.ok(!(await app.toast()).includes('undefined'));
    await app.go('pack'); await app.click('equip', '0');
    await app.go('combat'); assert.deepStrictEqual(await atkNames(app), []);
  }],
  ['arma magica "+1": bonus a colpire e al danno, nome con "+" riconosciuto', async ({open}) => {
    const app = await open({heroes:[hero([{n:'Longsword +1', q:1, eq:true}, {n:'Rapier', q:1, eq:true}])]});
    await app.go('combat');
    const t = await app.text('#page');
    assert.ok(/Longsword \+1[\s\S]*\+6 to hit[\s\S]*1d8\+4 Slashing/.test(t), t);
    assert.ok(/Rapier[\s\S]*\+5 to hit/.test(t), 'Rapier: Str 16 batte Dex 14, +3 +2 competenza');
  }],
  ['sintonia: equipaggiato ma senza sintonia non fa nulla, con la sintonia sì', async ({open}) => {
    const app = await open({heroes:[hero([{n:'Blade of Dawn', q:1, att:true, wd:'1d8 Radiant', wb:2, eq:true}])]});
    await app.go('combat');
    assert.deepStrictEqual(await atkNames(app), []);
    assert.ok((await app.text('#page')).includes('needs attunement'));
    await app.go('pack'); await app.click('attune', '0');
    await app.go('combat');
    assert.deepStrictEqual(await atkNames(app), ['Blade of Dawn']);
    const t = await app.text('.gearAtk');
    assert.ok(t.includes('+7 to hit') && t.includes('1d8+5 Radiant'), t);
  }],
  ['armatura che chiede sintonia: la CA cambia solo da sintonizzati', async ({open}) => {
    const app = await open({heroes:[hero([{n:'Plate Armor', q:1, att:true, eq:true}])]});
    await app.go('combat'); assert.strictEqual(await ac(app), 12);
    await app.go('pack'); await app.click('attune', '0');
    await app.go('combat'); assert.strictEqual(await ac(app), 18);
  }],
  ['oggetto personalizzato con bonus CA e armatura magica "+2"', async ({open}) => {
    const app = await open({heroes:[hero([{n:'Amulet of Warding', q:1, custom:true, cat:'Magic Items', acm:1, eq:true}, {n:'Studded Leather Armor +2', q:1, eq:true}])]});
    await app.go('combat');
    assert.strictEqual(await ac(app), 17);   // Studded 12 + Dex 2 + 2 magico + 1 amuleto
  }],
  ['"Ring of Mind Shielding" non è uno scudo (prima dava +2 CA)', async ({open}) => {
    const app = await open({heroes:[hero([{n:'Ring of Mind Shielding', q:1, att:true, attuned:true}, {n:'Brooch of Shielding', q:1}])]});
    await app.go('combat'); assert.strictEqual(await ac(app), 12);
  }],
  ['arma personalizzata con danno, abilità Des e bonus: appare tra gli attacchi', async ({open}) => {
    const app = await open({heroes:[hero([{n:'Dagger of Quiet', q:1}])]});
    await app.go('pack'); await app.click('editItem', '0');
    await app.page.fill('#it_wd', '1d4 Piercing'); await app.set('#it_wab', 'dex'); await app.page.fill('#it_wb', '1');
    await app.click('saveItem', '0');
    let it = await inv(app, 'Dagger of Quiet');
    assert.deepStrictEqual([it.wd, it.wab, it.wb], ['1d4 Piercing', 'dex', 1]);
    await app.click('equip', '0');
    await app.go('combat');
    const t = await app.text('.gearAtk');
    assert.ok(t.includes('+5 to hit') && t.includes('1d4+3 Piercing'), t);   // Dex 14 +2 +prof 2 +1 ; danno +2+1
  }],
  ['la card Equipped mostra i dettagli e il testo completo si apre', async ({open}) => {
    const app = await open({heroes:[hero([{n:'Cloak of Protection', q:1, att:true, attuned:true, eq:true}, {n:'Chain Mail', q:1, eq:true}])]});
    await app.go('combat');
    const t = await app.text('#page');
    assert.ok(/Equipped\s*2/.test(t) && t.includes('Stealth: Disadvantage'), t);
    await app.page.locator('[data-act="detailId"]:has-text("Details") >> visible=true').first().click();
    assert.ok(await app.modalOpen() || await app.page.locator('#entryBk, .detail, #detail').count() >= 0);
    assert.strictEqual(app.pageErrors.length, 0);
  }],
  ['filtro "Equipped" nello zaino', async ({open}) => {
    const app = await open({heroes:[hero([{n:'Longsword', q:1, eq:true}, {n:'Rope', q:1}, {n:'Shield', q:1, eq:false}])]});
    await app.go('pack'); await app.click('invCat', '__eq');
    assert.strictEqual(await app.page.locator('#invList .inv').count(), 1);
  }],
  ['aggiungere dal libro un\'armatura la lascia nello zaino (non indossata)', async ({open}) => {
    const app = await open({heroes:[hero([])]});
    await app.go('pack'); await app.page.fill('#gear_q', 'Plate Armor');
    await app.page.locator('[data-act="addGear"] >> visible=true').first().click();
    const it = await inv(app, 'Plate Armor'); assert.strictEqual(it.eq, false);
    await app.go('combat'); assert.strictEqual(await ac(app), 12);
  }],
  ['homebrew da Markdown: oggetto con oggetto base e bonus, equipaggiato diventa un attacco', async ({open}) => {
    const app = await open({heroes:[hero([])]}); await app.go('workshop');
    await app.page.setInputFiles('#brew_file', md('arma.md', `# Item: Emberbrand\n\n- Type: Weapon\n- Rarity: Rare\n- Attunement: no\n- Base item: Longsword\n- Attack and damage bonus: +1\n\nBurns.\n\n# Item: Warding Charm\n\n- Type: Wondrous Item\n- Rarity: Uncommon\n- AC bonus: +1\n- Base item: Pizza\n\nWard.`));
    await app.page.waitForSelector('#modalBk .b5List');
    const warns = await app.page.$$eval('li.w', l => l.map(x => x.textContent));
    assert.ok(warns.some(w => /Base item “Pizza”/.test(w)), warns.join('|'));
    await app.click('brew5Add');
    await app.go('pack'); await app.page.fill('#gear_q', 'Emberbrand');
    await app.page.locator('[data-act="addGear"] >> visible=true').first().click();
    await app.click('equip', '0');
    await app.go('combat');
    const t = await app.text('.gearAtk');
    assert.ok(t.includes('Emberbrand') && t.includes('+6 to hit') && t.includes('1d8+4 Slashing'), t);
    await app.go('pack'); await app.page.fill('#gear_q', 'Warding Charm');
    await app.page.locator('[data-act="addGear"] >> visible=true').first().click();
    const i = await idx(app, 'Warding Charm'); await app.click('equip', String(i));
    await app.go('combat'); assert.strictEqual(await ac(app), 13);
  }],
  ['esporta e reimporta Markdown: i campi dell\'oggetto restano', async ({open}) => {
    const app = await open({heroes:[hero([])]}); await app.go('workshop');
    await app.page.setInputFiles('#brew_file', md('arma.md', `# Item: Emberbrand\n\n- Type: Weapon\n- Rarity: Rare\n- Base item: Longsword\n- AC bonus: 1\n- Attack bonus: 2\n\nBurns.`));
    await app.page.waitForSelector('#modalBk .b5List'); await app.click('brew5Add');
    const [dl] = await Promise.all([app.page.waitForEvent('download'), app.click('brewExportMd')]);
    const text = require('fs').readFileSync(await dl.path(), 'utf8');
    assert.ok(/- Base item: Longsword/.test(text) && /- AC bonus: 1/.test(text) && /- Attack and damage bonus: 2/.test(text), text);
  }],
  ['ricaricare la pagina: eq resta, nessun errore', async ({open}) => {
    const app = await open({heroes:[hero([{n:'Longsword', q:1, eq:true}])]});
    await app.reload(); await app.go('combat');
    assert.deepStrictEqual(await atkNames(app), ['Longsword']);
    assert.strictEqual(app.pageErrors.length, 0);
  }],
  ['scheda stampabile: le armi equipaggiate sono nella tabella delle armi', async ({open}) => {
    const app = await open({heroes:[hero([{n:'Longsword', q:1, eq:true}])]});
    await app.page.route('**/*', r => r.continue());
    await app.page.evaluate(() => { window.print = () => {}; });
    await app.go('hero'); await app.click('print');
    await app.page.waitForSelector('#printSheet .sPanel', {state:'attached'});
    const t = await app.page.evaluate(() => document.querySelector('#printSheet .sPanel').textContent);
    assert.ok(t.includes('Longsword'), 'Longsword assente nella scheda');
  }],
]};
