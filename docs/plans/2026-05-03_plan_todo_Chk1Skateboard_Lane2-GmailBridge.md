# G2T Panel Lane 2: Gmail Bridge

**Date**: 2026-05-03
**Status**: TODO
**Parent**: [G2T Panel Orch](<2026-05-03_plan_todo_Chk1Skateboard_Orch.md>)
**Architecture**:
[G2T New Architecture Orch](<2026-05-03_plan_todo_G2tNewArchitecture_Orch.md>)
defines the `GmailEnvironment` component contract and action envelope
patterns referenced below.
**Depends on**: [Lane 1: Scaffold](<2026-05-03_plan_todo_Chk1Skateboard_Lane1-ScaffoldAndSidepanel.md>)
**Location**: All paths relative to `code/`.

## Goal

When the user has Gmail open and the side panel is visible, the side
panel must show "live" context for the currently visible email: subject,
sender, body, attachments, time, emailId, full name. As the user
navigates between emails in Gmail, the panel must update. When the user
switches the active tab to a non-Gmail tab while the panel is already
open, the panel keeps showing the most recently parsed Gmail email
(frozen state); it does not blank out and it does not show an idle
prompt. The off-Gmail redirect-on-icon-click flow is a Lane 1 concern
(action-icon click handler in the service worker) and is not part of
this lane.

## Chk1 Skateboard scope

Deliver subject + sender + body only. The `parseEmail()` port at
`src/components/gmail-env/parse-email.ts` skips:

* Attachment parsing (`parseData_onAttachmentEach` and the
  `/^([^:]+)\s*:\s*([^:]+)\s*:\s*(.+)$/` regex). Deferred to Chk2
  Scooter.
* Inline-image parsing (`parseData_onImageEach`). Deferred to Chk2
  Scooter.
* Any field beyond what the Skateboard UI needs (subject, sender, body,
  emailId). The full `GmailContext` type still includes all fields (so
  the type is stable across stages); the Chk1 parser leaves the unused
  fields empty / null.

The bridge SURFACE (3 events + 3 getters + `parseEmail()`) is fully
delivered in this lane. Only the parser body is stubbed for fields not
needed in Chk1. Later stages enrich `parseEmail()`'s body without
touching the Registry component shape.

## Architecture

The Gmail integration is a Registry component named `gmailEnv`. Every
consumer (content-script bootstrap, worker, sidepanel) reaches it
through `reg.use('gmailEnv.X')`. Implementation is gmail.js-backed in
v1; the contract hides that detail.

### `GmailEnvironment` component (`src/components/gmail-env/gmail-environment.ts`)

```typescript
export class GmailEnvironment {
  static readonly id = 'gmailEnv';
  constructor(args: { reg: Registry }) { /* ... */ }

  bootstrap(): Promise<void>;           // load gmail.min.js, wire observers
  done(): void;                          // tear down listeners

  onReady(handler: () => void): Unsubscribe;
  onLoad(handler: () => void): Unsubscribe;
  onViewEmail(handler: (id: string) => void): Unsubscribe;

  getActiveEmailId(): string | null;
  getActiveUserEmail(): string | null;
  getActiveSubject(): string | null;

  parseEmail(emailId: string): Promise<GmailContext>;
}
```

`GmailContext` is the typed payload our entire stack passes around;
defined in `src/components/gmail-env/gmail.types.ts`. The shape mirrors
what the existing `parseData()` produces (subject, sender, body,
attachments, image inlines, time, fullName, emailId).

### Content script (`src/content/gmail-content.ts`)

Boots `createContentApp({ components: [Utils, Diagnostics, GmailEnvironment] })`.
Then:

```typescript
const fn = app.reg.use(
  'gmailEnv.bootstrap',
  'gmailEnv.onViewEmail',
  'gmailEnv.parseEmail',
);
await fn.gmailEnv.bootstrap();
fn.gmailEnv.onViewEmail(async (emailId) => {
  const ctx = await fn.gmailEnv.parseEmail(emailId);
  await sendAction({ cmd: 'gmail.context.changed', payload: ctx });
});
```

`sendAction` is the typed wrapper around `chrome.runtime.sendMessage`
defined in `src/actions/envelope.ts`. The content script never builds
raw envelope objects.

### Worker action handlers (`src/actions/handlers/gmail.*.ts`)

* `gmail.context.changed` (content -> worker). Writes payload to
  `chrome.storage.session` keyed by `g2t.gmailContext.<tabId>`. Then
  broadcasts a `gmail.context.update` envelope to any open sidepanel.
* `gmail.context.get` (sidepanel -> worker). Reads
  `chrome.storage.session` for the tab the sidepanel asks about
  (defaults to current active tab via `chrome.tabs.query`).

Both are registered in `src/actions/registry.ts` at composition time.

### Sidepanel consumption

The sidepanel app composes the Registry with a `GmailContextStore`
component (UI-side mirror) that subscribes to `gmail.context.update`
broadcasts. Views read from the store via `reg.use('gmailContextStore.subscribe')`.

### Per-tab session storage

`chrome.storage.session` keyed by `tabId`. Cleared on browser close.
That is the right behavior: a fresh browser session does not need
stale Gmail context.

## Decisions to lock

* `gmail.js` library kept (Orch default), wrapped behind
  `GmailEnvironment`. NOTHING outside this component imports gmail.js.
* `chrome.storage.session` for per-tab Gmail context. Cleared when the
  browser closes; that is the right behavior here.
* No `port`-based long-lived connection in v1. Plain envelope dispatch
  through `chrome.runtime.sendMessage` plus a `gmail.context.update`
  broadcast is enough for the UI we are building. Reassess if we add
  features that need streaming (e.g., live attachment scan).
* Trusted Types policy NOT needed in v1 because the sidepanel renders
  Gmail data as `textContent`, never `innerHTML`. If we later inject
  HTML (e.g., a rich body preview) we register a policy at that point.
* Replacing gmail.js with a homegrown parser is explicitly NOT part of
  v1. The wrapper exists precisely to make that swap easy in v2.

## Files to create

All paths under `code/`.

* `src/components/gmail-env/gmail-environment.ts`. ~200 lines. The
  Registry component. Loads `gmail.min.js` once on `bootstrap()`,
  wires gmail.js observers (`load`, `view_email`, `open_email`) into
  the component's own pub/sub, exposes the typed surface above.
* `src/components/gmail-env/parse-email.ts`. Port of
  [parseData()](</Users/acoven/dev/gmail2trello/main/chrome_manifest_v3/views/class_gmailView.js>)
  stripped of every DOM-injection concern (no toolbar detection, no
  popup positioning). Pure function:
  `(gmail, fullName) => GmailContext`. Includes the attachment regex
  `/^([^:]+)\s*:\s*([^:]+)\s*:\s*(.+)$/` and the
  `parseData_onAttachmentEach` and `parseData_onImageEach` logic.
  This file is the load-bearing parity check for the new extension.
* `src/components/gmail-env/gmail.types.ts`. `GmailContext` type and
  related shapes. Shared by content + worker + sidepanel.
* `src/components/gmail-env/gmail.min.js`. Vendored from current
  extension (~250KB). Imported by `gmail-environment.ts` only.
* `src/content/gmail-content.ts`. Content-script boot. Loads
  `createContentApp(...)`, calls `gmailEnv.bootstrap()`, wires the
  on-view-email handler that dispatches `gmail.context.changed` to
  the worker.
* `src/actions/handlers/gmail.context.changed.ts`. Handler.
* `src/actions/handlers/gmail.context.get.ts`. Handler.
* `src/components/gmail-context-store/gmail-context-store.ts`.
  Sidepanel-side observable that subscribes to `gmail.context.update`
  broadcasts. ~80 lines.

## Files to modify

All paths under `code/`.

* `manifest.json` (from Lane 1):
  * Add a `content_scripts` block matching `https://mail.google.com/*`
    that injects `dist/content.js` (esbuild bundles
    `gmail-content.ts` + `gmail-environment.ts` + vendored
    `gmail.min.js` into the single content bundle) at `document_idle`
  * No need for an `externally_connectable` block; sidepanel and
    content script both communicate through the service worker
* `src/composition/app.ts`:
  * `createContentApp` registers `[Utils, Diagnostics,
    GmailEnvironment]`. No Trello components in content context.
  * `createWorkerApp` adds `[Utils, Diagnostics, ActionDispatcher]`
    plus a server-side `GmailContextStore` that owns session-storage
    reads.
  * `createSidepanelApp` adds `[Utils, Diagnostics,
    GmailContextStore (UI variant)]`.
* `src/actions/registry.ts`:
  * Register `gmail.context.changed` and `gmail.context.get`.
* `src/worker/service-worker.ts`:
  * Add a `chrome.tabs.onActivated` listener that asks the dispatcher
    to fan out a `gmail.context.update` for the new active tab.
  * Add a one-line `chrome.storage.session.setAccessLevel` call so the
    content script can read the session bucket.
* `src/sidepanel/sidepanel.ts`:
  * Compose `GmailContextStore`. Render `renderGmailContext(ctx | null)`
    on every store update.
  * Render the idle state when no context is available.

## Test plan for this lane

* Cucumber scenarios:
  * "given a Gmail tab with an open email, when the panel opens, then
    it shows the subject and sender"
  * "given the user navigates to another email in Gmail, when the
    bridge fires `view_email`, then the panel re-renders within 200ms"
  * "given a non-Gmail active tab, then the panel shows the idle CTA"
* Manual: open Gmail, open the panel, switch between three emails, the
  panel updates each time. Switch to another tab, the panel shows the
  idle state. Switch back, the panel restores the last Gmail context.
* `chrome://inspect` checks: no leaked `chrome.storage.session` keys
  beyond one per tab, no orphaned listeners after tab close.

## Risks

* `gmail.js` parses the visible email. If the user has multiple email
  conversations open in tabs and navigates fast, the bridge can fire
  rapid `view_email` events. Solution: debounce in the content script,
  100ms.
* Side-panel-per-window: Chrome opens one panel per browser window.
  Two windows can show contexts from different active tabs at the same
  time. Make the storage lookup keyed by `tabId`, not `windowId`, and
  let the panel ask "which tab is currently active in MY window?" via
  `chrome.tabs.query({ active: true, currentWindow: true })`.
* Gmail DOM redesigns. The same risk the current extension has. Not new.

## Evaluator briefs

**ARCH** `mod:c75:s50='claude-opus-4-8/claude'`

* P10 seam: grep confirms zero imports of `gmail.min.js` outside
  `src/components/gmail-env/`. No other component calls gmail.js
  methods directly.
* `createContentApp` registers only `[Utils, Diagnostics,
  GmailEnvironment]`. No Trello components in content context.
* `gmail.context.changed` and `gmail.context.get` are registered in
  `src/actions/registry.ts`, not wired inline in the worker boot.
* The `GmailContext` type is defined once in `gmail.types.ts` and
  imported by content, worker, and sidepanel; not redefined in each.

**QUALITY** `mod:c65:s40='claude-opus-4-8/claude'`

* `features/gmail-bridge.feature` must exist with at minimum three
  scenarios: "panel shows subject and sender on email open," "panel
  updates when user navigates to another email," "panel shows idle
  state when no Gmail tab is active."
* TSDoc on `GmailEnvironment` (all public methods and their contracts),
  `parse-email.ts` (purpose, invariants, attachment-regex reference),
  `gmail.types.ts` (all fields with their nullability semantics).
* No `chrome.storage` keys leaked: after tab close, no orphan
  `g2t.gmailContext.*` keys remain.
* `npm test` exits 0 including the new Lane-2 scenarios.

**PROCESS** `mod:c65:s40='claude-opus-4-8/claude'`

* `Produces:` GmailEnvironment component, parse-email.ts, gmail.types.ts,
  gmail.min.js vendor copy, content-script entry, two action handlers,
  GmailContextStore (sidepanel variant), gmail-bridge.feature.
* `Not produces:` TrelloAuth, TrelloApi, sidepanel UI views, orch updates,
  any edit to `chrome_manifest_v3/`.
* Lane 1 scaffold must be landed (merged to main) before this lane's
  task workers start writing source files.
* All writes use absolute paths under the assigned worktree. First
  message includes `Rehydrated:` header.

## Out of scope for this lane

* Any Trello call (Lane 3).
* Any UI form for actually creating cards (Lane 4).
* Replacing `gmail.js` with a homegrown parser. Track as a follow-up.
* Multi-account Gmail support. The current extension does not handle
  this either; treat as a v2 feature.

## What "done" looks like

* Cucumber Lane-2 scenarios pass.
* Manual: open Gmail, navigate three emails, panel updates each time,
  no console errors, no `chrome.storage` leaks.
* The Gmail context payload is type-safe end-to-end (content script,
  service worker, sidepanel all import the same `GmailContext` type).
