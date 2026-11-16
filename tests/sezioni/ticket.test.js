// Ticket per bug, idee e dati sbagliati: coda locale, invio, risposta dell'admin (finto Supabase in tests/cloud.js).
const {assert} = require('../lib');
const {Cloud} = require('../cloud');

const until = async (fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms){ if (await fn()) return true; await new Promise(r => setTimeout(r, 80)); } return false; };
const openForm = async app => { await app.page.locator('#bugBtn').click(); await app.page.waitForSelector('#tk_title'); await app.page.waitForFunction(() => /app version/.test(document.getElementById('tkCtx')?.textContent || '')); };
const fill = async (app, title, body = 'passi e dettagli') => { await app.page.fill('#tk_title', title); await app.page.fill('#tk_body', body); };
const queue = app => app.page.evaluate(() => JSON.parse(localStorage.getItem('grimoire-ticketq-v1') || '[]'));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

module.exports = {sezione:'ticket', test:[
  ["ticket: il pulsante apre il modulo, con contesto raccolto da solo e senza dati personali", async ({open}) => {
    const app = await open({cloud:new Cloud()}); await openForm(app);
    const ctx = await app.text('#tkCtx');
    assert.ok(/chapter you were on \(hero\)/.test(ctx), ctx); assert.ok(/No email, no hero data/.test(ctx));
    assert.ok(/\d+×\d+/.test(ctx), 'manca la dimensione dello schermo');
  }],
  ["ticket: senza titolo non parte e non finisce in coda", async ({open}) => {
    const app = await open({cloud:new Cloud()}); await openForm(app);
    await app.click('tkSend');
    assert.ok(/short title/.test(await app.text('#tkMsg')));
    assert.strictEqual((await queue(app)).length, 0);
  }],
  ["ticket: da loggato arriva nel cloud con tipo, gravità, pagina, versione e dispositivo", async ({open}) => {
    const cloud = new Cloud(); const app = await open({cloud}); await app.go('pack');
    await openForm(app); await app.set('#tk_kind', 'data'); await app.set('#tk_sev', 'high'); await fill(app, 'Spada sbagliata', 'Il danno è 1d4');
    await app.click('tkSend');
    assert.ok(await until(() => cloud.tickets.size === 1), 'il ticket non è arrivato');
    const t = [...cloud.tickets.values()][0];
    assert.deepStrictEqual([t.kind, t.severity, t.title, t.body, t.page], ['data', 'high', 'Spada sbagliata', 'Il danno è 1d4', 'pack']);
    assert.ok(t.app_version.length > 0 && /\d+×\d+/.test(t.device));
    assert.strictEqual(Object.keys(t).filter(k => /mail|hero|password/i.test(k)).length, 0, 'dati personali nel ticket');
    assert.ok(await until(async () => (await queue(app)).length === 0), 'la coda deve svuotarsi');
    assert.ok(await until(async () => /Spada sbagliata/.test(await app.text('#tkMine')) && /Open/.test(await app.text('#tkMine'))), 'manca nella lista dei miei ticket');
  }],
  ["ticket: offline resta in coda e parte da solo quando torna la rete", async ({open}) => {
    const cloud = new Cloud(); const app = await open({cloud});
    await app.page.context().setOffline(true);
    await openForm(app); await fill(app, 'Bug offline'); await app.click('tkSend');
    assert.ok(await until(async () => (await queue(app)).length === 1));
    assert.strictEqual(cloud.tickets.size, 0);
    assert.ok(/Waiting to be sent/.test(await app.text('#tkMine')));
    await app.page.context().setOffline(false);
    await app.page.evaluate(() => window.dispatchEvent(new Event('online')));
    assert.ok(await until(() => cloud.tickets.size === 1), 'il ticket in coda non è stato inviato');
    assert.ok(await until(async () => (await queue(app)).length === 0));
  }],
  ["ticket: da sloggato si salva sul dispositivo e non si perde", async ({open}) => {
    const cloud = new Cloud({signedOut:true}); const app = await open({cloud});
    await openForm(app); await fill(app, 'Prima di accedere'); await app.click('tkSend');
    assert.ok(await until(async () => (await queue(app)).length === 1));
    assert.ok(/sign in/.test(await app.text('#tkMsg')));
    assert.strictEqual(cloud.tickets.size, 0);
  }],
  ["ticket: la schermata (opzionale) viene ridotta e inviata", async ({open}) => {
    const cloud = new Cloud(); const app = await open({cloud}); await openForm(app); await fill(app, 'Con immagine');
    await app.page.setInputFiles('#tk_file', {name:'s.png', mimeType:'image/png', buffer:PNG});
    await app.page.waitForSelector('#tkPrev img'); await app.click('tkSend');
    assert.ok(await until(() => cloud.tickets.size === 1));
    assert.ok([...cloud.tickets.values()][0].screenshot.startsWith('data:image/jpeg'));
  }],
  ["ticket: tabella non ancora creata sul server, il ticket resta in coda senza errori", async ({open}) => {
    const cloud = new Cloud({ticketMode:'missing'}); const app = await open({cloud});
    await openForm(app); await fill(app, 'Server non pronto'); await app.click('tkSend');
    assert.ok(await until(async () => /sign in|connection|Saved/.test(await app.text('#tkMsg'))));
    assert.strictEqual((await queue(app)).length, 1);
  }],
  ["ticket: un utente normale non vede il pulsante admin né i ticket altrui", async ({open}) => {
    const tickets = new Map([['t-altrui-1', {id:'t-altrui-1', owner:'u9', title:'Di un altro', kind:'bug', severity:'low', status:'open', reply:'', created_at:new Date().toISOString()}]]);
    const app = await open({cloud:new Cloud({tickets})}); await openForm(app);
    await app.page.waitForTimeout(600);
    assert.strictEqual(await app.page.locator('[data-act="tkAdmin"]').count(), 0);
    assert.ok(!/Di un altro/.test(await app.text('#tkMine')));
  }],
  ["ticket: l'admin vede tutti, cambia stato e risponde; l'utente legge la risposta", async ({open}) => {
    const tickets = new Map([['t-utente-1', {id:'t-utente-1', owner:'u9', author_name:'Pippo', title:'Il dado non rotola', body:'dettagli', kind:'bug', severity:'high', page:'combat', app_version:'ds1118a', device:'Android · Chrome · 390×844 @3x', status:'open', reply:'', created_at:new Date().toISOString()}]]);
    const adm = await open({cloud:new Cloud({user:'u1', admin:true, tickets})}); await openForm(adm);
    await adm.page.waitForSelector('[data-act="tkAdmin"]'); await adm.click('tkAdmin');
    await adm.page.waitForSelector('.tkCard[data-tk="t-utente-1"]');
    assert.ok(/Pippo/.test(await adm.text('#tkAll')) && /390×844/.test(await adm.text('#tkAll')));
    await adm.page.selectOption('#tk_st_t-utente-1', 'working'); await adm.page.fill('#tk_rp_t-utente-1', 'Lo sistemo oggi');
    await adm.click('tkAdminSave', 't-utente-1');
    assert.ok(await until(() => tickets.get('t-utente-1').reply === 'Lo sistemo oggi' && tickets.get('t-utente-1').status === 'working'));
    const usr = await open({cloud:new Cloud({user:'u9', tickets})}); await openForm(usr);
    assert.ok(await until(async () => /Lo sistemo oggi/.test(await usr.text('#tkMine')) && /In progress/.test(await usr.text('#tkMine'))), 'l\'utente non vede la risposta');
  }],
  ["ticket: l'admin può eliminare un ticket", async ({open}) => {
    const tickets = new Map([['t-spam-1', {id:'t-spam-1', owner:'u9', title:'Spam', kind:'bug', severity:'low', status:'open', reply:'', created_at:new Date().toISOString()}]]);
    const adm = await open({cloud:new Cloud({user:'u1', admin:true, tickets})}); await openForm(adm);
    await adm.page.waitForSelector('[data-act="tkAdmin"]'); await adm.click('tkAdmin'); await adm.page.waitForSelector('.tkCard');
    await adm.click('tkAdminDel', 't-spam-1'); await adm.page.locator('#cfOk').click();
    assert.ok(await until(() => tickets.size === 0));
  }],
  ["ticket: a 390 px il modulo non esce dallo schermo", async ({open}) => {
    const app = await open({cloud:new Cloud(), viewport:{width:390, height:844}, mobile:true}); await openForm(app);
    const o = await app.page.evaluate(() => { const m = document.querySelector('.modal'); return {sw:m.scrollWidth, cw:m.clientWidth, doc:document.documentElement.scrollWidth, iw:innerWidth}; });
    assert.ok(o.sw <= o.cw + 1 && o.doc <= o.iw + 1, JSON.stringify(o));
  }],
]};
