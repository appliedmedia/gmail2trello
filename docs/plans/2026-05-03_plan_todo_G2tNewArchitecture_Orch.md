# G2T New Architecture: Orchestration

**Date**: 2026-05-03
**Status**: TODO (planning only, no code yet)
**Branch**: TBD. Builds a sibling folder `code/` inside
the existing `gmail2trello` repo. NO new repo.
**Companion plans**:
[Chk1 Skateboard Orch](<2026-05-03_plan_todo_Chk1Skateboard_Orch.md>)
(the active stage's lanes ride on the architecture defined here),
plus
[code/_project_mgmt.md](</Users/acoven/dev/gmail2trello/main/code/_project_mgmt.md>)
for the full 8-stage Skateboard-to-Airplane ladder.

## Why this doc exists

The current `chrome_manifest_v3/` codebase has accumulated structural
debt: jQuery widgets glued to a hand-rolled event bus, a `class_app.js`
god-object, view classes that reach into model state via `app.X.Y`,
direct chrome.runtime calls scattered across content + popup + worker,
and a gmail.js dependency whose actual usage surface is tiny. The
post-Wave-5 click/hydration regression is a symptom, not the root: the
code is hard to reason about and easy to break.

Three reference codebases solve overlapping pieces of this well. Pulling
the right pattern from each gives us a clean v2:

* `~/dev/print2paper4vscode/main` -- Registry-based DI with lazy
  method-proxy injection. Each component is a class with a static `id`,
  a constructor `({ reg })`, and asks for the methods it needs via
  `reg.use('component.method', ...)`. No central state, no circular
  deps, lifecycle is `app.done() -> reg.done()` walking initialized
  components in reverse.
* `~/dev/claiyr/main` -- Actions as a typed Cmd -> Evt -> Err contract,
  registered at composition time, dispatched by a flat envelope with a
  `_genus` routing key, audit-logged via an event log. Cross-process
  IPC and intra-process method calls share the same envelope shape, so
  the sidepanel-to-worker boundary becomes a plain message pipe.
* `~/dev/gsheet2json/main` -- A single command router on the server
  side, a pending-action handoff for menu-to-UI handoff, friendly error
  mapping in one place, an activity-feed audit log capped at 100
  entries, three-tier license resolution (cache -> remote -> trial),
  and progress reporting via a polled side-channel.

The current g2t attachment flow (the part that already works) maps
forward cleanly onto this stack: `parseData_onAttachmentEach` becomes a
method on a `GmailEnvironment` component; `_queueAttachments` and
`attach()` become methods on a `Model` component; the
`g2t_upload_attach` runtime message becomes a typed action handled in
the worker.

## What stays the same

* Trello as the only target service. No multi-target abstraction.
* The published `gmail2trello` extension. Untouched. Continues to ship
  point fixes from `chrome_manifest_v3/` while the new code grows in
  `code/`.
* Cucumber.js as the test harness. Same shape, separate config file in
  the new folder.
* Trusted Types policy `g2t-gmail-html` retained for any place we still
  need to inject HTML into Gmail. The sidepanel itself does not need
  it because it owns its document.
* The current OAuth1 Trello key can be reused OR a new one registered;
  decision deferred (see Lane 3).

## What changes

* No more god-object `class_app.js`. The composition root constructs a
  Registry, hands it the component class list, and the Registry lazy
  instantiates as components ask for each other's methods.
* No more direct cross-component instance access (`app.gmailView.foo`).
  Components ask Registry for the *method* they need; Registry returns
  a lazy proxy. This breaks circular deps automatically because nobody
  holds a reference to anyone else's instance.
* No more shared-state mutation through a central model. Each component
  owns its state. Cross-component coordination happens through method
  calls, not via reading each other's fields.
* No more 4-shim jQuery backward-compat in views. The new sidepanel is
  vanilla DOM end to end. Any utility we still want from jQuery (CSS
  shorthand, ajax) is replaced by short helpers.
* No more `chrome.runtime.sendMessage` strings hand-typed at every call
  site. All cross-context calls go through the action dispatcher with
  typed `Cmd -> Evt` contracts.
* gmail.js becomes pluggable. We ship v1 with a `GmailEnvironment`
  component that *uses* gmail.js internally (the cheapest path to
  parity), with a clearly defined surface area (3 events + 3 getters +
  `parseEmail()`). v2 can swap in a homegrown parser without any
  consumer changing.

## The four pillars

### 1. Registry (DI + lifecycle)

Lifted near-verbatim from print2paper4vscode's
[Registry.ts](</Users/acoven/dev/print2paper4vscode/main/src/Registry.ts>).

Component shape:

```typescript
export class TrelloApi {
  static readonly id = 'trelloApi';
  private reg: Registry;
  private fn: FnImport_t;
  private dx: Diagnostics;

  constructor(args: { reg: Registry }) {
    this.reg = args.reg;
    this.fn = this.reg.use(
      'trelloAuth.getToken',
      'trelloAuth.markInvalid',
      'utils.fetchWithBackoff',
    );
    this.dx = this.fn.dx.sub({ name: 'TrelloApi' });
  }

  async listBoards(): Promise<Board[]> { /* ... */ }

  done(): void { /* cleanup */ }
}
```

Composition root:

```typescript
const app = new App({
  context: 'sidepanel' /* or 'worker' or 'content' */,
  components: [
    Utils, Diagnostics, Persist,
    GmailEnvironment, TrelloAuth, TrelloApi,
    Model, ActionDispatcher, ActivityFeed, Settings,
    PopupView /* sidepanel UI components */,
  ],
  init: {
    dx: { name: 'G2T-sidepanel' },
    trelloAuth: { appKey: TRELLO_APP_KEY, scope: 'read,write' },
  },
});
```

Lifecycle:

* Construction -- `new App(...)` synchronously creates the Registry and
  the Diagnostics root. Nothing else is built.
* Lazy init -- the first time anyone calls `reg.use('trelloApi.listBoards')`
  and then invokes the returned proxy, `TrelloApi` is constructed.
* Cleanup -- `app.done()` walks `_initialized` in reverse, calls each
  component's optional `done()`, then cleans up `dx` last.

What we get for free:

* Cycle detection via `constructionStack` (already present in the
  reference Registry).
* Reserved-name guard against component IDs colliding with Registry
  internals (`use`, `done`, `app`, `dx`, etc.).
* Tests can compose a partial Registry with mock components, no global
  imports to monkey-patch.

### 2. Actions (typed Cmd -> Evt envelopes)

Inspired by claiyr's Genus envelope but trimmed for a JS extension. We
do not need rust-style trait gymnastics; we need:

* Every cross-context call (sidepanel -> worker, content -> worker,
  worker -> content) carries a `cmd` string and a typed payload.
* The worker has an `ActionDispatcher` component that maps `cmd` ->
  handler. Handlers are async functions returning a typed response.
* Failure shape is `{ ok: false, error: { code, message, friendly } }`,
  success is `{ ok: true, data }`. Sidepanel never sees raw exceptions.
* The dispatcher is registered at composition time only (no runtime
  registration -- claiyr Principle 2 transplanted). Trying to register
  `cmd` twice is an error at boot.

Action contract:

```typescript
type Action<Cmd, Evt> = {
  cmd: string;
  handle: (cmd: Cmd, ctx: ActionCtx) => Promise<Evt>;
};

const trelloListBoards: Action<{}, { boards: Board[] }> = {
  cmd: 'trello.boards.list',
  handle: async (_, ctx) => {
    const boards = await ctx.fn.trelloApi.listBoards();
    return { boards };
  },
};
```

Wire format (sidepanel -> worker):

```typescript
chrome.runtime.sendMessage({
  cmd: 'trello.boards.list',
  payload: {},
  reqId: '01J...',  // ULID for log correlation
});
```

Reply:

```typescript
{ ok: true, data: { boards: [...] }, reqId: '01J...' }
// or
{ ok: false, error: { code: 'TRELLO_AUTH_REQUIRED', message: '...', friendly: 'Sign in to Trello to continue.' }, reqId: '01J...' }
```

Action commands we will need (initial list; grows organically):

* `gmail.context.get` -- worker reads stored Gmail context for tab
* `gmail.context.changed` -- content -> worker on every view_email
* `trello.signIn`, `trello.signOut`, `trello.authState`
* `trello.boards.list`, `trello.lists.list`, `trello.cards.listOnList`
* `trello.labels.list`, `trello.members.list`, `trello.user.get`
* `trello.card.create`, `trello.card.comment`
* `trello.card.attach` -- existing `g2t_upload_attach` becomes this
* `trello.card.delete` -- for the 10s undo
* `settings.get`, `settings.set`
* `activity.append`, `activity.list`, `activity.forget`
* `progress.report`, `progress.get`

### 3. Patterns from gsheet2json

Direct ports of patterns that already proved out in production:

* **Single command router in the worker**. The `ActionDispatcher`
  component IS this router. One switch (or one map lookup) covers
  every cross-context cmd. No hand-rolled `chrome.runtime.onMessage`
  if-trees.
* **Pending-action handoff**. When a user clicks the toolbar action or
  uses a keyboard shortcut, the worker writes
  `chrome.storage.session.set({ 'g2t.pendingAction': 'open_picker' })`.
  The sidepanel reads-and-clears on init. Same pattern as gsheet2json
  `setPendingAction` / `getPendingAction`.
* **Friendly error mapping**. One `friendlyErrorMessage(err)` helper
  in `Utils` (port verbatim from gsheet2json
  [main.ts](</Users/acoven/dev/gsheet2json/main/src/main.ts>)). Called
  once in `ActionDispatcher` before throwing, never inline at handler
  sites.
* **Activity feed**. `ActivityFeed` component, append-only, capped at
  100 entries, persisted in `chrome.storage.local`. Each entry has the
  same shape as gsheet2json's `ActivityEntry`: `{ id, at, ok, title,
  subtitle?, openUrl?, error? }`. Surface as a tab in the sidepanel.
* **Progress reporting**. Long-running ops (multi-attachment uploads)
  write `{ pct, msg, at }` to `chrome.storage.session` keyed by
  `progressId`. Sidepanel polls every 400ms while a progress card is
  visible. Eases-out when complete.
* **License three-tier**. Not for v1 (G2T Panel pricing not decided).
  The plumbing is cheap to add later.

### 4. GmailEnvironment (gmail.js abstraction)

The `GmailEnvironment` component is the only place anything imports
from gmail.js. Its surface area:

```typescript
export class GmailEnvironment {
  static readonly id = 'gmailEnv';

  constructor(args: { reg: Registry }) { /* ... */ }

  // Lifecycle
  bootstrap(): Promise<void>;             // load gmail.js, wire observers
  done(): void;                            // tear down

  // Observation
  onReady(handler: () => void): Unsubscribe;
  onLoad(handler: () => void): Unsubscribe;
  onViewEmail(handler: (id: string) => void): Unsubscribe;

  // Getters (sync, snapshotted from latest event)
  getActiveEmailId(): string | null;
  getActiveUserEmail(): string | null;
  getActiveSubject(): string | null;

  // Parser (the part the current parseData() does)
  parseEmail(emailId: string): Promise<GmailContext>;
}
```

Where `GmailContext` is the strict typed shape we already extract today
(subject, sender, body, attachments, image inlines, time, fullName,
emailId). The implementation copies `parseData()` from
[class_gmailView.js](</Users/acoven/dev/gmail2trello/main/chrome_manifest_v3/views/class_gmailView.js>)
including the attachment regex
`/^([^:]+)\s*:\s*([^:]+)\s*:\s*(.+)$/`. Strip out the toolbar-button
DOM injection; that lives in the popup-variant only and is gone in
sidepanel.

If gmail.js misbehaves post-launch we replace the *implementation* of
`GmailEnvironment` with a homegrown parser. Consumers do not change.

## Folder layout

```
code/
  src/
    composition/
      app.ts                      # composition root
      registry.ts                 # ports print2paper4vscode Registry
      diagnostics.ts              # ports Diagnostics
      types.ts                    # FnImport_t, ComponentClass etc.
    actions/
      dispatcher.ts               # ActionDispatcher component
      registry.ts                 # cmd -> handler map (frozen at boot)
      envelope.ts                 # request/response shapes, friendlyError
      handlers/
        trello.boards.list.ts
        trello.card.create.ts
        trello.card.attach.ts     # ports g2t_upload_attach flow
        gmail.context.changed.ts
        ...
    components/
      gmail-env/
        gmail-environment.ts
        parse-email.ts            # ports parseData()
        gmail.min.js              # vendored from current
      trello/
        trello-auth.ts
        trello-api.ts
        trello.types.ts
      model/
        model.ts                  # ports class_model.js queueAttachments
        upload.ts                 # ports upload chain
      activity/
        activity-feed.ts
      settings/
        settings.ts
      progress/
        progress.ts
      utils/
        utils.ts                  # friendly errors, fetch backoff, ulid
    content/
      gmail-content.ts            # boots App with content components only
    worker/
      service-worker.ts           # boots App with worker components only
    sidepanel/
      sidepanel.html
      sidepanel.css
      sidepanel.ts                # boots App with UI components
      views/
        header.ts
        source-card.ts
        destination-card.ts
        details-card.ts
        action-bar.ts
        activity-tab.ts
      components/                 # UI primitives
        combobox.ts
        chip-multiselect.ts
        snackbar.ts
  features/
    skeleton.feature
    gmail-bridge.feature
    trello-auth.feature
    sidepanel-form.feature
    activity-feed.feature
  package.json
  tsconfig.json
  esbuild.config.mjs
  manifest.json
  README.md
```

The existing `chrome_manifest_v3/` is untouched; both directories
coexist for as long as it takes to feature-match.

## Migration path

The migration is run as the 8-stage Skateboard-to-Airplane ladder
defined in
[code/_project_mgmt.md](</Users/acoven/dev/gmail2trello/main/code/_project_mgmt.md>).
Each stage ships a whole, end-to-end-usable product (P16: every
checkpoint ships end-to-end -- no deferred items), starting with
Skateboard (Chk1) and culminating in Airplane (Chk8). The architecture
in this doc is what every stage rides on; per-stage Orch docs live in
`docs/plans/` and inherit these decisions.

Stage-by-stage relationship to this architecture doc:

* **Chk1 Skateboard** lands the Registry, Action dispatcher,
  GmailEnvironment, and TrelloApi as runnable scaffolding with a
  minimal end-to-end card-add flow.
* **Chk2-Chk6** (Scooter, Bicycle, Motorcycle, Sedan, SUV) extend
  TrelloApi with the remaining seven endpoints, enrich
  `parseEmail()`, add the activity feed and progress side-channel
  patterns from gsheet2json, layer in form-state persistence, and
  finish polish + accessibility.
* **Chk7 Bus** is the Web Store cutover from `chrome_manifest_v3/`
  to G2T Panel.
* **Chk8 Airplane** retires the old extension and adds power-user
  features.

Until Chk7 Bus completes, `chrome_manifest_v3/` ships only critical
bug fixes; new features go to `code/` only.

## Decisions to lock

* **Repo location**: sibling folder `code/` inside
  the existing `gmail2trello` repo. **LOCKED** by user direction.
* **Language**: TypeScript. Default. Both reference codebases (claiyr,
  gsheet2json) are TS; the new extension benefits from typed Cmd/Evt.
* **Build**: esbuild via `esbuild.config.mjs`. Single config builds
  worker + sidepanel + content as separate entry points.
* **DI library**: hand-port print2paper4vscode `Registry.ts`. ~270 lines.
  No npm dep.
* **Action library**: hand-write a thin envelope dispatcher. ~150 lines.
  No npm dep.
* **Test harness**: cucumber-js, mirrors current g2t config.
* **gmail.js v1**: keep, wrapped in `GmailEnvironment`. Decision can be
  revisited once the wrapper exists and we know the actual edge cases.
* **Trusted Types**: only registered if/when content scripts inject
  HTML. The sidepanel does not need it.

## Decisions deliberately deferred

* New Trello app key vs reuse existing. Lane 3 picks.
* Final brand name. UX/marketing call.
* Pricing/license tiers. Out of scope until v1 ships.
* Whether to retire the old extension and how. Chk8 Airplane
  question.
* Whether to publish under same Chrome Web Store account or a new one.
  Default: same account, separate listing.

## Risks and how this plan mitigates them

* **Re-implementing the same bug**. Mitigation: each Lane has a
  feature-parity checklist taken from the current extension's behavior
  (esp. attachment + image flow, OAuth1 redirect handling). Cucumber
  scenarios ported from the existing suite where applicable.
* **Registry ceremony slowing simple changes**. Mitigation: components
  stay small (target 100-300 lines each); the only Registry plumbing
  per component is one constructor + one `reg.use(...)` line.
* **Action envelope feeling over-engineered for trivial calls**.
  Mitigation: the envelope is the only IPC primitive; you get logging,
  friendly errors, and reqId correlation for free. Direct
  `chrome.runtime.sendMessage` calls outside actions are forbidden in
  lint config.
* **Two parallel codebases doubling maintenance during Chk1-Chk7**.
  Mitigation: the old extension is in maintenance mode; only critical
  bug fixes ship to it. New features go to `code/` only. Chk7 Bus
  collapses the two back into one.
* **gmail.js abstraction leaking through to consumers**. Mitigation:
  `GmailEnvironment` is the only file that imports from `gmail.min.js`.
  Lint rule (or just code review) enforces this.

## What "done" for THIS Orch doc looks like

* User has reviewed the four-pillar approach (Registry + Actions +
  gsheet2json patterns + GmailEnvironment).
* User has confirmed the sibling folder name `code/`
  (or specified an alternative).
* The four lane plans
  ([Lane 1](<2026-05-03_plan_todo_Chk1Skateboard_Lane1-ScaffoldAndSidepanel.md>),
  [Lane 2](<2026-05-03_plan_todo_Chk1Skateboard_Lane2-GmailBridge.md>),
  [Lane 3](<2026-05-03_plan_todo_Chk1Skateboard_Lane3-TrelloAuthAndApi.md>),
  [Lane 4](<2026-05-03_plan_todo_Chk1Skateboard_Lane4-SidepanelUI.md>))
  are updated to reference the patterns and folder layout defined here.
* Next step is Lane 1 implementation: scaffold the empty extension
  with a working Registry + ping action round-trip.
