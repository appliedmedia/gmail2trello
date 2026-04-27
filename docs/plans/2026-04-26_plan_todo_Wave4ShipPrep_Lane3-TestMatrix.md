# Lane 3: Manual Test Matrix

**Date**: 2026-04-26
**Status**: TODO
**File**: `docs/2026-04-26_info_Wave4TestMatrix.md` (new)

## Problem

Cucumber covers the JavaScript layer with 653 scenarios but cannot exercise
the actual Chrome MV3 packaging, real Gmail DOM, real Trello OAuth, or real
attachment upload. Before publishing to the Chrome Web Store, a human needs
to load the unpacked build and walk a fixed checklist so we catch packaging
regressions, manifest-permission regressions, and Gmail-class-name drift
that the unit suite cannot.

## Deliverable

A new file at `docs/2026-04-26_info_Wave4TestMatrix.md` containing a
checkbox list a tester can tick through in one sitting. Use `*` bullets and
GFM `[ ]` checkboxes. No tables.

## Sections to include

* **Setup**:
  * Load unpacked from `chrome_manifest_v3/`.
  * Sign in to Gmail in the same Chrome profile.
  * Click the G2T toolbar icon, sign in to Trello via the popup.
* **Detection (Wave 1 regression surface)**:
  * Open an email thread; G2T button appears in the toolbar within 2s.
  * Switch threads; button stays present and the popup, when reopened,
    reflects the new thread's subject and body.
  * Open a thread in the split-pane / preview-pane layout; button still
    appears.
* **Add new card (baseline)**:
  * Pick a board, a list, a label, a due date; submit; card appears in
    Trello with the email body, the backlink, and the chosen metadata.
  * Toggle "add to top of list" vs "add to bottom"; verify position in
    Trello matches.
* **Add to existing card (Wave 3 regression surface)**:
  * Switch the form into "add to existing card" mode; pick a card from the
    dropdown; submit; the email body is appended as a comment (not a new
    card) and the attachment, if any, lands on the existing card.
* **Race hardening (Wave 2 regression surface)**:
  * Rapidly switch between two boards; the form ends up populated with the
    last-clicked board's lists/labels/members, never a mix.
  * Rapidly switch between two lists; the card dropdown ends up populated
    with the last-clicked list's cards, never a mix.
  * Double-click the submit button; exactly one card (or one comment) is
    created in Trello.
* **Attachments**:
  * Email with one image inline and one file attached; both arrive on the
    card with sensible filenames.
  * Email with a Gmail-side attachment that requires the background-script
    fetch path; verify it still works (CORS/CORB regression check).
* **Sign-out and reload**:
  * Click sign-out; confirm the popup forces a reload and the next session
    re-prompts for Trello auth.
* **Options page**:
  * Open the options page from `chrome://extensions`; verify all controls
    render and persist their settings across reload.
* **Privacy (UA removal regression surface)**:
  * Open DevTools Network tab while using the extension; confirm zero
    requests to `*.google-analytics.com` or `analytics.google.com`. Only
    Trello and Gmail traffic should appear.

## Format requirements

* Top of the file: a one-paragraph "what this is" intro plus the chosen
  version string from Lane 1.
* Each section is a `##` heading with a `*`-bulleted checklist beneath.
* Each checklist item starts with `* [ ]` so a tester can tick through.
* Keep total length under one screen of scrolling so testers actually run
  it. If a section grows beyond ~6 items, split it.

## Acceptance

* File exists at the path above.
* Markdown linter is clean.
* Every Wave 1, 2, and 3 user-visible behavior has at least one checkbox
  that would catch a regression in it.
* Tester can complete the entire matrix in under 20 minutes against an
  account that already has at least one Trello board with a few lists and
  cards.

## Out of scope

* Automating any of these scenarios.
* Capturing screenshots. Add only if a step is ambiguous without one.
* Testing on Firefox or other browsers; Wave 4 ships the Chrome MV3 build
  only.
