// ============================================================
// PairBoard Service Worker
// Strategy:
//   • App shell (HTML, manifest, icons) — cached on install
//   • CDN resources (PDF.js, Tesseract, etc.) — cached on first
//     fetch, served from cache forever after (one-time download)
//   • POST/non-GET requests — never intercepted
//   • Future large models (LLM) — handled separately via
//     IndexedDB in the app; NOT cached here (too large for Cache API)
//
// To release an update: bump CACHE_VERSION below, redeploy.
// Browser detects the changed sw.js, installs new shell cache,
// deletes the old one, and notifies the user to refresh.
// ============================================================

const CACHE_VERSION  = 'v1';
const SHELL_CACHE    = 'pb-shell-'   + CACHE_VERSION;
const RUNTIME_CACHE  = 'pb-runtime-' + CACHE_VERSION;

// Files cached immediately on install (app shell).
// These must be present and correct for offline to work.
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// ── Install ─────────────────────────────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(function(cache) { return cache.addAll(SHELL_FILES); })
      .then(function() { return self.skipWaiting(); }) // activate immediately
  );
});

// ── Activate ────────────────────────────────────────────────
// Delete any caches from previous versions.
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(
          keys
            .filter(function(k) { return k !== SHELL_CACHE && k !== RUNTIME_CACHE; })
            .map(function(k) { return caches.delete(k); })
        );
      })
      .then(function() { return self.clients.claim(); }) // take control immediately
  );
});

// ── Fetch ───────────────────────────────────────────────────
self.addEventListener('fetch', function(e) {
  var req = e.request;

  // Only handle GET
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  var isSameOrigin = url.origin === self.location.origin;

  // Navigation (page load) — always serve index.html from shell cache
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(function(cached) {
        return cached || fetch(req);
      })
    );
    return;
  }

  if (isSameOrigin) {
    // ── Shell files: cache-first ──────────────────────────
    e.respondWith(
      caches.match(req).then(function(cached) {
        if (cached) return cached;
        // Not in shell cache yet (e.g. new asset): fetch and add
        return fetch(req).then(function(response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(SHELL_CACHE).then(function(c) { c.put(req, clone); });
          }
          return response;
        });
      })
    );
  } else {
    // ── External / CDN resources: cache on first fetch ────
    // PDF.js, Tesseract workers, fonts, etc.
    // Once cached → fully offline. Never re-fetched unless cache cleared.
    e.respondWith(
      caches.match(req).then(function(cached) {
        if (cached) return cached;
        return fetch(req).then(function(response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(RUNTIME_CACHE).then(function(c) { c.put(req, clone); });
          }
          return response;
        }).catch(function() {
          // Offline and not yet cached — return a minimal offline response
          // The app handles individual missing CDN resources (PDF.js guard, etc.)
          return new Response(
            JSON.stringify({ offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        });
      })
    );
  }
});

// ── Message: force update ────────────────────────────────────
// App can send { type: 'SKIP_WAITING' } to force a waiting SW active.
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
