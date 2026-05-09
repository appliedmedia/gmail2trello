# Playwright End-to-End Harness

Headed Playwright suite that drives the unpacked Chrome extension against
real Gmail and Trello. Lane 2 of
[Close Box Fix and Manual Test Automation](../../docs/plans/2026-05-04_plan_inProgress_CloseBoxFixAndManualTestAutomation_Orch.md).

## Setup

* `npm install`
* `npx playwright install chromium`
* `npm run test:e2e:bootstrap` (one-time per developer machine)
  * Launches headed Chromium with the unpacked extension.
  * Opens Gmail and Trello in two tabs.
  * Sign in to both, then return to the terminal and press Enter.
  * Storage state is written to `tests/playwright/auth/storage-state.json`.

## Run

* `npm run test:e2e`

## Headed-only constraint

Chrome extensions cannot load in headless mode. The config launches a
persistent Chromium context with `--load-extension`, which requires a
visible display. CI integration needs `xvfb` on Linux. This is a known
constraint of the platform, not the harness.

## Layout

* `playwright.config.ts` -- single `chromium-extension` project.
* `fixtures/extension.ts` -- Playwright fixture that launches the
  persistent context with the extension loaded and (when present)
  applies stored cookies.
* `helpers/wait-for-g2t.ts` -- polls for `[gh='mtb'] #g2tButton`.
* `scripts/bootstrap-auth.ts` -- interactive auth capture.
* `specs/` -- regression specs.
* `auth/` -- gitignored cookie / localStorage state.
* `user-data/` -- gitignored Chromium persistent profile.

## Specs

* `close-box-keeps-icon.spec.ts` -- Lane 1 acceptance test in browser
  form. Asserts the popup `[x]` does not strip `#g2tButton` from the
  Gmail toolbar.
* `popup-hydrates.spec.ts` -- asserts the popup title field transitions
  from empty / `Loading...` to populated within 5 seconds of opening.

## Relationship to the manual test matrix

The Wave 5 manual matrix in
[docs/2026-04-27_info_Wave5TestMatrix.md](../../docs/2026-04-27_info_Wave5TestMatrix.md)
remains the source of truth for ship-gating coverage. Specs added to
this harness are the automated subset; new specs should pull cases from
the matrix as they prove worth automating.

## Adding a new spec

* Create `tests/playwright/specs/<feature>.spec.ts`.
* Import `test`, `expect`, and `gotoGmail` from `../fixtures/extension`.
* Use `waitForG2tButton(page)` before assuming the content script has
  bootstrapped.
* Keep specs scoped to one lifecycle assertion. Long sequences belong
  in the manual matrix until a regression earns automation.
