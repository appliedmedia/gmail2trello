# Wave 6: jQuery Removal (App Code) - Orchestrator

## Goal

Remove jQuery from app code wherever the call does not require jQuery-UI.
Keep jQuery-UI (`.draggable`, `.resizable`, `.tooltip`, `.g2t_combobox`) and
the minimum jQuery surface those widgets need.

## Why

Wave 5 already migrated the bulk of the app code to native DOM. What remains
is a small tail of jQuery calls that are easy to convert and a layer of
double-wrap waste in `class_popupForm.js` (`this.parent.$popup[0]`) where the
code wraps a native element in jQuery only to immediately index back to native.

Removing this tail tightens the bundle, eliminates the class of bug we just
hit (jQuery `.trigger()` not firing native listeners), and shrinks the
jQuery footprint to exactly the surface jQuery-UI requires.

## Scope

In scope:

* `content-script.js` document-ready shim (1 site)
* `class_popupForm.js` `this.parent.$popup[0]` -> `this.parent.popup` sweep
  (~25 sites) plus the lone `$()` selector at line 1051 and `.offset()` at
  line 1057
* `class_popupView.js` dead-shim removal after Lane 2 lands
* `class_utils.js` legacy fallback simplification (small)
* Cucumber test audit
* Ship prep: version bump to 3.2.0.003 and CHANGES.md entry

Out of scope (deferred to a future wave):

* Replacing `.draggable` / `.resizable` / `.tooltip` / `.g2t_combobox` (those
  require dedicated UX work to find native or modern replacements)
* Removing jQuery itself (cannot happen until jQuery-UI is replaced)

## Lanes

* Lane 1: `2026-05-03_plan_todo_Wave6JQueryRemoval_Lane1-ContentScriptDocReady.md`
* Lane 2: `2026-05-03_plan_todo_Wave6JQueryRemoval_Lane2-PopupFormUnwrap.md`
* Lane 3: `2026-05-03_plan_todo_Wave6JQueryRemoval_Lane3-PopupViewShimCleanup.md`
* Lane 4: `2026-05-03_plan_todo_Wave6JQueryRemoval_Lane4-UtilsFallbackSimplify.md`
* Lane 5: `2026-05-03_plan_todo_Wave6JQueryRemoval_Lane5-TestsAudit.md`
* Lane 6: `2026-05-03_plan_todo_Wave6JQueryRemoval_Lane6-ShipPrep.md`

## Dependency Graph

* Lane 1 independent
* Lane 2 independent
* Lane 3 blocked by Lane 2
* Lane 4 independent
* Lane 5 independent
* Lane 6 blocked by Lanes 1, 2, 3, 4, 5

Execution: spawn Lanes 1, 2, 4, 5 in parallel. After Lane 2 reports done, spawn
Lane 3. After all lanes report done, run Lane 6.

## Time Budget

Target end-to-end: 2.5 hours.

* Lane 1: 10 min
* Lane 2: 60 min
* Lane 3: 15 min (after Lane 2)
* Lane 4: 15 min
* Lane 5: 30 min
* Lane 6: 20 min

Parallelism collapses the sum into roughly 60 (Lane 2) + 15 (Lane 3) + 20
(Lane 6) = 95 minutes critical path.

## Validation

* `npm run lint` (or repo-equivalent) clean
* Cucumber suite: no new failures vs. main
* Manual smoke: load extension, pick email, popup hydrates, board pick
  cascades to list/label/member dropdowns, submit succeeds

## Rollback

Each lane lands as its own commit. If a lane regresses, revert that commit
without disturbing the others.
