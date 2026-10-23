# Changelog

- 2026-10-23 — add `scripts/check_syntax.js` (`npm run check`): parses inline scripts + sw.js, validates manifest.json, checks referenced files and CACHE_VERSION (task/check-script) — roll back: git revert 6f78dd2
- 2026-10-23 — add `node --test` tests for the check script in `tests/check/` (`npm test`) (task/check-script) — roll back: git revert 94e741e
- 2026-10-23 — DEPLOY.md: add "Checks" section (run `npm run check && npm test` before pushing) (task/check-script) — roll back: git revert <this commit>
