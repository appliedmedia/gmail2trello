# Gmail-2-Trello: Fix Add-to-Card

**Date**: 2026-04-05
**Status**: Core fix implemented; follow-up required
**Branch**: `fix/add-to-card`
**Purpose**: Restore "add to existing card" functionality lost in
the v2-to-v3 migration by unifying the Uploader chain.

## Summary

The Uploader class now handles both new-card and add-to-card flows
through a single `submit()` entry point:

```text
PopupForm.handleSubmit()
  -> Model.submit(newCard)
    -> new Uploader({ app, parent, trel }).submit(data)
      -> if position === "to" && cardId:
           queue comment + extras + attachments -> upload()
      -> else:
           _createNewCard(data) -> queue attachments -> upload()
```

## Commits

* `2dbfde2`: Unified Uploader chain. Single `submit()` path for
  new cards and add-to-card comments. Removed separate
  `createCard()`/`addToCard()` methods from Model.
* `666a6fe`: Fixed inconsistent field lookup order for
  labels/members between `_buildCardPayload` and `_queueExtras`.
  Both now prefer `labelsId`/`membersId` (canonical form fields).

## Tests (unit tests implemented, integration pending)

### Unit: `trel.feature` (done)

* [x] createCard calls wrapApiCall with card data
* [x] createCard payload verification (title, subject, labels,
  members, due, position)
* [x] createCard with null data emits invalidFormData
* [x] createCard_success emits createCard_success with cardId

### Unit: `model.feature` (done)

* [x] submit with position "to" and cardId routes to add-to-card
* [x] submit with position "to" but no cardId falls back to
  createCard
* [x] submit with position "below" calls createCard

### Integration: `integration.feature` (pending)

* [ ] Add comment to existing card through real
  Model-Trel-Uploader chain (blocked on Wave 2 race fixes)

## Follow-up required

These items are not in this PR and will be addressed in Waves 2-3:

* **Attachments on "to" path**: The Uploader queues attachments
  for existing cards, but the upload path has not been
  integration-tested with the real service worker relay.
* **Success UI for "to" path**: `displaySubmitCompleteForm` says
  "Card created successfully!" which is wrong for comments. Needs
  mode-aware messaging.
* **Race condition safety**: The card dropdown can show stale data
  (RACE-3). Adding a comment to the wrong card is worse than
  creating a duplicate. Wave 2 version counter must land first.
* **Modifier key detection**: Wave 3 will add modifier-key-based
  mode switching on the card dropdown.
* **Visual mode indicator**: Wave 3 will add a visual indicator
  showing "to" vs "after" mode.
