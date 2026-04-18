# Lane 1: Version Counter in class_trel.js

**Date**: 2026-04-15
**Status**: TODO
**File**: `chrome_manifest_v3/class_trel.js`
**Fixes**: RACE-2 (stale board data on rapid switch),
RACE-3 (stale cards on rapid list switch)

## Problem

Every `getLists`, `getCards`, `getLabels`, `getMembers` call blindly accepts the
API response and writes it to `app.temp`. When a user rapidly switches boards or
lists, older responses can arrive after newer ones and silently overwrite correct
data with stale data.

There is no request ID, no AbortController, and no staleness check.

## Design

Add a monotonically increasing version counter per API category. Each outgoing
request captures the current version. Success callbacks compare the captured
version to the current version and discard stale responses.

AbortController is not viable because Trello.js uses jQuery.ajax internally.

## Changes to class_trel.js

### Step 1: Add state to constructor (line 19)

```javascript
constructor({ app } = {}) {
  this.app = app;
  this._requestVersions = { lists: 0, cards: 0, labels: 0, members: 0 };
  this.bindEvents();
}
```

### Step 2: Add two helper methods (after constructor)

```javascript
_nextVersion(category) {
  return ++this._requestVersions[category];
}

_isCurrentVersion(category, version) {
  return this._requestVersions[category] === version;
}
```

### Step 3: Update four fetch methods

Each fetch method captures a version and passes it to a closure-wrapped callback.
Four methods need this pattern: `getLists`, `getCards`, `getLabels`, `getMembers`.

Example for `getLists` (lines 306-313):

```javascript
getLists(boardId) {
  const version = this._nextVersion('lists');
  this.wrapApiCall(
    'get',
    `boards/${boardId}/lists`,
    {},
    (data) => this.getLists_success(data, version),
    this.getLists_failure.bind(this),
  );
}
```

### Step 4: Update four success callbacks

Each callback checks version before accepting data.

Example for `getLists_success` (lines 320-326):

```javascript
getLists_success(data, version) {
  if (!this._isCurrentVersion('lists', version)) {
    this.app.utils.log('Discarding stale lists response');
    return;
  }
  this.app.utils.log(
    `${this.ck.apiCallPrefix} Lists data retrieved successfully`,
  );
  this.app.temp.lists = data;
  this.app.events.emit('loadTrelloLists_success', { data });
}
```

Same pattern for `getCards_success`, `getLabels_success`, `getMembers_success`.

## Methods NOT changed

* `getUser`, `getBoards`: called once per session, not subject to rapid switching
* `createCard`, `createCard_success`: write path, not read path
* `wrapApiCall`: generic wrapper, version logic stays in callers
* `authorize`, `deauthorize`: auth flow, unrelated

## Cucumber scenarios to add (trel.feature)

```gherkin
# ------------------------------------------------------------------
# Request Versioning
# ------------------------------------------------------------------

Scenario: _nextVersion increments counter for category
  When _nextVersion is called with "lists"
  Then the lists version is 1
  When _nextVersion is called with "lists"
  Then the lists version is 2

Scenario: _isCurrentVersion returns true for latest version
  When _nextVersion is called with "cards"
  Then _isCurrentVersion for "cards" with version 1 is true

Scenario: _isCurrentVersion returns false for stale version
  When _nextVersion is called with "cards"
  And _nextVersion is called with "cards"
  Then _isCurrentVersion for "cards" with version 1 is false
  And _isCurrentVersion for "cards" with version 2 is true

Scenario: Independent categories do not affect each other
  When _nextVersion is called with "lists"
  And _nextVersion is called with "cards"
  Then _isCurrentVersion for "lists" with version 1 is true
  And _isCurrentVersion for "cards" with version 1 is true

Scenario: getLists_success with current version updates temp.lists
  Given _nextVersion is called with "lists" returning version 1
  When getLists_success is called with sample data and version 1
  Then app.temp.lists contains the sample data

Scenario: getLists_success with stale version discards response
  Given _nextVersion is called with "lists" returning version 1
  And _nextVersion is called with "lists" returning version 2
  When getLists_success is called with stale data and version 1
  Then app.temp.lists is unchanged

Scenario: Rapid getLists calls invalidate earlier responses
  Given getLists is called for board "A"
  And getLists is called for board "B"
  When board A response arrives
  Then app.temp.lists is unchanged
  When board B response arrives
  Then app.temp.lists contains board B data
```

## Step definitions to add (trel.steps.js)

* Expose `_requestVersions` for assertions
* Call `_nextVersion` / `_isCurrentVersion` directly
* For integration scenarios, stub `wrapApiCall` to capture the callback and
  invoke it manually with controlled ordering

## Risk

* **Version counter discards valid response**: only possible if same-category
  request fires between the original request and its response. This is the exact
  scenario we want to discard.
* **Counter overflow**: JavaScript `Number.MAX_SAFE_INTEGER` is 9007199254740991.
  Not a concern.
