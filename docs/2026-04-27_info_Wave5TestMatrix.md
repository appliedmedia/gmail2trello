# Wave 5 Manual Test Matrix

Target version: `3.2.0.002`. This checklist extends the Wave 4 matrix with
Trusted-Types and jQuery-4 specific scenarios that would have caught the
original ship-blocker. Run against an unpacked build loaded from
`chrome_manifest_v3/` before publishing to the Chrome Web Store. Expect to
finish in under 25 minutes; the TT-specific section is the gating one.

## Wave 5 specific (Trusted Types + jQuery 4)

* [ ] Open `chrome://extensions`, enable Developer mode, click "Load unpacked", select `chrome_manifest_v3/`.
* [ ] Confirm the extension shows version `3.2.0.002`.
* [ ] Open Gmail in the same Chrome profile.
* [ ] Open DevTools console BEFORE refreshing the page; clear any existing log lines.
* [ ] Refresh the page. Expect zero log lines containing `TrustedHTML`, `Trusted Types`, `htmlPrefilter`, or `requires 'TrustedHTML'`.
* [ ] Confirm the G2T button is visible in Gmail's toolbar.
* [ ] Click the G2T button. Confirm the popup renders. Confirm zero TT-related errors during the click.
* [ ] Open an email. Confirm the popup auto-fills with the email's subject, body, sender, and CC (the gmail.js view-email path).
* [ ] Switch to a different email in the same thread. Confirm the popup refreshes the body / sender data.
* [ ] Switch boards in the popup. Confirm lists, labels, members all populate correctly (the cascade-tracker path).
* [ ] Add a new card. Confirm the card creates in Trello.
* [ ] Add to existing card. Confirm the card-search dropdown filters via the combobox (jQuery UI dependency confirmation).
* [ ] Close the popup by clicking outside. Confirm the global keydown/mouseup teardown still works (the AbortController-based rebinds from Lane 2).
* [ ] Sign out. Sign back in. Confirm the popup remounts cleanly.

## Wave 4 regression matrix (re-run for 3.2.0.002)

### Setup

* [ ] Confirm the extension shows version `3.2.0.002`.
* [ ] Open Gmail in the same Chrome profile and sign in.
* [ ] Click the G2T toolbar icon and sign in to Trello via the popup.

### Detection (Wave 1 surface)

* [ ] Open an email thread; the G2T button appears in the Gmail toolbar within 2 seconds.
* [ ] Switch to a different thread; the button stays present.
* [ ] Reopen the popup on the new thread; subject and body reflect the new thread, not the old one.
* [ ] Switch Gmail into split-pane (preview) layout; the button still appears for the previewed thread.

### Add new card (baseline)

* [ ] Pick a board, a list, a label, and a due date; submit.
* [ ] In Trello, the new card appears with the email body, the Gmail backlink, and the chosen label and due date.
* [ ] Toggle the position to "top of list"; submit again from a different email; verify the new card lands at the top.
* [ ] Toggle the position to "bottom of list"; submit again; verify position.

### Add to existing card (Wave 3 surface)

* [ ] Switch the popup into "add to existing card" mode.
* [ ] Pick a card from the dropdown and submit.
* [ ] In Trello, the email body appears as a comment on the existing card, not as a new card.
* [ ] If the email had an attachment, that attachment lands on the existing card.

### Race hardening (Wave 2 surface)

* [ ] Rapidly click between two different boards; the form ends up populated with the last-clicked board's lists, labels, and members, with no mix.
* [ ] Rapidly click between two different lists in "add to existing card" mode; the card dropdown shows only the last-clicked list's cards.
* [ ] Double-click the submit button; exactly one card (or one comment) is created in Trello.

### Attachments

* [ ] Send yourself an email with one inline image and one file attachment; submit; both arrive on the new card with sensible filenames.
* [ ] Send yourself an email with a Gmail attachment large enough to need the background-script fetch path (a few MB); submit; the attachment uploads without CORS or CORB errors in DevTools.

### Sign-out and reload

* [ ] Click the popup's sign-out control; confirm the popup forces a reload.
* [ ] After reload, the next G2T popup re-prompts for Trello authentication.

### Options page

* [ ] Open the options page from `chrome://extensions` (Details, Extension options).
* [ ] Confirm all controls render.
* [ ] Change a setting, close the page, reopen it; the setting persists.

### Privacy (UA removal surface)

* [ ] Open DevTools for the extension context (popup + service worker), then exercise the extension end-to-end.
* [ ] In Network, filter by Initiator = extension ID, so Gmail page traffic does not pollute results.
* [ ] Confirm zero extension-initiated requests to telemetry hosts: `google-analytics.com`, `analytics.google.com`, `googletagmanager.com`, `doubleclick.net`.
* [ ] Confirm extension-initiated requests hit only expected hosts for this flow (Trello plus Gmail attachment-fetch hosts used by the extension).

## Sign-off

* [ ] All boxes above checked, or each unchecked box has a written reason in the PR description.
* [ ] Tester name, Chrome version, date, and Gmail account used recorded in the PR description.
