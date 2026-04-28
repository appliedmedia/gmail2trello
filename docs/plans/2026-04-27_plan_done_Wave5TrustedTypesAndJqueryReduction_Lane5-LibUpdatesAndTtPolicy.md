# Lane 5: Library Updates + Trusted Types Policy

**Date**: 2026-04-27
**Status**: DONE
**Files**: `chrome_manifest_v3/lib/jquery-3.7.1.min.js` (removed),
`chrome_manifest_v3/lib/jquery-4.0.0.min.js` (added),
`chrome_manifest_v3/lib/jquery-3.7.1.min.map` (removed),
`chrome_manifest_v3/lib/jquery-4.0.0.min.map` (added),
`chrome_manifest_v3/lib/gmail.min.js` (replaced with v1.1.16),
`chrome_manifest_v3/manifest.json` (file references updated),
`chrome_manifest_v3/gmail_loader.js` (TT policy registered in MAIN
world before `new Gmail(jQuery)`),
`chrome_manifest_v3/g2t_tt_policy.js` (new helper, prepended to
ISOLATED world load order)
**Parent**: [Wave 5 Orch](<2026-04-27_plan_done_Wave5TrustedTypesAndJqueryReduction_Orch.md>)

## Problem

After Lanes 1-4 land, our own code uses jQuery only in a few jQuery UI
sites (`tooltip()`, `g2t_combobox()`) and the `.ui-autocomplete`
read at `class_popupForm.js:921`. The jQuery version we ship still
violates Trusted Types because jQuery 3.7.1 (and even 4.0.0) writes
raw HTML internally for things like fragment construction. The
documented hook for inserting a TT policy in front of those writes is
`jQuery.htmlPrefilter`, exactly per
[gmail.js issue #779](<https://github.com/KartikTalwar/gmail.js/issues/779>).

Lane 5 lands three coordinated changes:

* Replace `lib/jquery-3.7.1.min.js` with `lib/jquery-4.0.0.min.js`.
  jQuery 4.0.0 stable was released 2026-01-18.
* Replace `lib/gmail.min.js` with upstream gmail.js v1.1.16. v1.1.13
  removed deprecated jQuery APIs that jQuery 4 dropped.
* Register a Trusted Types policy named `g2t-gmail-html` in both
  content-script worlds and hook it into `jQuery.htmlPrefilter` so
  every jQuery internal HTML write is policy-routed.

## Step 1: Drop jQuery 4 + map

Download from the canonical jQuery CDN
(`https://code.jquery.com/jquery-4.0.0.min.js` and
`https://code.jquery.com/jquery-4.0.0.min.map`):

* Save to `chrome_manifest_v3/lib/jquery-4.0.0.min.js`.
* Save to `chrome_manifest_v3/lib/jquery-4.0.0.min.map`.
* Verify SRI hashes against the jQuery release page; record the
  expected SHA-384 in the PR description for audit.

Delete the old files:

* `chrome_manifest_v3/lib/jquery-3.7.1.min.js`
* `chrome_manifest_v3/lib/jquery-3.7.1.min.map`

## Step 2: Update gmail.min.js to v1.1.16

Download from
[gmail.js releases](<https://github.com/KartikTalwar/gmail.js/releases>),
specifically `v1.1.16`. Save to
`chrome_manifest_v3/lib/gmail.min.js`, overwriting the existing copy.

Sanity check: the v1.1.16 minified bundle is roughly the same size as
our current ~59KB file (KartikTalwar's gmail.min has been in the
50-80KB range across recent versions). If the new file is wildly
different (multiple-MB), the wrong artifact was downloaded; redo.

## Step 3: Update manifest.json

Edit `chrome_manifest_v3/manifest.json`:

* Line 39: change
  `"lib/jquery-3.7.1.min.map"` to `"lib/jquery-4.0.0.min.map"`.
* Line 58: change
  `"lib/jquery-3.7.1.min.js"` to `"lib/jquery-4.0.0.min.js"` (MAIN
  world).
* Line 70: change
  `"lib/jquery-3.7.1.min.js"` to `"lib/jquery-4.0.0.min.js"` (ISOLATED
  world).
* Insert a new entry on line 70 BEFORE the jquery file:
  `"g2t_tt_policy.js",`. ISOLATED world load order must register the
  policy before jQuery so jQuery's own `htmlPrefilter` hook is
  registered immediately after jQuery loads.
* MAIN world handles its TT registration inside `gmail_loader.js`
  itself (Step 5).

## Step 4: New file `g2t_tt_policy.js` (ISOLATED-world bootstrap)

New file at `chrome_manifest_v3/g2t_tt_policy.js`. Loads first in the
ISOLATED-world content-script list. Body:

```js
(function () {
  if (window.g2tTrustedTypesPolicy) return;
  if (!(window.trustedTypes && window.trustedTypes.createPolicy)) {
    window.g2tTrustedTypesPolicy = { createHTML: s => s };
    return;
  }
  try {
    window.g2tTrustedTypesPolicy = window.trustedTypes.createPolicy(
      'g2t-gmail-html',
      {
        createHTML: s => s,
        createScript: s => s,
        createScriptURL: s => s,
      },
    );
  } catch (e) {
    window.g2tTrustedTypesPolicy = { createHTML: s => s };
  }
})();
```

The policy name `g2t-gmail-html` must be unique on the page; Gmail
itself uses `gmail`. After jQuery loads, the ISOLATED-world combo
script in `lib/combo.js` (or a new tiny shim, see Step 6) installs
the `htmlPrefilter` hook on `jQuery.fn.constructor` (i.e., `$`).

The pass-through `createHTML: s => s` is intentional. We are
asserting that strings reaching this policy are already trusted
(authored by us or jQuery). The policy's job is to convert them to
`TrustedHTML` so Chrome's CSP allows `innerHTML` to consume them.

## Step 5: gmail_loader.js (MAIN world) registers its own policy

`gmail_loader.js` runs in the MAIN world at `document_start` before
the page does anything. It needs the same policy plus the jQuery
hook, set up before `new Gmail(jQuery)` runs. Edit
`chrome_manifest_v3/gmail_loader.js`:

* Replace the body of the IIFE so the first thing it does (before
  the `setInterval`) is register the policy:

  ```js
  (function () {
    let policy;
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      try {
        policy = window.trustedTypes.createPolicy('g2t-gmail-html', {
          createHTML: s => s,
          createScript: s => s,
          createScriptURL: s => s,
        });
      } catch (_e) {
        policy = { createHTML: s => s };
      }
    } else {
      policy = { createHTML: s => s };
    }
    window.g2tTrustedTypesPolicy = policy;

    const waitForGmail = setInterval(() => {
      if (typeof Gmail !== 'undefined' && typeof jQuery !== 'undefined') {
        try {
          if (jQuery.htmlPrefilter && !jQuery.__g2tHtmlPrefilterHooked) {
            const inner = jQuery.htmlPrefilter;
            jQuery.htmlPrefilter = function (html) {
              return policy.createHTML(inner ? inner(html) : html);
            };
            jQuery.__g2tHtmlPrefilterHooked = true;
          }
          const gmail = new Gmail(jQuery);
          // ...existing emit / observe logic unchanged...
        } catch (_e) {
          // gmail.js failed; interval continues to retry
        }
      }
    }, 100);
    setTimeout(() => clearInterval(waitForGmail), 30000);
  })();
  ```

* Note the policy-name collision guard: if the page already
  registered a policy with the same name, `createPolicy` throws;
  the catch installs a pass-through. Picking `g2t-gmail-html`
  (Gmail's own policy is `gmail`) avoids that case in practice.

## Step 6: ISOLATED-world jQuery hook

Same hook as Step 5 needs to install in ISOLATED world after jQuery
loads there (so `lib/combo.js` and our class files cannot trip TT
when jQuery rebuilds fragments).

Add to `g2t_tt_policy.js` a `DOMContentLoaded`-equivalent latch:

```js
function hookJqueryWhenReady() {
  if (typeof jQuery === 'undefined') return false;
  if (jQuery.__g2tHtmlPrefilterHooked) return true;
  const inner = jQuery.htmlPrefilter;
  const policy = window.g2tTrustedTypesPolicy;
  jQuery.htmlPrefilter = function (html) {
    return policy.createHTML(inner ? inner(html) : html);
  };
  jQuery.__g2tHtmlPrefilterHooked = true;
  return true;
}
if (!hookJqueryWhenReady()) {
  const t = setInterval(() => {
    if (hookJqueryWhenReady()) clearInterval(t);
  }, 50);
  setTimeout(() => clearInterval(t), 30000);
}
```

Append this block to the `g2t_tt_policy.js` IIFE.

## Step 7: jQuery 4 compatibility audit

jQuery 4 removed the following APIs we used historically; verify all
are absent after Lanes 1-4 land:

* `$.isEmptyObject` (Lane 1 line 1121 conversion)
* `$.contains` (Lane 2 line 445 conversion)
* `$.extend` (Lane 3 line 194 conversion)
* `$.each` (Lane 3 line 560 conversion)
* `$.ui.keyCode` (Lane 2 lines 306-307 conversion; jQuery UI 1.14.1
  retained the namespace, but we move to `KeyboardEvent.key`)
* `.bind()` / `.unbind()` / `.delegate()` / `.undelegate()` -- not
  present in our code; jQuery 4 removed these but no action needed.
* `.click(fn)` / `.change(fn)` shorthand -- present at
  `class_menuControl.js:45`; Lane 4 converts to `addEventListener`.
* `.attr('checked', ...)` (vs `.prop`) -- not used in our code;
  every site reads/writes via `.prop('checked', ...)` already.

If after Lanes 1-4 land, any of the above survive (e.g. introduced
by a CodeRabbit suggestion or a botched merge), fix them in Lane 5
before swapping jQuery 4 in. The swap is a hard cutover; a single
surviving `$.isEmptyObject` call breaks the popup.

## Step 8: jQuery UI 1.14.1 vs jQuery 4 compatibility check

jQuery UI 1.14.1 was released October 2024 and lists supported
jQuery versions in its package.json. Verify before Lane 5 commits:

* Open `lib/jquery-ui-1.14.1.min.js` (or read its source release
  notes from the jQuery UI repo).
* If the version supports jQuery 4: keep `lib/jquery-ui-1.14.1.min.js`
  and `lib/jquery-ui-1.14.1.min.css` unchanged, plus
  `lib/combo.js`. Done.
* If jQuery UI 1.14.1 does NOT support jQuery 4: STOP. Lane 5 is
  unmergeable until either (a) jQuery UI 1.14.2+ is released with
  jQuery-4 support, or (b) the combobox is rewritten as a native
  `<input list="...">` + filter, eliminating the jQuery UI dep
  entirely.

This audit is a discovery step, not a code change. Document the
finding in the PR description.

## Step 9: combo.js

`lib/combo.js` is upstream jQuery UI sample combobox, modified
to be namespaced as `g2t_combobox`. It contains its own jQuery use:
`.addClass`, `.attr`, `.tooltip`, etc. These are upstream patterns,
not authored by us, and they will continue to flow through
jQuery's `htmlPrefilter` hook (now policy-routed). No edits to
`lib/combo.js` in Lane 5.

## Acceptance

* Loading the unpacked extension into Chrome on real Gmail produces
  zero `TrustedHTML` errors in the DevTools console.
* The G2T button renders in Gmail's toolbar.
* Clicking the button opens the popup; the popup renders.
* `npm run check` exits 0.
* `npm test` exits 0 with all scenarios passing.
* `git ls-files chrome_manifest_v3/lib/` shows `jquery-4.0.0.min.js`,
  `jquery-4.0.0.min.map`, `gmail.min.js` (v1.1.16),
  `jquery-ui-1.14.1.min.js`, `jquery-ui-1.14.1.min.css`,
  `trello.min.js`, `combo.js`. The two `jquery-3.7.1.*` files are
  removed.
* `manifest.json` references `jquery-4.0.0.min.js` everywhere and
  lists `g2t_tt_policy.js` as the first ISOLATED-world script.

## Out of scope

* Replacing jQuery UI 1.14.1. Discovery in Step 8; if incompatible,
  that is Wave 6.
* Rewriting `lib/combo.js`.
* Any new feature work.
* Touching the service worker (`service_worker.js`); it does not
  load jQuery and is not affected by Trusted Types.
