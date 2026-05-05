# Close-Box Fix and Manual Test Automation: Orchestration

**Date**: 2026-05-04
**Status**: inProgress
**Branch**: `main` (clean as of head 3b4bb78)
**Supersedes Lane B of**:
[Post Wave 5 Click and Auth Regression](<2026-05-03_plan_todo_PostWave5ClickAndAuthRegression.md>)

## Goal

Two related work streams running in parallel.

* Resolve the production regression where clicking the popup `[x]` close
  button hides the popup AND removes `#g2tButton` from the Gmail
  toolbar. Static trace confirms the close handler is innocent; the
  icon disappearance is a side-effect of Gmail's own mutation observer
  reacting to changes inside `[gh='mtb']` (where the popup is currently
  mounted as a sibling of the button).
* Stand up a real manual-test automation harness so future regressions
  of this shape are caught before ship. User direction is Playwright as
  the default, with the Claude in Chrome MCP plug-in as an acceptable
  fallback for the slowest interactive smoke pass.

## Why now

* The 3.2.0.003 (Wave 6) ship landed on main without any automated
  end-to-end coverage of the popup lifecycle in a real Chrome with the
  unpacked extension loaded. Cucumber + JSDOM exercises class methods
  but cannot reproduce Gmail's mutation-observer side-effects.
* The user has explicitly asked for Playwright (or equivalent) so that
  every future "manual test" is in fact a script.

## Lanes

* [Lane 1: Popup Lazy Create and Destroy](<2026-05-04_plan_inProgress_CloseBoxFixAndManualTestAutomation_Lane1-CloseBoxRelocate.md>)
  switches the popup to a lazy create/destroy lifecycle. Popup is
  built on demand and mounted to `document.body` when the user opens
  it, then removed entirely on close. State survives across mount
  cycles via the existing `app.persist` and `app.temp` mechanisms
  (user-confirmed 2026-05-04). Eliminates both the icon-disappearance
  bug and the orphaned-popup risk that a simple relocation would
  introduce. Adds Cucumber coverage for "close button leaves icon
  intact" and "re-open restores state."
* [Lane 2: Playwright Harness](<2026-05-04_plan_inProgress_CloseBoxFixAndManualTestAutomation_Lane2-PlaywrightHarness.md>)
  scaffolds Playwright with `launchPersistentContext` against the
  unpacked extension. Bootstraps a stored auth state for Gmail and
  Trello so the suite can run unattended after the one-time interactive
  sign-in. Adds the close-box fix as the first regression spec and
  `npm run test:e2e` to package.json. Recommends Claude in Chrome as a
  one-off exploratory smoke tool only, not a CI harness.

## Sequencing

* Lane 1 and Lane 2 are independent for **planning** and **most
  scaffolding work**. They become coupled at the verification step:
  Lane 2's first regression spec is "close popup, assert button still
  in toolbar," which is exactly Lane 1's acceptance test in browser
  form.
* Recommended order for execution:
  * Land Lane 1's fix on a feature branch.
  * Land Lane 2's scaffold on a separate feature branch (no spec
    content yet).
  * Merge Lane 2 first (additive, no risk to current behaviour).
  * Add the close-box regression spec on Lane 1's branch, run it
    against the fix, merge.

## Out of scope

* Lane A of the existing PostWave5 plan (the `Loading...` stuck
  hydration gates issue). That stays in
  [Post Wave 5 Click and Auth Regression](<2026-05-03_plan_todo_PostWave5ClickAndAuthRegression.md>)
  and is a separate fix track.
* G2T Panel sidepanel work
  ([Chk1 Skateboard Orch](<2026-05-03_plan_todo_Chk1Skateboard_Orch.md>)).
  The sidepanel variant sidesteps both bugs by design but is a parallel
  product, not a fix for the current extension.
* `SyncPrivacyPolicyToTrelloCard` and any further jQuery removal.

## What "done" looks like

* Lane 1 acceptance: fresh Gmail load, click G2T button, popup opens,
  click `[x]`, popup hides, `#g2tButton` is still present in
  `[gh='mtb']` (verified by `document.querySelector("[gh='mtb']
  #g2tButton")` returning truthy). Popup re-opens on next button click
  with prior state intact.
* Lane 2 acceptance: `npm run test:e2e` runs against the unpacked
  extension in headed Chrome, completes in under 60 seconds on a
  developer laptop, exits 0 on the close-box regression spec, exits
  non-zero if Lane 1 is reverted. README block documents the one-time
  auth bootstrap step.
* Both lanes' fixes ship together as `3.2.0.004` if a version bump is
  warranted, otherwise Lane 2 ships standalone as a tooling-only PR
  and Lane 1 piggybacks on the next user-visible release.

## Decisions made 2026-05-04

* **Lane 1 approach: lazy create/destroy.** Greenlit by user after
  confirming PopupForm already restores state from `app.persist` and
  `app.temp` across mount cycles. Simple-relocate option discarded.

## Decisions deferred (to call before execution begins)

* **Toolchain confirmation for Lane 2.** The plan recommends
  Playwright. The user mentioned Claude in Chrome MCP plug-in as an
  acceptable fallback. We need explicit sign-off on Playwright as the
  primary harness before scaffolding under `tests/playwright/`.
* **Test Trello account / app key.** Lane 2 needs a Trello account
  whose token can be checked into a developer's local
  `tests/playwright/auth/storage-state.json` (gitignored). Open
  question whether to reuse the production G2T Trello key or mint a
  separate test key.
* **CI integration.** Lane 2's first deliverable is local-runnable. CI
  integration (GitHub Actions) is a follow-up, not part of this
  orchestration.
