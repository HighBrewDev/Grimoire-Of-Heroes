// Schede NPC per il DM: creazione, gruppi, visibilità per campo/sezione/gruppo, e soprattutto che i segreti non arrivino ai giocatori.
const {assert} = require('../lib');
const {Cloud, hub} = require('../cloud');

const until = async (fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms){ if (await fn()) return true; await new Promise(r => setTimeout(r, 80)); } return false; };
const resync = app => app.page.evaluate(() => window.dispatchEvent(new Event('online')));
const SECRET = 'SEGRETO-LIVELLO-TRE', VOCE = 'VOCE-ROCA-SOLO-DM', CIT = 'CITAZIONE-SOLO-DM', NASCOSTO = 'TESTO-SEZIONE-NASCOSTA', REALNAME = 'Rothgar Varnholt', ALIAS = 'Capitano misterioso';

// crea un NPC dalla pagina NPCs. opts: name, alias, tpl, secs {indice:{body, show}}, facts {chiave:[valore, mostra]}, secret, voice, quotes, shown, nameShown
async function mkNpc(app, o){
  await app.go('npcs');
  await app.click('npNew'); await app.click('npCreate', o.tpl || 'party');
  await app.page.fill('#np_n', o.name);
  if (o.alias) await app.page.fill('#np_al', o.alias);
  if (o.nameShown) await app.page.check('#np_ns');
  for (const [k, [v, show]] of Object.entries(o.facts || {})){
    await app.page.locator(`#npForm .np_fv[data-k="${k}"]`).fill(v);
    if (show) await app.page.locator(`#npForm .np_fs[data-k="${k}"]`).check();
  }
  for (const [i, s] of Object.entries(o.secs || {})){
    await app.page.fill(`#np_sb${i}`, s.body);
    if (s.show) await app.page.locator(`#npForm .np_ss[data-i="${i}"]`).check();
  }
  if (o.secret) await app.page.fill('#np_secret', o.secret);
  if (o.voice) await app.page.fill('#np_voice', o.voice);
  if (o.quotes) await app.page.fill('#np_quotes', o.quotes);
  if (o.shown) await app.page.check('#np_shown');
  await app.click('npSave');
  await app.page.waitForSelector('.npCard');
}
const stored = app => app.page.evaluate(() => JSON.parse(localStorage.getItem('grimoire-npc-v1') || '[]'));
const cardText = async app => (await app.text('.npCard'));
const table = (t, f) => [...t.values()].filter(f || (() => true));
const pair = async open => {
  const h = hub(), dm = await open({cloud:new Cloud({user:'u1', hub:h})}), pl = await open({cloud:new Cloud({user:'u2', hub:h})});
  return {h, dm, pl};
};

module.exports = {sezione:'npc', test:[
  ["NPC: si crea dalla pagina NPCs, mostra la scheda e resta dopo la ricarica", async ({open}) => {
    const app = await open();
    await mkNpc(app, {name:REALNAME, facts:{role:['Capitano della Guardia', false], age:['35 anni', false]}, secs:{0:{body:'Rispettato e temuto', show:false}}});
    const t = await cardText(app);
    assert.ok(/ROTHGAR VARNHOLT/i.test(t) && t.includes('Capitano della Guardia') && t.includes('Rispettato e temuto'), 'la scheda deve mostrare nome, fatti e sezioni');
    await app.reload(); await app.go('npcs');
    assert.ok((await app.text('#np_list')).includes(REALNAME), 'l\'NPC deve essere ancora nell\'elenco');
  }],
  ["NPC: i testi con HTML sono mostrati come testo, nessun elemento iniettato", async ({open}) => {
    const app = await open();
    await mkNpc(app, {name:'<img src=x onerror=window.__x=1>', secs:{0:{body:'<b>grassetto</b>', show:false}}});
    assert.strictEqual(await app.page.evaluate(() => window.__x), undefined);
    assert.strictEqual(await app.page.locator('.npCard b').count(), 0);
    assert.strictEqual(await app.page.locator('.npCard img[src="x"]').count(), 0);
  }],
  ["NPC: le sezioni sono opzionali e si riordinano", async ({open}) => {
    const app = await open();
    await mkNpc(app, {name:'Ordine', tpl:'dossier', secs:{0:{body:'uno', show:false}, 1:{body:'due', show:false}}});
    await app.click('npEdit', (await stored(app))[0].id);
    await app.click('npSecDown', '0');
    await app.click('npSecDel', '2');
    await app.click('npSave');
    const o = (await stored(app))[0].o;
    assert.deepStrictEqual(o.secs.slice(0, 2).map(s => s.body), ['due', 'uno']);
    assert.strictEqual(o.secs.length, 7, 'una sezione tolta, le altre restano');
  }],
  ["NPC: un NPC può stare in più gruppi e il filtro li mostra", async ({open}) => {
    const app = await open();
    await mkNpc(app, {name:'Alfa'}); await app.click('npBack'); await mkNpc(app, {name:'Beta'}); await app.click('npBack');
    for (const g of ['Corte', 'Gilda']){
      await app.click('npGroupEdit', ''); await app.page.fill('#np_gn', g);
      await app.page.locator('.np_gm').first().check(); await app.click('npGroupSave', '');
    }
    const items = await stored(app), groups = items.filter(x => x.kind === 'group');
    assert.strictEqual(groups.length, 2);
    assert.ok(groups.every(g => g.o.ids.length === 1 && g.o.ids[0] === groups[0].o.ids[0]), 'lo stesso NPC in due gruppi');
    await app.click('npFilter', groups[0].id);
    assert.ok((await app.text('#np_list')).includes('Alfa') && !(await app.text('#np_list')).includes('Beta'));
  }],
  ["NPC: senza account non si può rivelare ai giocatori e lo dice", async ({open}) => {
    const app = await open();
    await mkNpc(app, {name:'Solo locale'}); await app.click('npBack');
    await app.click('npToggle', (await stored(app))[0].id);
    assert.ok(/account|party|server/i.test(await app.toast()), 'serve un messaggio chiaro');
    assert.strictEqual((await stored(app))[0].o.shown, false);
  }],
  ["NPC: ai giocatori non arriva mai nulla di ciò che non è rivelato (segreti, voce, citazioni, nome, sezioni nascoste)", async ({open}) => {
    const {h, dm, pl} = await pair(open);
    await dm.page.evaluate(() => window.dispatchEvent(new Event('online')));
    await until(async () => (await dm.page.evaluate(() => !!document.querySelector('#cloudName'))));
    await mkNpc(dm, {name:REALNAME, alias:ALIAS, tpl:'dossier', facts:{role:['Capitano', true], marks:['Cicatrice sul collo', false]},
      secs:{0:{body:'Profilo pubblico', show:true}, 1:{body:NASCOSTO, show:false}}, secret:SECRET, voice:VOCE, quotes:CIT, shown:true});
    assert.ok(await until(() => table(h.pub).some(r => !r.deleted)), 'la copia pubblica non è arrivata');
    const pubJson = JSON.stringify(table(h.pub));
    for (const x of [SECRET, VOCE, CIT, NASCOSTO, REALNAME, 'Cicatrice']) assert.ok(!pubJson.includes(x), `"${x}" è finito nella tabella pubblica`);
    for (const x of ['Profilo pubblico', 'Capitano', ALIAS]) assert.ok(pubJson.includes(x), `"${x}" doveva essere rivelato`);
    const priv = JSON.stringify(table(h.npcs));
    assert.ok(priv.includes(SECRET) && priv.includes(VOCE) && priv.includes(CIT), 'il DM deve ritrovare i suoi segreti nel suo cloud');
    // il giocatore vede solo la copia pubblica
    await pl.go('npcs'); await resync(pl);
    assert.ok(await until(async () => (await pl.text('#page')).includes(ALIAS)), 'il giocatore non vede l\'NPC rivelato');
    const page = await pl.text('#page');
    for (const x of [SECRET, VOCE, CIT, NASCOSTO, REALNAME, 'Cicatrice']) assert.ok(!page.includes(x), `"${x}" visibile al giocatore`);
    await pl.click('npOpenShared', table(h.pub)[0].id);
    const card = await cardText(pl);
    assert.ok(card.includes('Profilo pubblico') && card.includes('Capitano') && !card.includes(NASCOSTO), 'il giocatore vede solo ciò che è rivelato');
    assert.strictEqual(await pl.page.locator('.npCard .hid').count(), 0, 'niente segni di contenuti nascosti nella vista giocatore');
    const ls = await pl.page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
    for (const x of [SECRET, VOCE, CIT, NASCOSTO]) assert.ok(!ls.includes(x), 'segreto salvato nel browser del giocatore');
  }],
  ["NPC: un NPC non rivelato non si vede; nasconderlo di nuovo lo toglie ai giocatori", async ({open}) => {
    const {h, dm, pl} = await pair(open);
    await mkNpc(dm, {name:'Nascosto', secs:{0:{body:'x', show:true}}}); await dm.click('npBack');
    await pl.go('npcs'); await resync(pl); await new Promise(r => setTimeout(r, 600));
    assert.strictEqual(table(h.pub).length, 0, 'nessuna copia pubblica finché non è rivelato');
    const id = (await stored(dm))[0].id;
    await dm.click('npToggle', id);
    assert.ok(await until(() => table(h.pub).some(r => !r.deleted)));
    await resync(pl); assert.ok(await until(async () => (await pl.text('#page')).includes('Unknown figure')), 'il giocatore deve vederlo');
    await dm.click('npToggle', id);
    assert.ok(await until(() => table(h.pub).every(r => r.deleted)), 'la copia pubblica deve essere ritirata');
    await resync(pl); assert.ok(await until(async () => !(await pl.text('#page')).includes('Unknown figure')), 'il giocatore non deve più vederlo');
  }],
  ["NPC: un gruppo nascosto non si vede; uno rivelato elenca solo gli NPC rivelati", async ({open}) => {
    const {h, dm, pl} = await pair(open);
    await mkNpc(dm, {name:'Visibile', nameShown:true, shown:true}); await dm.click('npBack');
    await mkNpc(dm, {name:'Segreto Totale'}); await dm.click('npBack');
    await dm.click('npGroupEdit', ''); await dm.page.fill('#np_gn', 'Corte del Re');
    await dm.page.locator('.np_gm').nth(0).check(); await dm.page.locator('.np_gm').nth(1).check(); await dm.click('npGroupSave', '');
    await pl.go('npcs'); await resync(pl);
    assert.ok(await until(async () => (await pl.text('#page')).includes('Visibile')));
    assert.ok(!(await pl.text('#page')).includes('Corte del Re'), 'gruppo nascosto: il giocatore non lo vede');
    await dm.click('npGroupToggle', (await stored(dm)).find(x => x.kind === 'group').id);
    assert.ok(await until(() => table(h.pub).some(r => r.data.kind === 'group' && !r.deleted)), 'la copia pubblica del gruppo non è partita');
    await resync(pl);
    assert.ok(await until(async () => (await pl.text('#page')).includes('Corte del Re')), 'gruppo rivelato: ora si vede');
    assert.ok(!JSON.stringify(table(h.pub)).includes('Segreto Totale'));
    assert.strictEqual(JSON.parse(JSON.stringify(table(h.pub).find(r => r.data.kind === 'group').data.o.ids)).length, 1, 'il gruppo elenca solo l\'NPC rivelato');
  }],
  ["NPC: i collegamenti arrivano ai giocatori solo verso NPC rivelati", async ({open}) => {
    const {h, dm, pl} = await pair(open);
    await mkNpc(dm, {name:'Fratello Noto', nameShown:true, shown:true}); await dm.click('npBack');
    await mkNpc(dm, {name:'Rivale Occulto'}); await dm.click('npBack');
    await mkNpc(dm, {name:'Capo Famiglia', nameShown:true, shown:true});
    const ids = Object.fromEntries((await stored(dm)).map(x => [x.o.n, x.id]));
    await dm.click('npEdit', ids['Capo Famiglia']);
    for (const [name, rel] of [['Fratello Noto', 'Fratello'], ['Rivale Occulto', 'Rivale']]){
      await dm.click('npLinkAdd');
      const i = (await dm.page.locator('#npForm .np_lt').count()) - 1;
      await dm.page.locator(`#npForm .np_lt[data-i="${i}"]`).selectOption(ids[name]);
      await dm.page.locator(`#npForm .np_lr[data-i="${i}"]`).fill(rel);
      await dm.page.locator(`#npForm .np_ls[data-i="${i}"]`).check();
    }
    await dm.click('npSave');
    assert.ok(await until(() => table(h.pub).some(r => r.id === ids['Capo Famiglia'] && r.data.o.links?.length === 1)), 'solo il collegamento verso l\'NPC rivelato');
    const pubLinks = table(h.pub).find(r => r.id === ids['Capo Famiglia']).data.o.links;
    assert.deepStrictEqual(pubLinks.map(l => l.to), [ids['Fratello Noto']]);
    await pl.go('npcs'); await resync(pl);
    assert.ok(await until(async () => (await pl.text('#page')).includes('Capo Famiglia')));
    await pl.click('npOpenShared', ids['Capo Famiglia']);
    const c = await cardText(pl); assert.ok(c.includes('Fratello Noto') && !c.includes('Rivale Occulto'));
  }],
  ["NPC: cancellare un NPC lo toglie dal cloud del DM e dai giocatori", async ({open}) => {
    const {h, dm} = await pair(open);
    await mkNpc(dm, {name:'Effimero', nameShown:true, shown:true}); await dm.click('npBack');
    assert.ok(await until(() => table(h.pub).some(r => !r.deleted) && table(h.npcs).some(r => !r.deleted)));
    await dm.click('npDel', (await stored(dm))[0].id); await dm.confirm();
    assert.ok(await until(() => table(h.pub).every(r => r.deleted) && table(h.npcs).every(r => r.deleted)), 'il cloud deve avere solo tombstone');
  }],
  ["NPC: un secondo dispositivo del DM ritrova gli NPC e i segreti", async ({open}) => {
    const h = hub(), a = await open({cloud:new Cloud({user:'u1', hub:h})});
    await mkNpc(a, {name:'Ovunque', secret:SECRET});
    assert.ok(await until(() => table(h.npcs).length === 1));
    const b = await open({cloud:new Cloud({user:'u1', hub:h})}); await b.go('npcs');
    assert.ok(await until(async () => (await b.text('#page')).includes('Ovunque')));
    assert.ok(JSON.stringify(await stored(b)).includes(SECRET));
  }],
  ["NPC: tabelle non ancora create sul server: tutto resta locale, senza errori", async ({open}) => {
    const h = hub(), app = await open({cloud:new Cloud({user:'u1', hub:h, npc:'missing'})});
    await mkNpc(app, {name:'Locale'}); await app.click('npBack');
    await app.click('npToggle', (await stored(app))[0].id);
    assert.ok(/server|party|account/i.test(await app.toast()));
    assert.strictEqual(app.pageErrors.length, 0);
    assert.ok((await app.text('#page')).includes('Locale'));
  }],
  ["NPC: telefono 390 px, elenco, editor e scheda senza scorrimento orizzontale", async ({open}) => {
    const app = await open({viewport:{width:390, height:800}, mobile:true});
    const wide = () => app.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    await mkNpc(app, {name:'Nome Molto Lungo Di Un Capitano Della Guardia Reale', tpl:'dossier', facts:{role:['Capitano dell\'Arma di Pattuglia dei Pavoni del Palazzo d\'Oro', false], marks:['Marcata ipertrofia venosa superficiale', false]},
      secs:{0:{body:'Riga uno\nRiga due', show:false}}, voice:'x'});
    assert.ok(await wide() <= 1, 'scheda: scorrimento orizzontale ' + await wide());
    await app.click('npEdit', (await stored(app))[0].id);
    assert.ok(await wide() <= 1, 'editor: scorrimento orizzontale ' + await wide());
    await app.click('npBack');
    assert.ok(await wide() <= 1, 'elenco: scorrimento orizzontale ' + await wide());
  }],
]};
