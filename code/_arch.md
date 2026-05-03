# G2T Panel Architecture Overview

**Status**: living document; refresh on every checkpoint (Skateboard → Scooter → Bicycle → ...).
**Audience**: anyone (or any AI assistant) ramping on this codebase. Read top-to-bottom once and you'll have a working mental model.
**Companion docs**: [The 17 Principles](<_principles.md>) is the contract. [The 8-stage ladder](<_project_mgmt.md>) is the calendar. This doc is the map.
**Adapted from**: Claiyr's [`2026-04-25_info_arch.md`](</Users/acoven/dev/claiyr/main/docs/2026-04-25_info_arch.md>); G2T's substrate is the same shape (registered actions on a bus, single channel KV envelopes, components declare collaborators) scaled down for a single Chrome extension.

## What G2T Panel is

A Chrome extension MV3 that adds a **persistent side panel** to the browser. With a Gmail thread open and the user signed in to Trello, the panel shows the active email's data, lets the user pick a destination board / list / card-mode, edit title and body, attach Gmail attachments, and hit "Add to Trello." On success the panel shows the created card link and an "Add another" reset.

G2T Panel is a **sibling** to the existing `gmail2trello` extension --- a separate Chrome Web Store listing aimed at enterprises and power users. The current extension stays published and stays in maintenance mode. The new code grows under `code/` inside the same repo (no new repo).

**Source pluggability (v1 simplification).** Gmail is the only source in v1. The action substrate, the panel layout, and the destination side (Trello) are *not* Gmail-specific; the only Gmail-specific code is confined to the `GmailEnvironment` seam (see [Seam 1](#seam-1-gmail-inside-gmailenvironment) below). Additional sources --- a generic page-scrape source, a calendar source, an issue-tracker source --- are deliberately undesigned in v1: we keep the architecture source-pluggable in *shape* (one seam component per source) without committing to any specific second source's behaviour. When and how a second source lands is a future-checkpoint question; for now, "panel = Gmail panel" is a v1 simplification, not an architectural commitment.

This doc is about *how* it's built, not *what* it does. The "what" is in [Lane 4: Sidepanel UI](<../docs/plans/2026-05-03_plan_todo_Chk1Skateboard_Lane4-SidepanelUI.md>).

## The substrate, in one sentence

Every state mutation is a named action, dispatched on a bus to a registered handler, producing a typed result envelope; the sidepanel talks to the worker through one key-value channel and never knows whether a given action ran in-process or talked to Trello over the network.

That sentence is the whole system. The rest of this doc unpacks it.

## The action envelope: name + correlation token

Every emission on the bus carries a `cmd` --- a structured composite name with the form `domain.noun.verb` (e.g., `trello.boards.list`, `gmail.context.changed`, `trello.card.attach`). The `cmd` is the action name; the bus routes by exact match. There is no command/event split: callers dispatch and await, handlers register against the `cmd` string and respond.

The wire envelope is two flat shapes: a request and a response. Both carry a `reqId` (a `crypto.randomUUID()`) that correlates a single chain.

```typescript
interface ActionRequest<P = unknown> {
  cmd: string;
  payload: P;
  reqId: string;
}
type ActionResponse<D = unknown> =
  | { ok: true;  data: D;  reqId: string }
  | { ok: false; error: { code: string; message: string; friendly: string }; reqId: string };
```

`reqId` correlates request and reply. The activity feed records `{ at, ok, cmd, title, subtitle?, openUrl? }` per successful action --- the `cmd` plus result is the user-visible projection.

Full action shape and `ActionDispatcher` design is locked in [Lane 1: Scaffold](<../docs/plans/2026-05-03_plan_todo_Chk1Skateboard_Lane1-ScaffoldAndSidepanel.md>); the typed handler list lives in `src/actions/registry.ts`.

## The two seams

There are exactly two boundaries between G2T's core action substrate and the outside world in v1. Both are narrow and both are owned by P10. The Source-side seam (currently `GmailEnvironment`) is the place a future second source --- e.g., a generic page-scrape source --- would land as a parallel seam component; the substrate would not change. v1 ships exactly one Source seam (Gmail) and one Destination seam (Trello).

### Seam 1: Gmail (inside `GmailEnvironment`)

`GmailEnvironment` is the only component that imports `gmail.min.js` or touches the Gmail DOM. Its surface is small enough to memorize:

```typescript
export class GmailEnvironment {
  static readonly id = 'gmailEnv';
  bootstrap(): Promise<void>;
  done(): void;

  // events
  onReady(handler: () => void): Unsubscribe;
  onLoad(handler: () => void): Unsubscribe;
  onViewEmail(handler: (id: string) => void): Unsubscribe;

  // getters
  getActiveEmailId(): string | null;
  getActiveUserEmail(): string | null;
  getActiveSubject(): string | null;

  // parse
  parseEmail(emailId: string): Promise<GmailContext>;
}
```

Swapping the underlying library (e.g., dropping gmail.js for a custom DOM walker) is a `GmailEnvironment` re-implementation; no consumer changes. A grep for `gmail.` outside this component is a P10 violation.

### Seam 2: Trello (inside `TrelloApi`)

`TrelloApi` is the only component that talks to `https://api.trello.com`. One method per endpoint:

```typescript
export class TrelloApi {
  static readonly id = 'trelloApi';
  listBoards(): Promise<Board[]>;
  listLists(boardId: string): Promise<List[]>;
  listCardsOnList(listId: string): Promise<Card[]>;
  listLabels(boardId: string): Promise<Label[]>;
  listMembers(boardId: string): Promise<Member[]>;
  getUser(): Promise<User>;
  createCard(input: CreateCardInput): Promise<Card>;
  addComment(input: AddCommentInput): Promise<Comment>;
  attach(input: AddAttachmentInput): Promise<Attachment>;
  deleteCard(cardId: string): Promise<void>;
}
```

OAuth1 signing, 401-recovery (calls `trelloAuth.markInvalid()`, throws `TrelloAuthRequiredError`), 429 backoff (jittered retry up to 3 times), and JSON shape mapping live inside. Consumers receive typed results.

A grep for `trello.com` or raw `fetch(` to Trello outside this component is a P10 violation.

## The three Chrome execution contexts

A Chrome MV3 extension runs in three contexts. G2T uses all three. Each gets its own Registry instance.

* **Service worker** (`code/src/worker/`). The action substrate lives here. Owns: `ActionDispatcher`, `TrelloAuth`, `TrelloApi`, `GmailEnvironment` (when invoked from worker context for parsing helpers), all action handlers, `ActivityFeed`, `Settings`, `Progress`. Persists across sidepanel close/reopen; ephemeral across browser restart (per Chrome MV3 SW lifecycle).
* **Sidepanel** (`code/src/sidepanel/`). The view layer. Owns: view components (`Header`, `SourceCard`, `DestinationCard`, `DetailsCard`, `ActionBar`, `ActivityTab`), `FormState`, `ActionClient` (the `chrome.runtime.sendMessage` wrapper), `Combobox`, `ChipMultiselect`, `Snackbar`. Hydrates from `chrome.storage.session` on open, persists on every change debounced 200ms.
* **Content script** (`code/src/content/`, only if needed). Injected into Gmail tabs. Owns: gmail.js bootstrap and event forwarding to the worker via `chrome.runtime.sendMessage` carrying `gmail.context.changed` envelopes. Lives entirely behind `GmailEnvironment` --- the rest of the substrate sees only the action stream.

The sidepanel and worker communicate **only** through the P11 channel. The sidepanel never imports a worker-side module; the worker never imports a sidepanel-side module. Shared code (types, constants, action-name literals) lives in `code/src/shared/`.

## An action's life cycle

This is the canonical flow. Internalize this and the rest is detail.

* **Step 1: Origination.** User does something --- picks a board in the dropdown, hits Add to Trello, opens a saved email. The view (or the worker on a Gmail event) builds an `ActionRequest`: `{ cmd: 'trello.boards.list', payload: {}, reqId: crypto.randomUUID() }`.
* **Step 2: Submission.** The sidepanel sends the envelope through `ActionClient.dispatch()` (which wraps `chrome.runtime.sendMessage`). The worker, internally, can also dispatch in-process via the same `ActionDispatcher` --- the contract is identical.
* **Step 3: Routing (P12).** `ActionDispatcher` looks up `cmd` in its frozen handler map. The handler is one of two kinds:
  * An **in-process handler** (e.g., `gmail.context.get`, `activity.feed.list`, `settings.state.get`).
  * An **out-of-process handler** that calls Trello via `TrelloApi` (e.g., `trello.boards.list`, `trello.card.create`).
  The sidepanel does not know which kind ran.
* **Step 4: Action.** The registered handler runs. It validates, mutates, and returns a result. P2: a `cmd` with no registered handler would have failed at *worker startup*, not here.
* **Step 5: Response envelope.** The dispatcher wraps the handler's return value in `{ ok: true, data, reqId }`. If the handler threw, `ActionDispatcher` catches and wraps in `{ ok: false, error: { code, message, friendly }, reqId }`. Raw exceptions never cross the worker boundary.
* **Step 6: Activity feed.** On success, the dispatcher appends `{ at, ok: true, cmd, ...projection }` to the `ActivityFeed`. The sidepanel's activity tab subscribes (via `activity.feed.subscribe`) and renders the most recent 100.
* **Step 7: Sidepanel update.** The sidepanel receives the response envelope, matches it by `reqId`, and updates view state.

The shape is identical whether the handler ran in 200 microseconds or talked to Trello in 200 milliseconds. The sidepanel's only assumption is "async, can fail" (P12's caveat).

## The registry (P7 + P8)

Each Chrome execution context has its own Registry instance. A registered component:

* declares a `static readonly id` (single word, lowercase camelCase: `'trelloApi'`, `'gmailEnv'`, `'formState'`);
* takes `{ reg: Registry }` plus init params at construction;
* names its collaborators at construction via `this.fn = this.reg.use('foo.method', 'bar.other')`;
* uses `this.fn.foo.method(...)` to invoke them.

Hard rules:

* Undeclared use of a collaborator → startup-time error. Never a runtime surprise.
* Cycles in the component graph → construction-time error. A construction stack catches them.
* No `init()` methods. All setup in the constructor. Lifecycle cleanup runs `done()` in reverse construction order.

The Registry is itself a registered component, not a hidden global. The `ActionDispatcher` is a registered component of the worker. There are no singletons that escape the registry. Reference shape: print2paper4vscode `Registry.ts`.

## The repo layout

```text
code/
  _principles.md                          # the 17 Principles
  _arch.md                                # this doc
  _project_mgmt.md                        # the 8-stage ladder + dashboard contract
  _interventions.md                       # post-mortem log of corrections
  README.md                               # status dashboard at top, boilerplate at bottom
  src/
    composition/                          # registry + diagnostics + app composition root
    actions/                              # ActionDispatcher + handlers/ + registry.ts
    components/                           # Registry components (TrelloApi, GmailEnvironment, ...)
      trello/
      gmail-env/
      utils/
      action-client/                      # sidepanel-side: wraps chrome.runtime.sendMessage
      activity-feed/
      progress/
      form-state/
    worker/                               # service-worker entry point
    sidepanel/                            # sidepanel HTML / CSS / TS
      views/                              # header, source-card, destination-card, ...
      components/                         # sidepanel-only UI primitives (combobox, snackbar, ...)
      onboarding/                         # first-run overlay
    content/                              # content-script bootstrap (gmail.js bridge)
    shared/                               # types + action-name literals shared across contexts
  manifest.json
  package.json
  tsconfig.json
  esbuild.config.js
  tests/
    cucumber/                             # *.feature + step definitions

chrome_manifest_v3/                       # the existing g2t extension (maintenance mode)
docs/
  plans/                                  # checkpoint orchs + lane docs
archives/                                 # pre-G2T-Panel retired code

package.json                              # scripts: build, test:cucumber, lint, type-check
.github/workflows/                        # CI gates per P15
```

`chrome_manifest_v3/` is *live*, not archived: it ships point fixes (3.2.0.003 currently in flight) while G2T Panel grows under `code/`.

## How work is organized: ladder + orch + lanes

Checkpoints (currently Chk1 Skateboard) are planned with one **orchestration** doc and N **lane** docs under `docs/plans/`. The orch is the swimlane view --- inventory, dependency graph, exit criteria per lane. Lanes either each ship as PRs, or all swimlanes in a wave merge as one PR per P17.

The 8-stage ladder is defined in [`_project_mgmt.md`](<_project_mgmt.md>):

* **Chk1 Skateboard** --- IN PROGRESS. Open Gmail, sign in to Trello, pick board+list, hit Add, card appears with subject + body. No attachments, no labels, no due. End-to-end ridable.
* **Chk2 Scooter** --- TODO. Adds attachments and inline images. The load-bearing port of `g2t_upload_attach` from the existing extension lands here.
* **Chk3 Bicycle** --- TODO. Adds labels, members, due date. Markdown body toggle. Source-card refresh.
* **Chk4 Motorcycle** --- TODO. Adds add-to-existing-card mode (comment vs new card). Activity feed (last 100). Undo within 10s.
* **Chk5 Sedan** --- TODO. Form-state persistence. Pending-action handoff. Settings persistence. First-run onboarding.
* **Chk6 SUV** --- TODO. Polish: accessibility, keyboard shortcuts, friendly error mapping, light/dark theme parity, real-device verification.
* **Chk7 Bus** --- TODO. Cutover: Web Store listing, migration of users' settings if both extensions are installed, the existing `chrome_manifest_v3/` retires.
* **Chk8 Airplane** --- TODO. Power-user features: presets per Gmail label, bulk add, custom fields, localization, organization features.

For Skateboard (active as of 2026-05-03):

* `Chk1Skateboard_Orch` (in flight) --- the swimlane index for the lanes below.
* `Chk1Skateboard_Lane1-ScaffoldAndSidepanel` --- TODO. MV3 manifest, build pipeline, sidepanel placeholder, Registry + ActionDispatcher substrate, action envelope shape, "ping" round-trip.
* `Chk1Skateboard_Lane2-GmailBridge` --- TODO. `GmailEnvironment` component. `gmail.context.changed` event. `gmail.context.get` action. Real Gmail tab → sidepanel context render.
* `Chk1Skateboard_Lane3-TrelloAuthAndApi` --- TODO. `TrelloAuth` + `TrelloApi`. Sign-in via `chrome.identity.launchWebAuthFlow`. The 13 typed Trello action handlers. Sign-out + revoke.
* `Chk1Skateboard_Lane4-SidepanelUI` --- TODO. Header, source-card, destination-card, minimal details-card (title + body only at Skateboard), action-bar. NOT YET: attachments, labels, members, due, add-to-existing, activity feed (those land in Scooter and later).

Skateboard's *architectural gate*: the system does not ship until P1..P17 hold in code, not just in this doc. The full UI ↔ worker round-trip goes through the substrate end-to-end; the Trello sign-in + create-card flow is real, not mocked.

## What "Skateboard" means in the milestone ladder

[Henrik Kniberg's MVP cartoon](<https://blog.crisp.se/2016/01/25/henrikkniberg/making-sense-of-mvp>): you don't ship a wheel, then a frame, then a body. You ship a skateboard, then a scooter, then a bicycle. Each is a *whole, ridable* product. The user can use it. They wouldn't *prefer* it over what comes next, but it works end-to-end.

For G2T:

* Skateboard does *not* mean "scaffolding + a placeholder card-create flow." It means a real Trello card appears when the user clicks Add, on a real Gmail thread, with a real Trello sign-in. The user can use it. They'll want attachments next; they'll get them in Scooter.
* Scooter is *not* "Skateboard plus a bug fix." It's a Skateboard plus the next-most-useful feature (attachments), shipped as a whole.

P16 enforces this: every checkpoint ships end-to-end --- no deferred items. A Skateboard with a `MockTrelloApi` in the production code path is not a Skateboard; it is in progress.

## Where to find what

* **Principles** → [`_principles.md`](<_principles.md>).
* **Project status / dashboard** → [`README.md`](<README.md>) (this folder).
* **Active checkpoint orch** → `docs/plans/2026-05-03_plan_*_Chk1Skateboard_Orch.md`.
* **Active lane docs** → `docs/plans/2026-05-03_plan_*_Chk1Skateboard_Lane*-*.md`.
* **The retired existing extension** → `chrome_manifest_v3/`. Maintenance mode; point fixes only.
* **Pre-G2T-Panel plans** → `docs/plans/` files with no `Chk1` prefix and dates before 2026-05-03.

## Things this doc deliberately does not specify

The Principles say "what." The lane docs say "how." This doc points at both. Open design choices (the lazy-proxy mechanism shape, view composition strategy, IndexedDB-vs-`chrome.storage` for caches, etc.) live in their respective lane docs as decisions and are recorded inline there, not here.

When in doubt: start at the [Principles](<_principles.md>), follow the link to the relevant lane, read the open questions, then read the code.

<!-- end _arch.md -->
