# Wave 6 - Lane 1: Content Script Doc-Ready

## Goal

Replace the lone `jQuery(function () { ... })` document-ready shim in
`chrome_manifest_v3/content-script.js` line 46 with a native equivalent.

## Why

The MV3 content script is one of the very few files with an actual jQuery
call. The semantics we need are "run once the DOM is ready"; native
`DOMContentLoaded` (or an immediate call when `document.readyState` is
already past loading) covers it without loading jQuery for this single use.

## Files

* `chrome_manifest_v3/content-script.js`

## Steps

1. Find the block at line 46 inside `requestHandler`:

    ```js
    jQuery(function () {
      app.init();
    });
    ```

2. Replace with:

    ```js
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => app.init(), {
        once: true,
      });
    } else {
      app.init();
    }
    ```

3. Leave the surrounding `// Was:` comment block as historical context, but
   add a one-line note that the new path is native.

## Validation

* File parses with no jQuery references in app code path of this file.
* Manual smoke: extension loads in Gmail, popup button appears.

## Rollback

Single-file change. Revert the commit.
