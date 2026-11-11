const {assert, fx} = require('../lib');
async function importText(app, txt){
  await app.click('import'); await app.page.fill('#impTxt', typeof txt === 'string' ? txt : JSON.stringify(txt)); await app.click('doImport');
}
async function exportText(app){ await app.click('export'); const t = await app.page.inputValue('#expTxt'); await app.click('close'); return t; }
const LOCAL = ['_sig', '_dirty', '_rev', '_blocked', 'ownerName', 'updatedAt', 'editedOn'];
const CHAPS = ['abilities', 'combat', 'encounter', 'traits', 'spells', 'pack', 'chronicle', 'library', 'workshop', 'hero'];

module.exports = {sezione:'importexport', test:[
  ['le modifiche restano dopo la ricarica della pagina', async ({open}) => {
    const app = await open();
    await app.set('#f_name', 'Valeria Ricaricata'); await app.go('combat');
    await app.page.fill('#hpAmt', '3'); await app.click('damage');
    await app.reload();
    const h = await app.hero();
    assert.deepStrictEqual([h.name, h.hp.cur], ['Valeria Ricaricata', 29]);
    assert.ok((await app.text('#shelf')).includes('Valeria Ricaricata'));
  }],
  ["eroe attivo e capitolo restano dopo la ricarica", async ({open}) => {
    const app = await open();
    await app.click('pick', 'tkessa'); await app.go('pack');
    await app.reload();
    assert.ok((await app.text('#page h2')).includes('Kessa Quickpaw · Pack & Riches'));
  }],
  ['export → import: stesso eroe con un nuovo id', async ({open}) => {
    const app = await open({activeId:'teldrin'});
    const t = await exportText(app), a = JSON.parse(t);
    await importText(app, t);
    const s = await app.store(), b = s.chars[s.chars.length - 1];
    assert.strictEqual(s.chars.length, 4); assert.notStrictEqual(b.id, a.id); assert.strictEqual(s.activeId, b.id);
    for (const k of ['name', 'class', 'level', 'abilities', 'hp', 'spells', 'inventory', 'currency', 'notes', 'feats', 'attacks'])
      assert.deepStrictEqual(b[k], a[k], 'campo diverso dopo il re-import: ' + k);
  }],
  ['B-012 export senza campi locali (_sig, updatedAt, editedOn…)', async ({open}) => {
    const app = await open();
    await app.set('#f_name', 'Con modifica');
    const o = JSON.parse(await exportText(app));
    const bad = LOCAL.filter(k => k in o);
    assert.deepStrictEqual(bad, []);
  }],
  ['B-012 in localStorage _sig è un\'impronta corta, non una copia dell\'eroe', async ({open}) => {
    const app = await open();
    await app.set('#f_name', 'Firma');
    const s = await app.store();
    const long = s.chars.filter(c => typeof c._sig === 'string' && (c._sig.length > 64 || c._sig.startsWith('{')));
    assert.deepStrictEqual(long.map(c => c.name), []);
  }],
  ['Download .json scarica un file con il nome dell\'eroe', async ({open}) => {
    const app = await open();
    await app.click('export');
    const [dl] = await Promise.all([app.page.waitForEvent('download'), app.click('downloadChar')]);
    assert.strictEqual(dl.suggestedFilename(), 'Valeria-Thorne.json');
  }],
  ['B-010 eroe con nome numerico: diventa testo e il download funziona', async ({open}) => {
    const app = await open();
    await importText(app, {name:12345, abilities:{str:10}});
    assert.strictEqual((await app.hero()).name, '12345');
    await app.click('export');
    const [dl] = await Promise.all([app.page.waitForEvent('download'), app.click('downloadChar')]);
    assert.strictEqual(dl.suggestedFilename(), '12345.json');
  }],
  ['testo non valido: messaggio e nessun eroe aggiunto', async ({open}) => {
    const app = await open();
    await importText(app, '{questo non è json');
    assert.ok(/not a hero exported/.test(await app.toast()));
    assert.strictEqual((await app.store()).chars.length, 3);
  }],
  ['B-003 import con campi del tipo sbagliato: tutti i capitoli si aprono, anche dopo ricarica', async ({open}) => {
    const app = await open();
    for (const j of [{name:'Rotto', abilities:{str:10}, inventory:'spada'}, {name:'Rotto2', abilities:{str:10}, feats:[null, 5]}, {name:'Rotto3', abilities:{str:10}, attacks:{}, conditions:'Blinded', spells:{known:'Fireball'}}])
      await importText(app, j);
    for (const ch of CHAPS) await app.go(ch);
    await app.reload();
    for (const ch of CHAPS) await app.go(ch);
    assert.strictEqual((await app.store()).chars.length, 6);
  }],
  ['B-007 import con valori impossibili riportati in un intervallo valido', async ({open}) => {
    const app = await open();
    await importText(app, {name:'MultiOver', abilities:{str:10}, class:'Fighter', level:5, multi:[{class:'Wizard', level:19}, {class:'Rogue', level:19}]});
    let h = await app.hero();
    assert.ok(h.level <= 20 && h.multi.reduce((t, m) => t + m.level, 0) < h.level, 'livello totale ' + h.level);
    await importText(app, {name:'LvHuge', abilities:{str:999999, dex:-50}, level:1000000000, hp:{cur:-999, max:-5, temp:'x'}});
    h = await app.hero();
    assert.deepStrictEqual([h.abilities.str, h.abilities.dex, h.level, h.hp.cur >= 0, h.hp.max >= 1], [30, 1, 20, true, true]);
    assert.ok(!/undefined/.test(await app.text('#page .pageHead')));
  }],
  ['B-002 due schede: gli eroi creati in entrambe restano', async ({open}) => {
    const a = await open();
    const b = await a.newTab();
    for (const [tab, n] of [[a, 'EroeTabA'], [b, 'EroeTabB']]){
      await tab.page.bringToFront(); await tab.click('wizard'); await tab.page.fill('#w_name', n); await tab.click('doWizard');
    }
    await a.page.bringToFront(); await a.set('#f_name', 'EroeTabA2');
    const c = await a.newTab();
    const names = (await c.store()).chars.map(h => h.name);
    assert.ok(names.includes('EroeTabB') && names.includes('EroeTabA2'), names.join(', '));
  }],
  ['B-004 memoria piena: avviso "Not saved" visibile e niente "joins the tome"', async ({open}) => {
    const app = await open();
    await app.page.evaluate(() => { let n = 0; for (let size = 1 << 20; size >= 1; size >>= 1){ const s = 'x'.repeat(size); for (;;){ try { localStorage.setItem('__fill' + n++, s); } catch (e) { break; } } } });
    await app.click('wizard'); await app.page.fill('#w_name', 'PienoStorage'); await app.click('doWizard');
    await app.page.waitForTimeout(3000);
    const alert = await app.page.evaluate(() => [...document.querySelectorAll('[role="alert"]')].filter(e => !e.hidden && e.getBoundingClientRect().height > 0).map(e => e.textContent).join(' '));
    assert.ok(/Not saved/i.test(alert), 'nessun avviso persistente: ' + alert);
    assert.ok(!/joins the tome/.test(await app.toast()));
  }],
  ['B-015 esiste "Esporta tutti" gli eroi in un solo file', async ({open}) => {
    const app = await open();
    await app.click('export');
    const found = await app.page.evaluate(() => [...document.querySelectorAll('button, a')].some(b => /export all|all heroes|every hero|esporta tutti|backup/i.test(b.textContent)));
    assert.ok(found, 'nessun pulsante per esportare tutti gli eroi insieme');
  }],
  ["B-016 due schede: se A cancella l'eroe che B sta scrivendo, le note di un altro eroe non cambiano", async ({open}) => {
    const a = await open(); const b = await a.newTab();
    await b.go('chronicle');
    const before = (await b.heroById('teldrin')).notes.story;
    await b.page.click('[data-bind="notes.story"]'); await b.page.keyboard.type(' e poi');
    await a.click('deleteChar'); await a.confirm(); await a.page.waitForTimeout(300);
    await b.page.keyboard.type(' ancora'); await b.page.keyboard.press('Tab'); await b.page.waitForTimeout(300);
    const e = await b.heroById('teldrin');
    assert.strictEqual(e.notes.story, before, 'storia di Eldrin sovrascritta: ' + JSON.stringify(e.notes.story).slice(0, 120));
  }],
  ["B-016 due schede: se A cancella l'eroe che B sta rinominando, nessun altro eroe prende quel nome", async ({open}) => {
    const a = await open(); const b = await a.newTab();
    await b.page.fill('#f_name', 'Nome scritto in B');
    await a.click('deleteChar'); await a.confirm(); await a.page.waitForTimeout(300);
    await b.page.keyboard.press('Tab'); await b.page.waitForTimeout(300);
    const names = (await b.store()).chars.map(c => c.name);
    assert.deepStrictEqual(names, ['Eldrin Moonwhisper', 'Kessa Quickpaw']);
  }],
  ['B-024 backup di eroi duplicati più volte: il ripristino li riporta tutti', async ({open}) => {
    const name = 'Cavaliere della Torre Grigia di Valmorta, custode del sigillo antico';   // 70 caratteri
    const app = await open({heroes:[fx.hero(fx.VALERIA, {name})]});
    await app.click('duplicate'); await app.click('duplicate'); await app.click('duplicate');
    const names = (await app.store()).chars.map(c => c.name);
    assert.strictEqual(new Set(names).size, 4);
    await app.click('export');
    const [dl] = await Promise.all([app.page.waitForEvent('download'), app.click('exportAll')]);
    const txt = require('fs').readFileSync(await dl.path(), 'utf8');
    const b = await open({heroes:[fx.hero(fx.KESSA)]});
    await b.click('import');
    await b.page.evaluate(t => { document.getElementById('impTxt').value = t; }, txt);
    await b.click('doImport'); await b.page.waitForTimeout(300);
    const n = (await b.store()).chars.length;
    assert.strictEqual(n, 5, `dopo il ripristino ${n - 1} eroi su 4 (${await b.toast()})`);
  }],
  ['B-024 due Duplicate dello stesso eroe: nomi diversi e il ripristino li riporta tutti', async ({open}) => {
    const app = await open({heroes:[fx.hero(fx.KESSA)]});
    await app.click('duplicate'); await app.click('pick', 'tkessa'); await app.click('duplicate');
    const names = (await app.store()).chars.map(c => c.name);
    assert.strictEqual(new Set(names).size, 3, 'nomi: ' + names.join(' | '));
    await app.click('export');
    const [dl] = await Promise.all([app.page.waitForEvent('download'), app.click('exportAll')]);
    const txt = require('fs').readFileSync(await dl.path(), 'utf8');
    const b = await open({heroes:[fx.hero(fx.VALERIA)]});
    await importText(b, txt); await b.page.waitForTimeout(300);
    assert.strictEqual((await b.store()).chars.length, 4, await b.toast());
    await importText(b, txt); await b.page.waitForTimeout(300);
    assert.strictEqual((await b.store()).chars.length, 4, 'secondo ripristino dello stesso file: doppioni');
  }],
  ['B-024 Duplicate a catena: il nome resta entro 80 caratteri e non accumula "(copy)"', async ({open}) => {
    const app = await open({heroes:[fx.hero(fx.VALERIA, {name:'V'.repeat(80)})]});
    for (let i = 0; i < 4; i++) await app.click('duplicate');
    const names = (await app.store()).chars.map(c => c.name);
    assert.strictEqual(new Set(names).size, 5, 'nomi uguali: ' + names.join(' | '));
    assert.ok(names.every(n => n.length <= 80), 'nome oltre 80: ' + names.map(n => n.length).join(','));
    assert.ok(names.every(n => (n.match(/\(copy/g) || []).length <= 1), 'copy ripetuto: ' + names.join(' | '));
  }],
  ["B-016 due schede: se A cancella l'eroe che B sta scrivendo, B avvisa che il testo non è salvato", async ({open}) => {
    const a = await open(); const b = await a.newTab();
    await b.go('chronicle');
    await b.page.click('[data-bind="notes.story"]'); await b.page.keyboard.type(' e poi');
    await a.click('deleteChar'); await a.confirm(); await a.page.waitForTimeout(300);
    await b.page.keyboard.type(' ancora'); await b.page.keyboard.press('Tab'); await b.page.waitForTimeout(300);
    assert.ok(/deleted in another tab/i.test(await b.toast()), 'nessun avviso: ' + await b.toast());
    const s = await b.store();
    assert.ok(s.chars.every(c => !/ancora/.test(c.notes?.story || '')), 'testo finito su un altro eroe');
  }],
  ['import di un elenco di due eroi: entrano entrambi e restano dopo la ricarica', async ({open}) => {
    const app = await open();
    await importText(app, [fx.blank({id:'x1', name:'Primo Importato'}), fx.blank({id:'x2', name:'Secondo Importato'})]);
    await app.reload();
    const nomi = (await app.store()).chars.map(c => c.name);
    assert.ok(nomi.includes('Primo Importato') && nomi.includes('Secondo Importato'), 'eroi presenti: ' + nomi.join(', '));
    assert.strictEqual(nomi.length, 5);
  }],
]};
