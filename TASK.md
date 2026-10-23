# TASK: basic check script + first tests (task/check-script)

## Goal
`npm run check` and `npm test` (already defined in package.json) actually work, so every future
PairBoard change can be checked automatically before it ships.

## Done when
- [ ] `scripts/check_syntax.js` extracts every inline `<script>` from index.html (plus `sw.js`), checks it parses, prints OK / error with line number, exits non-zero on failure
- [ ] It also checks: `manifest.json` is valid JSON, files referenced by index.html / sw.js / manifest exist, `sw.js` has a `CACHE_VERSION`
- [ ] `tests/` has `node --test` tests for the check script (passing case + broken-script case)
- [ ] `npm run check` and `npm test` pass on current code (plain `node` and `with-node22 node`)
- [ ] Preview still loads at http://192.168.68.85:5103 (server stopped afterwards)
- [ ] Short "Checks" section in DEPLOY.md

## Progress
- [x] Read brief, wrote TASK.md

## Open questions
