/**
 * Cucumber World for Gmail-2-Trello
 *
 * Ports the JSDOM + jQuery + mock setup from tests/v2/test_utils.js
 * into a Cucumber World class.
 *
 * JSDOM + jQuery are set up ONCE at module level (not per scenario).
 * The World constructor references the shared environment.
 * createApp() creates a fresh mock app per scenario.
 */

const { setWorldConstructor } = require('@cucumber/cucumber');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// 1. JSDOM + jQuery bootstrap (module-level singleton)
// ---------------------------------------------------------------------------

const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../../test_jsdom.html');
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

const sharedWindow = dom.window;
const sharedDocument = sharedWindow.document;

// Load jQuery
const jqueryPath = path.join(__dirname, '../../../chrome_manifest_v3/lib/jquery-3.7.1.min.js');
sharedWindow.eval(fs.readFileSync(jqueryPath, 'utf8'));

if (!sharedWindow.$ || !sharedWindow.jQuery) {
  throw new Error('jQuery failed to load in JSDOM');
}

// Expose jQuery globally for source files that reference free $ / jQuery
global.$ = sharedWindow.$;
global.jQuery = sharedWindow.jQuery;

// ---------------------------------------------------------------------------
// 2. G2T namespace bootstrap -- load class_utils.js to establish G2T
// ---------------------------------------------------------------------------

let G2T = {};

function loadSourceFile(relativePath) {
  const fullPath = path.join(__dirname, '../../..', relativePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  sharedWindow.eval(content);
  // Re-sync namespace after each load
  if (sharedWindow.G2T) G2T = sharedWindow.G2T;
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

function createMockFn(impl) {
  const calls = [];
  const fn = function (...args) {
    calls.push({ arguments: args });
    if (impl) return impl(...args);
  };
  fn.mock = {
    calls,
    callCount() { return calls.length; },
    resetCalls() { calls.length = 0; },
  };
  return fn;
}

function createChromeMock() {
  return {
    storage: {
      sync: { get: createMockFn(), set: createMockFn() },
      local: { get: createMockFn(), set: createMockFn() },
      onChanged: { addListener: createMockFn(), removeListener: createMockFn() },
    },
    runtime: {
      sendMessage: createMockFn(),
      getURL: createMockFn((p) => `chrome-extension://test-id/${p}`),
    },
  };
}

function createTrelloMock() {
  return {
    rest: createMockFn(),
    authorize: createMockFn(),
    deauthorize: createMockFn(),
    authorized: createMockFn(() => false),
    setKey: createMockFn(),
    setToken: createMockFn(),
    key: createMockFn(() => 'test-key'),
    token: createMockFn(() => 'test-token'),
    get: createMockFn(),
    post: createMockFn(),
    put: createMockFn(),
    delete: createMockFn(),
  };
}

function installBrowserMocks() {
  sharedWindow.chrome = createChromeMock();
  global.chrome = sharedWindow.chrome;

  sharedWindow.Trello = createTrelloMock();

  sharedWindow.localStorage = {
    getItem: createMockFn(() => null),
    setItem: createMockFn(),
    removeItem: createMockFn(),
    clear: createMockFn(),
  };
  sharedWindow.sessionStorage = {
    getItem: createMockFn(() => null),
    setItem: createMockFn(),
    removeItem: createMockFn(),
    clear: createMockFn(),
  };

  sharedWindow.fetch = createMockFn(() =>
    Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('<div>Mock</div>') })
  );
  sharedWindow.confirm = createMockFn(() => false);
  sharedWindow.location.reload = createMockFn();
}

// Install once at module level so initial class loading works
installBrowserMocks();

// ---------------------------------------------------------------------------
// 4. Mock App factory
// ---------------------------------------------------------------------------

function createApp() {
  // Load supporting source files (idempotent -- re-eval is fine)
  loadSourceFile('chrome_manifest_v3/lib/jquery-ui-1.14.1.min.js');
  loadSourceFile('chrome_manifest_v3/lib/combo.js');

  // Mock jQuery plugins
  if (sharedWindow.$.fn) {
    sharedWindow.$.fn.button = createMockFn();
    sharedWindow.$.fn.tooltip = createMockFn();
    sharedWindow.$.fn.popover = createMockFn();
    sharedWindow.$.fn.g2t_combobox = createMockFn(function () { return this; });
  }

  const app = {
    trelloApiKey: '21b411b1b5b549c54bd32f0e90738b41',
    initialized: false,

    goog: {
      init: createMockFn(),
      runtimeSendMessage: createMockFn(),
      storageSyncGet: createMockFn(),
      storageSyncSet: createMockFn(),
      runtimeGetURL: createMockFn((p) => `chrome-extension://test-id/${p}`),
    },

    events: {
      addListener: createMockFn(),
      removeListener: createMockFn(),
      emit: createMockFn(),
    },

    model: {
      init: createMockFn(),
      trello: { user: { fullName: 'Test User' } },
      gmail: {},
    },

    gmailView: {
      init: createMockFn(),
      bindData: createMockFn(),
      parseData: createMockFn(() => ({})),
      forceRedraw: createMockFn(),
      parsingData: false,
      preDetect: createMockFn(() => true),
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
        init: createMockFn(),
        bindEvents: createMockFn(),
        bindData: createMockFn(),
        bindGmailData: createMockFn(),
        reset: createMockFn(),
        submit: createMockFn(),
        isInitialized: false,
      },
      finalCreatePopup: createMockFn(),
      displayExtensionInvalidReload: createMockFn(),
      init: createMockFn(),
      bindData: createMockFn(),
      bindGmailData: createMockFn(),
      forceRedraw: createMockFn(),
    },

    gmail: {
      init: createMockFn(),
      ready: false,
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
  app.utils.log = createMockFn();

  return app;
}

// ---------------------------------------------------------------------------
// 5. Custom World
// ---------------------------------------------------------------------------

class G2TWorld {
  constructor({ attach, parameters }) {
    // JSDOM environment (shared singleton)
    this.window = sharedWindow;
    this.document = sharedDocument;

    // G2T namespace (shared, grows as classes are loaded)
    this.G2T = G2T;

    // Per-scenario state (reset in Before hook)
    this.app = null;
    this.instance = null;
    this.result = null;
    this.error = null;
    this.pendingAction = null;

    // Track listeners for event steps
    this._testListeners = {};
  }

  /**
   * Load a JS source file into the shared JSDOM environment.
   * @param {string} relativePath - Path relative to project root
   */
  loadSourceFile(relativePath) {
    return loadSourceFile(relativePath);
  }

  /**
   * Create a fresh mock app with all dependencies.
   */
  createApp() {
    return createApp();
  }

  /**
   * Install/reset browser mocks (Chrome, Trello, localStorage, etc.)
   */
  installBrowserMocks() {
    installBrowserMocks();
  }
}

setWorldConstructor(G2TWorld);

// Export shared pieces for use by step definitions
module.exports = {
  G2T,
  sharedWindow,
  sharedDocument,
  loadSourceFile,
  createApp,
  installBrowserMocks,
  createMockFn,
};
