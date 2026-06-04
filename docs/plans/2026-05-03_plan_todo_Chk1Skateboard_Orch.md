# Chk1 Skateboard: Orchestration

**Date**: 2026-05-03
**Status**: TODO
**Stage**: Chk1 (Skateboard) of the 8-stage ladder. See
[code/_project_mgmt.md](</Users/acoven/dev/gmail2trello/main/code/_project_mgmt.md>)
for the full ladder.
**Architecture**:
[code/_arch.md](</Users/acoven/dev/gmail2trello/main/code/_arch.md>)
defines the Registry / Actions / GmailEnvironment / TrelloApi pillars
this stage rides on. Read first.
**Principles**:
[code/_principles.md](</Users/acoven/dev/gmail2trello/main/code/_principles.md>).
**Architecture rationale**:
[G2T New Architecture Orch](<2026-05-03_plan_todo_G2tNewArchitecture_Orch.md>)
spells out the migration motivation and the four-pillar synthesis from
print2paper4vscode + claiyr + gsheet2json.
**Working name**: `g2t-panel` (final branding deferred to Chk7 Bus).
**Location**: All new code lives under `code/` (sibling of
`chrome_manifest_v3/` inside the existing `gmail2trello` repo). NO new
repo. The current `chrome_manifest_v3/` keeps shipping point fixes; the
new code grows beside it.

## Goal

Per
[code/_project_mgmt.md](</Users/acoven/dev/gmail2trello/main/code/_project_mgmt.md>):

> A user installs G2T Panel, opens the Chrome side panel on a Gmail
> thread, signs in to Trello, picks a destination board and list, hits
> "Add to Trello," and a Trello card appears on that list with the
> email's subject as the card title and the email's body as the card
> description.

That is the entire Chk1 Skateboard slice. It is end-to-end usable -- a
ridable skateboard, not a wheel. Subsequent stages add attachments
(Chk2 Scooter), labels/members/due (Chk3 Bicycle), add-to-existing +
activity feed + Undo (Chk4 Motorcycle), persistence + first-run (Chk5
Sedan), polish + accessibility (Chk6 SUV), public cutover (Chk7 Bus),
and power-user features (Chk8 Airplane).

## Why a side panel (the program-level rationale Chk1 inherits)

* Persistent context. Users keep the panel open across multiple emails
  and across non-Gmail tabs.
* Standard Chrome surface. Native `chrome.sidePanel` API is
  enterprise-policy-friendly and bypasses the Gmail-DOM-mutation issues
  that have plagued the toolbar+popup variant.
* Easier accessibility story. The side panel is a normal HTML document
  with predictable focus order, no toolbar mutation observers fighting
  the popup's event listeners.
* Easier UI iteration. We can ship a richer UI (tabs, recent activity,
  quick search, board favorites, keyboard shortcuts) without colliding
  with Gmail's own toolbar layout.
* Zero CSP / Trusted Types pain in the panel itself, since the panel is
  our own document, not Gmail's.

## Lanes for Chk1 Skateboard

* [Lane 1: Scaffold + Sidepanel API](<2026-05-03_plan_todo_Chk1Skateboard_Lane1-ScaffoldAndSidepanel.md>)
  -- runnable extension skeleton, MV3 manifest, Registry, Action
  dispatcher, ping round-trip from sidepanel to worker. End state: load
  unpacked, click action icon, panel opens, ping button returns typed
  reply.
* [Lane 2: Gmail Bridge](<2026-05-03_plan_todo_Chk1Skateboard_Lane2-GmailBridge.md>)
  -- content script in Gmail that captures the active email's subject,
  sender, and body (Skateboard scope -- attachments and inline images
  deferred to Chk2). End state: with Gmail open and the panel visible,
  the panel reflects the active email's data and updates as the user
  navigates between emails.
* [Lane 3: Trello Auth + API Client](<2026-05-03_plan_todo_Chk1Skateboard_Lane3-TrelloAuthAndApi.md>)
  -- OAuth1 sign-in via `chrome.identity.launchWebAuthFlow`, six action
  handlers needed for Skateboard: `trello.signIn`, `trello.signOut`,
  `trello.authState`, `trello.boards.list`, `trello.lists.list`,
  `trello.card.create`. (`listCards` / `listLabels` / `listMembers` /
  `getUser` / `comment` / `attach` / `deleteCard` deferred to Chk2-Chk4.)
  End state: panel signs in, lists boards and lists, creates a card.
* [Lane 4: Sidepanel UI](<2026-05-03_plan_todo_Chk1Skateboard_Lane4-SidepanelUI.md>)
  -- minimal layout for Skateboard: signed-in header, source card
  (subject/sender/body display), destination card (board+list pickers
  only), card details card (title and body fields only), action bar
  (Add only). NO attachments, labels, members, due, mode radios, card
  picker, activity tab, snackbar/Undo, onboarding overlay -- all
  deferred. End state: user completes the Skateboard flow end-to-end.

## Out of scope for Chk1 Skateboard (deferred to later stages)

* Attachments and inline images. Chk2 (Scooter).
* Labels, members, due date, markdown body, Gmail-link/CC toggles.
  Chk3 (Bicycle).
* Add-to-existing-card mode, activity feed, Undo within 10 seconds.
  Chk4 (Motorcycle).
* Form-state persistence, pending-action handoff from action icon,
  first-run onboarding overlay. Chk5 (Sedan).
* Accessibility polish, keyboard-only completion, friendly error
  toasts, light/dark theme. Chk6 (SUV).
* Chrome Web Store cutover, settings migration from current g2t,
  retiring `chrome_manifest_v3/`. Chk7 (Bus).
* Saved presets, bulk add, custom fields, localization, organization
  features. Chk8 (Airplane).

## Decisions locked at stage start

These are program-level decisions confirmed for Chk1 (and stable for
all later stages unless an intervention overrides):

* TypeScript. esbuild build. Vanilla DOM in the sidepanel (no React).
* Hand-port Registry + Action dispatcher into `code/src/composition/`
  and `code/src/actions/`. No npm DI dep.
* Keep `gmail.js` for v1, behind the `GmailEnvironment` Registry
  component only.
* New Trello app key for G2T Panel (separate audit trail from the current
  g2t key).
* `chrome.storage.local` for the Trello token. Document the
  unencrypted-on-disk limitation in the privacy policy.
* Trusted Types policy NOT registered for the sidepanel (it owns its
  own document).
* Cucumber.js test harness, mirrors current `tests/cucumber/` shape.

## Decisions deliberately deferred

* Final brand name. Working name is "G2T Panel." Marketing call.
* Pricing / paid tiers / license enforcement. Out of scope until Chk7
  Bus.
* Migration UX from existing g2t users to G2T Panel. Chk7 Bus.
* Whether to retire `chrome_manifest_v3/` after Chk7 Bus. Chk8
  Airplane question.
* **Additional sources beyond Gmail.** Skateboard ships Gmail only. A
  second source (e.g., scrape an arbitrary page into a Trello card) is
  deliberately undesigned right now -- the architecture leaves the
  Source-side seam pluggable but does not commit to a second source's
  behaviour. When (or whether) a second source lands is a
  future-checkpoint question; treat "panel = Gmail panel" as a v1
  simplification, not an architectural commitment. See
  [code/_arch.md](</Users/acoven/dev/gmail2trello/main/code/_arch.md>)
  "Source pluggability."

## Stated goals

* G1: scaffold-substrate: Registry, ActionDispatcher, and ping round-trip land in `code/src/`. Proved by: Lane 1. Artifact: `npm run build` clean + Cucumber feature `skeleton.feature` passing + unpacked-install ping confirmed.
* G2: gmail-bridge: `GmailEnvironment` component captures active email and forwards to sidepanel via `gmail.context.changed` action. Proved by: Lane 2. Artifact: Cucumber feature `gmail-bridge.feature` + real-Gmail smoke (email subject + sender appear in panel within 1s of thread open).
* G3: trello-auth-api: OAuth1 sign-in completes, `trello.boards.list` / `trello.lists.list` / `trello.card.create` handlers real (no mocks). Proved by: Lane 3. Artifact: Cucumber feature `trello-auth.feature` + real Trello smoke (board picker populates, card created on submit).
* G4: sidepanel-ui: All five Skateboard panel states render correctly; twelve-item validation contract in `_project_mgmt.md` passes end-to-end. Proved by: Lane 4. Artifact: Cucumber feature `sidepanel-form.feature` + full twelve-item manual run on a fresh Chrome profile.

## Swimlane modelpicker formulas

Record before spawning each delegate agent. Architecture is fully specified (Registry shape from print2paper4vscode, action envelope from claiyr, folder layout locked in `code/_arch.md`), so specificity is high.

* Lane 1 -- Scaffold + Sidepanel: `mod:c60:s70='claude-haiku-4-5/claude'` (moderate complexity, well-specified structure; haiku at high specificity per lookup).
* Lane 2 -- Gmail Bridge: `mod:c55:s70='claude-haiku-4-5/claude'` (bounded scope: GmailEnvironment seam + one action handler; interfaces fully defined).
* Lane 3 -- Trello Auth + API: `mod:c60:s65='claude-haiku-4-5/claude'` (OAuth1 + six action handlers, all typed contracts in lane plan).
* Lane 4 -- Sidepanel UI: `mod:c50:s65='claude-haiku-4-5/claude'` (vanilla DOM views, layout described in lane plan; logic stays in worker).

Complexity note: all four lanes score c35..69 with >=s50, mapping to `claude-haiku-4-5/claude`. If a lane's scope grows or the seam contracts shift unexpectedly, escalate to `claude-opus-4-8/claude` and record the reason.

## What "done" for Chk1 Skateboard looks like

The single source of truth for Chk1 acceptance is the **Skateboard
validation contract** in
[code/_project_mgmt.md](</Users/acoven/dev/gmail2trello/main/code/_project_mgmt.md>),
which enumerates the five panel states the build must render and a
twelve-item checklist that must pass on a fresh Chrome profile against
a real Gmail account and a real Trello account. Lane-level test plans
are subordinate to it.

In addition:

* `code/` builds clean. Unpacked install in Chrome opens the panel
  within 30 seconds of a fresh clone.
* All four lane test plans pass.
* All four lanes' "Out of scope (deferred to later stages)" sections
  are explicit and accurate.
* Status dashboard in
  [code/README.md](</Users/acoven/dev/gmail2trello/main/code/README.md>)
  shows Chk1 Skateboard "DONE" and Chk2 Scooter "TODO."

## Evaluator briefs

Spawn these three antagonistic evaluators at orch open and re-spawn (or
continue) at each lane milestone. Findings go in `## Review findings`
below. Every finding must be resolved or carry-forwarded before orch close.

**ARCH** `mod:c75:s50='claude-opus-4-8/claude'`

Generic charter: seams shipped without consumer wiring, goal/impl
divergence, UI doing core work, side-channels, new abstractions
without principle citation.

Specific watch-items for Chk1:

* P10 seam containment: grep confirms zero imports of `gmail.min.js`
  outside `src/components/gmail-env/`. Grep confirms zero raw `fetch`
  to `trello.com` outside `src/components/trello/`.
* P11 channel integrity: sidepanel has no direct reference to
  `TrelloAuth`, `TrelloApi`, or `GmailEnvironment`. Every worker call
  goes through `ActionClient.dispatch`.
* P2 registration-time wiring: every `cmd` in `src/actions/registry.ts`
  has a corresponding handler file; no orphan cmds, no runtime
  `registerAction` calls.
* G1..G4 goal/impl parity: each stated goal has a real-system artifact
  (not a mock proof). Confirm `createWorkerApp` composition root
  contains no `MockTrelloApi` or `MockGmailEnvironment`.

**QUALITY** `mod:c65:s40='claude-opus-4-8/claude'`

Generic charter: absent/empty/weak test artifacts, PROVED claimed
without a real run, mocks in production code path, dead code, weak
error paths, missing TSDoc, doc drift.

Specific watch-items for Chk1:

* Feature files that must exist with real scenario coverage:
  `features/skeleton.feature`, `features/gmail-bridge.feature`,
  `features/trello-auth.feature`, `features/sidepanel-form.feature`.
* `npm test` must pass green on main. Any failing or skipped scenario
  is a QUALITY finding.
* TSDoc present on all exported classes, interfaces, and functions in
  `src/composition/`, `src/actions/`, and every component in
  `src/components/`.
* Token security: grep confirms the Trello token value never appears
  in `console.log`, `chrome.storage.session`, or sidepanel DOM.
* Error paths: every action handler has an explicit error path
  returning `{ ok: false, error: { code, message, friendly } }`.

**PROCESS** `mod:c65:s40='claude-opus-4-8/claude'`

Generic charter: worktree violations, chat interstitials, synthesis
docs, skipped retro, unexecuted `[_]` corrective actions, delegate
agent marking task complete while its PR is still open.

Specific watch-items for Chk1:

* Worktree paths: delegate agents work under
  `.claude/worktrees/agent-<id>/`. Any Write/Edit to the canonical
  main worktree path is a PROCESS violation.
* AUTODECISIONS section in this orch grows upward; every reversible
  decision taken autonomously is logged there.
* `_interventions.md` INT-0001 and INT-0002 corrective action items
  are `[x]`-ed when the referenced artifacts land.
* No standalone synthesis, rollup, or BlockerResponse plans created
  in `docs/plans/`. Blockers live in this orch's Blockers section.
* No lane is marked done while its PR is open or unmerged.

## AUTODECISIONS

*(newest first -- grows upward as overnightit runs)*

## Review findings

*(newest first -- ARCH / QUALITY / PROCESS findings logged here)*
