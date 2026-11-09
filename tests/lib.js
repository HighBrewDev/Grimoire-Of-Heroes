// Strumenti comuni della suite: server locale, apertura dell'app isolata, scorciatoie per l'interfaccia.
// Nessuna richiesta esce da localhost: config.js è sostituito con una configurazione vuota (modalità "solo questo dispositivo")
// e ogni altro host viene bloccato. Math.random è sostituito da un generatore con seme fisso.
const {spawn} = require('child_process');
const path = require('path');
const net = require('net');
const assert = require('assert');
const fx = require('./fixtures');

const ROOT = path.resolve(__dirname, '..');
const KEY = 'grimoire-heroes-v1', PREF = 'grimoire-prefs-v1';

function freePort(){
  return new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}
async function startServer(){
  const port = await freePort();
  const proc = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {cwd:ROOT, stdio:'ignore'});
  const base = `http://localhost:${port}/`;
  for (let i = 0; i < 100; i++){
    try { const r = await fetch(base + 'manifest.webmanifest'); if (r.ok) break; } catch (e) {}
    await new Promise(r => setTimeout(r, 100));
  }
  return {base, stop:() => proc.kill()};
}

const SEED_JS = `(() => {
  let s = 20261109;
  Math.random = function(){ s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
})();`;

function seedScript({heroes, activeId, prefs, extra}){
  const data = heroes ? JSON.stringify({chars:heroes, activeId:activeId || heroes[0]?.id || null}) : null;
  const pr = JSON.stringify(Object.assign({chapter:'hero', coverOnStart:false}, prefs || {}));
  const ex = JSON.stringify(extra || {});
  return `(() => { try {
    if (location.hostname !== 'localhost' || localStorage.getItem('__test_seed')) return;
    localStorage.setItem('__test_seed', '1');
    localStorage.setItem('grimoire-welcome-beta1', '1');
    localStorage.setItem(${JSON.stringify(PREF)}, ${JSON.stringify(pr)});
    ${data ? `localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(data)});` : ''}
    const ex = ${ex}; for (const k in ex) localStorage.setItem(k, ex[k]);
  } catch (e) {} })();`;
}

const cssq = s => String(s).replace(/(["\\])/g, '\\$1');

class App {
  constructor(context, page, base){
    this.context = context; this.page = page; this.base = base;
    this.pageErrors = []; this.consoleErrors = []; this.downloads = [];
    this.watch(page);
  }
  watch(page){
    page.on('pageerror', e => this.pageErrors.push(String(e.message || e)));
    page.on('console', m => { if (m.type() === 'error') this.consoleErrors.push(m.text()); });
  }
  sel(act, arg){ return `[data-act="${cssq(act)}"]` + (arg !== undefined ? `[data-arg="${cssq(arg)}"]` : ''); }
  // click visibile, come un utente
  async click(act, arg){ await this.page.locator(this.sel(act, arg) + ' >> visible=true').first().click(); }
  // click via DOM, per i pulsanti dentro sezioni chiuse
  async clickJS(act, arg){
    const ok = await this.page.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.click(); return true; }, this.sel(act, arg));
    assert.ok(ok, `pulsante ${act}${arg !== undefined ? ' ' + arg : ''} non trovato`);
  }
  async go(id){
    await this.page.locator(`#chapTabs [data-arg="${id}"]`).click();
    await this.page.waitForFunction(id => document.querySelector(`#chapTabs [data-arg="${id}"]`)?.getAttribute('aria-current') === 'page', id);
  }
  async set(selector, value){
    const el = this.page.locator(selector).first();
    const tag = await el.evaluate(e => e.tagName);
    if (tag === 'SELECT') await el.selectOption(String(value));
    else { await el.fill(String(value)); await el.dispatchEvent('change'); }
  }
  async store(){ return this.page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY); }
  async hero(){ const s = await this.store(); return s && (s.chars.find(c => c.id === s.activeId) || s.chars[0]); }
  async heroById(id){ const s = await this.store(); return s && s.chars.find(c => c.id === id); }
  async text(selector){ return (await this.page.locator(selector).first().innerText()).trim(); }
  async toast(){ return this.page.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.textContent : ''; }); }
  async ready(){
    await this.page.waitForSelector('#page .pageHead', {timeout:15000});
    const cover = this.page.locator('#coverBk');
    if (await cover.count() && await cover.isVisible()) { await this.page.locator('[data-act="enter"]').click(); await this.page.waitForSelector('#coverBk', {state:'detached'}); }
    await this.page.evaluate(() => document.getElementById('modalBk')?.remove());
  }
  async reload(){ await this.page.reload(); await this.ready(); }
  async newTab(){
    const p = await this.context.newPage(); p.setDefaultTimeout(8000); this.watch(p);
    await p.goto(this.base); const a = Object.create(this); a.page = p; await a.ready(); return a;
  }
  async confirm(){ await this.page.locator('#cfOk').click(); }
  async modalOpen(){ return (await this.page.locator('#modalBk').count()) > 0; }
}

// opts: heroes (lista), activeId, prefs, viewport, sw (service worker attivo), extra (altre chiavi localStorage), samples (nessun seme di eroi)
async function open(browser, base, opts = {}){
  const context = await browser.newContext({
    viewport:opts.viewport || {width:1440, height:900},
    reducedMotion:'reduce', serviceWorkers:opts.sw ? 'allow' : 'block', acceptDownloads:true,
    ...(opts.mobile ? {isMobile:true, hasTouch:true, deviceScaleFactor:1} : {}),
  });
  await context.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') return route.abort();
    if (u.pathname.endsWith('/config.js')) return route.fulfill({contentType:'application/javascript', body:'window.GRIMOIRE_CONFIG = {};'});
    return route.continue();
  });
  await context.addInitScript(SEED_JS);
  const heroes = opts.samples ? null : (opts.heroes || fx.party());
  await context.addInitScript(seedScript({heroes, activeId:opts.activeId, prefs:opts.prefs, extra:opts.extra}));
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const app = new App(context, page, base);
  await page.goto(base + (opts.path || ''));
  await app.ready();
  return app;
}

module.exports = {open, startServer, assert, fx, KEY, ROOT};
