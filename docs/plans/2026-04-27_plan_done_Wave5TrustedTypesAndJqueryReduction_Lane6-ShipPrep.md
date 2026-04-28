# Lane 6: Ship-Prep for 3.2.0.002

**Date**: 2026-04-27
**Status**: DONE
**Files**: `chrome_manifest_v3/manifest.json`, `package.json`,
`package-lock.json`, `docs/CHANGES.md`,
`docs/2026-04-27_info_Wave5TestMatrix.md` (new)
**Parent**: [Wave 5 Orch](<2026-04-27_plan_done_Wave5TrustedTypesAndJqueryReduction_Orch.md>)

## Problem

Lanes 1-5 produce a build that loads in Gmail without `TrustedHTML`
errors. Lane 6 metadata-bumps that build to `3.2.0.002`, documents
the change set, and adds a TT-specific extension to the Wave 4 test
matrix so the manual verifier walks scenarios that would have caught
the original Wave 4 ship-blocker.

## Decision

Target version `3.2.0.002`. The change set is ship-blocker hotfix
(TT) plus an extensive internal refactor (jQuery sweep) with no new
user-visible features, which fits the fourth-segment increment. No
discussion alternative is needed; the version policy from Wave 4 is
the same here.

## Steps

### Version bump

* Edit `chrome_manifest_v3/manifest.json` line 4: change `"version":
  "3.2.0.001"` to `"version": "3.2.0.002"`.
* Edit `package.json` `"version"` field similarly.
* Run `npm install --package-lock-only` to refresh
  `package-lock.json` so the top-level version field there matches.
  Lock-only avoids accidentally pulling semver-range upgrades into the
  release.
* Run `npm run check`. Expect exit 0.
* Run `npm test`. Expect exit 0, all scenarios passing.

### CHANGES block

Append a new block at the top of `docs/CHANGES.md`:

```text
=== 3.2.0.002@2026-04-27 ===

* Fix Trusted Types violation that prevented the popup from rendering
  on real Gmail (Chrome's `require-trusted-types-for 'script'` CSP
  blocked jQuery's internal `innerHTML` writes). Register a
  `g2t-gmail-html` policy in both content-script worlds and route
  jQuery's `htmlPrefilter` through it.
* Upgrade jQuery from 3.7.1 to 4.0.0.
* Update gmail.js bundled copy from prior to v1.1.16, which removed
  deprecated jQuery APIs for jQuery 4 compatibility.
* Sweep our own code off jQuery wherever a direct native equivalent
  exists. `views/class_popupForm.js`, `views/class_popupView.js`,
  `views/class_gmailView.js`, `class_utils.js`, and
  `class_menuControl.js` now use native DOM APIs (`querySelector`,
  `addEventListener`, `classList`, `textContent`, `setAttribute`,
  etc.). jQuery is retained only for gmail.js and jQuery UI widgets
  (`tooltip`, `g2t_combobox`).
* Replace jQuery namespaced events (e.g. `'change.g2tPopupForm'`)
  with `AbortController`-based listener teardown.
```

Match the existing CHANGES.md style: `=== version@date ===` header,
blank line, `*` bullets, blank line. No tables, no emdash separators.

### Manual test matrix

Create `docs/2026-04-27_info_Wave5TestMatrix.md`. Start from
`docs/2026-04-26_info_Wave4TestMatrix.md` as a template; do not
delete the Wave 4 file, both stay in tree as historical records.

Add a new top section "Wave 5 specific (Trusted Types + jQuery 4)":

* Open Gmail in Chrome with the unpacked `3.2.0.002` build loaded.
* Open DevTools console BEFORE refreshing the page; clear any
  existing log lines.
* Refresh the page. Expect zero log lines containing `TrustedHTML`,
  `Trusted Types`, `htmlPrefilter`, or `requires 'TrustedHTML'`.
* Confirm the G2T button is visible in Gmail's toolbar.
* Click the G2T button. Confirm the popup renders. Confirm zero
  TT-related errors during the click.
* Open an email. Confirm the popup auto-fills with the email's
  subject, body, sender, and CC (the gmail.js view-email path).
* Switch to a different email in the same thread. Confirm the popup
  refreshes the body / sender data.
* Switch boards in the popup. Confirm lists, labels, members all
  populate correctly (the cascade-tracker path from Wave 2).
* Add a new card. Confirm the card creates in Trello.
* Add to existing card. Confirm the card-search dropdown filters
  via the combobox (jQuery UI dependency confirmation).
* Close the popup by clicking outside. Confirm the global
  keydown/mouseup teardown still works (the AbortController-based
  rebinds from Lane 2).
* Sign out. Sign back in. Confirm the popup remounts cleanly.

Then keep all of the Wave 4 scenarios as a second top section
"Wave 4 regression matrix (re-run for 3.2.0.002)". The verifier
walks both sections in order before approving the publish.

### CHANGES.md hyperlink check

The `https://g2t.pub/changes` redirect target points to
`docs/CHANGES.md` on `main`. After this PR merges, that URL will
resolve to the new content automatically. No action.

## Acceptance

* `manifest.json`, `package.json`, and `package-lock.json` all carry
  `3.2.0.002`.
* `npm run check` exits 0.
* `npm test` exits 0 with all scenarios passing.
* `docs/CHANGES.md` has a top block dated 2026-04-27 for
  `3.2.0.002`.
* `docs/2026-04-27_info_Wave5TestMatrix.md` exists and includes the
  TT-specific section.
* Manual matrix walked end-to-end against an unpacked build before
  the PR merges to `main`. The PR description records walker name +
  Chrome version + date + Gmail account used + result.

## Out of scope

* Tagging the release in git. Happens after the PR merges.
* Building the zip via `npm run build`. Post-merge.
* Uploading to the Chrome Web Store. Post-merge.
* PrivacyPolicy sync (separate plan from 2026-04-18, unstarted
  track).
