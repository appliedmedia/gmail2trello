# Wave 2: Race Condition Fixes -- Orchestration

**Date**: 2026-04-15
**Status**: TODO
**Branch**: `fix/add-to-card`
**Depends on**: Waves 0-1 (done), analysis in
[SwimlanesRaceConditionAnalysis](<2026-03-29_info_SwimlanesRaceConditionAnalysis.md>)
and [TargetedRaceConditionFixes](<2026-03-29_info_TargetedRaceConditionFixes.md>)

## Goal

Ship three small, independent fixes (~55 lines total) across three existing files
to eliminate RACE-2, RACE-3, RACE-5, and the uncoordinated board-change cascade.
No new classes. No orchestrator. These are prerequisites for Wave 3 (add-to-card).

## Lanes (fully parallel)

All three lanes are independent: different files, different concerns, no shared
state. They can be implemented and tested simultaneously.

* **[Lane 1: Version Counter](<2026-04-15_plan_todo_Wave2RaceConditionFixes_Lane1-VersionCounter.md>)**
  * File: `chrome_manifest_v3/class_trel.js`
  * Fixes: RACE-2 (stale board data), RACE-3 (stale cards)
  * ~20 lines new code
  * Tests: `tests/cucumber/features/trel.feature`
* **[Lane 2: Submit Guard](<2026-04-15_plan_todo_Wave2RaceConditionFixes_Lane2-SubmitGuard.md>)**
  * File: `chrome_manifest_v3/views/class_popupForm.js`
  * Fixes: RACE-5 (double submit)
  * ~8 lines new code
  * Tests: `tests/cucumber/features/popupForm.feature`
* **[Lane 3: Cascade Tracker](<2026-04-15_plan_todo_Wave2RaceConditionFixes_Lane3-CascadeTracker.md>)**
  * File: `chrome_manifest_v3/class_model.js`
  * Fixes: uncoordinated board-change cascade (amplifies RACE-2 and RACE-4)
  * ~30 lines new code
  * Tests: `tests/cucumber/features/model.feature`

## Merge order

Lanes merge independently to `fix/add-to-card`. No ordering constraints.
Integration test at the end confirms all three work together.

## Integration smoke test (post-merge)

After all three lanes land, run the full Cucumber suite and verify:

* Rapid board switch: only latest board's lists/labels/members populate the form
* Rapid list switch: only latest list's cards populate the dropdown
* Double-click submit: only one card created
* Board cascade: UI updates only after all three API responses arrive for same board
* Normal happy path still works: select board, list, card, submit

## Sequencing with Wave 3

Wave 3 (add-to-card) depends on all three fixes being in place:

* Version counter ensures card dropdown is trustworthy (Lane 1)
* Submit guard prevents duplicate comments on existing cards (Lane 2)
* Cascade tracker ensures consistent state at submit time (Lane 3)

## Accepted risks (not in scope)

Per [TargetedRaceConditionFixes](<2026-03-29_info_TargetedRaceConditionFixes.md>)
section 4:

* RACE-1 (hydration timing): low real-world frequency, 2-line fix if needed later
* RACE-6 (navigation mid-submit): card created, jQuery handles detached DOM
* RACE-8 (storage conflicts): low severity, requires exact timing + reload
* RACE-9 (persist vs defaults): mitigated by fast `classAppStateLoaded`
