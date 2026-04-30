# gmail.js: exact jQuery API surface

**Date**: 2026-04-28
**Status**: Reference (informational)
**Scope**: Document every jQuery API that the upstream
[KartikTalwar/gmail.js](<https://github.com/KartikTalwar/gmail.js>) library
touches, plus every API our `gmail_loader.js` touches on the gmail.js
boundary. Companion to
[jQuery UI Reduction Assessment](<../2026-04-28_info_JQueryUiReductionAssessment.md>).

## Why this doc exists

Our project keeps jQuery 4.0.0 on the page **only** because gmail.js
needs it. Every other piece of our own code was swept off jQuery in
Wave 5. The Wave 5 plans claim "gmail.js requires it" but never
enumerate which APIs gmail.js actually calls. This doc closes that gap
so a future "drop jQuery entirely" decision can be made against a
concrete surface instead of a vague dependency.

Sources audited:

* `chrome_manifest_v3/lib/gmail.min.js` (our shipped copy, upstream
  v1.1.16, 59,582 bytes).
* Upstream `src/gmail.js` at `master` (4,625 lines, 168 KB), fetched
  from [raw.githubusercontent.com](<https://raw.githubusercontent.com/KartikTalwar/gmail.js/master/src/gmail.js>)
  on 2026-04-28.

## Constructor contract

`var Gmail = function(localJQuery) { ... }` (upstream `src/gmail.js`
lines 9-24).

Three accepted call shapes:

* `new Gmail(false)` -- explicit opt-out. `$` is left undefined inside
  the closure. Some methods still work (the ones implemented purely on
  native APIs and the local `extend`/`merge`/`isArray` helpers), but
  every method that calls `$(...)`, `$.ajax`, `$.param`, `$.merge`, or
  `$.extend` will throw a `TypeError`. Not viable for us.
* `new Gmail(jQueryInstance)` -- explicit injection. This is what we
  do in `chrome_manifest_v3/gmail_loader.js:31`
  (`new Gmail(jQuery)`).
* `new Gmail()` -- falls back to `window.jQuery`. Throws
  `Error("GmailJS requires jQuery to be present in global scope or
  provided as a constructor argument.")` if it cannot find one.

The constructor stores `$` in a closure variable; gmail.js's internal
methods reach jQuery via that local `$`, never via `window.jQuery`
directly.

## Surface our code touches at the gmail.js boundary

The only file in our codebase that imports gmail.js is
`chrome_manifest_v3/gmail_loader.js` (runs in MAIN world). It uses:

* `jQuery` (the global symbol) -- passed as constructor arg:
  `new Gmail(jQuery)`. (line 31)
* `jQuery.htmlPrefilter` -- monkey-patched to route gmail.js's
  internal HTML writes through our `g2t-gmail-html` Trusted Types
  policy. (lines 23-29)

Nothing else. Our content-script-world code never imports or
references `Gmail`; it only listens for `g2t_gmail_event` CustomEvents
that `gmail_loader.js` re-emits.

## jQuery utility functions gmail.js calls internally

Every `$.foo(...)` call site in upstream `src/gmail.js`:

* `$.ajax(config)` -- 2 sites
  * `src/gmail.js:2814` -- inside `api.tools.make_request` (synchronous
    XHR, `async: false`).
  * `src/gmail.js:2828` -- inside `api.tools.make_request_async`
    (asynchronous, with `.done()` / `.fail()` chain). Used by
    `api.get.email_source`, `api.get.last_message_data`, and similar
    helpers that fetch raw message data via Gmail's internal HTTP
    endpoints.
* `$.extend(true, dst, src)` -- 1 site
  * `src/gmail.js:2581` -- deep-merge of custom DOM observers into
    `api.tracker.dom_observers` at observer setup.
* `$.merge(target, source)` -- 1 site
  * `src/gmail.js:2580` -- merges custom observer keys into
    `api.tracker.supported_observers` at observer setup. Note that
    gmail.js also defines a node-friendly local `merge()` at line 1981
    for use in non-DOM code paths, but this site uses jQuery's.
* `$.param(obj, true)` -- 1 site
  * `src/gmail.js:2149` -- serializes XHR body params for outbound
    requests.

## jQuery instance methods gmail.js calls internally

Distinct chained methods that appear on jQuery objects in our shipped
`gmail.min.js` (extracted by tokenizing on `;` and grepping
`.method(`):

* DOM read: `find`, `children`, `closest`, `first`, `last`, `filter`,
  `is`, `hasClass`, `attr`, `text`, `html`, `val`, `data`, `width`,
  `height`, `outerWidth`, `outerHeight`, `toArray`, `map`, `each`.
* DOM write: `addClass`, `append`, `wrap`, `remove`, `css`.
* Events: `on`, `bind`, `click`, `focus`, `mouseup`, `mouseover`,
  `mouseout`, `trigger`.
* Utility on instance: `isArray` (called as `$.isArray` shape inside
  the jQuery namespace, not on a wrapped element).

Plus the implicit `$()` constructor itself:

* 76 distinct `$(...)` selector calls in the upstream source
  (`grep -cE '\$\(' src/gmail.js`). Examples:
  * `$(".nH .if,.iY")` -- main thread container.
  * `$(".hP")` -- subject header.
  * `$("[gh='mtb']")` -- main toolbar.
  * `$("[role=main]:first")` -- attribute + pseudo-selector.
  * `$(mutation.target)` and `$(el)` -- wrapping native DOM nodes
    handed to gmail.js by the MutationObserver.

## jQuery APIs gmail.js explicitly does NOT use

Verified absent in upstream `src/gmail.js`:

* `$.Deferred`, `.when()` -- gmail.js uses native callbacks and the
  jqXHR `.done()`/`.fail()` chain off `$.ajax`, never standalone
  Deferreds.
* `$.proxy()` -- never. Closures and arrow functions throughout.
* `$.parseHTML`, `$.parseJSON`, `$.isFunction` -- never.
* `$.fn.extend` / plugin authoring -- never. gmail.js does not
  register itself as a jQuery plugin.
* `htmlPrefilter` -- gmail.js does not call this hook itself. The
  hook fires inside jQuery whenever jQuery's own HTML-insertion code
  paths (`.html()`, `.append()`, etc.) run. Our `gmail_loader.js`
  hooks it precisely so gmail.js's `.html(...)` writes route through
  the Trusted Types policy.

Also notable: gmail.js's own `extend()` (line 1968) and `merge()`
(line 1981) are advertised in their comments as
"Node-friendly function ... without depending on jQuery". So gmail.js
tries to keep core data-handling paths jQuery-free, and reserves
jQuery for DOM, network, and observer setup. This is consistent with
the `localJQuery === false` opt-out branch existing at all.

## Implications

A complete picture of what would need to be replaced to drop jQuery
from our extension entirely:

* **gmail.js itself** (or a fork). Either patch it to take a thin
  shim implementing `$()`, `$.ajax`, `$.extend`, `$.merge`, `$.param`
  and the ~25 instance methods listed above, OR replace it with our
  own Gmail-DOM tracker. Wave 1's whole point was that we did NOT want
  to maintain Gmail-DOM tracking ourselves, so the shim path is
  cheaper.
* **The shim surface is small**: 4 utility functions plus a
  `$()`-style constructor that returns objects exposing the methods
  above. Most of the methods have direct native-DOM equivalents
  (`querySelector(All)`, `getAttribute`, `textContent`,
  `addEventListener`, `classList`, `closest`). The hard parts are
  `$.ajax` (a small `fetch`-based wrapper would suffice for the two
  internal call sites) and `$.extend(true, ...)` (deep merge).
* **htmlPrefilter goes away** as a concept. If we do not load jQuery,
  there is no `htmlPrefilter` to hook. Our shim's HTML-write path
  (whatever replaces gmail.js's `.html(...)` calls) would need to
  route through the Trusted Types policy directly.
* **Realistic effort**: probably 1-2 days to write the shim and
  verify all gmail.js call sites work, plus a Wave to thread it
  through, but the result is "no jQuery" which also dovetails with
  retiring jQuery UI per the
  [jQuery UI Reduction Assessment](<../2026-04-28_info_JQueryUiReductionAssessment.md>).

## Non-goals

* Not a recommendation to drop jQuery now. Wave 5 just shipped jQuery
  4.0.0. This doc only documents the surface so a future decision is
  informed.
* Not a security review of `$.ajax` use. The two `$.ajax` sites hit
  Gmail's own internal endpoints from a content script, so they
  inherit Gmail's CSP and SameSite cookie posture. A native `fetch`
  replacement would do the same.

## Cross-references

* Upstream gmail.js: [github.com/KartikTalwar/gmail.js](<https://github.com/KartikTalwar/gmail.js>)
* Why we registered `g2t-gmail-html` and hooked `htmlPrefilter`:
  [Wave 5 Lane 5 plan](<2026-04-27_plan_done_Wave5TrustedTypesAndJqueryReduction_Lane5-LibUpdatesAndTtPolicy.md>),
  [gmail.js issue #779](<https://github.com/KartikTalwar/gmail.js/issues/779>).
* Why we keep jQuery + jQuery UI for now: [Wave 5 Orch](<2026-04-27_plan_done_Wave5TrustedTypesAndJqueryReduction_Orch.md>).
* Where `new Gmail(jQuery)` is constructed in our code:
  `chrome_manifest_v3/gmail_loader.js:31`.
