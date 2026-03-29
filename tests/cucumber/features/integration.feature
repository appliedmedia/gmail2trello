Feature: Integration tests -- real G2T classes wired together
  All G2T classes are real. Only external boundaries are mocked:
  Chrome APIs, Trello REST, MutationObserver.

  Background:
    Given all G2T classes are loaded and a real App is created

  # -------------------------------------------------------------------
  # App Initialization
  # -------------------------------------------------------------------

  Scenario: App constructor wires all subsystems
    Then the app has real subsystems: events, model, gmailView, popupView, utils, obs, goog
    And all subsystems reference the same app instance
    And EventTarget has listeners registered by Model, GmailView, PopupView, and PopupForm

  Scenario: Persist load hydrates app state from Chrome storage
    Given Chrome storage returns saved state with boardId "board-abc" and user fullName "Alice"
    When persistLoad is called on the real app
    Then classAppStateLoaded event fires on the real app
    And the real app persist.boardId is "board-abc"
    And the real app persist.user.fullName is "Alice"

  Scenario: Init calls all subsystem init methods
    When init is called on the real app
    Then model.initialized is true
    And popupView.form.isInitialized is true

  # -------------------------------------------------------------------
  # Trello Auth Chain
  # -------------------------------------------------------------------

  Scenario: Full auth flow from authorize to boards loaded
    Given Trello authorize is mocked to succeed
    And Trello REST returns user data for members/me
    And Trello REST returns boards data for members/me/boards
    When model.trelloLoad is called on the real app
    Then checkTrelloAuthorized_success event fires on the real app
    And trelloUserReady event fires on the real app
    And trelloUserAndBoardsReady event fires on the real app
    And the real app persist.user.fullName is "Test User"
    And the real app temp.boards has 2 items

  Scenario: Auth failure keeps trelloAuthorized false
    Given Trello authorize is mocked to fail
    When model.trelloLoad is called on the real app
    Then the real app persist.trelloAuthorized is false

  Scenario: Cached auth skips authorize call
    Given app.persist.trelloAuthorized is set to true
    And app.temp.boards is set to a non-empty array
    When model.load is called on the real app
    Then trelloUserAndBoardsReady event fires on the real app
    And Trello.authorize was not called

  # -------------------------------------------------------------------
  # Board-List-Card Cascade
  # -------------------------------------------------------------------

  Scenario: Board change loads lists, labels, and members in parallel
    Given the real app has auth complete
    And Trello REST is mocked for board b1 lists, labels, and members
    When boardChanged event is emitted with boardId "b1"
    Then loadTrelloLists_success event fires on the real app
    And loadTrelloLabels_success event fires on the real app
    And loadTrelloMembers_success event fires on the real app
    And the real app temp.lists has 3 items
    And the real app temp.labels has 2 items
    And the real app temp.members has 2 items

  Scenario: List change loads cards
    Given the real app has auth complete
    And Trello REST is mocked for list l1 cards
    When listChanged event is emitted with listId "l1"
    Then loadTrelloCards_success event fires on the real app
    And the real app temp.cards has 3 items

  Scenario: Full cascade from board to cards
    Given the real app has auth complete
    And Trello REST is mocked for full cascade on board b1
    When boardChanged event is emitted with boardId "b1"
    Then the real app temp.lists has 3 items
    And the real app temp.labels has 2 items
    And the real app temp.members has 2 items

  Scenario: Board change with invalid boardId does not call API
    Given the real app has auth complete
    When boardChanged event is emitted with boardId "_"
    Then Trello.rest was not called for lists

  # -------------------------------------------------------------------
  # Card Submission
  # -------------------------------------------------------------------

  Scenario: Submit creates card through real Model-Trel chain
    Given the real app has auth complete
    And Trello REST is mocked to return a card with id "c1" on POST cards
    When submittedFormShownComplete event fires with valid form data
    Then createCard_success event fires on the real app
    And the created card has cardId "c1"

  Scenario: Submit updates email-board-list-card mapping
    Given the real app has auth complete
    And Trello REST is mocked to return a card with id "c1" on POST cards
    When submittedFormShownComplete event fires with form data for emailId "email-123"
    Then app.persist.eblcmArray contains a mapping for email "email-123" with cardId "c1"

  Scenario: Submit with null data emits invalidFormData
    Given the real app has auth complete
    When submittedFormShownComplete event fires with null data
    Then invalidFormData event fires on the real app

  # -------------------------------------------------------------------
  # Gmail Data Parsing
  # -------------------------------------------------------------------

  Scenario: parseData extracts email data from DOM
    Given the DOM contains Gmail-structured HTML with subject and body
    When gmailView.parseData is called with fullName "Test User"
    Then the returned data has subject "Test Email Subject"
    And the returned data has bodyAsRaw containing "From:"
    And the returned data has an attachment array

  Scenario: Gmail data flows through events to form
    Given the real app has DOM ready and persist loaded
    And the DOM contains Gmail-structured HTML with subject and body
    And Trello REST returns user data for members/me
    And Trello REST returns boards data for members/me/boards
    When trelloUserAndBoardsReady event fires triggering gmailDataReady
    Then gmailDataReady event fires on the real app
    And popupForm.pendingGmailData is set or lastGmailData is set

  Scenario: parseData handles missing email gracefully
    Given the DOM has no Gmail email structure
    When gmailView.parseData is called with fullName "Test User"
    Then parseData returns undefined without crashing

  # -------------------------------------------------------------------
  # Navigation and Redraw
  # -------------------------------------------------------------------

  Scenario: Hashchange triggers forceRedraw
    Given the real app has a g2tButton in the DOM
    When a hashchange event fires with different hash sections
    Then the g2tButton is removed from the DOM

  Scenario: Observer toolbar mutation triggers toolbarChanged event
    Given the real app has observer watching toolbar
    And a toolbar mutation is prepared
    When toolbar mutations are triggered with debounce
    Then toolbarChanged event fires on the real app

  # -------------------------------------------------------------------
  # Hydration Gate
  # -------------------------------------------------------------------

  Scenario: Form hydrates only when all three conditions met
    Given the real app has popupForm initialized
    When gmailDataReady fires before persistReady on the real app
    Then popupForm has pendingGmailData but dataBound is false
    When persistReady fires on the real app popupForm
    Then popupForm.persistReady is true

  Scenario: Late DOM ready still hydrates pending data
    Given the real app has persist and gmail data ready but no DOM
    When popupLoaded fires making DOM ready
    Then popupForm.domReady is true
