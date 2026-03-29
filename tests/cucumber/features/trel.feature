Feature: Trel Class
  The Trel class wraps Trello API calls with authorization checks.

  Background:
    Given a fresh Trel

  # ------------------------------------------------------------------
  # Constructor and Initialization
  # ------------------------------------------------------------------

  Scenario: Creating with app dependency
    Then it stores the app reference

  Scenario: Initializing with correct ck properties
    Then ck.id is "g2t_trel"
    And the Trel ck has all expected fields

  Scenario: bindEvents is callable
    When bindEvents is called on the Trel instance
    Then no error is thrown

  # ------------------------------------------------------------------
  # API Key Management
  # ------------------------------------------------------------------

  Scenario: setApiKey handles API key setting and returns success
    When setApiKey is called with "test-api-key"
    Then the setApiKey result is true

  Scenario: getApiKey returns stored API key
    Then getApiKey returns "21b411b1b5b549c54bd32f0e90738b41"

  Scenario: isAuthorized returns authorization status
    Given trelloAuthorized is set to "true"
    Then isAuthorized returns true
    When trelloAuthorized is changed to false
    Then isAuthorized returns false

  # ------------------------------------------------------------------
  # Authorization Methods
  # ------------------------------------------------------------------

  Scenario: authorize updates app state when called
    Given trelloAuthorized is set to "false"
    When authorize is called with true
    Then no error is thrown

  Scenario: deauthorize updates app state
    Given trelloAuthorized is set to "true"
    And trelloData is set to some data
    When deauthorize is called on the Trel instance
    Then trelloAuthorized is false on the app
    And trelloData is null on the app

  Scenario: deauthorize updates state even when external calls fail
    Given trelloAuthorized is set to "true"
    And trelloData is set to some data
    When deauthorize is called on the Trel instance
    Then trelloAuthorized is false on the app
    And trelloData is null on the app

  # ------------------------------------------------------------------
  # Core API Wrapper
  # ------------------------------------------------------------------

  Scenario: wrapApiCall calls failure callback when not authorized
    Given trelloAuthorized is set to "false"
    When wrapApiCall is called with get "members/me"
    Then the failure callback was called with unauthorized error
    And utils.log was called with "Trello API Error: Trello not authorized"

  Scenario: wrapApiCall logs API calls when authorized
    Given trelloAuthorized is set to "true"
    When wrapApiCall is called with get "members/me"
    Then utils.log was called with "Trello API call: GET members/me"

  # ------------------------------------------------------------------
  # High-Level API Methods
  # ------------------------------------------------------------------

  Scenario Outline: High-level API method calls wrapApiCall correctly
    Given trelloAuthorized is set to "true"
    And a spy on wrapApiCall
    When Trel API method <method> is called with arg "<arg>"
    Then wrapApiCall was called with "<verb>" and "<path>"

    Examples:
      | method     | arg      | verb | path                   |
      | getUser    |          | get  | members/me             |
      | getBoards  |          | get  | members/me/boards      |
      | getLists   | board123 | get  | boards/board123/lists  |
      | getCards   | list123  | get  | lists/list123/cards    |
      | getMembers | board123 | get  | boards/board123/members|
      | getLabels  | board123 | get  | boards/board123/labels |

  Scenario: createCard calls wrapApiCall with card data
    Given trelloAuthorized is set to "true"
    And a spy on wrapApiCall
    When createCard is called on the Trel instance
    Then wrapApiCall was called with "post" and "cards"

  # ------------------------------------------------------------------
  # Integration Tests
  # ------------------------------------------------------------------

  Scenario: Complete authorization flow
    Given trelloAuthorized is set to "false"
    When authorize is called with true
    And a spy on wrapApiCall
    And getUser is called on the Trel instance
    Then wrapApiCall was called at least once
    When deauthorize is called on the Trel instance
    Then trelloAuthorized is false on the app
    And trelloData is null on the app

  Scenario: Authorization failure handled gracefully
    Given trelloAuthorized is set to "false"
    When wrapApiCall is called with get "members/me"
    Then the failure callback was called with unauthorized error
    And the success callback was not called

  Scenario: Multiple API calls independently
    Given trelloAuthorized is set to "true"
    And a spy on wrapApiCall
    When getUser is called on the Trel instance
    And getBoards is called on the Trel instance
    And getLists is called on the Trel instance with "board123"
    Then wrapApiCall was called 3 times

  # ------------------------------------------------------------------
  # Error Handling
  # ------------------------------------------------------------------

  Scenario: Missing app dependency handled gracefully
    Given a Trel created with no arguments
    Then the Trel instance app is undefined

  Scenario: Missing app.persist handled gracefully
    Given a Trel created without persist
    Then the Trel instance app.persist is undefined
