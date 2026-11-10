# TASK: PB.reserve — let other code read the Reserve numbers (task/reserve-api)

## Goal
Jeff's Android app (PairBoardDev) can show the same Reserve numbers as this app, by calling this app's own
Reserve code. For people using the web app nothing changes.

## Done when
- [x] `PB.reserve` names the Reserve module's own state and functions (Structure, X-Day Sim, Pay, RAW, category card)
- [x] No existing line changed: the only edit in index.html is the added block at the end of the Reserve module
- [x] Reserve screen is identical with and without the change (all 4 tabs compared in headless Chromium, with a
      vacation count entered and two X-days placed: same HTML, no page errors)
- [x] Tests: `tests/reserve/reserve_api.test.js` runs the module out of index.html and checks the doorway and
      Structure numbers against the proration tables (7 tests)
- [x] `CACHE_VERSION` bumped (v2.0.10 → v2.0.11), `npm run check && npm test` pass (Node 20: 38 checks, 18 tests)
- [ ] Jeff: Reserve screen in the preview looks and works as before → OK to merge

## Progress
- [x] Read the Reserve module; chose "name what is there" over splitting calculation from drawing
- [x] Added `PB.reserve`, tests, cache bump
- [x] Checked off-screen use (what the Android app will do): Structure numbers, Pay results, RAW score and the
      X-Day Sim (place days, rule check) all work through `PB.reserve` without opening the Reserve screen

## Open questions
1. Res Coverage already has `PB.resCoverage` (calculateDayMargin, parseCoverageText, evaluateTripTrade, getState),
   so it needed nothing here. Say if the Android app should get more of it later.
