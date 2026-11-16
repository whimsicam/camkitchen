// CAM Kitchen: cache dei file statici. Tutto è network-first; la cache serve solo offline.
const V = 'ck-v18';
const STATIC = ['./', 'index.html', 'style.css?v=18', 'js/app.js?v=18', 'js/store.js', 'js/calc.js', 'js/ui.js', 'js/menu.js', 'js/oggi.js', 'js/piano.js', 'js/riepilogo.js', 'js/other.js', 'js/spesa.js', 'js/ricettario.js',
  'manifest.webmanifest', 'icons/icon-192.png?v=3', 'icons/icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const dati = u.pathname.endsWith('.json');
  if (dati) {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
  } else {
    // no-cache: il browser ricontrolla sempre con GitHub Pages, così codice e stile arrivano insieme alla versione nuova
    const req = e.request.mode === 'navigate' ? e.request.url : e.request;
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
  }
});
