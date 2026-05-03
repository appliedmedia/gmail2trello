# G2T Panel Lane 1: Scaffold and Sidepanel API

**Date**: 2026-05-03
**Status**: TODO
**Parent**: [G2T Panel Orch](<2026-05-03_plan_todo_Chk1Skateboard_Orch.md>)
**Architecture**:
[G2T New Architecture Orch](<2026-05-03_plan_todo_G2tNewArchitecture_Orch.md>)
defines the Registry + Action envelope pillars referenced below.
**Location**: All paths in this lane are relative to
`code/` (a sibling of the existing
`chrome_manifest_v3/` folder, in the same `gmail2trello` repo).

## Goal

Stand up a runnable, empty-but-loadable Chrome extension with a working
side panel, a service worker bootstrapped by the Registry, the Action
dispatcher wired with one round-trip `ping` action, and a Cucumber
harness. End state: load the unpacked extension in Chrome, click the
action icon (or open the panel), see the sidepanel render "Hello, G2T
Panel" plus a button that dispatches the `ping` action through the worker
and prints the typed response. No Gmail integration, no Trello
integration. Just the skeleton plus the architectural plumbing every
later lane will lean on.

## Chk1 Skateboard scope

This lane delivers the full skeleton; its scope IS the Chk1 scaffold.
Nothing in this lane is deferred. The single `ping` action stays as
the only handler in the dispatcher map until Lane 2 and Lane 3 add
Gmail and Trello handlers. After Chk1 ships, Lane 1's scaffold becomes
the substrate for Chk2-Chk8 incremental additions to the manifest,
dispatcher map, and component list.

## Files to create

All paths under `code/`.

* `manifest.json`. Key fields:
  * `manifest_version: 3`
  * `permissions: ["sidePanel", "storage", "identity", "activeTab"]`
  * `host_permissions: ["https://mail.google.com/*", "https://api.trello.com/*", "https://trello.com/*"]`
  * `side_panel: { default_path: "sidepanel/sidepanel.html" }`
  * `action: { default_title: "Open G2T Panel" }` plus a click handler in
    the worker. The handler calls `chrome.sidePanel.open({ tabId })` AND,
    if the active tab is not on `mail.google.com`, also calls
    `chrome.tabs.update(tabId, { url: 'https://mail.google.com/' })` so
    the panel always opens against a Gmail document. (Per the Skateboard
    validation contract: off-Gmail click silently redirects.) Note we
    explicitly do NOT use
    `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`
    because that path bypasses `chrome.action.onClicked` and prevents the
    conditional redirect.
  * `background: { service_worker: "dist/worker.js", type: "module" }`
  * `web_accessible_resources` empty for v1
  * `content_security_policy.extension_pages` left default
* `src/composition/registry.ts`. Hand-port of
  [print2paper4vscode Registry.ts](</Users/acoven/dev/print2paper4vscode/main/src/Registry.ts>),
  ~270 lines. ComponentClass interface + lazy method-proxy `use()` +
  `done()` reverse-cleanup + cycle detection.
* `src/composition/diagnostics.ts`. Hand-port of Diagnostics with
  `name` + `sub({ name })` + `out()` + `error()` + `done()`.
* `src/composition/types.ts`. `FnImport_t`, `ComponentClass`, action
  envelope shapes (`ActionRequest`, `ActionResponse`, `ActionError`).
* `src/composition/app.ts`. Composition root. Three flavors that share
  the same Registry shape but register different component sets:
  `createWorkerApp()`, `createSidepanelApp()`, `createContentApp()`
  (the latter unused in Lane 1; stub function only).
* `src/actions/dispatcher.ts`. `ActionDispatcher` component. Holds the
  cmd -> handler map (frozen at construction). `dispatch(env)` runs
  the handler, applies `friendlyErrorMessage()` on throw, returns
  `{ ok, data | error, reqId }`.
* `src/actions/registry.ts`. The actual cmd map. Lane 1 registers ONE
  handler: `ping`. Returns `{ pong: true, version, ts }`.
* `src/actions/envelope.ts`. Helpers: `newReqId()` (ULID), shape guards.
* `src/components/utils/utils.ts`. `friendlyErrorMessage(err)` ported
  from [gsheet2json main.ts](</Users/acoven/dev/gsheet2json/main/src/main.ts>).
  Also exposes `version()` from manifest.
* `src/worker/service-worker.ts`. Entry point. Boots `createWorkerApp`,
  registers `chrome.action.onClicked` (opens the sidepanel for the
  active tab; if the active tab's URL is not on `mail.google.com`, also
  redirects the tab to `https://mail.google.com/` --- the off-Gmail
  silent-redirect path from the Skateboard validation contract),
  registers `chrome.runtime.onMessage` (routes every incoming envelope
  through `actionDispatcher.dispatch`).
* `src/sidepanel/sidepanel.html`. Base shell:
  * `<head>` with charset, viewport, link to `sidepanel.css`
  * `<body>` with one root container, an h1 saying "G2T Panel", a button
    with id `btnPing`, an output div `pingResult`, and a script tag for
    the bundled `sidepanel.js`
* `src/sidepanel/sidepanel.css`. Single page, no framework. Use CSS
  custom properties for theming. Keep it under 200 lines for the
  skeleton.
* `src/sidepanel/sidepanel.ts`. Boots `createSidepanelApp`. On
  `DOMContentLoaded`, renders, wires `#btnPing` click to send the
  `ping` envelope through `chrome.runtime.sendMessage`, paints the
  typed response into `#pingResult`.
* `package.json`:
  * Scripts: `build` (esbuild bundles `worker`, `sidepanel`, `content`
    entry points to `dist/`), `dev` (esbuild watch mode), `test`
    (cucumber against compiled tests), `package` (zip dist for Chrome
    Web Store upload)
  * Devdeps: `typescript`, `esbuild`, `@types/chrome`,
    `@cucumber/cucumber`, `tsx`
  * No runtime deps in Lane 1.
* `esbuild.config.mjs`. Three entry points (worker, sidepanel,
  content), shared `tsconfig`, `format: 'esm'` for worker, `format:
  'iife'` for sidepanel.
* `tsconfig.json` strict mode, `target: "ES2022"`, `module: "ESNext"`,
  `moduleResolution: "Bundler"`, `lib: ["ES2022", "DOM"]`,
  `types: ["chrome"]`
* `tsconfig.test.json` extends the above with `noEmit: true`
* `cucumber.cjs` mirroring the
  [gmail2trello cucumber config](</Users/acoven/dev/gmail2trello/main/tests/cucumber>)
  layout but pointing at the new project's `features/` and
  `step_definitions/`
* `features/skeleton.feature`. Two scenarios:
  * "Registry composes and disposes" -- creates a worker app, asserts
    the dispatcher is reachable, calls `app.done()`, asserts cleanup.
  * "ping round-trip" -- sidepanel-to-worker channel using a JSDOM
    mock of `chrome.runtime.sendMessage`. Asserts response shape
    `{ ok: true, data: { pong: true, version, ts } }`.
* `README.md`. Short. Install instructions for unpacked load. Link to
  the parent Orch doc and the architecture doc.
* `.gitignore`: `dist/`, `node_modules/`, `*.zip`, `.DS_Store`

## Decisions to lock in this lane

* TypeScript yes (decided in Orch).
* esbuild over vite (Orch default; reconfirm here).
* No framework for v1 sidepanel. Vanilla DOM + a small render helper if
  needed. Match gsheet2json's pattern of writing direct DOM operations.
* Module type for service worker: `type: "module"`. esbuild bundles the
  worker into a single `dist/worker.js` because we need our `Registry`
  + `ActionDispatcher` + handlers all in scope.
* Registry hand-port lives in `src/composition/`. NOT an npm package.
  Keeps the Registry source readable, lets us evolve it for our needs,
  and avoids cross-repo dep drift with print2paper4vscode.
* Action envelope shape is locked here:
  ```typescript
  interface ActionRequest<P = unknown> { cmd: string; payload: P; reqId: string }
  interface ActionResponseOk<D = unknown> { ok: true; data: D; reqId: string }
  interface ActionResponseErr { ok: false; error: { code: string; message: string; friendly: string }; reqId: string }
  type ActionResponse<D = unknown> = ActionResponseOk<D> | ActionResponseErr
  ```
  Every later lane adds handlers; the wire format does not change.

## Test plan for this lane

* Manual: `npm run build`, load `dist/` as unpacked extension in Chrome,
  click the action icon, panel opens, "Hello G2T Panel" visible, click
  ping button, response renders within 100ms.
* Automated: cucumber scenario `skeleton.feature` runs against JSDOM
  with chrome API mocks.
* Acceptance: `npm run build` is green, `npm test` is green, manual
  smoke passes.

## Out of scope for this lane

* Any Gmail content script. Lane 2.
* Any Trello call. Lane 3.
* Real UI (board picker, etc.). Lane 4.
* Icons / branding. The action will use a placeholder 16/32/48/128 png.
* Options page. Add later.

## What "done" looks like

* `code/` exists and `npm run build` produces a clean
  `dist/`.
* Unpacked load in Chrome works in under 30 seconds from a fresh clone.
* `chrome.runtime.sendMessage({ cmd: "ping", payload: {}, reqId })`
  round-trips successfully from the side panel through
  `ActionDispatcher` and back as
  `{ ok: true, data: { pong: true, version, ts }, reqId }`.
* Both Cucumber smoke scenarios pass.
* The existing `chrome_manifest_v3/` directory and its build are
  untouched. The two coexist.
