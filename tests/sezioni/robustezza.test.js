const {assert, fx, KEY} = require('../lib');
const CHAPS = ['abilities', 'combat', 'encounter', 'traits', 'spells', 'pack', 'chronicle', 'library', 'workshop', 'hero'];

module.exports = {sezione:'robustezza', test:[
  ['console senza errori: avvio e tutti i capitoli (desktop)', async ({open}) => {
    const app = await open();
    for (const ch of CHAPS) await app.go(ch);
    await app.click('pick', 'teldrin'); for (const ch of CHAPS) await app.go(ch);
    assert.deepStrictEqual([...app.consoleErrors, ...app.pageErrors], []);
  }],
  ['console senza errori: wizard, level up, export e import', async ({open}) => {
    const app = await open();
    await app.click('wizard'); await app.click('doWizard');
    await app.click('levelUp'); await app.click('luApply');
    await app.click('export'); const t = await app.page.inputValue('#expTxt'); await app.click('close');
    await app.click('import'); await app.page.fill('#impTxt', t); await app.click('doImport');
    assert.deepStrictEqual([...app.consoleErrors, ...app.pageErrors], []);
  }],
  ['prima apertura senza dati: copertina, eroi di esempio e nessun errore', async ({open}) => {
    const app = await open({samples:true, prefs:{coverOnStart:true}});
    assert.strictEqual((await app.page.$$('#shelf .hero')).length, 3);
    assert.deepStrictEqual(app.pageErrors, []);
  }],
  ['offline: con il service worker il tomo si riapre senza rete', async ({open}) => {
    const app = await open({sw:true});
    await app.page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await app.page.reload(); await app.ready();
    await app.page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {timeout:10000});
    await app.context.setOffline(true);
    await app.page.reload(); await app.ready();
    assert.ok((await app.text('#page h2')).includes('Valeria Thorne'));
    await app.go('library'); await app.page.fill('#lib_q', 'fireball');
    assert.ok((await app.text('#libList')).includes('Fireball'));
  }],
  ['nome con HTML non viene eseguito (niente XSS)', async ({open}) => {
    const app = await open();
    await app.set('#f_name', '<img src=x onerror="window.__xss=1">');
    await app.go('combat'); await app.go('hero');
    assert.strictEqual(await app.page.evaluate(() => window.__xss), undefined);
    assert.ok((await app.text('#page h2')).includes('<img src=x'));
  }],
  ['emoji e caratteri composti nel nome restano intatti', async ({open}) => {
    const app = await open();
    const n = '👩🏽‍🚀 Zoë Ñandú 龍';
    await app.set('#f_name', n); await app.reload();
    assert.strictEqual((await app.hero()).name, n);
  }],
  ['livello scritto a mano fuori intervallo viene riportato fra 1 e 20', async ({open}) => {
    const app = await open();
    await app.set('#f_level', '-5'); assert.strictEqual((await app.hero()).level, 1);
    await app.set('#f_level', '99'); assert.strictEqual((await app.hero()).level, 20);
  }],
  ['PF massimi 0 o negativi diventano 1', async ({open}) => {
    const app = await open(); await app.go('combat');
    await app.set('#f_hpmax', '-10');
    const h = await app.hero(); assert.strictEqual(h.hp.max, 1); assert.ok(h.hp.cur <= 1);
  }],
  ["localStorage rovinato: l'app parte comunque", async ({open}) => {
    const app = await open({heroes:[], extra:{[KEY]:'{rotto', 'grimoire-prefs-v1':'[[['}});
    assert.ok((await app.page.$$('#shelf .hero')).length >= 1);
    assert.deepStrictEqual(app.pageErrors, []);
  }],
  ["eroe salvato con campi null non blocca l'avvio", async ({open}) => {
    const broken = fx.blank({name:'Nullo', abilities:null, hp:null, inventory:[null, 3], spells:null, multi:'x', currency:null, notes:null});
    const app = await open({heroes:[broken, fx.hero(fx.VALERIA)]});
    for (const ch of CHAPS) await app.go(ch);
    assert.ok((await app.text('#page h2')).includes('Nullo'));
  }],
  ['espressione di dadi non valida: messaggio e nessun errore', async ({open}) => {
    const app = await open();
    await app.page.fill('#diceExpr', 'abc'); await app.click('rollExpr');
    assert.ok(/Type dice like/.test(await app.toast()));
    await app.page.fill('#diceExpr', '2d6+3'); await app.click('rollExpr');
    const t = await app.text('#diceLast'); const n = +(t.match(/(\d+)\s*$/) || [])[1];
    assert.ok(n >= 5 && n <= 15, 'risultato 2d6+3: ' + t);
  }],
  ['nome lungo senza spazi (80 caratteri) non allarga la pagina', async ({open}) => {
    const app = await open();
    await app.click('wizard'); await app.page.fill('#w_name', 'W'.repeat(80)); await app.click('doWizard');
    const sw = await app.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(sw <= 0, `scroll orizzontale di ${sw} px a 1440 px`);
  }],
  ['B-029 solo tastiera: Tab nella finestra Level up non esce sugli eroi coperti e il livello va all\'eroe del titolo', async ({open}) => {
    const app = await open({activeId:'teldrin'});
    await app.click('levelUp'); await app.page.waitForSelector('#modalBk [data-act="luApply"]');
    const fuori = [];
    for (let i = 0; i < 25; i++){
      await app.page.keyboard.press('Tab');
      const f = await app.page.evaluate(() => { const a = document.activeElement; return a.closest('#modalBk') ? '' : (a.dataset.act || a.id || a.tagName) + (a.dataset.arg ? ':' + a.dataset.arg : ''); });
      if (f && f !== 'BODY') fuori.push(f);
      if (f === 'pick:tkessa'){ await app.page.keyboard.press('Enter'); break; }
    }
    if (await app.modalOpen()) await app.page.locator('#modalBk [data-act="luApply"]').click().catch(() => {});
    const s = await app.store(), lv = id => s.chars.find(c => c.id === id).level;
    assert.strictEqual(lv('tkessa'), 2, `Kessa è passata al livello ${lv('tkessa')} dalla finestra "Eldrin reaches level 5" (focus uscito su: ${fuori.slice(0, 6).join(', ')})`);
    assert.deepStrictEqual(fuori, [], `il focus esce dalla finestra: ${fuori.slice(0, 6).join(', ')}`);
  }],
]};
