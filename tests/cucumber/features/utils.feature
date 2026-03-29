Feature: Utils Class
  Tests for the G2T.Utils utility class covering string manipulation,
  HTML-to-Markdown conversion, hashing, URL handling, and more.

  Background:
    Given a fresh Utils

  # --------------------------------------------------------------------------
  # Basic Setup
  # --------------------------------------------------------------------------

  Scenario: Utils is defined
    Then the instance is defined

  Scenario: jQuery returns a defined result
    Then jQuery selector "div" returns a defined result

  Scenario: window.$ is defined and is a function
    Then window.$ is a function

  # --------------------------------------------------------------------------
  # Constructor and Initialization
  # --------------------------------------------------------------------------

  Scenario: Creating Utils instance with default settings
    Then it is an instance of Utils
    And it stores the app reference

  Scenario: Creating Utils instance with debug enabled
    Given debugMode is set to true on the app
    When a new Utils is created with that app
    Then debugMode is true on the new instance app

  Scenario: Constructor with no arguments throws
    When Utils is constructed with no arguments
    Then an error is thrown

  # --------------------------------------------------------------------------
  # Debug and Logging
  # --------------------------------------------------------------------------

  Scenario: Log outputs when debug is enabled
    Given debugMode is set to true on the app
    When log is called with "Test message"
    Then a message is stored in app memory

  Scenario: Log stores to memory even when debug is disabled
    Given debugMode is set to false on the app
    When log is called with "Test message"
    Then a message is stored in app memory

  Scenario: ck getter returns correct value
    Then the instance ck is defined

  Scenario: ck static getter returns correct value
    Then the static ck of Utils is defined

  # --------------------------------------------------------------------------
  # Chrome Storage Operations
  # --------------------------------------------------------------------------

  Scenario: loadFromChromeStorage calls goog.storageSyncGet
    Given storageSyncGet returns a value for "testKey"
    When loadFromChromeStorage is called with "testKey"
    Then storageSyncGet was called with "testKey" and a function

  Scenario: saveToChromeStorage calls goog.storageSyncSet
    When saveToChromeStorage is called with "testKey" and "testValue"
    Then storageSyncSet was called with serialized data for "testKey" and "testValue"

  Scenario: loadFromChromeStorage handles missing keys
    Given storageSyncGet returns empty object
    When loadFromChromeStorage is called with "nonexistentKey"
    Then storageSyncGet was called with "nonexistentKey" and a function

  # --------------------------------------------------------------------------
  # String Manipulation - escapeRegExp
  # --------------------------------------------------------------------------

  Scenario Outline: escapeRegExp "<input>" produces "<expected>"
    When escapeRegExp is called with "<input>"
    Then the string result is "<expected>"

    Examples:
      | input      | expected     |
      | test       | test         |
      | test*test  | test\\*test  |
      | test.test  | test\\.test  |
      | test+test  | test\\+test  |
      | test?test  | test\\?test  |
      | test^test  | test\\^test  |
      | test$test  | test\\$test  |
      | test\|test | test\\\|test |
      | test(test  | test\\(test  |
      | test)test  | test\\)test  |
      | test[test  | test\\[test  |
      | test]test  | test\\]test  |
      | test{test  | test\\{test  |
      | test}test  | test\\}test  |

  # --------------------------------------------------------------------------
  # String Manipulation - replacer
  # --------------------------------------------------------------------------

  Scenario: replacer with name and place substitution
    When replacer is called with "Hello %name%, welcome to %place%" and dict name=John,place=Trello
    Then the string result is "Hello John, welcome to Trello"

  Scenario: replacer with empty dict
    When replacer is called with "Hello %name%" and empty dict
    Then the string result is "Hello %name%"

  Scenario: replacer with null text
    When replacer is called with null text and empty dict
    Then the result is null

  Scenario: replacer with undefined text
    When replacer is called with undefined text and empty dict
    Then the string result is ""

  # --------------------------------------------------------------------------
  # URI and URL Handling - uriForDisplay
  # --------------------------------------------------------------------------

  Scenario Outline: uriForDisplay "<input>" produces "<expected>"
    When uriForDisplay is called with "<input>"
    Then the string result is "<expected>"

    Examples:
      | input                  | expected               |
      | https://example.com    | https://example.com    |
      | http://example.com     | http://example.com     |
      | ftp://example.com      | ftp://example.com      |
      | mailto:test@example.com| mailto:test@example.com|
      | tel:+1234567890        | tel:+1234567890        |
      |                        |                        |
      | not-a-uri              | not-a-uri              |

  # --------------------------------------------------------------------------
  # URI and URL Handling - url_add_var
  # --------------------------------------------------------------------------

  Scenario Outline: url_add_var "<url>" + "<param>" produces "<expected>"
    When url_add_var is called with "<url>" and "<param>"
    Then the string result is "<expected>"

    Examples:
      | url                            | param       | expected                              |
      | https://example.com            | param=value | https://example.com?param=value       |
      | https://example.com?existing=1 | param=value | https://example.com?existing=1&param=value |
      | https://example.com            |             | https://example.com                   |
      |                                | param=value | param=value                           |

  # --------------------------------------------------------------------------
  # Hash and Data Processing - djb2Hash
  # --------------------------------------------------------------------------

  Scenario Outline: djb2Hash "<input>" produces <expected>
    When djb2Hash is called with "<input>"
    Then the numeric result is <expected>

    Examples:
      | input  | expected   |
      |        | 5381       |
      | a      | 177670     |
      | test   | 2090756197 |
      | hello  | 261238937  |
      | world  | 279393645  |
      | test1  | 275477814  |
      | test2  | 275477815  |

  # --------------------------------------------------------------------------
  # Hash and Data Processing - excludeFields
  # --------------------------------------------------------------------------

  Scenario: excludeFields removes specified fields from object
    When excludeFields is called to remove "b,d" from object with keys a=1,b=2,c=3,d=4
    Then the excludeFields result has keys "a,c" with values "1,3"

  Scenario: excludeFields with empty object and field to exclude
    When excludeFields is called to remove "field1" from empty object
    Then the excludeFields result is empty

  Scenario: excludeFields with no fields to exclude returns same keys
    When excludeFields is called to remove "" from object with keys x=1,y=2,z=3
    Then the excludeFields result has keys "x,y,z" with values "1,2,3"

  Scenario: excludeFields removing only field returns empty object
    When excludeFields is called to remove "only" from object with keys only=field
    Then the excludeFields result is empty

  Scenario: excludeFields handles null/undefined object
    Then excludeFields with null throws
    And excludeFields with undefined throws

  # --------------------------------------------------------------------------
  # Email Processing - splitEmailDomain
  # --------------------------------------------------------------------------

  Scenario Outline: splitEmailDomain "<input>" produces name="<name>" domain="<domain>"
    When splitEmailDomain is called with "<input>"
    Then the result name is "<name>" and domain is "<domain>"

    Examples:
      | input                   | name      | domain          |
      | test@example.com        | test      | example.com     |
      |                         |           |                 |
      | testemail               | testemail |                 |
      | test@example@domain.com | test      | example         |
      | user@domain.co.uk       | user      | domain.co.uk    |
      | @domain.com             |           | domain.com      |
      | user@                   | user      |                 |

  # --------------------------------------------------------------------------
  # String Formatting - addChar
  # --------------------------------------------------------------------------

  Scenario Outline: addChar "<front>" + "<back>" + "<char>" produces "<expected>"
    When addChar is called with "<front>" and "<back>" and "<char>"
    Then the string result is "<expected>"

    Examples:
      | front | back  | char | expected    |
      | front | back  | -    | front-back  |
      | front |       | -    | front-      |
      |       | back  | -    | -back       |
      |       |       | -    |             |
      | hello | world | _    | hello_world |
      | test  | case  | \|   | test\|case  |

  # --------------------------------------------------------------------------
  # String Formatting - addSpace
  # --------------------------------------------------------------------------

  Scenario Outline: addSpace "<front>" + "<back>" produces expected
    When addSpace is called with "<front>" and "<back>"
    Then the addSpace result for "<front>" and "<back>" is correct

    Examples:
      | front | back  |
      | front | back  |
      | front |       |
      |       | back  |
      |       |       |
      | hello | world |
      | test  |       |

  # --------------------------------------------------------------------------
  # String Formatting - addCRLF
  # --------------------------------------------------------------------------

  Scenario Outline: addCRLF "<front>" + "<back>" produces expected result
    When addCRLF is called with "<front>" and "<back>"
    Then the addCRLF result for "<front>" and "<back>" is correct

    Examples:
      | front  | back  |
      | front  | back  |
      | front  |       |
      |        | back  |
      |        |       |
      | line1  | line2 |
      | single |       |

  # --------------------------------------------------------------------------
  # Text Processing - truncate
  # --------------------------------------------------------------------------

  Scenario Outline: truncate "<text>" at <length> produces "<expected>"
    When truncate is called with "<text>" and <length> and suffix "<suffix>"
    Then the string result is "<expected>"

    Examples:
      | text             | length | suffix | expected |
      | Hello World      | 5      |        | Hello    |
      | Hello World      | 5      | ***    | He***    |
      | Hello            | 10     |        | Hello    |
      | Testing truncate | 7      | ...    | Test...  |
      |                  | 5      |        |          |
      | Short            | 20     |        | Short    |

  # --------------------------------------------------------------------------
  # Text Processing - midTruncate
  # --------------------------------------------------------------------------

  Scenario Outline: midTruncate "<text>" at <length> produces "<expected>"
    When midTruncate is called with "<text>" and <length> and suffix "<suffix>"
    Then the string result is "<expected>"

    Examples:
      | text                    | length | suffix | expected     |
      | Hello World             | 8      |        | Helloorld    |
      | Hello World             | 8      | ***    | Hel***ld     |
      | Hello                   | 10     |        | Hello        |
      | VeryLongStringToTruncate| 12     | ...    | VeryL...cate |
      |                         | 5      |        |              |

  # --------------------------------------------------------------------------
  # Text Processing - bookend
  # --------------------------------------------------------------------------

  Scenario Outline: bookend "<char>" "<text>" "<style>" produces expected
    When bookend is called with "<char>" and "<text>" and "<style>"
    Then the bookend result matches char "<char>" text "<text>" style "<style>"

    Examples:
      | char | text      | style  |
      | *    | Hello     | bold   |
      | `    | code      | code   |
      | _    | underline | italic |
      | #    | heading   | header |

  # --------------------------------------------------------------------------
  # HTML Entity Processing - encodeEntities
  # --------------------------------------------------------------------------

  Scenario: encodeEntities with ampersand and angle brackets
    When encodeEntities is called with special input "amp_angles_quotes"
    Then the string result is ""

  Scenario: encodeEntities with Hello & World
    When encodeEntities is called with "Hello & World"
    Then the string result is ""

  Scenario: encodeEntities with script tag
    When encodeEntities is called with special input "script_tag"
    Then the string result is ""

  Scenario: encodeEntities with double quotes
    When encodeEntities is called with special input "double_quoted"
    Then the string result is ""

  Scenario: encodeEntities with single quotes
    When encodeEntities is called with special input "single_quoted"
    Then the string result is ""

  Scenario: encodeEntities with no entities
    When encodeEntities is called with "No entities here"
    Then the string result is ""

  Scenario: encodeEntities with empty string
    When encodeEntities is called with ""
    Then the string result is ""

  # --------------------------------------------------------------------------
  # HTML Entity Processing - decodeEntities
  # --------------------------------------------------------------------------

  Scenario Outline: decodeEntities "<input>" produces expected
    When decodeEntities is called with "<input>"
    Then the decodeEntities result for "<input>" is correct

    Examples:
      | input                               |
      | &amp; &lt; &gt; &quot; &#39;        |
      | &unknown;                           |
      |                                     |
      | Hello &amp; World                   |
      | &lt;script&gt;                      |
      | &quot;quoted&quot;                  |
      | &#39;single&#39;                   |
      | No entities here                    |
      | &copy; &nbsp; &trade;              |

  # --------------------------------------------------------------------------
  # Event Handling - modKey
  # --------------------------------------------------------------------------

  Scenario Outline: modKey with <description> produces "<expected>"
    When modKey is called with ctrl=<ctrl> meta=<meta> shift=<shift> alt=<alt>
    Then the string result is "<expected>"

    Examples:
      | ctrl  | meta  | shift | alt   | expected        | description            |
      | true  | false | false | false | ctrl-right      | ctrl key               |
      | false | true  | false | false | metakey-windows | meta/cmd key           |
      | false | false | true  | false | shift-right     | shift key              |
      | false | false | false | true  | alt-right       | alt key                |
      | false | false | false | false |                 | no modifiers           |
      | true  | true  | false | false | ctrl-right      | multiple modifiers     |

  # --------------------------------------------------------------------------
  # Avatar URL Generation
  # --------------------------------------------------------------------------

  Scenario Outline: makeAvatarUrl "<avatarUrl>" produces "<expected>"
    When makeAvatarUrl is called with "<avatarUrl>"
    Then the string result is "<expected>"

    Examples:
      | avatarUrl                    | expected                          |
      | https://example.com/avatar   | https://example.com/avatar/30.png |
      | https://trello.com/user      | https://trello.com/user/30.png    |
      |                              |                                   |

  # --------------------------------------------------------------------------
  # Lifecycle Methods
  # --------------------------------------------------------------------------

  Scenario: bindEvents is callable
    Then calling bindEvents does not throw

  Scenario: init is callable
    Then calling init does not throw

  # --------------------------------------------------------------------------
  # Error Handling - null/undefined inputs
  # --------------------------------------------------------------------------

  Scenario Outline: <fn> with <argDesc> does not throw
    Then calling <fn> with <argType> does not throw

    Examples:
      | fn          | argDesc   | argType   |
      | escapeRegExp| null      | null      |
      | escapeRegExp| undefined | undefined |
      | replacer    | null      | null      |
      | replacer    | undefined | undefined |
      | truncate    | null      | null      |
      | truncate    | undefined | undefined |
      | midTruncate | null      | null      |
      | midTruncate | undefined | undefined |

  # --------------------------------------------------------------------------
  # Error Handling - Edge Cases
  # --------------------------------------------------------------------------

  Scenario: truncate empty string returns empty
    When truncate is called with "" and 5 and suffix ""
    Then the string result is ""

  Scenario: midTruncate empty string returns empty
    When midTruncate is called with "" and 5 and suffix ""
    Then the string result is ""

  Scenario: addChar all empty returns empty
    When addChar is called with "" and "" and ""
    Then the string result is ""

  Scenario: addSpace all empty returns empty
    When addSpace is called with "" and ""
    Then the string result is ""

  Scenario: addCRLF all empty returns empty
    When addCRLF is called with "" and ""
    Then the string result is ""

  Scenario: uriForDisplay empty returns empty
    When uriForDisplay is called with ""
    Then the string result is ""

  Scenario: djb2Hash empty returns 5381
    When djb2Hash is called with ""
    Then the numeric result is 5381

  Scenario: uriForDisplay null returns empty
    When uriForDisplay is called with null
    Then the string result is ""

  Scenario: uriForDisplay undefined returns empty
    When uriForDisplay is called with undefined
    Then the string result is ""

  # --------------------------------------------------------------------------
  # Performance Tests
  # --------------------------------------------------------------------------

  Scenario: Handles large strings efficiently
    When escapeRegExp is called with a 10000-char string
    Then the result is a 10000-char string
    And the utils operation completes within 1000ms

  Scenario: Handles large objects efficiently
    When excludeFields is called with a 1000-key object excluding key1,key2
    Then the result is defined
    And the utils operation completes within 100ms

  # --------------------------------------------------------------------------
  # Additional Utility Methods - anchorMarkdownify
  # --------------------------------------------------------------------------

  Scenario Outline: anchorMarkdownify "<text>" "<href>" produces expected
    When anchorMarkdownify is called with "<text>" and "<href>"
    Then the anchorMarkdownify result for "<text>" and "<href>" is correct

    Examples:
      | text              | href                       |
      | Link Text         | https://example.com        |
      | https://example.com| https://example.com       |
      | test@example.com  | mailto:test@example.com    |
      |                   |                            |
      | GitHub            | https://github.com         |

  # --------------------------------------------------------------------------
  # Additional Utility Methods - luminance
  # --------------------------------------------------------------------------

  Scenario Outline: luminance "<color>" produces "inherit"
    When luminance is called with "<color>"
    Then the string result is "inherit"

    Examples:
      | color            |
      | #ffffff          |
      | #000000          |
      | #808080          |
      | #404040          |
      | rgb(255,255,255) |
      | rgb(0,0,0)       |
      | invalid-color    |

  # --------------------------------------------------------------------------
  # Additional Utility Methods - getSelectedText
  # --------------------------------------------------------------------------

  Scenario: getSelectedText with selection returns empty
    Given window.getSelection returns "Selected text" with rangeCount 1
    When getSelectedText is called
    Then the string result is ""

  Scenario: getSelectedText with no selection returns empty
    Given window.getSelection returns "" with rangeCount 0
    When getSelectedText is called
    Then the string result is ""

  # --------------------------------------------------------------------------
  # Integration Tests
  # --------------------------------------------------------------------------

  Scenario: Handles complex markdownify operations
    Then markdownify is a function on utils
    And markdownify does not throw with a basic jQuery mock

  Scenario: Handles markdownify preprocessing
    When markdownify is called with preprocess option
    Then the result is defined

  # --------------------------------------------------------------------------
  # Markdownify - HTML to Markdown conversion
  # --------------------------------------------------------------------------

  Scenario Outline: Markdownify "<key>"
    Given a markdownify test element "<key>"
    When markdownify is called on the test element
    Then the markdownify result matches the expected value
    And it completes within the duration limit

    Examples:
      | key                    |
      | a                      |
      | a_long                 |
      | a_multiple             |
      | a_same                 |
      | a_short                |
      | a_title                |
      | b                      |
      | br                     |
      | br_attr                |
      | bullet                 |
      | bullet_chars           |
      | del                    |
      | div2                   |
      | em                     |
      | em_text                |
      | email_content          |
      | empty_content          |
      | empty_input            |
      | h1                     |
      | h2                     |
      | h3                     |
      | h4                     |
      | h5                     |
      | h6                     |
      | headers_spacing        |
      | hr                     |
      | hr2                    |
      | html_entities          |
      | i                      |
      | linebreaks             |
      | long_text              |
      | mailto                 |
      | malformed_html         |
      | nested_html            |
      | numeric_entities       |
      | p                      |
      | p2                     |
      | s                      |
      | spaces                 |
      | space_normalize        |
      | special_chars          |
      | strike                 |
      | strong                 |
      | strong_em              |
      | strong_em_both         |
      | strong_off_italic_off  |
      | strong_off_italic_on   |
      | strong_simple          |
      | tabs_whitespace        |
      | title_bold_italic_link |
      | trim                   |
      | u                      |
      | whitespace_input       |

  Scenario: Markdownify handles null/undefined input gracefully
    Then markdownify with null does not throw
    And markdownify with undefined does not throw
