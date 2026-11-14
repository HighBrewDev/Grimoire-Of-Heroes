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
  // B-039: campi degli oggetti importati non passano da fixup() e finiscono nell'HTML senza escape.
  ['B-039 XSS: quantità (q) di un oggetto importato come testo HTML non esegue codice nello Zaino', async ({open}) => {
    const app = await open();
    const hero = fx.blank({id:'xq', name:'Quantità XSS', inventory:[{n:'Corda', q:'<img src=x onerror="window.__xq=1">', d:''}]});
    await app.click('import'); await app.page.fill('#impTxt', JSON.stringify(hero)); await app.click('doImport');
    for (const ch of ['pack', 'spells', 'combat', 'hero']) await app.go(ch);
    await app.page.waitForTimeout(300);
    assert.strictEqual(await app.page.evaluate(() => window.__xq), undefined, 'onerror eseguito: la quantità non è escapata né ridotta a numero');
  }],
  ['B-039 XSS: durata di una condizione (condDur) importata come testo HTML non esegue codice in Combattimento', async ({open}) => {
    const app = await open();
    const hero = fx.blank({id:'xc', name:'Durata XSS', conditions:['Poisoned'], condDur:{Poisoned:'<img src=x onerror="window.__xc=1">'}});
    await app.click('import'); await app.page.fill('#impTxt', JSON.stringify(hero)); await app.click('doImport');
    for (const ch of ['combat', 'encounter', 'hero']) await app.go(ch);
    await app.page.waitForTimeout(300);
    assert.strictEqual(await app.page.evaluate(() => window.__xc), undefined, 'onerror eseguito: condDur non è escapato né ridotto a numero');
  }],
  // B-041: l'import 5etools della Biblioteca salva il JSON grezzo e extMeta/extBody ne inseriscono alcuni campi senza esc.
  ['B-041 XSS: un file 5etools importato nella Biblioteca con HTML in livello, scuola, tabelle o PF non esegue codice', async ({open}) => {
    const app = await open();
    const P = t => `<img src=x onerror="(window.__f=window.__f||[]).push('${t}')">`;
    const pack = {
      spell:[{name:'Sonda', level:P('level'), school:P('school'), entries:['x', {type:'table', rows:[[{roll:{exact:P('rollexact')}}, {roll:{min:P('rmin'), max:P('rmax')}}]]}]}],
      monster:[{name:'Mostro', size:['M'], type:'beast', str:P('str'), dex:10, con:10, int:10, wis:10, cha:10, ac:[10], hp:{average:10},
        spellcasting:[{name:'SC', daily:{[P('dailykey')]:['a']}, spells:{[P('lvkey')]:{slots:P('slots'), spells:['a']}}}]}],
    };
    await app.go('library'); await app.clickJS('libCat', 'import');
    await app.page.setInputFiles('#imp_file', {name:'sonda.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(pack))});
    await app.page.waitForTimeout(800);
    for (const c of ['spells', 'monsters']) {
      await app.clickJS('libCat', c); await app.page.waitForTimeout(100);
      await app.page.evaluate(() => document.querySelectorAll('[data-act="libPick"]').forEach(b => { if (/Sonda|Mostro/.test(b.textContent)) b.click(); }));
      await app.page.waitForTimeout(200);
    }
    const fired = await app.page.evaluate(() => window.__f || []);
    assert.deepStrictEqual(fired, [], 'onerror eseguito da campi non escapati: ' + fired.join(', '));
  }],
  // B-042: resto di B-041: `page` (extMeta, riga della fonte) e `passive` (extBody, mostri) importati da 5etools finiscono nell'HTML senza esc.
  ['B-042 XSS: page e passive di un file 5etools importato nella Biblioteca non eseguono codice', async ({open}) => {
    const app = await open();
    const P = t => `<img src=x onerror="(window.__f=window.__f||[]).push('${t}')">`;
    const pack = {
      spell:[{name:'Sonda', source:'X', page:P('page'), level:1, school:'E', entries:['x']}],
      monster:[{name:'Mostro', source:'X', size:['M'], type:'beast', str:10, dex:10, con:10, int:10, wis:10, cha:10, ac:[10], hp:{average:10}, senses:['darkvision 60 ft.'], passive:P('passive')}],
    };
    await app.go('library'); await app.clickJS('libCat', 'import');
    await app.page.setInputFiles('#imp_file', {name:'sonda.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(pack))});
    await app.page.waitForTimeout(800);
    for (const c of ['spells', 'monsters']) {
      await app.clickJS('libCat', c); await app.page.waitForTimeout(100);
      await app.page.evaluate(() => document.querySelectorAll('[data-act="libPick"]').forEach(b => { if (/Sonda|Mostro/.test(b.textContent)) b.click(); }));
      await app.page.waitForTimeout(200);
    }
    const fired = await app.page.evaluate(() => window.__f || []);
    assert.deepStrictEqual(fired, [], 'onerror eseguito da campi non escapati: ' + [...new Set(fired)].join(', '));
  }],
  ['XSS: il nome dell\'eroe con HTML non esegue codice nelle pagine principali', async ({open}) => {
    const app = await open();
    await app.set('#f_name', '<img src=x onerror="window.__nm=1">');
    for (const ch of ['combat', 'encounter', 'traits', 'spells', 'pack', 'chronicle', 'hero']) await app.go(ch);
    await app.page.waitForTimeout(300);
    assert.strictEqual(await app.page.evaluate(() => window.__nm), undefined, 'onerror eseguito dal nome eroe');
  }],
  ['nome eroe con HTML e 80 caratteri: escapato in scaffale e capitolo Eroe', async ({open}) => {
    const app = await open(); await app.go('hero');
    await app.set('#f_name', '<img src=x onerror="window.__xss=1">'.padEnd(80, 'x'));
    await app.go('combat'); await app.go('hero');
    assert.strictEqual(await app.page.evaluate(() => window.__xss), undefined);
    assert.deepStrictEqual(app.pageErrors, []);
  }],
  ['nome eroe vuoto o di soli spazi non viene salvato', async ({open}) => {
    const app = await open(); await app.go('hero');
    const prima = (await app.hero()).name;
    await app.set('#f_name', '   ');
    assert.strictEqual((await app.hero()).name, prima);
  }],
  ["B-043 homebrew importato con la scuola come oggetto con `toString`: nessun errore di pagina e l'utente vede un messaggio o la finestra di verifica", async ({open}) => {
    const app = await open(); await app.go('workshop');
    const buffer = Buffer.from(JSON.stringify({grimoireHomebrew:[{id:'x', cat:'spells', o:{n:'Scuola strana', lv:1, sc:{toString:1}, cls:['Wizard'], x:'Un lampo.'}}]}));
    await app.page.setInputFiles('#brew_file', {name:'strano.json', mimeType:'application/json', buffer});
    await app.page.waitForTimeout(1200);
    const feedback = (await app.page.locator('#modalBk .b5List').count()) > 0 || (await app.toast()) !== '';
    assert.deepStrictEqual(app.pageErrors, [], 'errore di pagina: ' + app.pageErrors.join(' | '));
    assert.ok(feedback, "nessuna finestra di verifica né messaggio: l'import sparisce nel nulla");
  }],
  // B-044: un pacchetto 5etools con `source` (o `cls`) non testuale entra in IndexedDB; a ogni avvio buildIndex() lancia e boot() si ferma.
  ['B-044 un pacchetto 5etools con `source` come oggetto con `toString` non blocca l\'avvio dell\'app alla ricarica', async ({open}) => {
    const app = await open(); await app.go('library'); await app.clickJS('libCat', 'import');
    await app.page.setInputFiles('#imp_file', {name:'strano.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify({spell:[{name:'Strano', source:{toString:1}, level:1, school:'E', entries:['x']}]}))});
    await app.page.waitForTimeout(1000);
    await app.page.reload(); await app.page.waitForTimeout(1200);
    const tabs = await app.page.locator('#chapTabs button').count();
    assert.ok(tabs > 0, `dopo la ricarica non c'è nessun capitolo (${tabs} segnalibri): l'app non si avvia più. Errori: ${app.pageErrors.join(' | ')}`);
  }],
  // B-045: extBody assume array/oggetti di forma 5etools; con `ac: 15` la voce non si apre e non c'è nessun messaggio.
  ['B-045 una voce 5etools con `ac` numerico (non array) si apre nella Biblioteca senza errori', async ({open}) => {
    const app = await open(); await app.go('library'); await app.clickJS('libCat', 'import');
    await app.page.setInputFiles('#imp_file', {name:'goblin.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify({monster:[{name:'Goblin Capo', source:'HB', size:['S'], type:'humanoid', ac:15, hp:{average:20}, str:10, dex:14, con:10, int:10, wis:10, cha:8}]}))});
    await app.page.waitForTimeout(900);
    await app.clickJS('libCat', 'monsters');
    await app.page.fill('#lib_q', 'Goblin Capo'); await app.page.waitForTimeout(200);
    await app.page.evaluate(() => [...document.querySelectorAll('#libList [data-act="libPick"]')].find(b => /Goblin Capo/.test(b.textContent))?.click());
    await app.page.waitForTimeout(300);
    const det = await app.page.evaluate(() => document.querySelector('#libDetail')?.innerText || '');
    assert.deepStrictEqual(app.pageErrors, [], 'errore di pagina: ' + app.pageErrors.join(' | '));
    assert.ok(/Goblin Capo/.test(det), 'la voce non si apre: il riquadro resta "' + det.slice(0, 40) + '"');
  }],
  // B-046: libFiltered chiama `(e.k || '').toLowerCase()` ma key5 restituisce `o.source` com\'è: se non è testo la ricerca lancia.
  ['B-046 una voce 5etools con `source` non testuale non rompe la ricerca della Biblioteca', async ({open}) => {
    const app = await open(); await app.go('library'); await app.clickJS('libCat', 'import');
    await app.page.setInputFiles('#imp_file', {name:'strano.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify({feat:[{name:'Dono Strano', source:5, entries:['x']}]}))});
    await app.page.waitForTimeout(900);
    await app.clickJS('libCat', 'feats');
    await app.page.fill('#lib_q', 'alert'); await app.page.waitForTimeout(300);
    assert.deepStrictEqual(app.pageErrors, [], 'errore di pagina: ' + app.pageErrors.join(' | '));
  }],
]};
