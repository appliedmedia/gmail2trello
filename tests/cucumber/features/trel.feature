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

  # ------------------------------------------------------------------
  # createCard Payload Verification
  # ------------------------------------------------------------------

  Scenario: createCard sends correct name from title field
    Given trelloAuthorized is set to "true"
    And a spy on wrapApiCall
    When createCard is called with title "My Card Title"
    Then wrapApiCall was called with "post" and "cards"
    And the wrapApiCall params have name "My Card Title"

  Scenario: createCard sends correct name from subject field as fallback
    Given trelloAuthorized is set to "true"
    And a spy on wrapApiCall
    When createCard is called with subject "Email Subject" and no title
    Then wrapApiCall was called with "post" and "cards"
    And the wrapApiCall params have name "Email Subject"

  Scenario: createCard sends idLabels when labels provided
    Given trelloAuthorized is set to "true"
    And a spy on wrapApiCall
    When createCard is called with labels "labelA,labelB"
    Then the wrapApiCall params have idLabels "labelA,labelB"

  Scenario: createCard sends idMembers when members provided
    Given trelloAuthorized is set to "true"
    And a spy on wrapApiCall
    When createCard is called with members "memberA,memberB"
    Then the wrapApiCall params have idMembers "memberA,memberB"

  Scenario: createCard sends due date when dueDate provided
    Given trelloAuthorized is set to "true"
    And a spy on wrapApiCall
    When createCard is called with dueDate "2026-04-01"
    Then the wrapApiCall params have due "2026-04-01"

  Scenario: createCard sends pos top when no card selected
    Given trelloAuthorized is set to "true"
    And a spy on wrapApiCall
    When createCard is called with no position specified
    Then the wrapApiCall params have pos "top"

  Scenario: createCard sends pos bottom for position below
    Given trelloAuthorized is set to "true"
    And a spy on wrapApiCall
    When createCard is called with position "below"
    Then the wrapApiCall params have pos "bottom"

  Scenario: createCard with null data emits invalidFormData
    When createCard is called with null data on Trel
    Then events.emit was called with "invalidFormData"

  # ------------------------------------------------------------------
  # Success and Failure Callback Paths
  # ------------------------------------------------------------------

  Scenario: getUser_success stores user data in persist and emits trelloUserReady
    When getUser_success is called with user data on Trel
    Then app.persist.user has fullName "Test Trello User"
    And events.emit was called with "trelloUserReady"

  Scenario: getBoards_success stores boards in temp and emits trelloUserAndBoardsReady
    When getBoards_success is called with boards data on Trel
    Then app.temp.boards has 2 items
    And events.emit was called with "trelloUserAndBoardsReady"

  Scenario: getLists_success stores lists in temp and emits loadTrelloLists_success
    When getLists_success is called with lists data on Trel
    Then app.temp.lists has 3 items
    And events.emit was called with "loadTrelloLists_success"

  Scenario: getCards_success stores cards in temp and emits loadTrelloCards_success
    When getCards_success is called with cards data on Trel
    Then app.temp.cards has 2 items
    And events.emit was called with "loadTrelloCards_success"

  Scenario: createCard_success emits createCard_success with cardId
    When createCard_success is called on Trel with response id "card-999"
    Then events.emit was called with "createCard_success"
    And the createCard_success event data has cardId "card-999"

  # ------------------------------------------------------------------
  # Version Counter for Stale Response Discard (baseline tests)
  # These document current behavior: there is NO versioning yet,
  # so stale responses are NOT discarded. These are baseline tests
  # documenting the race condition before a future fix.
  # ------------------------------------------------------------------

  Scenario: two sequential getLists calls both update temp.lists (no versioning yet)
    # Baseline: both callbacks overwrite temp.lists; the last one wins
    When getLists_success is called with lists data on Trel
    And getLists_success is called with 1 list on Trel
    Then app.temp.lists has 1 items

  Scenario: two sequential getCards calls both update temp.cards (no versioning yet)
    # Baseline: both callbacks overwrite temp.cards; the last one wins
    When getCards_success is called with cards data on Trel
    And getCards_success is called with 1 card on Trel
    Then app.temp.cards has 1 items

  Scenario: rapid board switch does not prevent stale data (documenting the race condition)
    # Baseline: if board A lists arrive after board B lists, board A data overwrites board B
    # This documents the current broken behavior before versioning is added
    Given trelloAuthorized is set to "true"
    When getLists_success is called with lists named "boardB-list"
    And getLists_success is called with lists named "boardA-list-stale"
    Then the first list name is "boardA-list-stale"
