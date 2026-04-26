# Wave 4 Manual Test Matrix

Target version: `3.2.0.001`. This checklist covers behaviors that the
Cucumber suite cannot exercise: real Chrome MV3 packaging, real Gmail DOM,
real Trello OAuth, real attachment upload. Run against an unpacked build
loaded from `chrome_manifest_v3/` before publishing to the Chrome Web Store.
Expect to finish in under 20 minutes against a Trello account that already
has at least one board with a few lists and cards.

## Setup

* [ ] Open `chrome://extensions`, enable Developer mode, click "Load unpacked", select `chrome_manifest_v3/`.
* [ ] Confirm the extension shows version `3.2.0.001`.
* [ ] Open Gmail in the same Chrome profile and sign in.
* [ ] Click the G2T toolbar icon and sign in to Trello via the popup.

## Detection (Wave 1 surface)

* [ ] Open an email thread; the G2T button appears in the Gmail toolbar within 2 seconds.
* [ ] Switch to a different thread; the button stays present.
* [ ] Reopen the popup on the new thread; subject and body reflect the new thread, not the old one.
* [ ] Switch Gmail into split-pane (preview) layout; the button still appears for the previewed thread.

## Add new card (baseline)

* [ ] Pick a board, a list, a label, and a due date; submit.
* [ ] In Trello, the new card appears with the email body, the Gmail backlink, and the chosen label and due date.
* [ ] Toggle the position to "top of list"; submit again from a different email; verify the new card lands at the top.
* [ ] Toggle the position to "bottom of list"; submit again; verify position.

## Add to existing card (Wave 3 surface)

* [ ] Switch the popup into "add to existing card" mode.
* [ ] Pick a card from the dropdown and submit.
* [ ] In Trello, the email body appears as a comment on the existing card, not as a new card.
* [ ] If the email had an attachment, that attachment lands on the existing card.

## Race hardening (Wave 2 surface)

* [ ] Rapidly click between two different boards; the form ends up populated with the last-clicked board's lists, labels, and members, with no mix.
* [ ] Rapidly click between two different lists in "add to existing card" mode; the card dropdown shows only the last-clicked list's cards.
* [ ] Double-click the submit button; exactly one card (or one comment) is created in Trello.

## Attachments

* [ ] Send yourself an email with one inline image and one file attachment; submit; both arrive on the new card with sensible filenames.
* [ ] Send yourself an email with a Gmail attachment large enough to need the background-script fetch path (a few MB); submit; the attachment uploads without CORS or CORB errors in DevTools.

## Sign-out and reload

* [ ] Click the popup's sign-out control; confirm the popup forces a reload.
* [ ] After reload, the next G2T popup re-prompts for Trello authentication.

## Options page

* [ ] Open the options page from `chrome://extensions` (Details, Extension options).
* [ ] Confirm all controls render.
* [ ] Change a setting, close the page, reopen it; the setting persists.

## Privacy (UA removal surface)

* [ ] With DevTools Network tab open, exercise the extension end-to-end.
* [ ] Filter for `google-analytics`; confirm zero requests.
* [ ] Filter for `analytics.google.com`; confirm zero requests.
* [ ] Only Trello (`api.trello.com`, `trello.com`) and Gmail traffic should appear from the extension's activity.

## Sign-off

* [ ] All boxes above checked, or each unchecked box has a written reason in the PR description.
* [ ] Tester name and date recorded in the PR description.
