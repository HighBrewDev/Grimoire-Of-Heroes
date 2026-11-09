const {assert, fx} = require('../lib');
const file = (name, obj) => ({name, mimeType:'application/json', buffer:Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj))});
async function brewSpell(app, name){
  await app.click('brewNewKind', 'spells');
  await app.page.fill('#bw_n', name); await app.set('#bw_lv', '1');
  await app.page.locator('.bw_cls[value="Wizard"]').check();
  await app.page.fill('#bw_x', 'A whip of embers deals 2d8 Fire damage.');
  await app.click('brewSave');
  await app.page.waitForFunction(n => document.getElementById('page').textContent.includes('Your homebrew') && [...document.querySelectorAll('[data-act="detailId"]')].some(b => b.textContent === n), name);
}
const creations = app => app.page.$$eval('[data-act="brewEdit"]', b => b.length);
const md = (name, text) => ({name, mimeType:'text/markdown', buffer:Buffer.from(text)});
// the review window: one row per entry, with its badge and messages
async function review(app, f){
  await app.page.setInputFiles('#brew_file', f);
  await app.page.waitForSelector('#modalBk .b5List');
  return app.page.$$eval('.b5Row', rows => rows.map(r => ({n:r.dataset.n, badge:r.querySelector('.hbBadge').textContent, ok:!r.querySelector('.b5').disabled,
    err:[...r.querySelectorAll('li.e')].map(l => l.textContent.replace(/^✕\s*/, '')), warn:[...r.querySelectorAll('li.w')].map(l => l.textContent.replace(/^⚠\s*/, ''))})));
}
const row = (rows, n) => { const r = rows.find(x => x.n === n); if (!r) throw new Error('riga mancante: ' + n + ' in ' + rows.map(x => x.n).join(', ')); return r; };
const has = (list, re) => list.some(m => re.test(m));

module.exports = {sezione:'workshop', test:[
  ['creare un incantesimo homebrew', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await brewSpell(app, 'Ember Lash');
    assert.strictEqual(await creations(app), 1);
  }],
  ["l'homebrew resta dopo la ricarica (IndexedDB)", async ({open}) => {
    const app = await open(); await app.go('workshop');
    await brewSpell(app, 'Ember Lash');
    await app.reload(); await app.go('hero'); await app.go('workshop');
    assert.ok((await app.text('#page')).includes('Ember Lash'));
  }],
  ["l'incantesimo homebrew si trova in biblioteca e nel libro degli incantesimi", async ({open}) => {
    const app = await open({activeId:'teldrin'}); await app.go('workshop');
    await brewSpell(app, 'Ember Lash');
    await app.go('library'); await app.page.fill('#lib_q', 'ember lash');
    assert.ok((await app.text('#libList')).includes('Ember Lash'));
    await app.go('spells'); await app.page.fill('#spell_q', 'ember');
    await app.click('learn', 'Ember Lash');
    assert.ok((await app.hero()).spells.known.includes('Ember Lash'));
  }],
  ['senza nome non si salva', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await app.click('brewNewKind', 'feats'); await app.click('brewSave');
    assert.ok(/Give it a name first/.test(await app.toast()));
    assert.strictEqual(await creations(app), 0);
  }],
  ['nome doppio dello stesso tipo rifiutato', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await brewSpell(app, 'Ember Lash');
    await app.click('brewNewKind', 'spells'); await app.page.fill('#bw_n', 'ember lash'); await app.click('brewSave');
    assert.ok(/already have a spell called/.test(await app.toast()));
    await app.click('brewHome');
    assert.strictEqual(await creations(app), 1);
  }],
  ['specie homebrew compare nel menu della pagina Eroe', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await app.click('brewNewKind', 'species'); await app.page.fill('#bw_n', 'Popolo del Muschio'); await app.click('brewSave');
    await app.page.waitForFunction(() => document.querySelectorAll('[data-act="brewEdit"]').length === 1);
    await app.go('hero');
    await app.set('#f_species', 'Popolo del Muschio');
    assert.strictEqual((await app.hero()).species, 'Popolo del Muschio');
  }],
  ['cancellare una creazione', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await brewSpell(app, 'Ember Lash');
    await app.page.locator('[data-act="brewDel"]').first().click(); await app.confirm();
    await app.page.waitForFunction(() => !document.querySelector('[data-act="brewEdit"]'));
  }],
  ['import di un export Grimoire: unisce e scarta le voci non valide', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await app.page.setInputFiles('#brew_file', file('hb.json', {grimoireHomebrew:[{cat:'feats', o:{n:'Talento Uno', ty:'General', pre:'Level 4+', x:'…'}}, {cat:'spells', o:{n:42, lv:1}}, {cat:'__proto__', o:{n:'X'}}]}));
    await app.page.waitForSelector('#modalBk .b5List');
    assert.ok(/2 entries were left out/.test(await app.text('#modalBk')));
    assert.strictEqual(await app.page.locator('.b5Row').count(), 1);
    await app.click('brew5Add');
    await app.page.waitForFunction(() => document.querySelectorAll('[data-act="brewEdit"]').length === 1);
    assert.ok(/1 entry joins your homebrew \(1 new\)/.test(await app.toast()), await app.toast());
  }],
  ['B-001 homebrew con nome numerico non blocca la ricarica', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await app.page.setInputFiles('#brew_file', file('hb.json', {grimoireHomebrew:[{cat:'spells', o:{n:42, lv:1}}, {cat:'spells', o:{n:{a:1}, lv:1}}]}));
    await app.page.waitForTimeout(300);
    await app.reload();
    assert.ok((await app.text('#page h2')).length > 0, 'pagina vuota');
    assert.deepStrictEqual(app.pageErrors, []);
  }],
  ['import 5etools: finestra di scelta e voci aggiunte', async ({open}) => {
    const app = await open(); await app.go('workshop');
    const j = {spell:[{name:'Test Bolt', source:'X', level:1, school:'V', time:[{number:1, unit:'action'}], range:{type:'point', distance:{type:'feet', amount:60}}, components:{v:true, s:true}, duration:[{type:'instant'}], entries:['Deal {@damage 2d6} fire damage.']}],
      feat:[{name:'Test Feat', source:'X', category:'G', entries:['You gain a bonus.']}]};
    await app.page.setInputFiles('#brew_file', file('five.json', j));
    await app.page.waitForSelector('#modalBk .b5List');
    assert.strictEqual(await app.page.locator('.b5:checked').count(), 2);
    await app.click('brew5Add');
    await app.page.waitForFunction(() => document.querySelectorAll('[data-act="brewEdit"]').length === 2);
  }],
  ['duplicare una creazione crea "Copy of …"', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await brewSpell(app, 'Ember Lash');
    await app.page.locator('[data-act="brewDup"]').first().click();
    await app.page.waitForFunction(() => document.querySelectorAll('[data-act="brewEdit"]').length === 2);
    assert.ok((await app.text('#hb_list')).includes('Copy of Ember Lash'));
  }],
  ['ricerca fra le proprie creazioni', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await brewSpell(app, 'Ember Lash'); await brewSpell(app, 'Frost Veil');
    await app.page.fill('#brew_q', 'frost');
    await app.page.waitForFunction(() => document.querySelectorAll('#hb_list [data-act="brewEdit"]').length === 1);
    assert.ok((await app.text('#hb_list')).includes('Frost Veil'));
  }],
  ['modificare una creazione e salvare', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await brewSpell(app, 'Ember Lash');
    await app.page.locator('[data-act="brewEdit"]').first().click();
    await app.page.fill('#bw_n', 'Ember Whip'); await app.click('brewSave');
    await app.page.waitForFunction(() => /Ember Whip/.test(document.getElementById('hb_list')?.textContent || ''));
    assert.strictEqual(await creations(app), 1);
  }],
  ['file non JSON rifiutato con un messaggio', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await app.page.setInputFiles('#brew_file', file('rotto.json', '{non json'));
    await app.page.waitForFunction(() => /not valid JSON/.test(document.getElementById('toast')?.textContent || ''));
  }],
  ['Markdown: il modello scaricabile passa tutti i controlli e si importa', async ({open}) => {
    const app = await open(); await app.go('workshop');
    const [dl] = await Promise.all([app.page.waitForEvent('download'), app.click('brewMdTemplate')]);
    const text = require('fs').readFileSync(await dl.path(), 'utf8');
    assert.ok(text.startsWith('# Grimoire homebrew template'));
    const rows = await review(app, md('modello.md', text));
    assert.strictEqual(rows.length, 8);
    rows.forEach(r => assert.deepStrictEqual([r.n, r.err, r.warn], [r.n, [], []]));
    await app.click('brew5Add');
    await app.page.waitForFunction(() => document.querySelectorAll('[data-act="brewEdit"]').length === 8);
    await app.go('library'); await app.page.fill('#lib_q', 'ember lash');
    assert.ok((await app.text('#libList')).includes('Ember Lash'));
  }],
  ['Markdown: le voci con errori restano fuori, quelle con avvisi entrano', async ({open}) => {
    const app = await open(); await app.go('workshop');
    const rows = await review(app, md('misto.md', `# Spell: Lama Storta
- Level: 2
- School: Evocazion
- Casting time: Action
- Range: 60 feet
- Components: V, S
- Duration: Instantaneous
- Classes: Wizard

Testo.

# Background: Guardiano
- Ability scores: Strength, Wisdom, Constitution
- Origin feat: Grappler
- Skills: Athletics, Stelth
- Tools: Smith's Tools
- Equipment: 50 GP

# Feat: Buono
- Category: General
- Prerequisite: Level 4+

You gain a benefit.
`));
    const sp = row(rows, 'lama storta'), bg = row(rows, 'guardiano'), ft = row(rows, 'buono');
    assert.ok(has(sp.err, /“Evocazion” is not a school of magic\. Did you mean “Evocation”\?/), sp.err.join(' / '));
    assert.ok(has(bg.err, /“Stelth” is not a skill of the rules\. Did you mean “Stealth”\?/), bg.err.join(' / '));
    assert.ok(has(bg.warn, /Grappler is a General feat, not an Origin feat/), bg.warn.join(' / '));
    assert.deepStrictEqual([sp.ok, bg.ok, ft.ok], [false, false, true]);
    assert.deepStrictEqual(ft.err, []);
    await app.click('brew5Add');
    await app.page.waitForFunction(() => document.querySelectorAll('[data-act="brewEdit"]').length === 1);
    assert.ok((await app.text('#hb_list')).includes('Buono'));
  }],
  ['controlli classe: tiri salvezza, competenze, abilità, incantesimi, privilegi', async ({open}) => {
    const app = await open(); await app.go('workshop');
    const [c] = await review(app, md('classe.md', `# Class: Prova
- Hit die: d7
- Primary ability: Strength or Luck
- Saving throws: Strength, Luck
- Proficiencies: Light armor, Lasers, Shields, Thieves' Tools, Longswords
- Skills: Choose 3: Athletics, Stealth
- Spellcasting: full

## Features

### Level 1: Primo
Testo.

### Level 25: Troppo
Testo.
`));
    [/Hit Die “d7” must be d6, d8, d10 or d12/, /Primary ability “Luck” is not an ability score/, /“Luck” is not an ability score/, /Choose 3 from only 2 skills/,
      /A spellcasting class needs a spellcasting ability/, /Feature “Troppo” has level “25”/].forEach(re => assert.ok(has(c.err, re), re + ' — ' + c.err.join(' / ')));
    assert.ok(has(c.warn, /Proficiency “Lasers” is not/), c.warn.join(' / '));
    assert.ok(!has(c.warn, /Thieves|Longswords|Light armor|Shields/), 'competenze valide segnalate: ' + c.warn.join(' / '));
    assert.ok(has(c.warn, /No feature says when the subclass is chosen/));
  }],
  ['controlli creatura: taglia, GS, PF, bonus, Percezione passiva, CD, tipi di danno', async ({open}) => {
    const app = await open(); await app.go('workshop');
    const rows = await review(app, md('bestie.md', `# Creature: Lupo Sbagliato
- Size: Medium
- Type: beast
- Alignment: unaligned
- Armor class: 13
- Hit points: 20 (3d8 + 6)
- Speed: 40 ft.
- Ability scores: 12 15 12 3 12 6
- Challenge: 1/4
- Saving throws: Dex +9
- Skills: Perception +6, Stealth +4, Volare +2
- Resistances: Fire, Sparkle
- Senses: passive Perception 11
- Languages: —

## Actions

**Bite.** Melee Attack Roll: +7, reach 5 ft. Hit: 5 (1d6 + 2) Piercing damage. DC 19 Strength save or Prone.

# Creature: Gigante Strano
- Size: Enormous
- Type: giant
- Alignment: neutral evil
- Armor class: alta
- Hit points: 100 (10d12 + 30)
- Speed: 30 ft.
- Ability scores: 20 10 16 8 10 9 4
- Challenge: 40
- Senses: passive Perception 10
`));
    const w = row(rows, 'lupo sbagliato'), g = row(rows, 'gigante strano');
    [/Hit Points 20 don’t match 3d8 \+ 6, whose average is 19/, /Hit Point bonus should be 3/, /Dex save \+9: .* normally \+4/, /Perception \+6: .* normally \+3 \(or \+5 with Expertise\)/,
      /Passive Perception 11 should be 16/, /Bite: attack bonus \+7/, /Bite: DC 19 doesn’t match/, /Resistances: “Sparkle” is not a damage type/].forEach(re => assert.ok(has(w.warn, re), re + ' — ' + w.warn.join(' / ')));
    assert.ok(has(w.err, /“Volare” is not a skill of the rules/), w.err.join(' / ') || 'nessun errore');
    assert.strictEqual(w.err.length, 1, w.err.join(' / '));
    [/“Enormous” is not a size/, /Armor Class “alta” must start with a number/, /Ability scores: six numbers/, /Challenge “40”/].forEach(re => assert.ok(has(g.err, re), re + ' — ' + g.err.join(' / ')));
    assert.strictEqual(g.ok, false);
  }],
  ['controlli talento, specie, oggetto e sottoclasse', async ({open}) => {
    const app = await open(); await app.go('workshop');
    const rows = await review(app, md('vari.md', `# Feat: Origine Tarda
- Category: Origin
- Prerequisite: Level 8+, Luck 13+

Increase one ability score by 3.

# Feat: Categoria Strana
- Category: Mythic

# Species: Gente Lenta
- Size: Medium
- Speed: veloce

# Item: Anello Strano
- Type: Ring
- Rarity: Super Rare
- Attunement: forse

# Subclass: Via Precoce
- Class: Warlock

## Features
### Level 1: Troppo presto
Testo.
`));
    const o = row(rows, 'origine tarda'), c = row(rows, 'categoria strana'), s = row(rows, 'gente lenta'), i = row(rows, 'anello strano'), sc = row(rows, 'via precoce');
    [/Origin feats are taken at level 1/, /Prerequisite “Luck 13\+” doesn’t name an ability score/, /increase of 3 to an ability score/].forEach(re => assert.ok(has(o.warn, re), re + ' — ' + o.warn.join(' / ')));
    assert.ok(has(c.err, /“Mythic” is not a feat category/));
    assert.ok(has(s.err, /Speed “veloce” must be a number/));
    assert.ok(has(i.err, /“Super Rare” is not a rarity/)); assert.ok(has(i.warn, /Attunement: “forse” is not yes or no/));
    assert.ok(has(sc.warn, /2024 subclasses start at level 3/)); assert.ok(sc.ok);
  }],
  ['Markdown in italiano: titoli e campi', async ({open}) => {
    const app = await open(); await app.go('workshop');
    const [r] = await review(app, md('it.md', `# Incantesimo: Dardo di Brace
- Livello: Trucchetto
- Scuola: Invocazione
- Tempo di lancio: Action
- Gittata: 120 feet
- Componenti: V, S
- Durata: Instantaneous
- Classi: Mago, Wizard

Infliggi 1d10 danni da fuoco.
`));
    assert.strictEqual(r.n, 'dardo di brace');
    assert.deepStrictEqual(r.err, []);
    assert.ok(has(r.warn, /Class “Mago” is not in the tome/), r.warn.join(' / '));
    await app.click('brew5Add');
    await app.page.waitForFunction(() => /Cantrip · Evocation/.test(document.getElementById('hb_list')?.textContent || ''));
  }],
  ['export in Markdown e reimport: stessa voce, nessun errore', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await brewSpell(app, 'Ember Lash');
    const [dl] = await Promise.all([app.page.waitForEvent('download'), app.click('brewExportMd')]);
    const text = require('fs').readFileSync(await dl.path(), 'utf8');
    assert.ok(/^# Spell: Ember Lash/m.test(text) && /- Classes: Wizard/.test(text), text);
    const [r] = await review(app, md('grimoire-homebrew.md', text));
    assert.deepStrictEqual(r.err, []);
    assert.ok(await app.page.locator('.b5Row', {hasText:'replaces yours'}).count() === 1);
  }],
  ['incolla Markdown e controlla', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await app.click('brewMdPaste');
    await app.page.fill('#hb_md', '# Feat: Incollato\n- Category: Origin\n\nYou gain a benefit.');
    await app.click('brewMdCheck');
    await app.page.waitForSelector('#modalBk .b5List');
    assert.strictEqual(await app.page.locator('.b5:checked').count(), 1);
    await app.click('brew5Add');
    await app.page.waitForFunction(() => document.querySelectorAll('[data-act="brewEdit"]').length === 1);
  }],
  ['file Markdown senza voci: messaggio chiaro', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await app.page.setInputFiles('#brew_file', md('vuoto.md', 'Solo testo, nessun titolo.'));
    await app.page.waitForFunction(() => /No entries in vuoto/.test(document.getElementById('toast')?.textContent || ''));
    assert.ok(!(await app.modalOpen()));
  }],
  ['editor: i controlli si vedono subito e un errore blocca il salvataggio', async ({open}) => {
    const app = await open(); await app.go('workshop');
    await app.click('brewNewKind', 'monsters');
    await app.page.fill('#bw_n', 'Cinder Hound'); await app.page.fill('#bw_cr', '45');
    await app.page.waitForFunction(() => /Challenge “45”/.test(document.querySelector('.hbChecks')?.textContent || ''));
    await app.click('brewSave');
    assert.ok(/Can’t save yet: Challenge “45”/.test(await app.toast()), await app.toast());
    await app.page.fill('#bw_cr', '1/2'); await app.click('brewSave');
    await app.page.waitForFunction(() => document.querySelectorAll('[data-act="brewEdit"]').length === 1);
  }],
  ['import 5etools: anche queste voci passano dai controlli', async ({open}) => {
    const app = await open(); await app.go('workshop');
    const rows = await review(app, file('bg.json', {background:[{name:'Volatore', source:'X', ability:[{choose:{weighted:{from:['str', 'dex', 'con'], weights:[2, 1]}}}],
      skillProficiencies:[{athletics:true, flying:true}], feats:[{'alert|xphb':true}], toolProficiencies:[{"smith's tools":true}], entries:['Testo.']}]}));
    const r = row(rows, 'volatore');
    assert.ok(has(r.err, /“Flying” is not a skill of the rules/), r.err.join(' / '));
    assert.strictEqual(r.ok, false);
  }],
  ['B-020 import 5etools con 10.000 incantesimi: la finestra di scelta arriva in meno di 8 s', async ({open}) => {
    const app = await open(); await app.go('workshop');
    const sp = n => ({name:n, source:'X', level:1, school:'V', time:[{number:1, unit:'action'}], range:{type:'point', distance:{type:'feet', amount:60}}, components:{v:true}, duration:[{type:'instant'}], entries:['Deal {@damage 2d6} damage.']});
    const j = {spell:Array.from({length:10000}, (_, i) => sp('Spell ' + i))};
    const t0 = Date.now();
    await app.page.setInputFiles('#brew_file', file('tanti.json', j));
    await app.page.waitForSelector('#modalBk .b5List', {timeout:8000}).catch(() => {});
    const ms = Date.now() - t0;
    assert.ok(ms < 8000, `finestra dopo ${ms} ms`);
  }],
]};
