# jQuery UI Reduction Assessment

**Date**: 2026-04-28
**Status**: Discovery
**Scope**: G2T popup + Gmail-toolbar button
**Question**: After Wave 5 lands jQuery 4 + the TT policy, jQuery UI
1.14.1 (252 KB minified) is the largest remaining vendor JS we ship.
What pieces of jQuery UI do we actually use, and how much could we
delete by going native?

## Inventory: what we use today

Direct widget calls in our code:

* `class_popupForm.js:1165` `.tooltip({ track: true, content: ... })`
  on each preview-image element. Custom HTML content (`<img src=...>`).
* `class_popupForm.js:1176` `.tooltip({ track: true })` on
  `.textOnlyPopup`. Default `title`-attribute mode.
* `class_popupView.js:283` `.draggable({ containment: 'window',
  cancel: 'a, button, input, select, textarea, .ui-autocomplete,
  .hideMsg' })` on the popup root.
* `class_popupView.js:289` `.resizable({ minHeight, minWidth,
  maxHeight, maxWidth, handles: 'w,sw,s,se,e', resize: cb })` on
  the popup root.
* `class_popupForm.js:1071` `.g2t_combobox()` on the boards/lists
  selects. `g2t_combobox` is our wrapper in `lib/combo.js` around
  jQuery UI Autocomplete + Button.

Through `lib/combo.js`:

* `$.widget('g2t_combobox', { ... })` Widget Factory subclass.
* `.autocomplete({ delay, minLength, autoFocus, source })` plus
  `autocomplete('search', '')` and `autocomplete('instance').term`.
* `.button({ icons, text })` (the show-all dropdown trigger).
* `$.ui.autocomplete.escapeRegex(...)` utility.
* CSS classes `ui-widget`, `ui-state-default`, `ui-corner-*`,
  `ui-button`, `ui-icon`, `ui-icon-triangle-1-s`, `ui-icon-triangle-1-n`.
* `.ui-autocomplete` and `.ui-autocomplete.ui-front` are read by
  `class_popupForm.js:1062` (cleanup) and `class_popupView.js:286,399`
  (drag-cancel and outside-click-ignore selectors).

Styles and assets:

* `lib/jquery-ui-1.14.1.min.css` (35 KB) -- our own `style.css`
  pulls in `.ui-widget` font reset (line 59), `.ui-tooltip` /
  `.ui-tooltip-content` overrides (lines 202-213), and
  `.ui-autocomplete.ui-front` z-index fix (line 738).
* Six `images/ui-icons_*_256x240.png` sprite sheets shipped via
  `web_accessible_resources`.

## Required jQuery UI subset (minimum)

Without dropping any feature, a minimal custom build of jQuery UI
1.14.x would need to include:

* `widget` (Widget Factory; combo.js depends on `$.widget(...)`)
* `position` (Autocomplete and Tooltip both use it for placement)
* `widgets/mouse` (foundation for Draggable + Resizable)
* `widgets/draggable`
* `widgets/resizable`
* `widgets/tooltip`
* `widgets/menu` (Autocomplete depends on Menu)
* `widgets/autocomplete`
* `widgets/button` (combo.js show-all trigger)
* `effect-core` + `effect-fade` (Tooltip default show/hide)
* `keycode` and `data` utilities (small)
* `disable-selection` (used by Draggable/Resizable)

That is roughly half of the upstream bundle, mostly because the
two interaction widgets (Draggable, Resizable) plus the two display
widgets (Tooltip, Autocomplete) plus their Menu / Mouse / Position
foundations cover most files. Effect-blind, dialog, datepicker,
sortable, selectable, accordion, tabs, spinner, slider, progressbar,
selectmenu, checkboxradio, controlgroup, and most of the effects can
be excluded. Realistic minimum custom-build size: 90-120 KB
minified, vs 252 KB today.

## Native replacement assessment, widget by widget

### Tooltip (image preview + textOnlyPopup)

* **What we use**: `track: true` (tooltip follows pointer), a
  custom HTML `content` callback for the image-preview tooltip,
  and the default `title`-attribute mode for `.textOnlyPopup`.
* **Native option**: a small custom tooltip helper. On
  `mouseenter`, position a `<div role="tooltip">` next to the
  cursor, fill it via `textContent` (text mode) or DOM-built
  children (image mode). On `mousemove`, update position. On
  `mouseleave`, remove. About 40-60 lines of JS plus CSS for the
  bubble. Trusted Types are not an issue because we build the
  preview with `createElement` + `setAttribute('src', ...)`, never
  `innerHTML`.
* **What we lose**: nothing functional. The `popover` HTML
  attribute is also worth a look, but it does not support
  cursor-tracked positioning, so a custom helper is simpler.
* **Effort**: low. Maybe half a day including styling parity.

### Draggable (popup root)

* **What we use**: `containment: 'window'` to clip drag inside the
  viewport, and `cancel: 'a, button, input, select, textarea,
  .ui-autocomplete, .hideMsg'` so dragging the popup doesn't fire
  when the user grabs an interactive child.
* **Native option**: Pointer Events. On `pointerdown` on the popup
  header (or anywhere outside `cancel` selectors), record offset,
  attach `pointermove` and `pointerup` to `window`, translate via
  `style.left`/`style.top` clipped to `window.innerWidth/innerHeight`.
  About 60-80 lines.
* **What we lose**: jQuery UI's `revert`, `helper`, `scroll`, and
  `snap` features. None of these are configured today.
* **Effort**: medium. Real risk is touch-vs-mouse parity; Pointer
  Events handle both but there are edge cases (modifier keys,
  capture release on text-selection).

### Resizable (popup root)

* **What we use**: `handles: 'w,sw,s,se,e'` (no top, no n/ne/nw),
  `min/maxWidth`, `min/maxHeight`, and a `resize` callback that
  drops a CSS `max-height` cap and persists popup width.
* **Native option**: pointer-event handlers on five 4 px-wide
  handle elements positioned absolutely inside the popup
  (`bottom: 0; left: 0; cursor: sw-resize` for SW, etc.). On
  `pointerdown`, capture starting size + pointer position, then
  `pointermove` updates `style.width` / `style.height` clipped to
  min/max. About 100-130 lines including the handle DOM.
* **What we lose**: jQuery UI's `aspectRatio`, `ghost`, and
  `animate` features. None used today.
* **Effort**: medium-high. Five handles and edge cases (W and N
  resize must update both position and size; SE only updates
  size).

### Autocomplete + Button (combobox)

* **What we use**: a select-element-backed combobox where the user
  can type to filter, and a "show all" button toggles the full
  list. Source is the in-memory option list of the underlying
  `<select>`. We also read `autocomplete('instance').term` to
  reset, and use `escapeRegex`.
* **Native option A**: HTML `<datalist>`. Simplest. `<input
  list="boardlist">` plus `<datalist id="boardlist"><option
  value="...">`. Browser handles filter and dropdown.
  Limitations: filter is browser-defined (substring on Chrome,
  prefix on some others), dropdown styling is not customizable,
  no "show all on click" affordance, no "show on focus", and the
  selected `<option value>` is what fires `input` events, not the
  underlying `<select>`. Probably a regression.
* **Native option B**: ARIA combobox pattern. Build the dropdown
  ourselves: `<input role="combobox" aria-expanded>` + `<ul
  role="listbox">` with `aria-selected`. On `input`, filter
  options. On focus, show all. On Enter / click, set the
  underlying `<select>`'s value. About 250-350 lines including
  keyboard handling (Up, Down, Enter, Escape, Home, End). This
  is the proper accessible replacement.
* **What we lose**: nothing functional with option B; filter
  semantics with option A.
* **Effort**: high. The combobox is the hardest piece because it
  is the most-used interactive widget in the popup, and getting
  keyboard accessibility right is non-trivial.

## Recommendation

Three credible paths:

* **Path 1 -- ship as-is**. Keep jQuery UI 1.14.1 (or bump to
  1.14.2 in this PR if the changelog is uneventful). Cost: 252 KB
  of vendor JS keeps shipping. Risk: zero.
* **Path 2 -- minimal custom build**. Build a custom jQuery UI
  download with only the 12 modules listed above. Probably
  90-120 KB. Effort: half a day to set up the
  download-builder (or grunt task) and verify the slim build still
  drives our four widgets. Risk: low; the bundle is smaller but
  semantics are unchanged. Worth doing whether or not we go
  native later.
* **Path 3 -- native replacement, in waves**. In rough effort
  order:
  * **Wave A**: tooltip (low effort). Drops the `widgets/tooltip`
    module. Could happen as a small standalone PR before Path 2.
  * **Wave B**: draggable + resizable (medium effort each, can
    parallelize). Drops two of the largest jQuery UI modules and
    the entire Mouse + DisableSelection foundation. Worth doing
    as a single Wave because the overlap between drag and resize
    pointer-event handling is ~60% reusable.
  * **Wave C**: combobox (high effort, last). Drops Autocomplete,
    Menu, Button, Position, and Widget Factory. After Wave C,
    `lib/combo.js` and `lib/jquery-ui-1.14.1.min.{js,css}` are
    deletable, the six `ui-icons_*` PNGs go away, and our only
    remaining jQuery dependency is gmail.js itself.

If we do Path 3 in full, we drop ~290 KB of vendor assets (jQuery
UI JS + CSS + sprites) and our remaining `$` use collapses to
gmail.js's `new Gmail($)` argument plus the `$.widget` /
`$.htmlPrefilter` infrastructure consumed inside gmail.min.js.
Whether to attempt Path 3 depends on whether the maintenance
weight of jQuery UI keeps biting us (the TT incident is one
example: jQuery UI internally writes raw HTML, so dropping it
removes one entire class of TT-policy concerns).

## Suggested next step

Before any native rewrite, do **Path 2** (minimal custom build)
in a small follow-up PR. It is cheap, immediately reduces the
attack surface, and gives us a known-clean baseline for the
later native-replacement waves. The custom-build URL is at
[jQuery UI Download Builder](<https://download.jqueryui.com/>);
the per-component checkboxes line up with the module list above.

If we then commit to Path 3, sequence Wave A, Wave B, Wave C as
separate PRs against `main` after 3.2.0.002 ships.

## Out of scope

* Replacing jQuery itself. Wave 5 just bumped to 4.0.0; the only
  remaining `$` reads in our code go through the kept jQuery UI
  combobox/tooltip block. After Wave C, we can revisit.
* Replacing gmail.js. It is a hard dependency of the toolbar
  detection; gmail.js v1.1.16 is on jQuery 4 already.
* Replacing the `combobox` UX with a different control (e.g.
  multiselect chips). That is a product decision, not a jQuery
  reduction.
