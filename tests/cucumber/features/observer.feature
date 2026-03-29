Feature: Observer Class
  Tests for the G2T.Observer class that manages MutationObservers
  for Gmail DOM changes, including debouncing and disconnect guards.

  Background:
    Given a mock MutationObserver is installed
    And a fresh Observer

  # --------------------------------------------------------------------------
  # Constructor and Initialization
  # --------------------------------------------------------------------------

  Scenario: Creates with app dependency
    Then it stores the app reference

  Scenario: Initializes with null observers and false connected flags
    Then observers.toolbar is null
    And observers.content is null
    And connected.toolbar is false
    And connected.content is false

  Scenario: init() sets up without error
    When init() is called on the observer
    Then no error is thrown

  # --------------------------------------------------------------------------
  # observeToolbar
  # --------------------------------------------------------------------------

  Scenario: observeToolbar creates MutationObserver
    Given the DOM has a toolbar scope element
    When observeToolbar is called
    Then a new MutationObserver instance is created
    And observers.toolbar is not null

  Scenario: observeToolbar sets connected.toolbar to true
    Given the DOM has a toolbar scope element
    When observeToolbar is called
    Then connected.toolbar is true

  Scenario: observeToolbar observes the correct target element
    Given the DOM has a toolbar scope element
    When observeToolbar is called
    Then the observer targets the scope element
    And the observer config has childList true and subtree true and attributes false

  Scenario: observeToolbar does not create duplicate observer
    Given the DOM has a toolbar scope element
    And observeToolbar has already been called
    When observeToolbar is called
    Then only one MutationObserver instance exists

  # --------------------------------------------------------------------------
  # Debouncing
  # --------------------------------------------------------------------------

  Scenario: Toolbar debounce waits 250ms before emitting
    Given the DOM has a toolbar scope element
    And fake timers are enabled
    And observeToolbar has been called
    When a toolbar mutation is triggered with type "added"
    Then app.events.emit has not been called
    When 249ms pass on fake timers
    Then app.events.emit has not been called
    When 1ms passes on fake timers
    Then app.events.emit was called 1 time
    And app.events.emit was called with event "toolbarChanged"

  Scenario: Content debounce waits 500ms before emitting
    Given the DOM has a content area element
    And fake timers are enabled
    And observeContent has been called
    When a generic content mutation is triggered
    Then app.events.emit has not been called
    When 499ms pass on fake timers
    Then app.events.emit has not been called
    When 1ms passes on fake timers
    Then app.events.emit was called 1 time
    And app.events.emit was called with event "contentChanged"

  Scenario: Rapid mutations coalesce to single emit
    Given the DOM has a toolbar scope element
    And fake timers are enabled
    And observeToolbar has been called
    When a toolbar mutation is triggered with type "added"
    And 50ms pass on fake timers
    And a toolbar mutation is triggered with type "removed"
    And 50ms pass on fake timers
    And a toolbar mutation is triggered with type "added"
    And 250ms pass on fake timers
    Then app.events.emit was called 1 time
    And app.events.emit was called with event "toolbarChanged"

  Scenario: New mutation resets debounce timer
    Given the DOM has a toolbar scope element
    And fake timers are enabled
    And observeToolbar has been called
    When a toolbar mutation is triggered with type "added"
    And 200ms pass on fake timers
    Then app.events.emit has not been called
    When a toolbar mutation is triggered with type "added"
    And 200ms pass on fake timers
    Then app.events.emit has not been called
    When 50ms pass on fake timers
    Then app.events.emit was called 1 time

  # --------------------------------------------------------------------------
  # Disconnect
  # --------------------------------------------------------------------------

  Scenario: disconnect sets connected flag to false
    Given the DOM has a toolbar scope element
    And observeToolbar has been called
    When disconnect is called with "toolbar"
    Then connected.toolbar is false
    And observers.toolbar is null

  Scenario: disconnect clears debounce timer
    Given the DOM has a toolbar scope element
    And fake timers are enabled
    And observeToolbar has been called
    And a toolbar mutation has been triggered
    When disconnect is called with "toolbar"
    Then the debounce timer for toolbar is null
    When 500ms pass on fake timers
    Then app.events.emit has not been called

  Scenario: disconnectAll disconnects both observers
    Given the DOM has a toolbar scope element
    And the DOM has a content area element
    And observeToolbar has been called
    And observeContent has been called
    When disconnectAll is called
    Then connected.toolbar is false
    And connected.content is false
    And observers.toolbar is null
    And observers.content is null

  Scenario: Callback after disconnect does not emit
    Given the DOM has a toolbar scope element
    And fake timers are enabled
    And observeToolbar has been called
    And disconnect has been called with "toolbar"
    When handleToolbarMutations is called directly with type "added"
    And 500ms pass on fake timers
    Then app.events.emit has not been called

  # --------------------------------------------------------------------------
  # Guard Patterns
  # --------------------------------------------------------------------------

  Scenario: Callback with null app does not crash
    Given connected.toolbar is set to true on the observer
    And the observer app is set to null
    When handleToolbarMutations is called directly with type "added"
    Then no error is thrown

  Scenario: Callback when not connected returns early
    Given fake timers are enabled
    And connected.toolbar is set to false on the observer
    When handleToolbarMutations is called directly with type "added"
    And 500ms pass on fake timers
    Then app.events.emit has not been called

  Scenario: Callback with missing app.events does not crash
    Given connected.toolbar is set to true on the observer
    And the observer app.events is set to null
    When handleToolbarMutations is called directly with type "added"
    Then no error is thrown
