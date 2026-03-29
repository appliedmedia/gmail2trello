Feature: Goog Class
  The Goog class wraps Chrome extension APIs with error handling.

  Background:
    Given a fresh Goog

  # ------------------------------------------------------------------
  # Constructor and Initialization
  # ------------------------------------------------------------------

  Scenario: Creating with app dependency
    Then it stores the app reference
    And it is an instance of Goog

  Scenario: Creating with no arguments
    Given a Goog created with no arguments
    Then the Goog instance app is undefined

  Scenario: Initializing with correct properties
    Then it stores the app reference
    And ck.id is "g2t_goog"

  Scenario: Static ck getter returns correct value
    Then the Goog static ck has all expected fields

  Scenario: Instance ck getter returns correct value
    Then the Goog instance ck has all expected fields

  # ------------------------------------------------------------------
  # Event Binding
  # ------------------------------------------------------------------

  Scenario: bindEvents is callable without throwing
    When bindEvents is called on the Goog instance
    Then no error is thrown

  Scenario: Should handle storage change events when available
    When bindEvents is called on the Goog instance
    Then no error is thrown

  Scenario: Should bind storage change listener
    When bindEvents is called on the Goog instance
    Then chrome.storage.onChanged.addListener was called

  Scenario: Storage change sets debugMode to true
    Given bindEvents has been called on the Goog instance
    When a sync debugMode change fires with value true
    Then app.temp.log.debugMode is true

  Scenario: Ignore non-sync namespace storage changes
    Given bindEvents has been called on the Goog instance
    When a local namespace debugMode change fires
    Then app.temp.log.debugMode is false

  Scenario: Ignore non-debugMode storage changes
    Given bindEvents has been called on the Goog instance
    When a sync change with key "otherSetting" fires
    Then app.temp.log.debugMode is false

  # ------------------------------------------------------------------
  # API Call Wrapping
  # ------------------------------------------------------------------

  Scenario: wrapApiCall executes successful API calls
    When wrapApiCall is called with a successful apiCall and callback
    Then the apiCall was called with the callback
    And the callback received "success"
    And the wrapApiCall result is "result"

  Scenario: wrapApiCall handles API call errors
    When wrapApiCall is called with an error apiCall and callback
    Then the apiCall was called with the callback
    And the callback received "error"
    And the wrapApiCall result is "error"

  Scenario: wrapApiCall handles calls without callback
    When wrapApiCall is called without callback
    Then the apiCall was called once
    And the wrapApiCall result is "result"

  # ------------------------------------------------------------------
  # Error Handling
  # ------------------------------------------------------------------

  Scenario: handleChromeError with context invalidation
    When handleChromeError is called with "Extension context invalidated"
    Then no error is thrown

  Scenario: handleChromeError handles context invalidation gracefully
    When handleChromeError is called with "Extension context invalidated"
    Then no error is thrown

  Scenario: handleChromeError handles other errors
    When handleChromeError is called with "Other API Error"
    Then no error is thrown

  Scenario: handleChromeError handles errors without message
    When handleChromeError is called with an empty message
    Then no error is thrown

  Scenario: handleChromeError with simulated context invalidation error
    When handleChromeError is called with "Extension context invalidated" for "Chrome API call"
    Then no error is thrown

  Scenario: handleChromeError handles simulated invalidation gracefully
    When handleChromeError is called with "Extension context invalidated" for "Chrome API call"
    Then no error is thrown

  # ------------------------------------------------------------------
  # Context Invalid Message Display
  # ------------------------------------------------------------------

  Scenario: showContextInvalidMessage without popup view
    Given a Goog instance without popupView
    When showContextInvalidMessage is called
    Then no error is thrown

  Scenario: showContextInvalidMessage without app
    Given a Goog created with no arguments
    When showContextInvalidMessage is called
    Then no error is thrown

  # ------------------------------------------------------------------
  # Storage Operations
  # ------------------------------------------------------------------

  Scenario: storageSyncGet is callable
    When storageSyncGet is called with keys and callback
    Then no error is thrown

  Scenario: storageSyncSet is callable
    When storageSyncSet is called with items and callback
    Then no error is thrown

  Scenario: storageSyncGet handles missing callback
    When storageSyncGet is called with keys only
    Then no error is thrown

  Scenario: storageSyncSet handles missing callback
    When storageSyncSet is called with items only
    Then no error is thrown

  Scenario: storageSyncGet calls Chrome API
    When storageSyncGet is called with keys and callback
    Then chrome.storage.sync.get was called with the keys and callback

  Scenario: storageSyncSet calls Chrome API
    When storageSyncSet is called with items and callback
    Then chrome.storage.sync.set was called with the items and callback

  Scenario: storageSyncGet handles Chrome API errors gracefully
    Given chrome.storage.sync.get is set to throw context invalidated
    When storageSyncGet is called with keys and callback
    Then no error is thrown

  Scenario: storageSyncSet handles Chrome API errors gracefully
    Given chrome.storage.sync.set is set to throw context invalidated
    When storageSyncSet is called with items and callback
    Then no error is thrown

  # ------------------------------------------------------------------
  # Runtime Operations
  # ------------------------------------------------------------------

  Scenario: runtimeSendMessage is callable
    When runtimeSendMessage is called with a message and callback
    Then no error is thrown

  Scenario: runtimeGetURL is callable
    When runtimeGetURL is called with "test.html"
    Then no error is thrown

  Scenario: runtimeSendMessage handles missing callback
    When runtimeSendMessage is called with a message only
    Then no error is thrown

  Scenario: runtimeSendMessage calls Chrome API
    When runtimeSendMessage is called with a message and callback
    Then chrome.runtime.sendMessage was called with the message and callback

  Scenario: runtimeGetURL calls Chrome API and returns URL
    When runtimeGetURL is called with "test.html"
    Then the result is "chrome-extension://test-id/test.html"

  Scenario: runtimeSendMessage handles Chrome API errors gracefully
    Given chrome.runtime.sendMessage is set to throw context invalidated
    When runtimeSendMessage is called with a message and callback
    Then no error is thrown

  Scenario: runtimeGetURL handles Chrome API errors gracefully
    Given chrome.runtime.getURL is set to throw context invalidated
    When runtimeGetURL is called with "test.html"
    Then no error is thrown

  # ------------------------------------------------------------------
  # Error Recovery
  # ------------------------------------------------------------------

  Scenario: Handles missing app gracefully
    Given a Goog created with no arguments
    Then the Goog instance app is undefined

  Scenario: Handles missing popup view gracefully
    Given a Goog instance without popupView
    When showContextInvalidMessage is called
    Then no error is thrown

  Scenario: Handles missing utils gracefully
    Given a Goog instance without utils
    Then the Goog instance app.utils is undefined

  # ------------------------------------------------------------------
  # Integration Tests
  # ------------------------------------------------------------------

  Scenario: Integrates with app utils
    Then the Goog instance app.utils is defined
    And the Goog instance app.utils.log is defined

  Scenario: Handles Chrome API unavailability gracefully
    When bindEvents is called on the Goog instance
    And storageSyncGet is called with keys only
    And runtimeSendMessage is called with a message only
    Then no error is thrown

  # ------------------------------------------------------------------
  # Edge Cases
  # ------------------------------------------------------------------

  Scenario: handleChromeError with null error
    When handleChromeError is called with null
    Then no error is thrown

  Scenario: handleChromeError with undefined error
    When handleChromeError is called with undefined
    Then no error is thrown

  Scenario: handleChromeError with empty error message
    When handleChromeError is called with an empty message
    Then no error is thrown

  Scenario: Storage changes with null changes
    When bindEvents is called on the Goog instance
    Then no error is thrown

  Scenario: Storage changes with undefined namespace
    When bindEvents is called on the Goog instance
    Then no error is thrown
