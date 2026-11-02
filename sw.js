// CAM Kitchen: cache dei file statici. I dati (JSON) sono sempre network-first.
const V = 'ck-v7';
const STATIC = ['./', 'index.html', 'style.css?v=7', 'js/app.js?v=7', 'js/store.js', 'js/calc.js', 'js/ui.js', 'js/menu.js', 'js/other.js', 'js/spesa.js', 'js/ricettario.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-180.png'];

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
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
  }
});
