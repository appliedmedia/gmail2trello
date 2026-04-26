# Lane 2: Changelog Update

**Date**: 2026-04-26
**Status**: TODO
**File**: `docs/CHANGES.md`

## Problem

`CHANGES.md` currently stops at `=== 3.1.0.000@2025-01-27 ===`. The repo has
shipped substantial work since then that is not yet documented for end users
or future maintainers reading the changelog at
[g2t.pub/changes](<https://g2t.pub/changes>).

## What to summarize

Pull the user-visible deltas from the merge log between `3.1.0.000` and the
current `main` tip. Group, do not transcribe commit messages. Suggested
headings inside the new block (using `*` bullets, not subheadings):

* **Reliability**:
  * `gmail.js` integration replaces MutationObserver polling with
    event-driven detection (Wave 1, commit `bc95ab5`).
  * Race-condition hardening across board, list, label, and member fetches
    via per-category version counters; double-submit guard on the popup form;
    cascade tracker that holds UI updates until all three loads complete
    (Wave 2, PR#143 / commit `4737e7f`).
* **Features**:
  * "Add to existing card" restored after the v2-to-v3 migration regression.
    Position routing (top/bottom of list) and unified uploader chain
    (Wave 3, PR#138 / commit `cba8543`).
* **Privacy**:
  * Removed the embedded Universal Analytics SDK and the dead telemetry
    code paths it fed (commit `46d4d6c`). Chrome Web Store still reports
    aggregate install counts; the extension itself sends none.
  * Added third-party-notices file alongside the UA removal.
* **Tests**:
  * Migrated to Cucumber as the sole test runner; removed Jest and
    `node:test` (Wave 0). 653 scenarios in the suite.
* **Dependencies**:
  * `@cucumber/cucumber` 12.7.0 -> 12.8.2, `prettier` 3.8.1 -> 3.8.3,
    `globals` 17.3.0 -> 17.5.0, `eslint` 10.0.0 -> 10.0.3,
    `eslint-plugin-prettier` 5.5.4 -> 5.5.5, `jsdom` 27.4.0 -> 29.0.0,
    plus `flatted` security bump.

## Format requirements

* New block goes at the very top of the file, above
  `=== 3.1.0.000@2025-01-27 ===`.
* Header line uses the exact `=== <version>@YYYY-MM-DD ===` shape that the
  rest of the file uses, with the date set to the day the version is cut
  (Lane 1 picks the version; this lane uses whatever Lane 1 settled on).
* Body uses `*` bullets. The whole file is being converted from `-` to `*`
  in the same lane so the new block matches the converted file. The published
  redirect renders both styles identically.
* Keep entries short: one line per item, no trailing periods if the existing
  file omits them (it does).

## Acceptance

* `CHANGES.md` has a new top block whose header matches the chosen version
  from Lane 1 and the date Lane 1 cut on.
* The block summarizes Waves 0-3, UA removal, and dependency hygiene in
  under ~25 lines.
* Existing blocks below it are untouched.
* `markdownlint` (or whatever linter the project uses on `.md`) reports no
  new complaints. Existing complaints, if any, are not introduced or
  exacerbated.

## Out of scope

* Editing any other `.md` file.
* Rewriting historical entries.
* Linking out to PRs from inside the changelog. The audience is end users,
  not GitHub readers; commit hashes are noted in the plan, not the changelog.
