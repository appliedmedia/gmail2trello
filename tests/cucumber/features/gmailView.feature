Feature: GmailView Class
  The GmailView manages interaction with the Gmail DOM,
  detecting email content, parsing data, and handling events.

  Background:
    Given a fresh GmailView with initialized properties

  # --------------------------------------------------------------------------
  # Constructor and Initialization
  # --------------------------------------------------------------------------

  Scenario: LAYOUT_DEFAULT constant is 0
    Then property LAYOUT_DEFAULT is "0"

  Scenario: LAYOUT_SPLIT constant is 1
    Then property LAYOUT_SPLIT is "1"

  Scenario: $root is set to body element
    Then the $root is the body element

  Scenario: ParsingData initial value is false
    Then property parsingData is false

  Scenario: Runaway initial value is 0
    Then property runaway is "0"

  Scenario: Static ck.id is correct
    Then static ck.id of GmailView is "g2t_gmailview"

  Scenario: Static ck.uniqueUriVar is correct
    Then static ck.uniqueUriVar of GmailView is "g2t_filename"

  Scenario: Instance ck.id is correct
    Then ck.id is "g2t_gmailview"

  Scenario: Instance ck.uniqueUriVar is correct
    Then instance ck.uniqueUriVar is "g2t_filename"

  Scenario: Should create WaitCounter instance
    Then the waitCounter is an object with start and stop

  Scenario: Should have selectors object
    Then the selectors is an object

  # --------------------------------------------------------------------------
  # Utility Methods -- url_with_filename
  # --------------------------------------------------------------------------

  Scenario Outline: url_with_filename builds correct URL
    When url_with_filename is called with "<url>" and "<filename>"
    Then the gmailView result is "<expected>"

    Examples:
      | url                    | filename     | expected                                          |
      | https://example.com    | test.txt     | https://example.com?g2t_filename=/test.txt        |
      | https://site.com/path  | document.pdf | https://site.com/path?g2t_filename=/document.pdf  |
      | https://example.com    |              | https://example.com?g2t_filename=/                |

  # --------------------------------------------------------------------------
  # Utility Methods -- displayNameAndEmail
  # --------------------------------------------------------------------------

  Scenario Outline: displayNameAndEmail formats name and email
    When displayNameAndEmail is called with "<name>" and "<email>"
    Then the gmailView result is "<expected>"

    Examples:
      | name     | email            | expected                    |
      | John Doe | john@example.com | John Doe <john@example.com> |
      | John Doe |                  | John Doe                    |
      |          | john@example.com | <john@example.com>          |
      |          |                  |                             |

  # --------------------------------------------------------------------------
  # Email Processing Methods -- email_raw_md
  # --------------------------------------------------------------------------

  Scenario Outline: email_raw_md returns raw and markdown formats
    When email_raw_md is called with "<name>" and "<email>"
    Then the raw result is "<expectedRaw>"
    And the md result is "<expectedMd>"

    Examples:
      | name             | email            | expectedRaw                   | expectedMd                         |
      |                  |                  |                               |                                    |
      | John Doe         | john@example.com | John Doe <john@example.com>   | [John Doe](<john@example.com>)     |
      | John Doe         |                  | John Doe                      | John Doe                           |
      |                  | john@example.com | john <john@example.com>       | [john](<john@example.com>)         |
      | john@example.com | john@example.com | john <john@example.com>       | [john](<john@example.com>)         |

  # --------------------------------------------------------------------------
  # Email Processing Methods -- make_preprocess_mailto
  # --------------------------------------------------------------------------

  Scenario Outline: make_preprocess_mailto generates preprocess entries
    When make_preprocess_mailto is called with "<name>" and "<email>"
    Then the result is an object with entries
    And the result contains key "<expectedKey>"

    Examples:
      | name       | email            | expectedKey                  |
      | John Doe   | john@example.com | john doe <john@example.com>  |
      | Jane Smith | jane@test.org    | jane smith <jane@test.org>   |

  # --------------------------------------------------------------------------
  # Detection Methods
  # --------------------------------------------------------------------------

  Scenario: DetectToolbar_onTimeout handles runaway counter
    Given runaway is set to 10
    When detectToolbar_onTimeout is called
    Then log was called with "ERROR GmailView:detectToolbar RUNAWAY TRIGGERED"

  Scenario: DetectToolbar_onTimeout increments runaway counter
    Given detectToolbar is mocked
    When detectToolbar_onTimeout is called
    Then runaway is incremented by 1

  Scenario: DetectEmailOpeningMode_onEmailClick starts wait counter
    When detectEmailOpeningMode_onEmailClick is called
    Then waitCounter.start was called with correct arguments

  # --------------------------------------------------------------------------
  # DOM Manipulation
  # --------------------------------------------------------------------------

  Scenario: Should handle DOM element creation
    When a div element is created
    Then the created element is a DIV

  Scenario: Should handle DOM element selection
    Given a div with class "test-class" appended to body
    When querySelector selects ".test-class"
    Then the selected element matches the appended div

  # --------------------------------------------------------------------------
  # DOM Integration
  # --------------------------------------------------------------------------

  Scenario: Should find email content elements in JSDOM
    Then viewport elements exist in $root
    And expanded email elements exist in $root

  # --------------------------------------------------------------------------
  # Event Handling
  # --------------------------------------------------------------------------

  Scenario: Should bind events correctly
    When bindEvents is called on the gmailView
    Then "onDetected" listener was added
    And "detectButton" listener was added
    And "trelloUserAndBoardsReady" listener was added

  Scenario: Should handle Gmail detection
    Given gmailView has a $toolBar
    When handleGmailDetected is called
    Then app.popupView.$toolBar is set to gmailView.$toolBar

  Scenario: Should handle detect button
    Given preDetect returns true and toolBar is set
    When handleDetectButton is called
    Then app.popupView.$toolBar is set to gmailView.$toolBar
    And app.popupView.finalCreatePopup was called once

  # --------------------------------------------------------------------------
  # Initialization
  # --------------------------------------------------------------------------

  Scenario: Should initialize correctly
    Given detect is mocked on gmailView
    When init is called on the gmailView
    Then addListener was called

  Scenario: Should handle Trello user and boards ready
    Given persist.user is set to a test user
    When handleTrelloUserAndBoardsReady is called
    Then events.emit was called with "gmailDataReady"
    And the emitted gmail data has correct fields

  # --------------------------------------------------------------------------
  # Edge Cases
  # --------------------------------------------------------------------------

  Scenario: displayNameAndEmail with null inputs returns empty string
    Then displayNameAndEmail with null and null returns ""

  Scenario: displayNameAndEmail with undefined inputs does not throw
    Then displayNameAndEmail with undefined and undefined does not throw

  Scenario: email_raw_md with null inputs returns empty strings
    Then email_raw_md with null and null returns empty raw and md

  Scenario: email_raw_md with undefined inputs returns empty strings
    Then email_raw_md with undefined and undefined returns empty raw and md

  Scenario: url_with_filename with null inputs does not throw
    Then url_with_filename with null and null does not throw

  Scenario: url_with_filename with undefined inputs does not throw
    Then url_with_filename with undefined and undefined does not throw

  Scenario: make_preprocess_mailto with null inputs does not throw
    Then make_preprocess_mailto with null and null does not throw

  Scenario: make_preprocess_mailto with undefined inputs does not throw
    Then make_preprocess_mailto with undefined and undefined does not throw

  # --------------------------------------------------------------------------
  # Performance
  # --------------------------------------------------------------------------

  Scenario: Should handle large data sets efficiently
    When displayNameAndEmail is called 1000 times
    Then the duration is under 100ms

  Scenario: Should handle many event handlers efficiently
    When 100 event handlers are added
    Then the duration is under 50ms

  Scenario: Email processing should be fast
    When email methods are called for 3 addresses
    Then the duration is under 10ms

  # --------------------------------------------------------------------------
  # Parse Data Methods
  # --------------------------------------------------------------------------

  Scenario Outline: parseData_onEmailCCIterate processes CC entries
    Given preprocess object is initialized
    When parseData_onEmailCCIterate is called with "<name>" and "<email>"
    Then the preprocess is populated

    Examples:
      | name      | email                 |
      | Test User | cc@example.com        |
      | Jane Doe  | jane.doe@company.com  |

  Scenario: ParseData methods should work with gmailView defined
    Then the gmailView instance is defined

  # --------------------------------------------------------------------------
  # parseData extraction
  # --------------------------------------------------------------------------

  Scenario: parseData extracts subject from hP element
    Given the DOM contains a Gmail email with subject "Budget Review Q1"
    When parseData is called on the gmailView
    Then the parsed data subject is "Budget Review Q1"

  Scenario: parseData extracts email body from a3s aiL element
    Given the DOM contains a Gmail email with body "Please review the attached budget."
    When parseData is called on the gmailView
    Then the parsed data bodyAsRaw contains "Please review the attached budget."

  Scenario: parseData extracts sender from span gD element
    Given the DOM contains a Gmail email from "Alice Smith" with address "alice@corp.com"
    When parseData is called on the gmailView
    Then the parsed data bodyAsRaw contains "Alice Smith"
    And the parsed data bodyAsMd contains "alice@corp.com"

  Scenario: parseData extracts timestamp from gH gK g3 element
    Given the DOM contains a Gmail email with timestamp "2025-06-15 3:45 PM"
    When parseData is called on the gmailView
    Then the parsed data time is "2025-06-15 3:45 PM"

  Scenario: parseData extracts attachments from span aZo element
    Given the DOM contains a Gmail email with attachment "application/pdf:report.pdf:https://example.com/report.pdf"
    When parseData is called on the gmailView
    Then the parsed data has 1 attachment
    And the first attachment name is "report.pdf"

  Scenario: parseData extracts inline images from img elements
    Given the DOM contains a Gmail email with an inline image "https://ci3.googleusercontent.com/proxy/testimage" alt "Logo"
    When parseData is called on the gmailView
    Then the parsed data has 1 image
    And the first image name is "Logo"

  Scenario: parseData extracts CC recipients from span g2 element
    Given the DOM contains a Gmail email with CC "Bob Jones" at "bob@example.com"
    When parseData is called on the gmailView
    Then the parsed data ccAsRaw contains "Bob Jones"
    And the parsed data ccAsRaw contains "bob@example.com"

  Scenario: parseData returns empty values when no email is open
    Given the DOM contains no Gmail email
    When parseData is called on the gmailView
    Then the parsed data is undefined

  Scenario: parseData handles email with no attachments
    Given the DOM contains a Gmail email with no attachments
    When parseData is called on the gmailView
    Then the parsed data has 0 attachments

  Scenario: parseData handles email with no body
    Given the DOM contains a Gmail email with empty body
    When parseData is called on the gmailView
    Then the parsed data bodyAsRaw contains "From:"
