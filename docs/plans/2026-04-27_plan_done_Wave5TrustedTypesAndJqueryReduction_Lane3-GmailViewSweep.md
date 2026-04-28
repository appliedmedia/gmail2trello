# Lane 3: class_gmailView.js Sweep

**Date**: 2026-04-27
**Status**: DONE
**File**: `chrome_manifest_v3/views/class_gmailView.js`
**Parent**: [Wave 5 Orch](<2026-04-27_plan_done_Wave5TrustedTypesAndJqueryReduction_Orch.md>)

## Problem

`class_gmailView.js` reads from Gmail's live DOM to extract subject,
sender, recipients, attachments, embedded files, and email body for
the popup form. It does not write into Gmail's DOM. It is the only
class file with a hard dependency on jQuery's selector engine
operating against arbitrary Gmail markup.

Lane goal: convert every read site to native DOM so this file
contributes zero to the jQuery 4 surface area. The `markdownify`
helper called at lines 578 and 582 receives `$emailBody1_k` which
flips from a jQuery wrapper to a native element; Lane 4 covers the
matching change inside `class_utils.js`.

## Conversion patterns

See [Lane 1: Conversion patterns](<2026-04-27_plan_done_Wave5TrustedTypesAndJqueryReduction_Lane1-PopupFormSweep.md>).
This lane uses these additions:

* `$el.first()`: native `arr[0]` for a `NodeList`/`HTMLCollection`,
  or `el` if already singular.
* `$el.nextAll(sel)`: walk siblings via the helper defined in Lane 4
  inside `class_utils.js`:

  ```js
  function nextAll(el, sel) {
    const out = [];
    for (let s = el.nextElementSibling; s; s = s.nextElementSibling)
      if (s.matches(sel)) out.push(s);
    return out;
  }
  ```

  Lane 3 calls it as
  `this.app.utils.nextAllMatching(element, "div[dir='ltr']")`.
* `$.extend(target, src)`: native `Object.assign(target, src)`.
* `$.each(collection, (k, v) => ...)`: for arrays use `forEach`; for
  plain objects use `for (const [k, v] of Object.entries(obj))`.
* `$el.find(sel)` returning a set: `el.querySelectorAll(sel)`.
* `$el.find(sel).first()`: `el.querySelector(sel)`.

## Sites to convert

### markdownify_processAnchor (line 141)

* `141` `const $this = $(element);` -> dead read; `$this` is unused
  past this line based on context (`element` is already the parameter).
  Audit and either delete the line or replace with direct `element`
  use.

### makeAttachmentsArray callback (lines 148-172)

* `148` `($(element).attr('email') || '').trim()` ->
  `(element.getAttribute('email') || '').trim()`.
* `149` `($(element).attr('name') || '').trim()` ->
  `(element.getAttribute('name') || '').trim()`.
* `172` `$(element).attr('download_url')` ->
  `element.getAttribute('download_url')`.

### make_preprocess_email + extend (line 194)

* `194-197` `$.extend(this.preprocess['a'],
  this.make_preprocess_mailto(item.name, item.email));` ->
  `Object.assign(this.preprocess['a'],
  this.make_preprocess_mailto(item.name, item.email));`.

### makeEmbeddedArray callback (lines 213-228)

* `213` `($(element).prop('src') || '').trim()` ->
  `(element.src || '').trim()`. (For an HTMLMediaElement / HTMLImage
  the `src` property is canonical; for a plain DOM element use
  `element.getAttribute('src')`.)
* `214` `$(element).prop('alt') || ''` -> `element.alt || ''`.
* `216` `$(element).nextAll("div[dir='ltr']")` -> use the `nextAll`
  helper defined in Lane 4.
* `217` `$divs_k.find('.T-I.J-J5-Ji.aQv.T-I-ax7.L3.a5q').first()` ->
  iterate the `nextAll` result, on each call `.querySelector(...)`,
  return the first non-null. Inline the search rather than mimic
  jQuery's chained `.find().first()`.
* `218` `$div1_k.attr('aria-label') || ''` -> `div1
  ?.getAttribute('aria-label') || ''`.
* `228` `($(element).prop('type') || 'text/link').trim()` ->
  `(element.type || element.getAttribute('type') || 'text/link')
  .trim()`.

### root + button/popup teardown (lines 271-301)

* `271` `this.$root = $('body');` -> rename field to `this.root =
  document.body;`. Add a transitional getter `get $root() { return
  $(this.root); }` until other lanes stop reading the jQuery form.
  After Lane 1 lands its conversion, drop the getter.
* `293` `const $existingButton = $('#g2tButton');` ->
  `document.querySelector('#g2tButton')`.
* `295` `$existingButton.remove();` -> native (works on null guard).
* `299` `const $existingPopup = $('#g2tPopup');` -> native.
* `301` `$existingPopup.remove();` -> native.

### Toolbar climb (lines 321-324)

* `321` `let $toolBar = $("[gh='mtb']", this.$root) || null;` ->
  `let toolBar = this.root.querySelector("[gh='mtb']");`.
* `323` `while ($($toolBar).children().length === 1)` -> `while
  (toolBar.children.length === 1)` (native `Element.children` is an
  HTMLCollection).
* `324` `$toolBar = $($toolBar).children().first();` -> `toolBar =
  toolBar.children[0];`.

### Expanded emails detection (lines 342-396)

* `342` `this.$expandedEmails = this.$root.find('.h7');` -> rename to
  `this.expandedEmails = this.root.querySelectorAll('.h7');`. Update
  every reader. Field name change ripples through Lane 3 only.
* `355` chained `.find(longSelector)` -> direct
  `this.root.querySelectorAll(longSelector)`.
* `358` `.each((index, element) => { ... })` -> `for (const element of
  matched) { ... }`.
* `360-362` `$(element).attr('g2t_event', 1).click(() => ...);` ->
  `element.setAttribute('g2t_event', '1');
  element.addEventListener('click', () =>
  this.detectEmailOpeningMode_onEmailClick());`.
* `385` `const $viewport = $('.aia, .nH', this.$root).first();` ->
  `const viewport = this.root.querySelector('.aia, .nH');`.
* `396` `$('.h7', this.$root).each((index, element) => ...)` ->
  `for (const element of this.root.querySelectorAll('.h7')) ...`.

### parseData (lines 405-507)

* `405` `const $email1_k = $('.adn.ads div.gs', this.$visibleMail)
  .first();` -> `const email1_k = this.visibleMail
  .querySelector('.adn.ads div.gs');`. The field `this.$visibleMail`
  also renames to `this.visibleMail`.
* `408` `const $emailBody1_k = $('.a3s.aiL', $email1_k).first();` ->
  `const emailBody1_k = email1_k.querySelector('.a3s.aiL');`.
* `419` `const $emailCC_k = $('span.g2', $email1_k);` -> `const
  emailCC_k = email1_k.querySelectorAll('span.g2');`.
* `423` `$emailCC_k.each((index, element) => ...)` -> `for (const
  element of emailCC_k) ...`.
* `428-430` `$emailFromNameAddress_k = $('span.gD', $email1_k);` then
  two `.attr('name')`/`.attr('email')` reads -> `const
  emailFromNameAddress_k = email1_k.querySelector('span.gD');` then
  `(emailFromNameAddress_k?.getAttribute('name') || '').trim();` etc.
  Note jQuery's set-of-zero `.attr()` returns `undefined`; native
  needs the optional chain.
* `442` `$('span.aZo', $email1_k).each((index, element) => ...)` ->
  native `for (const element of email1_k.querySelectorAll('span.aZo'))
  ...`.
* `449-452` `$time_k = $('.gH .gK .g3', $email1_k).first();` then
  `.attr('title') || .text() || .attr('alt')` -> native
  `time_k.getAttribute('title') || time_k.textContent ||
  time_k.getAttribute('alt')`.
* `492` `let $subject = $('.hP', this.$root).first();` -> `const
  subject = this.root.querySelector('.hP');`.
* `493` `($subject.text() || '').trim()` -> `(subject?.textContent ||
  '').trim()`.
* `507` `($subject.attr(emailIDs_k[iter]) || '').trim()` ->
  `(subject?.getAttribute(emailIDs_k[iter]) || '').trim()`.

### CC iteration + image iteration (lines 560, 587)

* `560` `$.each(this.emailCC, (iter, item) =>
  this.parseData_onEmailCCIterate(iter, item))` -> if `this.emailCC`
  is an array, `this.emailCC.forEach((item, iter) =>
  this.parseData_onEmailCCIterate(iter, item))`. If it could be a
  plain object, use `Object.entries(this.emailCC).forEach(([iter,
  item]) => ...)`. Audit at conversion; current call sites in Lane 3
  push to it as an array.
* `587` `$('img', $emailBody1_k).each((index, element) =>
  this.parseData_onImageEach(index, element))` ->
  `[...emailBody1_k.querySelectorAll('img')].forEach((element,
  index) => this.parseData_onImageEach(index, element))`.

### markdownify boundary (lines 578, 582)

`this.app.utils.markdownify($emailBody1_k, ...)` is called twice with
a jQuery wrapper. After Lane 3 converts, the call passes a native
`Element`. Lane 4 (`class_utils.js:448`) updates the receiver to
accept a native element instead of a jQuery wrapper. Until Lane 4
lands, Lane 3 may temporarily wrap with `$(emailBody1_k)` at the call
site only; this is the only allowed transient jQuery wrap.

## Field renames

* `this.$root` -> `this.root` (line 271 and every reader).
* `this.$visibleMail` -> `this.visibleMail` (line 405 and any reader).
* `this.$expandedEmails` -> `this.expandedEmails` (line 342 and any
  reader).

Backward-compat getters not needed; `class_gmailView.js` does not
expose these to other classes.

## Sites that stay on jQuery

None. After Lane 3, `views/class_gmailView.js` contains zero `$`
calls.

## Acceptance

* `views/class_gmailView.js` contains zero `$(`, zero `$.`, zero
  `.attr(`, zero `.prop(`, zero `.text(` (verify by re-grepping after
  the sweep).
* `npm run check` exits 0.
* `npm test` exits 0 with all scenarios passing (Wave 4 baseline 653).
* Manual: open Gmail, view an email with attachments + CC + embedded
  file, confirm the popup form shows attachments and CC entries
  (the data-extraction smoke test).

## Out of scope

* `class_utils.js:markdownify` signature update (Lane 4).
* Any change to `class_gmail.js` (the gmail.js bridge wrapper, not
  this view class).
* Any change to `lib/gmail.min.js` (Lane 5).
