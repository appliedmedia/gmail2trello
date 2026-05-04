# Wave 6 - Lane 2: PopupForm Unwrap Sweep

## Goal

Eliminate the `this.parent.$popup[0]` double-wrap pattern across
`chrome_manifest_v3/views/class_popupForm.js`. Replace it with the native
field `this.parent.popup` already maintained by `PopupView`. Same for
`$popupContent`, `$popupMessage`, `$g2tButton`. Remove the lone jQuery
context-selector at line 1051 and the `.offset()` call at line 1057.

## Why

`PopupView` stores the popup root as a native element on `this.popup`. The
`$popup` getter wraps it in jQuery on demand. Most consumers in `PopupForm`
do `const popup = this.parent.$popup[0];` which jQuery-wraps then immediately
unwraps. That is purely wasted allocation and reads as confusing legacy.

After this sweep, `PopupForm` carries no jQuery references at all. The lone
remaining jQuery surface in this file is the `g2t_combobox` and `tooltip`
calls which depend on jQuery-UI and stay.

## Files

* `chrome_manifest_v3/views/class_popupForm.js`

## Sites

Sites identified by grep (line numbers approximate, follow the pattern, do
not stop at this list — sweep the whole file):

* Lines 41, 42, 70, 71, 74, 108, 109, 112, 155, 156, 159, 194, 195, 236,
  409, 410, 418, 473, 498, 528, 541, 551, 582, 623, 665, 744, 827, 847,
  859, 868, 941, 945, 946, 950, 957, 995, 1003, 1007, 1008, 1048, 1051,
  1057, 1090, 1184, 1185, 1297

## Transform Rules

* `this.parent.$popup[0]` -> `this.parent.popup`
* `this.parent.$popupContent[0]` -> `this.parent.popupContent`
* `this.parent.$popupMessage[0]` -> `this.parent.popupMessage`
* `this.parent.$g2tButton[0]` -> `this.parent.g2tButton`
* Truthy check `if (this.parent.$popup)` -> `if (this.parent.popup)`
* Length-guard `if (!$popup || !$popup.length)` ->
  `if (!this.parent.popup)` (drop the local `$popup` const if no longer used)
* `this.parent.$popup.offset()` (line 1057) -> use native
  `getBoundingClientRect()`. The current code reads `popup_offset_k.left`
  and `.top`. Native equivalent:

    ```js
    const rect = this.parent.popup.getBoundingClientRect();
    const popup_offset_k = { left: rect.left, top: rect.top };
    ```

* `$(\`#g2t${key}\`, this.parent.$popup)` (line 1051) -> use native
  `querySelector` and wrap only the native result. Read the surrounding
  `comboBox()` method - it stores values into `jVals[key]` and later passes
  to `$value.g2t_combobox(...)`. The g2t_combobox call needs a jQuery
  object as `$value`, so wrap on demand:

    ```js
    const nativeEl = this.parent.popup.querySelector(`#g2t${key}`);
    jVals[key] = nativeEl ? $(nativeEl) : null;
    ```

  Keep `jVals[key]` as a jQuery object because it is fed into the
  `g2t_combobox` jQuery-UI plugin two lines later.

## Steps

1. Read `class_popupForm.js` end to end (it is large; use `Read` in
   chunks if needed).
2. Apply the transform rules above to every matching site. Use multi-edit
   if the file allows; otherwise per-site edits.
3. After every change, search the file for any remaining `$popup`,
   `$popupContent`, `$popupMessage`, `$g2tButton` references (excluding
   inside string literals) and convert them.
4. Spot-check 3 random methods to ensure the rewrites preserve semantics
   (no removed `display = ''` resets, no off-by-one with `[0]` indexing).

## Validation

* `grep -n '\$popup\|\$popupContent\|\$popupMessage\|\$g2tButton' chrome_manifest_v3/views/class_popupForm.js`
  must return zero matches.
* `grep -n '\$(' chrome_manifest_v3/views/class_popupForm.js` must return
  only the line-1051 transform site (now using native +1 wrap) plus the
  jQuery-UI tooltip and g2t_combobox calls (lines 1071, 1079, 1165, 1176).
* No syntax errors: a quick node parse via `node --check` on the file.

## Rollback

Single-file change. Revert the commit if regressions surface.
