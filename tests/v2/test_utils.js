/**
 * G2T Test Utilities for node:test
 *
 * Replaces test_shared.js with a lighter, reusable module.
 * No Jest dependency. Uses node:test mock API and node:assert/strict.
 *
 * Provides:
 *   - JSDOM + jQuery environment setup
 *   - Chrome/Trello/browser API mocks
 *   - Mock app factory (createApp)
 *   - BDD helpers: given/when/then wrappers
 *   - Reusable assertion helpers
 */

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { describe, it, before, beforeEach, afterEach, mock } = require('node:test');

// ---------------------------------------------------------------------------
// 1. JSDOM + jQuery bootstrap
// ---------------------------------------------------------------------------

const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '..', 'test_jsdom.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(htmlContent, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'http://localhost',
  beforeParse(win) {
    win.TextEncoder = require('node:util').TextEncoder;
    win.TextDecoder = require('node:util').TextDecoder;
  },
});

const window = dom.window;
const document = window.document;

// Load jQuery
const jqueryPath = path.join(__dirname, '../../chrome_manifest_v3/lib/jquery-3.7.1.min.js');
window.eval(fs.readFileSync(jqueryPath, 'utf8'));

if (!window.$ || !window.jQuery) {
  throw new Error('jQuery failed to load in JSDOM');
}

// Expose jQuery globally for source files that reference free $ / jQuery
global.$ = window.$;
global.jQuery = window.jQuery;

// ---------------------------------------------------------------------------
// 2. G2T namespace bootstrap -- load class_utils.js to establish G2T
// ---------------------------------------------------------------------------

let G2T = {};

function loadSourceFile(relativePath) {
  const fullPath = path.join(__dirname, '../..', relativePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  window.eval(content);
  // Re-sync namespace after each load
  if (window.G2T) G2T = window.G2T;
  return content;
}

loadSourceFile('chrome_manifest_v3/class_utils.js');

// Load GmailView and stub detectToolbar to prevent runaway errors
loadSourceFile('chrome_manifest_v3/views/class_gmailView.js');
if (G2T.GmailView) {
  G2T.GmailView.prototype.detectToolbar = () => true;
}

// ---------------------------------------------------------------------------
// 3. Browser API mocks (reusable, resettable)
// ---------------------------------------------------------------------------

function createChromeMock() {
  return {
    storage: {
      sync: { get: mock.fn(), set: mock.fn() },
      local: { get: mock.fn(), set: mock.fn() },
      onChanged: { addListener: mock.fn(), removeListener: mock.fn() },
    },
    runtime: {
      sendMessage: mock.fn(),
      getURL: mock.fn((p) => `chrome-extension://test-id/${p}`),
    },
  };
}

function createTrelloMock() {
  return {
    rest: mock.fn(),
    authorize: mock.fn(),
    deauthorize: mock.fn(),
    authorized: mock.fn(() => false),
    setKey: mock.fn(),
    setToken: mock.fn(),
    key: mock.fn(() => 'test-key'),
    token: mock.fn(() => 'test-token'),
    get: mock.fn(),
    post: mock.fn(),
    put: mock.fn(),
    delete: mock.fn(),
  };
}

function installBrowserMocks() {
  window.chrome = createChromeMock();
  global.chrome = window.chrome;

  window.Trello = createTrelloMock();

  window.localStorage = { getItem: mock.fn(() => null), setItem: mock.fn(), removeItem: mock.fn(), clear: mock.fn() };
  window.sessionStorage = { getItem: mock.fn(() => null), setItem: mock.fn(), removeItem: mock.fn(), clear: mock.fn() };

  window.fetch = mock.fn(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('<div>Mock</div>') }));
  window.confirm = mock.fn(() => false);
  window.location.reload = mock.fn();

  window.analytics = {
    getService: mock.fn(() => ({
      getTracker: mock.fn(() => ({ sendAppView: mock.fn(), sendEvent: mock.fn() })),
    })),
  };
  global.analytics = window.analytics;
}

installBrowserMocks();

// ---------------------------------------------------------------------------
// 4. Mock App factory
// ---------------------------------------------------------------------------

function createApp() {
  // Load supporting source files
  loadSourceFile('chrome_manifest_v3/lib/jquery-ui-1.14.1.min.js');
  loadSourceFile('chrome_manifest_v3/lib/combo.js');

  // Mock jQuery plugins
  if (window.$.fn) {
    window.$.fn.button = mock.fn();
    window.$.fn.tooltip = mock.fn();
    window.$.fn.popover = mock.fn();
    window.$.fn.g2t_combobox = mock.fn(function () { return this; });
  }

  const app = {
    trelloApiKey: '21b411b1b5b549c54bd32f0e90738b41',
    initialized: false,

    goog: {
      init: mock.fn(),
      runtimeSendMessage: mock.fn(),
      storageSyncGet: mock.fn(),
      storageSyncSet: mock.fn(),
      runtimeGetURL: mock.fn((p) => `chrome-extension://test-id/${p}`),
    },

    events: {
      addListener: mock.fn(),
      removeListener: mock.fn(),
      emit: mock.fn(),
    },

    model: {
      init: mock.fn(),
      trello: { user: { fullName: 'Test User' } },
      gmail: {},
    },

    gmailView: {
      init: mock.fn(),
      bindData: mock.fn(),
      parseData: mock.fn(() => ({})),
      forceRedraw: mock.fn(),
      parsingData: false,
      preDetect: mock.fn(() => true),
    },

    popupView: {
      $toolBar: null,
      isInitialized: false,
      dataDirty: true,
      MAX_BODY_SIZE: 16384,
      updatesPending: [],
      comboInitialized: false,
      size_k: {
        width: { min: 700, max: 1200 },
        height: { min: 464, max: 1400 },
        text: { min: 111 },
      },
      form: {
        init: mock.fn(),
        bindEvents: mock.fn(),
        bindData: mock.fn(),
        bindGmailData: mock.fn(),
        reset: mock.fn(),
        submit: mock.fn(),
        isInitialized: false,
      },
      finalCreatePopup: mock.fn(),
      displayExtensionInvalidReload: mock.fn(),
      init: mock.fn(),
      bindData: mock.fn(),
      bindGmailData: mock.fn(),
      forceRedraw: mock.fn(),
    },

    obs: {
      init: mock.fn(),
      observeToolbar: mock.fn(),
    },

    trel: {
      authorized: false,
      user: null,
    },

    persist: {
      layoutMode: 0,
      trelloAuthorized: false,
      user: null,
      eblcmArray: [],
      popupWidth: 700,
      popupHeight: 464,
      storageHashes: {},
      boardId: null,
      listId: null,
      cardId: null,
      useBackLink: true,
      addCC: false,
      markdown: true,
      labelsId: '',
      membersId: '',
    },

    temp: {
      lastHash: '',
      updatesPending: [],
      comboInitialized: false,
      pendingMessage: null,
      description: '',
      title: '',
      attachment: [],
      image: [],
      boards: [],
      lists: [],
      cards: [],
      members: [],
      labels: [],
      log: { memory: [], count: 0, max: 100, debugMode: false },
    },
  };

  // Wire up real Utils with mocked log
  app.utils = new G2T.Utils({ app });
  app.utils.log = mock.fn();

  return app;
}

// ---------------------------------------------------------------------------
// 5. BDD helpers -- Given / When / Then
// ---------------------------------------------------------------------------

/**
 * Gherkin-style test wrapper for node:test.
 *
 * Usage:
 *   scenario('adding a listener', ({ given, when, then }) => {
 *     let et, listener;
 *     given('a fresh EventTarget', () => { et = new G2T.EventTarget({ app }); });
 *     given('a listener function', () => { listener = mock.fn(); });
 *     when('the listener is added for "click"', () => { et.addListener('click', listener); });
 *     then('the listeners map contains it', () => { assert.deepStrictEqual(et._listeners.click, [listener]); });
 *   });
 */
function scenario(name, fn) {
  it(name, () => {
    const steps = [];
    const step = (prefix) => (label, action) => {
      steps.push({ prefix, label, action });
    };
    fn({
      given: step('Given'),
      when: step('When'),
      then: step('Then'),
      and: step('And'),
    });
    // Execute all steps in order
    for (const s of steps) {
      try {
        s.action();
      } catch (err) {
        err.message = `[${s.prefix} ${s.label}] ${err.message}`;
        throw err;
      }
    }
  });
}

/**
 * Async variant of scenario for tests that need await.
 */
function scenarioAsync(name, fn) {
  it(name, async () => {
    const steps = [];
    const step = (prefix) => (label, action) => {
      steps.push({ prefix, label, action });
    };
    fn({
      given: step('Given'),
      when: step('When'),
      then: step('Then'),
      and: step('And'),
    });
    for (const s of steps) {
      try {
        await s.action();
      } catch (err) {
        err.message = `[${s.prefix} ${s.label}] ${err.message}`;
        throw err;
      }
    }
  });
}

// ---------------------------------------------------------------------------
// 6. Reusable assertion helpers
// ---------------------------------------------------------------------------

/**
 * Loose deep equality -- works across JSDOM/Node realms where
 * deepStrictEqual fails on structurally identical objects from
 * different JS contexts. Uses JSON round-trip for plain data,
 * falls back to deepStrictEqual for functions/symbols.
 */
function assertDeepEqual(actual, expected, msg) {
  // Fast path: same reference
  if (actual === expected) return;
  // For plain data, JSON round-trip normalizes cross-realm differences
  try {
    assert.deepStrictEqual(actual, expected, msg);
  } catch {
    // Fallback: compare via JSON for structural equality
    const a = JSON.parse(JSON.stringify(actual, replacer));
    const e = JSON.parse(JSON.stringify(expected, replacer));
    assert.deepStrictEqual(a, e, msg);
  }
}

function replacer(key, value) {
  if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
  return value;
}

/**
 * Assert that a mock function was called with specific args.
 * Replaces Jest's expect(fn).toHaveBeenCalledWith(...)
 */
function assertCalledWith(mockFn, ...expectedArgs) {
  const calls = mockFn.mock.calls;
  assert.ok(calls.length > 0, `Expected mock to have been called, but it was not`);
  const lastCall = calls[calls.length - 1].arguments;
  assertDeepEqual([...lastCall], expectedArgs);
}

/**
 * Assert a mock was called N times.
 */
function assertCallCount(mockFn, expected) {
  assert.strictEqual(mockFn.mock.callCount(), expected,
    `Expected ${expected} calls, got ${mockFn.mock.callCount()}`);
}

/**
 * Assert a mock was never called.
 */
function assertNotCalled(mockFn) {
  assertCallCount(mockFn, 0);
}

/**
 * Assert that calling fn throws an error matching expectedMessage.
 */
function assertThrows(fn, expectedMessage) {
  assert.throws(fn, (err) => {
    if (expectedMessage instanceof RegExp) return expectedMessage.test(err.message);
    return err.message.includes(expectedMessage);
  });
}

/**
 * Assert that calling fn does NOT throw.
 */
function assertNoThrow(fn) {
  assert.doesNotThrow(fn);
}

/**
 * Reset all mock call histories on an object's mock.fn() properties.
 * Walks one level deep.
 */
function resetMocks(obj) {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === 'object' && val.mock && typeof val.mock.resetCalls === 'function') {
      val.mock.resetCalls();
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      resetMocks(val);
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Environment
  window,
  document,
  G2T,

  // Factories
  loadSourceFile,
  createApp,
  installBrowserMocks,
  createChromeMock,
  createTrelloMock,

  // BDD
  scenario,
  scenarioAsync,

  // Assertions
  assertCalledWith,
  assertCallCount,
  assertNotCalled,
  assertThrows,
  assertNoThrow,
  resetMocks,

  assertDeepEqual,

  // Re-exports from node:test for convenience
  describe,
  it,
  before,
  beforeEach,
  afterEach,
  mock,
  assert,
};
