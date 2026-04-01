# Gmail-2-Trello: Execution Swim Lanes

**Date**: 2026-04-01
**Status**: Active
**Depends on**: `2026-03-29_info_TargetedRaceConditionFixes.md` (design), `2026-03-29_info_SwimlanesRaceConditionAnalysis.md` (analysis)
**Purpose**: Parallel execution plan for all remaining work. Each lane is assigned to an independent agent working in a git worktree. No lane touches another lane's files.

---

## 0. Current State

| Item | Status |
|------|--------|
| Gmail.js integration | DONE (PR #136) -- RACE-7 eliminated |
| Cucumber test suite | DONE -- 625 scenarios, 2345 steps |
| Race condition fixes | NOT STARTED -- RACE-2/3/5 and board cascade |
| Add-to-card feature | NOT STARTED -- blocked on race fixes in trel.js and popupForm.js |
| Ship prep | NOT STARTED -- blocked on add-to-card |

---

## 1. Dependency Graph

```
ROUND 1 (fully parallel -- zero shared files)
  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
  │ LANE A           │  │ LANE B           │  │ LANE C           │
  │ Version Counter  │  │ Submit Guard     │  │ Board Cascade    │
  │                  │  │                  │  │                  │
  │ FILES:           │  │ FILES:           │  │ FILES:           │
  │  class_trel.js   │  │  class_popupForm │  │  class_model.js  │
  │  trel.feature    │  │  popupForm.feat  │  │  model.feature   │
  │  trel.steps.js   │  │  popupForm.steps │  │  model.steps.js  │
  │                  │  │                  │  │                  │
  │ FIXES:           │  │ FIXES:           │  │ FIXES:           │
  │  RACE-2 (stale   │  │  RACE-5 (double  │  │  Board-change    │
  │   lists/cards)   │  │   submit)        │  │  cascade         │
  │  RACE-3 (stale   │  │                  │  │  (RACE-4 partial)│
  │   cards on rapid │  │                  │  │                  │
  │   list switch)   │  │                  │  │                  │
  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
           │                     │                      │
           └──────────┬──────────┘                      │
                      │                                 │
                 MERGE GATE 1                           │
                 (A + B landed)                         │
                      │                                 │
                      ▼                                 │
  ┌───────────────────────────────────┐                 │
  │ LANE D                            │                 │
  │ Add-to-Card Feature               │◄────────────────┘
  │                                   │   MERGE GATE 2
  │ FILES:                            │   (A + B + C landed)
  │  class_trel.js (addToExisting*)   │
  │  class_popupForm.js (mode/submit) │
  │  class_popupView.js (modifier key)│
  │  popupView.html (remove dropdown) │
  │  style.css (mode indicator)       │
  │  trel.feature + steps (new)       │
  │  popupForm.feature + steps (new)  │
  │  popupView.feature + steps (new)  │
  │  integration.feature (new)        │
  └────────────────┬──────────────────┘
                   │
              MERGE GATE 3
              (D landed, all tests pass)
                   │
                   ▼
  ┌───────────────────────────────────┐
  │ LANE E                            │
  │ Ship Prep                         │
  │                                   │
  │ FILES:                            │
  │  manifest.json (version bump)     │
  │  CHANGES.md                       │
  │  Manual test matrix               │
  └───────────────────────────────────┘
```

---

## 2. Lane Details

### LANE A: Version Counter in class_trel.js

**Agent**: Worktree branch `fix/version-counter`
**Fixes**: RACE-2 (stale lists/labels/members), RACE-3 (stale cards on rapid list switch)
**Effort**: ~20 lines of production code + ~8 test scenarios

**Files touched** (exclusive to this lane):
- `chrome_manifest_v3/class_trel.js`
- `tests/cucumber/features/trel.feature`
- `tests/cucumber/step_definitions/trel.steps.js`

**Implementation**:
1. Add `_requestVersions` map to Trel constructor: `{ lists: 0, cards: 0, labels: 0, members: 0 }`
2. Add `_nextVersion(category)` -- increments and returns
3. Add `_isCurrentVersion(category, version)` -- checks match
4. Update `getLists()`, `getCards()`, `getLabels()`, `getMembers()` to capture version before API call
5. Update `getLists_success()`, `getCards_success()`, `getLabels_success()`, `getMembers_success()` to discard if version is stale

**Test scenarios to add**:
```gherkin
Scenario: _nextVersion increments counter for category
Scenario: _isCurrentVersion true for latest version
Scenario: _isCurrentVersion false for stale version
Scenario: independent categories do not affect each other
Scenario: getLists_success with current version updates temp.lists
Scenario: getLists_success with stale version discards response
Scenario: getCards_success with stale version discards response
Scenario: rapid getLists -- second call invalidates first response
```

**Acceptance**: All 625 existing scenarios still pass + 8 new scenarios pass.

---

### LANE B: Submit Guard in class_popupForm.js

**Agent**: Worktree branch `fix/submit-guard`
**Fixes**: RACE-5 (double submit creates duplicate cards)
**Effort**: ~5 lines of production code + ~5 test scenarios

**Files touched** (exclusive to this lane):
- `chrome_manifest_v3/views/class_popupForm.js`
- `tests/cucumber/features/popupForm.feature`
- `tests/cucumber/step_definitions/popupForm.steps.js`

**Implementation**:
1. Add `this._submitting = false` to PopupForm constructor
2. At top of `handleSubmit()`: `if (this._submitting) return;` then `this._submitting = true;`
3. In success callback path: `this._submitting = false;`
4. In failure callback path: `this._submitting = false;`

**Test scenarios to add**:
```gherkin
Scenario: handleSubmit sets _submitting to true
Scenario: second handleSubmit while _submitting is blocked
Scenario: _submitting resets to false on createCard_success
Scenario: _submitting resets to false on createCard_failure
Scenario: handleSubmit works again after success callback
```

**Acceptance**: All 625 existing scenarios still pass + 5 new scenarios pass.

---

### LANE C: Board Cascade Tracker in class_model.js

**Agent**: Worktree branch `fix/board-cascade`
**Fixes**: Board-change cascade (uncoordinated parallel API calls), partial RACE-4 (inconsistent state on submit)
**Effort**: ~30 lines of production code + ~7 test scenarios

**Files touched** (exclusive to this lane):
- `chrome_manifest_v3/class_model.js`
- `tests/cucumber/features/model.feature`
- `tests/cucumber/step_definitions/model.steps.js`

**Implementation**:
1. Add `this._boardLoadPending = null` and `this._boardLoadId = null` to Model constructor
2. In `handleBoardChanged()`: set `_boardLoadId`, create `_boardLoadPending = new Set(['lists', 'labels', 'members'])`, clear stale temp arrays
3. Add `_completeBoardLoadPart(part, boardId)`: ignore if boardId !== `_boardLoadId`, delete from Set, if empty emit `boardDataReady`
4. Add `_onBoardLoadComplete()`: emit `boardDataReady` event
5. Wire existing success listeners to call `_completeBoardLoadPart()`

**Test scenarios to add**:
```gherkin
Scenario: handleBoardChanged sets _boardLoadPending with 3 parts
Scenario: handleBoardChanged clears stale temp arrays
Scenario: _completeBoardLoadPart tracks individual completion
Scenario: boardDataReady fires when all 3 parts complete
Scenario: boardDataReady does NOT fire when only 2 of 3 complete
Scenario: rapid board switch resets tracking for new board
Scenario: completion of old board load parts after switch is ignored
```

**Acceptance**: All 625 existing scenarios still pass + 7 new scenarios pass.

---

### LANE D: Add-to-Card Feature

**Agent**: Worktree branch `feature/add-to-card`
**Blocks**: MERGE GATE 2 -- Lanes A + B + C must be merged to main first
**Effort**: ~80 lines production code + ~20 test scenarios
**Reference**: `docs/2025-11-08_todo_AddToCardAfterCardRefactor.md`

**Files touched**:
- `chrome_manifest_v3/class_trel.js` (add `addToExistingCard()`, `updateCardExtras()`, `createNewCard()`, refactor `createCard()`)
- `chrome_manifest_v3/views/class_popupForm.js` (add `insertMode` to submit data)
- `chrome_manifest_v3/views/class_popupView.js` (modifier key detection on card dropdown)
- `chrome_manifest_v3/views/popupView.html` (remove `g2tPosition` dropdown)
- `chrome_manifest_v3/style.css` (remove `#g2tPosition` rules, add mode indicator)
- `tests/cucumber/features/trel.feature` (add-to-card scenarios)
- `tests/cucumber/features/popupForm.feature` (mode switching scenarios)
- `tests/cucumber/features/popupView.feature` (modifier key scenarios)
- `tests/cucumber/features/integration.feature` (end-to-end mode scenarios)
- Corresponding step definition files

**Why it depends on A + B + C**:
- Touches `class_trel.js` (Lane A also touches it -- version counter must land first)
- Touches `class_popupForm.js` (Lane B also touches it -- submit guard must land first)
- The `addToExistingCard()` flow must go through the version counter and submit guard

**Implementation** (see `2026-03-29_info_TargetedRaceConditionFixes.md` sections 5.1-5.5 for full detail):
1. Add `cardInsertMode` to `app.temp` (default: `'to'`)
2. Modifier key detection: mousedown on card dropdown checks `utils.modKey()`, sets mode
3. Visual indicator: `data-mode` attribute on combobox, CSS styling
4. Refactor `createCard()` to branch on mode: TO -> `addToExistingCard()`, AFTER -> `createNewCard()`
5. `addToExistingCard()`: POST comment to `cards/{id}/actions/comments`, then `updateCardExtras()`
6. `createNewCard()`: POST card with position relative to selected card
7. Remove `g2tPosition` dropdown from HTML, CSS, JS handlers

**Test scenarios to add**:
```gherkin
# trel.feature
Scenario: insertMode "to" with valid cardId calls addToExistingCard
Scenario: insertMode "to" with cardId "-1" creates new card
Scenario: insertMode "after" with valid cardId creates new card with position
Scenario: addToExistingCard posts comment to card
Scenario: addToExistingCard calls updateCardExtras after success
Scenario: createNewCard positions after selected card
Scenario: createNewCard positions at top when no card selected
Scenario: updateCardExtras adds members not already on card
Scenario: updateCardExtras adds labels not already on card
Scenario: updateCardExtras updates due date if provided

# popupForm.feature
Scenario: handleSubmit includes insertMode in submission data
Scenario: handleSubmit includes cardId in submission data

# popupView.feature
Scenario: modifier key on card dropdown sets mode to "after"
Scenario: no modifier key on card dropdown keeps mode as "to"
Scenario: mode resets to "to" on list change

# integration.feature
Scenario: default mode -- submit with selected card posts comment
Scenario: modifier mode -- submit creates new card with position
Scenario: submit with "(new card at top)" ignores mode
Scenario: double submit blocked in both modes
Scenario: submit blocked during board data loading
```

**Acceptance**: All prior scenarios still pass + ~20 new scenarios pass.

---

### LANE E: Ship Prep

**Agent**: Worktree branch `release/ship-prep`
**Blocks**: MERGE GATE 3 -- Lane D must be merged to main first
**Effort**: ~1 hour

**Files touched**:
- `chrome_manifest_v3/manifest.json` (version bump)
- `docs/CHANGES.md` (release notes)

**Manual test matrix** (not automatable):
- [ ] First open -- form populates correctly
- [ ] Rapid board switching -- no stale data
- [ ] Rapid list switching -- no stale cards
- [ ] Double submit -- blocked
- [ ] Add TO existing card -- comment added
- [ ] Add AFTER card -- new card positioned correctly
- [ ] New card at top -- works regardless of mode
- [ ] Modifier key toggles mode indicator
- [ ] Attachment upload after card creation
- [ ] Attachment upload after add-to-card

**Acceptance**: Manual matrix passes, version bumped, CHANGES.md updated, ready for Chrome Web Store.

---

## 3. Merge Protocol

Each lane works in a git worktree. When a lane completes:

1. Agent runs full test suite (`npm test`) -- all scenarios must pass
2. Agent runs lint (`npx eslint chrome_manifest_v3/`) -- zero warnings
3. Agent creates PR to main
4. PR is reviewed and merged
5. All other in-progress worktrees rebase on updated main

### Merge Gates

| Gate | Condition | Unlocks |
|------|-----------|---------|
| GATE 1 | Lanes A + B merged | Lane D can start trel.js and popupForm.js work |
| GATE 2 | Lane C also merged | Lane D can start (all race fixes landed) |
| GATE 3 | Lane D merged | Lane E can start |

**If Lanes A/B/C finish at different times**: Lane D can begin design/test-writing immediately but must not modify source files until all three are merged. Tests can be written against the expected API (version counter methods, submit guard flag, boardDataReady event).

---

## 4. File Ownership Matrix

No two lanes touch the same file at the same time. This eliminates merge conflicts.

| File | Lane A | Lane B | Lane C | Lane D | Lane E |
|------|--------|--------|--------|--------|--------|
| `class_trel.js` | **WRITE** | | | WRITE (after A) | |
| `class_popupForm.js` | | **WRITE** | | WRITE (after B) | |
| `class_model.js` | | | **WRITE** | | |
| `class_popupView.js` | | | | **WRITE** | |
| `popupView.html` | | | | **WRITE** | |
| `style.css` | | | | **WRITE** | |
| `manifest.json` | | | | | **WRITE** |
| `CHANGES.md` | | | | | **WRITE** |
| `trel.feature` | **WRITE** | | | WRITE (after A) | |
| `popupForm.feature` | | **WRITE** | | WRITE (after B) | |
| `model.feature` | | | **WRITE** | | |
| `popupView.feature` | | | | **WRITE** | |
| `integration.feature` | | | | **WRITE** | |

---

## 5. Timeline Estimate

```
            Day 1                    Day 2              Day 3
  ┌─────────────────────────┐  ┌──────────────┐  ┌──────────┐
  │ A: Version counter (2h) │  │              │  │          │
  │ B: Submit guard (30m)   │  │ D: Add-to-   │  │ E: Ship  │
  │ C: Board cascade (2h)   │  │    card (4h) │  │    prep  │
  │    ──── PARALLEL ────   │  │              │  │   (1h)   │
  │         Review + merge  │  │ Review+merge │  │          │
  └─────────────────────────┘  └──────────────┘  └──────────┘
```

Lanes A, B, C execute simultaneously on Day 1. Lane D starts after merge gates clear. Lane E is a short final step.
