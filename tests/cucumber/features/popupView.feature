Feature: PopupView Class
  The PopupView manages the popup overlay in the Gmail interface,
  including sizing, positioning, and form integration.

  Background:
    Given a PopupView with mocked setInterval

  # --------------------------------------------------------------------------
  # Constructor and Initialization
  # --------------------------------------------------------------------------

  Scenario: Creating with app dependency
    Then the instance is a PopupView
    And it stores the app reference

  Scenario: Initializing with default properties
    Then property isInitialized is false
    And property dataDirty is true
    And property MAX_BODY_SIZE is "16384"
    And the mouseDownTracker is an empty object
    And property lastError is ""
    And the updatesPending is an empty array
    And property comboInitialized is false

  Scenario: Initializing size constraints
    Then size_k width.min is 700
    And size_k width.max is window.innerWidth minus 16
    And size_k height.min is 464
    And size_k height.max is 1400
    And size_k text.min is 111

  Scenario: Creating PopupForm instance
    Then the form is an instance of PopupForm
    And the form parent is the popupView
    And the form app is the same app

  Scenario: Static ck getter returns correct value
    Then static ck.id of PopupView is "g2t_popupview"

  Scenario: Instance ck getter returns correct value
    Then ck.id is "g2t_popupview"

  # --------------------------------------------------------------------------
  # Basic Functionality
  # --------------------------------------------------------------------------

  Scenario: Should have init method
    Then property init is a function

  Scenario: Should have finalCreatePopup method
    Then property finalCreatePopup is a function

  Scenario: Should have centerPopup method
    Then property centerPopup is a function

  Scenario: Init should initialize the popup view
    Given popup DOM structure with toolbar and button
    When popupView init is called with mocked setInterval
    Then no error is thrown

  Scenario: FinalCreatePopup should create popup elements
    Given popup DOM structure with toolbar and button
    When finalCreatePopup is called on the instance
    Then no error is thrown

  Scenario: CenterPopup should center the popup on screen
    Given DOM with button and popup for centering
    And mocked jQuery position methods on popupView
    When centerPopup is called on the instance
    Then no error is thrown

  # --------------------------------------------------------------------------
  # Integration Tests
  # --------------------------------------------------------------------------

  Scenario: Should integrate with app correctly
    Then it stores the app reference
    And app utils is defined

  Scenario: Should integrate with form correctly
    Then the form is an instance of PopupForm
    And the form parent is the popupView
    And the form app is the same app

  # --------------------------------------------------------------------------
  # forceRedraw
  # --------------------------------------------------------------------------

  Scenario: forceRedraw removes g2tButton from DOM
    Given popup DOM with button and popup elements
    When handleForceRedraw is called on the popupView
    Then the popupView html add_to_trello is cleared

  Scenario: forceRedraw removes g2tPopup from DOM
    Given popup DOM with button and popup elements
    When handleForceRedraw is called on the popupView
    Then the popupView html add_to_trello is cleared

  Scenario: forceRedraw resets toolBar to null
    Given popup DOM with button and popup elements
    And the popupView has a toolbar reference
    When handleForceRedraw is called on the popupView
    Then the popupView toolBar is null

  Scenario: forceRedraw calls detect to restart
    Given popup DOM with button and popup elements
    When handleForceRedraw is called on the popupView
    Then the popupView toolBar is null

  # --------------------------------------------------------------------------
  # periodicChecks
  # --------------------------------------------------------------------------

  Scenario: periodicChecks calls validateButtonState
    Given a spy on validateButtonState
    When periodicChecks is called on the popupView
    Then validateButtonState was called

  Scenario: periodicChecks recreates button if missing from DOM
    Given popup DOM with no button
    And the popupView gmailView preDetect returns true with toolbar
    When periodicChecks is called on the popupView
    Then finalCreatePopup was invoked

  Scenario: periodicChecks does NOT recreate if button exists
    Given popup DOM with existing button in toolbar
    And the popupView gmailView preDetect returns false
    When periodicChecks is called on the popupView
    Then finalCreatePopup was not invoked

  Scenario: handleGmailViewChanged calls validateButtonState
    Given a spy on validateButtonState
    When handleGmailViewChanged is called on the popupView
    Then validateButtonState was called

  Scenario: handleGmailLoaded triggers button creation when toolbar is detected
    Given popup DOM with no button
    And the popupView gmailView preDetect returns true with toolbar
    When handleGmailLoaded is called on the popupView
    Then finalCreatePopup was invoked

  # --------------------------------------------------------------------------
  # dropdown change handlers
  # --------------------------------------------------------------------------

  Scenario: board change writes to app.persist.boardId
    Given popup DOM with full form selects
    And popupView handlePopupLoaded is called
    When the board select is changed to "board-xyz"
    Then persist boardId equals "board-xyz"

  Scenario: board change emits boardChanged event
    Given popup DOM with full form selects
    And popupView handlePopupLoaded is called
    When the board select is changed to "board-xyz"
    Then events.emit was called with "boardChanged"

  Scenario: list change writes to app.persist.listId
    Given popup DOM with full form selects
    And popupView handlePopupLoaded is called
    When the list select is changed to "list-abc"
    Then persist listId equals "list-abc"

  Scenario: list change emits listChanged event
    Given popup DOM with full form selects
    And popupView handlePopupLoaded is called
    When the list select is changed to "list-abc"
    Then events.emit was called with "listChanged"

  Scenario: card change writes app.persist.cardId and app.temp cardPos Members Labels
    Given popup DOM with full form selects
    And popupView handlePopupLoaded is called
    And the card select has an option with pos members labels
    When the card select is changed
    Then app.persist.cardId is set from the card option
    And app.temp.cardPos is set from the card option

  # --------------------------------------------------------------------------
  # showPopup hidePopup
  # --------------------------------------------------------------------------

  Scenario: showPopup emits onPopupVisible
    Given popup DOM for show hide tests
    When showPopup is called on the popupView
    Then events.emit was called with "onPopupVisible"

  Scenario: hidePopup hides popup element
    Given popup DOM for show hide tests
    And the popup is currently visible
    When hidePopup is called on the popupView
    Then the popup element is hidden

  # --------------------------------------------------------------------------
  # popup creation
  # --------------------------------------------------------------------------

  Scenario: finalCreatePopup creates button and popup in toolbar
    Given popup DOM with toolbar only
    And the popupView has html popup content
    When finalCreatePopup is called on the popupView instance
    Then the toolbar contains a g2tButton element

  Scenario: finalCreatePopup emits popupLoaded
    Given popup DOM with toolbar only
    And the popupView has html popup content
    When finalCreatePopup is called on the popupView instance
    Then events.emit was called with "popupLoaded"

  # --------------------------------------------------------------------------
  # popup creation dedup for race condition fix
  # --------------------------------------------------------------------------

  Scenario: second finalCreatePopup call does not create duplicate button
    Given popup DOM with toolbar only
    And the popupView has html popup content
    When finalCreatePopup is called on the popupView instance
    And finalCreatePopup is called on the popupView instance again
    Then the toolbar contains exactly 1 g2tButton element

  Scenario: forceRedraw resets creation flag allowing new creation
    Given popup DOM with toolbar only
    And the popupView has html popup content
    When finalCreatePopup is called on the popupView instance
    And handleForceRedraw is called then toolbar is re-set
    And finalCreatePopup is called on the popupView instance again
    Then the toolbar contains a g2tButton element
