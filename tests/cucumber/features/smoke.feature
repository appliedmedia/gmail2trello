Feature: Smoke Test
  Verify Cucumber infrastructure works

  Scenario: Create an EventTarget instance
    Given a fresh EventTarget
    Then it stores the app reference
    And ck.id is "g2t_eventtarget"

  Scenario: Create a Utils instance
    Given a fresh Utils
    Then it stores the app reference

  Scenario: Create an App instance
    Given a fresh App
    Then ck.id is "g2t_app"
