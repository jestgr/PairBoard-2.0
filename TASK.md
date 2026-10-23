# TASK: link the manifest + cache the maskable icon (task/manifest-link)

## Goal
Phones pick up PairBoard's name and icons when installing it, and all icons work offline.

## Done when
- [x] index.html `<head>` has `<link rel="manifest" href="manifest.json">` (path that works on GitHub Pages)
- [x] sw.js caches `icons/icon-maskable-512.png` for offline use
- [x] `CACHE_VERSION` in sw.js bumped (this change ships)
- [x] `scripts/check_syntax.js` also fails if the manifest link is missing, with a test for that
- [x] `npm run check && npm test` pass (Node 20 + 22, 11 tests); preview at http://192.168.68.85:5103 loads, manifest is fetched (server stopped) — checked over HTTP: page has the link, manifest.json + all 4 icons return 200. No browser here, so not checked in a real browser/install.

## Progress
- [x] Read brief, wrote TASK.md
- [x] Manifest link added, maskable icon in SHELL_FILES, CACHE_VERSION v2.0.10
- [x] check_syntax.js manifest-link check + 4 tests (missing, commented out, absolute path, alt attribute order); one old test's expected line number moved 5 → 6 because the fixture got one line longer
- [x] Preview checked over HTTP, server stopped

## Open questions
1. index.html has a second copy of the shell file list (offline-pack "PairBoard App Shell & Icons", ~line 3105). It still lacks `icon-maskable-512.png`. Add it there too, so the two lists match? (left alone: outside the brief)
2. index.html has no `<link rel="apple-touch-icon">`. iPhones usually find `/apple-touch-icon.png` at the site root, but on GitHub Pages the icon lives at `/PairBoard-2.0/icons/`, so iOS home-screen icons may be a screenshot instead. Add the link in a follow-up task?
