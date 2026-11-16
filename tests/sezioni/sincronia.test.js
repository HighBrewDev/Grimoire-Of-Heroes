// Homebrew che segue l'account: tabella public.homebrew (finto Supabase in tests/cloud.js).
const {assert} = require('../lib');
const {Cloud} = require('../cloud');

const spell = n => ({n, lv:'1', sc:'Evocation', t:'Action', r:'60 feet', c:'V, S', d:'Instantaneous', cls:['Wizard'], x:'A whip of embers deals 2d8 Fire damage.'});
async function brewSpell(app, name){
  await app.go('workshop');
  await app.click('brewNewKind', 'spells');
  await app.page.fill('#bw_n', name); await app.set('#bw_lv', '1');
  await app.page.locator('.bw_cls[value="Wizard"]').check();
  await app.page.fill('#bw_x', 'A whip of embers deals 2d8 Fire damage.');
  await app.click('brewSave');
  await app.page.waitForFunction(n => [...document.querySelectorAll('[data-act="detailId"]')].some(b => b.textContent === n), name);
}
const names = app => app.page.$$eval('[data-act="detailId"]', b => b.map(x => x.textContent).sort());
const until = async (fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms){ if (await fn()) return true; await new Promise(r => setTimeout(r, 80)); } return false; };
const resync = app => app.page.evaluate(() => window.dispatchEvent(new Event('online')));
const idbItems = app => app.page.evaluate(() => new Promise(res => { const r = indexedDB.open('grimoire-library'); r.onsuccess = () => { const q = r.result.transaction('packs').objectStore('packs').get('homebrew'); q.onsuccess = () => res(q.result?.items || []); }; }));
const nameOf = r => r.data?.o?.n;

module.exports = {sezione:'sincronia', test:[
  ["homebrew: una voce creata da loggato arriva nel cloud con il proprietario", async ({open}) => {
    const cloud = new Cloud(); const app = await open({cloud});
    await brewSpell(app, 'Ember Lash');
    assert.ok(await until(() => cloud.live().length === 1), 'la voce non è arrivata nel cloud');
    const r = cloud.live()[0];
    assert.strictEqual(r.owner, 'u1'); assert.strictEqual(r.data.cat, 'spells'); assert.strictEqual(nameOf(r), 'Ember Lash'); assert.ok(r.data.updatedAt > 0);
  }],
  ["homebrew: un secondo dispositivo trova le voci dell'account", async ({open}) => {
    const cloud = new Cloud(); cloud.put('c0000000000aaaa', spell('Ember Lash'), 'spells', 1000); cloud.put('c0000000000bbbb', spell('Frost Nip'), 'spells', 2000);
    const app = await open({cloud}); await app.go('workshop');
    assert.ok(await until(async () => (await names(app)).length === 2), 'le voci del cloud non sono comparse');
    assert.deepStrictEqual(await names(app), ['Ember Lash', 'Frost Nip']);
    assert.strictEqual((await idbItems(app)).length, 2, 'le voci devono essere anche salvate sul dispositivo');
  }],
  ["homebrew: unire locale e cloud non perde mai una voce locale", async ({open}) => {
    const cloud = new Cloud({homebrew:'down'});
    const app = await open({cloud});
    await brewSpell(app, 'Solo Locale');                       // cloud irraggiungibile: resta sul dispositivo
    cloud.mode = 'ok'; cloud.put('c0000000000aaaa', spell('Dal Cloud'), 'spells', 5000);
    await resync(app);
    assert.ok(await until(async () => (await names(app)).length === 2 && cloud.live().length === 2), 'dopo la sincronizzazione servono due voci ovunque');
    assert.deepStrictEqual(await names(app), ['Dal Cloud', 'Solo Locale']);
    assert.deepStrictEqual(cloud.live().map(nameOf).sort(), ['Dal Cloud', 'Solo Locale']);
  }],
  ["homebrew: cancellare qui cancella nel cloud (voce segnata, non riportata indietro)", async ({open}) => {
    const cloud = new Cloud(); const app = await open({cloud});
    await brewSpell(app, 'Ember Lash');
    assert.ok(await until(() => cloud.live().length === 1));
    await app.click('brewDel'); await app.confirm();
    assert.ok(await until(() => cloud.live().length === 0 && cloud.rows().length === 1), 'il cloud deve tenere la voce come cancellata');
    assert.strictEqual(cloud.rows()[0].deleted, true);
    await resync(app); await new Promise(r => setTimeout(r, 800));
    assert.deepStrictEqual(await names(app), [], 'la voce cancellata non deve tornare');
  }],
  ["homebrew: cancellato nel cloud da un altro dispositivo sparisce anche qui", async ({open}) => {
    const cloud = new Cloud(); cloud.put('c0000000000aaaa', spell('Ember Lash'), 'spells', 1000);
    const app = await open({cloud}); await app.go('workshop');
    assert.ok(await until(async () => (await names(app)).length === 1));
    cloud.put('c0000000000aaaa', null, null, 9e12, true);     // un altro dispositivo la cancella più tardi
    await resync(app);
    assert.ok(await until(async () => (await names(app)).length === 0), 'la voce cancellata altrove è ancora qui');
    assert.strictEqual((await idbItems(app)).length, 0);
  }],
  ["homebrew: una modifica fatta dopo la cancellazione altrove sopravvive e torna nel cloud", async ({open}) => {
    const cloud = new Cloud({homebrew:'down'});
    const app = await open({cloud});
    await brewSpell(app, 'Ember Lash');                         // creata con il cloud giù
    const id = (await idbItems(app))[0].id;
    cloud.put(id, null, null, 1, true); cloud.mode = 'ok';      // il cloud la dà per cancellata, ma molto prima
    await resync(app);
    assert.ok(await until(() => cloud.live().length === 1), 'la voce più recente deve tornare viva nel cloud');
    assert.deepStrictEqual(await names(app), ['Ember Lash']);
  }],
  ["homebrew: vince la modifica più recente, in entrambe le direzioni", async ({open}) => {
    const cloud = new Cloud(); cloud.put('c0000000000aaaa', spell('Vecchio'), 'spells', 1000); cloud.put('c0000000000bbbb', spell('Locale Vecchio'), 'spells', 2000);
    const app = await open({cloud}); await app.go('workshop');
    assert.ok(await until(async () => (await names(app)).length === 2));
    cloud.put('c0000000000aaaa', spell('Nuovo dal cloud'), 'spells', Date.now() + 5000);   // più recente di tutto
    await resync(app);
    assert.ok(await until(async () => (await names(app)).includes('Nuovo dal cloud')), 'la modifica del cloud più recente non è arrivata');
    // ora una modifica locale (adesso) contro il cloud più vecchio: sale
    await app.page.locator('[data-act="brewEdit"]').first().click();
    await app.page.fill('#bw_n', 'Modificato qui'); await app.click('brewSave');
    assert.ok(await until(() => cloud.live().some(r => nameOf(r) === 'Modificato qui')), 'la modifica locale non è salita');
  }],
  ["homebrew: una scrittura più vecchia non cancella quella nuova nel cloud (guardia del server)", async ({open}) => {
    const cloud = new Cloud(); cloud.put('c0000000000aaaa', spell('Recente'), 'spells', 9e12);
    cloud.table.get('c0000000000aaaa').probe = true;
    const app = await open({cloud}); await app.go('workshop');
    assert.ok(await until(async () => (await names(app)).length === 1));
    assert.strictEqual(nameOf(cloud.table.get('c0000000000aaaa')), 'Recente');
  }],
  ["homebrew: se la tabella non esiste ancora l'app resta locale e senza errori", async ({open}) => {
    const cloud = new Cloud({homebrew:'missing'});
    const app = await open({cloud});
    await brewSpell(app, 'Ember Lash');
    await resync(app); await new Promise(r => setTimeout(r, 600));
    assert.deepStrictEqual(await names(app), ['Ember Lash']);
    assert.strictEqual((await idbItems(app)).length, 1);
    const status = await app.page.evaluate(() => document.getElementById('cloudBtn')?.dataset.state + ' | ' + document.getElementById('cloudBtn')?.title);
    assert.ok(/^synced/.test(status), 'lo stato deve restare "synced": ' + status);
    assert.strictEqual(cloud.log.filter(l => /homebrew/.test(l)).length, 1, 'dopo il primo 404 non si riprova nella stessa sessione');
  }],
  ["homebrew: senza accesso nessuna richiesta a homebrew e tutto invariato", async ({open}) => {
    const cloud = new Cloud({signedOut:true}); const app = await open({cloud});
    await brewSpell(app, 'Ember Lash');
    await new Promise(r => setTimeout(r, 2200));
    assert.deepStrictEqual(cloud.log, []);
    await app.reload(); await app.go('workshop');
    assert.deepStrictEqual(await names(app), ['Ember Lash']);
  }],
  ["homebrew: la stessa voce fatta su due dispositivi non si duplica", async ({open}) => {
    const cloud = new Cloud({homebrew:'down'});
    const app = await open({cloud});
    await brewSpell(app, 'Ember Lash');
    cloud.mode = 'ok'; cloud.put('c0000000000aaaa', spell('Ember Lash'), 'spells', 10);   // stessa voce, id diverso, fatta altrove
    await resync(app);
    assert.ok(await until(() => cloud.live().length >= 1 && cloud.log.length > 2));
    await new Promise(r => setTimeout(r, 400));
    assert.deepStrictEqual(await names(app), ['Ember Lash']);
    assert.strictEqual(cloud.live().length, 1);
  }],
  ["homebrew: un altro account sullo stesso dispositivo non riceve le voci del primo", async ({open}) => {
    const cloud = new Cloud();
    const app = await open({cloud});
    await brewSpell(app, 'Ember Lash');
    assert.ok(await until(() => cloud.live().length === 1));
    cloud.user = 'u2'; cloud.table.clear();
    await app.page.evaluate(([s, k]) => { localStorage.setItem('grimoire-session-v1', s); localStorage.setItem(k, '1'); }, [cloud.session(), 'grimoire-migrated-v1:u2']);
    await app.reload();
    await new Promise(r => setTimeout(r, 1200));
    assert.strictEqual(cloud.live().length, 0, "le voci dell'account u1 sono finite in u2");
    const kept = await app.page.evaluate(() => localStorage.getItem('grimoire-brew-backup-v1:u1'));
    assert.ok(kept && kept.includes('Ember Lash'), 'le voci del primo account vanno messe da parte, non perse');
  }],
]};
