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
