# Lane 1: Version Bump

**Date**: 2026-04-26
**Status**: TODO
**Files**: `chrome_manifest_v3/manifest.json`, `package.json`,
`package-lock.json`

## Problem

The repo currently advertises `3.1.0.001` in both `manifest.json` and
`package.json`, but `CHANGES.md` only documents up to `3.1.0.000@2025-01-27`.
No public release was cut for `3.1.0.001`, so that string is effectively a
placeholder. Waves 0-3 plus the Universal Analytics removal have all merged
to `main` since then, and none of that is reflected in the version string.

## Decision needed

Pick a target version before editing. Candidates, in order of how big a
signal they send to users:

* `3.2.0.000`. Recommended. Adds material new behavior: `gmail.js`
  event-driven detection (Wave 1), add-to-existing-card restored (Wave 3),
  race-condition hardening (Wave 2), Universal Analytics removed.
* `3.1.1.000`. Defensible if treating Waves 0-3 as bug-fix-shaped and the
  UA removal as cleanup.
* `3.1.0.002`. Not recommended; understates the change set.

Default to `3.2.0.000` unless the user specifies otherwise.

## Steps

* Edit `chrome_manifest_v3/manifest.json`: change `"version"` to the agreed
  string.
* Edit `package.json`: change `"version"` to match.
* Run `npm install --package-lock-only` (or `npm install`) to refresh
  `package-lock.json` so the top-level `version` field there matches.
* Run `npm run check` (lint + format check). Should pass with no diff.
* Run `npm test` (Cucumber). Should pass; current baseline is 653 scenarios.

## Acceptance

* `manifest.json`, `package.json`, and `package-lock.json` all carry the
  same version string.
* `npm run check` exits 0.
* `npm test` exits 0 with all 653 scenarios passing.
* No other files modified by this lane.

## Out of scope

* Tagging the release in git. That happens after the PR merges to `main`,
  not in this lane.
* Building the zip. That happens via `npm run build` post-merge.
* Updating any references in `README.md` or marketing copy.
