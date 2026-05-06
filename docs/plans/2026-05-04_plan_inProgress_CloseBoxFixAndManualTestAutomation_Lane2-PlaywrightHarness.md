# Lane 2: Playwright Harness

**Date**: 2026-05-04
**Status**: inProgress (waiting on toolchain sign-off)
**Parent**:
[Close Box Fix and Manual Test Automation Orch](<2026-05-04_plan_inProgress_CloseBoxFixAndManualTestAutomation_Orch.md>)

## Goal

Stand up a real end-to-end automation harness so popup lifecycle bugs
of the Lane 1 shape are caught before ship. Today the only test layer
is Cucumber + JSDOM, which cannot reproduce Gmail's mutation observer
side-effects. Manual tests are walked by hand against a checklist
([2026-04-27 Wave 5 Test Matrix](<../2026-04-27_info_Wave5TestMatrix.md>)),
which is the gap this lane closes.

## Toolchain decision (PENDING USER SIGN-OFF)

* **Recommended primary**: Playwright. Reasons:
  * First-class Chrome extension support via
    `chromium.launchPersistentContext({ args:
    ['--disable-extensions-except=...', '--load-extension=...'] })`.
  * Deterministic, fast, scriptable assertions against real DOM after
    Gmail's mutation observers have fired.
  * Can persist auth state across runs via `storageState`.
  * Active community, easy CI story (GitHub Actions has prebuilt
    Playwright actions).
* **Acceptable fallback**: Claude in Chrome MCP plug-in for one-off
  interactive smoke. Not suitable as a regression suite (slow,
  non-deterministic, requires Claude session).
* **Rejected**: Puppeteer (similar shape to Playwright but smaller
  community, weaker extension story for MV3). Selenium (heavyweight,
  no compelling advantage).

## Scaffolding plan

Assume Playwright is approved. All paths relative to repo root.

* `tests/playwright/playwright.config.ts` configures a single project
  named `chromium-extension` that runs in headed mode (extensions
  cannot load in headless), with `launchPersistentContext` pointed at
  `chrome_manifest_v3/`.
* `tests/playwright/fixtures/extension.ts` exports a Playwright
  fixture that opens the unpacked extension and yields a
  `BrowserContext` plus the extension's service-worker `serviceWorker`
  handle.
* `tests/playwright/auth/.gitignore` excludes `storage-state.json` so
  developer Gmail/Trello cookies are never checked in.
* `tests/playwright/scripts/bootstrap-auth.ts` is a one-time headed
  script that launches Chrome with the extension, waits for the
  developer to manually sign in to Gmail and Trello, then writes
  `tests/playwright/auth/storage-state.json`. Documented in README.
* `tests/playwright/specs/close-box-keeps-icon.spec.ts` is the first
  regression spec. It opens an existing email, clicks `#g2tButton`,
  waits for `#g2tPopup` to be visible, clicks `#close-button`, and
  asserts `document.querySelector("[gh='mtb'] #g2tButton")` is still
  truthy after a 250 ms settle.
* `tests/playwright/specs/popup-hydrates.spec.ts` is the second
  regression spec, covering Lane A of the PostWave5 plan even though
  Lane A is not part of this orch (cheap to add while the harness is
  fresh).
* `tests/playwright/helpers/wait-for-g2t.ts` polls for `#g2tButton`
  presence with a 30-second timeout (Gmail load + content script
  bootstrap can be slow on cold caches).
* `package.json` gains:
  * `"test:e2e": "playwright test --config tests/playwright/playwright.config.ts"`
  * `"test:e2e:bootstrap": "tsx tests/playwright/scripts/bootstrap-auth.ts"`
  * `"@playwright/test"` and `"tsx"` in `devDependencies`.
* `docs/2026-05-04_info_PlaywrightHarness.md` (new) documents how to
  bootstrap auth, run specs, and add new ones. Cross-links to the Wave
  5 manual test matrix as the source of test cases worth automating.

## Auth bootstrap flow

* Run `npm run test:e2e:bootstrap` once per developer machine.
* Headed Chrome launches with the unpacked extension. Developer signs
  in to Gmail and to Trello (clicking the G2T button kicks the OAuth1
  popup).
* Script waits for the developer to confirm at the terminal, then
  saves cookies + localStorage to
  `tests/playwright/auth/storage-state.json`.
* All subsequent `npm run test:e2e` runs reuse that file via
  `storageState` in the test fixture, so no re-auth needed.
* Token expiry: Trello OAuth1 tokens are long-lived; Gmail cookies may
  expire after weeks. Re-running the bootstrap script is the recovery
  path.

## Specs in scope for Lane 2 first cut

* `close-box-keeps-icon` (Lane 1 acceptance test in browser form).
* `popup-hydrates` (Lane A of PostWave5 plan; popup transitions from
  `Loading...` to fully populated within 5 seconds).

Two specs total. Everything else is follow-up.

## Specs deliberately deferred

* Add-to-card happy path (covered by Wave 5 manual matrix).
* Add-to-existing-card (Wave 5 matrix).
* Attachment upload (Wave 5 matrix).
* Sign-out / re-auth flow.
* Error toasts under network failure.
* Multi-account Gmail / multi-Trello-org switching.

These all become specs in follow-up PRs once the harness is proven on
the close-box regression.

## Risks

* **Headed-only.** Chrome extensions cannot load in headless mode.
  This means CI integration needs `xvfb` on Linux. Local runs need a
  visible display. Acceptable for first cut; users were already doing
  this manually.
* **Gmail UI churn.** Selectors like `[gh='mtb']` are stable across
  Gmail's recent layouts but not guaranteed forever. The harness
  inherits this fragility from production.
* **OAuth flow timing.** First-time bootstrap requires manual sign-in;
  subsequent runs depend on stored state being valid. If Trello
  rotates the OAuth1 token format, the bootstrap script needs an
  update.
* **Cucumber JSDOM coexistence.** Two different test runners. Spell
  out in the new info doc that `npm test` is the unit/integration
  runner and `npm run test:e2e` is the end-to-end runner; they are
  not redundant.

## Acceptance criteria

* `npm run test:e2e` runs against the unpacked extension in headed
  Chrome, completes in under 60 seconds, exits 0 with the Lane 1 fix
  in place.
* Reverting the Lane 1 fix flips the `close-box-keeps-icon` spec to
  failing within the same 60-second budget.
* README and the new info doc document the one-time auth bootstrap
  step, the spec layout, and how to add a new spec.
* No production code touched (this lane is tooling-only).

## Out of scope

* CI wiring (GitHub Actions). Follow-up PR.
* Visual regression / screenshot diffing.
* Migration of Cucumber + JSDOM specs into Playwright.
* Anything Claude in Chrome related (only mentioned as a fallback).
