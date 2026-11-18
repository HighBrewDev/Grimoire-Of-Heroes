const {assert, fx} = require('../lib');
const hero = (inventory, over = {}) => fx.blank({abilities:{str:16,dex:14,con:12,int:10,wis:10,cha:10}, inventory, ...over});
const atkNames = app => app.page.$$eval('.gearAtk b', b => b.map(x => x.textContent));
const hb = app => app.page.evaluate(() => { const o = []; for (let i = 0; i < localStorage.length; i++) o.push(localStorage.key(i)); return o; });

// compila il form dell'arma da zero
async function newWeapon(app, v){
  await app.go('workshop');
  await app.click('brewNewKind', 'weapons');
  await app.page.fill('#bw_n', v.n);
  if (v.wc) await app.page.selectOption('#bw_wc', v.wc);
  await app.page.fill('#bw_dd', String(v.n1 || 1)); await app.page.selectOption('#bw_dd_d', String(v.die || 8));
  await app.page.selectOption('#bw_dt', v.dt || 'Slashing');
  for (const p of v.props || []) await app.page.check(`.bw_props[value="${p}"]`);
  if (v.vd) { await app.page.fill('#bw_vd', '1'); await app.page.selectOption('#bw_vd_d', String(v.vd)); }
  if (v.mast) await app.page.selectOption('#bw_mast', v.mast);
  if (v.mb) { await app.page.selectOption('#bw_mb', String(v.mb)); await app.page.selectOption('#bw_rar', v.rar || 'Uncommon'); }
  if (v.rn) { await app.page.fill('#bw_rn', String(v.rn)); await app.page.fill('#bw_rl', String(v.rl)); }
  await app.page.fill('#bw_x', 'Forgiata nel fuoco.');
  await app.click('brewSave');
}

module.exports = {sezione:'armi-incantesimi', test:[
  ['arma homebrew: dai picker allo zaino, equipaggiata diventa un attacco con danno e bonus magico', async ({open}) => {
    const app = await open({heroes:[hero([])]});
    await newWeapon(app, {n:'Emberfang', wc:'Martial Melee', die:8, dt:'Fire', props:['Versatile', 'Finesse'], vd:10, mast:'Sap', mb:1});
    await app.page.waitForSelector('.hbRow:has-text("Emberfang")');
    await app.go('pack'); await app.page.fill('#gear_q', 'Emberfang');
    await app.page.locator('[data-act="addGear"] >> visible=true').first().click();
    await app.click('equip', '0');
    await app.go('combat');
    const t = await app.text('.gearAtk');
    assert.ok(t.includes('Emberfang') && t.includes('+6 to hit') && t.includes('1d8+4 Fire'), t);   // Str 16 (+3) con Dex 14 (+2): Str; +1 magico; PB 2
    assert.ok(/Versatile \(1d10\)/.test(t) && /Mastery: Sap/.test(t), t);
    assert.strictEqual(app.pageErrors.length, 0, app.pageErrors.join('|'));
  }],
  ['arma a distanza homebrew usa Destrezza', async ({open}) => {
    const app = await open({heroes:[hero([])]});
    await newWeapon(app, {n:'Stormbow', wc:'Martial Ranged', die:8, dt:'Lightning', props:['Ammunition', 'Two-Handed'], rn:80, rl:320});
    await app.go('pack'); await app.page.fill('#gear_q', 'Stormbow');
    await app.page.locator('[data-act="addGear"] >> visible=true').first().click();
    await app.click('equip', '0'); await app.go('combat');
    const t = await app.text('.gearAtk');
    assert.ok(t.includes('+4 to hit') && t.includes('1d8+2 Lightning') && t.includes('Range 80/320'), t);
  }],
  ['arma homebrew: senza tipo di danno valido il form non salva e dice perché', async ({open}) => {
    const app = await open({heroes:[hero([])]});
    await app.go('workshop'); await app.click('brewNewKind', 'weapons');
    await app.page.fill('#bw_n', 'Rotta'); await app.click('brewSave');
    assert.ok((await app.toast()).includes('Damage dice'), await app.toast());
  }],
  ['incantesimo homebrew: picker di tiro salvezza, dadi, area e scaling scrivono la riga di regole', async ({open}) => {
    const app = await open({heroes:[hero([])]});
    await app.go('workshop'); await app.click('brewNewKind', 'spells');
    await app.page.fill('#bw_n', 'Ember Nova'); await app.page.selectOption('#bw_lv', '3'); await app.page.selectOption('#bw_sc', 'Evocation');
    await app.page.fill('#bw_t', 'Action'); await app.page.fill('#bw_r', '150 feet'); await app.page.fill('#bw_d', 'Instantaneous');
    await app.page.check('.bw_c[value="V"]'); await app.page.check('.bw_c[value="S"]'); await app.page.check('.bw_c[value="M"]'); await app.page.fill('#bw_c_m', 'a pinch of ash');
    await app.page.selectOption('#bw_fx_mode', 'save'); await app.page.selectOption('#bw_fx_ab', 'dex');
    await app.page.fill('#bw_fx_dd', '8'); await app.page.selectOption('#bw_fx_dd_d', '6'); await app.page.selectOption('#bw_fx_dt', 'Fire'); await app.page.check('#bw_fx_half');
    await app.page.selectOption('#bw_fx_shape', 'Sphere'); await app.page.fill('#bw_fx_size', '20');
    await app.page.fill('#bw_fx_up', '1'); await app.page.selectOption('#bw_fx_up_d', '6');
    await app.page.fill('#bw_x', 'Un globo di brace.');
    await app.page.waitForFunction(() => /Sphere/.test(document.querySelector('#bwPreview').innerText));
    const prev = await app.text('#bwPreview');
    assert.ok(/Each creature in a 20-foot Sphere makes a Dexterity saving throw/.test(prev) && /8d6 Fire damage/.test(prev) && /half damage/.test(prev) && /increases by 1d6 for each spell slot level above 3/.test(prev), prev);
    assert.ok(/V, S, M \(a pinch of ash\)/.test(prev), prev);
    await app.click('brewSave'); await app.page.waitForSelector('.hbRow:has-text("Ember Nova")');
    await app.go('spells'); await app.page.fill('#spell_q', 'Ember Nova');
    assert.ok((await app.text('#page')).includes('Ember Nova'));
    assert.strictEqual(app.pageErrors.length, 0, app.pageErrors.join('|'));
  }],
  ['cantrip homebrew con tiro per colpire: scala ai livelli 5, 11 e 17', async ({open}) => {
    const app = await open({heroes:[hero([])]});
    await app.go('workshop'); await app.click('brewNewKind', 'spells');
    await app.page.fill('#bw_n', 'Spark'); await app.page.selectOption('#bw_lv', '0'); await app.page.selectOption('#bw_sc', 'Evocation');
    await app.page.fill('#bw_t', 'Action'); await app.page.fill('#bw_r', '60 feet'); await app.page.fill('#bw_d', 'Instantaneous');
    await app.page.check('.bw_c[value="V"]'); await app.page.selectOption('#bw_fx_mode', 'attack');
    await app.page.fill('#bw_fx_dd', '1'); await app.page.selectOption('#bw_fx_dd_d', '10'); await app.page.selectOption('#bw_fx_dt', 'Lightning'); await app.page.check('#bw_fx_cant');
    await app.page.fill('#bw_x', 'Una scintilla.');
    await app.page.waitForFunction(() => /levels 5/.test(document.querySelector('#bwPreview').innerText));
    const prev = await app.text('#bwPreview');
    assert.ok(/Make a spell attack roll/.test(prev) && /1d10 Lightning damage/.test(prev) && /levels 5 \(2d10\), 11 \(3d10\) and 17 \(4d10\)/.test(prev), prev);
  }],
  ['esporta in Markdown un\'arma homebrew come oggetto e la reimporta senza errori', async ({open}) => {
    const app = await open({heroes:[hero([])]});
    await newWeapon(app, {n:'Emberfang', die:8, dt:'Fire'});
    const [dl] = await Promise.all([app.page.waitForEvent('download'), app.click('brewExportMd')]);
    const text = require('fs').readFileSync(await dl.path(), 'utf8');
    assert.ok(/# Item: Emberfang/.test(text) && /- Weapon damage: 1d8 Fire/.test(text), text);
  }],
]};
