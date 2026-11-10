# TASK: PBS-correct filters and bid report (task/pbs-bid-lines)

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
2. [ ] Stacked filters: one filter = kind (Avoid / Award / Prefer Off) + list of If conditions (AND). Builder gets
       "+ If" to add conditions. Matching: Avoid removes trips matching ALL conditions; Award marks trips by the
       first Award filter (in list order) they match (replaces the match-count score). Old single-condition filters
       load unchanged and match exactly as before (tests on the old cases).
3. [ ] Filters → report: build the bid document from the filters + strategy options: bid type (Reserve group
       first / Pairing group first / both, Prefer Off copied into each), minimum-credit stoppers, CSSN on/off,
       Set Conditions chosen by the user (Min/Max/Mid Credit Window, Min Base Layover HHH:MM, CDO, Pattern), and
       keeps filter order. Removes the invented lines (Min Credit 75:00 − 2:45/vac day, Max Consecutive Duty Days 4,
       always-CSSN, numbered "Award Pairings"). Fixes the 'preferOff' vs 'prefer-off' mix-up.
4. [ ] Prefer Off: keep tap order (dates and days), day names not numbers, no Avoid/Prefer toggle, PBS date text
       ("Dec 25, 2026"), Date Range with Reverse Range Priority.
5. [ ] Save + share: filters and report options saved (IndexedDB meta; today they are lost on reload); export /
       import as a versioned file {version, filters, options}; old plain-array files still import. Round-trip
       tests. (Android: the app keeps its own copy until the web saves it.)
6. [ ] Smaller PBS fixes: commutable = two Check-In/Check-Out lines (wording was backwards); Duty Legs EVERY with
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
- **Next = step 3** (filters → PBS report). Start in `pbGeneratePBSReport` (FILTER BUILDER block).
  - Known web bug to keep as is until step 6 (#8 on Jeff's reminder list): Deadhead builder, Mode=Avoid +
    Position=Any saves {has-dh, avoid, value:false} = keeps only trips WITH a deadhead.
- Wordings marked `seen: 'assumed'` in PROPS are guesses by analogy — ask Jeff to check them in NAVBLUE when he
  next has it open (Check-Out Station, TAFB, Layover Duration, Layover On, Deadhead Legs, Total Legs In Pairing,
  Mid Credit Window, Consecutive Days Off, Reverse Range Priority text, "Between A And B").

## Open questions
1. Saved bids: one saved set + export/import for now; PBS-style Current/Default can come later. (Assumed.)
