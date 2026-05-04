# Wave 6 - Lane 4: Utils Fallback Simplify

## Goal

Audit and tighten the legacy-jQuery fallback path in
`chrome_manifest_v3/class_utils.js` around line 490-505. Decide whether the
"plain mock or legacy jQuery object" branch is still reachable; if not,
delete it.

## Why

The block reads:

```js
if (emailBody instanceof Element) {
  nativeBody = emailBody;
} else if (emailBody[0] instanceof Element) {
  nativeBody = emailBody[0];
} else {
  const tmpDiv = document.createElement('div');
  tmpDiv.innerHTML =
    typeof emailBody.html === 'function' ? emailBody.html() : emailBody.innerHTML || '';
  nativeBody = tmpDiv;
}
```

Branch 3 explicitly calls `.html()` on the input, which is jQuery API. After
Wave 5 GmailView migration, all callers should be passing native elements or
jQuery wrappers (handled by branch 2). Branch 3 is most likely dead.

## Files

* `chrome_manifest_v3/class_utils.js`

## Steps

1. Find every caller of `markdownify` (or whatever method this branch lives
   in) and inspect what they pass for `emailBody`.
2. If every caller passes a native element or a jQuery wrapper, delete
   branch 3 and simplify to:

    ```js
    const nativeBody =
      emailBody instanceof Element ? emailBody : emailBody[0];
    ```

3. If any caller still passes a plain mock, leave the fallback but replace
   the `.html()` call with native `.innerHTML` on a probe element so the
   file no longer references jQuery.

## Validation

* `grep -n '\.html()' chrome_manifest_v3/class_utils.js` returns zero matches.
* Cucumber and unit tests still pass.

## Rollback

Single-file change. Revert the commit.

## Note

This lane is small and may be skippable if branch 3 is reachable. Time-box
to 15 minutes; if it gets sticky, mark deferred and move on.
