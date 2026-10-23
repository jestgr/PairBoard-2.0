# TASK: link the manifest + cache the maskable icon (task/manifest-link)

## Goal
Phones pick up PairBoard's name and icons when installing it, and all icons work offline.

## Done when
- [ ] index.html `<head>` has `<link rel="manifest" href="manifest.json">` (path that works on GitHub Pages)
- [ ] sw.js caches `icons/icon-maskable-512.png` for offline use
- [ ] `CACHE_VERSION` in sw.js bumped (this change ships)
- [ ] `scripts/check_syntax.js` also fails if the manifest link is missing, with a test for that
- [ ] `npm run check && npm test` pass; preview at http://192.168.68.85:5103 loads, manifest is fetched (server stopped)

## Progress
- [x] Read brief, wrote TASK.md

## Open questions
