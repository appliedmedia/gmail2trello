# Gmail-2-Trello: Test Plan

**Date**: 2026-03-29
**Status**: DONE -- Superseded by Cucumber test suite. Jest coverage gaps no longer applicable.
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
WAVE 0 (Baseline -- write missing tests BEFORE any code changes) ──────
  [A] Fix test infra          DONE (jsdom 24, V8 coverage, 505 passing)
  [B] Coverage instrumentation  (add source files to collectCoverageFrom)
  ┌─────────────────────┐  ┌────────────────────────┐  ┌──────────────────────┐
  │ [E] Observer tests   │  │ [F] PopupForm          │  │ [G] PopupView        │
  │     (new file)       │  │     deep tests         │  │     deep tests       │
  │                      │  │     (augment)          │  │     (augment)        │
  │  CAN PARALLELIZE     │  │  CAN PARALLELIZE       │  │  CAN PARALLELIZE     │
  └─────────────────────┘  └────────────────────────┘  └──────────────────────┘
  Write tests against CURRENT code. These become the baseline that proves
  the targeted fixes don't break anything.

WAVE 1 (Gmail.js -- branch, not main) ─────────────────────────────────
  Gmail.js integration tests (see gmail-js-integration.md)

WAVE 2 (Targeted race condition fixes) ─────────────────────────────────
  ┌─────────────────────┐  ┌────────────────────────┐  ┌──────────────────────┐
  │ [C] Trel version    │  │ [D] PopupForm submit   │  │ [D2] Model cascade   │
  │     counter tests   │  │     guard tests         │  │      tracker tests   │
  │     (augment)       │  │     (augment)           │  │      (augment)       │
  │                     │  │                         │  │                      │
  │  CAN PARALLELIZE    │  │  CAN PARALLELIZE        │  │  CAN PARALLELIZE     │
  └─────────────────────┘  └─────────────────────────┘  └──────────────────────┘

WAVE 3 (Add-to-card) ──────────────────────────────────────────────────
  ┌─────────────────────┐  ┌────────────────────────┐
  │ [H] Trel add-to-    │  │ [I] Integration:       │
  │     card tests      │  │     mode switching     │
  │     (augment)       │  │     + submit flow      │
  │                     │  │                        │
  │  CAN PARALLELIZE    │  │  CAN PARALLELIZE       │
  └─────────────────────┘  └────────────────────────┘

WAVE 4: Ship prep (manual testing, CHANGES.md)

DEPENDENCIES:
  B, E, F, G → independent (Wave 0 -- test current code)
  C, D, D2 → independent of each other, depend on Wave 2 implementation code
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

### [C] Augment: `test_class_trel.js` -- Version Counter

Tests for the version counter that discards stale API responses (Fix 1 from orchestrator.md).

```
describe('version counter')
  it('_nextVersion increments counter for category')
  it('_isCurrentVersion true for latest version')
  it('_isCurrentVersion false for stale version')
  it('independent categories dont affect each other')
  it('getLists_success with current version updates temp.lists')
  it('getLists_success with stale version discards response')
  it('getCards_success with stale version discards response')
  it('getMembers_success with stale version discards response')
  it('getLabels_success with stale version discards response')
  it('rapid getLists: second call invalidates first response')
```

**Total: ~10 tests. Effort: 1-2 hours. Parallel: Yes (with [D] and [D2]).**

---

### [D] Augment: `test_class_popupForm.js` -- Submit Guard

Tests for the `_submitting` boolean that prevents double-submit (Fix 2 from orchestrator.md).

```
describe('submit guard')
  it('handleSubmit sets _submitting to true')
  it('second handleSubmit while _submitting is true does nothing')
  it('_submitting resets to false on createCard_success')
  it('_submitting resets to false on createCard_failure')
  it('handleSubmit works again after success callback')
```

**Total: ~5 tests. Effort: 30 min. Parallel: Yes (with [C] and [D2]).**

---

### [D2] Augment: `test_class_model.js` -- Board Cascade Tracker

Tests for the completion tracker that coordinates the board-change cascade (Fix 3 from orchestrator.md).

```
describe('board load coordination')
  it('handleBoardChanged sets _boardLoadPending with 3 parts')
  it('handleBoardChanged clears stale temp arrays')
  it('_completeBoardLoadPart tracks individual completion')
  it('_onBoardLoadComplete fires when all 3 parts done')
  it('_onBoardLoadComplete does NOT fire when only 2 done')
  it('rapid board switch: second handleBoardChanged resets tracking')
  it('completion of old board load parts after switch is ignored')
```

**Total: ~7 tests. Effort: 1-2 hours. Parallel: Yes (with [C] and [D]).**

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
  it('respects _submitting flag returning early')

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
  it('does NOT recreate if button exists (no orchestrator guard needed -- gmail.js events are authoritative)')

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
| Wave 0 [B+E+F+G] | ~590 tests, 12 files, source coverage visible | ~85 (baseline tests against current code) |
| Wave 1 (Gmail.js) | ~600 tests | ~10 (gmail adapter tests) |
| Wave 2 [C+D+D2] | ~622 tests | ~22 (version counter, submit guard, cascade tracker) |
| Wave 3 [H+I] | ~648 tests | ~26 (add-to-card) |
| parseData fixture tests | ~658 tests | ~10 |
| **Total** | **~658 tests, 12 files** | **~153** |

Note: 12 files not 13 -- no `test_class_orchestrator.js` needed.

---

## 6. Test Infrastructure Fixes Applied

| Fix | What | Why |
|-----|------|-----|
| `jsdom` 27.4 → 24.1.3 | Downgrade | jsdom 27 pulls `html-encoding-sniffer@6` → `@exodus/bytes` (ESM-only). Jest's CJS require chain can't load it. jsdom 24 uses CJS-compatible deps. |
| `coverageProvider: "v8"` | Switch from babel-istanbul | `babel-plugin-istanbul@7` → `test-exclude@6` does `promisify(require('glob'))`. The `glob@>=10.5` override in package.json forces a version where glob is an object not a function. V8 coverage bypasses this entirely. |
| Remove `transformIgnorePatterns` | Clean up | No longer needed with jsdom 24 (no ESM deps to transform). |
