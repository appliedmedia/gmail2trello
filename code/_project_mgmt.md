# G2T Panel Project Management: Status Visibility

**Status**: durable
**First drafted**: 2026-05-03
**Owner**: codebase. Every change that flips a task checkbox or completes a lane / checkpoint refreshes the dashboard at [`README.md`](<README.md>) (this folder).
**Adapted from**: Claiyr's [`_project_mgmt.md`](</Users/acoven/dev/claiyr/main/docs/_project_mgmt.md>); G2T uses an 8-stage ladder (vs Claiyr's 10) and folds Claiyr's `docs/_project_mgmt.md` + `code/README.md` split into a single `code/` location.

## Why this doc exists

The internal team (and any non-technical stakeholder) needs to see where G2T Panel stands without reading ten plan files. App-store changelists and TestFlight notes are *user-facing* and tell a different story; they list what shipped, not what is underway. This doc defines the internal-facing status surface: where it lives, what it shows, how it is computed, and when it gets updated.

A change to this doc is a change to the project-management contract.

## Where status lives

The dashboard lives at the **top** of [`README.md`](<README.md>) (this folder). Boilerplate (folder layout, build / test commands, conventions) lives at the **bottom** of the same file.

This placement is deliberate:

* Anyone who lands in the repo and opens `code/README.md` sees status first.
* The boilerplate is reference material and lives below the dashboard so it does not crowd the at-a-glance view.
* Engineers reading the codebase are already in `code/`; they should not have to bounce to `docs/` for status.
* Non-technical stakeholders can read the dashboard top-to-bottom and learn current phase, % complete, ETA, last 3 done, and next 3 upcoming without opening a single plan file.

There is exactly one dashboard. Other folders' READMEs (`code/src/components/<name>/README.md`, etc.) describe their local contents per [P13](<_principles.md>) and **do not** duplicate the dashboard.

## The 8-stage ladder

Each stage is a *whole, working* product per [P16](<_principles.md>). The user can install G2T Panel at any stage and use it; what increases stage-over-stage is the feature set, not the integrity of the substrate.

* **Chk1 Skateboard** --- A user installs G2T Panel, opens the Chrome side panel on a Gmail thread, signs in to Trello, picks a destination board and list, hits "Add to Trello," and a Trello card appears on that list with the email's subject as the card title and the email's body as the card description. No attachments. No labels, members, or due date. No add-to-existing-card mode. No activity feed. The substrate (Registry + Actions + GmailEnvironment + TrelloApi) is real end-to-end --- no mocks, no placeholders. P16 says a Skateboard with a `MockTrelloApi` is not a Skateboard.

* **Chk2 Scooter** --- Skateboard plus attachments. The user can tick checkboxes next to the email's attachments and inline images; on submit, each attachment is downloaded from Gmail (with credentials, mirroring the existing extension) and uploaded to the new Trello card. Progress per file is shown in the panel's status strip. The 429-backoff path on Trello's attach endpoint is exercised. The load-bearing port of the existing `g2t_upload_attach` flow lands here as the `trello.card.attach` action handler.

* **Chk3 Bicycle** --- Scooter plus rich card metadata. Labels (chip multiselect, populated from the chosen board), members (chip multiselect), due date + time. Markdown toggle on the body. Toggles for "include Gmail link" and "include CC list." Source-card refresh button. The card details card is now feature-complete for new-card creation.

* **Chk4 Motorcycle** --- Bicycle plus add-to-existing-card mode. Mode radio: New card | Add to existing. When "Add to existing" is chosen, a card picker (combobox) appears, populated from the chosen list. Submit dispatches `trello.card.comment` instead of `trello.card.create`. Activity feed (capped at 100, persisted in `chrome.storage.local`) is exposed in a collapsible tab. After successful card creation, a snackbar with an "Undo" button appears for 10 seconds; Undo dispatches `trello.card.delete`.

* **Chk5 Sedan** --- Motorcycle plus persistence. `FormState` Registry component owns the typed form state and writes to `chrome.storage.session` debounced 200ms; the panel hydrates from the same key on open. Pending-action handoff: clicking the action icon while a Gmail email is open writes `g2tPanel.pendingAction` to session storage; the next sidepanel boot reads-and-clears it. `Settings` Registry component persists user preferences (default board / list, "keep panel open after submit," etc.) to `chrome.storage.local`. First-run onboarding overlay greets first-time users.

* **Chk6 SUV** --- Sedan plus polish: full keyboard navigation (every control reachable via Tab, every action triggerable via Enter / Space), screen-reader labels, focus-visible outlines, friendly error mapping (Trello 401 → "Sign in again"; 429 → "Too many requests, slowing down"; network error → "Check your connection"), light + dark theme parity via `prefers-color-scheme`. Real-device verification: install on a fresh Chrome profile on macOS / Windows / Linux; verify end-to-end on a real Gmail account.

* **Chk7 Bus** --- SUV plus cutover. G2T Panel lands on the Chrome Web Store as a separate listing. Migration handler: if the old `gmail2trello` extension is also installed, G2T Panel detects it on first run and offers to import the user's saved board / list defaults. Old extension goes into deep maintenance mode (security fixes only); G2T Panel becomes the active development line.

* **Chk8 Airplane** --- Bus plus power-user features. Saved presets ("save this board+list combination as a default for the Gmail label `inbox/projectX`"). Bulk add (select N emails in the Gmail thread list, add all to a board, one card each). Custom-fields support (Trello Power-Up surface). Localization (English + at least one second locale, demonstrating the i18n path). Optional organization-level features for Trello Enterprise SSO if the v1 user base demands it.

The ladder is a contract. A future PR proposing to insert a new stage (e.g., a "Tricycle" between Scooter and Bicycle) updates this doc *and* the dashboard ladder in the same commit. Silent insertion is forbidden.

## Skateboard validation contract

The five panel states the Chk1 Skateboard build must render correctly are:

* **Off-Gmail** --- the active tab is not on `mail.google.com`. Panel intentionally has no copy for this state because the action-icon click silently navigates the active tab to `https://mail.google.com/` and lets the next render handle the panel.
* **Gmail / no email open** --- the user is on a Gmail tab but no thread is open (inbox view, label view, search results). Panel shows an "Open an email to continue" prompt.
* **Gmail / signed out of Trello** --- a thread is open but the user has no valid Trello token. Panel shows the source card (subject + sender, read-only) and a "Sign in to Trello" button.
* **Gmail / signed in to Trello** --- a thread is open and the Trello token is valid. Panel shows the source card, the destination card with board+list pickers, the details card with title + body pre-filled and editable, and an enabled "Add to Trello" button once a list is picked.
* **Post-success** --- a card was just created. Panel shows a success line + a link to the created card and offers an "Add another" reset.

The Chk1 Skateboard build is complete when all twelve checks below pass on a fresh Chrome profile against a real Gmail account and a real Trello account:

* [ ] Fresh install. Action icon reachable from the Chrome toolbar (pinned or via puzzle-piece menu).
* [ ] Click icon on a non-Gmail tab. Active tab silently navigates to `gmail.com` (no copy in panel).
* [ ] Navigate to `mail.google.com` inbox. Panel shows "Open an email" prompt.
* [ ] Open an email. Panel shows that email's subject + sender, read-only.
* [ ] Navigate to a different email. Panel updates within 1 second.
* [ ] Click "Sign in to Trello." OAuth1 flow opens, completes, returns signed in. Username appears in panel header.
* [ ] Boards picker populated. Pick a board. Lists picker populates.
* [ ] Pick a list. "Add to Trello" enables. Title + body pre-filled and editable.
* [ ] Click "Add to Trello." Within 5s a card appears on the picked list with the picked title and body.
* [ ] Panel shows success + a link to the created card. Form clears.
* [ ] Click sign out. Token cleared. Panel returns to "Sign in" state.
* [ ] Negative: revoke the token in Trello account settings while panel is open. Next click surfaces "Sign in again" cleanly (no console error).

This is the single source of truth for Chk1 Skateboard acceptance. The Chk1 Orch's "What done looks like" section points back here; lane-level test plans are subordinate to it. Per [P16](<_principles.md>): a check that does not pass is a bug, not a deferrable item.

## Definitions

* **Phase / Checkpoint**: a stage on the 8-stage ladder above. Phases are written `Chk1`..`Chk8` per Claiyr's checkpoint-naming convention.
* **Task**: a single Markdown checkbox (`[ ]` or `[x]`) inside any plan file under `docs/plans/`. Both phase orchs and lane plans count. Meta plans (e.g., the existing `2026-04-26_plan_todo_Wave4ShipPrep_*` files) count for the *recent activity* feed but not for the per-checkpoint task counts.
* **Defined checkpoint**: a checkpoint with at least one plan file in `docs/plans/` named `*_Chk{N}{StageName}*.md`. As of 2026-05-03 only Chk1 Skateboard is defined; the other 7 are estimated from Chk1's task density.
* **Undefined checkpoint**: a checkpoint with no plan file yet. Its task count is *estimated* from the average task count across defined checkpoints.
* **Done task**: a checkbox marked `[x]`. Completion date is approximated from the most recent commit that touched the file containing the checkbox.

## Dashboard sections

The dashboard at the top of `code/README.md` shows, in this order:

* **TLDR** (1 paragraph): current checkpoint, % complete on that checkpoint, ETA for all 8 done at the current pace, what shipped most recently. Written so a non-technical reader can stop here and have the picture.
* **Header**: project name, current checkpoint, current lane, and the date the dashboard was last regenerated.
* **Phase ladder**: hierarchical bullet list of all 8 checkpoints. Each shows:
  * Checkpoint number and stage name.
  * Status (`done` / `in progress` / `todo`).
  * Task count (`X done / Y total`; estimated count for undefined checkpoints is suffixed `est`).
  * One-sentence reminder of what the user can do at that stage (lifted verbatim from the ladder section above).
  * Link to the checkpoint's orch if it exists; otherwise a link to this doc as the fallback.
* **Last 3 tasks completed**: the three most recently flipped `[x]` checkboxes, with completion date and source plan file.
* **Next 3 tasks upcoming**: the three earliest `[ ]` checkboxes in dependency order, taken from the active lane's plan, then the active checkpoint's orch, then the next checkpoint's plan. Skip checkboxes blocked by upstream lanes.
* **Average time per task**: `(today - project_start) / total_done_tasks`, expressed in hours (one decimal place). Project start is the date this doc was created (2026-05-03).
* **ETA for all 8 checkpoints done**: `now + (total_remaining_tasks * avg_time_per_task)`. Result is expressed as an absolute date.

The dashboard ends with a one-line "How this is updated" pointer back to this doc.

## How metrics are computed

Counts are produced by scanning `docs/plans/*.md` for the regular expressions `\[x\]` (done) and `\[ \]` (todo). Each match is one task.

Averages and ETAs use:

* `project_start = 2026-05-03` (the day this ladder was defined; baked into this doc, not derived).
* `today = current date when the dashboard is regenerated`.
* `total_done = count of [x] across all G2T Panel plan files (Chk1..Chk8 + future planning)`.
* `total_todo_defined = count of [ ] across plan files for defined checkpoints`.
* `defined_checkpoints = checkpoints with at least one plan file`.
* `avg_tasks_per_defined_checkpoint = sum(tasks per defined checkpoint) / count(defined_checkpoints)`. Ignore meta plans for this denominator.
* `undefined_checkpoints = 8 - count(defined_checkpoints)`.
* `estimated_remaining = total_todo_defined + (avg_tasks_per_defined_checkpoint * undefined_checkpoints)`.
* `avg_time_per_task = (today - project_start) / total_done`.
* `eta_all_done = today + (estimated_remaining * avg_time_per_task)`.

Plans for the existing `chrome_manifest_v3/` extension (Wave1..Wave5, the click/auth regression fix in `2026-05-03_plan_todo_PostWave5ClickAndAuthRegression.md`, etc.) are **not counted** in G2T Panel's task totals. They belong to the maintenance-mode line and have their own progress notes inline. The `code/` dashboard tracks G2T Panel only.

Caveats noted on the dashboard so consumers do not over-trust early numbers:

* Early data is dominated by documentation and decision tasks, which complete faster than code-lane tasks. The average will rise as code lanes engage.
* Undefined checkpoints are estimated by Chk1's task density; subsequent checkpoints may differ in scope.
* The "last 3 completed" feed is approximated by file modification time, not per-checkbox commit history. A future automation pass tightens this.

## Update cadence

The dashboard regenerates whenever a meaningful task lands. Specifically:

* Any commit that flips a `[ ]` to `[x]` in `docs/plans/*Chk*.md` is followed in the same PR (or the PR that lands the lane it belongs to) by a regeneration of `code/README.md`.
* Any commit that lands a new checkpoint plan or lane plan is followed by a regeneration so the new file is reflected in the per-checkpoint counts.
* Any commit that completes a lane (renames its plan from `_todo_` to `_done_`) is followed by a regeneration.

Until the regeneration is automated, the regeneration step is a checklist item the author runs by hand: open `code/README.md`, recount, rewrite the dashboard between the `<!-- DASHBOARD START -->` and `<!-- DASHBOARD END -->` markers. **Future automation**: an `npm run refresh-status` script (per [P15](<_principles.md>)) will scan `docs/plans/` and rewrite the dashboard between those markers. The script lands once Chk1 Skateboard's lanes complete; until then the manual update is the contract.

## What goes at the bottom of `code/README.md`

Below the dashboard, the boilerplate section covers:

* What the `code/` folder contains (foundation docs, `src/` for engine code, `tests/` for cucumber features).
* Per-folder pointers to the relevant `src/` subfolder READMEs (worker, sidepanel, content, components).
* The build commands a contributor needs first (`npm run build`, `npm test`, `npm run lint`, `npm run type-check`).
* Pointers to the durable docs ([principles](<_principles.md>), [architecture overview](<_arch.md>), [interventions](<_interventions.md>)).

The boilerplate is intentionally short. The truth lives in the TSDoc inside each module (P13) and the principles / architecture docs at the top of `code/`.

## Relationship to user-facing release notes

App-store release notes, Chrome Web Store changelists, and any future public changelog tell users *what shipped*. They are written from the user's perspective and edited for consumption.

The dashboard tells the *internal team and the project owner* what is in motion right now. It is intentionally raw: task counts, recently flipped checkboxes, the next three things in line. There is overlap when a feature lands, but the two surfaces have different audiences and different update cadences. Do not collapse them.

<!-- end _project_mgmt.md -->
