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

## 2026-11-09 — PB.reserve (task/reserve-api)
- **Name what is there; don't restructure.** The Pay and RAW calculations read their inputs from the page and write the results back into it (`calcPayTab(body)`, `calcRawTab(body, s)`). Alt: split each into "calculate" and "draw" so a caller gets plain numbers — cleaner, but it rewrites calculation code that was tuned over many sessions, for no gain to web users. Instead `PB.reserve` lists the existing functions and state, like `PB.pairings` and `PB.resCoverage` already do. A caller builds a tab into an element that is not on the page (`renderPayTab(div)`), fills the inputs, calls `calcPayTab(div)` and reads the result — the same code path as the screen, so the same numbers.
- **One added block, at the end of the Reserve module.** No existing line edited. Checked by comparing the Reserve screen's HTML (4 tabs, with inputs) on `main` and on this branch: identical.
- **`state` is the module's live state** (days placed, absence-day counts, last calc), not a copy: a caller that sets a vacation count sees the same thing the Structure tab would, and the other way round. Alt: getters returning copies — then the two could disagree.
- **`renderStructureBody` still looks up `#res-structure-body` on the page** (unchanged). A caller that wants the Structure rows without the screen uses `calcReserveStructure(s)`, which returns the numbers directly.
- **Tests run the real module out of index.html** in a Node sandbox with a stand-in `PB` (no browser, no new dependency). Expected X-day / on-call / short-call numbers were read by hand from the proration tables, not copied from the code's output.
- **CACHE_VERSION v2.0.10 → v2.0.11** (index.html changed, so installed copies need to refresh).
