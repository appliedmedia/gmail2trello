# Gmail-2-Trello: Swimlane Analysis & Race Condition Audit

**Date**: 2026-03-29
**Status**: Analysis / Pre-implementation
**Purpose**: Map every concurrent flow in G2T to identify race conditions, ordering violations, and state corruption risks before re-publishing.

---

## 1. Swimlane Diagram: Full Lifecycle

Six concurrent "lanes" operate during the extension lifecycle. Each lane has its own async timing. The central problem is that **no orchestrator coordinates them** -- they communicate through a flat event bus and shared mutable state (`app.persist`, `app.temp`) with no guards, no sequencing, and no conflict resolution.

```
TIME
 |
 |  SERVICE       CONTENT       CHROME        TRELLO        GMAIL DOM      UI/POPUP
 |  WORKER        SCRIPT        STORAGE       API           (Observer)     (PopupView/Form)
 |  ─────────     ─────────     ─────────     ─────────     ─────────      ─────────
 |
 |  tabs.onUpdated
 |  detect Gmail
 |  ───────────►
 |  sendMessage   receive
 |  "g2t_init"    "g2t_init"
 |                ──────────►
 |                app.init()
 |                │
 |                ├─ obs.init()                              MutationObserver
 |                │                                          created (toolbar)
 |                │                                          ◄──────────────
 |                │
 |                ├─ model.init()
 |                │  (binds 9 event listeners)
 |                │
 |                ├─ gmailView.init()
 |                │  ├─ detect()                             scan for [gh="mtb"]
 |                │  │  detectToolbar()                      ◄──────────────
 |                │  │  detectEmailOpeningMode()
 |                │  └─ obs.observeToolbar()                 OBSERVING
 |                │                                          ◄══════════════
 |                │
 |                ├─ popupView.init()                                        load HTML views
 |                │  ├─ form.init()                                          bind 11 listeners
 |                │  ├─ bindEvents()                                         bind 3 listeners
 |                │  └─ setInterval(periodicChecks, 5s)                      POLLING ═══►
 |                │
 |                ├─ utils.init()
 |                │
 |                └─ persistLoad()
 |                   ──────────►
 |                              chrome.storage
 |                              .sync.get()
 |                              ═══════════►    (ASYNC, ~5-50ms)
 |                              ◄═══════════
 |                              callback
 |                   ◄──────────
 |                   emit 'classAppStateLoaded'
 |                   merge into app.persist                                  onPersistReady()
 |                                                                           syncCheckboxes()
 |                                                                           ◄──────────────
 |
 |  ═══════════════════════════════════════════════════════════════════════════════════════
 |  GAP: Between init() and classAppStateLoaded, app.persist has DEFAULTS not saved values.
 |  Any code reading app.persist.boardId etc. during this window gets null/undefined.
 |  ═══════════════════════════════════════════════════════════════════════════════════════
 |
 |                                                                           periodicChecks
 |                                                                           every 5s: find
 |                                                                           toolbar, create
 |                                                                           button+popup
 |                                                                           ════════════►
 |
 |  ─── USER CLICKS G2T BUTTON ───────────────────────────────────────────────────────────
 |
 |                                                                           showPopup()
 |                                                                           emit 'onPopupVisible'
 |                                                                           ──────────────►
 |                model.load()
 |                ├─ if (authorized && boards.length)
 |                │  └─ emit 'trelloUserAndBoardsReady' ──── (FAST PATH)
 |                │
 |                └─ else: trelloLoad()
 |                   trel.setApiKey()
 |                   trel.authorize()
 |                                    ──────────►
 |                                    Trello.authorize()
 |                                    [OAuth popup]
 |                                    ═══════════► (USER INTERACTION, seconds)
 |                                    ◄═══════════
 |                                    authorize_success()
 |                                    persist.trelloAuthorized = true
 |                                    ──────────►
 |                emit 'checkTrelloAuthorized_success'
 |                loadTrelloUser()
 |                                    ──────────►
 |                                    GET /members/me
 |                                    ═══════════► (~200-500ms)
 |                                    ◄═══════════
 |                                    getUser_success()
 |                                    persist.user = data
 |                emit 'trelloUserReady'
 |                loadTrelloBoards()
 |                                    ──────────►
 |                                    GET /members/me/boards
 |                                    ═══════════► (~200-500ms)
 |                                    ◄═══════════
 |                                    getBoards_success()
 |                                    temp.boards = data
 |                emit 'trelloUserAndBoardsReady'
 |                ──────────────────────────────────────────►
 |                                                           gmailView
 |                                                           .handleTrelloUserAndBoardsReady()
 |                                                           parseData()
 |                                                           extract subject, body,
 |                                                           attachments from DOM
 |                                                                           ◄──────────────
 |                emit 'gmailDataReady'
 |                                                                           handleGmailDataReady()
 |                                                                           maybeHydrateGmail()
 |                                                                           ├─ if (!domReady) BAIL
 |                                                                           ├─ if (!persistReady) BAIL
 |                                                                           ├─ bindData()
 |                                                                           ├─ bindGmailData()
 |                                                                           └─ updateBoards()
 |
 |  ═══════════════════════════════════════════════════════════════════════════════════════
 |  RACE #1: maybeHydrateGmail() has TWO preconditions (domReady + persistReady).
 |  If gmailDataReady fires before EITHER is true, the form never populates.
 |  There is NO retry -- the event is fire-and-forget.
 |  ═══════════════════════════════════════════════════════════════════════════════════════
 |
 |  ─── USER SELECTS BOARD ───────────────────────────────────────────────────────────────
 |
 |                                                                           board dropdown
 |                                                                           change event
 |                emit 'boardChanged'
 |                │
 |                ├─ loadTrelloLists(boardId)
 |                │                  ──────────►
 |                │                  GET /boards/{id}/lists
 |                │                  ═══════════► (~200ms)     ╗
 |                │                                            ║ THREE PARALLEL
 |                ├─ loadTrelloLabels(boardId)                 ║ API CALLS
 |                │                  ──────────►               ║ UNCOORDINATED
 |                │                  GET /boards/{id}/labels   ║
 |                │                  ═══════════► (~200ms)     ║
 |                │                                            ║
 |                └─ loadTrelloMembers(boardId)                ║
 |                                   ──────────►              ║
 |                                   GET /boards/{id}/members ║
 |                                   ═══════════► (~200ms)     ╝
 |                                   ◄═══════════
 |                                   getMembers_success()
 |                                   temp.members = data
 |                emit 'loadTrelloMembers_success'
 |                                                                           updateMembers()
 |                                   ◄═══════════
 |                                   getLists_success()
 |                                   temp.lists = data
 |                emit 'loadTrelloLists_success'
 |                                                                           updateLists()
 |                                                                           ──► auto-select
 |                                                                               first list
 |                                                                               triggers
 |                                                                               list change!
 |                                   ◄═══════════
 |                                   getLabels_success()
 |                                   temp.labels = data
 |                emit 'loadTrelloLabels_success'
 |                                                                           updateLabels()
 |
 |  ═══════════════════════════════════════════════════════════════════════════════════════
 |  RACE #2: The three API callbacks arrive in ARBITRARY order. updateLists() auto-selects
 |  the first list, which triggers 'listChanged', which calls loadTrelloCards(). But if
 |  the user rapidly switches boards, the cards from board-1's list could arrive AFTER
 |  board-2's lists, corrupting the card dropdown with stale data.
 |
 |  NO REQUEST CANCELLATION exists. Old API responses are not discarded.
 |  ═══════════════════════════════════════════════════════════════════════════════════════
 |
 |  ─── LIST AUTO-SELECTS OR USER SELECTS LIST ──────────────────────────────────────────
 |
 |                emit 'listChanged'
 |                loadTrelloCards(listId)
 |                                   ──────────►
 |                                   GET /lists/{id}/cards
 |                                   ═══════════► (~200ms)
 |                                   ◄═══════════
 |                                   getCards_success()
 |                                   temp.cards = data
 |                emit 'loadTrelloCards_success'
 |                                                                           updateCards()
 |                                                                           populate card
 |                                                                           dropdown
 |
 |  ═══════════════════════════════════════════════════════════════════════════════════════
 |  RACE #3: If user changes list rapidly, two loadTrelloCards() calls are in flight.
 |  The second response may arrive before the first. Both write to temp.cards and both
 |  trigger updateCards(). Result: card dropdown flickers and may show wrong list's cards.
 |  ═══════════════════════════════════════════════════════════════════════════════════════
 |
 |  ─── USER CLICKS SUBMIT ───────────────────────────────────────────────────────────────
 |
 |                                                                           form.submit()
 |                                                                           emit 'submit'
 |                                                                           ──────────────►
 |                popupForm.handleSubmit()
 |                build newCard object from
 |                app.temp + app.persist
 |                model.submit(newCard)
 |                ──────────────────────────────►
 |                                   trel.createCard()
 |                                   POST /cards
 |                                   ═══════════► (~500ms-2s)
 |                                   ◄═══════════
 |                                   createCard_success()
 |                emit 'createCard_success'
 |                handleTrelloCardCreateSuccess()
 |                ├─ eblcmArray.update()
 |                └─ uploadAttachment()
 |  ◄──────────
 |  sendMessage
 |  'g2t_upload_attach'
 |  fetch blob
 |  POST /cards/{id}/attachments
 |  ═══════════► (~1-10s per file)
 |  ◄═══════════
 |  sendResponse
 |  ──────────►
 |                uploader: next file
 |                ... (serial chain)
 |                emit 'newCardUploadsComplete'
 |                                                                           displaySuccess()
 |
 |  ═══════════════════════════════════════════════════════════════════════════════════════
 |  RACE #4: handleSubmit() reads app.temp.title, app.persist.boardId etc. at a POINT
 |  IN TIME. If the user clicked submit while a board/list change was still loading
 |  (API in flight), the data could be from a MIX of old and new selections.
 |
 |  RACE #5: Nothing prevents double-submit. If user clicks submit twice before the
 |  first createCard API returns, two cards are created.
 |  ═══════════════════════════════════════════════════════════════════════════════════════
 |
 |  ─── GMAIL NAVIGATION (HASH CHANGE) ──────────────────────────────────────────────────
 |
 |                                                           hashchange event
 |                                                           ◄══════════════
 |                app.handleGmailHashChange()
 |                gmailView.forceRedraw()
 |                ├─ remove #g2tButton
 |                ├─ remove #g2tPopup                                        POPUP DESTROYED
 |                ├─ reset $toolBar                                          while API calls
 |                └─ detect() restart                                        may be in flight!
 |
 |  ═══════════════════════════════════════════════════════════════════════════════════════
 |  RACE #6: If the user navigates Gmail while Trello API calls are in flight, the popup
 |  is destroyed. When callbacks fire, they try to update DOM elements that no longer exist.
 |  jQuery silently swallows this (no crash), but state (app.temp, app.persist) still
 |  gets mutated with stale data.
 |  ═══════════════════════════════════════════════════════════════════════════════════════
 |
 |  ─── PERIODIC CHECKS (every 5s) ──────────────────────────────────────────────────────
 |
 |                                                                           periodicChecks()
 |                                                                           validateButtonState()
 |                                                                           if button missing:
 |                                                                             finalCreatePopup()
 |                                                                             emit 'popupLoaded'
 |
 |  ═══════════════════════════════════════════════════════════════════════════════════════
 |  RACE #7: periodicChecks runs on a 5s interval. It can trigger finalCreatePopup() and
 |  emit 'popupLoaded' WHILE the app is in mid-initialization or mid-forceRedraw. This
 |  means handlePopupLoaded() can fire twice, rebinding all DOM events and potentially
 |  creating duplicate handlers.
 |  ═══════════════════════════════════════════════════════════════════════════════════════
```

---

## 2. Race Condition Catalog

### RACE-1: Hydration Precondition Failure

**Trigger**: `gmailDataReady` fires before `domReady` or `persistReady` is true.

**Flow**:
```
persistLoad() ─── ASYNC ───► classAppStateLoaded (sets persistReady=true)
popupLoaded   ─── ASYNC ───► onDomReady() (sets domReady=true)
gmailDataReady ──────────────► maybeHydrateGmail()
                                if (!domReady || !persistReady) return; // BAIL
```

**Impact**: Form shows empty -- no boards, no email data. User sees broken UI. No retry mechanism exists.

**Evidence**: `class_popupForm.js` -- `maybeHydrateGmail()` checks two boolean gates. If either is false, it silently returns. The event is not replayed.

**Severity**: HIGH -- intermittent, timing-dependent, user-visible.

---

### RACE-2: Stale API Responses on Rapid Board Switch

**Trigger**: User selects Board A, then quickly selects Board B.

**Flow**:
```
T0: boardChanged(A) → getLists(A), getLabels(A), getMembers(A)
T1: boardChanged(B) → getLists(B), getLabels(B), getMembers(B)
T2: getLists(A) returns → temp.lists = listsA → updateLists() → auto-select list
T3: getLists(B) returns → temp.lists = listsB → updateLists() → auto-select list
```

**Impact**: Between T2 and T3, the card dropdown may load cards from Board A's list. After T3, list dropdown is correct but card dropdown might still show Board A cards (if the listChanged from T2 triggered a getCards that returns after T3).

**No request ID or cancellation token** is used. Old responses are blindly accepted.

**Severity**: MEDIUM -- visible flicker, possible wrong-board cards shown.

---

### RACE-3: Stale Cards on Rapid List Switch

**Trigger**: User selects List X, then quickly selects List Y.

**Flow**:
```
T0: listChanged(X) → getCards(X)
T1: listChanged(Y) → getCards(Y)
T2: getCards(Y) returns → temp.cards = cardsY → updateCards()  ← CORRECT
T3: getCards(X) returns → temp.cards = cardsX → updateCards()  ← WRONG! Overwrites Y
```

**Impact**: Card dropdown shows List X's cards even though List Y is selected. User submits to wrong list's card.

**Severity**: HIGH -- silent data corruption, user unknowingly submits to wrong card.

---

### RACE-4: Submit Reads Inconsistent State

**Trigger**: User clicks Submit while a board/list change API call is still in flight.

**Flow**:
```
T0: User selects new board → boardChanged → API calls in flight
T1: Lists arrive → updateLists() → auto-selects first list → listChanged
T2: User clicks Submit BEFORE cards arrive
T3: handleSubmit() reads:
      boardId  = NEW (already updated by dropdown change handler)
      listId   = NEW (already updated by list auto-select)
      cardId   = OLD (card dropdown not yet updated -- still shows previous board's cards)
```

**Impact**: Card created with mismatched boardId/listId/cardId. Trello API may reject or create card in unexpected location.

**Severity**: HIGH -- data integrity violation, possible API error.

---

### RACE-5: Double Submit

**Trigger**: User clicks Submit button twice before first API call returns.

**Flow**:
```
T0: click → emit 'submit' → handleSubmit() → model.submit() → trel.createCard()
T1: click → emit 'submit' → handleSubmit() → model.submit() → trel.createCard()
T2: createCard(T0) returns → createCard_success → upload attachments
T3: createCard(T1) returns → createCard_success → upload attachments (DUPLICATE)
```

**Impact**: Two identical cards created. Attachments uploaded twice.

**No submit-in-progress guard** exists. The submit button is not disabled during submission.

**Severity**: MEDIUM -- user-visible duplicate, but recoverable (delete extra card).

---

### RACE-6: Navigation Destroys Popup Mid-Operation

**Trigger**: User navigates Gmail (clicks different email, switches inbox) while API calls are in flight.

**Flow**:
```
T0: User clicks Submit → createCard() in flight
T1: User clicks another email → hashchange
T2: forceRedraw() → remove #g2tButton, #g2tPopup from DOM
T3: createCard_success → tries to update destroyed DOM
T4: uploadAttachment → sends to service worker (succeeds silently)
```

**Impact**: Card IS created (API call completes), attachments ARE uploaded, but success/error message never shown. State (eblcmArray) updated but popup gone. On next popup open, form may show stale "submitting..." state.

**jQuery mitigates crashes** (operations on detached elements are no-ops), but state corruption persists.

**Severity**: MEDIUM -- card created but no feedback to user.

---

### RACE-7: Duplicate popupLoaded from periodicChecks

**Trigger**: periodicChecks (5s interval) runs during initialization or after forceRedraw.

**Flow**:
```
T0: forceRedraw() → remove button → detect() → finalCreatePopup() → emit 'popupLoaded'
T1: periodicChecks fires (5s timer) → validates button → button missing → finalCreatePopup() → emit 'popupLoaded' AGAIN
T2: handlePopupLoaded() runs TWICE → binds all DOM event handlers TWICE
```

**Impact**: Every form interaction fires its handler twice. Board change triggers two boardChanged events, doubling API calls. Submit creates two cards.

**Severity**: HIGH -- silent, doubles all side effects.

---

### RACE-8: Chrome Storage Save Conflicts

**Trigger**: Multiple rapid state changes trigger overlapping `saveToChromeStorage()` calls.

**Flow**:
```
T0: User changes board → persist.boardId = 'A' → saveToChromeStorage()
T1: User changes list → persist.listId = 'X' → saveToChromeStorage()
T2: chrome.storage.sync.set({boardId: 'A', listId: null}) ← T0's save (listId not yet set)
T3: chrome.storage.sync.set({boardId: 'A', listId: 'X'}) ← T1's save (correct)
```

**Impact**: If extension reloads between T2 and T3, listId is lost. The hash-based throttling helps reduce frequency but does not sequence writes.

**Severity**: LOW -- requires exact timing + extension reload.

---

### RACE-9: persistLoad vs Form Defaults

**Trigger**: Popup shown before `classAppStateLoaded` fires.

**Flow**:
```
T0: app.init() → persist = {boardId: null, listId: null, ...} (DEFAULTS)
T1: popup shown → updateBoards() reads persist.boardId → null → no board pre-selected
T2: classAppStateLoaded fires → persist.boardId = 'saved_board_id'
T3: Board dropdown still shows "please select..." not saved board
```

**Impact**: User must re-select their saved board every time if timing is wrong.

**Severity**: MEDIUM -- annoying UX, intermittent.

---

## 3. State Mutation Map

Every class that reads or writes shared state, showing where conflicts arise:

```
                    ┌─────────────┐
                    │  app.persist │
                    │  (chrome     │
                    │   storage)   │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │  Model  │       │ PopupView│      │ PopupForm│
   │         │       │         │       │         │
   │ WRITES: │       │ WRITES: │       │ WRITES: │
   │ trelloAuth│     │ boardId │       │ useBackLink│
   │ user    │       │ listId  │       │ addCC   │
   │ eblcmArray│     │ cardId  │       │ markdown│
   │         │       │ popupWidth│     │ labelsId│
   │ READS:  │       │         │       │ membersId│
   │ trelloAuth│     │ READS:  │       │         │
   │ user    │       │ boardId │       │ READS:  │
   │ eblcmArray│     │ listId  │       │ boardId │
   │         │       │ cardId  │       │ listId  │
   └─────────┘       └─────────┘       └─────────┘

                    ┌─────────────┐
                    │  app.temp   │
                    │  (runtime)  │
                    └──────┬──────┘
                           │
   ┌───────────┬───────────┼───────────┬───────────┐
   │           │           │           │           │
┌──▼──┐   ┌───▼───┐  ┌────▼────┐ ┌────▼────┐ ┌───▼────┐
│ Trel│   │Gmail  │  │PopupView│ │PopupForm│ │ Model  │
│     │   │View   │  │         │ │         │ │        │
│WRITE│   │WRITE: │  │WRITE:   │ │WRITE:   │ │READ:   │
│boards│  │title  │  │position │ │title    │ │all     │
│lists│   │descr  │  │dueDate  │ │descr    │ │(submit)│
│cards│   │attach │  │dueTime  │ │         │ │        │
│members│ │image  │  │cardPos  │ │READ:    │ │        │
│labels│  │       │  │cardMem  │ │boards   │ │        │
│     │   │       │  │cardLbl  │ │lists    │ │        │
│     │   │       │  │         │ │cards    │ │        │
│     │   │       │  │         │ │members  │ │        │
│     │   │       │  │         │ │labels   │ │        │
└─────┘   └───────┘  └─────────┘ └─────────┘ └────────┘

CONFLICT ZONES:
  temp.boards/lists/cards/members/labels:
    WRITTEN by Trel (async API callback)
    READ by PopupForm (UI render)
    → If read happens during write or before write: stale/empty data shown

  persist.boardId/listId/cardId:
    WRITTEN by PopupView (dropdown change handler, sync)
    READ by Model (on submit, sync) and PopupForm (on hydrate, sync)
    → If submit reads before dropdown change completes cascade: inconsistent

  temp.title/description:
    WRITTEN by PopupForm (input handler, sync)
    WRITTEN by GmailView (parseData, during gmailDataReady)
    → GmailView can OVERWRITE user edits if gmailDataReady fires late
```

---

## 4. Identified Anti-Patterns

### 4.1 Fire-and-Forget Events with Preconditions

Multiple events require preconditions to be met, but the event system has no replay or queuing:

| Event | Preconditions | What Happens If Not Met |
|-------|--------------|------------------------|
| `gmailDataReady` | domReady AND persistReady | Silent bail, form stays empty |
| `popupLoaded` | Popup HTML loaded | Usually ok, but can fire twice |
| `boardChanged` | Previous board's API calls done | Stale data races |

### 4.2 No Request Cancellation

Every Trello API call uses a simple callback pattern with no way to cancel or invalidate stale responses:

```javascript
// class_trel.js
wrapApiCall(method, path, params, successCallback, failureCallback) {
  Trello.rest(method, path, params, successCallback, failureCallback);
  // No request ID, no abort controller, no staleness check
}
```

### 4.3 Shared Mutable State Without Versioning

`app.temp.lists`, `app.temp.cards` etc. are plain arrays overwritten on every API response. No version counter, no "for which boardId was this loaded?" metadata:

```javascript
// class_trel.js
getLists_success(data) {
  this.app.temp.lists = data; // Overwrites regardless of which board this was for
  this.app.events.emit('loadTrelloLists_success');
}
```

### 4.4 No Submit Guard

```javascript
// class_popupForm.js
handleSubmit() {
  const newCard = { /* build from current state */ };
  this.parent.app.model.submit(newCard);
  // No: this.submitting = true
  // No: disable submit button
  // No: check if previous submit in flight
}
```

### 4.5 Uncoordinated Parallel API Calls

`boardChanged` fires three independent API calls with no coordination:

```javascript
// class_model.js
handleBoardChanged(target, params) {
  this.loadTrelloLists(boardId);    // → updateLists() → triggers listChanged → loadCards()
  this.loadTrelloLabels(boardId);   // → updateLabels()
  this.loadTrelloMembers(boardId);  // → updateMembers()
  // No: Promise.all(), no: WaitCounter, no: completion tracking
}
```

---

## 5. The "Add To Card" Problem in Context

The missing "add to existing card" functionality (documented in `AddToAfterRefactor.md`) intersects with every race condition above:

1. **RACE-3 + Add-To-Card**: If stale cards are shown (wrong list), the user might select a card from the wrong list. In "add to" mode, this would add a comment to the WRONG card -- worse than creating a duplicate.

2. **RACE-4 + Add-To-Card**: If submit reads inconsistent state, the `cardId` and `insertMode` might not match. Code could try to add a comment to a card that doesn't exist on the selected board.

3. **RACE-5 + Add-To-Card**: Double-submit in "add to" mode = duplicate comments on the same card.

4. **RACE-6 + Add-To-Card**: Navigation during "add to" operation leaves the comment added but no confirmation shown.

**Conclusion**: Implementing "add to card" on top of the current architecture would amplify every existing race condition. The data flowing into `createCard()` / `addToExistingCard()` must be trustworthy and consistent. Today it is not.

---

## 6. Recommendations

These feed into the race condition fixes plan (`orchestrator.md`):

1. **Version counter in class_trel.js** (~20 lines) -- discard stale API responses. Each API category (lists, cards, labels, members) gets a monotonically increasing version. Success callbacks check the version before accepting data. Fixes RACE-2 and RACE-3.
2. **Submitting boolean in class_popupForm.js** (~5 lines) -- block double-submit. A `_submitting` flag checked at the top of `handleSubmit()`, reset on success/failure. Fixes RACE-5.
3. **Completion tracker in class_model.js** (~30 lines) -- coordinate the board-change cascade. Track completion of the three parallel API calls (lists, labels, members). Only emit `boardDataReady` when all three have returned for the current board. Fixes the uncoordinated cascade that amplifies RACE-2 and RACE-4.
4. **Gmail.js replaces observer + polling entirely** -- eliminates RACE-7 (duplicate popupLoaded) and the 5-second blind spot. See `gmail-js-integration.md`.

No orchestrator class or state machine is needed. These four changes (~55 lines of new code across three existing files, plus the gmail.js integration) address all high-severity race conditions with minimal architectural change.
