Feature: Model Class
  The Model class manages Trello data loading, card creation, and email mapping.

  Background:
    Given a Model with Trel parent

  # ------------------------------------------------------------------
  # Constructor and Initialization
  # ------------------------------------------------------------------

  Scenario: Should have correct app reference
    Then the Model stores the app reference

  Scenario: Should have correct parent reference
    Then the Model parent is a Trel instance

  Scenario: Should have correct trel property
    Then the Model trel is a Trel instance

  Scenario: Should have emailBoardListCardMap property
    Then the Model emailBoardListCardMap is an object

  Scenario: Static ck.id is g2t_model
    Then static ck.id of Model is "g2t_model"

  Scenario: Instance ck.id is g2t_model
    Then ck.id is "g2t_model"

  Scenario: Initializes with default state
    Then the Model has default state values

  Scenario: Init should initialize the model
    When init is called on the Model
    Then no error is thrown

  # ------------------------------------------------------------------
  # Trello Authorization
  # ------------------------------------------------------------------

  Scenario: checkTrelloAuthorized does not throw
    When checkTrelloAuthorized is called on the Model
    Then no error is thrown

  Scenario Outline: Authorization callback handles <name>
    Given Model trelloAuthorized is reset to false
    When <method> is called on the Model with authorization data "<authorized>"
    Then Model trelloAuthorized is <expected>

    Examples:
      | name                    | method                               | authorized | expected |
      | successful authorization| checkTrelloAuthorized_success         | true       | true     |
      | failed authorization    | checkTrelloAuthorized_failure         | false      | false    |
      | popup failure           | checkTrelloAuthorized_popup_failure   | false      | false    |

  Scenario: deauthorizeTrello sets authorized to false
    Given Model trelloAuthorized is set to true
    When deauthorizeTrello is called on the Model
    Then Model trelloAuthorized is false

  # ------------------------------------------------------------------
  # Trello User Loading
  # ------------------------------------------------------------------

  Scenario: loadTrelloUser does not throw
    When loadTrelloUser is called on the Model
    Then no error is thrown

  Scenario Outline: loadTrelloUser_success handles <name>
    When loadTrelloUser_success is called with "<id>" "<fullName>" "<username>"
    Then app.persist.user matches "<id>" "<fullName>" "<username>"

    Examples:
      | name             | id  | fullName      | username  |
      | valid user data  | 123 | Test User     | testuser  |
      | minimal user data| 456 | Minimal User  |           |
      | empty user data  |     |               |           |

  Scenario: loadTrelloUser_failure does not throw
    When loadTrelloUser_failure is called on the Model
    Then no error is thrown

  # ------------------------------------------------------------------
  # Trello Boards Loading
  # ------------------------------------------------------------------

  Scenario: loadTrelloBoards does not throw
    When loadTrelloBoards is called on the Model
    Then no error is thrown

  Scenario Outline: loadTrelloBoards_success handles <name>
    When loadTrelloBoards_success is called with <count> boards
    Then app.temp.boards has <count> items

    Examples:
      | name            | count |
      | single board    | 1     |
      | multiple boards | 3     |
      | empty boards    | 0     |

  Scenario: loadTrelloBoards_failure does not throw
    When loadTrelloBoards_failure is called on the Model
    Then no error is thrown

  # ------------------------------------------------------------------
  # Trello Lists Loading
  # ------------------------------------------------------------------

  Scenario: loadTrelloLists does not throw
    When loadTrelloLists is called on the Model with "test-board-id"
    Then no error is thrown

  Scenario Outline: loadTrelloLists_success handles <name>
    When loadTrelloLists_success is called with <count> lists
    Then app.temp.lists has <count> items

    Examples:
      | name           | count |
      | single list    | 1     |
      | multiple lists | 3     |
      | empty lists    | 0     |

  Scenario: loadTrelloLists_failure does not throw
    When loadTrelloLists_failure is called on the Model
    Then no error is thrown

  # ------------------------------------------------------------------
  # Trello Cards Loading
  # ------------------------------------------------------------------

  Scenario: loadTrelloCards does not throw
    When loadTrelloCards is called on the Model with "test-list-id"
    Then no error is thrown

  Scenario Outline: loadTrelloCards_success handles <name>
    When loadTrelloCards_success is called with <count> cards
    Then app.temp.cards has <count> items

    Examples:
      | name           | count |
      | single card    | 1     |
      | multiple cards | 3     |
      | empty cards    | 0     |

  Scenario: loadTrelloCards_failure does not throw
    When loadTrelloCards_failure is called on the Model
    Then no error is thrown

  # ------------------------------------------------------------------
  # Trello Members Loading
  # ------------------------------------------------------------------

  Scenario: loadTrelloMembers does not throw
    When loadTrelloMembers is called on the Model with "test-board-id"
    Then no error is thrown

  Scenario Outline: loadTrelloMembers_success handles <name>
    When loadTrelloMembers_success is called with <count> members
    Then app.temp.members has <count> items

    Examples:
      | name             | count |
      | single member    | 1     |
      | multiple members | 3     |
      | empty members    | 0     |

  Scenario: loadTrelloMembers_failure does not throw
    When loadTrelloMembers_failure is called on the Model
    Then no error is thrown

  # ------------------------------------------------------------------
  # Trello Labels Loading
  # ------------------------------------------------------------------

  Scenario: loadTrelloLabels does not throw
    When loadTrelloLabels is called on the Model with "test-board-id"
    Then no error is thrown

  Scenario Outline: loadTrelloLabels_success handles <name>
    When loadTrelloLabels_success is called with <count> labels
    Then app.temp.labels has <count> items

    Examples:
      | name             | count |
      | single label     | 1     |
      | multiple labels  | 3     |
      | empty labels     | 0     |

  Scenario: loadTrelloLabels_failure does not throw
    When loadTrelloLabels_failure is called on the Model
    Then no error is thrown

  Scenario: handleTrelloUserReady triggers boards loading
    When handleTrelloUserReady is called on the Model
    Then loadTrelloBoards was called on the Model

  # ------------------------------------------------------------------
  # Card Creation and Submission
  # ------------------------------------------------------------------

  Scenario Outline: Submit handles <name>
    Given Model trelloAuthorized is set to true
    When Model submit is called with "<dataType>"
    Then no error is thrown

    Examples:
      | name                 | dataType         |
      | basic card data      | basic            |
      | card with attachments| withAttachments  |
      | card with members    | withMembers      |
      | card with labels     | withLabels       |
      | empty card data      | empty            |
      | null card data       | null             |

  # ------------------------------------------------------------------
  # Email Board List Card Mapping
  # ------------------------------------------------------------------

  Scenario: emailBoardListCardMapLookup handles existing mapping
    Given an existing email mapping for "test@example.com"
    When emailBoardListCardMapLookup is called for "test@example.com"
    Then the lookup result has email "test@example.com"
    And the lookup result has boardId 123
    And the lookup result has listId 456
    And the lookup result has cardId 789

  Scenario: emailBoardListCardMapUpdate adds new mapping
    Given an empty eblcmArray
    When emailBoardListCardMapUpdate is called for "new@example.com"
    Then emailBoardListCardMapLookup for "new@example.com" returns the mapping

  Scenario: emailBoardListCardMapUpdate updates existing mapping
    Given an existing email mapping for "update@example.com" with old values
    When emailBoardListCardMapUpdate is called for "update@example.com" with new values
    Then only one entry exists for "update@example.com"
    And the mapping has boardId "new-board" and listId "new-list"

  # ------------------------------------------------------------------
  # Event Handling
  # ------------------------------------------------------------------

  Scenario Outline: Event handler <method> handles <name>
    When Model event handler <method> is called
    Then no error is thrown

    Examples:
      | name                | method                                 |
      | state loaded event  | handleClassModelStateLoaded            |
      | form submission     | handleSubmittedFormShownComplete        |
      | upload completion   | handleNewCardUploadsComplete           |
      | board change        | handleBoardChanged                     |
      | list change         | handleListChanged                      |

  Scenario: bindEvents does not throw
    When bindEvents is called on the Model
    Then no error is thrown

  # ------------------------------------------------------------------
  # Error Handling
  # ------------------------------------------------------------------

  Scenario: Submit emits APIFail when not authorized
    Given Model trelloAuthorized is reset to false
    When Model submit is called with "basic"
    Then the Model emitted "APIFail"

  Scenario: Submit emits invalidFormData when missing boardId
    Given Model trelloAuthorized is set to true
    When Model submit is called with missing boardId
    Then the Model emitted "invalidFormData"

  Scenario: Submit emits invalidFormData when missing listId
    Given Model trelloAuthorized is set to true
    When Model submit is called with missing listId
    Then the Model emitted "invalidFormData"

  Scenario: Submit emits invalidFormData when data is null
    Given Model trelloAuthorized is set to true
    When Model submit is called with "null"
    Then the Model emitted "invalidFormData"

  # ------------------------------------------------------------------
  # Uploader submit routing (unified chain)
  # ------------------------------------------------------------------

  Scenario: submit with position "to" and cardId posts comment via Uploader
    Given Model trelloAuthorized is set to true
    And a spy on trel wrapApiCall
    When Model submit is called with position "to" and cardId "card-abc"
    Then trel wrapApiCall was called with "post" and path containing "actions/comments"

  Scenario: submit with position "to" but no cardId creates new card via Uploader
    Given Model trelloAuthorized is set to true
    And a spy on trel wrapApiCall
    When Model submit is called with position "to" and no cardId
    Then trel wrapApiCall was called with "post" and path "cards"

  Scenario: submit with position "below" creates new card via Uploader
    Given Model trelloAuthorized is set to true
    And a spy on trel wrapApiCall
    When Model submit is called with position "below" and cardId "card-abc"
    Then trel wrapApiCall was called with "post" and path "cards"

  Scenario: submit with no attachments emits newCardUploadsComplete after card creation
    Given Model trelloAuthorized is set to true
    And a spy on trel wrapApiCall that succeeds with cardId "new-card-1"
    When Model submit is called with position "below" and no attachments
    Then the Model emitted "newCardUploadsComplete"

  # ------------------------------------------------------------------
  # Performance Tests
  # ------------------------------------------------------------------

  Scenario Outline: Handles large <tag> dataset efficiently
    When loadTrello<tag>_success is called with <dataSize> items
    Then app.temp.<prop> has <dataSize> items
    And it completed within <maxMs>ms

    Examples:
      | tag     | prop    | dataSize | maxMs |
      | Cards   | cards   | 200      | 200   |
      | Boards  | boards  | 100      | 200   |
      | Lists   | lists   | 50       | 200   |
      | Members | members | 75       | 200   |
      | Labels  | labels  | 25       | 50    |

  Scenario: Handles many event handlers efficiently
    When bindEvents is called on the Model and timed
    Then it completed within 50ms

  # ------------------------------------------------------------------
  # Integration Tests
  # ------------------------------------------------------------------

  Scenario: Complete workflow from authorization to card creation
    When the full Model workflow is executed
    Then Model submit does not throw

  Scenario: Error recovery gracefully
    When Model loadTrelloBoards_failure then loadTrelloBoards_success is called
    Then app.temp.boards has 1 items

  # ------------------------------------------------------------------
  # Board Change Cascade
  # ------------------------------------------------------------------

  Scenario: boardChanged triggers loadTrelloLists
    Given Model trelloAuthorized is set to true
    And a spy on Model loadTrelloLists
    When handleBoardChanged is called with boardId "board-abc"
    Then the loadTrelloLists spy was called

  Scenario: boardChanged triggers loadTrelloLabels
    Given Model trelloAuthorized is set to true
    And a spy on Model loadTrelloLabels
    When handleBoardChanged is called with boardId "board-abc"
    Then the loadTrelloLabels spy was called

  Scenario: boardChanged triggers loadTrelloMembers
    Given Model trelloAuthorized is set to true
    And a spy on Model loadTrelloMembers
    When handleBoardChanged is called with boardId "board-abc"
    Then the loadTrelloMembers spy was called

  Scenario: all three API calls fire in parallel on boardChanged
    Given Model trelloAuthorized is set to true
    And spies on Model loadTrelloLists and loadTrelloLabels and loadTrelloMembers
    When handleBoardChanged is called with boardId "board-abc"
    Then all three cascade spies were called once each

  Scenario: listChanged triggers loadTrelloCards
    Given Model trelloAuthorized is set to true
    And a spy on Model loadTrelloCards
    When handleListChanged is called with listId "list-xyz"
    Then the loadTrelloCards spy was called with "list-xyz"

  Scenario: listChanged with same listId still triggers loadTrelloCards
    Given Model trelloAuthorized is set to true
    And a spy on Model loadTrelloCards
    When handleListChanged is called with listId "list-same"
    And handleListChanged is called with listId "list-same"
    Then the loadTrelloCards spy was called 2 times

  # ------------------------------------------------------------------
  # Board Load Cascade Tracking (Wave 2 Lane 3)
  # ------------------------------------------------------------------

  Scenario: handleBoardChanged sets tracking state
    When handleBoardChanged is called with boardId "board1"
    Then Model._boardLoadId is "board1"
    And Model._boardLoadPending has 3 items

  Scenario: _completeBoardLoadPart tracks individual completion
    Given handleBoardChanged was called with boardId "board1"
    When _completeBoardLoadPart is called with "lists" and "board1"
    Then Model._boardLoadPending has 2 items

  Scenario: boardDataReady fires when all 3 parts complete
    Given handleBoardChanged was called with boardId "board1"
    When _completeBoardLoadPart is called with "lists" and "board1"
    And _completeBoardLoadPart is called with "labels" and "board1"
    And _completeBoardLoadPart is called with "members" and "board1"
    Then events.emit was called with "boardDataReady"

  Scenario: boardDataReady does NOT fire when only 2 parts complete
    Given handleBoardChanged was called with boardId "board1"
    When _completeBoardLoadPart is called with "lists" and "board1"
    And _completeBoardLoadPart is called with "labels" and "board1"
    Then events.emit was not called with "boardDataReady"

  Scenario: Rapid board switch resets tracking
    Given handleBoardChanged was called with boardId "board1"
    When handleBoardChanged is called with boardId "board2"
    Then Model._boardLoadId is "board2"
    And Model._boardLoadPending has 3 items

  Scenario: Stale board completions are ignored after switch
    Given handleBoardChanged was called with boardId "board1"
    And handleBoardChanged was called with boardId "board2"
    When _completeBoardLoadPart is called with "lists" and "board1"
    Then Model._boardLoadPending has 3 items
    And events.emit was not called with "boardDataReady"
