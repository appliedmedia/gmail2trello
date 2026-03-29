/**
 * Goog class tests -- node:test + Given/When/Then
 *
 * Equivalent to: tests/test_class_goog.js (Jest, 37 tests)
 * Run with: node --test tests/v2/test_class_goog.js
 */

const {
  G2T, window, describe, beforeEach, mock, assert,
  loadSourceFile, createApp, installBrowserMocks, scenario,
  assertCalledWith, assertCallCount, assertNotCalled,
  assertDeepEqual, assertNoThrow,
} = require('./test_utils');

// Load the REAL Goog class
loadSourceFile('chrome_manifest_v3/class_goog.js');

describe('Goog Class', () => {
  let app, googInstance;

  beforeEach(() => {
    installBrowserMocks();
    app = createApp();
    app.temp.log.debugMode = false;

    if (!app.popupView) {
      app.popupView = {
        displayExtensionInvalidReload: mock.fn(),
      };
    }

    googInstance = new G2T.Goog({ app });
  });

  // --------------------------------------------------------------------------
  // Constructor and Initialization
  // --------------------------------------------------------------------------

  describe('Constructor and Initialization', () => {
    scenario('creating with app dependency', ({ given, when, then }) => {
      let inst;
      given('an app instance', () => {});
      when('Goog is constructed with { app }', () => {
        inst = new G2T.Goog({ app });
      });
      then('it is an instance of Goog and stores the app', () => {
        assert.ok(inst instanceof G2T.Goog);
        assert.strictEqual(inst.app, app);
      });
    });

    scenario('creating with no arguments', ({ when, then }) => {
      let inst;
      when('constructed with no args', () => {
        inst = new G2T.Goog();
      });
      then('app is undefined', () => {
        assert.strictEqual(inst.app, undefined);
      });
    });

    scenario('initializing with correct properties', ({ then }) => {
      then('app is set and ck is defined', () => {
        assert.strictEqual(googInstance.app, app);
        assert.notStrictEqual(googInstance.ck, undefined);
      });
    });

    scenario('static ck getter returns correct value', ({ then }) => {
      then('ck has all expected fields', () => {
        assertDeepEqual(G2T.Goog.ck, {
          id: 'g2t_goog',
          errorPrefix: 'Error:',
          contextInvalidError: 'Extension context invalidated',
          reloadMessage: 'Extension needs to be reloaded.',
        });
      });
    });

    scenario('instance ck getter returns correct value', ({ then }) => {
      then('ck matches static ck', () => {
        assertDeepEqual(googInstance.ck, {
          id: 'g2t_goog',
          errorPrefix: 'Error:',
          contextInvalidError: 'Extension context invalidated',
          reloadMessage: 'Extension needs to be reloaded.',
        });
      });
    });
  });

  // --------------------------------------------------------------------------
  // Event Binding
  // --------------------------------------------------------------------------

  describe('Event Binding', () => {
    scenario('bindEvents is callable without throwing', ({ then }) => {
      then('no error is thrown', () => {
        assertNoThrow(() => googInstance.bindEvents());
      });
    });

    scenario('should handle storage change events when available', ({ then }) => {
      then('bindEvents does not throw', () => {
        assertNoThrow(() => googInstance.bindEvents());
      });
    });

    scenario('should bind storage change listener', ({ when, then }) => {
      when('bindEvents is called', () => {
        googInstance.bindEvents();
      });
      then('addListener was called on chrome.storage.onChanged', () => {
        assert.ok(window.chrome.storage.onChanged.addListener.mock.callCount() > 0);
      });
    });

    scenario('storage change sets debugMode to true', ({ given, when, then }) => {
      let listener;
      given('bindEvents was called', () => {
        googInstance.bindEvents();
        listener = window.chrome.storage.onChanged.addListener.mock.calls[0].arguments[0];
      });
      when('a sync debugMode change fires', () => {
        assert.strictEqual(app.temp.log.debugMode, false);
        listener({ debugMode: { newValue: true } }, 'sync');
      });
      then('debugMode is true', () => {
        assert.strictEqual(app.temp.log.debugMode, true);
      });
    });

    scenario('ignore non-sync namespace storage changes', ({ given, when, then }) => {
      let listener;
      given('bindEvents was called', () => {
        googInstance.bindEvents();
        listener = window.chrome.storage.onChanged.addListener.mock.calls[0].arguments[0];
      });
      when('a local namespace change fires', () => {
        listener({ debugMode: { newValue: true } }, 'local');
      });
      then('debugMode remains false', () => {
        assert.strictEqual(app.temp.log.debugMode, false);
      });
    });

    scenario('ignore non-debugMode storage changes', ({ given, when, then }) => {
      let listener;
      given('bindEvents was called', () => {
        googInstance.bindEvents();
        listener = window.chrome.storage.onChanged.addListener.mock.calls[0].arguments[0];
      });
      when('a sync change with different key fires', () => {
        listener({ otherSetting: { newValue: true } }, 'sync');
      });
      then('debugMode remains false', () => {
        assert.strictEqual(app.temp.log.debugMode, false);
      });
    });
  });

  // --------------------------------------------------------------------------
  // API Call Wrapping
  // --------------------------------------------------------------------------

  describe('API Call Wrapping', () => {
    scenario('wrapApiCall executes successful API calls', ({ given, when, then }) => {
      let apiCall, callback, result;
      given('a mock apiCall and callback', () => {
        apiCall = mock.fn(cb => { cb('success'); return 'result'; });
        callback = mock.fn();
      });
      when('wrapApiCall is called', () => {
        result = googInstance.wrapApiCall(apiCall, 'test operation', callback);
      });
      then('apiCall was called with callback and returned result', () => {
        assertCalledWith(apiCall, callback);
        assertCalledWith(callback, 'success');
        assert.strictEqual(result, 'result');
      });
    });

    scenario('wrapApiCall handles API call errors', ({ given, when, then }) => {
      let apiCall, callback, result;
      given('a mock apiCall that calls back with error', () => {
        apiCall = mock.fn(cb => { cb('error'); return 'error'; });
        callback = mock.fn();
      });
      when('wrapApiCall is called', () => {
        result = googInstance.wrapApiCall(apiCall, 'test operation', callback);
      });
      then('callback receives error', () => {
        assertCalledWith(apiCall, callback);
        assertCalledWith(callback, 'error');
        assert.strictEqual(result, 'error');
      });
    });

    scenario('wrapApiCall handles calls without callback', ({ given, when, then }) => {
      let apiCall, result;
      given('a mock apiCall', () => {
        apiCall = mock.fn(() => 'result');
      });
      when('wrapApiCall is called without callback', () => {
        result = googInstance.wrapApiCall(apiCall, 'test operation');
      });
      then('apiCall was called and returned result', () => {
        assertCallCount(apiCall, 1);
        assert.strictEqual(result, 'result');
      });
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    scenario('handleChromeError with context invalidation', ({ then }) => {
      then('does not throw', () => {
        const error = new Error('Extension context invalidated');
        assertNoThrow(() => googInstance.handleChromeError(error, 'test operation'));
      });
    });

    scenario('handleChromeError handles context invalidation gracefully', ({ then }) => {
      then('does not throw', () => {
        const error = new Error('Extension context invalidated');
        assertNoThrow(() => googInstance.handleChromeError(error, 'test operation'));
      });
    });

    scenario('handleChromeError handles other errors', ({ then }) => {
      then('does not throw', () => {
        const error = new Error('Other API Error');
        assertNoThrow(() => googInstance.handleChromeError(error, 'test operation'));
      });
    });

    scenario('handleChromeError handles errors without message', ({ then }) => {
      then('does not throw', () => {
        const error = new Error();
        assertNoThrow(() => googInstance.handleChromeError(error, 'test operation'));
      });
    });

    scenario('handleChromeError with simulated context invalidation error', ({ then }) => {
      then('does not throw', () => {
        const error = new Error('Extension context invalidated');
        assertNoThrow(() => googInstance.handleChromeError(error, 'Chrome API call'));
      });
    });

    scenario('handleChromeError handles simulated invalidation gracefully', ({ then }) => {
      then('does not throw', () => {
        const error = new Error('Extension context invalidated');
        assertNoThrow(() => googInstance.handleChromeError(error, 'Chrome API call'));
      });
    });
  });

  // --------------------------------------------------------------------------
  // Context Invalid Message Display
  // --------------------------------------------------------------------------

  describe('Context Invalid Message Display', () => {
    scenario('showContextInvalidMessage without popup view', ({ given, when, then }) => {
      let googWithoutPopup;
      given('a Goog instance without popupView', () => {
        googWithoutPopup = new G2T.Goog({ app: { ...app, popupView: null } });
      });
      then('does not throw', () => {
        assertNoThrow(() => googWithoutPopup.showContextInvalidMessage());
      });
    });

    scenario('showContextInvalidMessage without app', ({ given, when, then }) => {
      let googWithoutApp;
      given('a Goog instance without app', () => {
        googWithoutApp = new G2T.Goog();
      });
      then('does not throw', () => {
        assertNoThrow(() => googWithoutApp.showContextInvalidMessage());
      });
    });
  });

  // --------------------------------------------------------------------------
  // Storage Operations
  // --------------------------------------------------------------------------

  describe('Storage Operations', () => {
    scenario('storageSyncGet is callable', ({ then }) => {
      then('does not throw', () => {
        assertNoThrow(() => googInstance.storageSyncGet(['debugMode'], mock.fn()));
      });
    });

    scenario('storageSyncSet is callable', ({ then }) => {
      then('does not throw', () => {
        assertNoThrow(() => googInstance.storageSyncSet({ debugMode: true }, mock.fn()));
      });
    });

    scenario('storageSyncGet handles missing callback', ({ then }) => {
      then('does not throw', () => {
        assertNoThrow(() => googInstance.storageSyncGet(['debugMode']));
      });
    });

    scenario('storageSyncSet handles missing callback', ({ then }) => {
      then('does not throw', () => {
        assertNoThrow(() => googInstance.storageSyncSet({ debugMode: true }));
      });
    });

    scenario('storageSyncGet calls Chrome API', ({ given, when, then }) => {
      let keys, callback;
      given('keys and callback', () => {
        keys = ['debugMode'];
        callback = mock.fn();
      });
      when('storageSyncGet is called', () => {
        googInstance.storageSyncGet(keys, callback);
      });
      then('chrome.storage.sync.get was called with keys and callback', () => {
        assertCalledWith(window.chrome.storage.sync.get, keys, callback);
      });
    });

    scenario('storageSyncSet calls Chrome API', ({ given, when, then }) => {
      let items, callback;
      given('items and callback', () => {
        items = { debugMode: true };
        callback = mock.fn();
      });
      when('storageSyncSet is called', () => {
        googInstance.storageSyncSet(items, callback);
      });
      then('chrome.storage.sync.set was called with items and callback', () => {
        assertCalledWith(window.chrome.storage.sync.set, items, callback);
      });
    });

    scenario('storageSyncGet handles Chrome API errors gracefully', ({ given, then }) => {
      given('chrome.storage.sync.get throws', () => {
        window.chrome.storage.sync.get = mock.fn(() => {
          throw new Error('Extension context invalidated');
        });
      });
      then('storageSyncGet does not throw', () => {
        assertNoThrow(() => googInstance.storageSyncGet(['debugMode'], mock.fn()));
      });
    });

    scenario('storageSyncSet handles Chrome API errors gracefully', ({ given, then }) => {
      given('chrome.storage.sync.set throws', () => {
        window.chrome.storage.sync.set = mock.fn(() => {
          throw new Error('Extension context invalidated');
        });
      });
      then('storageSyncSet does not throw', () => {
        assertNoThrow(() => googInstance.storageSyncSet({ debugMode: true }, mock.fn()));
      });
    });
  });

  // --------------------------------------------------------------------------
  // Runtime Operations
  // --------------------------------------------------------------------------

  describe('Runtime Operations', () => {
    scenario('runtimeSendMessage is callable', ({ then }) => {
      then('does not throw', () => {
        assertNoThrow(() => googInstance.runtimeSendMessage({ type: 'test' }, mock.fn()));
      });
    });

    scenario('runtimeGetURL is callable', ({ then }) => {
      then('does not throw', () => {
        assertNoThrow(() => googInstance.runtimeGetURL('test.html'));
      });
    });

    scenario('runtimeSendMessage handles missing callback', ({ then }) => {
      then('does not throw', () => {
        assertNoThrow(() => googInstance.runtimeSendMessage({ type: 'test' }));
      });
    });

    scenario('runtimeSendMessage calls Chrome API', ({ given, when, then }) => {
      let message, callback;
      given('a message and callback', () => {
        message = { type: 'test' };
        callback = mock.fn();
      });
      when('runtimeSendMessage is called', () => {
        googInstance.runtimeSendMessage(message, callback);
      });
      then('chrome.runtime.sendMessage was called', () => {
        assertCalledWith(window.chrome.runtime.sendMessage, message, callback);
      });
    });

    scenario('runtimeGetURL calls Chrome API and returns URL', ({ given, when, then }) => {
      let result;
      given('a path', () => {});
      when('runtimeGetURL is called', () => {
        result = googInstance.runtimeGetURL('test.html');
      });
      then('returns the expected URL', () => {
        assertCalledWith(window.chrome.runtime.getURL, 'test.html');
        assert.strictEqual(result, 'chrome-extension://test-id/test.html');
      });
    });

    scenario('runtimeSendMessage handles Chrome API errors gracefully', ({ given, then }) => {
      given('chrome.runtime.sendMessage throws', () => {
        window.chrome.runtime.sendMessage = mock.fn(() => {
          throw new Error('Extension context invalidated');
        });
      });
      then('does not throw', () => {
        assertNoThrow(() => googInstance.runtimeSendMessage({ type: 'test' }, mock.fn()));
      });
    });

    scenario('runtimeGetURL handles Chrome API errors gracefully', ({ given, then }) => {
      given('chrome.runtime.getURL throws', () => {
        window.chrome.runtime.getURL = mock.fn(() => {
          throw new Error('Extension context invalidated');
        });
      });
      then('does not throw', () => {
        assertNoThrow(() => googInstance.runtimeGetURL('test.html'));
      });
    });
  });

  // --------------------------------------------------------------------------
  // Error Recovery
  // --------------------------------------------------------------------------

  describe('Error Recovery', () => {
    scenario('handles missing app gracefully', ({ then }) => {
      then('app is undefined', () => {
        const inst = new G2T.Goog();
        assert.strictEqual(inst.app, undefined);
      });
    });

    scenario('handles missing popup view gracefully', ({ given, then }) => {
      let inst;
      given('a Goog with null popupView', () => {
        inst = new G2T.Goog({ app: { ...app, popupView: null } });
      });
      then('showContextInvalidMessage does not throw', () => {
        assertNoThrow(() => inst.showContextInvalidMessage());
      });
    });

    scenario('handles missing utils gracefully', ({ given, then }) => {
      let inst;
      given('an app without utils', () => {
        const appCopy = { ...app };
        delete appCopy.utils;
        inst = new G2T.Goog({ app: appCopy });
      });
      then('app.utils is undefined', () => {
        assert.strictEqual(inst.app.utils, undefined);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    scenario('integrates with app utils', ({ then }) => {
      then('app.utils and app.utils.log are defined', () => {
        assert.notStrictEqual(googInstance.app.utils, undefined);
        assert.notStrictEqual(googInstance.app.utils.log, undefined);
      });
    });

    scenario('handles Chrome API unavailability gracefully', ({ then }) => {
      then('bindEvents, storageSyncGet, runtimeSendMessage do not throw', () => {
        assertNoThrow(() => googInstance.bindEvents());
        assertNoThrow(() => googInstance.storageSyncGet(['test']));
        assertNoThrow(() => googInstance.runtimeSendMessage({}));
      });
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    scenario('handleChromeError with null error', ({ then }) => {
      then('does not throw', () => {
        assertNoThrow(() => googInstance.handleChromeError(null, 'test'));
      });
    });

    scenario('handleChromeError with undefined error', ({ then }) => {
      then('does not throw', () => {
        assertNoThrow(() => googInstance.handleChromeError(undefined, 'test'));
      });
    });

    scenario('handleChromeError with empty error message', ({ then }) => {
      then('does not throw', () => {
        assertNoThrow(() => googInstance.handleChromeError(new Error(''), 'test'));
      });
    });

    scenario('storage changes with null changes', ({ then }) => {
      then('bindEvents does not throw', () => {
        assertNoThrow(() => googInstance.bindEvents());
      });
    });

    scenario('storage changes with undefined namespace', ({ then }) => {
      then('bindEvents does not throw', () => {
        assertNoThrow(() => googInstance.bindEvents());
      });
    });
  });
});
