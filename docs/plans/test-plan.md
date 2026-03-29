# Gmail-2-Trello: Test Plan

**Date**: 2026-03-29
**Status**: Active
**Depends on**: `swimlanes.md`, `orchestrator.md`
**Purpose**: Map current coverage, identify gaps, and define what tests to add -- organized by wave so independent work can be parallelized.

---

## 0. Current State

### Infrastructure

| Item | Status | Notes |
|------|--------|-------|
| Jest version | 30.2.0 | Working |
| JSDOM | 24.1.3 | Downgraded from 27.4 -- jsdom 27 pulls ESM-only `@exodus/bytes` via `html-encoding-sniffer@6`, incompatible with Jest's CJS require chain |
| Coverage provider | V8 | Switched from babel-plugin-istanbul (crashed on `test-exclude@6` + `glob@10` override) |
| Test suites | 11 passing | 505 tests total |
| Coverage scope | test_shared.js only | Source files not instrumented -- only the test helper shows coverage |

### Test Inventory (505 tests across 11 files)

| Test File | Tests | Source File | Lines | Method Coverage | Gaps |
|---|---|---|---|---|---|
| test_class_utils.js | 118 | class_utils.js (876 ln) | 1102 | Excellent: markdownify (74), escapeRegExp (14), modKey, truncate, hash, storage | `loadFile()` untested |
| test_class_model.js | 55 | class_model.js (683 ln) | 855 | Good: auth chain, load all entities, submit, eblcm, upload | handleTrelloUserReady only via spy |
| test_class_goog.js | 47 | class_goog.js (160 ln) | 473 | Good: storage get/set, runtime, error handling, context invalidation | Storage change listener callback |
| test_class_app.js | 36 | class_app.js (183 ln) | 382 | Good: init, persist load/save, state merge, navigation | Analytics removed |
| test_class_gmailView.js | 34 | class_gmailView.js (657 ln) | 540 | Partial: email formatting, url helpers, toolbar detect | **parseData() untested**, preDetect(), attachment/image extraction |
| test_class_eventTarget.js | 33 | class_eventTarget.js (69 ln) | 271 | Good: add/remove/emit, error in listener | Listener call order |
| test_class_trel.js | 23 | class_trel.js (556 ln) | 361 | Partial: auth, API routing, createCard basic | **Success/failure callback paths shallow**, no payload verification |
| test_class_popupView.js | 16 | class_popupView.js (863 ln) | 178 | Weak: init, size constraints | **forceRedraw(), periodicChecks, dropdown handlers, combobox all untested** |
| test_class_popupForm.js | 16 | class_popupForm.js (1063 ln) | 176 | Weak: init, bindEvents, submit emit | **updateLists/Cards/Labels/Members, handleSubmit data assembly, maybeHydrateGmail all untested** |
| test_class_menuControl.js | 12 | class_menuControl.js (68 ln) | 140 | Partial: reset, selectors | Click behavior, exclusive/nonexclusive modes |
| test_class_waitCounter.js | 8 | class_waitCounter.js (78 ln) | 88 | Partial: start/stop, idempotency | maxSteps reached, multiple items |

### Source Files With ZERO Tests

| Source File | Lines | Risk | Testable in Jest? |
|---|---|---|---|
| class_observer.js | ~250 | HIGH -- timing-critical debouncing | Yes -- mock MutationObserver |
| service_worker.js | ~290 | MEDIUM -- message routing, upload | Partial -- no chrome.tabs in JSDOM |
| content-script.js | ~120 | LOW -- bootstrap glue | No -- needs real chrome runtime |
| inject.js | ~20 | LOW -- trivial | No -- needs page context |

---

## 1. Test Additions by Wave

### Parallelization Map

```
WAVE 0 ─────────────────────────────────────────────────────────────────
  [A] Fix test infra          DONE (jsdom 24, V8 coverage, 505 passing)
  [B] Coverage instrumentation  (add source files to collectCoverageFrom)

WAVE 1 (Foundation) ────────────────────────────────────────────────────
  ┌─────────────────────┐  ┌────────────────────────┐  ┌──────────────────────┐
  │ [C] Orchestrator     │  │ [D] Trel versioning    │  │ [E] Observer tests   │
  │     unit tests       │  │     tests              │  │     (new file)       │
  │     (new file)       │  │     (augment existing) │  │                      │
  │                      │  │                        │  │                      │
  │  CAN PARALLELIZE     │  │  CAN PARALLELIZE       │  │  CAN PARALLELIZE     │
  └─────────────────────┘  └────────────────────────┘  └──────────────────────┘

WAVE 2 (Submit safety + cascade) ───────────────────────────────────────
  ┌─────────────────────┐  ┌────────────────────────┐
  │ [F] PopupForm       │  │ [G] PopupView          │
  │     deep tests      │  │     deep tests         │
  │     (augment)       │  │     (augment)          │
  │                     │  │                        │
  │  CAN PARALLELIZE    │  │  CAN PARALLELIZE       │
  └─────────────────────┘  └────────────────────────┘

WAVE 3 (Add-to-card) ──────────────────────────────────────────────────
  ┌─────────────────────┐  ┌────────────────────────┐
  │ [H] Trel add-to-    │  │ [I] Integration:       │
  │     card tests      │  │     mode switching     │
  │     (augment)       │  │     + submit flow      │
  │                     │  │                        │
  │  CAN PARALLELIZE    │  │  CAN PARALLELIZE       │
  └─────────────────────┘  └────────────────────────┘

DEPENDENCIES:
  B → independent
  C, D, E → independent of each other, depend on Wave 1 implementation code
  F, G → independent of each other, depend on Wave 2 implementation code
  H, I → independent of each other, depend on Wave 3 implementation code
```

---

### [B] Coverage Instrumentation

Add `collectCoverageFrom` to jest config so source file coverage is reported (currently only `test_shared.js` shows up):

```json
"collectCoverageFrom": [
  "chrome_manifest_v3/**/*.js",
  "!chrome_manifest_v3/lib/**",
  "!chrome_manifest_v3/inject.js"
]
```

**Effort**: 5 minutes. **Parallel**: Yes, independent.

---

### [C] New File: `test_class_orchestrator.js`

Tests for the coordination layer. Pure logic -- no DOM, no API, no jQuery. The most parallelizable test file because it has zero external dependencies.

**Phase machine transitions** (~15 tests):

```
describe('phase transitions')
  it('starts in BOOT')
  it('BOOT → LOADING_PERSIST on init')
  it('LOADING_PERSIST → IDLE on classAppStateLoaded')
  it('IDLE → LOADING_TRELLO on showPopup')
  it('LOADING_TRELLO → LOADING_BOARD_DATA on trelloUserAndBoardsReady + boardChanged')
  it('LOADING_BOARD_DATA → READY when all 3 parts complete')
  it('READY → SUBMITTING on submit')
  it('SUBMITTING → COMPLETE on cardCreationComplete')
  it('SUBMITTING → READY on APIFail (allows retry)')
  it('ANY → IDLE on navigation')
  it('rejects invalid transitions (e.g. BOOT → SUBMITTING)')
  it('LOADING_BOARD_DATA stays if only 1 of 3 parts complete')
  it('LOADING_BOARD_DATA stays if only 2 of 3 parts complete')
  it('rapid board switch: startBoardLoad resets pending set')
  it('COMPLETE → READY on new form interaction')
```

**Request versioning** (~8 tests):

```
describe('request versioning')
  it('nextVersion increments counter for category')
  it('isCurrentVersion true for latest version')
  it('isCurrentVersion false for stale version')
  it('independent categories dont affect each other')
  it('invalidateAllRequests makes all current versions stale')
  it('nextVersion after invalidate starts fresh')
  it('version 0 is never current (pre-init state)')
  it('rapid calls: only last version is current')
```

**Hydration gates** (~8 tests):

```
describe('hydration gates')
  it('tryHydrate does NOT fire when no gates set')
  it('tryHydrate does NOT fire with only domReady')
  it('tryHydrate does NOT fire with only persistReady')
  it('tryHydrate does NOT fire with only gmailDataReady')
  it('tryHydrate fires when all 3 gates true (dom, persist, gmail order)')
  it('tryHydrate fires when all 3 gates true (gmail, dom, persist order)')
  it('tryHydrate fires when all 3 gates true (persist, gmail, dom order)')
  it('tryHydrate fires exactly once, not on subsequent gate sets')
```

**Submit guard** (~6 tests):

```
describe('submit guard')
  it('canSubmit returns false in BOOT')
  it('canSubmit returns false in LOADING_BOARD_DATA')
  it('canSubmit returns false in SUBMITTING (double-submit blocked)')
  it('canSubmit returns true in READY')
  it('submit() transitions to SUBMITTING and returns true')
  it('submit() in non-READY returns false and does not transition')
```

**Board load coordination** (~6 tests):

```
describe('board load coordination')
  it('startBoardLoad clears stale temp arrays')
  it('completeBoardLoadPart tracks individual completion')
  it('onBoardLoadComplete fires when all 3 parts done')
  it('onBoardLoadComplete does NOT fire when only 2 done')
  it('rapid board switch: second startBoardLoad resets first')
  it('completion of old board load parts after reset is ignored')
```

**Popup creation guard** (~4 tests):

```
describe('popup creation guard')
  it('requestPopupCreation returns true first time')
  it('requestPopupCreation returns false second time (deduplicated)')
  it('handleForceRedraw resets guard, allows new creation')
  it('handlePopupLoaded clears in-progress flag')
```

**Navigation** (~4 tests):

```
describe('navigation')
  it('handleNavigation increments all request versions')
  it('handleNavigation resets all gates')
  it('handleNavigation sets phase to IDLE')
  it('handleNavigation during SUBMITTING sets pendingNotification')
```

**Total: ~51 tests. Effort: 3-4 hours. Parallel: Yes.**

---

### [D] Augment: `test_class_trel.js` -- Request Versioning

Add tests for version-aware API responses. These test the Trel class changes, not the orchestrator itself.

```
describe('request versioning integration')
  it('getLists passes version to success callback')
  it('getLists_success with current version updates temp.lists')
  it('getLists_success with stale version discards response')
  it('getCards passes version to success callback')
  it('getCards_success with stale version discards response')
  it('getMembers_success with stale version discards response')
  it('getLabels_success with stale version discards response')
  it('rapid getLists: second call invalidates first response')

describe('createCard payload verification')
  it('createCard sends correct name from title field')
  it('createCard sends correct name from subject field (fallback)')
  it('createCard sends idLabels when provided')
  it('createCard sends idMembers when provided')
  it('createCard sends due when dueDate provided')
  it('createCard sends pos:top when no card selected')
  it('createCard sends pos:bottom for position=below')
  it('createCard with cardPos sends numeric pos')
```

**Total: ~16 tests. Effort: 2 hours. Parallel: Yes (with [C] and [E]).**

---

### [E] New File: `test_class_observer.js`

Currently zero tests for a timing-critical component. Uses mock MutationObserver.

```
describe('Observer constructor')
  it('initializes with null observers and false connected flags')
  it('stores app reference')

describe('init')
  it('sets up logging')

describe('observeToolbar')
  it('creates MutationObserver targeting [gh="mtb"] parent')
  it('sets connected.toolbar to true')
  it('does nothing if already connected')

describe('debounceEvent')
  it('coalesces rapid calls to single callback (use jest.useFakeTimers)')
  it('clears previous timer on new call')
  it('does NOT fire callback if disconnected before debounce completes')
  it('toolbar debounce is 250ms')
  it('content debounce is 500ms')

describe('disconnect')
  it('sets connected flag to false')
  it('clears debounce timer')
  it('calls observer.disconnect()')
  it('prevents callback after disconnect (guard check)')

describe('disconnectAll')
  it('disconnects both toolbar and content observers')

describe('guard patterns')
  it('callback with null app does not crash')
  it('callback with null app.events does not crash')
  it('callback after disconnect returns early')
```

**Total: ~18 tests. Effort: 2 hours. Parallel: Yes (with [C] and [D]).**

---

### [F] Augment: `test_class_popupForm.js` (currently 16 tests → target ~50)

This is the weakest test file relative to code complexity (16 tests for 1063 lines). Priority additions:

```
describe('handleSubmit data assembly')
  it('builds newCard with emailId from app.temp')
  it('builds newCard with boardId from app.persist')
  it('builds newCard with listId from app.persist')
  it('builds newCard with title from app.temp')
  it('builds newCard with description from app.temp')
  it('builds newCard with empty attachment array as default')
  it('builds newCard with attachment array from app.temp')
  it('passes newCard to model.submit')
  it('respects orchestrator.canSubmit() returning false')

describe('updateLists')
  it('clears existing options')
  it('populates from app.temp.lists')
  it('auto-selects persisted listId')
  it('auto-selects first item if no persisted listId')
  it('triggers change event after population')

describe('updateCards')
  it('includes "(new card at top)" option with value -1')
  it('populates from app.temp.cards')
  it('auto-selects persisted cardId')
  it('stores pos/members/labels as properties on option elements')
  it('truncates long card names')

describe('updateLabels')
  it('creates button per label with correct color')
  it('restores selected state from persist.labelsId')

describe('updateMembers')
  it('creates button per member with avatar')
  it('restores selected state from persist.membersId')

describe('maybeHydrateGmail')
  it('calls hydrateGmail when domReady AND persistReady AND gmailDataReady')
  it('does NOT call hydrateGmail when domReady is false')
  it('does NOT call hydrateGmail when persistReady is false')

describe('onDomReady')
  it('sets domReady flag')
  it('calls syncCheckboxesFromPersist')

describe('onPersistReady')
  it('sets persistReady flag')
  it('syncs checkbox state from app.persist')
```

**Total: ~34 new tests. Effort: 3 hours. Parallel: Yes (with [G]).**

---

### [G] Augment: `test_class_popupView.js` (currently 16 tests → target ~35)

```
describe('forceRedraw')
  it('removes #g2tButton from DOM')
  it('removes #g2tPopup from DOM')
  it('resets $toolBar to null')
  it('calls detect() to restart')

describe('periodicChecks')
  it('calls validateButtonState')
  it('recreates button if missing from DOM')
  it('does NOT recreate if button exists')
  it('respects orchestrator.requestPopupCreation() returning false')

describe('dropdown change handlers')
  it('board change writes to app.persist.boardId')
  it('board change emits boardChanged event')
  it('list change writes to app.persist.listId')
  it('list change emits listChanged event')
  it('card change writes app.persist.cardId and app.temp.cardPos/Members/Labels')

describe('showPopup / hidePopup')
  it('showPopup emits onPopupVisible')
  it('hidePopup hides popup element')

describe('popup creation')
  it('finalCreatePopup creates button and popup in toolbar')
  it('finalCreatePopup emits popupLoaded')
```

**Total: ~19 new tests. Effort: 2 hours. Parallel: Yes (with [F]).**

---

### [H] Augment: `test_class_trel.js` -- Add-to-Card

```
describe('createCard mode branching')
  it('insertMode "to" with valid cardId calls addToExistingCard')
  it('insertMode "to" with cardId "-1" calls createNewCard')
  it('insertMode "to" with no cardId calls createNewCard')
  it('insertMode "after" with valid cardId calls createNewCard with position')
  it('insertMode "after" with no cardId calls createNewCard at top')
  it('undefined insertMode defaults to "to"')

describe('addToExistingCard')
  it('POSTs comment to cards/{cardId}/actions/comments')
  it('comment text includes title in bold when markdown enabled')
  it('comment text includes title plain when markdown disabled')
  it('comment text includes description')
  it('calls updateCardExtras after comment success')

describe('updateCardExtras')
  it('adds members not already on card')
  it('adds labels not already on card')
  it('updates due date if provided')
  it('emits createCard_success with existing cardId')
  it('skips members if none provided')
  it('skips labels if none provided')

describe('createNewCard with position')
  it('position = cardPos + 1 when card selected')
  it('position = top when no card selected')
  it('position = top when cardId is -1')
  it('includes idLabels, idMembers, due in new card')
```

**Total: ~20 new tests. Effort: 2 hours. Parallel: Yes (with [I]).**

---

### [I] Integration: Mode Switching + Submit Flow

Tests that verify the end-to-end flow from modifier key → mode change → submit → correct API call. These require PopupForm + Trel + Orchestrator wired together.

```
describe('add-to-card integration')
  it('default mode is "to" -- submit with selected card posts comment')
  it('modifier key sets mode to "after" -- submit creates new card with position')
  it('mode resets to "to" on list change')
  it('submit with "(new card at top)" ignores mode, creates at top')
  it('submit blocked during LOADING_BOARD_DATA regardless of mode')
  it('double submit blocked in both modes')
```

**Total: ~6 tests. Effort: 1-2 hours. Parallel: Yes (with [H]).**

---

## 2. GmailView.parseData() -- Special Case

`parseData()` is the most important untested method. It extracts subject, body, attachments, images, CC, and timestamps from Gmail's DOM. Testing it properly requires realistic Gmail HTML fixtures.

**Approach**: Create a `tests/fixtures/` directory with sanitized Gmail DOM snapshots (`.html` files). Load them into JSDOM and run `parseData()` against them.

```
describe('parseData')
  it('extracts subject from .hP element')
  it('extracts email body from .a3s.aiL element')
  it('extracts sender from span.gD')
  it('extracts timestamp from .gH .gK .g3')
  it('extracts attachments from span.aZo')
  it('extracts inline images')
  it('extracts CC recipients from span.g2')
  it('handles email with no attachments')
  it('handles email with no body')
  it('handles split view layout')
```

**Total: ~10 tests. Effort: 3-4 hours (mostly fixture creation). Parallel: Yes, independent of all waves.**

---

## 3. What NOT to Test

| Source File | Why Skip |
|---|---|
| `content-script.js` | Bootstrap glue, requires real Chrome runtime. Manual test only. |
| `inject.js` | ~20 lines, accesses `window.GLOBALS`. Cannot run outside page context. |
| `service_worker.js` | Requires Chrome service worker environment. Could test message handler logic in isolation, but low ROI vs manual testing. Defer. |
| `lib/*.js` | Third-party (jQuery, jQuery UI, Trello.js). Not our code. |

---

## 4. test_shared.js Cleanup

The TODO.md has a plan to gut test_shared.js. After the wave work, evaluate:

**Keep**:
- jQuery + JSDOM setup (~80 lines)
- Chrome/Trello/localStorage mocks (~100 lines)
- `G2T_TestSuite.createApp()` factory (~100 lines)
- `clearAllMocks()` helper

**Remove**:
- Duplicated mocks (chrome mocked twice, Trello mocked twice)
- Unused mock constructors (if any remain from the 2000→713 line cleanup)
- Synchronous setTimeout/setInterval overrides (replace with `jest.useFakeTimers()` in individual tests that need it)

**Estimated final size**: ~300 lines (down from 713).

**Timing**: After Wave 2. Don't destabilize shared infra during wave work.

---

## 5. Coverage Targets

| Wave | After Completion | New Tests Added |
|------|-----------------|-----------------|
| Current | 505 tests, 11 files | -- |
| Wave 0 [B] | 505 tests, source coverage visible | 0 |
| Wave 1 [C+D+E] | ~590 tests, 13 files | ~85 |
| Wave 2 [F+G] | ~643 tests, 13 files | ~53 |
| Wave 3 [H+I] | ~669 tests, 13 files | ~26 |
| parseData fixture tests | ~679 tests | ~10 |
| **Total** | **~679 tests, 13 files** | **~174** |

---

## 6. Test Infrastructure Fixes Applied

| Fix | What | Why |
|-----|------|-----|
| `jsdom` 27.4 → 24.1.3 | Downgrade | jsdom 27 pulls `html-encoding-sniffer@6` → `@exodus/bytes` (ESM-only). Jest's CJS require chain can't load it. jsdom 24 uses CJS-compatible deps. |
| `coverageProvider: "v8"` | Switch from babel-istanbul | `babel-plugin-istanbul@7` → `test-exclude@6` does `promisify(require('glob'))`. The `glob@>=10.5` override in package.json forces a version where glob is an object not a function. V8 coverage bypasses this entirely. |
| Remove `transformIgnorePatterns` | Clean up | No longer needed with jsdom 24 (no ESM deps to transform). |
