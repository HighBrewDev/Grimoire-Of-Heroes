const {assert, fx} = require('../lib');

module.exports = {sezione:'eroe', test:[
  ['crea un eroe dal wizard con nome, specie, background e classe', async ({open}) => {
    const app = await open();
    await app.click('wizard');
    await app.page.fill('#w_name', 'Aria Prova');
    await app.set('#w_s', 'Elf'); await app.set('#w_b', 'Sage'); await app.set('#w_c', 'Wizard');
    await app.click('doWizard');
    const h = await app.hero();
    assert.strictEqual(h.name, 'Aria Prova');
    assert.deepStrictEqual([h.species, h.background, h.class, h.level], ['Elf', 'Sage', 'Wizard', 1]);
    assert.ok((await app.text('#shelf')).includes('Aria Prova'), 'il nuovo eroe non è sullo scaffale');
    assert.strictEqual((await app.store()).chars.length, 4);
  }],
  ['il wizard calcola PF e XP al livello 5 (Fighter, array standard)', async ({open}) => {
    const app = await open();
    await app.click('wizard');
    await app.set('#w_c', 'Fighter'); await app.page.fill('#w_l', '5');
    await app.click('doWizard');
    const h = await app.hero();
    // d10: 10 + Con(+2) al primo livello, poi 4 × (6 + 2)
    assert.strictEqual(h.abilities.str, 15); assert.strictEqual(h.abilities.con, 14);
    assert.strictEqual(h.hp.max, 44); assert.strictEqual(h.hp.cur, 44);
    assert.strictEqual(h.xp, 6500);
  }],
  ['il wizard dà talento, tiri salvezza e abilità del background', async ({open}) => {
    const app = await open();
    await app.click('wizard');
    await app.set('#w_c', 'Fighter'); await app.set('#w_b', 'Soldier');
    await app.click('doWizard');
    const h = await app.hero();
    assert.ok(h.feats.some(f => f.n === 'Savage Attacker'), 'manca il talento Savage Attacker');
    assert.strictEqual(h.saves.str, 1); assert.strictEqual(h.saves.con, 1);
    assert.strictEqual(h.skills.athletics, 1); assert.strictEqual(h.skills.intimidation, 1);
  }],
  ['nome vuoto nel wizard diventa "Nameless"', async ({open}) => {
    const app = await open();
    await app.click('wizard'); await app.page.fill('#w_name', '   ');
    await app.click('doWizard');
    assert.strictEqual((await app.hero()).name, 'Nameless');
  }],
  ['cambiare il nome nella pagina Eroe salva e aggiorna il titolo', async ({open}) => {
    const app = await open();
    await app.set('#f_name', 'Valeria la Rossa');
    assert.strictEqual((await app.hero()).name, 'Valeria la Rossa');
    assert.ok((await app.text('#page h2')).includes('Valeria la Rossa'));
    assert.ok((await app.text('#shelf')).includes('Valeria la Rossa'));
  }],
  ['un nome di soli spazi non cancella il nome', async ({open}) => {
    const app = await open();
    await app.set('#f_name', '    ');
    assert.strictEqual((await app.hero()).name, 'Valeria Thorne');
  }],
  ['cambiare specie salva e mostra i tratti della specie', async ({open}) => {
    const app = await open();
    await app.set('#f_species', 'Dwarf');
    assert.strictEqual((await app.hero()).species, 'Dwarf');
    const body = await app.text('#page');
    assert.ok(/Dwarf traits/.test(body), 'manca la scheda dei tratti Dwarf');
    assert.ok(/Dwarven Toughness/.test(body), 'manca il tratto Dwarven Toughness');
  }],
  ['cambiare background salva e mostra il talento di origine', async ({open}) => {
    const app = await open();
    await app.set('#f_bg', 'Sage');
    assert.strictEqual((await app.hero()).background, 'Sage');
    assert.ok((await app.text('#page')).includes('Magic Initiate'));
  }],
  ['cambiare classe azzera la sottoclasse', async ({open}) => {
    const app = await open();
    await app.set('#f_class', 'Rogue');
    const h = await app.hero();
    assert.strictEqual(h.class, 'Rogue'); assert.strictEqual(h.subclass, '');
  }],
  ['scegliere un eroe sullo scaffale lo rende attivo', async ({open}) => {
    const app = await open();
    await app.click('pick', 'teldrin');
    assert.strictEqual((await app.store()).activeId, 'teldrin');
    assert.ok((await app.text('#page h2')).includes('Eldrin Moonwhisper'));
  }],
  ['duplica e cancella un eroe', async ({open}) => {
    const app = await open();
    await app.click('duplicate');
    let s = await app.store();
    assert.strictEqual(s.chars.length, 4);
    assert.strictEqual((await app.hero()).name, 'Valeria Thorne (copy)');
    await app.click('deleteChar'); await app.confirm();
    s = await app.store();
    assert.strictEqual(s.chars.length, 3);
    assert.ok(!s.chars.some(c => c.name.endsWith('(copy)')));
  }],
  ["l'ultimo eroe non si può cancellare", async ({open}) => {
    const app = await open({heroes:[fx.hero(fx.VALERIA)]});
    await app.click('deleteChar');
    assert.ok(!(await app.modalOpen()), 'si è aperta la conferma di cancellazione');
    assert.strictEqual((await app.store()).chars.length, 1);
  }],
  ['B-008 il wizard arrotonda un livello decimale (2.7 → 3)', async ({open}) => {
    const app = await open();
    await app.click('wizard');
    await app.page.locator('#w_l').evaluate(e => { e.value = '2.7'; });
    await app.click('doWizard');
    const h = await app.hero();
    assert.strictEqual(h.level, 3); assert.strictEqual(h.xp, 900);
  }],
  ['B-009 il nome ha un limite di 80 caratteri (wizard e scheda)', async ({open}) => {
    const app = await open();
    assert.strictEqual(await app.page.getAttribute('#f_name', 'maxlength'), '80');
    await app.click('wizard');
    assert.strictEqual(await app.page.getAttribute('#w_name', 'maxlength'), '80');
    await app.page.locator('#w_name').evaluate(e => { e.value = 'x'.repeat(20000); });
    await app.click('doWizard');
    assert.strictEqual((await app.hero()).name.length, 80);
  }],
  ['B-014 con 33 eroi lo scaffale offre un filtro per nome', async ({open}) => {
    const heroes = Array.from({length:33}, (_, i) => fx.blank({id:'tmany' + i, name:'Eroe ' + (i + 1)}));
    const app = await open({heroes});
    const n = await app.page.evaluate(() => {
      const shelf = document.getElementById('shelf');
      const near = [...shelf.querySelectorAll('input'), ...(shelf.parentElement?.querySelectorAll(':scope > input, :scope > * > input[type=search]') || [])];
      return near.filter(i => i.id !== 'omni').length;
    });
    assert.ok(n > 0, 'nessun campo di ricerca/filtro vicino allo scaffale degli eroi');
  }],
  ['B-034 classe, specie e background che non sono nei menu (homebrew cancellato, import) restano mostrati nei menu', async ({open}) => {
    const app = await open({heroes:[fx.blank({class:'Runecarver', species:'Popolo del Muschio', background:'Pirata', level:2, multi:[{class:'Blood Hunter', subclass:'', level:1}]})]});
    const v = await app.page.evaluate(() => ['#f_class', '#f_species', '#f_bg', 'select[data-mc="0:class"]'].map(s => document.querySelector(s)?.value));
    assert.deepStrictEqual(v, ['Runecarver', 'Popolo del Muschio', 'Pirata', 'Blood Hunter'], `i menu mostrano ${v.join(', ')} per un eroe Runecarver / Blood Hunter, Popolo del Muschio, Pirata`);
  }],
  ['cambiare allineamento ed esperienza salva e resta dopo la ricarica', async ({open}) => {
    const app = await open();
    await app.set('#f_align', 'Chaotic Neutral'); await app.set('#f_xp', '1234');
    await app.reload();
    const h = await app.hero();
    assert.deepStrictEqual([h.alignment, h.xp], ['Chaotic Neutral', 1234]);
  }],
  ['l\'Ispirazione Eroica si attiva e si disattiva dalla casella', async ({open}) => {
    const app = await open({heroes:[fx.blank({inspiration:false})]});
    await app.page.locator('#f_insp').check();
    assert.strictEqual((await app.hero()).inspiration, true);
    await app.page.locator('#f_insp').uncheck();
    assert.ok(!(await app.hero()).inspiration);
  }],
  ['cambiare classe a un eroe fa aggiornare le abilità di classe senza errori di console', async ({open}) => {
    const app = await open({heroes:[fx.blank({class:'Fighter', level:3, xp:900})]});
    await app.set('#f_class', 'Cleric'); await app.set('#f_class', 'Rogue');
    const h = await app.hero();
    assert.strictEqual(h.class, 'Rogue');
    assert.deepStrictEqual(app.pageErrors, []);
  }],
]};
