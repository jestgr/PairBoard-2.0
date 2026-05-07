# PairBoard PWA — Deployment Guide

## Files

```
index.html          ← The app (all JS/CSS inline)
manifest.json       ← PWA identity and icons
sw.js               ← Service worker (offline cache)
icons/
  icon-192.png      ← Android home screen
  icon-512.png      ← Splash screen / app store
  icon-maskable-512.png  ← Android adaptive icon
  apple-touch-icon.png   ← iOS home screen
```

---

## GitHub Pages (initial hosting)

### First deploy

1. Create a new GitHub repository (e.g. `pairboard`)
2. Upload all files **preserving the folder structure** — the `icons/` folder must be at the root
3. Go to **Settings → Pages**
4. Under *Source*, select **Deploy from a branch**
5. Branch: `main` (or `master`), folder: `/ (root)`
6. Click Save — your app will be live at:
   `https://YOUR-USERNAME.github.io/pairboard/`

> **iOS note:** After visiting the URL in Safari, tap Share → "Add to Home Screen".
> Android Chrome will show an install banner automatically.

### Updating the app

1. Edit `index.html` locally
2. **Bump `CACHE_VERSION`** in `sw.js` (e.g. `'v1'` → `'v2'`)
   - This is the only required change outside the HTML
   - Without a version bump, users keep the old cached version
3. Upload (or push) the changed files
4. Users see a "Update available — reload to apply" toast on next visit

---

## Own server (future)

Drop the same files into any HTTPS-served directory. No changes needed —
all paths are relative (`./`), so the app works at any URL depth:
- `https://yourdomain.com/` ✓
- `https://yourdomain.com/tools/pairboard/` ✓

**Required:** HTTPS. IndexedDB (and the service worker itself) are blocked on plain HTTP.

---

## Offline behavior

| Resource | Strategy |
|---|---|
| App shell (HTML, manifest, icons) | Cached on install — always offline |
| PDF.js, Tesseract (CDN) | Cached on first use — offline after that |
| Future LLM model weights | Large — will use IndexedDB, not Cache API |

Users need one online session per device to warm the cache.
After that, the app is fully offline including PDF import and FAR 117.

---

## Updating CACHE_VERSION — cheat sheet

In `sw.js`, line 1:
```js
const CACHE_VERSION = 'v1';   // ← change this on every deploy
```

Change to `'v2'`, `'v3'`, etc. The browser detects the change,
installs the new shell in the background, and the toast fires when ready.

---

## Adding new modules (Rotation Lens, LLM Chat, etc.)

No changes to `sw.js` or `manifest.json` required. New modules are
inline JS in `index.html`, so they're cached automatically with the
shell on the next version bump.

If a new module loads a large external asset (model weights, WASM binary):
- Keep it out of `SHELL_FILES` in `sw.js`
- The runtime cache handles it on first fetch
- Very large assets (>50MB) should be stored in IndexedDB by the module
  itself, not the Cache API

---

## iOS-specific notes

- "Add to Home Screen" is manual — no automatic install banner on iOS
- Status bar is `black-translucent` (overlays the app) — safe-area insets already applied in CSS
- IndexedDB works correctly once installed as a PWA (fixes the `content://` issue)
- Minimum iOS version for full PWA support: **iOS 16.4+**
