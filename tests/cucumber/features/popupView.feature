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
    And property intervalId is "0"
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
