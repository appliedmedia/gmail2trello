# Lane 1: Popup Lazy Create and Destroy

**Date**: 2026-05-04
**Status**: done (merged via PR #151 as commit dc6b935 on 2026-05-07; version bumped to 3.2.0.004)
**Parent**:
[Close Box Fix and Manual Test Automation Orch](<2026-05-04_plan_inProgress_CloseBoxFixAndManualTestAutomation_Orch.md>)
**Approach decided**: 2026-05-04. The simple "relocate popup to body"
option was discarded in favour of a full lazy create/destroy lifecycle
because the user confirmed PopupForm already restores its last saved
state from `app.persist` and `app.temp`, which removes the only real
cost of teardown on close.

## Static trace findings (already done)

* `class_popupView.js:714` close-button click handler calls
  `this.hidePopup()`. That handler at `class_popupView.js:443` only
  aborts document-level controllers and sets `this.popup.style.display
  = 'none'`. **It does not remove the button.**
* The popup HTML is appended to `this.toolBar` (the Gmail `[gh='mtb']`
  element) at three sites: `class_popupView.js:154` (button), `:181`
  (popup, cached path), and `:190` (popup, file-load path). The button
  must stay in the toolbar; the popup does not.
* Mounting popup inside the toolbar is a deliberate lifecycle coupling
  so that Gmail's view-change-driven re-render of the toolbar tears
  down both button and popup together. Evidence:
  `validateButtonState()` Check 1 (`class_popupView.js:504`) explicitly
  removes any `#g2tPopup` it finds when the button is detected as
  detached. The popup has no independent reason to remain.
* The cost of that coupling is the bug we are fixing: any mutation to
  the popup (`display` flip on close) triggers Gmail's mutation
  observer, which re-renders the toolbar and orphans the button.

## Why lazy create/destroy beats simple relocate

* Eliminates the icon-disappearance bug. The popup is only mounted
  while the user has it open, so close clicks remove the popup
  entirely from the DOM, not via a `display` flip on a toolbar child.
* Eliminates the orphaned-popup risk that simple relocation
  introduces. There is no popup to orphan on view change because the
  popup does not exist between opens.
* Aligns with the existing `app.persist` and `app.temp` state model.
  Form state survives across mount cycles via PopupForm's
  `onPersistReady`, `syncCheckboxesFromPersist`, and the model's
  cached Trello data. User-confirmed 2026-05-04.
* No new event plumbing required between Gmail-view-changed and popup
  cleanup. The popup is gone whenever the user is not actively using
  it.

## Implementation steps

* **Strip eager popup append from `finalCreatePopup`.**
  * `class_popupView.js:179-197`. Keep the file-load path (`loadFile`)
    so the popup HTML still ends up in `this.html['popup']`, but stop
    calling `_appendHtml(this.toolBar, ...)` for the popup. The button
    append at `:154` stays.
  * Remove the `popupLoaded` event emit from `:183` and `:191`. The
    event-driven binding moves to a new path explained below.
* **New `mountPopup()` helper on PopupView.**
  * Appends `this.html['popup']` to `document.body` via
    `_appendHtml(document.body, this.html['popup'])`.
  * Calls `handlePopupLoaded()` directly so DOM bindings happen
    immediately (no event hop).
  * Returns true if the mount succeeded, false if `this.html['popup']`
    is not yet cached.
* **Rewrite `showPopup`.**
  * `class_popupView.js:331`. New shape:
    * If `#g2tPopup` is not in the DOM, call `mountPopup()`. If that
      returns false, defer until popup HTML is available (early
      return; `loadFile` callback can re-trigger).
    * Re-resolve `this.popup`, `this.popupMessage`, `this.popupContent`
      from `document.querySelector` (already done in
      `handlePopupLoaded` at `class_popupView.js:687-690`).
    * Bind document-level controllers (keydown, mousedown, focusin)
      as today.
    * `this.popup.style.display = 'block'`.
    * Emit `onPopupVisible`.
* **Rewrite `hidePopup`.**
  * `class_popupView.js:443`. New shape:
    * Abort all document-level controllers (keydown, mouseup,
      mousedown, focusin, reload). Already done.
    * Abort all popup-internal controllers (closeBtn, submit, signOut,
      authorize, addToTrello, boardChange, listChange, cardChange,
      positionChange, positionKeyup, dueShortcuts, positionTemp,
      dueDate, dueTime, title, desc, tag_attachment, tag_image,
      g2tButtonMousedown, g2tButtonMouseenter, g2tButtonMouseleave —
      the last three stay because they belong to the BUTTON, not the
      popup).
    * Reset PopupForm controllers: `change_useBackLink`,
      `change_addCC`, `change_markdown`, `keyupCheckbox`. Reach into
      `this.form.controllers` and abort each.
    * Remove the popup element: `this.popup?.remove()`.
    * Null out `this.popup`, `this.popupMessage`, `this.popupContent`.
    * **Reset hydration / binding flags so the next open re-runs
      first-time setup:**
      * `this.isInitialized = false` (PopupView).
      * `this.comboInitialized = false` (PopupView, line 79).
      * `this.form.domReady = false` (PopupForm, line 20).
      * `this.form.checkboxHandlersBound = false` (line 22).
      * `this.form.accessibilityHandlersBound = false` (line 23).
      * `this.form.dataBound = false` (line 24).
      * Leave `this.form.persistReady` alone. Persist data is loaded
        once at app start and stays valid across mount cycles.
      * Leave `this.form.lastGmailData` alone. The form's hydration
        cache is exactly the "last saved state" the user mentioned.
* **Update `popupVisible`.**
  * `class_popupView.js:456`. Add a `document.body.contains(this.popup)`
    check before reading `getComputedStyle`. Returns false cleanly
    when the popup is unmounted.
* **Update `centerPopup` to be viewport-relative.**
  * `class_popupView.js:208`. Replace `this.g2tButton.offsetLeft` /
    `offsetWidth` / `offsetParent` math with
    `this.g2tButton.getBoundingClientRect()` so coordinates are
    viewport-relative. Add `window.scrollX` to the left math (popup
    is `position: absolute` to body per `style.css:3-4`).
  * Replace `parentEl.offsetLeft + parentEl.offsetWidth` with
    `window.innerWidth`.
  * Keep min/max clamp logic unchanged.
* **Loosen `validateButtonState()` Check 1 and Check 2.**
  * `class_popupView.js:504-512` (Check 1) currently removes the
    popup when the button is detached. Under lazy create the popup
    will rarely be present at that moment, but if it is, removing it
    is still correct (the button just died; the user has no way to
    re-open the popup without the button). Leave as a defensive
    cleanup but tolerate the popup being absent.
  * `class_popupView.js:514-527` (Check 2) currently re-injects the
    button AND removes any popup. The popup-removal half should be
    kept because a popup mounted while the button was getting
    re-injected would be orphaned. Same reasoning as Check 1.
* **`finalCreatePopup` button-relocation branch.**
  * `class_popupView.js:162-176` moves both `singleButton` and
    `singlePopup` back into the toolbar when fixing duplicates.
    Remove the popup half. `singlePopup` (if any) should just be
    removed, since lazy create will rebuild it on next open.
* **Audit `resetDragResize()`.**
  * `class_popupView.js:256`. Containment is `'window'`, viewport-
    relative, no change needed. But the call is currently in
    `handlePopupLoaded`, which under lazy create will run on every
    `mountPopup`. Confirm jQuery UI tolerates re-applying
    `.draggable()` and `.resizable()` to a fresh DOM element each
    time. Expected fine because the OLD element is gone from the DOM
    so jQuery UI's data on it is unreachable.
* **Audit `displayExtensionInvalidReload`.**
  * `class_popupView.js:595`. Calls `this.form.showMessage(this, ...)`
    which writes into `this.popupMessage`. Under lazy create the
    popup may not be mounted at the moment Chrome invalidates the
    extension context. Need to either mount on demand here or queue
    the message and surface it on next open. Defer to follow-up if
    time-pressed; not a blocker for the close-box bug.

## State that survives across mount cycles

These do NOT need reset and are the source of the "popup remembers
where I was" behaviour the user confirmed:

* `this.app.persist.boardId`, `listId`, `cardId`, `labelsId`,
  `popupWidth`, `useBackLink`, `addCC`, `markdown`, `trelloAuthorized`,
  `user`. Lives in `chrome.storage.sync`, loaded once at app start.
* `this.app.temp.title`, `description`, `dueDate`, `dueTime`,
  `position`, `cardPos`, `cardMembers`, `cardLabels`. In-memory across
  popup cycles.
* `this.app.model.trello` (cached boards, lists, cards, labels,
  members) and `this.app.model.gmail` (current email payload).
* `this.html['popup']` and `this.html['add_to_trello']` (cached HTML
  templates).
* `this.form.lastGmailData` (used by `maybeHydrateGmail` to repopulate
  title/desc on re-open).
* `this.form.persistReady` (set true once at startup; stays true).

## Risks

* **jQuery UI on re-applied draggable/resizable.** Each
  `mountPopup` calls `resetDragResize` against a brand-new DOM
  element. jQuery UI stores instance data on the element via
  `.data()`; with the element gone, the data is unreachable, so a
  fresh `.draggable()` should work cleanly. Worth a one-line
  Playwright assert that the popup can be dragged after re-open.
* **Combobox re-init.** `class_popupForm.js:1070` sets
  `this.parent.comboInitialized = true` on first init and the path
  at `:1077` short-circuits when already initialized. With the flag
  reset on each `hidePopup`, combo will re-initialize each open.
  Need to verify `comboBox` jQuery plugin tolerates being re-initialized
  on a brand-new select element each time.
* **Pending message queuing.** The `pendingMessage` mechanism at
  `class_popupView.js:695-701` was designed for the gap between
  `handlePopupLoaded` and a `showMessage` call that arrived too
  early. Under lazy create that gap is wider (popup does not exist
  most of the time). Audit all `this.form.showMessage(...)` callers
  to confirm they either gate on `popupVisible()` or queue cleanly.
* **`displayExtensionInvalidReload` regression.** Already noted
  above; deferring.
* **`handlePopupVisible` -> `model.load()`.**
  `class_popupView.js:621-627` triggers a Trello data load every
  time the popup becomes visible. Already idempotent (the model has
  its own cascade-tracker from Wave 2 Lane 3). No change.

## Test plan

* `npm test` (Cucumber). Existing 653 scenarios should stay green.
* New Cucumber scenarios:
  * "After clicking the close button, `#g2tPopup` is removed from the
    DOM and `[gh='mtb'] #g2tButton` is still present."
  * "After re-opening the popup, board/list/card selections from the
    previous session are restored."
  * "Re-opening the popup after a Gmail view change reflects the new
    email's title/description (no stale data from the prior view)."
* Real-browser confirmation: Lane 2's first Playwright spec.

## Acceptance criteria

* Popup is not mounted when not visible. `document.querySelector
  ('#g2tPopup')` returns null between opens.
* Clicking the G2T button creates the popup, mounts it on body, and
  shows it within one frame.
* Clicking `[x]` removes the popup entirely; the G2T button remains
  in the toolbar (verified by `[gh='mtb'] #g2tButton`).
* Re-opening the popup restores last board / list / card / position /
  due date / title / description selections.
* Drag and resize work on a freshly mounted popup.
* `npm test` is green; no new ESLint or Prettier violations.

## Out of scope

* Lane A of PostWave5 plan (loading-stuck hydration gates). The lazy
  lifecycle changes the surface area for that bug; if Lane A
  symptoms reappear after this lane lands, treat as a fresh fix.
* `displayExtensionInvalidReload` rework. Deferred.
* Re-centering popup on window resize (follow-up).
* Restoring the `mouseup`-outside-popup auto-close (currently
  commented out at `class_popupView.js:364`).
