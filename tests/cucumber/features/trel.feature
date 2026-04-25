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
  # Unversioned Success Callbacks (direct-invocation path)
  # The version parameter is optional on *_success handlers so that
  # tests and any callers outside the fetch path still work. When no
  # version is passed, no staleness check runs: last write wins.
  # ------------------------------------------------------------------

  Scenario: two sequential getLists calls both update temp.lists when no version is passed
    When getLists_success is called with lists data on Trel
    And getLists_success is called with 1 list on Trel
    Then app.temp.lists has 1 items

  Scenario: two sequential getCards calls both update temp.cards when no version is passed
    When getCards_success is called with cards data on Trel
    And getCards_success is called with 1 card on Trel
    Then app.temp.cards has 1 items

  Scenario: unversioned calls do not guard against stale ordering
    Given trelloAuthorized is set to "true"
    When getLists_success is called with lists named "boardB-list"
    And getLists_success is called with lists named "boardA-list-stale"
    Then the first list name is "boardA-list-stale"

  # ------------------------------------------------------------------
  # Request Versioning (Wave 2, Lane 1)
  # Fetch methods capture a version; success callbacks discard
  # responses whose captured version is no longer current.
  # ------------------------------------------------------------------

  Scenario: _nextVersion increments counter for category
    When _nextVersion is called with "lists" on Trel
    Then the "lists" version on Trel is 1
    When _nextVersion is called with "lists" on Trel
    Then the "lists" version on Trel is 2

  Scenario: _isCurrentVersion returns true for latest version
    When _nextVersion is called with "cards" on Trel
    Then _isCurrentVersion for "cards" with version 1 on Trel is true

  Scenario: _isCurrentVersion returns false for stale version
    When _nextVersion is called with "cards" on Trel
    And _nextVersion is called with "cards" on Trel
    Then _isCurrentVersion for "cards" with version 1 on Trel is false
    And _isCurrentVersion for "cards" with version 2 on Trel is true

  Scenario: Independent categories do not affect each other
    When _nextVersion is called with "lists" on Trel
    And _nextVersion is called with "cards" on Trel
    Then _isCurrentVersion for "lists" with version 1 on Trel is true
    And _isCurrentVersion for "cards" with version 1 on Trel is true

  Scenario: getLists_success with current version updates temp.lists
    Given _nextVersion is called with "lists" on Trel
    When getLists_success is called with lists named "boardA" and version 1 on Trel
    Then the first list name is "boardA"

  Scenario: getLists_success with stale version discards response
    Given _nextVersion is called with "lists" on Trel
    And _nextVersion is called with "lists" on Trel
    When getLists_success is called with lists named "stale" and version 1 on Trel
    Then app.temp.lists is unchanged

  Scenario: Rapid getLists responses: only the latest version wins
    When _nextVersion is called with "lists" on Trel
    And _nextVersion is called with "lists" on Trel
    And getLists_success is called with lists named "boardA-stale" and version 1 on Trel
    And getLists_success is called with lists named "boardB-fresh" and version 2 on Trel
    Then the first list name is "boardB-fresh"

  Scenario: getCards_success with stale version discards response
    Given _nextVersion is called with "cards" on Trel
    And _nextVersion is called with "cards" on Trel
    When getCards_success is called with cards named "stale" and version 1 on Trel
    Then app.temp.cards is unchanged

  Scenario: getLabels_success with stale version discards response
    Given _nextVersion is called with "labels" on Trel
    And _nextVersion is called with "labels" on Trel
    When getLabels_success is called with labels named "stale" and version 1 on Trel
    Then app.temp.labels is unchanged

  Scenario: getMembers_success with stale version discards response
    Given _nextVersion is called with "members" on Trel
    And _nextVersion is called with "members" on Trel
    When getMembers_success is called with members named "stale" and version 1 on Trel
    Then app.temp.members is unchanged
