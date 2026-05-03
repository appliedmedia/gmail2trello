# G2T Panel

A Chrome extension that puts Trello's "add this email as a card" experience into a persistent side panel inside Gmail, replacing the floating-popup approach the existing `gmail2trello` extension uses today.

<!-- DASHBOARD START (regenerate per _project_mgmt.md when tasks land) -->

## TLDR

* **What this is**: a sibling rebuild of the existing `gmail2trello` Chrome extension, aimed at enterprises and power users. The current extension stays published and unchanged; G2T Panel is a separate Chrome Web Store listing that grows alongside it.
* **Where we are**: **Chk1 Skateboard** --- planning. The architecture is locked (Registry + Action envelopes + GmailEnvironment + TrelloApi); the Skateboard scope is being broken down into task checkboxes across four lanes. No code has been written under `code/src/` yet.
* **What "Skateboard" means**: install the extension, open the panel on a Gmail thread, sign in to Trello, pick a destination board+list, hit "Add to Trello," and a Trello card appears with the email's subject and body. No attachments yet --- those land in Chk2 Scooter. No labels, members, or due date --- those land in Chk3 Bicycle.
* **Tasks done**: 0
* **Tasks remaining**: estimating ~150-250 across all 8 checkpoints; counts populate once the Skateboard lanes get their task TODOs (next ladder pass).
* **Average wall-clock per task**: not yet computable (no completed tasks).
* **ETA all 8 checkpoints done**: not yet computable. Expect a number to appear once Skateboard lanes have task TODOs and ~5-10 of them have flipped to `[x]`, giving a real velocity baseline.
* **Dashboard regenerated**: 2026-05-03 Sun --- foundation docs landed (`_principles.md`, `_arch.md`, `_project_mgmt.md`, `_interventions.md`, this README); G2T Panel folder structure named `code/` to align with Claiyr's convention; Chk1 Skateboard Orch + 4 lane plans renamed and scoped to the Skateboard slice.

## Phase ladder

The 8 stages below come from [Henrik Kniberg's MVP cartoon](<https://blog.crisp.se/2016/01/25/henrikkniberg/making-sense-of-mvp>): each stage is a *whole, ridable* product, not scaffolding for a later stage. A user can install G2T Panel at any stage and use it; what increases stage-over-stage is the feature set, not the integrity of the substrate.

* **Chk1 Skateboard**: PLANNING (0 done / TBD total). Open Gmail, sign in to Trello, pick board+list, hit Add, card appears with subject + body. No attachments, no labels, no due. Plan tree rooted at [`docs/plans/2026-05-03_plan_todo_Chk1Skateboard_Orch.md`](<../docs/plans/2026-05-03_plan_todo_Chk1Skateboard_Orch.md>) with four lane plans `Chk1Skateboard_Lane[1-4]-*`.
* **Chk2 Scooter**: TODO. Skateboard plus attachments and inline images. Each attached file uploads to the Trello card with a progress bar. The load-bearing port of the existing extension's upload chain.
* **Chk3 Bicycle**: TODO. Scooter plus labels, members, due date, markdown body toggle, "include Gmail link" / "include CC list" toggles. Card detail card is feature-complete for new-card creation.
* **Chk4 Motorcycle**: TODO. Bicycle plus add-to-existing-card mode (comment instead of new card), activity feed (last 100), Undo within 10 seconds.
* **Chk5 Sedan**: TODO. Motorcycle plus persistence: form state survives panel close/reopen, settings persist, first-run onboarding.
* **Chk6 SUV**: TODO. Sedan plus polish: full keyboard navigation, screen-reader labels, friendly error messages, light + dark theme parity, real-device verification.
* **Chk7 Bus**: TODO. SUV plus cutover: Chrome Web Store listing, optional migration of saved defaults from the old extension, the old `chrome_manifest_v3/` retires.
* **Chk8 Airplane**: TODO. Bus plus power-user features: presets per Gmail label, bulk add, Trello custom fields, localization, organization-level features.

Each checkpoint is plan-tracked in `docs/plans/`. The ladder definition + dashboard contract live in [`_project_mgmt.md`](<_project_mgmt.md>); the architecture they all sit on lives in [`_arch.md`](<_arch.md>); the principles every PR cites live in [`_principles.md`](<_principles.md>).

## Last 3 tasks completed

* 2026-05-03 Sun **Chk1 Skateboard scoped end-to-end**: Orch + 4 lane plans renamed to `Chk1Skateboard_*`, each lane tightened with explicit "Chk1 Skateboard scope" + "Out of scope (deferred to ChkN)" sections (Lane 2 parses subject/sender/body only; Lane 3 ships 6 of 13 Trello endpoints; Lane 4 strips down to header + source-card + board+list pickers + title/body + Add). The architecture Orch's migration path now points at the 8-stage ladder.
* 2026-05-03 Sun **Foundation docs landed**: `code/_principles.md` (17 principles, adapted from Claiyr's 19), `code/_arch.md` (system map, four pillars), `code/_project_mgmt.md` (8-stage ladder + dashboard contract), `code/_interventions.md` (post-mortem log scaffold + INT-0001 + INT-0002), this `code/README.md` dashboard.
* 2026-05-03 Sun **G2T Panel architecture locked** (`docs/plans/2026-05-03_plan_todo_G2tNewArchitecture_Orch.md`): four pillars (Registry from print2paper4vscode, Action envelopes inspired by Claiyr's Genus, gsheet2json patterns for activity feed and friendly errors, GmailEnvironment seam wrapping gmail.js). Sibling folder `code/` (not a new repo).

## Next 3 tasks upcoming

* **Generate task checkboxes inside each Skateboard lane**: write the per-task TODOs (Lane 1.1, 1.2, ... convention TBD) so the dashboard's "tasks done / tasks remaining" counts can populate. The lane scope sections are now stable enough to enumerate against.
* **Implement Lane 1 (scaffold + ping)**: stand up `code/src/composition/`, `code/src/actions/`, `code/src/worker/`, `code/src/sidepanel/`, `code/manifest.json`, and the esbuild + Cucumber harness. End state: unpacked install opens the panel; the ping button round-trips a typed envelope. First commit under `code/src/`.
* **Implement Lanes 2 / 3 / 4 in parallel for Chk1 Skateboard scope**: Gmail content-script + bridge (subject/sender/body only); Trello OAuth1 + the six Skateboard endpoints; the minimal panel UI (board+list pickers, title+body, Add). End state: end-to-end card-add flow on a real Trello account.

## Velocity and ETA

* **Tasks done**: 0 across G2T Panel plan files (the existing `chrome_manifest_v3/` extension's plan files are tracked separately and not counted here).
* **Tasks remaining**: TBD --- counts populate once Skateboard lanes get task TODOs.
* **Average time per task**: not yet computable.
* **ETA all 8 checkpoints done**: not yet computable. A first ETA appears once ~5-10 Skateboard tasks complete and a real velocity baseline exists.

Caveats: G2T Panel just started. The first task TODOs land in the rename + Skateboard-scoping pass described above. Until then, "tasks remaining" and "ETA" carry placeholders, not estimates.

## How this dashboard is updated

See [`_project_mgmt.md`](<_project_mgmt.md>). Until automation lands the regeneration is a manual step run by the author of any commit that flips a checkbox or adds a checkpoint plan: open this file, recount, rewrite the dashboard between the `<!-- DASHBOARD START -->` and `<!-- DASHBOARD END -->` markers.

<!-- DASHBOARD END -->

## What lives in `code/`

The new G2T Panel source code, plus the foundation docs that govern it.

* [`_principles.md`](<_principles.md>): the 17 principles every PR cites. Drops Claiyr's P9 (three Rust artifacts) and P11 (Netflix-style backend coupling) since G2T Panel has neither. The contract.
* [`_arch.md`](<_arch.md>): the system map. Four pillars, two seams, three Chrome execution contexts, one canonical action lifecycle. Read this if you're ramping on the codebase.
* [`_project_mgmt.md`](<_project_mgmt.md>): the 8-stage ladder + dashboard contract. Defines what a Skateboard / Scooter / Bicycle / etc. means for G2T Panel and how this dashboard is computed.
* [`_interventions.md`](<_interventions.md>): post-mortem log of project-shaping corrections. New entries land newest-first.
* `src/` (not yet created): the TypeScript source. Layout once Lane 1 lands:
  * `src/composition/`: registry + diagnostics + app composition root.
  * `src/actions/`: `ActionDispatcher` + `handlers/` + `registry.ts`.
  * `src/components/`: Registry components (`TrelloApi`, `GmailEnvironment`, `ActivityFeed`, `FormState`, ...).
  * `src/worker/`: service-worker entry point.
  * `src/sidepanel/`: sidepanel HTML / CSS / TS, plus `views/` and view-only UI primitives.
  * `src/content/`: content-script bootstrap (gmail.js bridge).
  * `src/shared/`: types and action-name literals shared across contexts.
* `tests/cucumber/` (not yet created): `.feature` files + step definitions per [P14](<_principles.md>).
* `manifest.json` (not yet created): Chrome MV3 manifest.

The existing `gmail2trello` extension lives at `../chrome_manifest_v3/` (sibling to this folder), in maintenance mode. G2T Panel grows here.

## Build (planned, not yet implemented)

Run from the repo root or from `code/`:

* `npm run build`: esbuild bundle of worker + sidepanel + content script into `dist/`.
* `npm run type-check`: `tsc --noEmit` against the workspace.
* `npm run lint`: ESLint with the existing `eslint.config.js`.
* `npm test`: Cucumber.js scenarios.

Per [P15](<_principles.md>), CI runs the same scripts a developer runs locally. A check that gates merge has a single shared entry point invoked identically in both places. Until Lane 1 lands, these scripts do not yet exist; the existing `chrome_manifest_v3/` build is unaffected.

## Testing

Per [P14](<_principles.md>), every test ships as a Gherkin scenario. Each TypeScript module under `code/src/` has at least one `.feature` file under `code/tests/cucumber/`; Cucumber.js executes the scenarios.

The existing extension's Cucumber suite (under the repo root's `tests/cucumber/`) continues to run for `chrome_manifest_v3/` work. G2T Panel's own suite under `code/tests/cucumber/` is independent and lands incrementally per lane.

## Read these next

* [The 17 Principles](<_principles.md>): the contract every PR cites.
* [Architecture overview](<_arch.md>): onboarding-grade walkthrough of the substrate, the seams, and a command's life cycle.
* [Project management contract](<_project_mgmt.md>): where status lives, how the dashboard above is computed, when it is regenerated.
* [Interventions log](<_interventions.md>): the corrections that shaped how G2T Panel is built.
* [Active checkpoint orch](<../docs/plans/2026-05-03_plan_todo_Chk1Skateboard_Orch.md>): Chk1 Skateboard lane inventory and dependency graph.

<!-- end README.md -->
