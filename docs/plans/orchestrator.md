# Gmail-2-Trello: Orchestrator Plan

**Date**: 2026-03-29
**Status**: Design / Pre-implementation
**Depends on**: `swimlanes.md` (race condition analysis)
**Purpose**: Introduce a coordination layer that eliminates the race conditions identified in the swimlane analysis, then safely implement the "add to card" feature on top of stable foundations.

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

## 2. Design Goals

1. **Minimal intervention** -- don't rewrite the architecture. Add a thin coordination layer that the existing event bus flows through.
2. **Backward compatible** -- existing event names and handlers stay. Orchestrator wraps, doesn't replace.
3. **Testable** -- orchestrator state machine can be unit tested without DOM or API mocking.
4. **Incremental** -- can be implemented in phases; each phase independently improves reliability.

---

## 3. Architecture: The Orchestrator

### 3.1 What It Is

A new class (`class_orchestrator.js`) that sits between the event bus and the side-effecting code. It:

- Tracks **lifecycle phase** (a state machine)
- Manages **request versioning** (discard stale API responses)
- Enforces **precondition gates** (don't render until data is ready)
- Provides **submit guard** (prevent double-submit)
- Coordinates **cascade sequencing** (board → lists → cards)

### 3.2 Where It Sits

```
BEFORE (current):
  ┌─────────┐    emit     ┌──────────┐    emit     ┌──────────┐
  │  Trel   │ ──────────► │ EventBus │ ──────────► │ PopupForm│
  │ (API)   │             │          │             │ (UI)     │
  └─────────┘             └──────────┘             └──────────┘
       ▲                                                │
       └────────── direct call ─────────────────────────┘

AFTER (with orchestrator):
  ┌─────────┐    emit     ┌──────────┐   forward    ┌──────────────┐  gated emit  ┌──────────┐
  │  Trel   │ ──────────► │ EventBus │ ──────────► │ Orchestrator │ ──────────► │ PopupForm│
  │ (API)   │             │          │             │              │             │ (UI)     │
  └─────────┘             └──────────┘             │  - lifecycle │             └──────────┘
       ▲                                           │  - versioning│                  │
       └────────── coordinated call ───────────────│  - gates     │◄─────────────────┘
                                                   │  - guards    │   submit request
                                                   └──────────────┘
```

The orchestrator does NOT replace the event bus. It **intercepts specific events** where coordination is needed and forwards them only when safe.

### 3.3 State Machine

```
                              ┌─────────────────────────────────────────────┐
                              │                                             │
                              ▼                                             │
  ┌───────────┐    init()   ┌───────────┐  classAppState  ┌───────────┐   │
  │           │ ──────────► │           │  Loaded +        │           │   │
  │   BOOT    │             │  LOADING  │  popupLoaded     │   IDLE    │◄──┤
  │           │             │  _PERSIST │ ─────────────► │           │   │
  └───────────┘             └───────────┘                  └─────┬─────┘   │
                                                                 │         │
                                                    showPopup()  │         │
                                                                 ▼         │
                                                           ┌───────────┐   │
                                                           │           │   │
                                                           │  LOADING  │   │
                                                           │  _TRELLO  │   │
                                                           │           │   │
                                                           └─────┬─────┘   │
                                                                 │         │
                                              trelloUserAnd      │         │
                                              BoardsReady        │         │
                                                                 ▼         │
                                                           ┌───────────┐   │
                                                           │           │   │
                                                           │  LOADING  │   │
                                                           │  _BOARD   │   │
                                                           │  _DATA    │   │
                                                           └─────┬─────┘   │
                                                                 │         │
                                              all 3 API calls    │         │
                                              complete (lists,   │         │
                                              labels, members)   │         │
                                                                 ▼         │
                                                           ┌───────────┐   │
                                                           │           │   │
                                                           │   READY   │   │
                                                           │           │   │
                                                           └─────┬─────┘   │
                                                                 │         │
                                                      submit()   │         │
                                                                 ▼         │
                                                           ┌───────────┐   │
                                                           │           │   │
                                                           │ SUBMITTING│   │
                                                           │           │   │
                                                           └─────┬─────┘   │
                                                                 │         │
                                              cardCreation       │         │
                                              Complete           │         │
                                                                 ▼         │
                                                           ┌───────────┐   │
                                                           │           │   │
                                                           │ COMPLETE  │───┘
                                                           │           │  hidePopup() or
                                                           └───────────┘  new submit

TRANSITIONS ON NAVIGATION:
  ANY state ──hashchange──► IDLE (abort in-flight, reset)

TRANSITIONS ON BOARD CHANGE:
  READY ──boardChanged──► LOADING_BOARD_DATA (reset lists/cards/labels/members)

TRANSITIONS ON ERROR:
  SUBMITTING ──APIFail──► READY (show error, allow retry)
  LOADING_* ──APIFail──► ERROR (show error, offer retry)
```

### 3.4 Request Versioning

Each category of API request gets a monotonically increasing version counter. When a response arrives, it's only accepted if its version matches the current version for that category.

```javascript
class Orchestrator {
  constructor({ app }) {
    this.app = app;
    this.requestVersions = {
      boards: 0,
      lists: 0,
      cards: 0,
      labels: 0,
      members: 0,
    };
  }

  // Called before making an API request
  nextVersion(category) {
    return ++this.requestVersions[category];
  }

  // Called when API response arrives
  isCurrentVersion(category, version) {
    return this.requestVersions[category] === version;
  }
}
```

**Usage in Trel**:
```javascript
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
  const version = this.app.orchestrator.nextVersion('lists');
  this.wrapApiCall('get', `boards/${boardId}/lists`, {},
    (data) => this.getLists_success(data, version),
    this.getLists_failure.bind(this));
}

getLists_success(data, version) {
  if (!this.app.orchestrator.isCurrentVersion('lists', version)) {
    this.app.utils.log('Discarding stale lists response');
    return;  // DISCARD
  }
  this.app.temp.lists = data;
  this.app.events.emit('loadTrelloLists_success');
}
```

This pattern fixes **RACE-2** and **RACE-3** with minimal code changes.

---

## 4. Detailed Fix Plan Per Race Condition

### Fix RACE-1: Hydration Precondition Failure

**Problem**: `gmailDataReady` fires before `domReady` or `persistReady`, form never populates.

**Fix**: Replace fire-and-forget with a deferred-event pattern in the orchestrator.

```javascript
class Orchestrator {
  constructor({ app }) {
    this.app = app;
    this.gates = {
      domReady: false,
      persistReady: false,
      gmailDataReady: false,
    };
    this.deferredGmailData = null;
  }

  setGate(name, value, data = null) {
    this.gates[name] = value;
    if (name === 'gmailDataReady' && data) {
      this.deferredGmailData = data;
    }
    this.tryHydrate();
  }

  tryHydrate() {
    if (this.gates.domReady && this.gates.persistReady && this.gates.gmailDataReady) {
      this.app.popupView.form.hydrateGmail(this.deferredGmailData);
      this.deferredGmailData = null;
    }
  }
}
```

**Changes to existing code**:
- `onDomReady()` → add `orchestrator.setGate('domReady', true)`
- `onPersistReady()` → add `orchestrator.setGate('persistReady', true)`
- `handleGmailDataReady()` → add `orchestrator.setGate('gmailDataReady', true, data)` instead of calling `maybeHydrateGmail()` directly

**Impact**: Form ALWAYS populates once all three conditions are met, regardless of arrival order.

---

### Fix RACE-2 & RACE-3: Stale API Responses

**Problem**: Old API responses overwrite newer data.

**Fix**: Request versioning (described in 3.4 above).

**Files to change**:
- `class_trel.js` -- pass version to success callbacks
- `class_orchestrator.js` -- version counter management

**Tests**:
- Fire two getLists() calls, return second one first → verify first response is discarded
- Fire getCards() for list A, switch to list B, return A's response → verify A's cards are discarded

---

### Fix RACE-4: Submit Reads Inconsistent State

**Problem**: Submit happens while data is mid-transition between board/list selections.

**Fix**: The orchestrator state machine prevents submit unless in `READY` state.

```javascript
canSubmit() {
  return this.phase === 'READY';
}

// In PopupForm:
handleSubmit() {
  if (!this.app.orchestrator.canSubmit()) {
    this.app.utils.log('Submit blocked: data still loading');
    return;
  }
  // ... proceed with submit
}
```

**UI feedback**: Disable submit button whenever phase !== READY. Re-enable when phase returns to READY.

```javascript
// In Orchestrator, on every phase transition:
onPhaseChange(newPhase) {
  const $submit = $('#addToTrello', this.app.popupView.$popup);
  if (newPhase === 'READY') {
    $submit.prop('disabled', false).css('opacity', 1);
  } else {
    $submit.prop('disabled', true).css('opacity', 0.5);
  }
}
```

---

### Fix RACE-5: Double Submit

**Problem**: No guard against clicking submit twice.

**Fix**: Orchestrator phase transitions to `SUBMITTING` on first submit, rejects subsequent submits.

```javascript
submit(newCard) {
  if (this.phase !== 'READY') return false;
  this.setPhase('SUBMITTING');
  this.app.model.submit(newCard);
  return true;
}

// On success or failure:
handleCardCreationComplete() {
  this.setPhase('COMPLETE');
}

handleAPIFail() {
  this.setPhase('READY'); // Allow retry
}
```

---

### Fix RACE-6: Navigation Destroys Popup Mid-Operation

**Problem**: Gmail navigation during API calls destroys popup, orphans state.

**Fix**: On hashchange, orchestrator aborts in-flight work and resets cleanly.

```javascript
handleNavigation() {
  if (this.phase === 'SUBMITTING') {
    // Card creation already sent to Trello -- can't cancel.
    // But we can track that we need to notify user on next popup open.
    this.pendingNotification = 'Card was submitted before navigation. Check Trello.';
  }

  // Increment all request versions to invalidate in-flight API responses
  Object.keys(this.requestVersions).forEach(k => this.requestVersions[k]++);

  // Reset gates
  this.gates = { domReady: false, persistReady: false, gmailDataReady: false };

  this.setPhase('IDLE');
}
```

---

### Fix RACE-7: Duplicate popupLoaded

**Problem**: periodicChecks can fire `popupLoaded` while init/forceRedraw is in progress.

**Fix**: Orchestrator tracks whether popup creation is in progress and deduplicates.

```javascript
class Orchestrator {
  constructor() {
    this.popupCreationInProgress = false;
    this.popupCreated = false;
  }

  requestPopupCreation() {
    if (this.popupCreationInProgress || this.popupCreated) return false;
    this.popupCreationInProgress = true;
    return true; // Proceed with creation
  }

  handlePopupLoaded() {
    this.popupCreationInProgress = false;
    this.popupCreated = true;
  }

  handleForceRedraw() {
    this.popupCreated = false;
    this.popupCreationInProgress = false;
    // Now periodicChecks or detect() can recreate
  }
}
```

**Changes to existing code**:
- `finalCreatePopup()` → check `orchestrator.requestPopupCreation()` first
- `handlePopupLoaded()` → call `orchestrator.handlePopupLoaded()`
- `forceRedraw()` → call `orchestrator.handleForceRedraw()`

---

## 5. Cascade Coordinator: Board Change Flow

The most complex flow is board change, which today fires three parallel API calls with no coordination and triggers a cascading list→cards load. The orchestrator replaces this with a tracked cascade.

### 5.1 Current Flow (Uncoordinated)

```
boardChanged
  ├─ getLists(boardId)    → callback → updateLists() → auto-select → listChanged → getCards()
  ├─ getLabels(boardId)   → callback → updateLabels()
  └─ getMembers(boardId)  → callback → updateMembers()
```

Problems:
- `listChanged` fires from `updateLists()` before labels/members are loaded
- getCards fires before lists are confirmed to be for the correct board
- No "all done" signal

### 5.2 Proposed Flow (Orchestrated)

```
boardChanged
  │
  ├─ orchestrator.setPhase('LOADING_BOARD_DATA')
  ├─ orchestrator.resetBoardData()  // Clear stale temp arrays
  │
  ├─ getLists(boardId, version)    ─┐
  ├─ getLabels(boardId, version)   ─┼─ PARALLEL (versioned)
  └─ getMembers(boardId, version)  ─┘
                                    │
                    orchestrator.trackCompletion('lists' | 'labels' | 'members')
                                    │
                    when all 3 complete:
                                    │
                    ├─ orchestrator.setPhase('READY')
                    ├─ updateLists()   ─── auto-select restores persisted listId
                    ├─ updateLabels()
                    ├─ updateMembers()
                    └─ if (listId changed) → loadCards()  ─── SEQUENTIAL, after lists confirmed
```

### 5.3 Implementation: Completion Tracker

```javascript
class Orchestrator {
  startBoardLoad(boardId) {
    this.setPhase('LOADING_BOARD_DATA');
    this.currentBoardId = boardId;
    this.boardLoadPending = new Set(['lists', 'labels', 'members']);

    // Clear stale data immediately
    this.app.temp.lists = [];
    this.app.temp.labels = [];
    this.app.temp.members = [];
    this.app.temp.cards = [];
  }

  completeBoardLoadPart(part) {
    this.boardLoadPending.delete(part);
    if (this.boardLoadPending.size === 0) {
      this.onBoardLoadComplete();
    }
  }

  onBoardLoadComplete() {
    this.setPhase('READY');
    // NOW safe to update UI and trigger cascading loads
    this.app.popupView.form.updateLists();
    this.app.popupView.form.updateLabels();
    this.app.popupView.form.updateMembers();
    // updateLists() will trigger listChanged → getCards only AFTER we're in READY phase
  }
}
```

---

## 6. Add-To-Card: Safe Implementation

With the orchestrator in place, "add to card" can be implemented safely because:

1. **Card dropdown is trustworthy** -- stale responses discarded (versioning)
2. **Submit is gated** -- can only fire in READY phase when all data is loaded
3. **Double-submit prevented** -- SUBMITTING phase blocks re-entry
4. **State is consistent** -- boardId, listId, cardId all from same load cycle

### 6.1 Add insertMode to State

```javascript
// In app.temp (NOT persist -- mode should reset each session):
this.temp.cardInsertMode = 'to'; // 'to' | 'after'
```

### 6.2 Mode Switching (from AddToAfterRefactor.md)

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

### 6.3 Submit Flow with Mode

```javascript
// In class_popupForm.js handleSubmit():
handleSubmit() {
  if (!this.app.orchestrator.canSubmit()) return;

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

  this.app.orchestrator.submit(newCard);
}
```

### 6.4 Trel: Branching on Mode

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

### 6.5 Remove Position Dropdown

The `g2tPosition` dropdown (`below:` / `to:`) becomes dead UI once mode is controlled by modifier keys:

```
FILES TO UPDATE:
  - views/popupView.html     → remove <select id="g2tPosition">
  - views/class_popupView.js → remove g2tPosition change handler (lines 859-862)
  - views/class_popupView.js → update g2tList next-select to "combo_g2tCard"
  - views/class_popupForm.js → remove g2tPosition reset (line 1138)
  - style.css                → remove #g2tPosition rules
```

---

## 7. Implementation Phases

### Phase 0: Prep (est. 1-2 hours)
- [ ] Create `chrome_manifest_v3/class_orchestrator.js`
- [ ] Add to `manifest.json` content_scripts (before `class_app.js`)
- [ ] Instantiate in `class_app.js` constructor: `this.orchestrator = new G2T.Orchestrator({ app: this })`
- [ ] Add `G2T.Orchestrator = Orchestrator;` namespace export
- [ ] Write skeleton with phase enum and transition method

### Phase 1: Request Versioning (est. 2-3 hours) -- Fixes RACE-2, RACE-3
- [ ] Add `requestVersions` map to orchestrator
- [ ] Update `class_trel.js` getLists/getCards/getLabels/getMembers to pass version
- [ ] Update success callbacks to check `isCurrentVersion()` before accepting
- [ ] Write unit tests: stale response discarded, current response accepted

### Phase 2: Hydration Gate (est. 1-2 hours) -- Fixes RACE-1
- [ ] Add `gates` and `deferredGmailData` to orchestrator
- [ ] Update `onDomReady()`, `onPersistReady()`, `handleGmailDataReady()` to call `setGate()`
- [ ] Implement `tryHydrate()` deferred execution
- [ ] Write unit tests: late domReady, late persistReady, late gmailData all work

### Phase 3: Submit Guard & Phase Machine (est. 2-3 hours) -- Fixes RACE-4, RACE-5
- [ ] Implement full phase state machine in orchestrator
- [ ] Wire phase transitions to existing events
- [ ] Add `canSubmit()` check in `handleSubmit()`
- [ ] Add submit button disable/enable on phase change
- [ ] Write unit tests: submit blocked in LOADING, allowed in READY, blocked in SUBMITTING

### Phase 4: Board Change Cascade (est. 2-3 hours) -- Improves RACE-2, RACE-4
- [ ] Implement `startBoardLoad()` / `completeBoardLoadPart()` / `onBoardLoadComplete()`
- [ ] Update `model.handleBoardChanged()` to use orchestrator
- [ ] Defer `updateLists()` / `updateLabels()` / `updateMembers()` until all three complete
- [ ] Ensure `listChanged` → `getCards()` only fires after board load complete
- [ ] Write unit tests: rapid board switch, partial completion, full completion

### Phase 5: Navigation Safety (est. 1-2 hours) -- Fixes RACE-6, RACE-7
- [ ] Implement `handleNavigation()` -- increment all versions, reset gates, set IDLE
- [ ] Implement popup creation deduplication
- [ ] Wire `hashchange` → `orchestrator.handleNavigation()`
- [ ] Wire `finalCreatePopup()` → `orchestrator.requestPopupCreation()`
- [ ] Add `pendingNotification` display on next popup open
- [ ] Write unit tests: navigation during submit, navigation during load

### Phase 6: Add-To-Card Feature (est. 3-4 hours) -- The actual feature
- [ ] Add `cardInsertMode` to `app.temp`
- [ ] Add modifier key detection on card dropdown
- [ ] Add visual indicator (Unicode first: `→▯` for TO, `▯⤵` for AFTER)
- [ ] Implement `addToExistingCard()` and `updateCardExtras()` in `class_trel.js`
- [ ] Update `createCard()` to branch on mode
- [ ] Update `handleSubmit()` to include mode and cardId in submission data
- [ ] Remove `g2tPosition` dropdown from HTML, CSS, and JS handlers
- [ ] Write unit tests: TO mode posts comment, AFTER mode creates card with position

### Phase 7: Polish & Manual Testing (est. 2-3 hours)
- [ ] Version bump in manifest.json
- [ ] Update CHANGES.md
- [ ] Manual test matrix:
  - [ ] First open -- form populates correctly
  - [ ] Rapid board switching -- no stale data
  - [ ] Rapid list switching -- no stale cards
  - [ ] Submit during load -- blocked
  - [ ] Double submit -- blocked
  - [ ] Navigate during submit -- notification shown
  - [ ] Add TO existing card -- comment added
  - [ ] Add AFTER card -- new card positioned correctly
  - [ ] New card at top -- works regardless of mode
  - [ ] Modifier key toggles mode indicator
  - [ ] Attachment upload after card creation
  - [ ] Attachment upload after add-to-card

---

## 8. Orchestrator Class Skeleton

```javascript
class Orchestrator {
  // --- Lifecycle Phases ---
  static PHASES = {
    BOOT: 'BOOT',
    LOADING_PERSIST: 'LOADING_PERSIST',
    IDLE: 'IDLE',
    LOADING_TRELLO: 'LOADING_TRELLO',
    LOADING_BOARD_DATA: 'LOADING_BOARD_DATA',
    READY: 'READY',
    SUBMITTING: 'SUBMITTING',
    COMPLETE: 'COMPLETE',
    ERROR: 'ERROR',
  };

  constructor({ app }) {
    this.app = app;
    this.phase = Orchestrator.PHASES.BOOT;

    // --- Request versioning ---
    this.requestVersions = { boards: 0, lists: 0, cards: 0, labels: 0, members: 0 };

    // --- Hydration gates ---
    this.gates = { domReady: false, persistReady: false, gmailDataReady: false };
    this.deferredGmailData = null;

    // --- Board load tracking ---
    this.currentBoardId = null;
    this.boardLoadPending = new Set();

    // --- Popup creation guard ---
    this.popupCreationInProgress = false;
    this.popupCreated = false;

    // --- Navigation notification ---
    this.pendingNotification = null;
  }

  // --- Phase transitions ---
  setPhase(newPhase) {
    const oldPhase = this.phase;
    this.phase = newPhase;
    this.app.utils.log(`Orchestrator: ${oldPhase} → ${newPhase}`);
    this.onPhaseChange(newPhase, oldPhase);
  }

  onPhaseChange(newPhase, oldPhase) {
    // Update submit button state
    const $submit = $('#addToTrello', this.app.popupView?.$popup);
    if ($submit.length) {
      const enabled = newPhase === Orchestrator.PHASES.READY;
      $submit.prop('disabled', !enabled);
    }
  }

  // --- Request versioning ---
  nextVersion(category) {
    return ++this.requestVersions[category];
  }

  isCurrentVersion(category, version) {
    return this.requestVersions[category] === version;
  }

  invalidateAllRequests() {
    Object.keys(this.requestVersions).forEach(k => this.requestVersions[k]++);
  }

  // --- Hydration gates ---
  setGate(name, value, data = null) {
    this.gates[name] = value;
    if (name === 'gmailDataReady' && data) {
      this.deferredGmailData = data;
    }
    this.tryHydrate();
  }

  tryHydrate() {
    if (this.gates.domReady && this.gates.persistReady && this.gates.gmailDataReady) {
      this.app.popupView.form.hydrateGmail(this.deferredGmailData);
      this.deferredGmailData = null;
    }
  }

  // --- Board load coordination ---
  startBoardLoad(boardId) {
    this.setPhase(Orchestrator.PHASES.LOADING_BOARD_DATA);
    this.currentBoardId = boardId;
    this.boardLoadPending = new Set(['lists', 'labels', 'members']);
    // Clear stale data
    this.app.temp.lists = [];
    this.app.temp.labels = [];
    this.app.temp.members = [];
    this.app.temp.cards = [];
  }

  completeBoardLoadPart(part) {
    this.boardLoadPending.delete(part);
    if (this.boardLoadPending.size === 0) {
      this.onBoardLoadComplete();
    }
  }

  onBoardLoadComplete() {
    this.setPhase(Orchestrator.PHASES.READY);
    this.app.popupView.form.updateLists();
    this.app.popupView.form.updateLabels();
    this.app.popupView.form.updateMembers();
  }

  // --- Submit guard ---
  canSubmit() {
    return this.phase === Orchestrator.PHASES.READY;
  }

  submit(newCard) {
    if (!this.canSubmit()) {
      this.app.utils.log('Orchestrator: submit blocked, phase=' + this.phase);
      return false;
    }
    this.setPhase(Orchestrator.PHASES.SUBMITTING);
    this.app.model.submit(newCard);
    return true;
  }

  handleCardCreationComplete() {
    this.setPhase(Orchestrator.PHASES.COMPLETE);
  }

  handleAPIFail() {
    this.setPhase(Orchestrator.PHASES.READY);
  }

  // --- Popup creation guard ---
  requestPopupCreation() {
    if (this.popupCreationInProgress || this.popupCreated) return false;
    this.popupCreationInProgress = true;
    return true;
  }

  handlePopupLoaded() {
    this.popupCreationInProgress = false;
    this.popupCreated = true;
  }

  handleForceRedraw() {
    this.popupCreated = false;
    this.popupCreationInProgress = false;
  }

  // --- Navigation ---
  handleNavigation() {
    if (this.phase === Orchestrator.PHASES.SUBMITTING) {
      this.pendingNotification = 'A card submission was in progress. Please check Trello.';
    }
    this.invalidateAllRequests();
    this.gates = { domReady: false, persistReady: false, gmailDataReady: false };
    this.deferredGmailData = null;
    this.popupCreated = false;
    this.popupCreationInProgress = false;
    this.setPhase(Orchestrator.PHASES.IDLE);
  }
}
```

---

## 9. Testing Strategy

### Unit Tests (class_orchestrator.test.js)

Test the state machine and guards in isolation, no DOM or API needed:

```
Phase Transitions:
  - BOOT → LOADING_PERSIST on init
  - LOADING_PERSIST → IDLE on classAppStateLoaded
  - IDLE → LOADING_TRELLO on showPopup
  - LOADING_TRELLO → LOADING_BOARD_DATA on trelloUserAndBoardsReady
  - LOADING_BOARD_DATA → READY when all 3 parts complete
  - READY → SUBMITTING on submit
  - SUBMITTING → COMPLETE on cardCreationComplete
  - SUBMITTING → READY on APIFail (retry)
  - ANY → IDLE on navigation

Request Versioning:
  - nextVersion increments
  - isCurrentVersion returns true for latest, false for stale
  - invalidateAllRequests makes all current versions stale

Submit Guard:
  - canSubmit() true only in READY
  - submit() transitions to SUBMITTING
  - submit() returns false in non-READY phases

Hydration Gates:
  - tryHydrate fires when all 3 gates true
  - tryHydrate does NOT fire when any gate false
  - Order of gate setting doesn't matter (all 6 permutations)

Board Load Coordination:
  - startBoardLoad clears stale data
  - completeBoardLoadPart tracks completion
  - onBoardLoadComplete fires only when all 3 parts done
  - Rapid board switch: startBoardLoad resets pending set

Popup Guard:
  - requestPopupCreation returns true first time, false second time
  - handleForceRedraw resets guard
```

### Integration Tests

Test orchestrator wired into the event system (mock Trel API responses):

```
Rapid Board Switch:
  - emit boardChanged(A), then boardChanged(B) before A's API returns
  - Verify: A's responses discarded, B's responses accepted, UI shows B's data

Submit During Load:
  - emit boardChanged, then emit submit before load completes
  - Verify: submit blocked, submit button disabled

Double Submit:
  - emit submit twice rapidly
  - Verify: only one createCard API call made

Navigation During Submit:
  - emit submit, then hashchange before createCard returns
  - Verify: pendingNotification set, phase reset to IDLE
```

---

## 10. File Manifest

| File | Action | Phase |
|------|--------|-------|
| `chrome_manifest_v3/class_orchestrator.js` | CREATE | 0 |
| `chrome_manifest_v3/manifest.json` | EDIT (add to content_scripts, bump version) | 0, 7 |
| `chrome_manifest_v3/class_app.js` | EDIT (instantiate orchestrator) | 0 |
| `chrome_manifest_v3/class_trel.js` | EDIT (request versioning, add-to-card) | 1, 6 |
| `chrome_manifest_v3/views/class_popupForm.js` | EDIT (gates, submit guard, mode) | 2, 3, 6 |
| `chrome_manifest_v3/views/class_popupView.js` | EDIT (gates, popup guard, modifier key) | 2, 5, 6 |
| `chrome_manifest_v3/class_model.js` | EDIT (board cascade, submit routing) | 4, 6 |
| `chrome_manifest_v3/views/popupView.html` | EDIT (remove g2tPosition) | 6 |
| `chrome_manifest_v3/style.css` | EDIT (remove g2tPosition, add mode indicator) | 6 |
| `tests/test_class_orchestrator.js` | CREATE | 1-6 |
| `docs/CHANGES.md` | EDIT | 7 |

---

## 11. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Orchestrator adds latency to UI updates | Low | Low | All orchestrator logic is synchronous JS; no async added |
| Phase machine blocks legitimate submit | Medium | Medium | Thorough testing of all phase transitions; READY is the default post-load state |
| Request versioning discards valid response (edge case) | Low | Low | Version is per-category, not global; only same-category requests conflict |
| Existing tests break | Medium | Low | Orchestrator is additive; existing code paths still work, just gated |
| Board cascade coordination changes timing of updateLists | Medium | Medium | Test that persisted listId is correctly restored after batched update |

---

## 12. Decision Log

| Decision | Rationale | Alternative Considered |
|----------|-----------|----------------------|
| Separate orchestrator class (not inline) | Testable, single responsibility, doesn't bloat existing classes | Inline guards in each class -- rejected: spreads coordination logic everywhere |
| Request versioning (not AbortController) | Trello.js uses jQuery.ajax internally, no native fetch; version check is simpler | AbortController -- rejected: would require replacing Trello.js internals |
| Synchronous phase machine (not async) | All transitions are triggered by event callbacks which are already sync | Promise-based state machine -- rejected: adds complexity, existing system is callback-based |
| Deferred hydration (not retry timer) | Deterministic: fires exactly when conditions met | setInterval retry -- rejected: wasteful polling, harder to reason about |
| Unicode mode indicators first (not PNG) | Ship faster, upgrade later | PNG icons -- deferred to post-launch polish |
| Keep EventTarget as-is | Orchestrator intercepts at call sites, not at event bus level | Replace EventTarget with orchestrated bus -- rejected: too invasive |
