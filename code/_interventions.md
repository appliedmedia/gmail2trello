# G2T Panel Interventions Log

**Status**: living document; new entries land newest-first at the top.
**Owner**: project owner + AI assistant. Every correction the operator gives the assistant that is *not already covered* by a principle gets an entry here.
**Adapted from**: Claiyr's [`_interventions.md`](</Users/acoven/dev/claiyr/main/docs/_interventions.md>); G2T does not port Claiyr's INT-0001..INT-0032 because those are Claiyr-specific (Reset / Genus / Rust mechanics). G2T's intervention log starts fresh and seeds only with the corrections that *originated* in the G2T project.

## Format

Each entry is a top-level `##` heading followed by four bullets:

```text
## YYYY-MM-DD INT-NNNN: Short imperative title

* Mistake: what the assistant did wrong (or the false assumption it made).
* Correction: what the operator told it. Verbatim quote where possible.
* Corrective actions:
  * `[_]` Concrete durable change to _principles.md / _project_mgmt.md / a script / a CI gate that prevents recurrence.
  * `[_]` Optional second corrective wiring the same lesson into another surface.
* Memory: feedback_<name>.md (optional auxiliary pointer only -- never the corrective action itself).
```

Rules:

* `INT-NNNN` is monotonically increasing, 4-digit zero-padded, starting at `0001`. Never reused.
* New entries land at the **top** of the Entries section (newest-first).
* Before filing, compute max INT-NNNN from existing headers and set next id = max + 1.
* Corrective actions MUST be resolute durable changes. "Write a memory entry" is NOT a corrective action; it may appear only as the optional Memory auxiliary pointer.
* `[_]` flips to `[x]` only when the change is landed (verifiable via `git log` or file existence).
* When an intervention generalises into a principle, the corrective action names the new principle id (e.g., "promoted to P16") and the Principles doc updates in the same commit.

## Why entries land here vs in memory

Memory files (`/Users/acoven/.claude/projects/-Users-acoven-dev-gmail2trello-main/memory/feedback_*.md`) are personal-to-the-assistant guidance: the assistant reads them on every session start and applies them silently. The interventions log is *project-durable*: any human (or any future AI) reading the repo cold can see how the project's discipline was shaped and why. The two persistence layers complement each other:

* A small-scope correction (e.g., "use `*` not `-` for bullet markers in this repo") goes only in memory.
* A discipline correction that affects code shape, PR shape, or planning shape goes here AND in memory. The repo entry is the durable record; the memory entry is the assistant's read-on-load reminder.

Roughly: if a future contributor would benefit from knowing this happened, it goes here. If only the AI assistant would benefit, it stays in memory only.

## Entries

## 2026-05-03 INT-0001: G2T Panel is a sibling, not a new repo

* Mistake: when the user asked for "a new variant of gmail2trello with a side panel," the assistant scoped a brand-new repo, reasoning a clean substrate would be easier.
* Correction: "NO new repo. The new code lives as a sibling folder inside the existing gmail2trello repo. The current `chrome_manifest_v3/` keeps shipping point fixes; the new code grows beside it."
* Corrective actions:
  * `[x]` Layout locked in [`_arch.md`](<_arch.md>) ("G2T Panel is a sibling" section). Sibling folder renamed from `chrome_manifest_v3_new/` to `code/` on 2026-05-03.
  * `[x]` Chk7 Bus on the 8-stage ladder is the cutover path, not a fork. Documented in [`_project_mgmt.md`](<_project_mgmt.md>).
* Memory: project_g2t_panel.md

## 2026-05-03 INT-0002: Stages must be whole, ridable products

* Mistake: when the user asked to "build this the same way we did Claiyr -- Skateboard to Scooter to ...," the assistant mapped Lane 1..Lane 4 onto stage boundaries. That would have shipped Skateboard as scaffolding + Gmail bridge + Trello stub + form skeleton -- four working pieces, no working product.
* Correction: "Stages are whole, ridable products at successive levels of completeness, not sequences of demos. A Skateboard is a ridable skateboard."
* Corrective actions:
  * `[x]` Chk1 Skateboard scoped to the smallest end-to-end usable slice: panel open, Trello sign-in, board+list pick, Add, card appears. Documented in Skateboard validation contract in [`_project_mgmt.md`](<_project_mgmt.md>).
  * `[x]` Claiyr P18 promoted verbatim into G2T as **P16** (every checkpoint ships end-to-end, no deferred items). Attachments, labels, members, activity feed, add-to-existing all deferred to later stages.
* Memory: (no separate memory entry; P16 is the durable enforcement)

<!-- end _interventions.md -->
