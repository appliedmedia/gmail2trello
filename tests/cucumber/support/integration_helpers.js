/**
 * Integration test helpers for Gmail-2-Trello
 *
 * These helpers create a REAL G2T.App with all real classes wired together,
 * mocking only external boundaries (Chrome APIs, Trello REST, MutationObserver).
 */

const {
  sharedWindow,
  loadSourceFile,
  installBrowserMocks,
  createMockFn,
} = require('./world');

// Track whether source files have been loaded at least once
let sourcesLoaded = false;

/**
 * Load all G2T source files in dependency order.
 * Safe to call multiple times (re-eval overwrites classes).
 */
function loadAllSources() {
  // jQuery UI and combo are already loaded by world.js createApp path,
  // but we need them for real App too
  loadSourceFile('chrome_manifest_v3/lib/jquery-ui-1.14.1.min.js');
  loadSourceFile('chrome_manifest_v3/lib/combo.js');

  // Mock jQuery plugins that don't work in JSDOM
  if (sharedWindow.$.fn) {
    sharedWindow.$.fn.button = sharedWindow.$.fn.button || createMockFn();
    sharedWindow.$.fn.tooltip = sharedWindow.$.fn.tooltip || createMockFn();
    sharedWindow.$.fn.popover = sharedWindow.$.fn.popover || createMockFn();
    sharedWindow.$.fn.g2t_combobox =
      sharedWindow.$.fn.g2t_combobox ||
      createMockFn(function () {
        return this;
      });
    // draggable and resizable from jQuery UI
    if (!sharedWindow.$.fn.draggable) {
      sharedWindow.$.fn.draggable = createMockFn(function () {
        return this;
      });
    }
    if (!sharedWindow.$.fn.resizable) {
      sharedWindow.$.fn.resizable = createMockFn(function () {
        return this;
      });
    }
  }

  // Load classes in manifest/dependency order
  loadSourceFile('chrome_manifest_v3/class_utils.js');
  loadSourceFile('chrome_manifest_v3/class_menuControl.js');
  loadSourceFile('chrome_manifest_v3/class_waitCounter.js');
  loadSourceFile('chrome_manifest_v3/class_eventTarget.js');
  loadSourceFile('chrome_manifest_v3/class_observer.js');
  loadSourceFile('chrome_manifest_v3/class_goog.js');
  loadSourceFile('chrome_manifest_v3/class_trel.js');
  loadSourceFile('chrome_manifest_v3/views/class_gmailView.js');
  loadSourceFile('chrome_manifest_v3/views/class_popupForm.js');
  loadSourceFile('chrome_manifest_v3/views/class_popupView.js');
  loadSourceFile('chrome_manifest_v3/class_model.js');
  loadSourceFile('chrome_manifest_v3/class_app.js');

  sourcesLoaded = true;
}

/**
 * Create a real G2T.App with all subsystems wired together.
 * Mocks setInterval during construction to prevent PopupView from keeping
 * the process alive. Mocks MutationObserver and hashchange listener.
 *
 * @returns {object} The real App instance
 */
function createRealApp() {
  // Install fresh browser mocks
  installBrowserMocks();

  // Add chrome.runtime.onMessage mock (needed by Goog.runtimeOnMessageAddListener)
  if (!sharedWindow.chrome.runtime.onMessage) {
    sharedWindow.chrome.runtime.onMessage = {
      addListener: createMockFn(),
      removeListener: createMockFn(),
    };
  }

  // Mock MutationObserver
  sharedWindow.MutationObserver = class MockMutationObserver {
    constructor(cb) {
      this._cb = cb;
    }
    observe() {}
    disconnect() {}
    trigger(mutations) {
      this._cb(mutations, this);
    }
  };

  // Mock setInterval to prevent PopupView.init from creating a timer
  // that keeps Node alive
  const origSetInterval = sharedWindow.setInterval;
  const intervalIds = [];
  sharedWindow.setInterval = function (cb, ms) {
    // Return a fake interval ID but don't actually schedule
    return 99999;
  };

  // Mock window.addEventListener to drop hashchange listeners
  // (App.bindGmailNavigationEvents adds one that can keep Node alive)
  const origAddEventListener = sharedWindow.addEventListener;
  const hashchangeListeners = [];
  sharedWindow.addEventListener = function (type, listener, ...rest) {
    if (type === 'hashchange') {
      // Capture but don't actually bind to prevent process hanging
      hashchangeListeners.push(listener);
      return;
    }
    return origAddEventListener.call(sharedWindow, type, listener, ...rest);
  };

  // Load all source files
  if (!sourcesLoaded) {
    loadAllSources();
  } else {
    // Re-load to ensure fresh class definitions
    loadAllSources();
  }

  // Create the real App
  const G2T = sharedWindow.G2T;
  const app = new G2T.App();

  // Restore setInterval
  sharedWindow.setInterval = origSetInterval;

  // Restore addEventListener
  sharedWindow.addEventListener = origAddEventListener;

  // Store hashchange listeners so tests can invoke them
  app._hashchangeListeners = hashchangeListeners;

  // Store the MutationObserver mock reference on app for test access
  app._MockMutationObserver = sharedWindow.MutationObserver;

  return app;
}

/**
 * Mock Trello.rest to return specific data per endpoint.
 * Key format: "GET members/me", "POST cards", etc.
 * Calls success callback SYNCHRONOUSLY for simplicity.
 *
 * @param {object} responseMap - Map of "METHOD path" to response data
 */
function mockTrelloResponses(responseMap) {
  sharedWindow.Trello.rest = function (method, path, params, success, error) {
    const key = `${method.toUpperCase()} ${path}`;
    if (responseMap[key] !== undefined) {
      if (success) success(responseMap[key]);
    } else if (error) {
      error({ error: 'Not mocked: ' + key });
    }
  };
}

/**
 * Mock Trello.authorize to call success or error callback immediately.
 *
 * @param {boolean} success - Whether authorize should succeed (default true)
 */
function mockTrelloAuthorize(success = true) {
  sharedWindow.Trello.authorize = function (opts) {
    if (success) {
      if (opts.success) opts.success({});
    } else {
      if (opts.error) opts.error({ error: 'Authorization failed' });
    }
  };
}

/**
 * Mock chrome.storage.sync.get to call callback with specific data.
 *
 * @param {object} data - Data to return from chrome.storage.sync.get
 */
function mockChromeStorageGet(data) {
  sharedWindow.chrome.storage.sync.get = createMockFn(function (key, callback) {
    if (callback) callback(data);
  });
  // Also update global
  global.chrome = sharedWindow.chrome;
}

module.exports = {
  createRealApp,
  loadAllSources,
  mockTrelloResponses,
  mockTrelloAuthorize,
  mockChromeStorageGet,
  createMockFn,
  sharedWindow,
};
