# Wave 6 - Lane 5: Tests Audit

## Goal

Audit the cucumber test suite for references to the jQuery-style
`$popup`/`$popupContent`/etc. shims and update them so the suite passes
after Lane 2 and Lane 3 land. Run the full suite to confirm.

## Why

Lane 2 collapses `this.parent.$popup[0]` to `this.parent.popup`; Lane 3
deletes three of the four shim getters. If any cucumber step or fixture
asserts against the shim names directly, those will break.

## Files

* `tests/cucumber/features/*.feature`
* `tests/cucumber/step_definitions/*.js`
* Any test-fixture or harness files that mock `PopupView`

## Steps

1. Grep the test tree for shim references:

    ```sh
    grep -rn '\$popup\|\$popupContent\|\$popupMessage\|\$g2tButton' tests/
    ```

2. For each match:
   * If the test is asserting against the property by name, update it
     to use the native field name.
   * If the test is constructing a fake `PopupView`, ensure the fake
     exposes the native fields (`popup`, `popupContent`, `popupMessage`,
     `g2tButton`).

3. Run the full cucumber suite:

    ```sh
    npm run test:cucumber
    ```

   (use whatever the repo standard command is; check `package.json`)

4. Capture pass/fail counts and compare against the pre-wave baseline.

## Validation

* No new failing scenarios vs. main.
* `grep -rn '\$popupContent\|\$popupMessage\|\$g2tButton' tests/` returns
  zero matches.
* `$popup` references only remain in places that explicitly need the
  jQuery-UI wrapper.

## Rollback

If failures arise, fix forward in test files. The production code lanes
do not depend on Lane 5; this lane keeps the test suite honest.
