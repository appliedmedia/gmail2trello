# PopupView Refactor Plan

## Overview

Split `PopupView` into two classes:

- `PopupView` - popup lifecycle, events, chrome API
- `PopupForm` - form data, validation, UI updates

## PopupView Class (Core Popup Management)

### Constructor & State

- `constructor(args)`
- `get state()` / `set state(newState)`
- `persistLoad()`
- `persistSave()`

### Popup Lifecycle

- `finalCreatePopup()`
- `showPopup()`
- `hidePopup()`
- `popupVisible()`
- `centerPopup(useWidth)`
- `onResize()`
- `resetDragResize()`
- `toggleActiveMouseDown(elm)`

### Chrome API & Version Management

- `getManifestVersion()`
- `handleChromeAPIError(error, operation)`
- `periodicChecks()`
- `forceSetVersion()`
- `showSignOutOptions(data)`
- `displayExtensionInvalidReload()`

### Event Handlers

- `handlePopupVisible()`
- `handlePeriodicChecks()`
- `handleDetectButton()`
- `handleBeforeAuthorize()`
- `handleAuthorizeFail()`
- `handleAuthorized()`
- `handleBeforeLoadTrello()`
- `handleTrelloDataReady()`
- `handleRuntimeMessage(request, sender, sendResponse)`
- `handlePopupViewInitDone()`
- `handlePopupLoaded()`

### Event Binding

- `bindEvents()`
- `bindPopupEvents()`

### Initialization

- `init()`

## PopupForm Class (Form Management)

### Form Data & Validation

- `validateData()`
- `bindData(data)`
- `bindGmailData(data = {})`
- `updateBody(data = {})`
- `mime_array(tag)`
- `reset()`

### UI Updates

- `updateBoards(tempId = 0)`
- `updateLists(tempId = 0)`
- `updateCards(tempId = 0)`
- `updateLabels()`
- `updateMembers()`
- `clearBoard()`
- `clearLabels()`
- `clearMembers()`
- `toggleCheckboxes(tag)`

### Form Display

- `showMessage(parent, text)`
- `hideMessage()`
- `displaySubmitCompleteForm(params)`
- `displayAPIFailedForm(response)`

### Form Components

- `comboBox(update)`
- `mime_html(tag, isImage, data)`

### Form Actions

- `submit()`

### Form Event Handlers

- `handleBoardChanged(target, params)`
- `handleListChanged(target, params)`
- `handleSubmit()`
- `handleCheckTrelloAuthorized()`
- `handleRequestDeauthorizeTrello()`
- `handleLoadTrelloListSuccess()`
- `handleLoadTrelloCardsSuccess()`
- `handleLoadTrelloLabelsSuccess()`
- `handleLoadTrelloMembersSuccess()`
- `handleAPIFailure(target, params)`
- `handleNewCardUploadsComplete(target, params)`
- `handleOnMenuClick(target, params)`

## Relationship

- `PopupView` owns `PopupForm` as `this.form`
- `PopupView` delegates form operations to `this.form`
- `PopupForm` gets `this.popupView` reference for DOM access
- `PopupForm` fires events that `PopupView` listens to

## Event Binding Rules

- Event listeners should only register handlers that are in their own class
- If a handler is earmarked for the other class, the `addListener` should happen in that other class's `bindEvents()` method
- PopupView event listeners → PopupView handlers
- PopupForm event listeners → PopupForm handlers

## Implementation Order

1. Create `PopupForm` class with form methods
2. Update `PopupView` to own and delegate to form
3. Move event handlers to appropriate classes
4. Update event bindings and references
5. Test form functionality
6. Test popup lifecycle

## Method Move Process

1. **COPY THE METHOD TO THE FORM CLASS**
2. **UPDATE THE CALLERS TO USE THE FORM VERSION OF THE METHOD**
3. **UPDATE THE METHOD NAME TO INCLUDE \_deprecated**
4. **LEAVE IT THE FUCK ALONE AND DONT TOUCH IT OR USE IT EVER AGAIN**
5. **UPDATE THE TESTS TO PROVE THE NEW METHOD IN THE FORM CLASS IS WORKING CORRECTLY**

## Goal Clarification

The primary goal is **refactoring** the large PopupView class into two focused classes:

- **PopupView** - popup lifecycle, events, chrome API
- **PopupForm** - form data, validation, UI updates

The deprecation process is merely a **follow-up step** to safely transition old methods after they've been moved to the form class. This ensures the refactor can be done gradually without breaking existing functionality.
