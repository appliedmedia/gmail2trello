Feature: MenuControl Class
  Manages menu items with click handlers and active-state toggling

  Background:
    Given a fresh MenuControl

  # --------------------------------------------------------------------------
  # Constructor and Initialization
  # --------------------------------------------------------------------------

  Scenario: Creating with app dependency
    Then it is an instance of MenuControl
    And it stores the app reference

  Scenario: Creating with no arguments
    Given a MenuControl constructed with empty object
    Then the no-args MenuControl is an instance of MenuControl
    And the no-args MenuControl has undefined app

  Scenario: ck static getter returns correct value
    Then static ck.id of MenuControl is "g2t_menuControl"

  Scenario: ck instance getter returns correct value
    Then ck.id is "g2t_menuControl"

  # --------------------------------------------------------------------------
  # Menu Reset
  # --------------------------------------------------------------------------

  Scenario: Reset initializes menu with selectors
    Given 2 menu items in the DOM
    And selectors are set on the menu control
    Then DOM has 2 menu items
    When reset is called with selectors ".menu-item"
    Then items is defined on the menu control

  Scenario: Reset handles empty selector
    Given selectors property is set to empty string
    When reset is called with selectors ""
    Then no error occurs

  Scenario: Reset handles null selector
    Given selectors property is set to null
    When reset is called with selectors null
    Then no error occurs

  Scenario: Reset handles undefined selector
    Given selectors property is set to undefined
    When reset is called with selectors undefined
    Then no error occurs

  # --------------------------------------------------------------------------
  # Menu Item Management
  # --------------------------------------------------------------------------

  Scenario: Handles menu items with click handlers
    Given 1 menu item in the DOM
    And selectors are set on the menu control
    Then DOM has 1 menu items
    When reset is called with selectors ".menu-item"
    Then items is defined on the menu control
    And items has a click function

  Scenario: Handles multiple menu items
    Given 3 menu items in the DOM
    And selectors are set on the menu control
    Then DOM has 3 menu items
    When reset is called with selectors ".menu-item"
    Then items is defined on the menu control

  # --------------------------------------------------------------------------
  # Integration Tests
  # --------------------------------------------------------------------------

  Scenario: Integrates with app correctly
    Then it stores the app reference
    And app.events is defined on the menu control
    And app.utils is defined on the menu control

  # --------------------------------------------------------------------------
  # Error Handling
  # --------------------------------------------------------------------------

  Scenario: Handles invalid selectors gracefully
    Then reset with number selector does not throw
    And reset with object selector does not throw
    And reset with array selector does not throw
