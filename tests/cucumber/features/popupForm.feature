Feature: PopupForm Class
  The PopupForm manages form elements within the popup view,
  handling data binding, reset, and submission.

  Background:
    Given a PopupForm with mock parent

  # --------------------------------------------------------------------------
  # Constructor and Initialization
  # --------------------------------------------------------------------------

  Scenario: Creating with parent and app dependencies
    Then the instance is a PopupForm
    And it stores the parent reference
    And it stores the app reference

  Scenario: Initializing with default properties
    Then property isInitialized is false

  Scenario: Static ck getter returns correct value
    Then static ck.id of PopupForm is "g2t_popupform"

  Scenario: Instance ck getter returns correct value
    Then ck.id is "g2t_popupform"

  Scenario: Init initializes the form
    When init is called on the instance
    Then property isInitialized is true

  Scenario: BindEvents binds event listeners to app.events
    When bindEvents is called on the instance
    Then addListener was called

  # --------------------------------------------------------------------------
  # Basic Functionality
  # --------------------------------------------------------------------------

  Scenario: Should have bindData method
    Then property bindData is a function

  Scenario: Should have reset method
    Then property reset is a function

  Scenario: Should have submit method
    Then property submit is a function

  Scenario: BindData should bind data to form elements
    Given DOM with header and sign-out button
    When bindData is called on the instance
    Then no error is thrown

  Scenario: Reset should reset form state
    Given DOM with form input elements
    When reset is called on the instance
    Then no error is thrown

  Scenario: Submit should trigger form submission
    Given DOM with title and description inputs
    And app.temp.title is "Test Card"
    And app.persist.boardId is "test-board"
    And app.persist.listId is "test-list"
    When submit is called on the instance
    Then events.emit was called with "submit"

  # --------------------------------------------------------------------------
  # Integration Tests
  # --------------------------------------------------------------------------

  Scenario: Should integrate with parent correctly
    Then the parent reference matches the mock parent
    And the parent state is defined

  Scenario: Should integrate with app correctly
    Then it stores the app reference
    And app events is defined
    And app utils is defined

  # --------------------------------------------------------------------------
  # handleSubmit data assembly
  # --------------------------------------------------------------------------

  Scenario: handleSubmit builds newCard with emailId from app.temp
    Given app.temp.emailId is "email-123"
    And model.submit is mocked on the instance
    When handleSubmit is called on the popupForm
    Then the submitted newCard has emailId "email-123"

  Scenario: handleSubmit builds newCard with boardId from app.persist
    Given app.persist.boardId is "board-456"
    And model.submit is mocked on the instance
    When handleSubmit is called on the popupForm
    Then the submitted newCard has boardId "board-456"

  Scenario: handleSubmit builds newCard with listId from app.persist
    Given app.persist.listId is "list-789"
    And model.submit is mocked on the instance
    When handleSubmit is called on the popupForm
    Then the submitted newCard has listId "list-789"

  Scenario: handleSubmit builds newCard with title from app.temp
    Given app.temp.title is "My Card Title"
    And model.submit is mocked on the instance
    When handleSubmit is called on the popupForm
    Then the submitted newCard has title "My Card Title"

  Scenario: handleSubmit builds newCard with description from app.temp
    Given app.temp.description is "Some description"
    And model.submit is mocked on the instance
    When handleSubmit is called on the popupForm
    Then the submitted newCard has description "Some description"

  Scenario: handleSubmit builds newCard with empty attachment array as default
    And model.submit is mocked on the instance
    When handleSubmit is called on the popupForm
    Then the submitted newCard has attachment as empty array

  Scenario: handleSubmit builds newCard with attachment array from app.temp
    Given app.temp has attachment array with 2 items
    And model.submit is mocked on the instance
    When handleSubmit is called on the popupForm
    Then the submitted newCard has attachment with 2 items

  Scenario: handleSubmit passes newCard to model.submit
    And model.submit is mocked on the instance
    When handleSubmit is called on the popupForm
    Then model.submit was called once

  Scenario: handleSubmit with submitting flag true blocks double submit
    Given the popupForm submitting flag is true
    And model.submit is mocked on the instance
    When handleSubmit is called on the popupForm
    Then model.submit was not called

  # --------------------------------------------------------------------------
  # updateLists
  # --------------------------------------------------------------------------

  Scenario: updateLists clears existing options
    Given DOM with popup containing board and list selects
    And the list select has pre-existing options
    When updateLists is called on the popupForm
    Then the list select has no pre-existing option text

  Scenario: updateLists populates from app.temp.lists
    Given DOM with popup containing board and list selects
    And app.temp.lists is populated with 3 items
    When updateLists is called on the popupForm
    Then the list select has 3 options

  Scenario: updateLists auto-selects persisted listId
    Given DOM with popup containing board and list selects
    And app.temp.lists is populated with 3 items
    And app.persist.boardId is "board-1"
    And app.persist.listId is "list-2"
    And the board select value is "board-1"
    When updateLists is called on the popupForm
    Then the list select value is "list-2"

  Scenario: updateLists auto-selects first item if no persisted listId
    Given DOM with popup containing board and list selects
    And app.temp.lists is populated with 3 items
    And app.persist.listId is cleared
    When updateLists is called on the popupForm
    Then the list select value is "list-1"

  Scenario: updateLists triggers change event after population
    Given DOM with popup containing board and list selects
    And app.temp.lists is populated with 3 items
    And a change listener is attached to the list select
    When updateLists is called on the popupForm
    Then the list change listener was called

  # --------------------------------------------------------------------------
  # updateCards
  # --------------------------------------------------------------------------

  Scenario: updateCards includes new card at top option with value -1
    Given DOM with popup containing list and card selects
    And app.temp.cards is populated with 2 items
    When updateCards is called on the popupForm
    Then the card select first option value is "-1"

  Scenario: updateCards populates from app.temp.cards
    Given DOM with popup containing list and card selects
    And app.temp.cards is populated with 2 items
    When updateCards is called on the popupForm
    Then the card select has 3 options

  Scenario: updateCards auto-selects persisted cardId
    Given DOM with popup containing list and card selects
    And app.temp.cards is populated with 2 items
    And app.persist.listId is "list-1"
    And app.persist.cardId is "card-2"
    And the list select value for cards is "list-1"
    When updateCards is called on the popupForm
    Then the card select value is "card-2"

  Scenario: updateCards stores pos members labels as properties on option elements
    Given DOM with popup containing list and card selects
    And app.temp.cards has items with pos members labels
    When updateCards is called on the popupForm
    Then the card option has pos member and label properties

  Scenario: updateCards truncates long card names
    Given DOM with popup containing list and card selects
    And app.temp.cards has an item with a very long name
    When updateCards is called on the popupForm
    Then the long card name is truncated

  # --------------------------------------------------------------------------
  # updateLabels
  # --------------------------------------------------------------------------

  Scenario: updateLabels creates button per label with correct color
    Given DOM with popup containing label container
    And app.temp.labels is populated with 2 items with colors
    When updateLabels is called on the popupForm
    Then the label container has 2 buttons
    And the first label button has the correct border color

  Scenario: updateLabels restores selected state from persist.labelsId
    Given DOM with popup containing label container
    And app.temp.labels is populated with 2 items with colors
    And app.persist.boardId is "board-1"
    And the board select for labels has value "board-1"
    And app.persist.labelsId includes the second label
    When updateLabels is called on the popupForm
    Then the second label button was clicked to restore state

  # --------------------------------------------------------------------------
  # updateMembers
  # --------------------------------------------------------------------------

  Scenario: updateMembers creates button per member with avatar
    Given DOM with popup containing members container
    And app.temp.members is populated with 2 items
    When updateMembers is called on the popupForm
    Then the members container has 2 buttons
    And the first member button contains an img element

  Scenario: updateMembers restores selected state from persist.membersId
    Given DOM with popup containing members container
    And app.temp.members is populated with 2 items
    And app.persist.membersId includes the second member
    When updateMembers is called on the popupForm
    Then the second member button was clicked to restore state

  # --------------------------------------------------------------------------
  # maybeHydrateGmail
  # --------------------------------------------------------------------------

  Scenario: maybeHydrateGmail does not call when domReady is false
    Given the popupForm has domReady false
    And the popupForm has persistReady true
    And the popupForm has pendingGmailData set
    When maybeHydrateGmail is called on the popupForm
    Then pendingGmailData is still set

  Scenario: maybeHydrateGmail does not call when persistReady is false
    Given the popupForm has domReady true
    And the popupForm has persistReady false
    And the popupForm has pendingGmailData set
    When maybeHydrateGmail is called on the popupForm
    Then pendingGmailData is still set

  Scenario: maybeHydrateGmail calls when both domReady and persistReady are true
    Given DOM with popup for hydration
    And the popupForm has domReady true
    And the popupForm has persistReady true
    And the popupForm has pendingGmailData set
    When maybeHydrateGmail is called on the popupForm
    Then pendingGmailData is cleared

  # --------------------------------------------------------------------------
  # onDomReady
  # --------------------------------------------------------------------------

  Scenario: onDomReady sets domReady flag
    Given the popupForm has domReady false
    And DOM with popup for onDomReady
    When onDomReady is called on the popupForm
    Then the popupForm domReady is true

  Scenario: onDomReady calls syncCheckboxesFromPersist
    Given the popupForm has domReady false
    And DOM with popup for onDomReady
    And a spy on syncCheckboxesFromPersist
    When onDomReady is called on the popupForm
    Then syncCheckboxesFromPersist was called

  # --------------------------------------------------------------------------
  # onPersistReady
  # --------------------------------------------------------------------------

  Scenario: onPersistReady sets persistReady flag
    Given the popupForm has persistReady false
    When onPersistReady is called on the popupForm
    Then the popupForm persistReady is true

  Scenario: onPersistReady syncs checkbox state from app.persist
    Given the popupForm has persistReady false
    And the popupForm has domReady true
    And DOM with popup containing checkboxes
    And app.persist.useBackLink is true
    When onPersistReady is called on the popupForm
    Then the backlink checkbox is checked

  # --------------------------------------------------------------------------
  # Submit guard for race condition fix
  # --------------------------------------------------------------------------

  Scenario: submit is blocked when submitting flag is true
    Given the popupForm submitting flag is true
    And model.submit is mocked on the instance
    When handleSubmit is called on the popupForm
    Then model.submit was not called

  Scenario: submitting flag is set to true on submit
    And model.submit is mocked on the instance
    When handleSubmit is called on the popupForm
    Then the popupForm submitting is true

  Scenario: submitting flag is reset on card creation complete
    Given the popupForm submitting flag is true
    And DOM with popup for submit complete
    When displaySubmitCompleteForm is called on the popupForm
    Then the popupForm submitting is false

  Scenario: submitting flag is reset on API failure
    Given the popupForm submitting flag is true
    And DOM with popup for API failure
    When displayAPIFailedForm is called on the popupForm
    Then the popupForm submitting is false

  # --------------------------------------------------------------------------
  # Submit guard (Wave 2 Lane 2)
  # --------------------------------------------------------------------------

  Scenario: handleSubmit sets _submitting to true
    Given the PopupForm is ready for submit
    When handleSubmit is called on the PopupForm
    Then PopupForm._submitting is true

  Scenario: Second handleSubmit while _submitting is blocked
    Given the PopupForm is ready for submit
    And handleSubmit has been called once
    When handleSubmit is called again
    Then model.submit was called exactly once

  Scenario: _submitting resets on newCardUploadsComplete
    Given PopupForm._submitting is true
    When handleNewCardUploadsComplete is called
    Then PopupForm._submitting is false

  Scenario: _submitting resets on APIFail
    Given PopupForm._submitting is true
    When handleAPIFail is called
    Then PopupForm._submitting is false

  Scenario: _submitting resets on createCard_failed
    Given PopupForm._submitting is true
    When handleCreateCardFailed is called
    Then PopupForm._submitting is false

  Scenario: handleSubmit works again after success
    Given the PopupForm is ready for submit
    And handleSubmit has been called once
    And handleNewCardUploadsComplete fires
    When handleSubmit is called again
    Then model.submit was called exactly twice
