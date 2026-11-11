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

## 2026-11-10 — Prefer Off (task/pbs-bid-lines, step 4)
- Tap order is the priority (PBS reads Prefer Off dates left to right), so dates and days are never sorted.
- New filters store dates as 'YYYY-MM-DD' (the old 'DEC25' key had no year and printed wrong across a year end);
  old filters keep working, the year is taken from the bid period.
- No Avoid/Prefer toggle: a Prefer Off "Prefer" filter never did anything.

## 2026-11-10 — Saving the bid (task/pbs-bid-lines, step 5)
- One saved bid (filters + report options) per device, in IndexedDB meta 'bidFilters'. Several named bids /
  PBS-style Current/Default can come later (open question 1).
- Loading a new bid package keeps the saved bid (a default bid is meant to be reused); "Clear all" empties it.
- Export writes {app:'pairboard-bid', version:1, filters, options}. Import refuses files from a newer version
  and tells what it left out of a damaged file.

## 2026-11-10 — One wording (task/pbs-bid-lines, step 6)
- The filter list shows each filter as the PBS line it becomes, so what you see is what you type in PBS.
- Filters PBS cannot express (deadhead position, layover date range) keep a plain description marked
  "PairBoard only".
- Bug #8 (Deadhead Avoid + Any) is not changed without Jeff's OK because it changes which trips are listed.

## 2026-11-10 — Web bug fixes (task/web-bugs)
- Calendar Avg Credit uses each trip's credit hours (`creditHours`), the same number the trip cards show.
- An empty base box means "not given": the base then comes from the PDF header, never from a guess.
- Crossed-out departures stay tied to the bid package: loading a new package clears them (as before).

## 2026-11-11 — FAR 117 fixes (task/far117-fixes)
- FAR 117's Paste window has its own id (#pb-f117-modal), not the filter builder's #pb-fb-modal: two modules
  making the same id would make getElementById find the wrong one.
- Pasted duty text is handled exactly like a screenshot's text (same date, time and time-zone steps), so both
  give the same legs.
- 30/168 Rest is a page inside FAR 117 (as its code comment intended), not a new sidebar item.


## 2026-11-11 — Calendar day view switch (task/discuss-current-plan)
- Jeff's design (user request): switch "Starts this day" / "Touches this day", default Touches. Touches lists the
  trips starting that day first, then a light "Touches this day" divider, then the rest. There was no deliberate
  sort before (package order), so package order is kept inside each group.
- A trip that starts this day AND is still flying from an earlier start counts as starting here (it can be
  awarded on this day). Others get a "Day X of Y" tag (the earliest matching day).
- The trip-length pills count the trips the switch shows. The pre-award / Avoid warning still looks at every trip
  flying that day (a day off removes all of them).
- The choice is kept in localStorage 'pb.calendar.dayView' (a view preference, not in the reset list).
- Existing drawer class names are unchanged (the Android bridge may read them).
- Alternative considered: a sort only, or two sections with no switch; Jeff chose the combination.
