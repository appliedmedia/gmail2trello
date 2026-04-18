Feature: App Class
  The App class creates and wires all subsystems for Gmail-2-Trello.

  # ------------------------------------------------------------------
  # Constructor and Initialization
  # ------------------------------------------------------------------

  Scenario: Creating App instance with all dependencies
    Given a real App instance
    Then the App has Trello API key "21b411b1b5b549c54bd32f0e90738b41"
    And the App has all subsystems wired

  Scenario: Initializing with default persistent state
    Given a real App instance
    Then persist matches expected defaults

  Scenario: Initializing with default temporary state
    Given a real App instance
    Then temp matches expected defaults

  Scenario: Initialized flag is false initially
    Given a real App instance
    Then the App initialized flag is false

  Scenario: Static ck getter returns correct value
    Then static ck.id of App is "g2t_app"

  Scenario: Instance ck getter returns correct value
    Given a real App instance
    Then ck.id is "g2t_app"

  # ------------------------------------------------------------------
  # Persistence Operations
  # ------------------------------------------------------------------

  Scenario: persistLoad loads data from chrome storage
    Given a real App instance
    When persistLoad is called on the App
    Then no error is thrown

  Scenario: persistSave saves data to chrome storage
    Given a real App instance
    When persistSave is called on the App
    Then no error is thrown

  # ------------------------------------------------------------------
  # Data Updates
  # ------------------------------------------------------------------

  Scenario: updateData coordinates data flow
    Given a real App instance
    When updateData is called on the App
    Then gmailView.parsingData is false on the App

  Scenario: updateData with model null throws
    Given a real App instance
    And the App model is set to null
    Then calling updateData on the App throws

  Scenario: updateData with model.trello null does not throw
    Given a real App instance
    And the App model.trello is set to null
    When updateData is called on the App
    Then no error is thrown

  # ------------------------------------------------------------------
  # Event Handling
  # ------------------------------------------------------------------

  Scenario: handleClassAppStateLoaded merges params into persist
    Given a real App instance
    When handleClassAppStateLoaded is called with state values
    Then the App persist has trelloAuthorized true
    And the App persist has boardId "test-board"
    And the App persist has listId "test-list"

  Scenario: handleClassAppStateLoaded with null params preserves state
    Given a real App instance
    When handleClassAppStateLoaded is called with null params
    Then the App persist is unchanged

  Scenario: handleClassAppStateLoaded with null event does not throw
    Given a real App instance
    When handleClassAppStateLoaded is called with null event
    Then no error is thrown

  Scenario: handleClassAppStateLoaded with event missing type does not throw
    Given a real App instance
    When handleClassAppStateLoaded is called with event missing type
    Then no error is thrown

  Scenario: bindEvents does not throw
    Given a real App instance
    When bindEvents is called on the App
    Then no error is thrown

  # ------------------------------------------------------------------
  # Initialization
  # ------------------------------------------------------------------

  Scenario: init executes without throwing
    Given a real App instance
    When init is called on the App
    Then the App initialized flag is false
    And the App has all subsystems present

  # ------------------------------------------------------------------
  # State Management
  # ------------------------------------------------------------------

  Scenario: Maintains persistent state across operations
    Given a real App instance
    When the App persist is updated with trelloAuthorized, boardId, listId
    Then the App persist has trelloAuthorized true
    And the App persist has boardId "test-board"
    And the App persist has listId "test-list"

  Scenario: Maintains temporary state across operations
    Given a real App instance
    When the App temp is updated with description, title, and attachments
    Then the App temp has the expected values

  Scenario: Handles state updates correctly via Object.assign
    Given a real App instance
    When Object.assign merges new state into App persist
    Then the App persist has trelloAuthorized true
    And the App persist has boardId "new-board"
    And the App persist has listId "new-list"

  # ------------------------------------------------------------------
  # Error Handling
  # ------------------------------------------------------------------

  Scenario: Throws when dependencies are null
    Given a real App instance
    And the App model is set to null
    And the App popupView is set to null
    Then calling updateData on the App throws

  Scenario: Handles initialization errors gracefully
    Given a real App instance
    And the App goog.init is set to throw
    When init is called on the App
    Then no error is thrown

  Scenario: persistLoad executes without throwing from error section
    Given a real App instance
    When persistLoad is called on the App
    Then no error is thrown

  # ------------------------------------------------------------------
  # Performance Tests
  # ------------------------------------------------------------------

  Scenario: Initializes efficiently
    Given a real App instance
    When init is called on the App and timed
    Then the App operation completes within 100ms

  Scenario: Handles large state updates efficiently
    Given a real App instance
    When a large state update is applied to the App
    Then the App persist has 100 trelloBoards
    And the App operation completes within 100ms

  # ------------------------------------------------------------------
  # Configuration
  # ------------------------------------------------------------------

  Scenario: Has correct Trello API key
    Given a real App instance
    Then the App has Trello API key "21b411b1b5b549c54bd32f0e90738b41"

  # ------------------------------------------------------------------
  # Memory Management
  # ------------------------------------------------------------------

  Scenario: Allows log memory to exceed limits
    Given a real App instance
    When 150 log entries are pushed to the App
    Then the App has 150 log entries

  Scenario: Handles memory cleanup
    Given a real App instance
    And the App has 200 log entries pre-loaded
    When log cleanup trims to max
    Then the App log memory length is at most max

  # ------------------------------------------------------------------
  # Gmail Adapter
  # ------------------------------------------------------------------

  Scenario: App creates gmail adapter subsystem
    Given a real App instance
    Then the App has gmail adapter wired

  Scenario: App init calls gmail.init
    Given a real App instance
    When init is called on the App
    Then the App gmail adapter is initialized
