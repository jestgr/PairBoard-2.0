# TASK: basic check script + first tests (task/check-script)

## Goal
`npm run check` and `npm test` (already defined in package.json) actually work, so every future
PairBoard change can be checked automatically before it ships.

## Done when
- [x] `scripts/check_syntax.js` extracts every inline `<script>` from index.html (plus `sw.js`), checks it parses, prints OK / error with line number, exits non-zero on failure
- [x] It also checks: `manifest.json` is valid JSON, files referenced by index.html / sw.js / manifest exist, `sw.js` has a `CACHE_VERSION`
- [x] `tests/` has `node --test` tests for the check script (passing case + broken-script case, plus sw.js / CACHE_VERSION / manifest / missing file / comments)
- [x] `npm run check` and `npm test` pass on current code (Node 20.19 and `with-node22` 22.23)
- [x] Preview still serves at http://192.168.68.85:5103: index, sw.js, manifest, icons and vendor all return 200; server stopped. HTTP only, not opened in a browser.
- [x] Short "Checks" section in DEPLOY.md

## Progress
- [x] Read brief, wrote TASK.md
- [x] check_syntax.js written; verified the line number on a deliberately broken copy (error at line 5000 reported as line 5000)
- [x] Tests in `tests/check/` (7 tests), pass on Node 20 and 22
- [x] Preview checked, DEPLOY.md "Checks" section added

## Open questions
1. index.html has **no `<link rel="manifest" href="manifest.json">`** in `<head>`, so browsers may not use manifest.json (name, icons, standalone) when installing. This was not changed because the brief keeps index.html as it is. Add it in a follow-up task?
2. `icons/icon-maskable-512.png` is in manifest.json but not in sw.js `SHELL_FILES`, so it isn't cached for offline. That's probably fine. Was it intentional?
3. What phase is PairBoard in now? (from the applab notes)
4. The first two test runs left 14 empty-ish `/tmp/pb-check-*` folders. Cleanup is fixed now, but I wasn't allowed to delete the old ones. You can remove them with `rm -rf /tmp/pb-check-*`.
