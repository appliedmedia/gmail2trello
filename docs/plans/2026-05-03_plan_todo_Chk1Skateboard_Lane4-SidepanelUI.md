# G2T Panel Lane 4: Sidepanel UI

**Date**: 2026-05-03
**Status**: TODO
**Parent**: [G2T Panel Orch](<2026-05-03_plan_todo_Chk1Skateboard_Orch.md>)
**Architecture**:
[G2T New Architecture Orch](<2026-05-03_plan_todo_G2tNewArchitecture_Orch.md>)
defines the Registry, action envelope, activity feed, and progress
patterns referenced below.
**Depends on**: [Lane 1: Scaffold](<2026-05-03_plan_todo_Chk1Skateboard_Lane1-ScaffoldAndSidepanel.md>),
[Lane 2: Gmail Bridge](<2026-05-03_plan_todo_Chk1Skateboard_Lane2-GmailBridge.md>),
[Lane 3: Trello Auth](<2026-05-03_plan_todo_Chk1Skateboard_Lane3-TrelloAuthAndApi.md>)
**Location**: All paths relative to `code/`.

## Goal

Replace the panel skeleton from Lane 1 with the real card-creation UI.
End state: with Gmail open and the user signed in to Trello, the panel
shows the active email's data, lets the user pick a destination
board/list/card-mode, edit title and body, attach Gmail attachments,
and hit "Add to Trello". On success the panel shows the created card
link and an "Add another" reset.

## Chk1 Skateboard scope

Deliver a minimal panel; the rest of this doc captures ideal-final-
state for reference, with the per-stage cuts noted in
"Out of scope for Chk1" below.

* **Header**: signed-in username + sign-out button. NO settings gear,
  NO help link.
* **Source card**: display subject, sender, body. Read-only. NO
  refresh button.
* **Destination card**: board picker + list picker. NO mode radios,
  NO card picker.
* **Card details card**: title (text input, prefilled from subject),
  body (textarea, prefilled from body). NO labels, members, due,
  markdown toggle, attachment checklist, image checklist, link/CC
  toggles.
* **Action bar**: "Add to Trello" button. Form clears on success.
  NO Cancel/Reset.

Chk1 file set:

* `views/header.ts`, `views/source-card.ts`, `views/destination-card.ts`,
  `views/details-card.ts`, `views/action-bar.ts`, `views/idle.ts`.
* `components/render.ts`, `components/combobox.ts`.
* `sidepanel.html`, `sidepanel.css`, `sidepanel.ts`.

## Out of scope for Chk1 (deferred to later stages)

* Status strip + `Progress` component -- Chk2 Scooter (status strip
  arrives with attachment uploads).
* `progress.report` / `progress.get` action handlers -- Chk2 Scooter.
* `trello.card.attach` action handler + the upload chain port from
  `g2t_upload_attach` -- Chk2 Scooter.
* Chip-multiselect primitive (`components/chip-multiselect.ts`) and
  the labels / members views -- Chk3 Bicycle.
* `activity-tab.ts` + `ActivityFeed` component +
  `activity.append/list/forget` handlers -- Chk4 Motorcycle.
* `snackbar.ts` + Undo wiring -- Chk4 Motorcycle.
* `form-state.ts` + session-storage rehydrate + pending-action
  handoff -- Chk5 Sedan.
* `onboarding/first-run.ts` + `Settings.firstRun` -- Chk5 Sedan.
* `settings.get/set` handlers -- Chk5 Sedan.
* prefers-color-scheme dark theme + accessibility audit -- Chk6 SUV.

## Layout

Mirror the existing popup layout but optimize for vertical real estate
since the side panel is tall and narrow. From top to bottom:

* **Header strip** (~48px tall):
  * Trello avatar + username (clickable to user's Trello home)
  * Sign-out button, settings gear, help link
* **Status strip** (hidden when idle):
  * Progress bar + message + percentage. Borrow gsheet2json's pattern
    from
    [layout.html](</Users/acoven/dev/gsheet2json/main/src/layout.html>).
    Driven by the `Progress` component (polling
    `chrome.storage.session` per the architecture doc).
* **Source card** (~80px):
  * Email subject (read-only)
  * Sender name and email
  * Email date
  * "Refresh" button to re-pull from Gmail (rare; useful when the
    bridge missed an event)
* **Destination card** (~120px):
  * Board picker (combobox)
  * List picker (combobox, enabled when board chosen)
  * Mode radios: New card | Add to existing card
  * Card picker (combobox, enabled when mode is "Add to existing")
* **Card details card** (~auto):
  * Title (text input, prefilled from email subject)
  * Body (textarea, prefilled from email body, with markdown toggle)
  * Labels (chip multiselect, populated from board)
  * Members (chip multiselect, populated from board)
  * Due date + time
  * Attachments checklist (each Gmail attachment a row with checkbox)
  * Images checklist (each inline image a row with thumbnail)
  * Toggles: include Gmail link, include CC list
* **Action bar** (sticky bottom):
  * Add to Trello (primary)
  * Cancel / Reset (secondary)
* **Activity tab** (collapsible):
  * Lists last 100 activity entries from the `ActivityFeed` component.
  * Each row is `{ at, ok, title, subtitle?, openUrl? }` per the
    architecture doc. Click a successful row to reopen the created
    Trello card. "Forget" button per row.

## Decisions to lock

* Vanilla DOM with a small render helper. No React, no Lit. Default
  per Orch. Re-evaluate if the form complexity grows past what vanilla
  + handwritten state management cleanly handles.
* Each view (header, source-card, destination-card, details-card,
  action-bar, activity-tab) is a Registry component owned by the
  sidepanel app. It calls `reg.use('actionClient.dispatch',
  'gmailContextStore.subscribe', 'formState.update', ...)` for the
  methods it needs. View components do not import each other.
* CSS approach: single `sidepanel.css`, CSS custom properties for
  theming, prefers-color-scheme media query for light/dark. No CSS
  framework. Matches gsheet2json's
  [style-css.html](</Users/acoven/dev/gsheet2json/main/src/style-css.html>)
  and the existing g2t style.
* State persistence: a `FormState` Registry component owns the typed
  form state. On every change, debounced 200ms, it writes to
  `chrome.storage.session.set({ ['g2tPanel.formState.' + tabId]: state })`.
  On panel open, hydrate from the same key. Survives panel
  close/reopen but not browser restart.
* Pending-action handoff: on sidepanel boot, read-and-clear
  `chrome.storage.session['g2tPanel.pendingAction']` (set by the worker
  when the user clicks the action icon while a Gmail email is open).
  Pattern lifted from
  [gsheet2json main.ts pendingAction](</Users/acoven/dev/gsheet2json/main/src/main.ts>).
* Combobox: write a small accessible combobox component, ~150 lines.
  Do not pull in jQuery UI. The existing `combo.js` from gmail2trello
  is jQuery UI based and is the wrong shape for a fresh codebase.
* Validation: required fields are board, list, and (for add-to-existing
  mode) card. Validate on submit, not on every keystroke. Show errors
  inline next to the offending field with role=alert.
* Undo: after a successful card creation, show a snackbar with the
  card title, link, and an "Undo" button. Undo dispatches
  `trello.card.delete` within the first 10 seconds.
* Submit flow:
  1. Action bar collects form state from `FormState`.
  2. Dispatches `trello.card.create` (or `.comment` if add-to-existing).
  3. Per attached file/image, dispatches `trello.card.attach`. The
     attach handler is the new home for the existing
     [g2t_upload_attach](</Users/acoven/dev/gmail2trello/main/chrome_manifest_v3/class_model.js>)
     flow: download from Gmail, upload to Trello, report progress.
  4. On success, append `ActivityFeed` entry, show snackbar with undo,
     reset form (or keep open per setting).

## Files to create

All paths under `code/`.

### Registry components (UI)

* `src/sidepanel/views/header.ts`. Registry component, view. ~120
  lines.
* `src/sidepanel/views/source-card.ts`. ~150 lines.
* `src/sidepanel/views/destination-card.ts`. ~250 lines.
* `src/sidepanel/views/details-card.ts`. ~350 lines.
* `src/sidepanel/views/action-bar.ts`. ~150 lines.
* `src/sidepanel/views/activity-tab.ts`. ~150 lines. Consumes
  `ActivityFeed`.
* `src/sidepanel/views/idle.ts`. Idle empty-state and not-signed-in
  views.
* `src/components/form-state/form-state.ts`. Registry component.
  Typed state, pub/sub for changes, debounced session-storage write.
* `src/components/activity-feed/activity-feed.ts`. Registry component.
  Append-only, capped at 100, persisted in `chrome.storage.local`.
  Append/list/forget methods. Mirrors gsheet2json `Settings.appendActivityEntry`.
* `src/components/progress/progress.ts`. Registry component. Polls
  `chrome.storage.session` for `progress/<sessionId>` keys. Used by
  the status strip during attachment uploads.
* `src/sidepanel/onboarding/first-run.ts`. First-run welcome overlay,
  pattern lifted from gsheet2json
  [index.html onboarding block](</Users/acoven/dev/gsheet2json/main/src/index.html>).
  Triggered by `Settings.firstRun === true`.

### UI primitives (not Registry components, just modules)

* `src/sidepanel/components/combobox.ts`. Accessible combobox, ~150
  lines.
* `src/sidepanel/components/chip-multiselect.ts`. ~100 lines.
* `src/sidepanel/components/snackbar.ts`. ~80 lines. Hosts the undo
  surface.
* `src/sidepanel/components/render.ts`. Tiny render helper (clone
  template, fill placeholders). ~40 lines.

### Composition

* `src/sidepanel/sidepanel.html`. Replace Lane 1 placeholder. ~80
  lines of semantic HTML, includes empty containers for each view.
* `src/sidepanel/sidepanel.css`. ~600 lines. Light + dark themes via
  `prefers-color-scheme`.
* `src/sidepanel/sidepanel.ts`. ~150 lines coordinator. Boots
  `createSidepanelApp(...)` with the full component list, calls
  `reg.use(...)` for each view's `render` method, mounts each view
  into its DOM container.

### Action handlers (worker side, additions to Lane 3 set)

* `src/actions/handlers/activity.append.ts`,
  `activity.list.ts`, `activity.forget.ts`.
* `src/actions/handlers/settings.get.ts`, `settings.set.ts`.
* `src/actions/handlers/progress.get.ts`,
  `progress.report.ts` (the latter is also called internally by the
  attach-flow handler).
* `src/actions/handlers/trello.card.attach.ts` -- this is where the
  current
  [g2t_upload_attach upload chain](</Users/acoven/dev/gmail2trello/main/chrome_manifest_v3/class_model.js>)
  ports forward. Reads the attachment list from the request, downloads
  from Gmail (fetch with credentials), uploads to Trello via
  `TrelloApi.attach`, reports progress per file.

## Test plan for this lane

* Cucumber: at minimum the same coverage the current g2t has for the
  popup form (form validation, board change cascades to list reset,
  list change cascades to card reset, submit emits the right payload,
  attachment toggles, due date shortcuts).
* Manual: install, sign in, open Gmail, click an email, panel shows
  source data, pick a board, list cascades populate, type a title,
  hit Add. Card appears in Trello within 2s. Undo within 10s deletes
  the card.
* Accessibility: keyboard-only run. Every control reachable via Tab,
  every action triggerable via Enter/Space. Screen reader: every
  control has a meaningful label.
* Theme: switch macOS to dark mode, panel re-themes.

## Risks

* Trying to mirror the existing popup form too literally leaves us
  with the same usability quirks. Treat the existing form as the
  feature spec, not the UI spec. Rebuild the layout from scratch using
  the Lane-4 layout above; do not port the old DOM tree.
* Combobox accessibility is hard to get right. If the lightweight
  homegrown component breaks under screen readers, fall back to
  `<select>` + a small filter input above it.
* Synchronizing form state across panel-close and re-open is easy to
  get wrong. The `FormState` component plus session-storage
  hydrate-on-open pattern is the cleanest path; commit it once and
  write a Cucumber scenario for it.
* Attachment upload is the part that already works in the current
  extension. The risk here is regression. Mitigation: port the upload
  chain *behavior* (download from Gmail with credentials, upload to
  Trello, retry on 429) verbatim into the new `trello.card.attach`
  handler and keep an integration test that exercises a real
  multi-attachment thread.

## Evaluator briefs

**ARCH** `mod:c75:s50='claude-opus-4-8/claude'`

* Every view is a Registry component: header, source-card,
  destination-card, details-card, action-bar, idle each have
  `static readonly id` and declare collaborators via `reg.use()`.
  No view imports another view directly.
* Views do not import `TrelloApi`, `TrelloAuth`, `GmailEnvironment`,
  or `ActionClient` directly. Every data access goes through
  `reg.use('actionClient.dispatch')` or a store subscription.
* All state mutation flows through action dispatch. No view holds
  authoritative state in a module-level variable.
* Combobox and render helpers are UI primitives (not Registry
  components), fed by action responses only, never by direct API
  calls.

**QUALITY** `mod:c65:s40='claude-opus-4-8/claude'`

* `features/sidepanel-form.feature` must cover all five Skateboard
  panel states: off-Gmail, Gmail/no-email-open, Gmail/signed-out,
  Gmail/signed-in, post-success.
* Scenario coverage also required for: board change cascades to list
  reset, "Add to Trello" disabled until a list is chosen, submit
  dispatches `trello.card.create` with correct payload, success state
  renders card link and "Add another."
* TSDoc on each view component (class, constructor collaborators,
  public `render()` method).
* Keyboard-only completion verified: every control reachable via Tab,
  every action triggerable via Enter/Space.
* The 12-item Skateboard validation contract from `_project_mgmt.md`
  is manually run and every item passes. Results recorded as a
  walkthrough paragraph in the orch's `## Review findings` section
  (auditor name + date).

**PROCESS** `mod:c65:s40='claude-opus-4-8/claude'`

* `Produces:` six view components, combobox + render helpers,
  sidepanel.html, sidepanel.css, sidepanel.ts coordinator,
  sidepanel-form.feature.
* `Not produces:` worker-side action handlers beyond what Lane 3
  specified, gmail-env changes, orch updates, any edit to
  `chrome_manifest_v3/`.
* Depends on Lanes 1, 2, and 3 merged to main before task workers
  start writing view source files.
* All writes use absolute paths under the assigned worktree. First
  message includes `Rehydrated:` header.

## Out of scope for this lane

* Saved presets ("save this board+list combination as a default for
  this Gmail label"). Worth doing post-launch.
* Bulk add (select N emails, add all to a board). Future work.
* Custom fields (Trello Power-Up). Future work.
* Localization. English-only for v1.

## What "done" looks like

* Cucumber Lane-4 scenarios pass.
* Manual end-to-end: open panel on a Gmail thread, pick board/list,
  hit Add, card appears in Trello with the Gmail body, attachments,
  back-link, and any selected labels/members.
* Undo within 10s deletes the card.
* Keyboard-only completion of the entire flow.
* Light + dark theme both render correctly.
