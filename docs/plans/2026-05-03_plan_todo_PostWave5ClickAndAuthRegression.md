# Post-Wave-5 Click and Auth Regression: Investigation Plan

**Date**: 2026-05-03
**Status**: TODO
**Branch**: `main` (WIP files dirty: `class_gmailView.js`, `class_popupView.js`,
plus four cucumber test files — see `git status`)
**Depends on**: Wave 5 shipped at
[Wave 5 Orch](<2026-04-27_plan_done_Wave5TrustedTypesAndJqueryReduction_Orch.md>)
(merged d35f634, version `3.2.0.002`).

## Goal

The G2T toolbar button now appears reliably in Gmail (race fixed by
`18997c4` + `7b0bfb9` + `86698a0` + WIP `e478f2b` + WIP `67b6c75`),
**but the popup is broken in production**:

* The popup opens, header reads literal `Username | Sign out | Help | Report
  [x]`, body shows `Loading...` forever. The `bindData()` path that
  populates the username and unhides `.content` never fires.
* Clicking `Username`, `Sign out`, `Help`, `Report` does nothing.
* Clicking the `[x]` close button hides the popup AND removes the G2T icon
  from the Gmail toolbar (it should only hide the popup).

The trace from the previous session shows the auth chain `(.011 to .021)`
DID run on a fresh load, so this is a regression in the popup's hydration
gates or a side-effect of where the popup is mounted.

## Hypotheses

* **Loading-stuck hypothesis**: `PopupForm.maybeHydrateGmail()` requires
  three flags all true: `domReady`, `persistReady`, `pendingGmailData`.
  One is failing to set. `bindData()` (which writes username, wires
  `#g2tSignOutButton`/`#report` click handlers) is gated behind that
  same function, which would explain both the literal `Username` text AND
  the dead header links in one shot.
* **Icon-disappears hypothesis**: the popup is appended INSIDE the Gmail
  toolbar element (`this._appendHtml(this.toolBar, this.html['popup'])` at
  `class_popupView.js:199` and `:208`). When `hidePopup()` flips
  `popup.style.display` to `none`, Gmail's mutation observer reacts and
  tears down the toolbar children, taking the G2T button with it. Fix
  is to mount the popup on `document.body`, NOT on the toolbar. Risk:
  may affect drag/resize, z-index, and `centerPopup()` math.

## Diagnostic snippets to run in the gmail2trello isolated-world devtools console

User opens Gmail, waits for G2T button to appear, clicks the button to open
the popup (which will be stuck on `Loading...`), then runs:

* Snapshot of hydration gates and Trello state:

```js
({
  domReady: app.popupView.form.domReady,
  persistReady: app.popupView.form.persistReady,
  pendingGmailData: !!app.popupView.form.pendingGmailData,
  lastGmailData: !!app.popupView.form.lastGmailData,
  trelloAuthorized: app.persist.trelloAuthorized,
  user: app.persist.user?.username || null,
  modelGmail: !!app.model.gmail,
  controllers: Object.keys(app.popupView.controllers || {}),
});
```

* Full ring buffer dump (chronological):

```js
copy(app.utils.log());
```

* Popup placement check (this confirms the icon-disappears hypothesis):

```js
({
  popupParent: document.querySelector('#g2tPopup')?.parentElement?.tagName,
  popupParentId: document.querySelector('#g2tPopup')?.parentElement?.id,
  popupParentClass: document.querySelector('#g2tPopup')?.parentElement?.className,
  buttonParent: document.querySelector('#g2tButton')?.parentElement?.tagName,
  toolbarHasButton: !!document.querySelector("[gh='mtb'] #g2tButton"),
  toolbarHasPopup: !!document.querySelector("[gh='mtb'] #g2tPopup"),
});
```

If `popupParent` is the same element as `buttonParent`, the icon-disappears
hypothesis is confirmed and the fix is to relocate the popup to
`document.body`.

## Fix order

* **Lane A (loading-stuck)**: read the hydration trace, identify which of
  `domReady` / `persistReady` / `pendingGmailData` is the laggard, fix the
  trigger or order. Likely candidate: `gmailDataReady` is emitted from
  `handleTrelloUserAndBoardsReady` only after Trello auth completes; if
  popup opens before auth finishes, `pendingGmailData` stays null and the
  popup is stuck. Acceptable answer: trigger `maybeHydrateGmail()` from a
  fourth path (popup-opened) so the popup re-checks its inputs when the
  user actually opens it.
* **Lane B (icon-disappears)**: append `#g2tPopup` to `document.body`
  instead of `this.toolBar`. Audit:
  * `class_popupView.js:199`, `:208` (the appendHtml call sites)
  * `centerPopup()` math (uses `this.g2tButton.offsetLeft/Width` plus
    `offsetParent` — needs to compute coordinates relative to viewport,
    not relative to the toolbar)
  * `resetDragResize()` containment (`'window'` is already viewport-relative
    so probably fine)
  * `validateButtonState()` Check 2 — currently looks for popup INSIDE
    toolbar, must be loosened
  * close button `hidePopup` cleanup — should still work since it just
    flips display

## Defensive instrumentation kept in WIP

The three `app.utils.log` lines we added in `class_popupView.js`
(`handleDetectButton` x2, `handleGmailLoaded`) and the `detectButton` emit
in `class_gmailView.js:detectToolbar_onTimeout` should stay until both
Lane A and Lane B are resolved AND the user confirms a clean fresh-load
trace. Then strip them, bump to `3.2.0.003`, ship.

## Out of scope

* The new sidepanel-based G2T variant ("G2T Panel" working name). Tracked
  under a separate plan tree at
  [G2T Panel Orch (Chk1 Skateboard)](<2026-05-03_plan_todo_Chk1Skateboard_Orch.md>)
  (TODO, file may not exist yet at time of read).
* `SyncPrivacyPolicyToTrelloCard` — separate untouched track.
* Any further jQuery removal. The remaining jQuery surface is jQuery UI
  (draggable, resizable, autocomplete, tooltip, button) and `combo.js`,
  which were intentionally retained per Wave 5 Lane 6 assessment.

## What "done" looks like

* Fresh Gmail load, no cached auth: G2T button appears, click opens popup,
  popup transitions from `Loading...` to fully hydrated within 5 seconds,
  user can pick a board / list / card, hit Add to Trello, and the card is
  created.
* Click `[x]` close: popup hides, G2T button STAYS in the Gmail toolbar.
* Re-click G2T button: popup reopens with last state intact.
* `npm test` passes (currently 653/653).
* All three `app.utils.log` diagnostic lines stripped.
* Version bumped to `3.2.0.003` in `manifest.json` + `package.json` +
  `package-lock.json`.
* `CHANGES.md` block appended dated today summarizing the Wave 5 follow-up
  fixes.
