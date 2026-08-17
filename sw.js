const CACHE = 'stitch-ease-v33';
// Precached so a fresh install works offline. /js/** is also network-first at
// runtime (see fetch below), so a missing entry here degrades to a cache miss
// on first offline load, never to stale code. Paths are relative to the app's
// base (/stitch-ease/) so they work on GitHub Pages.
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './js/vendor/supabase.js',
  './js/core/state.js',
  './js/core/storage.js',
  './js/core/rows.js',
  './js/core/chart.js',
  './js/core/render.js',
  './js/core/pdf.js',
  './js/core/app.js',
  './js/cloud/auth.js',
  './js/cloud/sync.js',
  './js/cloud/pdfsync.js',
  './js/patterns/peacock-tee.js',
  './js/patterns/tatted-triangle.js',
  './js/patterns/lenore.js',
  './js/patterns/frost-flower.js'];
// A pattern that declares `pdf: 'pdf/x.pdf'` (see js/core/pdf.js) must add that
// file here too, or it is only readable online — the whole point is reaching it
// mid-row on a bus. It falls through to the cache-first branch below, which is
// right: a bundled PDF changes only when the deploy does. PDFs a user attaches
// themselves live in IndexedDB and never come through the service worker.

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  // Do NOT skipWaiting here — let the app show an update prompt first
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Don't touch non-GET. Auth token exchange, upserts and RPC are all POST,
  // and caches.match() can never satisfy them anyway.
  if (req.method !== 'GET') return;

  // Don't touch cross-origin. Serving a cached API or auth response is far
  // worse than serving none — a cache-first /rest/v1 read would hand back
  // stale data forever, and a cached /auth/v1/user would pin the wrong
  // account. Let the browser handle these with no SW involvement at all.
  if (url.origin !== self.location.origin) return;

  const isHTML = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  // Network-first for the page AND app code, so deployed updates land
  // immediately; fall back to cache only when offline. Doing this for /js/
  // is what removes the need for ?v= cache-busting query strings — those
  // would have to stay in lockstep with the cache name by hand, and drift
  // would ship a half-updated app.
  //
  // cache: 'no-store' matters here: GitHub Pages serves these files with
  // `cache-control: max-age=600`, and a plain fetch() honors that — the
  // browser's own HTTP cache can silently satisfy this "network-first"
  // request without ever hitting the network, serving up to 10 minutes of
  // stale code right after a deploy. no-store forces an actual round trip.
  if (isHTML || url.pathname.includes('/js/')) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        // ignoreSearch so a navigation carrying a query (e.g. an OAuth
        // ?code= return) still matches the cached page rather than
        // accidentally falling through to the index.html fallback.
        .catch(() => caches.match(req, { ignoreSearch: isHTML })
                       .then(c => c || (isHTML ? caches.match('./index.html') : undefined)))
    );
    return;
  }

  // Cache-first for genuinely static same-origin assets (icons, manifest).
  e.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});

// App sends this message when the user taps "Update now"
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
