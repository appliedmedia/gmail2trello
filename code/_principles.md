# G2T Panel Architecture Guidelines: The 17 Principles

**Status**: durable
**First drafted**: 2026-05-03
**Owner**: codebase. Every PR cites these by number where it touches the substrate.
**Adapted from**: [Claiyr's 19 Principles](</Users/acoven/dev/claiyr/main/docs/_arch_guidelines_principles.md>); G2T drops Claiyr P9 (three Rust artifacts) and P11 (Netflix-style backend coupling) because G2T is a single Chrome extension talking directly to Trello, with no own-server tier. The remaining 17 principles renumber 1..17.

## Why this doc exists

These principles are *not* style guidance. They are the contract that lets G2T Panel stay coherent across one Chrome extension MV3 build, three execution contexts (service worker, sidepanel, content script), two external surfaces (Gmail DOM, Trello API), and an indefinite number of future capabilities. A change to this doc is a contract change. Code may not silently violate a principle; it either complies, or the violation is recorded in-line in the relevant lane / orch doc with reasoning.

The companion docs are [`_arch.md`](<_arch.md>) (the system map) and [`_project_mgmt.md`](<_project_mgmt.md>) (the 8-stage ladder + dashboard contract). The Principles are the contract; `_arch.md` is the map; `_project_mgmt.md` is the calendar.

## The Principles

### P1. Every state mutation is a named action

Nothing mutates application state by calling a method directly. Every change originates as an action with a canonical, human-readable name registered in the action registry. "State" means anything a user can see, undo, replay, or recover from.

The G2T action name shape is `domain.noun.verb` (e.g., `trello.boards.list`, `gmail.context.get`, `trello.card.attach`). Verbs are present-tense imperative for commands; the response envelope carries the same `cmd` so request and reply correlate by name plus `reqId`.

### P2. Actions are dispatched on the bus and handled by a registered handler

Actions do not invoke handlers directly. The `ActionDispatcher` (one per worker) routes; registered handlers respond. An action `cmd` with no registered handler is a **registration-time error**, not a runtime error. The frozen cmd-map is built at worker startup and never mutated.

### P3. Every action emission produces a named result envelope

The action stream is the replayable log. Every dispatch returns `{ ok: true, data } | { ok: false, error: { code, message, friendly } }` --- never a thrown exception across the worker boundary. The activity feed (capped at 100, persisted in `chrome.storage.local`) is the user-visible projection of successful action chains.

### P4. Reads are free; writes are always actions

The moment a code path changes Trello state, Gmail state, settings state, or activity-log state, it dispatches an action. Read paths (querying `gmailEnv.getActiveSubject()`, reading `chrome.storage.session` for hydration) do not.

### P5. No side channels

"Just this once," "only UI state," "it's simpler" are the anti-patterns this document exists to prevent. The only legitimate bypass is enumerated UI-ephemeral state, listed here so the bypass surface is bounded and visible:

* Input focus (which control currently has the cursor / text-input focus).
* Scroll position within a scrollable view, not yet committed as a user-meaningful state.
* In-flight gesture state (drag offsets, hover, touch tracking) that has not yet resolved into an action.
* Transient animation state owned by the platform UI framework.

Anything not on this list is core state and goes through the action substrate. New bypasses are added to this list **by amendment**, not by inline judgment.

### P6. AI-assistant principle

Every edit that introduces a state mutation cites, in its commit message, the action name being implemented or invoked. An edit without a cited action name is rejected. If the assistant cannot name the action, the assistant does not understand the mutation well enough to write it.

### P7. Classes declare collaborators at construction

No hidden singletons. No service-locator calls inside methods. Every component lists its named collaborators at construction; the registry resolves and injects. Un-declared use of a collaborator is a compile-time or startup-time error, not a runtime surprise.

* Reference shape: print2paper4vscode `Registry.ts` --- `static readonly id`, `{ reg }` constructors, `this.fn = this.reg.use('foo.method', 'bar.other')`, lazy proxies, construction-stack cycle detection, no `init()` methods, lifecycle `done()` in reverse construction order.
* Decided in [Lane 1: Scaffold](<../docs/plans/2026-05-03_plan_todo_Chk1Skateboard_Lane1-ScaffoldAndSidepanel.md>).

### P8. The registry is the source of truth for wiring

Action handlers, components, and each component's required collaborators live in one registry per Chrome execution context (one in the service worker, one in the sidepanel). Registry changes are contract changes.

### P9. UI layers are thin

If logic can live in a Registry component or an action handler, it lives there --- not in a view component. Each sidepanel view (header, source-card, destination-card, details-card, action-bar, activity-tab) is a thin view layer over the action substrate, not a parallel reimplementation of business logic.

UI owns: rendering, layout, input events, keyboard handling, theme. UI does *not* own: Gmail context fetches, Trello API calls, validation rules beyond field-level required-checks, persistence, retry, error mapping, or anything that would need to be duplicated to add a second UI surface (e.g., a future toolbar-popup variant).

If view-level orchestration starts duplicating across views (the same form-state machine written three times), the duplication migrates *into* a shared Registry component (`FormState`, `Validator`), not into a view-layer helper.

### P10. Platform-specific code is confined to its seam

There are exactly two seams between G2T's core action substrate and the outside world. Each is owned by a single Registry component. No platform-specific code (gmail.js DOM access, Trello REST shapes, OAuth1 signing) leaks past these seams.

* **`GmailEnvironment`** owns all Gmail-DOM and gmail.js access. Its surface is 3 events (`onReady` / `onLoad` / `onViewEmail`), 3 getters (`getActiveEmailId` / `getActiveUserEmail` / `getActiveSubject`), and `parseEmail()`. Only this component imports `gmail.min.js`. Swapping the underlying library is a `GmailEnvironment` re-implementation; no consumer changes.
* **`TrelloApi`** owns all Trello REST calls. Its surface is one method per endpoint: `listBoards`, `listLists`, `listCardsOnList`, `listLabels`, `listMembers`, `getUser`, `createCard`, `addComment`, `attach`, `deleteCard`. OAuth1 signing, 401-recovery, 429-backoff, and JSON shape mapping live inside; consumers receive typed results.

A grep for `gmail.` or `trello.com` outside these two components is a P10 violation and a PR blocker.

### P11. The UI↔Worker contract is a single channel carrying typed envelopes, and nothing else

The sidepanel has exactly one way to talk to the service worker and exactly one way to receive from it: `chrome.runtime.sendMessage` carrying an `ActionRequest`, with the worker replying with an `ActionResponse`.

```typescript
interface ActionRequest<P = unknown> {
  cmd: string;       // 'trello.boards.list', etc.
  payload: P;        // action-specific
  reqId: string;     // crypto.randomUUID()
}
type ActionResponse<D = unknown> =
  | { ok: true;  data: D;  reqId: string }
  | { ok: false; error: { code: string; message: string; friendly: string }; reqId: string };
```

The sidepanel does not hold references to worker-side objects. The sidepanel does not call methods on `TrelloApi` directly. The sidepanel does not subscribe to worker streams except through this channel.

Consequences this principle buys:

* Every UI ↔ worker interaction is recordable and replayable (which feeds the activity log per P3).
* The same contract works for any future UI surface (toolbar popup, options page, content-script overlay) without per-context wiring gymnastics.
* Testing the UI means feeding and asserting envelopes; testing the worker means the same from the other side. Neither needs to mock the other.
* The AI assistant cannot "just reach through" for a quick fix --- there is no reachable surface to bypass to.

### P12. One calling convention: in-process and over-network handlers are indistinguishable to the UI

The sidepanel submits one kind of message through the P11 channel. The worker's `ActionDispatcher` internally routes it to one of two destinations:

* an in-process handler (e.g., `gmail.context.get`, `activity.list`, `settings.get`);
* an out-of-process handler that calls Trello's REST API (e.g., `trello.boards.list`, `trello.card.create`).

The request and response shape is identical across both. The sidepanel never knows which path was taken. Moving an operation between in-process and remote (e.g., adding a future caching layer that intercepts read-only Trello calls in-process) is a worker-only refactor --- no sidepanel change is required.

Consequences:

* Every sidepanel call is treated as async-with-possible-failure, because any call *might* be remote. In-process calls that can't fail still return through the same envelope.
* The activity log (P3) is homogeneous: in-process and remote actions look the same, which makes replay reliable.
* Offline behavior, retry, backoff, and 429-handling live in the worker. They are not a sidepanel concern.

### P13. Documentation lives next to the code

Documentation that describes a piece of code is kept as physically close to that code as reasonable. When the code moves, the docs move with it; when the code changes, the same commit changes the docs. Out-of-line narrative docs are pointers, not the truth.

* Every TypeScript class, interface, and exported function carries a TSDoc header (`/** ... */`) covering purpose, invariants, and at least one example for non-trivial APIs.
* Every method carries a smaller TSDoc header --- short, but always present. "It's obvious from the name" is not a defence.
* Every folder under `code/src/` carries a `README.md` that names what the folder owns, links to the principle(s) it implements, and points readers at the TSDoc inside for detail. Folder READMEs are short on purpose --- the truth lives in the TSDoc.
* Standalone narrative docs (architecture, plans, history) live under `docs/`. Folder READMEs link *to* them; they do not duplicate them.
* A change to code that does not also update the TSDoc on the items it touched is not a complete change.

### P14. Every test is a Gherkin scenario, in lockstep with the code

Tests are part of the code they cover, not an afterthought. When a TypeScript module lands, the Gherkin `.feature` file that covers it lands in the same commit; when the code changes, the `.feature` changes in the same commit. "Tests will come later" is the bypass P5 forbids.

* Every test is a `Scenario:` (or `Scenario Outline:`) inside a Gherkin `.feature` file. Behaviour scenarios, unit-level checks, build-system checks --- all of them. There is no "tiny test exception."
* A `.feature` file pairs with the TypeScript module it covers --- one `.feature` per coherent unit of code. Multiple `Scenario:` blocks per `.feature` is the norm.
* Tests are written in Given/When/Then prose so a non-engineer can read the scenario top-to-bottom. Scenario names refer to user-meaningful behaviour: `creates_card_when_board_and_list_are_chosen` is right; `dispatcher_returns_object` is wrong.
* Mechanism: Cucumber.js (already in use). A future swap of the Gherkin runner is a contract change to this principle, not an inline call.

### P15. CI runs the same scripts a developer runs locally

Every check that gates a merge runs from a single shared script, invoked the same way locally and in CI. CI is not permitted to run a verification step that a developer cannot run on their own machine with a single command, and developers do not have local verification steps that CI does not also run.

* Each check (lint, type-check, test, build) is an `npm` script in `package.json`. CI invokes that script. A developer invokes the same script.
* "Same script" is literal: identical entry point, identical flags, identical exit-code contract. CI is allowed to add wrapping (caching, matrix, artifact upload) around the script, but is not allowed to change what the script does or replace it with a CI-only equivalent.
* A failing CI run must be reproducible locally by running the same script against the same commit. If it isn't, that's a P15 violation, not "flaky CI."

### P16. Every checkpoint ships end-to-end --- no deferred items

A Skateboard is a ridable skateboard. A Scooter is a ridable scooter. The 8-stage ladder is a sequence of *whole, working* products at successive levels of completeness, not a sequence of demos that paper over missing pieces. A checkpoint that "would be done if we deferred X, Y, Z" is not done; it is in progress.

* **QA findings against an in-flight lane's own stated exit criteria are bugs, not options.** "Defer to a later commit" is not on the table for a lane's exit criteria; the criteria are the contract for the lane's closure. The choice is fix-and-close or stay-in-progress, not a third path.
* **No "partial done" status.** A lane is `todo`, `inProgress`, or `done`. There is no middle.
* **A mock or placeholder implementation in a production code path means the lane has not delivered.** If the contractual swap (`MockGmailEnv` → real `GmailEnvironment`, stub Trello handler → real REST handler, fake attachment chain → ported `g2t_upload_attach`) cannot compile, the missing seam is the work, not a "follow-up."
* **Real punts are named explicitly.** If a finding genuinely belongs in a *different* checkpoint (Skateboard finding that's actually Scooter scope), that is a real cross-checkpoint handoff and is captured as such, with the target checkpoint named and a TODO created there. "Carry into close" / "punch-list item" / "acceptable for now" are softening phrases that hide cross-checkpoint handoffs --- treat them as red flags.
* **The AI assistant does not present "fix vs defer" as a question to the operator.** Findings against in-flight lane exit criteria are surfaced as a punch list of fixes the assistant is about to do, not as a yes/no decision.

### P17. Waves of swimlanes ship as one PR; tear down on merge

The unit of parallel work is a *wave*: a set of swimlanes (each a lane doc under `docs/plans/`) that can run in parallel because their substrates do not collide. A wave is a single review surface, not N independent ones, and dissolves cleanly once merged.

* Each swimlane in an active wave gets its own branch (typically backed by a worktree under `.claude/worktrees/`) so parallel agents and the operator do not step on each other.
* All swimlanes in the wave merge locally into one integration branch before any push to the remote. The wave is reviewed as one diff, not as N rebased PRs forcing serialization.
* One PR per wave. Per-swimlane commits inside that PR are fine and encouraged --- they preserve the per-lane authorship trail --- but the PR itself is the wave. Reviewers see one diff, one CI run, one merge.
* On merge, the wave is torn down completely. Every swimlane branch (local and remote), every worktree, and every in-flight agent workstream tied to that wave is deleted. The next wave starts from a clean repo state, not a graveyard of stale branches.

## How these principles apply to AI-assistant behavior

* **P6** forces commit-message citation. That is the enforcement owed.
* **P5** blocks "let me just call the method directly this once."
* **P2**'s registration-time-not-runtime clause surfaces wiring mistakes at startup, not after a user triggers a path.
* **P13** means an edit that touches a function but not its TSDoc is incomplete and must be sent back for the doc update.
* **P14** means an edit that adds or changes behaviour without a paired Given/When/Then scenario is incomplete and must be sent back for the test.
* **P16** means findings against an in-flight lane's exit criteria are surfaced as a punch list of fixes-in-progress, not as a fix-vs-defer question. "Defer" is not a default option, and "PARTIAL DONE" framings are flagged as in-progress, not closed.
* **P17** means active parallel work runs on per-swimlane branches/worktrees, merges locally to one integration branch, and is torn down (branches, remotes, worktrees) on PR merge.

If a future PR proposes to relax any of P1..P17, that PR carries the relaxation argument in its description and updates this doc in the same commit. Silent drift is the failure mode this doc exists to prevent.

## Action naming convention

Every action has a name of the form `domain.noun.verb`:

* `domain` is one of `gmail`, `trello`, `activity`, `settings`, `progress`, `app`.
* `noun` is the resource the verb acts on: `boards`, `card`, `context`, `feed`, `state`.
* `verb` is the operation: `list`, `get`, `create`, `update`, `delete`, `attach`, `comment`, `signIn`, `signOut`, `changed`, `report`.

Examples: `trello.boards.list`, `gmail.context.changed`, `trello.card.attach`, `activity.feed.append`, `settings.state.get`.

Every dispatched action carries a `reqId` minted by `crypto.randomUUID()`. Replies carry the same `reqId`. The activity feed records `{ at, ok, cmd, title, subtitle?, openUrl? }` per successful action chain.

## Deliberately not specified here

These are design choices, not enforcement, and live in lane docs:

* The exact registry implementation (lazy proxy mechanism, cycle detector shape).
* Whether sidepanel views compose with `<template>` elements, render helpers, or a custom reactive layer.
* Whether the Trello cache (if added in Scooter or later) is in `chrome.storage.local`, IndexedDB, or in-memory.

Each of these is decided in its lane and recorded inline there.

<!-- end _principles.md -->
