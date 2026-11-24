const {assert} = require('../lib');
// mini-file 5etools: una classe 2024, una sottoclasse 2014 ristampata per la classe 2024 (_copy), con le caratteristiche "figlie" citate dall'introduzione
const T = {name:'Storm Sorcery', shortName:'Storm', source:'XGE', className:'Sorcerer'};
const F = (name, level, entries, extra = {}) => ({name, source:'XGE', className:'Sorcerer', classSource:'PHB', subclassShortName:'Storm', subclassSource:'XGE', level, entries, ...extra});
const CLS = {
  class:[{name:'Sorcerer', source:'PHB', hd:{faces:6}}, {name:'Sorcerer', source:'XPHB', edition:'one', hd:{faces:6}, proficiency:['con', 'cha'], casterProgression:'full', spellcastingAbility:'cha', primaryAbility:[{cha:true}],
    startingProficiencies:{skills:[{choose:{from:['arcana', 'insight'], count:2}}], weapons:['simple']}, startingEquipment:{entries:['{@i Choose A or B:} (A) {@item Spear|XPHB}; or (B) 50 GP']},
    classFeatures:['Font of Magic|Sorcerer|XPHB|2', 'Metamagic|Sorcerer|XPHB|2', {classFeature:'Sorcerer Subclass|Sorcerer|XPHB|3', gainSubclassFeature:true}, 'Ability Score Improvement|Sorcerer|XPHB|4', 'Epic Boon|Sorcerer|XPHB|19'],
    featProgression:[{name:'Epic Boon', category:['EB'], progression:{19:1}}], optionalfeatureProgression:[{name:'Metamagic', featureType:['MM'], progression:{2:2, 10:4}}],
    classTableGroups:[{colLabels:['Sorcery Points'], rows:Array.from({length:20}, (_, i) => [i ? i + 1 : 0])}, {title:'Spell Slots per Spell Level', colLabels:['1', '2'], rowsSpellProgression:Array.from({length:20}, (_, i) => [Math.min(4, i + 2), i > 1 ? 2 : 0])}]}],
  subclass:[{...T, classSource:'PHB', subclassFeatures:['Storm Sorcery|Sorcerer||Storm|XGE|1', 'Heart of the Storm|Sorcerer||Storm|XGE|6', 'Wind Soul|Sorcerer||Storm|XGE|18']},
    {...T, classSource:'XPHB', _copy:{...T, classSource:'PHB'}, subclassFeatures:['Storm Sorcery|Sorcerer|XPHB|Storm|XGE|3', 'Heart of the Storm|Sorcerer||Storm|XGE|6', 'Wind Soul|Sorcerer||Storm|XGE|18']}],
  classFeature:[
    {name:'Font of Magic', source:'XPHB', className:'Sorcerer', classSource:'XPHB', level:2, entries:['You can use a {@variantrule Bonus Action|XPHB} to regain Sorcery Points. Regain all expended uses when you finish a {@variantrule Long Rest|XPHB}.']},
    {name:'Metamagic', source:'XPHB', className:'Sorcerer', classSource:'XPHB', level:2, entries:['Pick options.', {type:'options', count:2, entries:[{type:'refOptionalfeature', optionalfeature:'Careful Spell|XPHB'}, {type:'refOptionalfeature', optionalfeature:'Quickened Spell|XPHB'}]}]},
    {name:'Sorcerer Subclass', source:'XPHB', className:'Sorcerer', classSource:'XPHB', level:3, entries:['You gain a subclass.']},
    {name:'Ability Score Improvement', source:'XPHB', className:'Sorcerer', classSource:'XPHB', level:4, entries:['You gain the {@feat Ability Score Improvement|XPHB} feat.']},
    {name:'Epic Boon', source:'XPHB', className:'Sorcerer', classSource:'XPHB', level:19, entries:['You gain an Epic Boon feat.']}],
  subclassFeature:[
    F('Storm Sorcery', 1, ['Intro.', {type:'refSubclassFeature', subclassFeature:'Wind Speaker|Sorcerer||Storm|XGE|1'}, {type:'refSubclassFeature', subclassFeature:'Tempestuous Magic|Sorcerer||Storm|XGE|1'}]),
    F('Wind Speaker', 1, ['You can speak, read, and write {@language Primordial}.'], {header:1}),
    F('Tempestuous Magic', 1, ['You can use a bonus action on your turn to fly up to 10 feet.'], {header:1}),
    F('Heart of the Storm', 6, ['You gain resistance to lightning and thunder damage.']),
    F('Wind Soul', 18, ['You gain immunity to lightning and thunder damage. You also gain a magical flying speed of 60 feet. Once you do so, you can\'t do so again until you finish a short or long rest.']),
    {name:'Storm Sorcery', source:'XGE', className:'Sorcerer', classSource:'XPHB', subclassShortName:'Storm', subclassSource:'XGE', level:3, _copy:{name:'Storm Sorcery', source:'XGE', className:'Sorcerer', classSource:'PHB', subclassShortName:'Storm', subclassSource:'XGE', level:1}}]};
async function wire(app){
  await app.context.route('https://5e.tools/**', r => r.abort());
  await app.context.route('https://raw.githubusercontent.com/**', r => /class\/class-sorcerer\.json$/.test(r.request().url())
    ? r.fulfill({contentType:'application/json', headers:{'access-control-allow-origin':'*'}, body:JSON.stringify(CLS)}) : r.fulfill({status:404, body:''}));
}
const LINK = 'https://5e.tools/classes.html#sorcerer_xphb,state:sub_storm_xge=b1';
async function fetchLink(app, link){
  await app.go('workshop'); await app.page.waitForTimeout(300);
  await app.page.fill('#hb5_url', link); await app.page.locator('[data-act="brew5Fetch"]').click();
  await app.page.waitForSelector('#modalBk .b5List');
  return app.page.$$eval('.b5Row', rows => rows.map(r => ({n:r.dataset.n, text:r.innerText.replace(/\n+/g, ' | ')})));
}
const exported = async app => { const [dl] = await Promise.all([app.page.waitForEvent('download'), app.page.locator('[data-act="brewExport"]').first().click()]); return JSON.parse(require('fs').readFileSync(await dl.path(), 'utf8')).grimoireHomebrew; };

module.exports = {sezione:'import5etoolsClassi', test:[
  ["link nei testi di classe e sottoclasse: {@spell}, {@item}, {@skill} restano link che aprono la scheda, quelli sconosciuti diventano testo", async ({open}) => {
    const app = await open(); await app.go('workshop');
    const j = {class:[{name:'Tester', source:'XPHB', edition:'one', hd:{faces:8}, proficiency:['con', 'cha'], primaryAbility:[{cha:true}], startingProficiencies:{armor:['light'], weapons:['simple'], skills:[{choose:{from:['arcana', 'insight'], count:2}}]}, classFeatures:['Magic Link|Tester|XPHB|1', {classFeature:'Tester Subclass|Tester|XPHB|3', gainSubclassFeature:true}]}],
      classFeature:[{name:'Magic Link', source:'XPHB', className:'Tester', classSource:'XPHB', level:1, entries:['You cast {@spell Fire Bolt|XPHB}, wield a {@item Spear|XPHB}, roll {@skill Arcana} or meet {@creature Zorgnax the Unknown|XMM}.']}]};
    await app.page.setInputFiles('#brew_file', {name:'c.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(j))});
    await app.page.waitForSelector('#modalBk .b5List');
    const rv = await app.page.locator('#modalBk').innerText(); await app.click('brew5Add');
    await app.page.waitForSelector('[data-act="detailId"]', {timeout:4000}).catch(() => { throw new Error(rv); });
    await app.page.locator('[data-act="detailId"]', {hasText:'Tester'}).first().click();
    await app.page.waitForSelector('#modalBk');
    const m = '#modalBk ';
    assert.ok(await app.page.locator(m + 'button.xref:text-is("Fire Bolt")').count() >= 1, await app.text('#modalBk'));
    assert.strictEqual(await app.page.locator(m + 'button.xref:text-is("Zorgnax the Unknown")').count(), 0);
    const mt = await app.page.locator('#modalBk').textContent(); assert.ok(/Zorgnax the Unknown/.test(mt), mt.slice(0, 3000));
    await app.page.evaluate(() => document.querySelectorAll('#modalBk details').forEach(d => d.open = true));
    await app.page.locator(m + 'button.xref:text-is("Fire Bolt")').first().click();
    await app.page.waitForFunction(() => /Fire Bolt/.test(document.querySelector('#modalBk')?.textContent || '') && /Casting Time/.test(document.querySelector('#modalBk')?.textContent || ''));
  }],
  ['link di classe con sottoclasse spuntata: arriva la classe e solo quella sottoclasse, una volta sola', async ({open}) => {
    const app = await open(); await wire(app);
    const rows = await fetchLink(app, LINK);
    assert.deepStrictEqual(rows.map(r => r.n).sort(), ['sorcerer', 'storm sorcery'], JSON.stringify(rows));
  }],
  ['sottoclasse: livelli giusti per la classe 2024 e dati strutturati letti dal testo', async ({open}) => {
    const app = await open(); await wire(app); await fetchLink(app, LINK);
    await app.page.click('#b5_all'); await app.page.locator('[data-act="brew5Add"]').click(); await app.page.waitForFunction(() => /join your homebrew/.test(document.getElementById('toast')?.textContent || ''));
    const items = await exported(app), sub = items.find(i => i.cat === 'subclasses').o, cls = items.find(i => i.cat === 'classes').o;
    const by = n => sub.f.find(f => f.n === n);
    assert.strictEqual(by('Wind Speaker').l, 3, 'le caratteristiche dell\'introduzione seguono il livello 3');
    assert.strictEqual(by('Tempestuous Magic').l, 3);
    assert.deepStrictEqual(by('Wind Speaker').g.lang, ['Primordial']);
    assert.deepStrictEqual(by('Tempestuous Magic').g.act, ['bonus']);
    assert.deepStrictEqual(by('Heart of the Storm').g.res, ['Lightning', 'Thunder']);
    const ws = by('Wind Soul').g; assert.deepStrictEqual(ws.imm, ['Lightning', 'Thunder']); assert.strictEqual(ws.spd.fly, 60); assert.strictEqual(ws.rest, 'short or long'); assert.strictEqual(ws.n, 1);
    assert.strictEqual(sub.f.filter(f => f.n === 'Storm Sorcery').length, 0, 'l\'introduzione è la descrizione, non una caratteristica');
    // classe: tabella per livello, scelte progressive, talenti, equipaggiamento
    assert.strictEqual(cls.ct.rows.length, 20); assert.deepStrictEqual(cls.ct.cols.map(c => c.n), ['Sorcery Points', '1st', '2nd']);
    assert.deepStrictEqual(cls.adv.opt[0].by, {2:2, 10:4}); assert.strictEqual(cls.adv.feat[0].n, 'Epic Boon');
    assert.ok(cls.f.find(f => f.n === 'Ability Score Improvement').g.asi);
    assert.ok(/- Careful Spell/.test('- Careful Spell') && /Careful Spell/.test(cls.f.find(f => f.n === 'Metamagic').x), 'le opzioni di Metamagic non si perdono');
    assert.ok(/28|50 GP/.test(cls.eq));
  }],
  ['dettaglio in Libreria: chip dei benefici e tabella della classe; modificare la sottoclasse non li perde', async ({open}) => {
    const app = await open(); await wire(app); await fetchLink(app, LINK);
    await app.page.click('#b5_all'); await app.page.locator('[data-act="brew5Add"]').click(); await app.page.waitForFunction(() => /join your homebrew/.test(document.getElementById('toast')?.textContent || ''));
    await app.page.evaluate(() => { const k = 'grimoire-prefs-v1'; const p = JSON.parse(localStorage.getItem(k) || '{}'); p.libCat = 'subclasses'; localStorage.setItem(k, JSON.stringify(p)); });
    await app.page.reload(); await app.ready(); await app.go('library'); await app.page.fill('#lib_q', 'storm');
    await app.page.locator('#libList [data-act="libPick"]').first().click();
    const d = await app.text('#libDetail');
    assert.ok(/Resistance: Lightning/i.test(d) && /Fly speed 60 ft/i.test(d) && /Language: Primordial/i.test(d), d.slice(0, 400));
    // modifica e salva: i benefici restano
    await app.go('workshop'); await app.page.locator('[data-act="brewEdit"]').nth(1).click().catch(() => {});
    const edit = app.page.locator('[data-act="brewSave"]');
    if (await edit.count()){ await edit.first().click(); await app.page.waitForTimeout(400); }
    const items = await exported(app), sub = items.find(i => i.cat === 'subclasses').o;
    assert.ok(sub.f.find(f => f.n === 'Heart of the Storm').g?.res, 'i benefici sopravvivono alla modifica');
  }],
]};
