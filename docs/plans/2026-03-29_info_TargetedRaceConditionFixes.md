# Gmail-2-Trello: Race Condition Fixes Plan

**Date**: 2026-03-29 (updated 2026-04-01)
**Status**: Active -- Wave 1 (gmail.js) DONE. Waves 2-4 ready to execute.
**Depends on**: `2026-03-29_info_SwimlanesRaceConditionAnalysis.md` (race condition analysis)
**Execution plan**: `2026-04-01_todo_ExecutionSwimLanes.md` (parallel agent lanes)
**Purpose**: Fix the race conditions identified in the swimlane analysis with three small, targeted changes -- no orchestrator class. Then safely implement the "add to card" feature on top of stable foundations.

---

## 1. Problem Statement

G2T currently uses a flat event bus (`EventTarget`) with shared mutable state (`app.temp`, `app.persist`) and no coordination. Every component reads and writes the same objects at arbitrary times. API responses arrive in arbitrary order and are blindly accepted. There is no lifecycle state machine, no request cancellation, and no submit guard.

This works **most of the time** because:
- Trello API responses are usually fast (~200ms)
- Users don't typically rapid-fire board/list changes
- jQuery silently handles operations on detached DOM elements

But it fails **often enough** to produce:
- Empty form on first open (RACE-1)
- Wrong cards shown after switching boards (RACE-2, RACE-3)
- Duplicate card creation on double-click (RACE-5)
- No user feedback when navigating away mid-submit (RACE-6)

And it makes **"add to card" dangerous** because a comment posted to the wrong card is worse than a duplicate new card.

---

## 2. Design Approach: No Orchestrator Class

~~Originally this plan called for a new `class_orchestrator.js` with a full state machine, hydration gates, popup creation guards, and centralized coordination.~~

**Decision: We will NOT build an orchestrator class.** The race conditions fall into two categories:

### Category 1: Gmail Detection (RACE-7, duplicate popupLoaded)
**Eliminated entirely by gmail.js.** Once gmail.js replaces the MutationObserver and setInterval polling (see `gmail-js-integration.md`), RACE-7 cannot occur. Gmail.js events are authoritative -- no deduplication needed.

### Category 2: Trello API (RACE-2, RACE-3, RACE-5, board-change cascade)
**Fixed with three small, targeted changes** in existing files. No new class needed.

The three fixes total ~55 lines of new code across three existing files, versus ~200+ lines for an orchestrator class. The simpler approach is easier to test, easier to review, and doesn't change the architecture.

---

## 3. The Three Targeted Fixes

### Fix 1: Version Counter in class_trel.js (~20 lines) -- Fixes RACE-2, RACE-3

**Problem**: Old API responses overwrite newer data. No request ID or cancellation token.

**Fix**: Add a version counter per API category. Each request captures the current version. Success callbacks discard responses whose version doesn't match.

```javascript
// class_trel.js -- additions

// In constructor:
this._requestVersions = { lists: 0, cards: 0, labels: 0, members: 0 };

// New helper methods:
_nextVersion(category) {
  return ++this._requestVersions[category];
}

_isCurrentVersion(category, version) {
  return this._requestVersions[category] === version;
}

// BEFORE:
getLists(boardId) {
  this.wrapApiCall('get', `boards/${boardId}/lists`, {},
    this.getLists_success.bind(this),
    this.getLists_failure.bind(this));
}

getLists_success(data) {
  this.app.temp.lists = data;  // Always accepted
  this.app.events.emit('loadTrelloLists_success');
}

// AFTER:
getLists(boardId) {
  const version = this._nextVersion('lists');
  this.wrapApiCall('get', `boards/${boardId}/lists`, {},
    (data) => this.getLists_success(data, version),
    this.getLists_failure.bind(this));
}

getLists_success(data, version) {
  if (!this._isCurrentVersion('lists', version)) {
    this.app.utils.log('Discarding stale lists response');
    return;  // DISCARD
  }
  this.app.temp.lists = data;
  this.app.events.emit('loadTrelloLists_success');
}
```

Same pattern applied to `getCards`, `getLabels`, `getMembers`.

**Tests**:
- Fire two getLists() calls, return second one first -- verify first response is discarded
- Fire getCards() for list A, switch to list B, return A's response -- verify A's cards are discarded
- Rapid calls: only the last version is current

---

### Fix 2: Submitting Boolean in class_popupForm.js (~5 lines) -- Fixes RACE-5

**Problem**: No guard against clicking submit twice. Two cards created.

**Fix**: A simple boolean flag checked at the top of `handleSubmit()`.

```javascript
// class_popupForm.js -- additions

// In constructor:
this._submitting = false;

// In handleSubmit():
handleSubmit() {
  if (this._submitting) return;  // Block double-submit
  this._submitting = true;
  // ... existing submit logic ...
}

// In handleCardCreationSuccess() / handleCardCreationFailure():
this._submitting = false;  // Re-enable for retry or next card
```

**Tests**:
- Call handleSubmit() twice rapidly -- verify only one createCard API call
- After success callback, handleSubmit() works again
- After failure callback, handleSubmit() works again (retry allowed)

---

### Fix 3: Completion Tracker in class_model.js (~30 lines) -- Fixes board-change cascade

**Problem**: `boardChanged` fires three parallel API calls (lists, labels, members) with no coordination. `updateLists()` auto-selects a list, triggering `listChanged` -> `getCards()` before labels/members are loaded. Rapid board switches can interleave responses from different boards.

**Fix**: Track completion of the three board-data API calls. Only update the UI when all three have returned for the current board.

```javascript
// class_model.js -- additions

// In constructor:
this._boardLoadPending = null;  // Set or null
this._boardLoadId = null;       // boardId for current load

// Replace handleBoardChanged:
handleBoardChanged(target, params) {
  const boardId = params.boardId;
  this._boardLoadId = boardId;
  this._boardLoadPending = new Set(['lists', 'labels', 'members']);

  // Clear stale data
  this.app.temp.lists = [];
  this.app.temp.labels = [];
  this.app.temp.members = [];
  this.app.temp.cards = [];

  this.loadTrelloLists(boardId);
  this.loadTrelloLabels(boardId);
  this.loadTrelloMembers(boardId);
}

_completeBoardLoadPart(part, boardId) {
  // Ignore completions for a stale board
  if (boardId !== this._boardLoadId) return;
  if (!this._boardLoadPending) return;

  this._boardLoadPending.delete(part);
  if (this._boardLoadPending.size === 0) {
    this._boardLoadPending = null;
    this._onBoardLoadComplete();
  }
}

_onBoardLoadComplete() {
  // NOW safe to update UI -- all three data sets are for the same board
  this.app.events.emit('boardDataReady');
}
```

The existing success event listeners in PopupForm (`loadTrelloLists_success`, etc.) continue to store data in `app.temp` as before. The new `boardDataReady` event triggers the UI updates that were previously triggered individually.

**Tests**:
- All 3 parts complete for same board -- `boardDataReady` fires
- Only 2 of 3 complete -- `boardDataReady` does NOT fire
- Rapid board switch: old board's completions ignored, new board tracked fresh
- `_onBoardLoadComplete` fires exactly once per board change

---

## 4. Remaining Race Conditions (Accepted/Deferred)

### RACE-1: Hydration Precondition Failure
**Status**: Accepted risk. The existing `maybeHydrateGmail()` pattern works in practice because `classAppStateLoaded` fires fast (~5-50ms). If this becomes a real problem, a simple retry (call `maybeHydrateGmail()` from both `onDomReady` and `onPersistReady`) is a 2-line fix.

### RACE-4: Submit Reads Inconsistent State
**Status**: Mitigated by Fix 3 (cascade tracker). Once `boardDataReady` fires, all data is consistent for the current board. The submit guard (Fix 2) prevents submit during the loading window if the user is fast enough to click before the cascade completes -- the UI should show a loading state during board changes anyway.

### RACE-6: Navigation Destroys Popup Mid-Operation
**Status**: Accepted risk. jQuery silently handles operations on detached DOM. The card IS created, attachments ARE uploaded. The only symptom is missing success feedback. Low severity.

### RACE-8: Chrome Storage Save Conflicts
**Status**: Accepted risk. Low severity, requires exact timing + extension reload.

### RACE-9: persistLoad vs Form Defaults
**Status**: Accepted risk. Mitigated by `classAppStateLoaded` being fast.

---

## 5. Add-To-Card: Safe Implementation

With the targeted fixes in place, "add to card" can be implemented safely because:

1. **Card dropdown is trustworthy** -- stale responses discarded (version counter)
2. **Double-submit prevented** -- submitting boolean blocks re-entry
3. **State is consistent** -- board data cascade ensures all data is for the same board

### 5.1 Add insertMode to State

```javascript
// In app.temp (NOT persist -- mode should reset each session):
this.temp.cardInsertMode = 'to'; // 'to' | 'after'
```

### 5.2 Mode Switching (from AddToAfterRefactor.md)

Modifier key detection on card dropdown interaction:

```javascript
// In class_popupView.js, card dropdown handler:
$('#g2tCard', this.$popup).on('mousedown', (event) => {
  const mod = this.app.utils.modKey(event);
  this.app.temp.cardInsertMode = mod ? 'after' : 'to';
  // Update visual indicator
  $('#combo_g2tCard', this.$popup).attr('data-mode', this.app.temp.cardInsertMode);
});
```

### 5.3 Submit Flow with Mode

```javascript
// In class_popupForm.js handleSubmit():
handleSubmit() {
  if (this._submitting) return;
  this._submitting = true;

  const mode = this.app.temp.cardInsertMode || 'to';
  const cardId = this.app.persist.cardId;

  const newCard = {
    // ... existing fields ...
    insertMode: mode,
    cardId: cardId,
    cardPos: this.app.temp.cardPos,
    cardMembers: this.app.temp.cardMembers,
    cardLabels: this.app.temp.cardLabels,
  };

  this.parent.app.model.submit(newCard);
}
```

### 5.4 Trel: Branching on Mode

```javascript
// In class_trel.js:
createCard(cardData) {
  if (!cardData) {
    this.app.events.emit('invalidFormData', { data: cardData });
    return;
  }

  const mode = cardData.insertMode || 'to';
  const cardId = cardData.cardId;

  if (mode === 'to' && cardId && cardId !== '-1') {
    this.addToExistingCard(cardData, cardId);
  } else {
    this.createNewCard(cardData);
  }
}

addToExistingCard(cardData, cardId) {
  // Build comment text
  let text = '';
  if (cardData.title) {
    text = cardData.markdown ? `**${cardData.title}**\n\n` : `${cardData.title}\n\n`;
  }
  text += cardData.description || '';

  // POST comment to existing card
  this.wrapApiCall('post', `cards/${cardId}/actions/comments`,
    { text },
    (response) => {
      this.updateCardExtras(cardData, cardId);
    },
    this.createCard_failure.bind(this)
  );
}

updateCardExtras(cardData, cardId) {
  // Add members, labels, due date to existing card
  // Then emit createCard_success with the existing cardId
  this.app.events.emit('createCard_success', {
    data: { ...cardData, cardId },
  });
}

createNewCard(cardData) {
  // Existing logic with position support
  const data = {
    name: cardData.title || 'No Subject',
    desc: cardData.description || '',
    idList: cardData.listId,
    idBoard: cardData.boardId,
  };

  // Position relative to selected card
  if (cardData.cardId && cardData.cardId !== '-1' && cardData.cardPos) {
    data.pos = parseInt(cardData.cardPos, 10) + 1;
  } else {
    data.pos = 'top';
  }

  // Labels, members, due date
  if (cardData.labelsId) data.idLabels = cardData.labelsId;
  if (cardData.membersId) data.idMembers = cardData.membersId;
  if (cardData.dueDate) data.due = cardData.dueDate;

  this.wrapApiCall('post', 'cards', data,
    this.createCard_success.bind(this, cardData),
    this.createCard_failure.bind(this)
  );
}
```

### 5.5 Remove Position Dropdown

The `g2tPosition` dropdown (`below:` / `to:`) becomes dead UI once mode is controlled by modifier keys:

```
FILES TO UPDATE:
  - views/popupView.html     -> remove <select id="g2tPosition">
  - views/class_popupView.js -> remove g2tPosition change handler (lines 859-862)
  - views/class_popupView.js -> update g2tList next-select to "combo_g2tCard"
  - views/class_popupForm.js -> remove g2tPosition reset (line 1138)
  - style.css                -> remove #g2tPosition rules
```

---

## 6. Implementation Phases

### Wave 0: Write Missing Tests (baseline) -- DONE
- [x] Cucumber test suite: 625 scenarios, 2345 steps
- [x] Coverage across all 12 source classes + integration tests

### Wave 1: Gmail.js Integration -- DONE (PR #136, 2026-03-30)
- [x] gmail.js v1.1.16 integrated with event-driven detection
- [x] class_observer.js and inject.js deleted
- [x] RACE-7 eliminated, setInterval polling removed

### Wave 2: Targeted Race Condition Fixes
- [ ] **Fix 1**: Version counter in `class_trel.js` (~20 lines, 2 hours)
  - Add `_requestVersions` map and helper methods
  - Update getLists/getCards/getLabels/getMembers to pass version
  - Update success callbacks to check version before accepting
- [ ] **Fix 2**: Submitting boolean in `class_popupForm.js` (~5 lines, 30 min)
  - Add `_submitting` flag
  - Check at top of `handleSubmit()`
  - Reset on success/failure
- [ ] **Fix 3**: Completion tracker in `class_model.js` (~30 lines, 2 hours)
  - Add `_boardLoadPending` Set and `_boardLoadId`
  - Track completion of lists/labels/members
  - Emit `boardDataReady` when all three complete
  - Ignore completions from stale board loads

### Wave 3: Add-to-Card Feature (3-4 hours)
- [ ] Add `cardInsertMode` to `app.temp`
- [ ] Add modifier key detection on card dropdown
- [ ] Add visual indicator (Unicode first: `->` for TO, `v` for AFTER)
- [ ] Implement `addToExistingCard()` and `updateCardExtras()` in `class_trel.js`
- [ ] Update `createCard()` to branch on mode
- [ ] Update `handleSubmit()` to include mode and cardId
- [ ] Remove `g2tPosition` dropdown from HTML, CSS, and JS handlers
- [ ] Write unit tests

### Wave 4: Ship Prep (2-3 hours)
- [ ] Version bump in manifest.json
- [ ] Update CHANGES.md
- [ ] Manual test matrix:
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

---

## 7. File Manifest

| File | Action | Wave |
|------|--------|------|
| `chrome_manifest_v3/class_trel.js` | EDIT (version counter, add-to-card) | 2, 3 |
| `chrome_manifest_v3/views/class_popupForm.js` | EDIT (submitting guard, mode) | 2, 3 |
| `chrome_manifest_v3/class_model.js` | EDIT (board cascade tracker) | 2 |
| `chrome_manifest_v3/views/class_popupView.js` | EDIT (modifier key detection) | 3 |
| `chrome_manifest_v3/views/popupView.html` | EDIT (remove g2tPosition) | 3 |
| `chrome_manifest_v3/style.css` | EDIT (remove g2tPosition, add mode indicator) | 3 |
| `chrome_manifest_v3/class_observer.js` | DELETE | 1 |
| `chrome_manifest_v3/inject.js` | DELETE | 1 |
| `docs/CHANGES.md` | EDIT | 4 |

**NOT created**: `class_orchestrator.js` -- see Section 2 for rationale.

---

## 8. Testing Strategy

### Version Counter Tests (augment test_class_trel.js)

```
describe('request versioning')
  it('_nextVersion increments counter for category')
  it('_isCurrentVersion true for latest version')
  it('_isCurrentVersion false for stale version')
  it('independent categories dont affect each other')
  it('getLists_success with current version updates temp.lists')
  it('getLists_success with stale version discards response')
  it('getCards_success with stale version discards response')
  it('rapid getLists: second call invalidates first response')
```

### Submit Guard Tests (augment test_class_popupForm.js)

```
describe('submit guard')
  it('handleSubmit sets _submitting to true')
  it('second handleSubmit while _submitting is true does nothing')
  it('_submitting resets to false on createCard_success')
  it('_submitting resets to false on createCard_failure')
  it('handleSubmit works again after success callback')
```

### Board Cascade Tests (augment test_class_model.js)

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

### Integration Tests

```
Rapid Board Switch:
  - emit boardChanged(A), then boardChanged(B) before A's API returns
  - Verify: A's responses discarded, B's responses accepted, UI shows B's data

Double Submit:
  - call handleSubmit() twice rapidly
  - Verify: only one createCard API call made
```

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Version counter discards valid response (edge case) | Low | Low | Version is per-category; only same-category requests conflict |
| Submit guard stuck in submitting state | Low | Medium | Reset on both success AND failure callbacks |
| Cascade tracker stuck waiting | Low | Medium | If any API call fails, the failure handler should clear the tracker |
| Existing tests break | Low | Low | Changes are additive -- existing code paths still work, just guarded |

---

## 10. Decision Log

| Decision | Rationale | Alternative Considered |
|----------|-----------|----------------------|
| **No orchestrator class** | Three targeted fixes (~55 lines total) are simpler, easier to test, and sufficient | Full orchestrator with state machine (~200+ lines) -- rejected: over-engineered for the actual problems |
| Request versioning (not AbortController) | Trello.js uses jQuery.ajax internally, no native fetch; version check is simpler | AbortController -- rejected: would require replacing Trello.js internals |
| Submitting boolean (not state machine) | 5 lines vs 50+. A boolean is the right tool for a binary state | Phase-based state machine -- rejected: only need to know "am I submitting?" |
| Cascade tracker in Model (not new class) | Model already owns the board-change handler; adding tracking there is natural | Orchestrator class -- rejected: see above |
| **No TypeScript** | Project has no build step; JSDoc annotations added as files are touched | TypeScript -- rejected: requires build tooling changes |
| Keep EventTarget as-is | The event bus works fine; the problems are in the handlers, not the bus | Replace EventTarget with orchestrated bus -- rejected: too invasive |
