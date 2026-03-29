Feature: EventTarget Class
  Custom event system for publish/subscribe communication

  Background:
    Given a fresh EventTarget

  # --------------------------------------------------------------------------
  # Constructor and Initialization
  # --------------------------------------------------------------------------

  Scenario: Creating with app dependency
    Then it stores the app reference
    And it is an instance of EventTarget

  Scenario: Initializing with empty listeners
    Then _listeners is an empty object

  Scenario: Creating with no arguments
    Given a fresh EventTarget with no args
    Then the no-args instance has undefined app

  Scenario: Static ck getter
    Then static ck.id of EventTarget is "g2t_eventtarget"

  Scenario: Instance ck getter
    Then ck.id is "g2t_eventtarget"

  # --------------------------------------------------------------------------
  # Event Listener Management
  # --------------------------------------------------------------------------

  Scenario: Adding a listener for a new event type
    Given a listener is added for "testEvent"
    Then _listeners for "testEvent" has 1 listener

  Scenario: Adding multiple listeners to same event
    Given 2 listeners are added for "testEvent"
    Then _listeners for "testEvent" has 2 listeners

  Scenario: Adding listeners to different event types
    Given a listener is added for "event1"
    And a listener is added for "event2"
    Then _listeners for "event1" has 1 listener
    And _listeners for "event2" has 1 listener

  Scenario: Removing a specific listener
    Given 2 listeners are added for "testEvent"
    When the first listener for "testEvent" is removed
    Then _listeners for "testEvent" has 1 listener

  Scenario: Removing a non-existent listener
    Given a listener is added for "testEvent"
    When a different listener is removed from "testEvent"
    Then _listeners for "testEvent" has 1 listener

  Scenario: Removing listener for non-existent event type
    When removeListener is called for unknown event "nonExistentEvent"
    Then _listeners for "nonExistentEvent" is undefined

  Scenario: Removing all listeners from an event
    Given 2 listeners are added for "testEvent"
    When all listeners for "testEvent" are removed
    Then _listeners for "testEvent" has 0 listeners

  # --------------------------------------------------------------------------
  # Event Dispatching
  # --------------------------------------------------------------------------

  Scenario: Emitting calls all listeners with event object and data
    Given 2 listeners are added for "testEvent"
    When emit is called for "testEvent" with data "test"
    Then both listeners received the event with type "testEvent" and target is the instance
    And both listeners received the data "test"

  Scenario: Emitting event with no listeners does not throw
    When emit is called for "noListenersEvent" with empty data
    Then no error is thrown

  Scenario: Emit passes data to listener
    Given a listener is added for "testEvent"
    When emit is called for "testEvent" with complex data
    Then the listener received the complex data

  Scenario: Emitting multiple event types independently
    Given a listener is added for "event1"
    And a listener is added for "event2"
    When emit string is called for "event1" with data "event1"
    And emit string is called for "event2" with data "event2"
    Then the listener for "event1" was called 1 time
    And the listener for "event2" was called 1 time
    And the listener for "event1" received data "event1"
    And the listener for "event2" received data "event2"

  Scenario: Emitting event object with existing target
    Given a listener is added for "testEvent"
    When emit is called with an event object that has an existing target
    Then the listener received the original event object with existing target

  Scenario: Emitting event without type throws
    Then emitting an event without type throws an error about missing type

  # --------------------------------------------------------------------------
  # Integration Tests
  # --------------------------------------------------------------------------

  Scenario: Integrates with app dependency
    Then it stores the app reference
    And app.utils is defined on the instance

  Scenario: Complex add/emit/remove lifecycle
    Given a listener is added for "event1"
    And 2 listeners are added for "event2"
    When emit string is called for "event1" with data "event1"
    And emit string is called for "event2" with data "event2"
    Then the listener for "event1" was called 1 time
    And the listener for "event2" was called 1 time
    And the second listener for "event2" was called 1 time
    When the first listener for "event2" is removed
    And emit string is called for "event2" with data "event2_updated"
    Then the first listener for "event2" was called 1 time total
    And the second listener for "event2" was called 2 times total
    And the second listener for "event2" last received data "event2_updated"

  # --------------------------------------------------------------------------
  # Error Handling
  # --------------------------------------------------------------------------

  Scenario: Listener that throws stops subsequent listeners
    Given a throwing listener and a normal listener are added for "testEvent"
    Then emitting "testEvent" throws "Test error"
    And the normal listener was not called

  Scenario: Null and undefined listeners are handled gracefully
    Then addListener with null does not throw
    And addListener with undefined does not throw
