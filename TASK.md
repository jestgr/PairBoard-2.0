# TASK: FAR 117 screenshot — header without the dash (task/far117-ocr-dash) — CURRENT

## Goal
Jeff (11 Nov, from the Android app): a crew-app duty screenshot imported report time and date but no flights.
Phone OCR reads the header "DL2723 : TPA-LGA" as "DL2723: TPALGA"; the FAR 117 reader needed a separator between
the airports. Make it accept the header without the dash, nothing else changed.

## Done when
- [x] parseEzioText reads "DL1234: AAABBB" as AAA→BBB; the other header forms still work; other lines of the
      screen are not taken for flights (tests/far117/ezio_reader.test.js, made-up flights)
- [x] Jeff's real screenshot through the real OCR (headless, served from this branch): 2 legs with local + zulu
      times, block times (not in git)
- [x] npm run check (38) + npm test (58) pass; CACHE_VERSION v2.0.19
- [ ] Jeff tries it in the preview (http://192.168.68.85:5103 → FAR 117 → Screenshot) and OKs; merge + push to main
- [ ] Android app: scripts/sync-web.sh <commit> when Jeff says

# TASK: Discuss the current plan (task/discuss-current-plan) — done

## Goal
Brief (11 Nov): "discuss current plan". A talk, not code: lay out where PairBoard stands and what's next, and
agree with Jeff on the next task(s).

## Where things stand (11 Nov)
- main = origin/main = 5c5c0bc (live, CACHE v2.0.15). Nothing waiting to merge.
- Done lately: PBS bid lines + saved bid (v2.0.12), web bugs 1–8 (v2.0.13), sidebar base (v2.0.14),
  FAR 117 fixes (v2.0.15).
- Still open:
  a. Jeff: quick look on the live site at FAR 117 → Paste Text and the new 30 / 168 Rest page wording.
  b. Android app work (sync web copy, golden.py, "+ If" / report options / Prefer Off on the native Filters
     screen, debug build) — that's in the pairboard-android app, not here.
  c. Saved bids: one saved bid per device for now; named bids / PBS-style Current/Default "later".

## Next step (Jeff, 11 Nov): Calendar day view — "starts" vs "touches"
A user asked to see only the trips that START on a day (for Award requests); today's day view shows every trip
that TOUCHES the day (good for days off). Jeff's design: a switch "Starts this day" / "Touches this day",
default Touches; in Touches the starting trips come first, then a light "Touches this day" divider, then the rest,
each tagged "Day X of Y".

## Done when
- [x] Switch + grouped list + tags built; checks green; browser-checked on the real NYC DEC package
- [x] Jeff tried it in the preview and OK'd (11 Nov) → merged to main 4a6b81d (fast-forward) → Jeff pushes

## Progress
- [x] TASK.md written from the brief and the recent history
- [x] Day view switch (561803b), CACHE v2.0.16. Check: /home/dev/data/pairboard-android/tools/ui_dayview.py —
      Dec 10: Starts 10 / Touches 38, 10 first then divider then 28 tagged; length pills follow the switch;
      choice kept after reload; phone width OK; no page errors. (First run found the switch squeezed to 0 height
      by a long list: fixed with flex-shrink:0.)

## Step 2 (Jeff, 11 Nov): "faded option with a Filtered tag; go ahead with 2 and 3 together"
- [x] A. Day view follows Favs / All Trips / Filtered; filtered trips faded + tagged (3d52dd9)
- [x] B. Trip window filter box: only this trip's filters, one line each, tap for full text, out of the raw text
- [x] C. Tap a greyed day → "Dec 6: removed by …"
- Checks: npm run check (38) + npm test (55, new test for occurrenceRemovalReasons). Browser, real NYC DEC package,
  filters "Avoid departing Sunday" + "Avoid length 5", old (main) vs new, phone width
  (script: /tmp/claude-1000/-home-dev-apps-pairboard/711c1e77-cdd1-4e3a-b963-7d8823c8c3d7/scratchpad/ui_dayfilters.py):
  Dec 6 All: old 26 trips (Sunday starts silently gone) → new 39, 23 faded "Filtered"; Filtered 16 of 39;
  #3375 box: old listed every filter, text past the box → new "Dec 6 — Avoid … Sunday", fits; tap Dec 6 →
  "Dec 6: removed by Avoid Pairings If Departing On Sunday", nothing crossed out; 5-day trip: "All departures —
  Avoid … Length = 5 Days", its days grey (old: shown active). No page errors.
- [x] Jeff tried it (11 Nov): "functionally this is correct"; grey bars hard to tap → every box showing a grey
      bar now explains it on tap (b2f7213, CACHE v2.0.18). Check: #3605 + Avoid Sunday: tap 13 and 14 → "Departure
      Dec 13: removed by …"; tap 2 still crosses out; no errors.
- [x] Jeff: "change the tappable region, then let's push" → merged to main (11 Nov); push was blocked for Claude, Jeff pushes

## Next (Jeff, 11 Nov)
- The day view is getting crowded / unattractive: find a better layout (later).
- Then: work on the Android app and how its UI works (pairboard-android, a separate applab task).

## Open questions
None.

---

# PREVIOUS TASK (merged 5c5c0bc): FAR 117 fixes (task/far117-fixes)

## Goal
Found while building the Android Tools tab (10 Nov); Jeff (11 Nov): "do the three small fixes, instruct me to push".
1. FAR 117 "📝 Paste Text" did nothing (pbOpenFar117PasteModal called ensureModal, which only exists inside the
   filter builder). Now FAR 117's own window #pb-f117-modal, emptied when closed (no stale paste box on the page).
2. Pasted text gave legs without times ("? → ?": no leg markers on the timeline, wrong trailing-DH local time).
   Now the same as a screenshot: duty date + legs' local/Z times + unknown-airport question (shared helpers
   dutyDateFrom / legsFrom / unknownAirports; the screenshot path uses them too, same results).
3. The 30/168 rest check (window.pb168Module) was built "for the combined FAR 117 module" but never shown. Now a
   second FAR 117 page: switch "FDP / LATT | 30 / 168 Rest" at the top, remembered in far117.tab (already in the
   app's reset list); its 30 s clock stops when not shown (FAR 117 module destroy).
Fix 14369ca, CACHE v2.0.15.

## Checks
- npm run check (38) + npm test (54 pass)
- /home/dev/data/pairboard-android/tools/ui_far117.py (old vs new): old = no window + "ensureModal is not defined";
  new = window opens/closes, legs "06:15 L 11:15Z → 08:00 L 13:00Z", date 2026-12-06, unknown QQX asked, leg
  markers on the timeline, 30/168 calculates, page remembered, FDP values kept, no page errors
- Android golden smoke run against this web app: all OK (the phone's bridge still works with it)

## Progress
- [x] fixes + checks
- [x] merged to main on Jeff's word (11 Nov) — Jeff pushes
- [ ] Jeff: quick look on the live site (FAR 117 → Paste Text, and the 30 / 168 Rest page wording; it was never
      shown before, so its texts have not been read by a pilot)

---

# PREVIOUS TASK (merged bd2f3f1): sidebar base / equipment (task/sidebar-base)

## Goal
Jeff (10 Nov, phone): NYC package loaded and NYC in Settings, sidebar still said "Base: ATL".
Cause: `updateSidebarDatablock` read `appState.base` (never set) with fallback 'ATL', and equipment the same way
with '73N'. Fix (328094a): package `baseCityCode` / `aircraftCode` first, then Settings, else '—'; `aircraftCode` now
loaded in `loadAllData`; sidebar redrawn after load and when Settings base/equipment change. CACHE v2.0.14.
Check: `/home/dev/data/pairboard-android/tools/ui_sidebar.py` (new: Base NYC after import and after reload).

## Done when
Jeff OKs the preview → merge to main → Jeff pushes. A package imported before the bug-4 fix may have ATL
saved as its base: re-import it once.

## Progress
- [x] fix + browser check
- [ ] Jeff's OK, merge

---

# PREVIOUS TASK (merged 1e8a368): web bug fixes 1, 2, 4, 5, 6, 7 (task/web-bugs)

## Goal
Fix the small web bugs on Jeff's list (10 Nov 2026), one commit each, then preview → Jeff's OK → merge.
(Bug 3 was fixed by task/pbs-bid-lines, bug 8 too.) Branch from main 59b72ec.

## Done when
Each bug fixed and checked old-vs-new on the real package; `npm run check && npm test` green; CACHE_VERSION
bumped; Jeff OKs the preview; merged to main (Jeff pushes).

## Progress
- [x] 1 Trip calendar day tap saved (c558b97): `pbToggleOccurrence` now calls `pbExcludeOccurrence` /
      `pbRestoreOccurrence` (they save meta 'excludedOccurrences'; cleared with a new package as before).
- [x] 2 Reserve pay table (a2b6fa3): `renderPayTab` built the 3-column grid with several `innerHTML +=`; the browser
      closed the grid after the first write. Now one string, one write.
- [x] 4 Empty base box (e2ddd57): `reverseCityLookup('')` matched every name → ATL. Returns null for < 2 letters, so
      the PDF header's base fills it (processPDF, "PDF header metadata").
- [x] 5 x.60 (4c65d0e): `decToHHMM` (global, 'H.MM'), `dHHMM`, Reserve `decToHHMM` and `decimalToDisplay` ('H:MM')
      round to whole minutes first.
- [x] 6 Calendar Avg Credit (37fc2ab): sums `p.creditHours` (totalPayMins never existed).
- [x] 7 Calendar heat map (fc9d680): `Array.from(dayCountMap.values())` (was `[].slice.call` on an iterator = []).
- [x] Tests `tests/format/time_and_base.test.js` (54 green); CACHE_VERSION v2.0.13.
- Browser check old (main) vs new, real package, private: 
  `/home/dev/apps/pairboard-android/tools/.venv/bin/python /home/dev/data/pairboard-android/tools/ui_webbugs.py`
  Results: base ATL→NYC; Avg Credit 0.0h→19.5h; heat shades all-darkest→3 shades; pay grid 6→18 cells with
  Total inside; tap kept after reload False→True. No page errors.
- [x] Preview OK'd by Jeff, merged to main 1e8a368.
- Then (Jeff's plan for this run): Android — sync web copy, update tools/golden.py, "+ If" / report options /
  Prefer Off order on the native Filters screen, debug build. See /home/dev/apps/homelab-audit/PASSDOWN.md.

## Open questions
None.

---

# PREVIOUS TASK (merged to main 59b72ec): PBS-correct filters and bid report (task/pbs-bid-lines)

## Goal
Filters build the pool of trips Jeff wants (several "If" conditions on one filter, like PBS). The PBS report turns
those filters plus his strategy choices into bid lines in exact PBS syntax and order, ready to type into NAVBLUE.
Bid lines are kept as structured data so a later on-board LLM can read filters + intent and write the lines.
Nothing is merged or pushed without Jeff testing the preview and saying OK.

## Sources (read, not in git)
/home/dev/data/pairboard-rag/lab/clean/: PBS-Reference-Handbook (v4 Feb 2025), navblue-pbs-bidder-guide (21-3),
pbs-basics, pbs-quick-start, pbs-notepad-19-04/05. Test bid (personal, never in git):
/home/dev/data/pairboard-android/test-bids/jeff-dec-2026.txt.

## PBS rules this must follow (from the sources)
- A bid = bid groups (Pairing, Reserve, …) of numbered lines; numbering runs across groups (group header is a
  line). Max 200 lines. System lines ("Award Pairings" at the end of a Pairing group, fallback groups) are not
  numbered and are not typed in.
- Lines are processed top-down. Prefer Off / Avoid remove trips; Award adds; Set Condition shapes the line.
  Recommended order: Prefer Offs, Avoids, Awards — but the user's order is the bid: never reorder lines.
- One line can have several "If" conditions: ALL must match (AND). A comma list inside one condition is OR.
  Award/Avoid properties may take Any/Every.
- Prefer Off dates/days are taken left to right = priority order (keep tap order; never sort).
- Reserve Bid Group allows only: Prefer Off, Set Condition Pattern, Consecutive Days Off, Slide Vacation, Max Above.
- Clear Schedule and Start Next Bid Group (CSSN): optional, only at the end of a Pairing group, disables denial and
  the system Award Pairings; never in the last bid group. Else Start Next (ESN): only on Prefer Off/Avoid/Set
  Condition; ESN lines belong above non-ESN restrictions.
- Set Condition Minimum/Maximum/Mid Credit Window take no value; Minimum Base Layover takes HHH:MM; Set
  Conditions sit above Award lines.
- "Minimum credit off the bid" strategy (Jeff): after each Award line put "Avoid Pairings If Pairing Credit >
  000:01" (a stopper: once in the LCW PBS stops adding trips; if not, denial drops the stopper). Report option, not
  a browsing filter (as a filter it removes everything — allowed, just useless).
- Times/credit print as HHH:MM (000:01, 020:00), clock times HH:MM, "Days" for length.

## Plan — hardest first (each step: tests, CHANGELOG line, own commit; `npm run check && npm test`)
1. [x] Bid document + PBS line renderer: JSON schema {groups:[{type, lines:[{kind, conditions:[{prop, op,
       values, anyEvery}], options:{esn, allOrNothing, limit, …}}]}]} → exact PBS text with numbering; property
       catalog (PBS name, operators, value format, browse-matchable or report-only, e.g. Time Off Before = report
       only); validation warnings from the rules above. Test: Jeff's bid rebuilt as data renders his 26 lines
       character for character.
2. [x] Stacked filters: one filter = kind (Avoid / Award / Prefer Off) + list of If conditions (AND). Builder gets
       "+ If" to add conditions. Matching: Avoid removes trips matching ALL conditions; Award marks trips by the
       first Award filter (in list order) they match (replaces the match-count score). Old single-condition filters
       load unchanged and match exactly as before (tests on the old cases).
3. [x] Filters → report: build the bid document from the filters + strategy options: bid type (Reserve group
       first / Pairing group first / both, Prefer Off copied into each), minimum-credit stoppers, CSSN on/off,
       Set Conditions chosen by the user (Min/Max/Mid Credit Window, Min Base Layover HHH:MM, CDO, Pattern), and
       keeps filter order. Removes the invented lines (Min Credit 75:00 − 2:45/vac day, Max Consecutive Duty Days 4,
       always-CSSN, numbered "Award Pairings"). Fixes the 'preferOff' vs 'prefer-off' mix-up.
4. [x] Prefer Off: keep tap order (dates and days), day names not numbers, no Avoid/Prefer toggle, PBS date text
       ("Dec 25, 2026"), Date Range with Reverse Range Priority.
5. [x] Save + share: filters and report options saved (IndexedDB meta; today they are lost on reload); export /
       import as a versioned file {version, filters, options}; old plain-array files still import. Round-trip
       tests. (Android: the app keeps its own copy until the web saves it.)
6. [x] Smaller PBS fixes: commutable = two Check-In/Check-Out lines (wording was backwards); Duty Legs EVERY with
       = / > checks every duty day; decimal hours print HHH:MM; Landings In ignores DH legs unless "Counting
       Deadhead Legs"; "Prefer …" wording → "Award Pairings If …".
7. [ ] CACHE_VERSION bump, preview for Jeff, his OK → merge; then Android: sync-web, bridge/forms for "+ If",
       report screen copy.
Later (not this task): on-board LLM reads filters + intent → writes the bid document (step 1's schema).

## Progress / handoff (read this first when picking the task up)
- Branch `task/pbs-bid-lines` (local only until Jeff pushes). Never merge/push/deploy; Jeff does, after a preview.
- Check before every commit: `npm run check && npm test` (29 tests green after step 1).
- Each step = one code commit, then one commit for CHANGELOG (with the code commit's hash) + TASK.md + DECISIONS.md.
- **Step 1 done (67bf409)**: `PB.bid` in index.html, the block under the banner `// PBS BID DOCUMENT — bid lines as
  data`, just above `// FILTER BUILDER`. API: `render(bid)` → {rows, count, text, typed, problems}, `validate`,
  `lineText`, `conditionText`, `parse(text)`, `parseLine`, `catalog()`, `isStopper`, `stopper()`, and the
  `PROPS` / `SET_CONDITIONS` tables (each entry: PBS wording, value kind, operators, `browse`, `seen`).
  The schema is written at the top of that block. Tests: `tests/bid/bid_document.test.js` (loads the block with
  `vm`, no browser). Jeff's real 26-line bid parses and prints back exactly, with no problems reported.
- **Step 2 in progress** (stacked filters). Done so far, in index.html:
  - Block `// FILTER MATCHING` (pairings module, just above `applyOccurrenceFilters`): `pairingFilterMatch(p, c)`
    (plain test of one condition: true/false, null = no data, undefined = not a pairing-level type),
    `filterRemovesMatches(f)` (each type's old "where is avoid written" quirk, kept exactly),
    `pairingFilterKeeps(p, f)` (what `applyFilters` now calls), `filterConditions(f)`, `isStackedFilter(f)`,
    `pairingConditionsMatch`, `pairingMatchesAwardFilter(p, f, alive)`, `awardRanks(pairings, filters, survivingMap)`.
  - A stacked filter = a normal filter + `and: [ {type, subtype, params}, … ]`. ALL Ifs must hold. Stacked Avoid
    removes trips matching every If; with a day/date If (pairing-dow, layover-dow, layover-range, carry-out) it
    removes only the departures every If applies to (`occurrencesMatchingAll`, `applyOneOccurrenceFilter`,
    `occurrenceFilterContext`). Prefer Off cannot be stacked. Award never removes.
  - Award marking is now first-match, top-down: `p._awardLine` (1-based place in the list, 0 = none) and
    `p._awardScore` = (number of Award filters − index of the first one matched), 0 = none. Sorting and the
    Android bridge (`out.score`) keep working. ON PURPOSE different from main: Award filters on check-in/out time,
    TAFB and deadhead position now mark trips (the old matcher did not know those types).
  - `PB.bid.linesFromFilter(f)` → {lines, notes} and `PB.bid.conditionsFromFilter(c)`: filter → bid lines.
    ≥/≤ become >/< one minute (or one unit) further out; commutable alone = two Avoid lines; has-dh-position
    has no PBS line (note).
  - Old-vs-new check on the real package (private, outside git):
    `/home/dev/apps/pairboard-android/tools/.venv/bin/python /home/dev/data/pairboard-android/tools/diff_filters.py`
    117 cases; the only differences are the 10 Award cases named above (marked 0 → marked N), as intended.
  - Builder (FILTER BUILDER block): "+ If" on every ladder row except Prefer Off → `pbAddIf(idx)` sets the
    module-level `stackTarget`; the type picker then hides Prefer Off, forms hide the Mode toggle
    (`modeToggle` returns '' and `modeVal('fb-mode')` returns 'award' while stacking), and `commit(f)` pushes
    {type, subtype, params} into that line's `and`. `pbRemoveIf(idx, j)` removes one If. `filterDescription`
    and `ifDescription` (also `window.pbIfDescription`) show every If. `pbOpenFiltersPanel` clears `stackTarget`.
  - Tests: `tests/filters/filter_matching.test.js`, `tests/bid/from_filter.test.js` (41 tests green).
    Browser walk-through (private, outside git): `…/.venv/bin/python /home/dev/data/pairboard-android/tools/ui_stack.py`
  - **Step 2 done (5f73332, engine e35862d).** Not done on purpose, belongs to step 3: `pbGeneratePBSReport` does not
    know about `and` yet, so today's report prints a stacked filter as its first If only. Step 3 replaces the
    report with `PB.bid.linesFromFilter` + `PB.bid.render`. Android: the native filter list shows the stacked
    description (it reads `filterDescription`), but has no "+ If" button until step 7.
- **Step 3 done (a5cc5fe, engine 2e4de75).** `PB.bid.fromFilters(filters, options)` → {bid, notes, options} and
  `PB.bid.defaultOptions()` (options are described in the comment above `defaultOptions`: groups, creditWindow,
  minBaseLayover, stoppers, cssn, consecutiveDaysOff, pattern). Filter order is kept; Set Conditions go under
  the Prefer Off lines the list starts with; a stopper follows every Award line when `stoppers` is on; a Reserve
  group gets only the Prefer Off lines. The report (`pbGeneratePBSReport`, FILTER BUILDER block) draws
  `window.pbBuildBid()`; options live in `_appStateRef.bidOptions` (memory only until step 5) and change through
  `window.pbReportOpt(key, value)`. The old invented lines are gone. The modal keeps the ids the Android bridge
  reads (`#pb-panel-interactive` = one box per bid group + summary last, `#pb-raw-script-area`); checked with
  `/home/dev/data/pairboard-android/tools/ui_report.py`. Android's golden check still expects the old script text
  ("Line 1: Prefer layovers in XXA") → update tools/golden.py at step 7. 47 tests green.
- **Step 4 done (69bfc14).** Prefer Off form has no Mode toggle (always mode 'avoid'); dates are stored ISO
  ('YYYY-MM-DD') in tap order, days as numbers 0-6 in tap order (never sorted: order = PBS priority); range has
  `params.reverse`. Old filters with 'DEC25' dates still match while browsing and print via
  `PB.bid.isoFromKey(key, periodStart)`; `linesFromFilter(f, ctx)` / `fromFilters(filters, options, ctx)` take
  `ctx = {periodStart}`. Ladder shows an "OFF" badge and the PBS line. Walk-through:
  `/home/dev/data/pairboard-android/tools/ui_preferoff.py`. 49 tests green.
  Known: an OLD Prefer Off filter saved with mode 'award' still does nothing while browsing (as on main) but
  prints a Prefer Off line; step 5's import can turn such filters into mode 'avoid'.
- **Step 5 done (6482fc4).** `PB.bid.savedForm(filters, options)` → {app:'pairboard-bid', version:1, filters,
  options}; `PB.bid.readSaved(textOrObject)` → {ok, filters, options, notes, hadOptions} or {ok:false, error}
  (accepts old plain arrays; cleans filters: type required, Prefer Off forced to 'avoid', no Prefer Off as an If;
  options: known keys only). Saved in IndexedDB meta key 'bidFilters' by `saveBidFilters()` (pairings module,
  above `loadAllData`), called at the end of every `applyFilters` and from `pbReportOpt`; writes only when changed
  and only after the saved copy was read. Read back in `loadAllData` (results[16]). Not in PAIRING_META_KEYS on
  purpose: loading a new month keeps the bid. Export file: pairboard-bid.json. Browser check:
  `/home/dev/data/pairboard-android/tools/ui_saved.py` (12 checks). 52 tests green.
- **Step 6 done (005502a), except bug #8 (waits for Jeff's OK).** `filterDescription` now returns the PBS line(s)
  from `PB.bid.linesFromFilter` (same text as the report; commutable shows its two Avoid lines; ≥/≤ shown as PBS
  writes them; HHH:MM; Duty Legs Any/Every as the filter really tests; Departing On / Layover On with day
  names). The old text lives on as `plainDescription` for filters PBS has no line for (deadhead position,
  layover date range: marked "PairBoard only"). Badge and Mode toggle say "Award", not "Prefer" (data-v unchanged,
  so Android's form driving still works). Landings In already counts deadhead legs and now says so. No matching
  changed. Old-vs-new wording list: `/home/dev/data/pairboard-android/tools/descriptions.py`.
- **Bug #8 fixed (221c90e, Jeff OK'd 2026-11-10):** `pbCommitDH` Position=Any always saves value:true. Filters saved
  before keep what they say. Check: `/home/dev/data/pairboard-android/tools/ui_dh.py`.
- **Step 7 in progress:** CACHE_VERSION v2.0.12 committed (289f1fb), all browser checks green, preview
  started 2026-11-10 on port 5103 — waiting for Jeff's OK to merge. Then: bump CACHE_VERSION in sw.js (done); run all browser checks in /home/dev/data/pairboard-android/tools
  (diff_filters, ui_stack, ui_report, ui_preferoff, ui_saved); preview for Jeff
  (`python3 -m http.server 5103 --bind 0.0.0.0` from the repo root → http://192.168.68.85:5103, stop it after);
  Jeff's OK → merge to main (Jeff pushes). Then Android: sync web copy, update tools/golden.py report/description
  expectations, "+ If" + report options in the native Filters screen.
  - Known web bug to keep as is until step 6 (#8 on Jeff's reminder list): Deadhead builder, Mode=Avoid +
    Position=Any saves {has-dh, avoid, value:false} = keeps only trips WITH a deadhead.
- Wordings marked `seen: 'assumed'` in PROPS are guesses by analogy — ask Jeff to check them in NAVBLUE when he
  next has it open (Check-Out Station, TAFB, Layover Duration, Layover On, Deadhead Legs, Total Legs In Pairing,
  Mid Credit Window, Consecutive Days Off, Reverse Range Priority text, "Between A And B").

## Open questions
1. Saved bids: one saved set + export/import for now; PBS-style Current/Default can come later. (Assumed.)
