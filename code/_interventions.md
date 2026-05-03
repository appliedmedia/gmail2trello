# G2T Panel Interventions Log

**Status**: living document; new entries land newest-first at the top.
**Owner**: project owner + AI assistant. Every correction the operator gives the assistant that is *not already covered* by a principle gets an entry here.
**Adapted from**: Claiyr's [`_interventions.md`](</Users/acoven/dev/claiyr/main/docs/_interventions.md>); G2T does not port Claiyr's INT-0001..INT-0032 because those are Claiyr-specific (Reset / Genus / Rust mechanics). G2T's intervention log starts fresh and seeds only with the corrections that *originated* in the G2T project.

## Format

Each entry is a top-level `##` heading followed by three bullets:

```text
## YYYY-MM-DD INT-NNNN: Short imperative title

* Mistake: what the assistant did wrong (or the false assumption it made).
* Correction: what the operator told it. Verbatim quote where possible.
* Action: the durable mechanism that prevents recurrence --- a memory entry, a principle promotion, an audit-tool check, a CI gate. "I'll be more careful" is not an action.
```

`INT-NNNN` is a monotonically-increasing 4-digit id starting at `0001`. Never re-used, never zero-padded below `0001`. New entries get the next id and land at the top of the file (newest-first scan order).

When an intervention is severe enough to *generalize* into a principle, the action line names the new principle id (e.g., "promoted to **P16**"). The Principles doc is then updated in the same commit.

## Why entries land here vs in memory

Memory files (`/Users/acoven/.claude/projects/-Users-acoven-dev-gmail2trello-main/memory/feedback_*.md`) are personal-to-the-assistant guidance: the assistant reads them on every session start and applies them silently. The interventions log is *project-durable*: any human (or any future AI) reading the repo cold can see how the project's discipline was shaped and why. The two persistence layers complement each other:

* A small-scope correction (e.g., "use `*` not `-` for bullet markers in this repo") goes only in memory.
* A discipline correction that affects code shape, PR shape, or planning shape goes here AND in memory. The repo entry is the durable record; the memory entry is the assistant's read-on-load reminder.

Roughly: if a future contributor would benefit from knowing this happened, it goes here. If only the AI assistant would benefit, it stays in memory only.

## Entries

## 2026-05-03 INT-0001: G2T Panel is a sibling, not a new repo

* Mistake: when the user asked for "a new variant of gmail2trello with a side panel," the assistant initially scoped a brand-new repo (with the working name "G2T Panel"), reasoning that a clean substrate would be easier than refactoring the existing `chrome_manifest_v3/` in place.
* Correction: "NO new repo. The new code lives as a sibling folder inside the existing gmail2trello repo. The current `chrome_manifest_v3/` keeps shipping point fixes; the new code grows beside it." The user wanted shared git history, shared issue tracker, and shared release notes for both extensions, not a separate-repo audit trail.
* Action: locked the layout in [`_arch.md`](<_arch.md>) and in memory entry `project_g2t_panel.md`. Initial sibling folder was `chrome_manifest_v3_new/`; renamed to `code/` on 2026-05-03 to align with Claiyr's foundation-docs-at-top-of-`code/` convention. Eventual cutover plan is Chk7 Bus on the 8-stage ladder, not a fork.

## 2026-05-03 INT-0002: Stages must be whole, ridable products

* Mistake: when the user asked to "build this the same way we did Claiyr --- Skateboard → Scooter → ...," the assistant's first instinct was to map the existing Lane 1..Lane 4 structure onto stage boundaries and call it done. That would have shipped Skateboard as "scaffolding + Gmail bridge + Trello stub + form skeleton" --- four working pieces, no working *product*.
* Correction: "Stages are whole, ridable products at successive levels of completeness, not sequences of demos. A Skateboard is a ridable skateboard." (Echoing Claiyr's P18.)
* Action: scoped Chk1 Skateboard down to *the smallest end-to-end thing a user can use*: open panel on Gmail, sign in to Trello, pick board+list, hit Add, see Trello card with subject + body. Promoted Claiyr's P18 verbatim into G2T as **P16** (every checkpoint ships end-to-end --- no deferred items). Activity feed, attachments, labels, members, due, add-to-existing all moved out of Skateboard into later stages.

<!-- end _interventions.md -->
