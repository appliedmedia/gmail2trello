# Gmail-2-Trello: Integration Test Plan

**Date**: 2026-03-29
**Status**: Done with known gap (20 integration scenarios
passing; missing add-comment-to-card integration test)
**Depends on**: Cucumber unit tests (632+ scenarios passing)
**Purpose**: Test real class-to-class interactions with only
external boundaries mocked (Chrome APIs, Trello API,
MutationObserver). All G2T classes are real.

> **Historical plan below.** 20 of the planned integration
> scenarios are implemented and passing. One gap remains:
> add-comment-to-card through the real
> Model-Trel-Uploader chain.

## Reconciliation (2026-04-16)

Integration tests are in
`tests/cucumber/features/integration.feature` with helpers
in `tests/cucumber/support/integration_helpers.js`. All
planned scenarios from sections 2.1 through 2.7 are
implemented. The one known gap is an integration test for
the add-to-card (comment) path through the unified Uploader
chain. This will be added when Wave 2 race condition fixes
land (the Uploader path is not safe to integration-test
until stale-response discarding is in place). See
[FixAddToCard](<2026-04-05_done_FixAddToCard.md>) for
details.

---

## 1. Principle

Unit tests mock everything except the class under test.
Integration tests mock only the **external boundary** --
Chrome extension APIs, Trello REST API, and browser APIs
that don't exist in JSDOM. All G2T classes (EventTarget,
Model, Trel, Goog, GmailView, PopupView, PopupForm,
Observer, Utils) are real and talk to each other through
the real event system.

**Mocked (external boundaries only):**

* `window.chrome.storage.sync` -- get/set
* `window.chrome.runtime` -- sendMessage, getURL
* `window.Trello` -- rest, authorize, deauthorize, setKey
* `window.MutationObserver` -- constructor, observe,
  disconnect
* `window.fetch`, `window.confirm`, `window.analytics`

**Real (everything internal):**

* All G2T classes instantiated by real `new G2T.App()`
* EventTarget event propagation
* Model / Trel callback chains
* PopupForm / PopupView state management
* GmailView DOM parsing
* app.persist / app.temp shared state
* jQuery DOM manipulation

---

## 2. Integration Scenarios (~20 scenarios)

### Feature: App Initialization (3 scenarios)

#### Scenario: App constructor wires all subsystems

* Given all G2T classes are loaded
* When a real App is constructed
* Then all subsystems exist and reference the same app
* And EventTarget has listeners registered from Model,
  GmailView, PopupView, PopupForm

#### Scenario: Persist load hydrates app state from Chrome storage

* Given a real App
* And Chrome storage returns saved state with boardId
  and user data
* When persistLoad is called
* Then classAppStateLoaded event fires
* And app.persist.boardId matches the stored value
* And app.persist.user matches the stored data

#### Scenario: Init calls all subsystem init methods

* Given a real App
* When init is called
* Then model, gmailView, popupView, and utils are
  initialized
* And observer toolbar watching is started

### Feature: Trello Auth Chain (3 scenarios)

#### Scenario: Full auth flow from authorize to boards loaded

* Given a real App with Trello.authorize mocked to
  succeed immediately
* And Trello.rest mocked to return user data for
  members/me
* And Trello.rest mocked to return boards for
  members/me/boards
* When model.trelloLoad is called
* Then checkTrelloAuthorized_success event fires
* Then trelloUserReady event fires with user data
  stored in persist
* Then trelloUserAndBoardsReady event fires with
  boards stored in temp

#### Scenario: Auth failure emits correct event

* Given a real App with Trello.authorize mocked to fail
* When model.trelloLoad is called
* Then persist.trelloAuthorized remains false

#### Scenario: Cached auth skips authorize call

* Given a real App with persist.trelloAuthorized true
  and temp.boards populated
* When model.load is called
* Then trelloUserAndBoardsReady fires without calling
  Trello.authorize

### Feature: Board-List-Card Cascade (4 scenarios)

#### Scenario: Board change loads lists, labels, and members in parallel

* Given a real App with auth complete
* And Trello.rest mocked for boards/b1/lists,
  boards/b1/labels, boards/b1/members
* When boardChanged event is emitted with boardId b1
* Then loadTrelloLists_success fires with lists in
  app.temp.lists
* And loadTrelloLabels_success fires with labels in
  app.temp.labels
* And loadTrelloMembers_success fires with members in
  app.temp.members

#### Scenario: List change loads cards

* Given a real App with lists loaded
* And Trello.rest mocked for lists/l1/cards
* When listChanged event is emitted with listId l1
* Then loadTrelloCards_success fires with cards in
  app.temp.cards

#### Scenario: Full cascade from board to cards

* Given a real App with auth complete
* And Trello.rest mocked for all endpoints
* When boardChanged fires
* And the first list auto-selects triggering
  listChanged
* Then app.temp has boards, lists, cards, labels,
  and members all populated

#### Scenario: Rapid board switch overwrites with latest data

* Given a real App with auth complete
* And Trello.rest mocked with different data for
  board A and board B
* When boardChanged fires for board A
* And boardChanged fires for board B before A's
  response arrives
* Then app.temp.lists contains board B's lists
  (documents current race behavior)

### Feature: Card Submission (3 scenarios)

#### Scenario: Submit creates card through real Model-Trel chain

* Given a real App with auth complete and form data
  populated
* And Trello.rest mocked to return a card with id c1
  on POST cards
* When submittedFormShownComplete event fires with
  form data
* Then Trello.rest is called with POST, cards, and
  correct payload
* And createCard_success event fires with cardId c1

#### Scenario: Submit updates email-board-list-card mapping

* Given a real App that has created a card for emailId
  email-123
* Then app.persist.eblcmArray contains a mapping for
  email-123 with the correct cardId

#### Scenario: Submit with missing required fields emits invalidFormData

* Given a real App with auth complete
* When submittedFormShownComplete fires with null data
* Then invalidFormData event fires

### Feature: Gmail Data Parsing (3 scenarios)

#### Scenario: parseData extracts full email data from DOM

* Given a real App
* And the DOM contains Gmail-structured HTML with
  subject, body, sender, attachments
* When gmailView.parseData is called with a fullName
* Then the returned object has subject, bodyAsRaw,
  attachment array, and ccAsRaw

#### Scenario: Gmail data flows through to form via events

* Given a real App with DOM ready and persist loaded
* And gmailView.parseData returns email data
* When trelloUserAndBoardsReady fires triggering
  gmailDataReady
* Then popupForm receives the gmail data

#### Scenario: parseData handles missing email gracefully

* Given a real App
* And the DOM has no Gmail email structure
* When gmailView.parseData is called
* Then it returns without crashing

### Feature: Navigation and Redraw (2 scenarios)

#### Scenario: Hashchange triggers forceRedraw

* Given a real App with a button in the DOM
* When window hashchange event fires with a new hash
* Then gmailView.forceRedraw is called
* And the old button is removed from DOM

#### Scenario: Observer toolbar mutation triggers redraw

* Given a real App with observer watching toolbar
* And a MutationObserver mock
* When toolbar mutations are triggered
* And 250ms debounce passes
* Then toolbarChanged event fires
* And gmailView.handleToolbarChanged is called

### Feature: Hydration Gate (2 scenarios)

#### Scenario: Form hydrates only when all three conditions met

* Given a real App
* When gmailDataReady fires before persistReady
* Then form is not hydrated
* When persistReady becomes true
* Then form hydrates with the deferred gmail data

#### Scenario: Late DOM ready still hydrates

* Given a real App where persist and gmail data are
  ready
* When popupLoaded fires (DOM becomes ready)
* Then form hydrates

---

## 3. Swimlanes

The integration tests need a **new Cucumber support file**
(an integration World that creates real App instances) and
a new feature file. This is mostly sequential because
integration tests share state patterns, but the feature
file writing can parallel with the support file once the
pattern is established.

```text
PHASE 0: Foundation (sequential)
  |-- Create tests/cucumber/support/
  |   integration_world.js
  |   * Loads ALL real G2T classes
  |   * Mocks only external boundaries
  |   * Creates real App instances with
  |     setInterval/MutationObserver mocked
  |   * Provides helper to mock Trello.rest
  |     responses per endpoint
  |   * Provides helper to trigger and wait
  |     for events
  |-- Create tests/cucumber/features/
      integration.feature
      (skeleton with 1 smoke scenario)

PHASE 1: Scenarios (2 parallel lanes)
  +---------------------------+
  | LANE A: Data flow         |
  |                           |
  | * App initialization (3)  |
  | * Auth chain (3)          |
  | * Board cascade (4)       |
  | * Card submission (3)     |
  |                           |
  | Total: 13 scenarios       |
  +---------------------------+
  +---------------------------+
  | LANE B: UI + Navigation   |
  |                           |
  | * Gmail parsing (3)       |
  | * Navigation/redraw (2)   |
  | * Hydration gate (2)      |
  |                           |
  | Total: 7 scenarios        |
  +---------------------------+

PHASE 2: Verification
  |-- Run full suite: npm run test:cucumber
      Verify: 608 unit + ~20 integration
      = ~628 total scenarios
```

---

## 4. Integration World Design

The key difference from the unit test World:
`createRealApp()` instead of `createApp()`.

```javascript
// Loads ALL classes in dependency order,
// mocks only external boundaries
function createRealApp() {
  installBrowserMocks();

  // Mock setInterval to prevent PopupView
  // keeping process alive
  const origSI = sharedWindow.setInterval;
  sharedWindow.setInterval =
    function(cb, ms) { return 0; };

  // Mock MutationObserver
  sharedWindow.MutationObserver = class {
    constructor(cb) { this._cb = cb; }
    observe() {}
    disconnect() {}
    trigger(mutations) {
      this._cb(mutations, this);
    }
  };

  // Load all classes in manifest order
  loadSourceFile(
    'chrome_manifest_v3/class_menuControl.js');
  loadSourceFile(
    'chrome_manifest_v3/class_waitCounter.js');
  loadSourceFile(
    'chrome_manifest_v3/class_eventTarget.js');
  loadSourceFile(
    'chrome_manifest_v3/class_observer.js');
  loadSourceFile(
    'chrome_manifest_v3/class_goog.js');
  loadSourceFile(
    'chrome_manifest_v3/class_trel.js');
  loadSourceFile(
    'chrome_manifest_v3/views/class_gmailView.js');
  loadSourceFile(
    'chrome_manifest_v3/views/class_popupForm.js');
  loadSourceFile(
    'chrome_manifest_v3/views/class_popupView.js');
  loadSourceFile(
    'chrome_manifest_v3/class_model.js');
  loadSourceFile(
    'chrome_manifest_v3/class_utils.js');
  loadSourceFile(
    'chrome_manifest_v3/class_app.js');

  const app = new G2T.App();

  sharedWindow.setInterval = origSI;

  return app;
}

// Helper: mock Trello.rest to return specific
// data per endpoint
function mockTrelloResponses(responseMap) {
  sharedWindow.Trello.rest =
    function(method, path, params,
             success, error) {
    const key =
      `${method.toUpperCase()} ${path}`;
    if (responseMap[key]) {
      success(responseMap[key]);
    } else {
      error({
        error: 'Not mocked: ' + key
      });
    }
  };
}

// Helper: wait for a specific event to fire
function waitForEvent(
    app, eventName, timeoutMs = 1000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(
        `Event ${eventName} not fired` +
        ` within ${timeoutMs}ms`)),
      timeoutMs);
    app.events.addListener(
      eventName, (event, params) => {
      clearTimeout(timer);
      resolve(params);
    });
  });
}
```

---

## 5. Risk Assessment

* **setInterval keeps process alive** --
  Mock before App construction, clearInterval
  in After hook
* **Classes loaded multiple times across
  scenarios** -- loadSourceFile is idempotent
  (re-eval overwrites)
* **Event listener accumulation across
  scenarios** -- Create fresh App per scenario
* **Trello.rest mock responses stale between
  scenarios** -- Reset in Before hook via
  installBrowserMocks
* **Async event chains hard to assert** --
  waitForEvent helper with timeout
