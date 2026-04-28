# Lane 2: class_popupView.js Sweep

**Date**: 2026-04-27
**Status**: DONE
**File**: `chrome_manifest_v3/views/class_popupView.js`
**Parent**: [Wave 5 Orch](<2026-04-27_plan_done_Wave5TrustedTypesAndJqueryReduction_Orch.md>)

## Problem

`class_popupView.js` owns the popup lifecycle: insertion into Gmail's
toolbar, show/hide, all the form-element event wiring, and the global
keydown / mouseup namespaced handlers used to close the popup on outside
click. It is the single largest event-handler consumer (25 `.on()` calls,
20 `.off()` calls) in the codebase. Most of the rebinds use jQuery's
event-namespace feature (`'change.g2tPopupForm'`) that has no native
equivalent.

Lane goal: convert every site to native DOM where the conversion is
direct, replace jQuery namespace `.off().on()` patterns with
`AbortController`-based rebinding, and rename the public fields
`$popup`, `$popupContent`, `$popupMessage` to native-element fields
`popup`, `popupContent`, `popupMessage` so other lanes (Lane 1, Lane 3)
can read native elements directly.

## Conversion patterns

See [Lane 1: Conversion patterns](<2026-04-27_plan_done_Wave5TrustedTypesAndJqueryReduction_Lane1-PopupFormSweep.md>)
for the shared table-as-bullet-list. This lane adds:

* jQuery namespaced events: `$el.on('change.g2tPopupForm', fn)` then
  later `$el.off('.g2tPopupForm')` becomes a per-namespace
  `AbortController` stored on the class instance:
  `this.controllers.g2tPopupForm` etc. To rebind, call
  `this.controllers.g2tPopupForm.abort()`, replace with a fresh
  controller, then add listeners with `{ signal: controller.signal }`.
* `$.contains(root, el)`: native `root.contains(el)`.
* `$.ui.keyCode.ESCAPE` / `.ENTER`: replace with the literal
  `KeyboardEvent.key` strings `'Escape'` and `'Enter'`. Switch from
  `event.which` (deprecated) to `event.key`.
* `$el.closest(sel).length == 0`: native `!el.closest(sel)`.
* `$el.is('#g2tPopup, #g2tPopup *')`: native `el.matches('#g2tPopup,
  #g2tPopup *')`.
* `$el.is(':visible')`: native `el.offsetParent !== null`. For
  display:none specifically, also check `getComputedStyle(el).display
  !== 'none'`.

## Field renames (cross-lane contract)

`class_popupView.js` currently exposes:

* `this.$g2tButton` (line 618)
* `this.$popup` (line 619)
* `this.$popupMessage` (line 620)
* `this.$popupContent` (line 621)
* `this.$toolBar` (set elsewhere, used at lines 123, 146, 155)

Lane 2 renames these to native-element fields:

* `this.g2tButton` -> native `Element`
* `this.popup` -> native `Element`
* `this.popupMessage` -> native `Element`
* `this.popupContent` -> native `Element`
* `this.toolBar` -> native `Element`

Backward-compat shims live for the duration of the wave only:

```js
get $popup() { return $(this.popup); }
get $popupContent() { return $(this.popupContent); }
get $popupMessage() { return $(this.popupMessage); }
get $g2tButton() { return $(this.g2tButton); }
get $toolBar() { return $(this.toolBar); }
```

Lane 1 (popupForm) writes against `this.parent.popup[0]` style temporarily.
After both lanes land, the shims are deleted in Lane 6's pre-ship
cleanup pass.

## Sites to convert

### Toolbar insertion / button mount (lines 83-155)

* `83` `const $button = $('#g2tButton');` -> `const button =
  document.querySelector('#g2tButton');`.
* `84` `const $popup = $('#g2tPopup');` -> `const popup =
  document.querySelector('#g2tPopup');`.
* `101` `$('div.asl.T-I-J3.J-J5-Ji,div.asf.T-I-J3.J-J5-Ji', this.$toolBar)`
  -> `this.toolBar.querySelectorAll('div.asl.T-I-J3.J-J5-Ji,
  div.asf.T-I-J3.J-J5-Ji')`.
* `123` `this.$toolBar.append(this.html['add_to_trello']);` -> the
  values in `this.html` are HTML strings; convert insertion via the
  TT policy or rebuild as DOM. See "HTML-string fragments" section
  below.
* `125` `$button.first().is(':visible')` -> `button` is already a
  single element from `querySelector`; check `button.offsetParent
  !== null`.
* `146` `this.$toolBar.append(this.html['popup']);` -> same as 123.
* `155` `this.$toolBar.append(html);` -> same as 123.

### Popup geometry (lines 210-240)

* `210-211` `this.$popup.css('width', newPopupWidth + 'px')`,
  `.css('left', newPopupLeft + 'px')` -> `this.popup.style.width =
  newPopupWidth + 'px'; this.popup.style.left = newPopupLeft + 'px';`.
* `222` `const $g2tDesc = $('#g2tDesc', this.$popup);` -> `const
  g2tDesc = this.popup.querySelector('#g2tDesc');`.
* `223` `const $popupBB = $('#g2tPopup', this.$popup);` -> note this
  selector is redundant (find `#g2tPopup` inside `#g2tPopup`); leave a
  `// no-op` comment if the call site really expects the same element,
  or drop entirely if dead. Audit at conversion time.
* `239` `$('#g2tPopup').css('max-height') != 'inherit'` ->
  `getComputedStyle(document.querySelector('#g2tPopup')).maxHeight !==
  'inherit'`.
* `240` `.css('max-height', 'inherit')` -> `.style.maxHeight =
  'inherit'`.

### Document-level keydown / mouseup namespace (lines 300-391)

This is the namespaced-event hot spot. Every `.on('keydown' +
this.EVENT_LISTENER, ...)` and the closing `.off(this.EVENT_LISTENER)`
must convert.

* `300-303` `$(document).on('keydown' + this.EVENT_LISTENER, event =>
  ...)` -> store
  `this.controllers.keydown = new AbortController();` then
  `document.addEventListener('keydown', evt => ..., { signal:
  this.controllers.keydown.signal });`.
* `306-307` `event.which === $.ui.keyCode.ESCAPE` /
  `$.ui.keyCode.ENTER` -> `event.key === 'Escape'` /
  `event.key === 'Enter'`.
* `326-329` `.on('mouseup' + this.EVENT_LISTENER, event => { ...
  $(event.target).closest('#g2tButton').length == 0 ... })` ->
  `addEventListener('mouseup', evt => { ...
  !evt.target.closest('#g2tButton') ... }, { signal });`.
* `333` `$(event.target).closest('.ui-autocomplete').length == 0` ->
  `!evt.target.closest('.ui-autocomplete')`.
* `347-351` `.on('mousedown' + ...)` and the two `.closest()` checks
  inside -> same conversion.
* `356-362` `.on('focusin' + ...)` plus the `is('#g2tPopup, #g2tPopup
  *')` check -> `addEventListener('focusin', evt => { if
  (evt.target.matches('#g2tPopup, #g2tPopup *')) return; ... }, {
  signal });`.
* `382-385` `$(activeDiv).hasClass('active-mouseDown')` plus
  `addClass`/`removeClass` -> `activeDiv.classList.contains(...)`,
  `.classList.add(...)`, `.classList.remove(...)`.
* `391` `$(document).off(this.EVENT_LISTENER);` -> for each stored
  controller, call `controller.abort();` then null it out. The
  EVENT_LISTENER namespace becomes an internal map of controllers, not
  a string suffix.

### Mount / detach (lines 437-483)

* `437` `const $button = $('#g2tButton');` -> native.
* `445` `$.contains(document.documentElement, $button[0])` ->
  `document.documentElement.contains(button)`.
* `449-450` `$button.remove(); $('#g2tPopup').remove();` -> native
  `button.remove()`, `document.querySelector('#g2tPopup')?.remove()`.
* `455` `const $toolbar = $("[gh='mtb']").first();` ->
  `const toolbar = document.querySelector("[gh='mtb']");`.
* `457` `const $buttonInToolbar = $toolbar.find('#g2tButton');` ->
  `const buttonInToolbar = toolbar.querySelector('#g2tButton');`.
* `462-463` two `.remove()` calls -> native.
* `471` `if (!$button.attr('data-g2t-bound'))` -> `if
  (!button.hasAttribute('data-g2t-bound'))`.
* `483` `if (!$button.is(':visible'))` -> `if (button.offsetParent ===
  null)`.

### Reload button rebind (lines 546-548)

* `546-548` `$('#reload-button').off('click').on('click', () => ...)`
  -> abort `this.controllers.reload`, replace, addEventListener with
  `signal`.

### Field initialization (lines 618-621)

* `618` `this.$g2tButton = $('#g2tButton');` -> `this.g2tButton =
  document.querySelector('#g2tButton');`.
* `619` `this.$popup = $('#g2tPopup');` -> `this.popup =
  document.querySelector('#g2tPopup');`.
* `620` `this.$popupMessage = $('.popupMsg', this.$popup);` ->
  `this.popupMessage = this.popup.querySelector('.popupMsg');`.
* `621` `this.$popupContent = $('.content', this.$popup);` ->
  `this.popupContent = this.popup.querySelector('.content');`.

Add the four backward-compat getters listed in "Field renames" above.

### Close + headerClick + boardchange (lines 644-700)

* `644-646` `$('#close-button', this.$popup).off('click').on('click',
  ...)` -> native + AbortController rebind.
* `651-666` `.off('mousedown').on('mousedown', evt => ...)` then
  `.on('mouseenter', function () { $(this).addClass(...); })` then
  `.on('mouseleave', function () { $(this).removeClass(...); })` ->
  native; the `function () { $(this) }` form converts to
  `function (evt) { evt.currentTarget.classList.add('T-I-JW'); }` (use
  `function` not arrow to keep `this` if the lane prefers).
* `669` `.attr('data-g2t-bound', '1')` -> native `.setAttribute(
  'data-g2t-bound', '1')`.
* `671` `const $board = $('#g2tBoard', this.$popup);` -> native.
* `672` `$board.off('change').on('change', () => ...)` -> native +
  AbortController rebind.
* `673-679` `$board.val()` getters/setters -> `.value`.
* `674-677` four selectors for `$list`, `$card`, `$labels`, `$members`
  -> all native `popup.querySelector(...)`.
* `686-693` `$members.html('').hide(); $labels.html('').hide();` and
  the two `.html($('<option value="">...</option>'))` lines ->
  `members.replaceChildren(); members.style.display = 'none';
  labels.replaceChildren(); labels.style.display = 'none';` for the
  empty case. For the option-prepopulate case (lines 689, 692),
  build the option via `new Option('...please pick a board...', '')`
  and `boardSelect.replaceChildren(opt);`.
* `700-701` `$members.hide(); $labels.hide();` -> native.

### List / card / position / due / submit / authorize / sign-out (lines 707-902)

This is a long run of identical patterns. Most are
`$(sel, this.$popup).off('event').on('event', () => ...)`.

* `707` `const $list = $('#g2tList', this.$popup);` -> native.
* `708` `$list.off('change').on('change', () => ...)` -> AC rebind.
* `709` `$list.val()` -> `.value`.
* `716-728` position-select handler chain. Note line 719 builds a
  selector `'#' + $(event.target).attr('next-select')` ->
  `'#' + evt.target.getAttribute('next-select')`. The `.find('input')`
  at 720 and 727 -> `.querySelector('input')`. The `.trigger('focus')`
  at 721 and 728 -> `.focus()`.
* `732-742` card-select handler. `.find(':selected').first()` at 735
  -> `cardEl.options[cardEl.selectedIndex]`. The `.prop('pos')`,
  `.prop('members')`, `.prop('labels')` reads at 740-742 -> direct
  property reads `cardEl.options[cardEl.selectedIndex]?.pos` etc.
* `747-789` due-date handler. `.off('change').on('change', evt => ...)`
  -> AC rebind. `($(event.target).val() || '').split(' ')` at 778 ->
  `(evt.target.value || '').split(' ')`. `$dueDate.val(new_date)` /
  `$dueTime.val(new_time)` at 835/838 -> `.value`.
* `842-895` submit / signOut / authorize / addToTrello / position /
  dueDate / dueTime / title / desc handlers. All of the same
  `.off('click'|'change'|'input').on(...)` pattern. All convert to AC
  rebind. All `.val()` reads convert to `.value`.

### Tag-checkbox delegated handler (lines 900-902)

* `900` `$(\`#g2t_${tag}\`, this.$popup)` -> native `popup
  .querySelector(\`#g2t_${tag}\`)`.
* `901-902` `.off('change', 'input[type="checkbox"]').on('change',
  'input[type="checkbox"]', () => ...)` -> store an
  `AbortController`, then add a delegated listener:

  ```js
  group.addEventListener('change', evt => {
    if (evt.target.matches('input[type="checkbox"]')) { ... }
  }, { signal });
  ```

## HTML-string fragments (`this.html[...]`)

`this.$toolBar.append(this.html['add_to_trello'])` and
`.append(this.html['popup'])` are the two TT-violation entry points
in this file. The `this.html` map is populated from
`views/popupView.html` via `chrome.runtime.getURL` + `fetch` + parse.

Two acceptable conversion paths; pick one in lane execution:

* **Path A: parse to DOM in the loader.** When the HTML files are
  fetched, parse them with `new DOMParser().parseFromString(text,
  'text/html')` and store `documentElement.firstChild` (or the
  `<body>` children) as native nodes in `this.html`. Inserts then
  become `this.toolBar.append(node.cloneNode(true))`. No TT policy
  required. Prefer this path.
* **Path B: route the strings through the TT policy.** Store strings
  as today, but at append time do `el.innerHTML =
  window.g2tTrustedTypesPolicy.createHTML(htmlString)`. Requires the
  policy registered by Lane 5.

Lane 2 default: Path A. Path B is the fallback if parsing the
toolbar template breaks layout.

## Sites that stay on jQuery

None in this file after the sweep. Every `$()` call in
`class_popupView.js` has a direct native equivalent.

## Acceptance

* `views/class_popupView.js` contains zero `$(`, zero `.on(`, zero
  `.off(`, zero `.attr(`, zero `.prop(`, zero `.val(`, zero `.html(`,
  zero `.append(`, zero `.css(` (verify by re-grepping after the
  sweep). The only remaining jQuery surface is the four backward-compat
  getters in "Field renames", which Lane 6 deletes.
* All four field renames done; Lane 1 sites that read
  `this.parent.$popup[0]` continue to compile.
* `npm run check` exits 0.
* `npm test` exits 0 with all scenarios passing (Wave 4 baseline 653).
* No regressions in popup outside-click close, tag toggling, board /
  list / card change cascading, or focus management.

## Out of scope

* `lib/combo.js` and `lib/jquery-ui-1.14.1.min.js`.
* Anything in `views/class_popupForm.js` (Lane 1).
* Anything in `views/class_gmailView.js` (Lane 3).
* Removing the four backward-compat getters (Lane 6 owns).
