# Wave 4 Ship Prep: Orchestration

**Date**: 2026-04-26
**Status**: TODO
**Branch**: `wave4/ship-prep` (off `main`, after Waves 0-3 fully merged)
**Depends on**: Waves 0-3 done. See
[Wave 2 Orch](<2026-04-15_plan_done_Wave2RaceConditionFixes_Orch.md>),
PR#138 (Wave 3 add-to-card, commit `cba8543`),
PR#143 (Wave 2 race fixes, commit `4737e7f`).

## Goal

Cut a public release of the extension that bundles all of Waves 0-3 plus the
Universal Analytics removal. Three deliverables, each independent:

* Bump the published version in `manifest.json` and `package.json`
  (and refresh `package-lock.json`).
* Append a new `CHANGES.md` block summarizing everything since
  `3.1.0.000@2025-01-27`.
* Produce a manual test matrix that an installer can run against an unpacked
  build before publishing to the Chrome Web Store.

No code changes ship in Wave 4. If something fails the manual test matrix,
that is a Wave 5 (or hotfix) problem, not a Wave 4 problem.

## Lanes (fully parallel)

The three lanes touch different files and have no shared state. They can be
authored simultaneously and merged in any order.

* **[Lane 1: Version Bump](<2026-04-26_plan_todo_Wave4ShipPrep_Lane1-VersionBump.md>)**
  * Files: `chrome_manifest_v3/manifest.json`, `package.json`,
    `package-lock.json`
  * Output: agreed version string applied in three places, lockfile
    regenerated, `npm run check` clean
* **[Lane 2: Changelog](<2026-04-26_plan_todo_Wave4ShipPrep_Lane2-Changelog.md>)**
  * File: `docs/CHANGES.md`
  * Output: new top block dated today summarizing Waves 0-3, UA removal,
    dependency hygiene, doc cleanup
* **[Lane 3: Test Matrix](<2026-04-26_plan_todo_Wave4ShipPrep_Lane3-TestMatrix.md>)**
  * File: `docs/2026-04-26_info_Wave4TestMatrix.md` (new)
  * Output: manual checklist covering install, auth, board switching, list
    switching, add-new-card, add-to-existing-card, attachments, double-submit,
    sign-out, options page

## Merge order

Lanes land independently on `wave4/ship-prep`. Single PR back to `main` once
all three lanes are present and the manual test matrix has been executed
against an unpacked build of the bumped version. The test matrix run is part
of the PR description, not a code change.

## Pre-publish checklist (after PR merges to main)

Outside the scope of this plan but listed here so future-you does not forget:

* Run `npm run build` to produce `gmail-2-trello-<version>.zip`.
* Upload zip to the Chrome Web Store dashboard (see
  [ChromeWebStoreDashboard](<../2020-05-24_info_ChromeWebStoreDashboard.txt>)).
* Tag the release in git: `git tag v<version> && git push origin v<version>`.
* Update the `[g2t.pub/changes](<https://g2t.pub/changes>)` redirect target if
  needed (currently points to `CHANGES.md` on `main`, so no action expected).

## Out of scope

* The Trello privacy-policy card sync. That has its own plan at
  [SyncPrivacyPolicyToTrelloCard](<2026-04-18_plan_todo_SyncPrivacyPolicyToTrelloCard.md>)
  and can ship independently.
* Any new code or refactor work. Wave 4 is purely metadata and verification.
* Automated end-to-end tests against a real Gmail/Trello pair. Cucumber unit
  and integration scenarios already cover the code paths; the manual matrix
  exists to catch packaging and Chrome Web Store regressions only.
