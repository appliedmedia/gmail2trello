# Wave 6 - Lane 3: PopupView Shim Cleanup

## Goal

Remove the now-unused backward-compat shims on `PopupView`:
`$popupContent`, `$popupMessage`, `$g2tButton` getters and setters.
Keep `$popup` because `resetDragResize()` itself calls `.draggable()` and
`.resizable()` which require a jQuery object.

## Why

After Lane 2 lands, no caller in app code references `$popupContent`,
`$popupMessage`, or `$g2tButton`. The setters that unwrap jQuery objects
also become dead code. Leaving them invites future drift back into the
double-wrap pattern.

## Blocked By

Lane 2 must be merged first.

## Files

* `chrome_manifest_v3/views/class_popupView.js`

## Steps

1. Re-grep the codebase for remaining usage:

    ```sh
    grep -rn '\$popupContent\|\$popupMessage\|\$g2tButton' chrome_manifest_v3/ tests/
    ```

   Confirm zero hits except the definitions themselves.
2. Delete the getter/setter blocks for `$popupContent`, `$popupMessage`,
   `$g2tButton` (currently lines 26-43).
3. Update the comment block at line 16 to reflect that only `$popup`
   remains (kept for jQuery-UI drag/resize).
4. Leave `$popup` getter and setter intact.

## Validation

* `grep -rn '\$popupContent\|\$popupMessage\|\$g2tButton' chrome_manifest_v3/ tests/`
  returns zero matches.
* Cucumber tests still pass.

## Rollback

Single-file change. Revert the commit.
