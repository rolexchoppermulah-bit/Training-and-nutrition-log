// Offline support. This file is a template: at build time vite.config.js
// fills in VERSION and ASSETS and writes the result to dist/sw.js.
//
// - Pages (navigations): try the network first so you always get the latest
//   version, but if it's offline or takes more than 3 seconds (weak gym
//   signal), open the saved copy instead.
// - Everything else (scripts, styles, icons): serve the saved copy, since
//   their file names change whenever their content does.

const VERSION = '__VERSION__';
const ASSETS = __ASSETS__;
const CACHE = `lift-log-${VERSION}`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  // cache: 'reload' skips the browser's HTTP cache so we never save a stale copy.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('lift-log-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    const network = fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        return caches.open(CACHE).then((cache) => cache.put('./index.html', copy)).then(() => res);
      }
      return res;
    });
    event.waitUntil(network.catch(() => {})); // keep refreshing the saved copy in the background
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        if (!cached) return network;
        const slow = new Promise((resolve) => setTimeout(() => resolve(cached), 3000));
        return Promise.race([network, slow]).catch(() => cached);
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
