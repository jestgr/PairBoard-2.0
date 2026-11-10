# Changelog

- 2026-10-23 — add `scripts/check_syntax.js` (`npm run check`): parses inline scripts + sw.js, validates manifest.json, checks referenced files and CACHE_VERSION (task/check-script) — roll back: git revert 6f78dd2
- 2026-10-23 — add `node --test` tests for the check script in `tests/check/` (`npm test`) (task/check-script) — roll back: git revert 94e741e
- 2026-10-23 — DEPLOY.md: add "Checks" section (run `npm run check && npm test` before pushing) (task/check-script) — roll back: git revert c8def56
- 2026-10-23 — index.html links `manifest.json`; sw.js caches `icons/icon-maskable-512.png`; CACHE_VERSION v2.0.9 → v2.0.10 (task/manifest-link) — roll back: git revert 6ee3b55
- 2026-10-23 — check script fails if index.html `<head>` has no relative `<link rel="manifest">`; 4 new tests (task/manifest-link) — roll back: git revert 7932198
- 2026-11-09 — `PB.reserve`: the Reserve module's own state and functions by name, for the Android app (screen unchanged); tests in `tests/reserve/`; CACHE_VERSION v2.0.10 → v2.0.11 (task/reserve-api) — roll back: git revert 28c8d15
- 2026-11-10 — `PB.bid`: a PBS bid as data (groups, lines, stacked Ifs), printed in exact PBS syntax with numbering, rule checks, and a reader for typed bids; no screen uses it yet; tests in `tests/bid/` (task/pbs-bid-lines) — roll back: git revert 67bf409
