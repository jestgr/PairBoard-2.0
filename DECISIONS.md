# Decisions

## 2026-10-23 — check script design (task/check-script)
- **Parse with `vm.Script` (compile, never run)** with `lineOffset`, so errors report the real index.html line. Alt: `node --check` on extracted temp files — needs temp files and line remapping.
- **Find referenced files by scanning for quoted `./…` strings** in index.html and sw.js, plus relative `src`/`href` attributes and manifest icon `src`. Catches vendor/icons paths used in JS. HTML comments and CSS comments in `<style>` are ignored (the commented-out `./fonts/*` @font-face hook would otherwise fail). Alt: a hand-kept list of expected files — goes stale.
- **`type="module"` inline scripts fail the check** (none exist today) rather than silently skipping, so a new one gets noticed. JSON script types are checked with `JSON.parse`.
- **Script exports `runChecks(dir)` and takes an optional app dir argument**, so tests can run it on temp fixture folders.
- **Tests live in `tests/check/`, not directly in `tests/`.** `npm test` runs `node --test tests/**/*.test.js` through `sh`, where `**` acts like `*`, so only files one folder deep match. On Node 20 a top-level `tests/x.test.js` would never run. I left package.json unchanged. Alt: change the script to `node --test tests/`.
- **Test fixtures are temp folders** (`os.tmpdir()`), removed after the run. Tests run the real CLI as well as `runChecks()`, so exit codes and output get tested too.

## 2026-10-23 — manifest link (task/manifest-link)
- **`href="manifest.json"` (relative), placed right after `<title>`.** GitHub Pages serves the app from `/PairBoard-2.0/`, so `/manifest.json` would 404. The existing CSP `default-src 'self'` already allows it (no `manifest-src` needed). Alt: `./manifest.json` — same effect.
- **Check accepts only `manifest.json` or `./manifest.json`, inside `<head>`, not in an HTML comment**; attribute order and quote style don't matter. Absolute or other paths fail. Alt: only check the link exists — would miss the `/manifest.json` mistake.
- **CACHE_VERSION v2.0.9 → v2.0.10** (patch bump, same scheme as before).
- **Did not add the maskable icon to the "App Shell & Icons" offline-pack list in index.html (~line 3105)**, which mirrors sw.js `SHELL_FILES`. The brief limits changes to the manifest link; asked Jeff instead.
