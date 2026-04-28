# Lane 4: Small-Files Sweep

**Date**: 2026-04-27
**Status**: TODO
**Files**: `chrome_manifest_v3/class_menuControl.js`,
`chrome_manifest_v3/class_utils.js`
**Parent**: [Wave 5 Orch](<2026-04-27_plan_todo_Wave5TrustedTypesAndJqueryReduction_Orch.md>)

## Problem

Two short surgical conversions plus the home of the shared
`nextAll` helper used by Lane 3.

* `class_menuControl.js` has two jQuery calls: `.toggleClass('active')`
  and `.addClass('active').siblings().removeClass('active')`.
* `class_utils.js` has one active jQuery site: the
  `markdownify_processMarkdown` `$(elementTag, context.$html).each(...)`
  iterator. It also has the `markdownify` entry point which receives a
  jQuery wrapper from `class_gmailView.js`; Lane 3 starts passing a
  native element instead.

`class_model.js` and `content-script.js` and `gmail_loader.js` have
zero in-our-code jQuery and need no changes (gmail_loader.js's
`gmail.observe.on(...)` calls are gmail.js's own event API, not
jQuery).

## Sites to convert

### class_menuControl.js (lines 33, 45-55)

* `33` `this.items = jQuery(selectors);` -> `this.items =
  document.querySelectorAll(selectors);`. `selectors` here is a CSS
  selector string passed in by the caller in `class_app.js`. Native
  `querySelectorAll` returns a static `NodeList`. The downstream
  `for` loop at line 36 still works.
* `45` `this.items.click(event => ...)` -> `for (const item of
  this.items) item.addEventListener('click', evt => ...);` Stash a
  per-instance `AbortController` in `this.controller` (constructor)
  and pass `{ signal: this.controller.signal }` so subsequent
  `reset(...)` calls can abort and rebind cleanly. Add a `dispose()`
  method or hook the abort into `reset()` itself.
* `49` `$(event.currentTarget).toggleClass('active');` ->
  `evt.currentTarget.classList.toggle('active');`.
* `51-54` chained
  `.addClass('active').siblings().removeClass('active')` ->

  ```js
  evt.currentTarget.classList.add('active');
  for (const sib of evt.currentTarget.parentElement.children) {
    if (sib !== evt.currentTarget) sib.classList.remove('active');
  }
  ```

After Lane 4, `class_menuControl.js` contains zero `$` and zero
`jQuery` references.

### class_utils.js (line 448-450, 482-498)

* `448-450` `$(elementTag, context.$html).each((index, element) => {
  context.$element = $(element); context.element_text =
  (context.$element.text() || '').trim(); ... })` -> after Lane 3
  swap, `context.html` is a native `Element`. Convert:

  ```js
  for (const element of context.html.querySelectorAll(elementTag)) {
    context.element = element;
    context.element_text = (element.textContent || '').trim();
    context.element_meets_min_length =
      context.element_text.length >= context.min_text_length;
    // ...
  }
  ```

  Field rename: `context.$html` -> `context.html`,
  `context.$element` -> `context.element`. Internal to this class.
* `482-498` `markdownify($emailBody, features, preprocess)`: rename
  parameter to `emailBody` (native `Element`). Update the length
  guard at 483 to `if (!emailBody)` (native elements have no
  `.length`). Update line 497 to `html: emailBody,` and line 498 to
  `body: emailBody.innerHTML || '',`. Note: reading `innerHTML` is
  safe; the TT policy only intercepts writes.
* Audit the rest of the markdownify chain (`markdownify_*`
  helpers) for other `context.$html` / `context.$element` reads and
  rename consistently. The class is the sole owner of the context
  object, so all readers are inside this file.

### Helper added to class_utils.js (used by Lane 3)

Add a small static-style helper near the top of the class, used by
`class_gmailView.js:216` for embedded-attachment sibling walks:

```js
nextAllMatching(el, sel) {
  const out = [];
  for (let s = el.nextElementSibling; s; s = s.nextElementSibling) {
    if (s.matches(sel)) out.push(s);
  }
  return out;
}
```

Lane 3 calls it as
`this.app.utils.nextAllMatching(element, "div[dir='ltr']")`.

### Comment cleanup (lines 768, 797)

Two existing comments document the jQuery alternative for
`encodeEntities`/`decodeEntities`:

* `768` `// jQuery way, less safe: return $("<textarea />")
  .text(sourceText).html();`
* `797` `// jQuery way, less safe: return $("<textarea />")
  .html(sourceText).text();`

Delete both comments. The native code right above each one is the
canonical implementation; the historical jQuery version is no longer
relevant once the codebase is jQuery-light.

## Sites that stay on jQuery

None in the files Lane 4 touches. After Lane 4, `class_utils.js` and
`class_menuControl.js` contain zero jQuery references.

## Acceptance

* `class_menuControl.js` contains zero `$` and zero `jQuery`.
* `class_utils.js` contains zero `$(`, zero `$.`, zero `.html(` (the
  remaining `.html` reference at line 498 is `emailBody.innerHTML`,
  not jQuery).
* `npm run check` exits 0.
* `npm test` exits 0 with all scenarios passing (Wave 4 baseline 653).
* Manual: open Gmail, click the popup menu, confirm tab switching
  still updates `.active` classes correctly (the menuControl path).

## Out of scope

* `class_model.js` -- the `.find(` calls there are
  `Array.prototype.find`, not jQuery; no change.
* `gmail_loader.js` -- only consumes jQuery as the `Gmail()`
  constructor argument; that call stays.
* `content-script.js` -- zero jQuery.
* The two markdownify-comment lines are documentation only.
