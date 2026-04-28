# Wave 5: Trusted Types Hotfix + jQuery Reduction: Orchestration

**Date**: 2026-04-27
**Status**: DONE
**Branch**: `wave5/tt-and-jquery` (off `main`, after Wave 4 merged at `c74aab2`)
**Depends on**: Wave 4 done. See
[Wave 4 Orch](<2026-04-26_plan_done_Wave4ShipPrep_Orch.md>),
PR#145 (Wave 4 ship-prep, commit `c74aab2`).

## Why this wave exists

Loading the freshly bumped `3.2.0.001` build into Chrome against real Gmail
fails. The popup never renders because Gmail's CSP includes
`require-trusted-types-for 'script'` and jQuery 3.7.1 internally writes raw
HTML strings (e.g. `cur.innerHTML = "<a href='link'></a>"`), which Chrome
rejects as a `TrustedHTML` violation. The thrown exception kills our
content-script bootstrap before any of our own code runs.

Manual matrix walk on the unpacked `3.2.0.001` build caught this. It is a
hard ship blocker: a working Chrome Web Store release cannot be cut from
`3.2.0.001`. Wave 5 produces `3.2.0.002` with the fix.

## What is in scope

* **Sweep our own code off jQuery** wherever a direct native equivalent
  exists. Targets: `views/class_popupForm.js`, `views/class_popupView.js`,
  `views/class_gmailView.js`, `class_utils.js`, `class_menuControl.js`.
  Goal: when we upgrade jQuery to 4.x, our surface area facing breaking
  changes is minimal.
* **Upgrade jQuery to 4.0.0** and keep it because gmail.js requires it.
  The gmail.js constructor literally throws if `jQuery` is absent.
* **Update gmail.min.js** to upstream v1.1.16 (we have an older copy).
  v1.1.13+ already removed deprecated jQuery APIs for jQuery 4 compatibility
  per [gmail.js PR #780](<https://github.com/KartikTalwar/gmail.js/pull/780>).
* **Register a Trusted Types policy** named `g2t-gmail-html` and hook it
  into `jQuery.htmlPrefilter` in both content-script worlds (MAIN and
  ISOLATED). This is the canonical fix per
  [gmail.js issue #779](<https://github.com/KartikTalwar/gmail.js/issues/779>).
* **Bump version to `3.2.0.002`**, add a CHANGES.md block, walk the manual
  matrix again on the bumped build before publish.

## What is out of scope

* Dropping jQuery entirely. gmail.js (Wave 1's whole point) requires it,
  and gmail.js is the open-source library we deliberately adopted so that
  Gmail-DOM tracking is somebody else's problem.
* Dropping jQuery UI 1.14.1. The combobox at
  `class_popupForm.js:928,935` uses `$.widget` and depends on jQuery UI.
  Lane 5 confirms jQuery UI 1.14.1 + jQuery 4 compatibility at swap time.
  If incompatible, that becomes a Wave 6 problem, not a Wave 5 problem.
* Replacing `lib/combo.js`. It is upstream jQuery UI sample code, not our
  authored surface. Lane 5 keeps it, only verifies it still loads.
* Any new feature work. Wave 5 fixes a ship blocker and reduces blast
  radius for the jQuery upgrade. Nothing else.

## Lanes (mostly parallel)

The five sweep-and-update lanes (1, 2, 3, 4, 5) touch disjoint files. They
can be authored simultaneously. Lane 5 swaps jQuery 4 in last because
Lanes 1-4 mechanically reduce the breaking-change surface.

* **[Lane 1: class_popupForm.js sweep](<2026-04-27_plan_done_Wave5TrustedTypesAndJqueryReduction_Lane1-PopupFormSweep.md>)**
  * File: `chrome_manifest_v3/views/class_popupForm.js`
  * Output: ~149 jQuery sites converted to native DOM where direct
    equivalents exist. Combobox, jQuery UI tooltip, and a few
    HTML-builder sites remain on jQuery by design.
* **[Lane 2: class_popupView.js sweep](<2026-04-27_plan_done_Wave5TrustedTypesAndJqueryReduction_Lane2-PopupViewSweep.md>)**
  * File: `chrome_manifest_v3/views/class_popupView.js`
  * Output: ~125 jQuery sites converted to native DOM. Event-listener
    bookkeeping (`.off().on()` pairs) preserved via
    `AbortController` + `signal`.
* **[Lane 3: class_gmailView.js sweep](<2026-04-27_plan_done_Wave5TrustedTypesAndJqueryReduction_Lane3-GmailViewSweep.md>)**
  * File: `chrome_manifest_v3/views/class_gmailView.js`
  * Output: ~50 jQuery sites converted to native DOM. Reads from Gmail's
    DOM (attributes, text, src) move to plain `getAttribute` /
    `textContent` / `querySelector`.
* **[Lane 4: small-files sweep](<2026-04-27_plan_done_Wave5TrustedTypesAndJqueryReduction_Lane4-SmallFilesSweep.md>)**
  * Files: `class_utils.js`, `class_menuControl.js`. Two surgical sites,
    listed by line.
* **[Lane 5: library updates + TT policy](<2026-04-27_plan_done_Wave5TrustedTypesAndJqueryReduction_Lane5-LibUpdatesAndTtPolicy.md>)**
  * Files: `lib/jquery-3.7.1.min.js` removed, `lib/jquery-4.0.0.min.js`
    added, `lib/gmail.min.js` replaced with upstream v1.1.16,
    `chrome_manifest_v3/manifest.json` updated, `gmail_loader.js` extended
    to register TT policy in MAIN world, new helper file
    `g2t_tt_policy.js` prepended to ISOLATED world load order.
* **[Lane 6: ship-prep for 3.2.0.002](<2026-04-27_plan_done_Wave5TrustedTypesAndJqueryReduction_Lane6-ShipPrep.md>)**
  * Files: `chrome_manifest_v3/manifest.json`, `package.json`,
    `package-lock.json`, `docs/CHANGES.md`,
    `docs/2026-04-26_info_Wave4TestMatrix.md` (or new
    `2026-04-27_info_Wave5TestMatrix.md`).
  * Output: version `3.2.0.002` everywhere, CHANGES block, matrix updated
    with TT-specific scenarios (extension visible in Gmail, no console
    `TrustedHTML` errors).

## Merge order

* Lanes 1-4 land independently on `wave5/tt-and-jquery` in any order.
  Each lane's acceptance is `npm run check` clean and `npm test`
  exit-0-with-all-passing on the lane branch (Cucumber baseline 653 at
  Wave 4 close).
* Lane 5 lands after Lanes 1-4 are all merged into `wave5/tt-and-jquery`.
  This is the jQuery 4 cutover. Acceptance includes a smoke run of the
  manual matrix against an unpacked build.
* Lane 6 lands last. Single PR back to `main` once all six lanes are
  present and the manual matrix has been walked against an unpacked
  `3.2.0.002` build.

## Pre-publish checklist (after PR merges to main)

Same as Wave 4, plus a stronger sign-off on the Trusted Types fix.

* Run `npm run build` to produce `gmail-2-trello-3.2.0.002.zip`.
* Load unpacked build into Chrome, open Gmail, confirm the G2T button
  renders, click it, confirm the popup renders, confirm zero
  `TrustedHTML` errors in DevTools console.
* Walk the full Wave 5 manual matrix end to end.
* Tag release: `git tag v3.2.0.002 && git push origin v3.2.0.002`.
* Upload zip to Chrome Web Store dashboard.

## Notes for future-you

* The TT policy name `g2t-gmail-html` is namespaced so multiple extensions
  on the same page do not collide. Gmail itself registers a policy named
  `gmail`. Picking a unique name is the same pattern gmail.js issue #779
  recommends.
* `htmlPrefilter` is the documented hook in jQuery 4; in jQuery 3.7 the
  same hook exists but is undocumented. We rely on the documented form.
* The combobox at `class_popupForm.js:928,935` is the single most
  important reason we keep jQuery + jQuery UI. If a future wave decides
  to replace the combobox with a native autocomplete, jQuery itself
  could go too (gmail.js would have to be replaced or wrapped, which is
  the much harder problem).
