# G2T Panel Lane 3: Trello Auth and API Client

**Date**: 2026-05-03
**Status**: TODO
**Parent**: [G2T Panel Orch](<2026-05-03_plan_todo_Chk1Skateboard_Orch.md>)
**Architecture**:
[G2T New Architecture Orch](<2026-05-03_plan_todo_G2tNewArchitecture_Orch.md>)
defines the Registry component contract, action envelope shape, and
friendly-error mapping referenced below.
**Depends on**: [Lane 1: Scaffold](<2026-05-03_plan_todo_Chk1Skateboard_Lane1-ScaffoldAndSidepanel.md>)
(parallel with [Lane 2: Gmail Bridge](<2026-05-03_plan_todo_Chk1Skateboard_Lane2-GmailBridge.md>))
**Location**: All paths relative to `code/`.

## Goal

Authenticate the user with Trello, store the resulting token securely,
and expose a typed API client to the sidepanel and the service worker
for every Trello operation the current extension performs: list boards,
list lists, list cards on a list, list labels on a board, list members
on a board, create card, add comment to card, attach file, attach image
URL, get user info.

## Chk1 Skateboard scope

Deliver six action handlers needed for the Skateboard end-to-end flow:

* `trello.signIn`, `trello.signOut`, `trello.authState`.
* `trello.boards.list`, `trello.lists.list`.
* `trello.card.create`.

Defer the other seven endpoints to later stages:

* `trello.cards.listOnList` -- Chk4 Motorcycle (add-to-existing mode).
* `trello.labels.list`, `trello.members.list` -- Chk3 Bicycle.
* `trello.user.get` -- Chk5 Sedan. Chk1 header reads username from the
  `trello.authState` reply only.
* `trello.card.comment` -- Chk4 Motorcycle (add-to-existing).
* `trello.card.attach` -- Chk2 Scooter (the attachment chain port).
* `trello.card.delete` -- Chk4 Motorcycle (10-second Undo).

`TrelloApi` exposes only the six Chk1 methods; the deferred methods
land via additive edits in their respective stages. The dispatcher
registers only the six Chk1 cmds at boot.

`fetchWithBackoff` lands in `src/components/utils/` in this lane (used
by `TrelloApi`). The other Lane 4 consumer (attachment upload retry)
arrives in Chk2.

## Architecture

Two Registry components in the worker app, plus a flat set of action
handlers that consume them. Sidepanel never imports the API client
directly; every call is an envelope dispatch.

### `TrelloAuth` component (`src/components/trello/trello-auth.ts`)

```typescript
export class TrelloAuth {
  static readonly id = 'trelloAuth';
  constructor(args: { reg: Registry; appKey: string; scope: string });

  async getToken(): Promise<string | null>;     // null if absent or invalid
  async signIn(): Promise<string>;               // launchWebAuthFlow + store
  async signOut(): Promise<void>;                // local clear + revoke
  markInvalid(): Promise<void>;                  // called by client on 401
  authState(): Promise<TrelloAuthState>;         // for UI

  done(): void;
}
```

* `appKey` and `scope` are passed via Registry `init.trelloAuth`,
  consistent with print2paper4vscode's `init` dict pattern.
* No instance-level token cache. `getToken()` reads
  `chrome.storage.local` per call. Avoids the stale-handle bug class.
* `markInvalid()` clears storage and broadcasts a `trello.auth.changed`
  envelope to any open sidepanel.

### `TrelloApi` component (`src/components/trello/trello-api.ts`)

```typescript
export class TrelloApi {
  static readonly id = 'trelloApi';

  constructor(args: { reg: Registry }) {
    this.fn = args.reg.use(
      'trelloAuth.getToken',
      'trelloAuth.markInvalid',
      'utils.fetchWithBackoff',
      'utils.friendlyErrorMessage',
    );
  }

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

* Centralised 401 handling: on 401, calls
  `fn.trelloAuth.markInvalid()` then throws a typed
  `TrelloAuthRequiredError`.
* Centralised 429 handling: `utils.fetchWithBackoff` (also lifted from
  this lane into the shared `Utils` component) retries up to three
  times with jittered backoff.
* Each method has typed `input` and returns typed `output`. Shapes live
  in `src/components/trello/trello.types.ts`. Hand-written;
  third-party Trello SDKs add CSP / size cost we do not need.

### Action handlers

Each Trello operation is a thin handler in `src/actions/handlers/`:

```typescript
// src/actions/handlers/trello.boards.list.ts
export const trelloBoardsList: Action<{}, { boards: Board[] }> = {
  cmd: 'trello.boards.list',
  handle: async (_, ctx) => ({ boards: await ctx.fn.trelloApi.listBoards() }),
};
```

The `ActionDispatcher` from Lane 1 wraps every call in
`friendlyErrorMessage()`; raw exceptions never cross the worker boundary.

### Sidepanel calls

```typescript
// from a sidepanel view
const fn = reg.use('actionClient.dispatch');
const res = await fn.actionClient.dispatch('trello.boards.list', {});
if (res.ok) renderBoards(res.data.boards);
else showError(res.error.friendly);
```

`ActionClient` is a sidepanel-side Registry component (~50 lines) that
wraps `chrome.runtime.sendMessage` with the typed envelope shape from
Lane 1. Token never crosses into the sidepanel context.

## Trello-specific concerns

* Trello uses OAuth 1.0a, not OAuth 2.0. The flow is:
  1. Redirect user to
     `https://trello.com/1/authorize?key={appKey}&return_url={returnUrl}&callback_method=fragment&scope=read,write&expiration=never&name=G2T%20Panel&response_type=token`
  2. Trello redirects to `{returnUrl}#token={trelloToken}`
  3. We parse the fragment, store the token
* `chrome.identity.launchWebAuthFlow` accepts a redirect URL on
  `https://<extension-id>.chromiumapp.org/` and gives us the
  fragment. Standard pattern.
* `appKey` is a public client key. The current extension hard-codes
  one at
  [class_app.js:22](</Users/acoven/dev/gmail2trello/main/chrome_manifest_v3/class_app.js>).
  G2T Panel should register a NEW app key (separate audit trail). Note
  the new key is also public; this is intended by Trello's design.
* Token persistence: Trello tokens with `expiration=never` are valid
  until the user revokes them in their Trello account settings. We
  store them in `chrome.storage.local`. Note: `chrome.storage.local`
  is unencrypted on disk; that is a known and accepted limitation
  for both the current g2t and any new variant. Document this in the
  privacy policy.
* CSP: the service worker's `connect-src` defaults allow
  `https://api.trello.com` and `https://trello.com`. Confirm with a
  manual `fetch` test from the worker once Lane 1 lands.

## Files to create

All paths under `code/`.

* `src/components/trello/trello-auth.ts`. ~120 lines. Registry
  component.
* `src/components/trello/trello.types.ts`. All Trello shapes:
  `Board`, `List`, `Card`, `Label`, `Member`, `User`, `Comment`,
  `Attachment`, `CreateCardInput`, `AddAttachmentInput`,
  `AddCommentInput`, `TrelloAuthState`, `TrelloAuthRequiredError`,
  `TrelloToken`. Hand-written; we do not pull in a third-party Trello
  SDK because the surface is small and third-party SDKs add CSP /
  size cost.
* `src/components/trello/trello-api.ts`. ~300 lines. Registry
  component, one method per endpoint.
* `src/components/utils/fetch-with-backoff.ts`. Helper used by
  `TrelloApi` for the 429 retry loop. Lives in the shared `Utils`
  component because attachment uploads in Lane 4 need it too.
* `src/actions/handlers/trello.signIn.ts`,
  `trello.signOut.ts`, `trello.authState.ts`,
  `trello.boards.list.ts`, `trello.lists.list.ts`,
  `trello.cards.listOnList.ts`, `trello.labels.list.ts`,
  `trello.members.list.ts`, `trello.user.get.ts`,
  `trello.card.create.ts`, `trello.card.comment.ts`,
  `trello.card.attach.ts`, `trello.card.delete.ts`. Each is ~10-30
  lines.
* `src/components/action-client/action-client.ts`. Sidepanel-side
  typed wrapper around `chrome.runtime.sendMessage`. ~80 lines.
  Generates `reqId`, awaits typed reply, re-throws on `ok: false` if
  the caller wants exceptions OR returns the discriminated union.
* `tests/trello/trello-api.feature`. Cucumber scenarios using a
  recorded fixture set (no live Trello calls in CI).
* `tests/trello/trello-auth.feature`. Cucumber scenarios for sign-in
  flow using a stub `chrome.identity.launchWebAuthFlow`.
* `tests/fixtures/trello/`. Recorded JSON responses from a one-time
  live capture.

## Files to modify

* `src/composition/app.ts`:
  * `createWorkerApp` adds `[TrelloAuth, TrelloApi]` to its component
    list. `init.trelloAuth = { appKey, scope: 'read,write' }`.
  * `createSidepanelApp` adds `[ActionClient]`.
* `src/actions/registry.ts`:
  * Register all 13 Trello action handlers. The dispatcher's frozen
    cmd map now contains: `ping`, `gmail.context.changed`,
    `gmail.context.get`, plus all `trello.*` from this lane.
* `manifest.json`:
  * Already has `identity` permission from Lane 1.
  * Confirm `host_permissions` covers `https://api.trello.com/*` and
    `https://trello.com/*`.

## Decisions to lock

* New Trello app key vs reuse of current. Default: NEW (Orch).
* Token storage layer: `chrome.storage.local`. Default. Document the
  unencrypted-on-disk limitation in privacy policy.
* OAuth1 helper: implement inline. There is no good lightweight
  Chrome-extension-friendly OAuth1 library; the flow is simple enough
  to write directly (~50 lines).
* Token revocation on sign-out: should we call Trello's
  `DELETE /1/tokens/{token}` to actively revoke, or just delete locally?
  Default: BOTH. Active revocation gives users a clean trail in their
  Trello account settings.

## Test plan for this lane

* Cucumber scenarios run against fixture responses captured from real
  Trello API once. Fixture files in `tests/fixtures/trello/`.
* Manual: install unpacked, open panel, click sign-in, complete the
  Trello consent in the popup window, return to panel, panel shows
  the user's username and avatar. Click sign-out, panel goes back to
  signed-out state.
* Manual error paths: revoke token in Trello account settings while
  panel is open, then click any board picker, panel shows re-auth
  prompt cleanly (no console error).

## Risks

* Trello OAuth1 redirect target. `chromiumapp.org` redirects do not
  always preserve the fragment cleanly across all Chrome versions.
  Mitigation: test on Chrome stable, beta, dev before shipping.
* Rate limiting. Trello's published limits are generous but the
  attachment endpoint is heavier. Mitigation: implement the 429 retry
  loop in `trello-client.ts` and surface a friendly "slow down" toast
  in the panel after three retries.
* Token leakage via console.log. Mitigation: lint rule that bans
  logging the token value; centralize logging behind a `redact()`
  helper that masks anything looking like a token.

## Out of scope for this lane

* Multi-org / Trello Enterprise SSO. Future work; not blocking v1.
* Cached board / list / card data with manual refresh. v1 fetches
  fresh on demand. If perf is bad, add a cache later.
* Webhook subscriptions. Out of scope. The current extension does not
  use webhooks; we will not start in v1.

## What "done" looks like

* Cucumber Lane-3 scenarios pass against fixture responses.
* Manual sign-in / sign-out works end-to-end on a fresh install.
* Manual revocation recovery works without console errors.
* Token never appears in any `console.log`, `chrome.storage.session`,
  or sidepanel DOM.
* Every Trello call from the sidepanel goes through `ActionClient`,
  not `chrome.runtime.sendMessage` directly. The lint config (or code
  review) enforces this.
