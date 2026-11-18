const {assert} = require('../lib');
// mini-file 5etools: tutto in locale, 5e.tools rifiuta (come CORS) e risponde il mirror
const BASE = {baseitem:[
  {name:'Longsword', source:'PHB', edition:'classic', type:'M', weaponCategory:'martial', property:['V'], dmg1:'1d8', dmgType:'S', dmg2:'1d10', weight:3, value:1500},
  {name:'Longsword', source:'XPHB', edition:'one', type:'M|XPHB', weaponCategory:'martial', property:['V|XPHB'], mastery:['Sap|XPHB'], dmg1:'1d8', dmgType:'S', dmg2:'1d10', weight:3, value:1500},
  {name:'Longbow', source:'XPHB', edition:'one', type:'R|XPHB', weaponCategory:'martial', property:['A|XPHB', 'H|XPHB', '2H|XPHB'], mastery:['Slow|XPHB'], range:'150/600', dmg1:'1d8', dmgType:'P', weight:2, value:5000},
  {name:'Blowgun', source:'XPHB', edition:'one', type:'R|XPHB', weaponCategory:'martial', property:['A|XPHB', 'LD|XPHB'], range:'25/100', dmg1:'1', dmgType:'P'},
  {name:'Chain Mail', source:'XPHB', edition:'one', type:'HA|XPHB', ac:16}]};
const ITEMS = {item:[
  {name:'Flame Tongue Longsword', source:'DMG', type:'M', rarity:'rare', reqAttune:true, baseItem:'Longsword|XPHB', weapon:true, entries:['Fire on command. {@damage 2d6} extra.'], attachedSpells:['x']},
  {name:'Ring of Shielding', source:'DMG', type:'RG', rarity:'uncommon', bonusAc:'+1', entries:['A ring.']}]};
const SPELLS = {spell:[
  {name:'Fire Bolt', source:'XPHB', level:0, school:'V', time:[{number:1, unit:'action'}], range:{type:'point', distance:{type:'feet', amount:120}}, components:{v:true, s:true}, duration:[{type:'instant'}],
    entries:['Make a ranged spell attack. On a hit, the target takes {@damage 1d10} Fire damage.'], entriesHigherLevel:[{type:'entries', name:'Cantrip Upgrade', entries:['The damage increases by {@damage 1d10} at levels 5, 11 and 17.']}], scalingLevelDice:{label:'x', scaling:{1:'1d10'}}, damageInflict:['fire'], spellAttack:['R']},
  {name:'Zap Test', source:'XPHB', level:2, school:'E', time:[{number:1, unit:'action'}], range:{type:'point', distance:{type:'feet', amount:60}}, components:{v:true}, duration:[{type:'instant'}],
    entries:['Each creature in a 20-foot-radius Sphere makes a Dexterity saving throw, taking {@damage 4d6} Lightning damage on a failed save or half as much on a success.'], entriesHigherLevel:[{type:'entries', name:'Slot', entries:['The damage increases by {@scaledamage 4d6|2-9|1d6}.']}], damageInflict:['lightning'], savingThrow:['dexterity']}]};
const SOURCES = {XPHB:{'Fire Bolt':{class:[{name:'Sorcerer', source:'XPHB'}, {name:'Artificer', source:'EFA'}, {name:'Mage', source:'WoW', definedInSource:'WoW'}]}}};
const FILES = {'items-base.json':BASE, 'items.json':ITEMS, 'spells/spells-xphb.json':SPELLS, 'spells/sources.json':SOURCES};
async function wire(app){
  await app.context.route('https://5e.tools/**', r => r.abort());
  await app.context.route('https://raw.githubusercontent.com/**', r => {
    const f = FILES[new URL(r.request().url()).pathname.replace(/^.*\/data\//, '')];
    return f ? r.fulfill({contentType:'application/json', headers:{'access-control-allow-origin':'*'}, body:JSON.stringify(f)}) : r.fulfill({status:404, body:''});
  });
}
async function fetch5(app, link, src){
  await app.page.waitForTimeout(300);   // la pagina si ridisegna subito dopo un import
  await app.page.fill('#hb5_url', link); await app.page.fill('#hb5_src', src || '');
  await app.page.locator('[data-act="brew5Fetch"]').click();
  await app.page.waitForSelector('#modalBk .b5List');
  return app.page.$$eval('.b5Row', rows => rows.map(r => ({n:r.dataset.n, text:r.innerText.replace(/\n+/g, ' | '), ok:!r.querySelector('.b5').disabled})));
}
const added = app => app.page.waitForFunction(() => /join your homebrew/.test(document.getElementById('toast')?.textContent || ''));
const find = (rows, n) => { const r = rows.find(x => x.n === n); if (!r) throw new Error('riga mancante ' + n + ': ' + rows.map(x => x.n)); return r; };

module.exports = {sezione:'import5etools', test:[
  ["link 5e.tools: se il sito rifiuta, arriva dal mirror; armi nel modulo Weapon, 2024 batte il 2014", async ({open}) => {
    const app = await open(); await wire(app); await app.go('workshop');
    const rows = await fetch5(app, 'https://5e.tools/data/items-base.json');
    assert.strictEqual(rows.filter(r => r.n === 'longsword').length, 1, 'Longsword doppio');
    assert.ok(/Martial Melee · 1d8 Slashing · XPHB/.test(find(rows, 'longsword').text));
    assert.ok(find(rows, 'longsword').ok && find(rows, 'longbow').ok);
    assert.ok(!find(rows, 'blowgun').ok && /flat number/.test(find(rows, 'blowgun').text), 'danno fisso: errore con spiegazione');
    assert.ok(!rows.some(r => r.n === 'chain mail'), 'le armature non hanno un modulo');
    assert.ok(/older-edition entry was left out/.test(await app.page.locator('#modalBk').innerText()));
    await app.page.click('#b5_all'); await app.page.locator('[data-act="brew5Add"]').click(); await added(app);
    assert.strictEqual(await app.page.locator('[data-act="brewEdit"]').count(), 2);
  }],
  ["reimport: stesso nome = sostituisce, nessun doppione", async ({open}) => {
    const app = await open(); await wire(app); await app.go('workshop');
    for (let i = 0; i < 2; i++){ 
      await fetch5(app, 'items-base.json'); await app.page.locator('[data-act="brew5Add"]').click();
      await app.page.waitForFunction(() => document.getElementById('page').textContent.includes('Longsword'));
      
    }
    const rows = await fetch5(app, 'items-base.json');
    assert.ok(/replaces yours/.test(find(rows, 'longsword').text));
    await app.click('close');
    assert.strictEqual(await app.page.locator('[data-act="brewEdit"]').count(), 2);
  }],
  ["arma magica prende dadi e maestria dalla base; avvisa su cio che non porta", async ({open}) => {
    const app = await open(); await wire(app); await app.go('workshop');
    const rows = await fetch5(app, 'items.json');
    const ft = find(rows, 'flame tongue longsword');
    assert.ok(/Martial Melee · 1d8 Slashing/.test(ft.text) && /spells it casts/.test(ft.text), ft.text);
    assert.ok(/Ring of Shielding/.test(find(rows, 'ring of shielding').text) && find(rows, 'ring of shielding').ok);
  }],
  ["incantesimi: classi da sources.json (senza classi di terzi) e scelte dell'effetto lette dai tag", async ({open}) => {
    const app = await open(); await wire(app); await app.go('workshop');
    const rows = await fetch5(app, 'spells/spells-xphb.json');
    assert.ok(/Artificer/.test(find(rows, 'fire bolt').text) && !/Mage/.test(find(rows, 'fire bolt').text), find(rows, 'fire bolt').text);
    await app.page.click('#b5_all'); await app.page.locator('[data-act="brew5Add"]').click(); await added(app);
    await app.page.locator('[aria-label="Edit Zap Test"]').click();
    await app.page.waitForSelector('#bwForm');
    assert.ok(/4d6 Lightning/.test(await app.page.locator('#bwPreview').innerText()));
  }],
  ["link che non e un file dati, e incolla JSON", async ({open}) => {
    const app = await open(); await wire(app); await app.go('workshop');
    await app.page.fill('#hb5_url', 'https://5e.tools/spells.html'); await app.page.locator('[data-act="brew5Fetch"]').click();
    await app.page.waitForFunction(() => /not a data file|page of the site/.test(document.body.innerText));
    await app.click('brew5Paste'); await app.page.fill('#hb5_json', JSON.stringify(ITEMS)); await app.click('brew5PasteGo');
    await app.page.waitForSelector('#modalBk .b5List');
    assert.ok((await app.page.locator('.b5Row').count()) >= 2);
  }],
]};
