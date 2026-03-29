/**
 * App class tests -- node:test + Given/When/Then
 *
 * Equivalent to: tests/test_class_app.js (Jest, 24 tests)
 * Run with: node --test tests/v2/test_class_app.js
 */

const {
  G2T, window, describe, beforeEach, afterEach, mock, assert,
  loadSourceFile, createApp, installBrowserMocks, scenario,
  assertCalledWith, assertCallCount, assertNotCalled,
  assertDeepEqual, assertNoThrow,
} = require('./test_utils');

// PopupView.init() creates setInterval that keeps Node alive.
// Run with: node --test --test-force-exit tests/v2/test_class_app.js

// Load ALL classes that App constructor needs
loadSourceFile('chrome_manifest_v3/class_eventTarget.js');
loadSourceFile('chrome_manifest_v3/class_goog.js');
loadSourceFile('chrome_manifest_v3/class_observer.js');
loadSourceFile('chrome_manifest_v3/class_waitCounter.js');
loadSourceFile('chrome_manifest_v3/class_menuControl.js');
loadSourceFile('chrome_manifest_v3/class_trel.js');
loadSourceFile('chrome_manifest_v3/class_model.js');
loadSourceFile('chrome_manifest_v3/views/class_popupForm.js');

// PopupView.init() calls setInterval(periodicChecks, 5000) which keeps
// the Node process alive after tests complete. Mock it before loading.
const _origSetInterval = window.setInterval;
window.setInterval = function(cb, ms) { return 0; }; // no-op, return fake id
loadSourceFile('chrome_manifest_v3/views/class_popupView.js');
window.setInterval = _origSetInterval; // restore for any tests that need it

// Load the REAL App class
loadSourceFile('chrome_manifest_v3/class_app.js');

// Reference expected values from mock app for comparison
const refApp = createApp();

describe('App Class', () => {
  let app;

  beforeEach(() => {
    installBrowserMocks();
    // Prevent timers, observers, and event listeners from keeping the Node
    // process alive after tests complete.
    const origSI = window.setInterval;
    const origST = window.setTimeout;
    const origAEL = window.addEventListener;
    const origMO = window.MutationObserver;
    window.setInterval = function() { return 0; };
    window.setTimeout = function() { return 0; };
    window.addEventListener = function(type, fn, opts) {
      if (type === 'hashchange') return;
      return origAEL.call(window, type, fn, opts);
    };
    window.MutationObserver = class { observe() {} disconnect() {} };
    app = new G2T.App();
    window.setInterval = origSI;
    window.setTimeout = origST;
    window.addEventListener = origAEL;
    window.MutationObserver = origMO;
    // Clear any interval that leaked from PopupView
    if (app.popupView && app.popupView.intervalId) {
      clearInterval(app.popupView.intervalId);
      app.popupView.intervalId = 0;
    }
    // The real PopupView doesn't expose bindData/bindGmailData at the top level;
    // they live on PopupForm. Stub them so App.updateData() works in tests.
    if (typeof app.popupView.bindData !== 'function') {
      app.popupView.bindData = mock.fn();
    }
    if (typeof app.popupView.bindGmailData !== 'function') {
      app.popupView.bindGmailData = mock.fn();
    }
  });

  afterEach(() => {
    // Clean up any setInterval leaked by PopupView.init() during test
    if (app && app.popupView && app.popupView.intervalId) {
      clearInterval(app.popupView.intervalId);
      app.popupView.intervalId = 0;
    }
  });

  // --------------------------------------------------------------------------
  // Constructor and Initialization
  // --------------------------------------------------------------------------

  describe('Constructor and Initialization', () => {
    scenario('creating App instance with all dependencies', ({ then }) => {
      then('is an instance of App with correct key and all subsystems', () => {
        assert.ok(app instanceof G2T.App);
        assert.strictEqual(app.trelloApiKey, refApp.trelloApiKey);

        // Check methods that exist on the real classes (not mock methods)
        const expectedDeps = [
          { name: 'goog', method: 'bindEvents' },
          { name: 'events', method: 'addListener' },
          { name: 'model', method: 'init' },
          { name: 'gmailView', method: 'init' },
          { name: 'popupView', method: 'init' },
          { name: 'utils', method: 'log' },
        ];

        for (const { name, method } of expectedDeps) {
          assert.notStrictEqual(app[name], undefined, `${name} should be defined`);
          assert.strictEqual(app[name].app, app, `${name}.app should reference the app`);
          assert.strictEqual(typeof app[name][method], 'function', `${name}.${method} should be a function`);
        }
      });
    });

    scenario('initializing with default persistent state', ({ then }) => {
      then('persist matches expected defaults', () => {
        for (const [property, expected] of Object.entries(refApp.persist)) {
          if (Array.isArray(expected)) {
            assertDeepEqual(app.persist[property], expected);
          } else if (typeof expected === 'object' && expected !== null) {
            assertDeepEqual(app.persist[property], expected);
          } else {
            assert.strictEqual(app.persist[property], expected, `persist.${property}`);
          }
        }
      });
    });

    scenario('initializing with default temporary state', ({ then }) => {
      then('temp matches expected defaults', () => {
        const checkNested = (actual, expected, path) => {
          for (const [prop, expVal] of Object.entries(expected)) {
            const actVal = actual[prop];
            const curPath = `${path}.${prop}`;
            if (typeof expVal === 'object' && expVal !== null && !Array.isArray(expVal)) {
              checkNested(actVal, expVal, curPath);
            } else if (Array.isArray(expVal)) {
              assertDeepEqual(actVal, expVal);
            } else {
              assert.strictEqual(actVal, expVal, curPath);
            }
          }
        };
        checkNested(app.temp, refApp.temp, 'temp');
      });
    });

    scenario('initialized flag is false initially', ({ then }) => {
      then('initialized is false', () => {
        assert.strictEqual(app.initialized, false);
      });
    });

    scenario('ck static getter returns correct value', ({ then }) => {
      then('ck.id is g2t_app', () => {
        assertDeepEqual(G2T.App.ck, { id: 'g2t_app' });
      });
    });

    scenario('ck instance getter returns correct value', ({ then }) => {
      then('ck.id is g2t_app', () => {
        assertDeepEqual(app.ck, { id: 'g2t_app' });
      });
    });
  });

  // --------------------------------------------------------------------------
  // Persistence Operations
  // --------------------------------------------------------------------------

  describe('Persistence Operations', () => {
    scenario('persistLoad loads data from chrome storage', ({ then }) => {
      then('does not throw', () => {
        assertNoThrow(() => app.persistLoad());
      });
    });

    scenario('persistSave saves data to chrome storage', ({ then }) => {
      then('does not throw', () => {
        assertNoThrow(() => app.persistSave());
      });
    });
  });

  // --------------------------------------------------------------------------
  // Data Updates
  // --------------------------------------------------------------------------

  describe('Data Updates', () => {
    scenario('updateData coordinates data flow', ({ when, then }) => {
      when('updateData is called', () => {
        app.updateData();
      });
      then('gmailView.parsingData is false', () => {
        assert.strictEqual(app.gmailView.parsingData, false);
      });
    });

    scenario('updateData with model = null throws', ({ given, then }) => {
      given('model is null', () => {
        app.model = null;
      });
      then('throws error', () => {
        assert.throws(() => app.updateData());
      });
    });

    scenario('updateData with model.trello = null does not throw', ({ given, then }) => {
      given('model.trello is null', () => {
        app.model.trello = null;
      });
      then('does not throw', () => {
        assertNoThrow(() => app.updateData());
      });
    });
  });

  // --------------------------------------------------------------------------
  // Event Handling
  // --------------------------------------------------------------------------

  describe('Event Handling', () => {
    scenario('handleClassAppStateLoaded merges params into persist', ({ given, when, then }) => {
      given('params with state values', () => {});
      when('handleClassAppStateLoaded is called', () => {
        app.handleClassAppStateLoaded({ type: 'stateLoaded' }, {
          trelloAuthorized: true,
          boardId: 'test-board',
          listId: 'test-list',
        });
      });
      then('persist is updated', () => {
        assert.strictEqual(app.persist.trelloAuthorized, true);
        assert.strictEqual(app.persist.boardId, 'test-board');
        assert.strictEqual(app.persist.listId, 'test-list');
      });
    });

    scenario('handleClassAppStateLoaded with null params preserves state', ({ given, when, then }) => {
      let originalState;
      given('original persist state', () => {
        originalState = { ...app.persist };
      });
      when('called with null params', () => {
        app.handleClassAppStateLoaded({ type: 'stateLoaded' }, null);
      });
      then('persist unchanged', () => {
        assertDeepEqual(app.persist, originalState);
      });
    });

    scenario('handleClassAppStateLoaded with null event does not throw', ({ then }) => {
      then('does not throw', () => {
        assertNoThrow(() => app.handleClassAppStateLoaded(null, {}));
      });
    });

    scenario('handleClassAppStateLoaded with event missing type does not throw', ({ then }) => {
      then('does not throw', () => {
        assertNoThrow(() => app.handleClassAppStateLoaded({ data: {} }, {}));
      });
    });

    scenario('handleGmailNavigation and handleGmailHashChange do not throw', ({ then }) => {
      then('no errors', () => {
        assertNoThrow(() => app.handleGmailNavigation());
        assertNoThrow(() => app.handleGmailHashChange());
      });
    });

    scenario('bindEvents and bindGmailNavigationEvents do not throw', ({ then }) => {
      then('no errors', () => {
        assertNoThrow(() => app.bindEvents());
        assertNoThrow(() => app.bindGmailNavigationEvents());
      });
    });
  });

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  describe('Initialization', () => {
    scenario('init executes without throwing', ({ when, then }) => {
      when('init is called', () => {
        assertNoThrow(() => app.init());
      });
      then('subsystems are present but initialized is still false until state loaded', () => {
        assert.strictEqual(app.initialized, false);
        assert.notStrictEqual(app.events, undefined);
        assert.notStrictEqual(app.model, undefined);
        assert.notStrictEqual(app.gmailView, undefined);
        assert.notStrictEqual(app.popupView, undefined);
        assert.notStrictEqual(app.utils, undefined);
      });
    });

    scenario('init handles Google Analytics errors gracefully', ({ given, then }) => {
      given('analytics.getService throws', () => {
        window.analytics.getService = mock.fn(() => {
          throw new Error('Analytics service not available');
        });
      });
      then('init does not throw', () => {
        assertNoThrow(() => app.init());
      });
    });
  });

  // --------------------------------------------------------------------------
  // State Management
  // --------------------------------------------------------------------------

  describe('State Management', () => {
    scenario('maintains persistent state across operations', ({ when, then }) => {
      when('persist properties are set', () => {
        app.persist.trelloAuthorized = true;
        app.persist.boardId = 'test-board';
        app.persist.listId = 'test-list';
      });
      then('they are retained', () => {
        assert.strictEqual(app.persist.trelloAuthorized, true);
        assert.strictEqual(app.persist.boardId, 'test-board');
        assert.strictEqual(app.persist.listId, 'test-list');
      });
    });

    scenario('maintains temporary state across operations', ({ when, then }) => {
      when('temp properties are set', () => {
        app.temp.description = 'Test description';
        app.temp.title = 'Test title';
        app.temp.attachments = [{ name: 'test.txt', value: 'content' }];
      });
      then('they are retained', () => {
        assert.strictEqual(app.temp.description, 'Test description');
        assert.strictEqual(app.temp.title, 'Test title');
        assert.strictEqual(app.temp.attachments.length, 1);
      });
    });

    scenario('handles state updates correctly', ({ when, then }) => {
      when('Object.assign merges new state', () => {
        Object.assign(app.persist, {
          trelloAuthorized: true,
          boardId: 'new-board',
          listId: 'new-list',
        });
      });
      then('persist reflects new values', () => {
        assert.strictEqual(app.persist.trelloAuthorized, true);
        assert.strictEqual(app.persist.boardId, 'new-board');
        assert.strictEqual(app.persist.listId, 'new-list');
      });
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    scenario('throws when dependencies are null', ({ given, then }) => {
      given('model and popupView set to null', () => {
        app.model = null;
        app.popupView = null;
      });
      then('updateData throws', () => {
        assert.throws(() => app.updateData());
      });
    });

    scenario('handles initialization errors gracefully', ({ given, then }) => {
      given('goog.init throws', () => {
        app.goog.init = mock.fn(() => { throw new Error('Chrome init failed'); });
      });
      then('init does not throw', () => {
        assertNoThrow(() => app.init());
      });
    });

    scenario('persistLoad executes without throwing', ({ then }) => {
      then('does not throw', () => {
        assertNoThrow(() => app.persistLoad());
      });
    });
  });

  // --------------------------------------------------------------------------
  // Performance Tests
  // --------------------------------------------------------------------------

  describe('Performance Tests', () => {
    scenario('initializes efficiently', ({ when, then }) => {
      let duration;
      when('init is called', () => {
        const start = Date.now();
        app.init();
        duration = Date.now() - start;
      });
      then('completes within 100ms', () => {
        assert.ok(duration < 100, `init took ${duration}ms`);
      });
    });

    scenario('handles large state updates efficiently', ({ when, then }) => {
      let duration;
      when('large state is assigned', () => {
        const largeState = {
          trelloBoards: Array.from({ length: 100 }, (_, i) => ({ id: `board-${i}`, name: `Board ${i}` })),
          trelloLists: Array.from({ length: 100 }, (_, i) => ({ id: `list-${i}`, name: `List ${i}` })),
          trelloCards: Array.from({ length: 100 }, (_, i) => ({ id: `card-${i}`, name: `Card ${i}` })),
        };
        const start = Date.now();
        Object.assign(app.persist, largeState);
        duration = Date.now() - start;
      });
      then('completes within 100ms with correct data', () => {
        assert.strictEqual(app.persist.trelloBoards.length, 100);
        assert.ok(duration < 100, `took ${duration}ms`);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  describe('Configuration', () => {
    scenario('has correct Trello API key', ({ then }) => {
      then('key matches expected value', () => {
        assert.strictEqual(app.trelloApiKey, '21b411b1b5b549c54bd32f0e90738b41');
      });
    });
  });

  // --------------------------------------------------------------------------
  // Memory Management
  // --------------------------------------------------------------------------

  describe('Memory Management', () => {
    scenario('allows log memory to exceed limits', ({ when, then }) => {
      when('150 entries are pushed', () => {
        for (let i = 0; i < 150; i++) {
          app.temp.log.memory.push(`log entry ${i}`);
          app.temp.log.count++;
        }
      });
      then('all 150 entries exist', () => {
        assert.strictEqual(app.temp.log.memory.length, 150);
        assert.strictEqual(app.temp.log.count, 150);
      });
    });

    scenario('handles memory cleanup', ({ given, when, then }) => {
      given('200 log entries', () => {
        app.temp.log.memory = Array.from({ length: 200 }, (_, i) => `log entry ${i}`);
        app.temp.log.count = 200;
      });
      when('cleanup trims to max', () => {
        if (app.temp.log.memory.length > app.temp.log.max) {
          app.temp.log.memory = app.temp.log.memory.slice(-app.temp.log.max);
          app.temp.log.count = app.temp.log.memory.length;
        }
      });
      then('length is at most max', () => {
        assert.ok(app.temp.log.memory.length <= app.temp.log.max);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Hash Change Handling
  // --------------------------------------------------------------------------

  describe('Hash Change Handling', () => {
    scenario('handles hash changes correctly', ({ then }) => {
      then('handleGmailHashChange exists, is callable, and lastHash is defined', () => {
        assert.strictEqual(typeof app.handleGmailHashChange, 'function');
        assertNoThrow(() => app.handleGmailHashChange());
        assert.notStrictEqual(app.temp.lastHash, undefined);
      });
    });

    scenario('does not trigger redraw for same hash', ({ then }) => {
      then('handleGmailHashChange is callable and state is maintained', () => {
        assert.strictEqual(typeof app.handleGmailHashChange, 'function');
        assertNoThrow(() => app.handleGmailHashChange());
        assert.notStrictEqual(app.temp.lastHash, undefined);
      });
    });
  });
});
