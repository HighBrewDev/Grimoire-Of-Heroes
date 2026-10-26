// Grimoire of Heroes · offline cache. The app shell is served from the cache at once and refreshed in the
// background, so the tome opens without a connection and picks up a new version on the next launch.
const CACHE = 'grimoire-f294f03e0f';
const SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); });
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
    const net = fetch(req).then(r => { if (r.ok) c.put(key, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
