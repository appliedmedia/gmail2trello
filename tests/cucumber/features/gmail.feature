Feature: Gmail Class
  Tests for the G2T.Gmail adapter class that bridges gmail.js events
  from the page context to the G2T event system.

  Background:
    Given a fresh Gmail adapter

  # --------------------------------------------------------------------------
  # Constructor and Initialization
  # --------------------------------------------------------------------------

  Scenario: Creates with app dependency
    Then it stores the app reference

  Scenario: ck.id is g2t_gmail
    Then ck.id is "g2t_gmail"

  Scenario: Static ck.id is correct
    Then static ck.id of Gmail is "g2t_gmail"

  Scenario: ready flag is initially false
    Then property ready is false

  # --------------------------------------------------------------------------
  # init
  # --------------------------------------------------------------------------

  Scenario: init adds document event listener for g2t_gmail_event
    When init is called on the gmail adapter
    Then a g2t_gmail_event listener is registered on document

  # --------------------------------------------------------------------------
  # handleGmailEvent -- ready
  # --------------------------------------------------------------------------

  Scenario: handleGmailEvent with type ready emits gmailReady with userEmail
    When a g2t_gmail_event is dispatched with type "ready" and userEmail "user@gmail.com"
    Then app.events.emit was called with event "gmailReady"
    And the gmailReady event has userEmail "user@gmail.com"

  Scenario: ready flag is set after ready event
    When a g2t_gmail_event is dispatched with type "ready" and userEmail "user@gmail.com"
    Then property ready is true

  Scenario: ready event stores userEmail in app.model
    When a g2t_gmail_event is dispatched with type "ready" and userEmail "user@gmail.com"
    Then app.model.userEmail is "user@gmail.com"

  # --------------------------------------------------------------------------
  # handleGmailEvent -- load
  # --------------------------------------------------------------------------

  Scenario: handleGmailEvent with type load emits gmailLoaded
    When a g2t_gmail_event is dispatched with type "load"
    Then app.events.emit was called with event "gmailLoaded"

  # --------------------------------------------------------------------------
  # handleGmailEvent -- view_email
  # --------------------------------------------------------------------------

  Scenario: handleGmailEvent with type view_email emits gmailViewChanged with page and subject
    When a g2t_gmail_event is dispatched with type "view_email" and page "inbox" and subject "Hello World"
    Then app.events.emit was called with event "gmailViewChanged"
    And the gmailViewChanged event has type "email"
    And the gmailViewChanged event has page "inbox"
    And the gmailViewChanged event has subject "Hello World"

  # --------------------------------------------------------------------------
  # handleGmailEvent -- open_email
  # --------------------------------------------------------------------------

  Scenario: handleGmailEvent with type open_email emits gmailViewChanged with type thread
    When a g2t_gmail_event is dispatched with type "open_email"
    Then app.events.emit was called with event "gmailViewChanged"
    And the gmailViewChanged event has type "thread"

  # --------------------------------------------------------------------------
  # handleGmailEvent -- unknown
  # --------------------------------------------------------------------------

  Scenario: Unknown event type is ignored gracefully
    When a g2t_gmail_event is dispatched with type "unknown_type"
    Then app.events.emit has not been called for gmail events
    And no error is thrown

  # --------------------------------------------------------------------------
  # handleGmailEvent -- guard
  # --------------------------------------------------------------------------

  Scenario: handleGmailEvent with null detail does not crash
    When handleGmailEvent is called with null detail
    Then no error is thrown
    And app.events.emit has not been called for gmail events

  Scenario: handleGmailEvent with missing type does not crash
    When handleGmailEvent is called with empty detail
    Then no error is thrown
    And app.events.emit has not been called for gmail events
