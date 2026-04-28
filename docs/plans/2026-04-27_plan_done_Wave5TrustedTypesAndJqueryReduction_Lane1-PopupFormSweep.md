# Lane 1: class_popupForm.js Sweep

**Date**: 2026-04-27
**Status**: DONE
**File**: `chrome_manifest_v3/views/class_popupForm.js`
**Parent**: [Wave 5 Orch](<2026-04-27_plan_done_Wave5TrustedTypesAndJqueryReduction_Orch.md>)

## Problem

`class_popupForm.js` is the single largest jQuery consumer in the
codebase. It mounts inside the popup, builds option lists from board /
list / label / member data, attaches click and change handlers, and
issues a few `.html(...)` calls with raw template-literal strings that
will trigger `TrustedHTML` violations on real Gmail.

Lane goal: convert every site to native DOM where the conversion is
direct and obvious, leaving only jQuery UI widgets (`.tooltip()`,
`.g2t_combobox()`) and selectors that traverse a jQuery-built tree.

## Conversion patterns (shared across lanes)

* Selector: `$(sel, ctx)` becomes `ctx.querySelector(sel)` for single,
  `ctx.querySelectorAll(sel)` for many.
* Get attribute: `$el.attr('x')` becomes `el.getAttribute('x')`.
* Set attribute: `$el.attr('x', v)` becomes `el.setAttribute('x', v)`.
* Set checkbox state: `$el.prop('checked', v)` becomes `el.checked = v`.
* Get checkbox state: `$el.prop('checked')` becomes `el.checked`.
* Form value: `$el.val(v)` becomes `el.value = v`; getter is `el.value`.
* Visible text: `$el.text(v)` becomes `el.textContent = v`; getter is
  `el.textContent`.
* Show: `$el.show()` becomes `el.style.display = ''`.
* Hide: `$el.hide()` becomes `el.style.display = 'none'`.
* Is checked: `$el.is(':checked')` becomes `el.checked`.
* Is hidden: `$el.is(':hidden')` becomes `el.offsetParent === null`.
* Empty children: `$el.empty()` becomes `el.replaceChildren()`.
* Detach element: `$el.remove()` becomes `el.remove()` (native).
* Direct children: `$el.children(sel)` becomes
  `el.querySelectorAll(':scope > ' + sel)`.
* Append element: `$el.append($child)` becomes `el.append(child)`.
* Append HTML string: `$el.append('<tag>...</tag>')` is rebuilt via
  `document.createElement` and child appends. No HTML strings.
* Replace innerHTML: `$el.html(htmlString)` is rebuilt via DOM. Set
  `el.innerHTML = ...` only when the source string is policy-routed
  via the `g2t-gmail-html` Trusted Types policy created in Lane 5.
* Bind event: `$el.on('evt', fn)` becomes
  `el.addEventListener('evt', fn, { signal })` where `signal` comes
  from a class-stored `AbortController`.
* Unbind event: `$el.off('evt')` becomes `controller.abort()` on the
  stored controller. Re-binding then creates a fresh controller and
  passes its `signal` to the next `addEventListener`.
* Trigger click: `$el.trigger('click')` becomes `el.click()`.
* Trigger custom: `$el.trigger('change')` becomes
  `el.dispatchEvent(new Event('change'))`.
* CSS write: `$el.css('prop', v)` becomes `el.style.prop = v` (camelCase
  the property if needed).
* CSS read: `$el.css('prop')` becomes
  `getComputedStyle(el).getPropertyValue('prop')`.
* Iterate set: `$set.each((i, e) => ...)` becomes
  `for (const e of nodeList) { ... }`.

These patterns are shared across Lanes 1, 2, 3, and 4. Each lane's
"Sites to convert" sections reference them by name.

## Sites to convert

### Constructor / config (lines 70-150)

* `74` `const $element = $(selector, $popup);` -> `const element =
  popup.querySelector(selector);`
* `78` `$element.off('change.g2tPopupForm').on('change.g2tPopupForm',
  ...)` -> use `AbortController` stored on `this.persistControllers`,
  `controller.abort()` then create a new controller and pass `signal`
  to `addEventListener`.
* `79` `$element.is(':checked')` -> `element.checked`.
* `101-102` `.off('keyup.g2tCheckbox', '.g2t-checkbox')` then
  `.on('keyup.g2tCheckbox', '.g2t-checkbox', evt => ...)` ->
  delegated `addEventListener('keyup', evt => { if
  (evt.target.matches('.g2t-checkbox')) ... })`.
* `109-110` same pattern for `keydown.g2tCheckbox`.
* `132` `$(selector, $popup).prop('checked', !!value);` ->
  `popup.querySelector(selector).checked = !!value;`.

### Header / sign-out / report (lines 159-219)

* `159` `this.parent.$popupContent.show();` -> `this.parent
  .popupContent.style.display = '';` (rename caller-side; see "Field
  renames" below).
* `200` `$('.header a').each(() => { ... });` -> `for (const a of
  document.querySelectorAll('.header a')) { ... }`.
* `201` `$(document).on('keyup', $(this), evt => ...)` ->
  `document.addEventListener('keyup', evt => ...)` (note: existing code
  passes `$(this)` as the data param, which is unused by the callback).
* `203` `$(evt.target).trigger('click');` -> `evt.target.click();`.
* `207` `$('#g2tSignOutButton', this.parent.$popup).on('click', ...)` ->
  `popup.querySelector('#g2tSignOutButton').addEventListener('click',
  ...)`.

### Due-date shortcuts (lines 247-269)

* `247` `const $g2t = $('#g2tDue_Shortcuts', this.parent.$popup);` ->
  `const g2t = popup.querySelector('#g2tDue_Shortcuts');`.
* `248` `$g2t.html('');` -> `g2t.replaceChildren();`.
* `269` `$g2t.append($(opt));` -> `g2t.append(opt)` where `opt` was
  built with `document.createElement('option')`. Whatever code on the
  way to line 269 builds `opt` from a jQuery factory needs the same
  conversion.

### Avatar / username (lines 301-319)

* `301` `$('#g2tAvatarImgOrText', ...).text(avatarText);` ->
  `popup.querySelector('#g2tAvatarImgOrText').textContent =
  avatarText;`.
* `303` `$('#g2tAvatarImgOrText', ...).html(...)` -> build `<img>` via
  `document.createElement('img')` and set `src` / `alt` directly,
  `replaceChildren(img)`. Eliminates one TT site.
* `312` `.attr('href', me.url);` -> `.setAttribute('href', me.url);`.
* `314-316` chained `.attr('href', me.url).text(me.username || '?')`
  -> `link.setAttribute('href', me.url); link.textContent =
  me.username || '?';`.
* `319` `.on('click', ...)` -> `addEventListener('click', ...)`.

### Form populate / read (lines 347-470)

* `347-348` `$('#g2tDesc', ...).val(...)`, `$('#g2tTitle',
  ...).val(...)` -> `.value = ...`.
* `351` `this.parent.$popupMessage.hide();` ->
  `this.parent.popupMessage.style.display = 'none';`.
* `352` `this.parent.$popupContent.show();` -> `.style.display = '';`.
* `362-366` three `$(sel, $popup).is(':checked')` for chkMarkdown /
  chkBackLink / chkCC -> `popup.querySelector(sel).checked`.
* `367` `const $g2tDesc = $('#g2tDesc', ...);` -> `const g2tDesc =
  popup.querySelector('#g2tDesc');`.
* `385` `$g2tDesc.attr(name_k, val_k);` -> `g2tDesc.setAttribute(...)`.
* `391` `$g2tDesc.attr(name_k) || ''` -> `g2tDesc.getAttribute(...) ||
  ''`.
* `410` `$g2tDesc.val(val_k);` -> `g2tDesc.value = val_k;`.
* `417` `const $jTags = $(tag_formatted, self.parent.$popup);` ->
  `const tags = popup.querySelectorAll(tag_formatted);`.
* `422-431` `.each(function () { const checked = $(this)
  .is(':checked'); ... $(this).attr(...) })` -> `for (const tag of
  tags) { if (!tag.checked) continue; data.push({ url:
  tag.getAttribute('url'), name: tag.getAttribute('name'), mimeType:
  tag.getAttribute('mimeType') }); }`.
* `441-444` four `.val('')` clears -> `.value = ''`.
* `447` `$('input[type="checkbox"]', ...).prop('checked', false);` ->
  `for (const cb of popup.querySelectorAll('input[type="checkbox"]'))
  cb.checked = false;`.
* `455-458` `$('#g2t_${tag} button.active', ...).map(item =>
  $(item).attr(...))` -> `Array.from(popup.querySelectorAll('#g2t_${tag}
  button.active')).map(item => item.getAttribute('trelloId-${tag}'));`.
* `470` `$('#addToTrello', ...).attr('disabled', ...)` ->
  `.setAttribute('disabled', ...)` or `.disabled = bool`.

### Board / list / label / member option builders (lines 479-727)

These are the highest-density TT-violation sites: every list rebuild
calls `.html('')` then `.append('<option>...')` or `.append('<button>...')`
with template-literal HTML.

* `479` `const $boardSelect = $('#g2tBoard', ...);` -> `const
  boardSelect = popup.querySelector('#g2tBoard');`.
* `481` `$boardSelect.empty();` -> `boardSelect.replaceChildren();`.
* `482` `$boardSelect.append('<option value="">Select a
  board...</option>');` -> build via `new Option('Select a board...',
  '')`, then `boardSelect.append(opt);`. Removes a TT site.
* `485` template-literal append of an option string with
  `board.id` and `board.name` interpolated -> `new Option(board.name,
  board.id)`. Removes a TT site and a string-interpolation injection
  vector.
* `499` `$boardSelect.val(restoreId_k);` -> `boardSelect.value =
  restoreId_k;`.
* `509` `const boardId_k = $('#g2tBoard', ...).val();` -> `const
  boardId_k = popup.querySelector('#g2tBoard').value;`.
* `525-536` list option builder using `$('<option>').attr(...)
  .prop(...).append(display_k)` -> `const opt =
  document.createElement('option'); opt.value = id_k; opt.selected =
  selected_k; opt.append(display_k); g2t.append(opt);`.
* `552` `const listId_k = $('#g2tList', ...).val();` -> `.value`.
* `568` `const $g2t = $('#g2tCard', ...);` -> `const g2t =
  popup.querySelector('#g2tCard');`.
* `569` `$g2t.html(new_k);` -> if `new_k` is a built element, use
  `replaceChildren(new_k)`. If it's a string, build the option list
  via `createElement` and append. The current code path pre-builds an
  HTML string for cards; redirect to a node-based builder.
* `575-583` card option builder; same `$('<option>')` -> `createElement`
  conversion. Includes `.prop('pos', ...)`, `.prop('members', ...)`,
  `.prop('labels', ...)` which set non-standard properties on the
  option element. Native: `opt.pos = item.pos; opt.members =
  item.idMembers; opt.labels = item.idLabels;` (DOM allows expando
  properties).
* `591-615` label button builder. Uses `$('<button>').attr(...)
  .css(...).append(item.name).on('mousedown mouseup', ...)
  .on('keypress', ...)`. Convert to:

  ```js
  const btn = document.createElement('button');
  btn.setAttribute('trelloId-label', item.id);
  btn.style.borderColor = item.color;
  btn.append(item.name);
  btn.addEventListener('mousedown', evt => ...);
  btn.addEventListener('mouseup', evt => ...);
  btn.addEventListener('keypress', evt => ...);
  ```

  The color-luminance probe at lines 597-598 (`$("<div
  id='g2t_temp'>").css('color', ...)` then read `.css('color')`) ->
  `const probe = document.createElement('div'); probe.style.color =
  item.color; document.body.append(probe); const computed =
  getComputedStyle(probe).color; probe.remove();`. Or just feed
  `item.color` into the luminance util directly if the round-trip
  through computed style is not load-bearing.
* `622` `.hide();` -> `.style.display = 'none';`.
* `629` `const boardId = $('#g2tBoard', ...).val();` -> `.value`.
* `639-642` `$(html-string).trigger('click')` for label batch click ->
  build via `createElement`, call `.click()`.
* `649` `$g2t.show();` -> `.style.display = '';`.
* `654-678` member button builder (parallel structure to label
  builder above). Same conversion. Note the nested `<img>` at lines
  673-676 with `.attr('src', avatar).attr('width', size_k).attr('height',
  size_k)` -> `img.src = avatar; img.width = size_k; img.height =
  size_k;`.
* `691-713` member click trigger; same pattern as 639-642.
* `698` `.hide();` -> `.style.display = 'none';`.
* `720` `$g2t.show();` -> `.style.display = '';`.
* `725` `$g2t.html('');` -> `.replaceChildren()`.
* `727` `$g2t.append($('<option value="">Select a
  board....</option>'));` -> `g2t.append(new Option('Select a
  board....', ''));`.

### Tag toggle (lines 743-746)

* `743` `const $jTags = $('#' + tag + ' input[type="checkbox"]',
  ...);` -> `const tags = popup.querySelectorAll('#' + tag + '
  input[type="checkbox"]');`.
* `745` `$jTag1.prop('checked')` -> `tag1.checked`.
* `746` `$jTags.prop('checked', !checked_k);` -> `for (const t of
  tags) t.checked = !checked_k;`.

### Popup messages (lines 761-789, 808-877)

* `761` `this.parent.$popupMessage.html(text);` -> if `text` is plain
  string, `popupMessage.textContent = text;`. If `text` is built HTML,
  build via DOM and `replaceChildren`. Audit caller; in current code
  `text` is passed in from several sites, often as a sanitized message.
* `764` `$('.hideMsg', ...).on('click', ...)` -> `addEventListener`.
* `768` `$(':button', ...).on('click', event => ...)` ->
  `for (const btn of popupMessage.querySelectorAll('button'))
  btn.addEventListener('click', ...);`. The `:button` jQuery selector
  matches `button` and `input[type=button]`; if both are needed,
  expand the selector.
* `770` `$(\`span#${event.target.id}\`, ...)` ->
  `popupMessage.querySelector(\`span#${event.target.id}\`)`.
* `773-808` series of `.html('Done')`, `.html('Reloading')`, etc. Each
  of these is plain text and should be `.textContent = 'Done'` etc.
  Line 789 `.html('&nbsp;')` -> `.innerHTML = '\u00a0'` if a literal
  non-breaking space is needed in the layout, OR `.textContent = '\u00a0'`
  which renders identically. Prefer `textContent`.
* `813` `this.parent.$popupMessage.show();` -> `.style.display = '';`.
* `822` `this.parent.$popupContent.is(':hidden')` ->
  `popupContent.offsetParent === null` (or check `style.display ===
  'none'` if that fits the call site better).
* `824` `this.parent.$popup.hide();` -> `.style.display = 'none';`.
* `826` `this.parent.$popupMessage.hide();` -> `.style.display = 'none';`.
* `831` `const $form = $('#g2tForm', ...);` -> `const form =
  popup.querySelector('#g2tForm');`.
* `832-837` `const $success = $(htmlString); $form.after($success);` ->
  build success card via `createElement`; `form.after(success);` (the
  native `after()` exists on `Element`).
* `836` `$form.hide();` -> `.style.display = 'none';`.
* `842-843` `$success.remove();` -> `success.remove();` (native, no
  change semantically). `$form.show();` -> `.style.display = '';`.
* `874` `this.parent.$popupContent.html(errorHtml);` -> if `errorHtml`
  is already-trusted markup, route it through the TT policy via a
  helper. Otherwise build via DOM.
* `877` `this.parent.$popupMessage.hide();` -> native.

### Reload / submit / submit-result (lines 881-1033)

* `881-883` `$('#reloadTrelloBoards', ...).off('click').on('click',
  ...)` -> `AbortController` rebind.
* `910` `$jVals[key] = $(\`#g2t${key}\`, this.parent.$popup);` -> store
  the native element instead.
* `921` `$('.ui-autocomplete').css('max-height', val_k);` -> jQuery UI
  manages this element; keep this jQuery call OR convert to
  `for (const el of document.querySelectorAll('.ui-autocomplete'))
  el.style.maxHeight = val_k;` (jQuery UI does not depend on us using
  jQuery to read its DOM).
* `937` `$value.children('option:selected').text()` -> `selectEl.options
  [selectEl.selectedIndex]?.textContent`. Note `$value` here is the
  combobox's underlying `<select>`, which is jQuery UI managed; it is
  safe to read via native API.
* `950` `const $domTag = $(domTag_k, ...);` -> `popup.querySelector
  (domTag_k);`.
* `953-954` `const $domTagContainer = ...; $domTagContainer.css(
  'display', data[tag].length > 0 ? 'block' : 'none');` ->
  `.style.display = ...`.
* `985` `$domTag.html(html);` -> if `html` is built markup, route via
  TT policy helper or rebuild via DOM. This is the markdown-rendered
  message body; needs care.
* `988-1002` `$('img', $domTag).each(function () { const $img =
  $(this); $img.attr('src', ...); ... })` -> `for (const img of
  domTag.querySelectorAll('img')) { img.src = ...; ... }`.
* `1017` `this.parent.$popupContent.hide();` -> native.
* `1025` `const boardId = $(target).val();` -> `target.value`.
* `1033` `const listId = $(target).val();` -> `target.value`.

### Sites that stay on jQuery (do NOT convert)

* `928` `$value.g2t_combobox();` -- jQuery UI widget, requires jQuery.
* `935-940` `$value.g2t_combobox(...)` second call form.
* `997-1006` `.tooltip({ ... })` -- jQuery UI plugin.
* `1008-1010` `$('.textOnlyPopup').tooltip({ ... })` -- jQuery UI.

These are the only four remaining jQuery sites in this file after
Lane 1 lands.

### Default values write-back (lines 1121-1147)

* `1121` `if ($.isEmptyObject(data))` -> `if (!data || Object.keys
  (data).length === 0)`. Removes the only `$.` static call in the
  file.
* `1129` `$('#g2tTitle', ...).val(data.subject);` -> `.value = ...`.
* `1147` `$('#g2tPosition', ...).val('to');` -> `.value = 'to';`.

## Field renames (cross-file impact)

`class_popupView.js` exposes `this.$popup`, `this.$popupContent`,
`this.$popupMessage` as jQuery wrappers. Lane 2 will rename the
underlying fields to `popup`, `popupContent`, `popupMessage` (native
elements) and add transition shims `get $popup() { return $(this.popup); }`
during the sweep so Lane 1 and Lane 2 can both compile.

Lane 1 reads from `this.parent.$popup` etc.; convert each read to use
the native field once Lane 2 has shipped its rename. Until then, wrap
reads with `this.parent.$popup[0]` to get the underlying native element
without changing the field name.

Coordination: Lane 1 lands first with `[0]` unwraps; Lane 2 lands
next and sweeps the field references in both files at once.

## Acceptance

* `views/class_popupForm.js` contains exactly four jQuery sites: lines
  surrounding `g2t_combobox()` and `tooltip()` (the two callers each).
* `npm run check` exits 0.
* `npm test` exits 0 with all scenarios passing (Wave 4 baseline 653;
  any drop blocks the lane).
* No new TT-policy-only-can-fix sites in this file (verified by
  re-grepping for `\.html\(|\.append\(.*<` after the sweep; the only
  hits should be jQuery UI internals or the markdown-rendered message
  body which is documented as policy-routed).

## Out of scope

* `lib/combo.js` (jQuery UI sample combobox).
* `lib/jquery-ui-1.14.1.min.js` itself.
* Anything in `class_popupView.js` (Lane 2).
* Field renames on `class_popupView.js` itself (Lane 2 owns).
