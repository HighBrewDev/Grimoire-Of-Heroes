// Grimoire of Heroes · offline cache. The app shell is served from the cache at once and refreshed in the
// background, so the tome opens without a connection. Opening the page takes the new version at once when the network is quick, the cached one otherwise.
const CACHE = 'grimoire-ds1125a';


const SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache:'reload'}))))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  // only the app's own files are cached; Supabase (and any API on the same host) always goes to the network
  const scope = new URL(self.registration.scope);
  const own = url.origin === location.origin && url.pathname.startsWith(scope.pathname) && !/\/(rest|auth|storage)\/v1\//.test(url.pathname);
  if (req.method !== 'GET' || !own || !(req.mode === 'navigate' || /\.(html|js|webmanifest|png)$/.test(url.pathname))) return;
  const key = req.mode === 'navigate' ? 'index.html' : req;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(key, {ignoreSearch:req.mode === 'navigate'});
    const net = fetch(req.mode === 'navigate' ? new Request(req, {cache:'no-cache'}) : req).then(r => { if (r.ok) c.put(key, r.clone()); return r; }).catch(() => hit);
    // opening the page: the new version first when the network answers within 3 s (so a release shows on the first reopen, not the second); the cache only when offline or slow
    if (req.mode === 'navigate' && hit) return Promise.race([net, new Promise(res => setTimeout(() => res(hit), 3000))]);
    return hit || net;
  }));
});
