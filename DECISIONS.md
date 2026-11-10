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

## 2026-11-10 — PBS bid lines (task/pbs-bid-lines)
- **The bid is data first (`PB.bid`), text second.** One schema (groups → lines → If conditions) is printed by one renderer. The filter list, the report and (later) the on-board model all produce this data; none of them writes PBS text itself. Alt: fix the wording inside `filterDescription` — keeps one condition per line and three places that each print PBS text.
- **Nothing is sorted or reordered**: group order, line order and the order of Prefer Off dates are the bid (PBS reads top-down, left to right).
- **Wording is taken from a real submitted bid where there is one, else from handbook examples, else by analogy** — each property says which (`seen: bid | handbook | assumed`). "Pairing Credit" (real bid) wins over the handbook's "Pairing Total Credit"; "N Days" is printed even for 1 ("1 Days"), as PBS does.
- **Only `<`, `>`, `=`, Between** — PBS has no ≤ / ≥. Times are minutes inside (or 'H:MM' text in), printed HH:MM (clock) or HHH:MM (duration).
- **A reader (`PB.bid.parse`) as well as a printer.** A line is accepted as data only if it prints back exactly as typed; otherwise it is kept word for word as a `raw` line with a warning. This is what lets a real bid be the test without putting it in git, and lets a bid be pasted in later.
- **System lines are shown, never numbered**: "Award Pairings" closes a Pairing group unless the group ends with Clear Schedule and Start Next Bid Group.
- **A stopper ("Avoid Pairings If Pairing Credit > 000:01") is a known shape** (`isStopper`): below an Award line it is the point, so it gets no "Avoid below Award" warning.
- **Personal bids stay out of git.** Tests use made-up bids; the real-bid test reads `PB_TEST_BID` (or the private path) and skips when the file is absent.

## 2026-11-10 — Stacked filters (task/pbs-bid-lines, step 2)
- A stacked filter is the old filter plus `and: [conditions]`. Old saved/exported filters have no `and` and behave
  exactly as before (checked old-vs-new on a real package: 117 cases).
- Extra Ifs have no mode: the line's Avoid/Award rules, each If is a plain "the trip has this" test.
- A stacked Avoid with a day/date If removes only the matching departures, like PBS, not the whole trip.
- Award marking changed from "how many Award filters match" to "the first Award filter that matches", because PBS
  reads lines top-down. Side effect accepted: Award filters on check-in/out time, TAFB and deadhead position now
  mark trips; before they silently did nothing.
- PBS has no ≥ / ≤: a filter "credit ≥ 20" is written "Pairing Credit > 019:59".

## 2026-11-10 — PBS report from filters (task/pbs-bid-lines, step 3)
- The report prints only what the user asked for: the filters in their order plus the options they switched on.
  Removed: "Set Condition Minimum Credit 75:00 minus vacation", "Max Consecutive Duty Days 4", the always-on
  Clear Schedule, the numbered "Award Pairings", and the re-sorting of Avoid lines above Award lines.
- Stoppers are a report option ("Stop at minimum credit"), not a filter: one after every Award line. Switching it
  on also selects Minimum Credit Window if no credit line was chosen.
- Prefer Off is copied into every bid group; a Reserve group gets nothing else from the filters.
- A filter PBS has no line for is left out of the bid and listed under "Check before you bid".
- The modal kept its element ids so the Android bridge keeps reading it.
