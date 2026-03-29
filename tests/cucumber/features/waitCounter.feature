Feature: WaitCounter Class
  Manages named interval-based counters with callbacks

  Background:
    Given setInterval is mocked to execute immediately
    And a fresh WaitCounter

  # --------------------------------------------------------------------------
  # Constructor and Initialization
  # --------------------------------------------------------------------------

  Scenario: Creating with app dependency
    Then it is an instance of WaitCounter
    And it stores the app reference
    And property items is an empty object

  Scenario: ck static and instance getters return correct value
    Then static ck.id of WaitCounter is "g2t_waitCounter"
    And ck.id is "g2t_waitCounter"

  # --------------------------------------------------------------------------
  # Start/Stop behavior
  # --------------------------------------------------------------------------

  Scenario: Start schedules interval and logs rounds until maxSteps
    Given start is called with name "test" interval 100 maxSteps 3 and a callback
    Then the wait item "test" exists
    And the wait item "test" has maxSteps 3
    And the callback was called
    And utils.log was called

  Scenario: Stop clears interval and sets busy=false if running
    Given start is called with name "job" interval 50 maxSteps 10 and a callback
    And the callback was called
    When stop is called for "job"
    Then the wait item "job" has busy false
    And the wait item "job" exists

  Scenario: Start is idempotent when already busy
    Given start is called with name "dup" interval 30 maxSteps 2 and a callback
    When start is called again with name "dup" interval 30 maxSteps 2 and same callback
    Then the wait item "dup" exists
    And the callback was called
    And the wait item "dup" has a handler
