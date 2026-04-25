# Lane 2: Submit Guard in class_popupForm.js

**Date**: 2026-04-15
**Status**: DONE (2026-04-25)
**File**: `chrome_manifest_v3/views/class_popupForm.js`
**Fixes**: RACE-5 (double submit creates duplicate cards)

## Problem

`handleSubmit()` (line 1041) builds a `newCard` object and calls
`this.parent.app.model.submit(newCard)` with no guard. If the user clicks the
submit button twice before the first API call returns, two identical cards are
created and attachments are uploaded twice.

## Design

A `_submitting` boolean flag checked at the top of `handleSubmit()`, reset on
completion or failure. This is the simplest correct solution for a binary
in-progress state.

## Changes to class_popupForm.js

### Step 1: Add flag to constructor (line 16)

```javascript
constructor(args) {
  this.parent = args.parent;
  this.app = args.app;
  this.isInitialized = false;
  this.domReady = false;
  this.persistReady = false;
  this.checkboxHandlersBound = false;
  this.accessibilityHandlersBound = false;
  this.dataBound = false;
  this.pendingGmailData = null;
  this.lastGmailData = null;
  this._submitting = false;  // <-- NEW
}
```

### Step 2: Guard handleSubmit (line 1041)

```javascript
handleSubmit() {
  if (this._submitting) return;
  this._submitting = true;

  // Build the submission data object from app state
  const newCard = {
    // ... existing fields unchanged ...
  };

  // Pass the complete data object to model.submit
  this.parent.app.model.submit(newCard);
}
```

### Step 3: Reset on completion (handleNewCardUploadsComplete, line 1102)

```javascript
handleNewCardUploadsComplete(target, params) {
  this._submitting = false;
  this.displaySubmitCompleteForm(params);
}
```

### Step 4: Reset on failure (handleAPIFail, line 1098)

```javascript
handleAPIFail(target, params) {
  this._submitting = false;
  this.displayAPIFailedForm(params);
}
```

### Step 5: Listen for createCard_failed (bindEvents, after line 1176)

The `createCard_failed` event is emitted by Uploader/Trel on card creation
failure but PopupForm does not currently listen for it. Add:

```javascript
this.app.events.addListener(
  'createCard_failed',
  this.handleCreateCardFailed.bind(this),
);
```

And add the handler:

```javascript
handleCreateCardFailed(target, params) {
  this._submitting = false;
  this.displayAPIFailedForm(params);
}
```

## Cucumber scenarios to add (popupForm.feature)

```gherkin
# ------------------------------------------------------------------
# Submit Guard
# ------------------------------------------------------------------

Scenario: handleSubmit sets _submitting to true
  Given the PopupForm is ready for submit
  When handleSubmit is called on the PopupForm
  Then PopupForm._submitting is true

Scenario: Second handleSubmit while _submitting is blocked
  Given the PopupForm is ready for submit
  And handleSubmit has been called once
  When handleSubmit is called again
  Then model.submit was called exactly once

Scenario: _submitting resets on newCardUploadsComplete
  Given PopupForm._submitting is true
  When handleNewCardUploadsComplete is called
  Then PopupForm._submitting is false

Scenario: _submitting resets on APIFail
  Given PopupForm._submitting is true
  When handleAPIFail is called
  Then PopupForm._submitting is false

Scenario: _submitting resets on createCard_failed
  Given PopupForm._submitting is true
  When handleCreateCardFailed is called
  Then PopupForm._submitting is false

Scenario: handleSubmit works again after success
  Given the PopupForm is ready for submit
  And handleSubmit has been called once
  And handleNewCardUploadsComplete fires
  When handleSubmit is called again
  Then model.submit was called exactly twice
```

## Risk

* **Flag stuck in submitting state**: mitigated by resetting on both success AND
  all failure paths. The `createCard_failed` listener is new and covers the gap
  where card creation fails but `APIFail` is not emitted directly to PopupForm.
