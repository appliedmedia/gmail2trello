# Playwright End-to-End Harness

**Date**: 2026-05-04
**Status**: info
**Source plan**:
[Lane 2 Playwright Harness](plans/2026-05-04_plan_inProgress_CloseBoxFixAndManualTestAutomation_Lane2-PlaywrightHarness.md)
**Related**: [Wave 5 Manual Test Matrix](2026-04-27_info_Wave5TestMatrix.md)

## What this harness is for

Real-Chrome end-to-end automation for the gmail2trello extension. Drives
the unpacked extension against live Gmail and Trello. Catches popup
lifecycle regressions of the Lane 1 shape (Gmail mutation observers
removing `#g2tButton` as a side-effect of popup DOM mutations) before
ship.

## What it is not

* Not a replacement for the Cucumber + JSDOM unit / integration runner
  (`npm test`). That suite exercises class-method contracts and stays
  the right home for logic-heavy assertions.
* Not the manual test gate. The
  [Wave 5 Manual Test Matrix](2026-04-27_info_Wave5TestMatrix.md) still
  owns ship-gating coverage; this harness automates the subset whose
  regressions we want to catch in CI eventually.

## Two runners, one extension

* `npm test` -- Cucumber + JSDOM. Fast, deterministic, no browser.
  Exercises class-method contracts; cannot reproduce Gmail mutation
  observer side-effects.
* `npm run test:e2e` -- Playwright + headed Chromium with unpacked
  extension. Slower, needs a display, but reproduces real-DOM lifecycle.

The two are complementary, not redundant.

## Auth bootstrap

* Run `npm run test:e2e:bootstrap` once per developer machine.
* Headed Chromium launches with the unpacked extension.
* Two tabs open: Gmail, Trello.
* Developer signs in to both in the headed browser.
* Developer presses Enter in the terminal.
* Cookies and localStorage are written to
  `tests/playwright/auth/storage-state.json` (gitignored).
* Subsequent `npm run test:e2e` runs reuse that state via the
  `extension` fixture.

Recovery: if Gmail cookies expire (typically weeks) or Trello rotates
its OAuth1 token format, re-run the bootstrap script.

## Adding a new spec

* Create `tests/playwright/specs/<feature>.spec.ts`.
* Import `{ test, expect, gotoGmail }` from `../fixtures/extension`.
* Use `waitForG2tButton(page)` from `../helpers/wait-for-g2t` before
  asserting on extension state. The Gmail content script bootstrap is
  asynchronous and slow on cold caches.
* Keep specs short and lifecycle-scoped. One "thing that should not
  break" per spec.
* Avoid hard-coded Gmail thread IDs or Trello card / list IDs.
  Anchor on persisted-state shape (e.g., "title field non-empty after
  re-open") rather than fixtures that drift.

## Layout

* `tests/playwright/playwright.config.ts` -- single project
  `chromium-extension`, headed, 60-second timeout, list reporter.
* `tests/playwright/fixtures/extension.ts` -- launches a persistent
  context with `--load-extension` pointed at `chrome_manifest_v3/`.
  Applies cookies from `auth/storage-state.json` when present.
  Yields the extension's service-worker handle.
* `tests/playwright/helpers/wait-for-g2t.ts` -- polls for
  `[gh='mtb'] #g2tButton` with a 30-second default timeout.
* `tests/playwright/scripts/bootstrap-auth.ts` -- one-time interactive
  capture of Gmail / Trello session.
* `tests/playwright/specs/` -- regression specs.
  * `close-box-keeps-icon.spec.ts` -- Lane 1 acceptance test.
  * `popup-hydrates.spec.ts` -- popup title hydrates within 5 seconds.
* `tests/playwright/auth/` -- gitignored. Holds `storage-state.json`.
* `tests/playwright/user-data/` -- gitignored. Persistent Chromium
  profile that the persistent context writes into.

## Headed-only constraint

Chrome extensions cannot load in headless mode. The config requires a
visible display. CI integration is follow-up; on Linux it needs `xvfb`.

## Relation to Wave 5 / 4 manual matrix

The matrix is the source of test cases that may eventually become
specs. As manual cases prove worth automating (high regression rate,
cheap to assert, deterministic), pull them across to specs here.
Out of scope for the first cut: add-to-card happy path, add-to-existing
card, attachment upload, sign-out / re-auth, error toasts, multi-account
Gmail / multi-Trello-org switching.

## Versioning

The harness targets whatever version is in `chrome_manifest_v3/manifest.json`
at the time the test runs. As of 2026-05-08 that is `3.2.0.004`. Reverting
the Lane 1 fix (commit `19a41e4`) is the canonical way to confirm the
`close-box-keeps-icon` spec exercises a real regression.
