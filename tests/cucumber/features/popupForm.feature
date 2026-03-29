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
