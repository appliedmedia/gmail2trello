# Lane 3: Cascade Tracker in class_model.js

**Date**: 2026-04-15
**Status**: DONE (2026-04-25)
**File**: `chrome_manifest_v3/class_model.js`
**Fixes**: Uncoordinated board-change cascade (amplifies RACE-2, RACE-4)

## Problem

`handleBoardChanged()` (line 679) fires three parallel API calls
(`loadTrelloLists`, `loadTrelloLabels`, `loadTrelloMembers`) with no
coordination. Each success callback independently triggers UI updates.
`updateLists()` auto-selects the first list, which triggers `listChanged` and
`getCards()` before labels and members have arrived.

If the user rapidly switches boards, completions from old boards interleave with
the new board's responses. The UI shows a mix of data from different boards.

## Design

Track the three board-data API calls per board load. Emit a single
`boardDataReady` event when all three complete for the *current* board.
Completions from stale board loads are ignored.

This does NOT change the existing individual success events
(`loadTrelloLists_success`, etc.) which still fire and store data in `app.temp`.
The new `boardDataReady` event is an additional signal that all data is consistent.

## Changes to class_model.js

### Step 1: Add tracking state to Model constructor (after line 409)

```javascript
constructor(args) {
  // ... existing ...
  this._boardLoadId = null;
  this._boardLoadPending = null;
}
```

### Step 2: Replace handleBoardChanged (lines 679-686)

```javascript
handleBoardChanged(target, params) {
  const boardId = params.boardId;
  if (boardId === '_' || boardId === '' || boardId === null) return;

  // Reset tracking for new board
  this._boardLoadId = boardId;
  this._boardLoadPending = new Set(['lists', 'labels', 'members']);

  this.loadTrelloLists(boardId);
  this.loadTrelloLabels(boardId);
  this.loadTrelloMembers(boardId);
}
```

### Step 3: Add completion tracking methods (after handleBoardChanged)

```javascript
_completeBoardLoadPart(part, boardId) {
  if (boardId !== this._boardLoadId) return;
  if (!this._boardLoadPending) return;

  this._boardLoadPending.delete(part);
  if (this._boardLoadPending.size === 0) {
    this._boardLoadPending = null;
    this.app.events.emit('boardDataReady', { boardId });
  }
}
```

### Step 4: Call tracker from existing success handlers

Update the three Model-level success handlers to call the tracker. These are
separate from the Trel-level success handlers and are already bound to events.

```javascript
loadTrelloLists_success(data) {
  this.app.temp.lists = data;
  this.app.events.emit('loadTrelloLists_success', { data });
  this._completeBoardLoadPart('lists', this._boardLoadId);
}

loadTrelloLabels_success(data) {
  this.app.temp.labels = data;
  this.app.events.emit('loadTrelloLabels_success', { data });
  this._completeBoardLoadPart('labels', this._boardLoadId);
}

loadTrelloMembers_success(data) {
  this.app.temp.members = data;
  this.app.events.emit('loadTrelloMembers_success', { data });
  this._completeBoardLoadPart('members', this._boardLoadId);
}
```

### Step 5: Wire success handlers to Trel events (in bindEvents)

Currently, Model's `loadTrelloLists_success` etc. are defined but may not be
wired to Trel's events (Trel emits `loadTrelloLists_success` directly). We need
Model to intercept these. Two approaches:

**Option A (preferred)**: Have Trel call Model's success handler directly by
passing it as the callback. This is already the case because `trel.getLists()` is
called with `this.getLists_success.bind(this)` on the *Trel* instance. The Trel
success handler already emits `loadTrelloLists_success`. PopupForm listens to
that event for UI updates.

The cleanest fix: have Model listen to the Trel-emitted events and call the
tracker from those listeners:

```javascript
// In Model.bindEvents():
this.app.events.addListener(
  'loadTrelloLists_success',
  () => this._completeBoardLoadPart('lists', this._boardLoadId),
);
this.app.events.addListener(
  'loadTrelloLabels_success',
  () => this._completeBoardLoadPart('labels', this._boardLoadId),
);
this.app.events.addListener(
  'loadTrelloMembers_success',
  () => this._completeBoardLoadPart('members', this._boardLoadId),
);
```

This avoids changing the Trel -> Model data flow. PopupForm continues to listen
to the same events for individual UI updates. The new `boardDataReady` is additive.

## Event flow (after change)

```text
boardChanged(boardId)
  -> loadTrelloLists(boardId)    -> Trel API -> 'loadTrelloLists_success'
  -> loadTrelloLabels(boardId)   -> Trel API -> 'loadTrelloLabels_success'
  -> loadTrelloMembers(boardId)  -> Trel API -> 'loadTrelloMembers_success'

Each '_success' event:
  -> PopupForm updates UI (existing, unchanged)
  -> Model._completeBoardLoadPart (NEW)
       -> if all 3 done for current board: emit 'boardDataReady'
```

## What boardDataReady enables (future)

* Wave 3 can use `boardDataReady` to enable the submit button only after all
  board data is consistent
* Could gate card loading on `boardDataReady` instead of individual list
  selection (optional optimization, not in scope)

## Cucumber scenarios to add (model.feature)

```gherkin
# ------------------------------------------------------------------
# Board Load Cascade Tracking
# ------------------------------------------------------------------

Scenario: handleBoardChanged sets tracking state
  When handleBoardChanged is called with boardId "board1"
  Then Model._boardLoadId is "board1"
  And Model._boardLoadPending has 3 items

Scenario: _completeBoardLoadPart tracks individual completion
  Given handleBoardChanged was called with boardId "board1"
  When _completeBoardLoadPart is called with "lists" and "board1"
  Then Model._boardLoadPending has 2 items

Scenario: boardDataReady fires when all 3 parts complete
  Given handleBoardChanged was called with boardId "board1"
  When _completeBoardLoadPart is called with "lists" and "board1"
  And _completeBoardLoadPart is called with "labels" and "board1"
  And _completeBoardLoadPart is called with "members" and "board1"
  Then "boardDataReady" event was emitted with boardId "board1"

Scenario: boardDataReady does NOT fire when only 2 parts complete
  Given handleBoardChanged was called with boardId "board1"
  When _completeBoardLoadPart is called with "lists" and "board1"
  And _completeBoardLoadPart is called with "labels" and "board1"
  Then "boardDataReady" event was not emitted

Scenario: Rapid board switch resets tracking
  Given handleBoardChanged was called with boardId "board1"
  When handleBoardChanged is called with boardId "board2"
  Then Model._boardLoadId is "board2"
  And Model._boardLoadPending has 3 items

Scenario: Stale board completions are ignored after switch
  Given handleBoardChanged was called with boardId "board1"
  And handleBoardChanged is called with boardId "board2"
  When _completeBoardLoadPart is called with "lists" and "board1"
  Then Model._boardLoadPending still has 3 items
  And "boardDataReady" event was not emitted
```

## Risk

* **Tracker stuck waiting**: if any of the three API calls fails, the failure
  handler does not call `_completeBoardLoadPart`. The tracker stays pending
  forever for that board. Mitigation: a subsequent `boardChanged` resets
  tracking. Could add failure-path tracking later if needed, but board change is
  the natural reset.
* **Existing listeners unaffected**: PopupForm still responds to individual
  `_success` events. The new tracker is additive.
