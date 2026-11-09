const {assert, fx} = require('../lib');
const PHONE = {viewport:{width:390, height:844}, mobile:true};
const CHAPS = ['hero', 'abilities', 'combat', 'encounter', 'traits', 'spells', 'pack', 'chronicle', 'library', 'workshop'];
// controlli visibili più piccoli di 44×44 px
const small = (app, selector) => app.page.$$eval(selector, els => els.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
  .map(e => { const r = e.getBoundingClientRect(); return {t:(e.getAttribute('aria-label') || e.textContent).trim().slice(0, 24), w:Math.round(r.width), h:Math.round(r.height)}; })
  .filter(x => x.w < 44 || x.h < 44));
const fmt = l => l.slice(0, 6).map(x => `"${x.t}" ${x.w}×${x.h}`).join(', ') + (l.length > 6 ? ` … (${l.length})` : '');
const tapTest = (nome, prep, selector) => [nome, async ({open}) => {
  const app = await open(PHONE); if (prep) await prep(app);
  const bad = await small(app, selector);
  assert.deepStrictEqual(bad.length, 0, 'sotto 44 px: ' + fmt(bad));
}];

module.exports = {sezione:'telefono', test:[
  ['390 px: nessuno scroll orizzontale in nessun capitolo', async ({open}) => {
    const app = await open(PHONE), bad = [];
    for (const ch of CHAPS){ if (ch !== 'hero') await app.go(ch); const w = await app.page.evaluate(() => document.documentElement.scrollWidth); if (w > 390) bad.push(`${ch} ${w}px`); }
    assert.deepStrictEqual(bad, [], 'scrollWidth oltre 390: ' + bad.join(', '));
  }],
  ['390 px: la finestra Nuovo eroe sta nello schermo', async ({open}) => {
    const app = await open(PHONE);
    await app.click('wizard');
    const r = await app.page.locator('#modalBk .modal').boundingBox();
    assert.ok(r.x >= 0 && r.x + r.width <= 390, `modale da ${Math.round(r.x)} a ${Math.round(r.x + r.width)} px`);
    await app.click('doWizard');
    assert.strictEqual((await app.store()).chars.length, 4);
  }],
  tapTest('tocco ≥44 px: schede dei capitoli', null, '#chapTabs .tab'),
  tapTest('tocco ≥44 px: pulsanti in alto (nuovo eroe, biblioteca, homebrew, tema)', null, '.topActions button'),
  tapTest('tocco ≥44 px: barra dei dadi', null, '.tray .dbtn'),
  tapTest('tocco ≥44 px: frecce per girare pagina', null, '.pageNav button'),
  tapTest('tocco ≥44 px: eroi sullo scaffale', null, '#shelf .hero, #shelf .shelfAdd'),
  tapTest('tocco ≥44 px: danni, cura e riposi', app => app.go('combat'), '#page [data-act="damage"], #page [data-act="heal"], #page [data-act="tempHP"], #page [data-act="shortRest"], #page [data-act="longRest"], #hpAmt'),
  tapTest('tocco ≥44 px: + e − delle caratteristiche', app => app.go('abilities'), '#page .stepper button'),
  tapTest('tocco ≥44 px: slot degli incantesimi', app => app.click('pick', 'teldrin').then(() => app.go('spells')), '#page [data-act="slot"]'),
  ['i campi di testo hanno carattere ≥16 px (niente zoom automatico su iPhone)', async ({open}) => {
    const app = await open(PHONE);
    const bad = await app.page.$$eval('#page input[type=text], #page input[type=number], #page select, #omni', els => els.filter(e => e.getBoundingClientRect().width > 0 && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => (e.id || e.tagName) + ' ' + getComputedStyle(e).fontSize));
    assert.deepStrictEqual(bad, [], bad.slice(0, 6).join(', '));
  }],
]};
