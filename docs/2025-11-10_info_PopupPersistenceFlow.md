# Popup Persistence and UI Sync Flow

## Scope

This document traces how Gmail-2-Trello loads persisted popup settings (`useBackLink`, `addCC`, `markdown`) and maps them onto the popup UI checkboxes. It highlights the event sequence from extension bootstrap through Trello/Gmail data readiness, and calls out places where the current chain allows state drift.

## High-Level Timeline

1. **Service worker → content script bootstrap**  
   - `content-script.js` instantiates `G2T.App` and waits for the `g2t_initialize` runtime message.  
   - On receipt, it runs `app.init()` (deferred with `jQuery(function () { … })`) and injects Gmail scraping helpers.

2. **`App.init()` wiring (`chrome_manifest_v3/class_app.js`)**  
   - Registers for `classAppStateLoaded`.  
   - Instantiates `Observer`, `Model`, `GmailView`, `PopupView`, and `Utils`; each component immediately binds its own listeners.  
   - Calls `persistLoad()`, which triggers `Utils.loadFromChromeStorage('g2t_app', 'classAppStateLoaded')`.

3. **Persist load completion**  
   - `Utils.loadFromChromeStorage` retrieves JSON, caches a hash, and emits `classAppStateLoaded`.  
   - `App.handleClassAppStateLoaded` merges the saved object into `app.persist`, updating defaults before any UI hydration occurs. No UI notification is dispatched here.

4. **Popup DOM creation (`PopupView`)**  
   - Gmail toolbar detection eventually calls `PopupView.finalCreatePopup()`, which loads `views/popupView.html` and emits `popupLoaded`.  
   - `PopupView.handlePopupLoaded()` captures DOM handles, binds checkbox `change` handlers that mutate `app.persist.*`, and calls `resetDragResize()`. At this stage the checkboxes reflect static HTML defaults (all checked).

5. **Popup visibility**  
   - When the user opens the popup, `PopupView.showPopup()` emits `onPopupVisible`.  
   - `PopupView.handlePopupVisible()` shows a loading message and invokes `Model.load()`.

6. **Trello user + boards readiness (`Model`)**  
   - `Model.load()` either reuses cached data (if `app.temp.boards` already populated) or kicks off `trelloLoad()`.  
   - Successful board/user fetches emit `trelloUserAndBoardsReady`.

7. **Gmail data ready (`GmailView`)**  
   - `GmailView.handleTrelloUserAndBoardsReady()` parses the current Gmail thread using the Trello user’s full name, then emits `gmailDataReady`, passing the assembled mail body/metadata bundle.

8. **Popup form hydration (`PopupForm`)**  
   - `PopupForm.handleGmailDataReady()` executes:  
     1. `bindData()` – currently sets `#chkBackLink` and `#chkCC` based on `app.persist.*` if defined.  
     2. `bindGmailData()` – merges `app.persist` onto the Gmail payload (`Object.assign(data, this.app.persist || {})`) before calculating body/link text via `updateBody()`.  
     3. `updateBoards()` – refreshes Trello selectors and finally reveals the content pane.

9. **User interactions**  
   - Checkbox `change` handlers (bound in `handlePopupLoaded`) push fresh values into `app.persist.*` and immediately call `PopupForm.updateBody()` so the description reflects the toggle state.
   - Persist writes happen lazily: `app.persist` is only flushed via `App.persistSave()` when other flows invoke it.

## Observed Pain Points

- **Markdown checkbox never re-hydrated.**  
  `bindData()` only copies `useBackLink` and `addCC` into the DOM. The Markdown control stays at the HTML default (`checked`), while `updateBody()` respects whatever `app.persist.markdown` was merged in. That’s how we end up with contradictory UI vs. payload.

- **Hydration requires multiple prerequisites but has no explicit gate.**  
  The final `bindGmailData()` assumes:  
  - `app.persist` already merged,  
  - popup DOM loaded,  
  - Gmail data parsed, and  
  - Trello boards fetched.  
  Today the ordering holds only because everything races toward `gmailDataReady`. There’s no guarantee that `popupLoaded` has fired before that event, so early emissions risk mutating attributes on detached DOM.

- **Persist state and UI sync live in different classes.**  
  Checkbox defaults come from `PopupForm`, change handlers live in `PopupView`, and the persistent object resides on `App`. Debugging requires hopping across all three.

## Recommended Simplifications

1. **Create a single hydration hook.**  
   Add `PopupView.syncCheckboxesFromPersist()` (or similar) that reads `app.persist` and updates `#chkMarkdown`, `#chkBackLink`, and `#chkCC`. Invoke it on both `popupLoaded` and `classAppStateLoaded`, ensuring late-arriving storage still updates the UI.

2. **Initialize every persisted flag in `app.persist`.**  
   Setting `markdown: true` alongside `useBackLink`/`addCC` eliminates `undefined` flows and makes intent obvious.

3. **Defer `bindGmailData()` until DOM + persist are ready.**  
   Track readiness via simple booleans (e.g., `this.domReady`, `this.persistReady`) within `PopupForm`, and call `bindData()` only when both are true. That removes hidden ordering dependencies.

4. **Centralize checkbox change handling.**  
   Move the `change` handlers into `PopupForm` so the class that hydrates the inputs also owns persistence updates. This keeps state transitions localized and easier to test.

Together these adjustments would guarantee a consistent “persist → UI → persist” loop and prevent the Markdown toggle from drifting out of sync with the data sent to Trello.
