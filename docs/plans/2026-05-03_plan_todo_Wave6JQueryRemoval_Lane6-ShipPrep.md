# Wave 6 - Lane 6: Ship Prep

## Goal

Bump version to 3.2.0.003, add a CHANGES.md entry summarizing the wave,
and run a final verification pass.

## Blocked By

All other lanes (1, 2, 3, 4, 5).

## Files

* `chrome_manifest_v3/manifest.json` (version)
* `package.json` (version, if it tracks)
* `docs/CHANGES.md` (changelog entry)
* All Wave 6 plan files renamed `_todo_` -> `_done_`

## Steps

1. Bump `manifest.json` version from `3.2.0.002` to `3.2.0.003`.
2. Bump `package.json` version to match.
3. Add CHANGES.md entry under a new section dated 2026-05-03:

    ```markdown
    ## 3.2.0.003 - 2026-05-03

    * fix(combo): dispatch native change event so cascade fires after
      board pick (jQuery 4 trigger does not invoke native listeners).
    * refactor(popup): remove `$popup[0]` double-wrap pattern; use native
      fields directly.
    * refactor(popup): drop unused jQuery shim getters
      (`$popupContent`, `$popupMessage`, `$g2tButton`).
    * refactor(content-script): replace jQuery doc-ready shim with native
      `DOMContentLoaded`.
    ```

4. Rename Wave 6 plan files from `_todo_` to `_done_`:

    ```sh
    cd docs/plans && for f in 2026-05-03_plan_todo_Wave6JQueryRemoval_*.md; do
      git mv "$f" "${f/_todo_/_done_}"
    done
    ```

5. Run final smoke test:
   * Reload extension in Chrome
   * Open Gmail, select an email, click G2T button
   * Verify popup hydrates with subject/description
   * Pick a board, verify list/label/member dropdowns populate
   * Submit, verify Trello card created

6. Final commit and push.

## Validation

* Version reflects 3.2.0.003 in both manifest.json and package.json.
* CHANGES.md has the new section.
* All Wave 6 plan files end in `_done_`.
* Smoke test passes.

## Rollback

If smoke fails, revert the offending lane's commit; do not revert the
version/changelog (they document what was attempted).
