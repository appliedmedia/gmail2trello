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

* [Lane 1: Popup Lazy Create and Destroy](<2026-05-04_plan_done_CloseBoxFixAndManualTestAutomation_Lane1-CloseBoxRelocate.md>)
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

## 2026-05-08 Decisions made

* **Lane 2 branch: `closebox/lane2-playwright`.** Mirrors Lane 1's
  `closebox/lane1-lazy-popup` parent grouping. Scaffolding lands as a
  draft PR for review while developer walks the auth bootstrap step
  locally.
* **A1+A2+A3 routing.** A1 (docs commit) runs foreground on `main`. A2
  (Playwright scaffold) runs as a background agent inside a worktree
  on branch `closebox/lane2-playwright` so `main` stays usable for A3.
  A3 (Wave 5 / 4 matrix walk against `3.2.0.004` unpacked build) runs
  foreground via Claude in Chrome MCP because it needs the developer's
  authenticated Gmail + Trello session.
* **Matrix scope for A3.** Use the Wave 5 matrix (it supersets Wave 4)
  with one substitution: target version is `3.2.0.004`, not
  `3.2.0.002`. Add the Lane 1 close-box assertion: after `[x]` click,
  `#g2tButton` must remain present in `[gh='mtb']`.
* **Lane 2 test Trello account: `a@cov.in`.** User's existing personal
  account. No separate test account for now.
* **Lane 2 Trello app key: reuse production G2T key.** No tests-only
  override needed; the key shipped in the unpacked extension is already
  public.
* **Lane 2 test board: existing `acoven > test > <name TBD>` board.**
  Exact board / list IDs captured during the bootstrap run, not
  hard-coded in specs. First-cut specs assert on persisted-state shape
  (e.g., "title field non-empty after re-open") rather than fixed IDs.

## 2026-05-07 Decisions made

* **Lane 1 shipped.** PR #151 merged into main as commit dc6b935 on
  2026-05-07. Version bumped to 3.2.0.004. Three follow-up commits on
  top of the lazy-popup change addressed two CodeRabbit review rounds
  plus a smoke-test pass: 4d38925, 8f4d778, 24889c2.
* **Lane 2 toolchain: Playwright.** User signed off on the recommended
  primary harness. Claude in Chrome MCP plug-in reserved as one-off
  exploratory tool. Scaffolding under `tests/playwright/` is unblocked.

## 2026-05-04 Decisions made

* **Lane 1 approach: lazy create/destroy.** Greenlit by user after
  confirming PopupForm already restores state from `app.persist` and
  `app.temp` across mount cycles. Simple-relocate option discarded.

## Decisions deferred (to call before execution begins)

* **CI integration.** Lane 2's first deliverable is local-runnable. CI
  integration (GitHub Actions) is a follow-up, not part of this
  orchestration.
