/**
 * Observer class tests -- node:test + Given/When/Then
 *
 * Run with: node --test tests/v2/test_class_observer.js
 */

const {
  window, document, G2T,
  describe, beforeEach, afterEach, mock, assert,
  loadSourceFile, createApp, scenario,
  assertCalledWith, assertCallCount, assertNotCalled, assertNoThrow,
} = require('./test_utils');

// ---------------------------------------------------------------------------
// Mock MutationObserver before loading Observer source
// ---------------------------------------------------------------------------

const mockObserverInstances = [];

window.MutationObserver = class MockMutationObserver {
  constructor(callback) {
    this.callback = callback;
    this.observing = false;
    this.target = null;
    this.options = null;
    mockObserverInstances.push(this);
  }
  observe(target, options) {
    this.observing = true;
    this.target = target;
    this.options = options;
  }
  disconnect() {
    this.observing = false;
  }
  // Helper to simulate mutations
  trigger(mutations) {
    this.callback(mutations, this);
  }
};

// Load the Observer class
loadSourceFile('chrome_manifest_v3/class_observer.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a fake toolbar element matching the Gmail toolbar selector [gh="mtb"]
 * and insert it into the DOM inside a [role="main"] scope element.
 */
function setupToolbarDOM() {
  // Create scope element
  let scope = document.querySelector('[role="main"]');
  if (!scope) {
    scope = document.createElement('div');
    scope.setAttribute('role', 'main');
    document.body.appendChild(scope);
  }
  // Create toolbar element
  let toolbar = document.querySelector('[gh="mtb"]');
  if (!toolbar) {
    toolbar = document.createElement('div');
    toolbar.setAttribute('gh', 'mtb');
    scope.appendChild(toolbar);
  }
  return { scope, toolbar };
}

/**
 * Create a fake content area matching .AO selector.
 */
function setupContentDOM() {
  let content = document.querySelector('.AO');
  if (!content) {
    content = document.createElement('div');
    content.classList.add('AO');
    document.body.appendChild(content);
  }
  return content;
}

/**
 * Build a fake mutation record with toolbar-matching added/removed nodes.
 */
function makeToolbarMutation(type) {
  const node = document.createElement('div');
  node.setAttribute('gh', 'mtb');
  return {
    type: 'childList',
    addedNodes: type === 'added' ? [node] : [],
    removedNodes: type === 'removed' ? [node] : [],
  };
}

/**
 * Build a generic childList mutation record.
 */
function makeGenericMutation() {
  const node = document.createElement('div');
  return {
    type: 'childList',
    addedNodes: [node],
    removedNodes: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Observer Class', () => {
  let app, obs;

  beforeEach(() => {
    // Clear mock observer instances
    mockObserverInstances.length = 0;

    app = createApp();
    obs = new G2T.Observer({ app });
  });

  afterEach(() => {
    // Clean up any active timers via disconnectAll
    try { obs.disconnectAll(); } catch { /* ignore */ }
  });

  // --------------------------------------------------------------------------
  // Constructor and Initialization
  // --------------------------------------------------------------------------

  describe('Constructor and Initialization', () => {
    scenario('creates with app dependency', ({ given, when, then }) => {
      let observer;
      given('an app instance', () => {});
      when('Observer is constructed with { app }', () => {
        observer = new G2T.Observer({ app });
      });
      then('it stores the app reference', () => {
        assert.strictEqual(observer.app, app);
      });
    });

    scenario('initializes with null observers and false connected flags', ({ given, when, then }) => {
      given('a freshly constructed Observer', () => {});
      then('observers.toolbar is null', () => {
        assert.strictEqual(obs.observers.toolbar, null);
      });
      then('observers.content is null', () => {
        assert.strictEqual(obs.observers.content, null);
      });
      then('connected.toolbar is false', () => {
        assert.strictEqual(obs.connected.toolbar, false);
      });
      then('connected.content is false', () => {
        assert.strictEqual(obs.connected.content, false);
      });
    });

    scenario('init() sets up without error', ({ when, then }) => {
      when('init() is called', () => {
        assertNoThrow(() => obs.init());
      });
      then('no error is thrown', () => { /* covered by when */ });
    });
  });

  // --------------------------------------------------------------------------
  // observeToolbar
  // --------------------------------------------------------------------------

  describe('observeToolbar', () => {
    scenario('creates MutationObserver when called', ({ given, when, then }) => {
      given('DOM with a [role="main"] scope', () => {
        setupToolbarDOM();
      });
      when('observeToolbar is called', () => {
        obs.observeToolbar();
      });
      then('a new MutationObserver instance is created', () => {
        assert.strictEqual(mockObserverInstances.length, 1);
      });
      then('the observer is stored on obs.observers.toolbar', () => {
        assert.ok(obs.observers.toolbar !== null);
      });
    });

    scenario('sets connected.toolbar to true', ({ given, when, then }) => {
      given('DOM with a [role="main"] scope', () => {
        setupToolbarDOM();
      });
      when('observeToolbar is called', () => {
        obs.observeToolbar();
      });
      then('connected.toolbar is true', () => {
        assert.strictEqual(obs.connected.toolbar, true);
      });
    });

    scenario('observes correct target element', ({ given, when, then }) => {
      let scope;
      given('DOM with a [role="main"] scope', () => {
        const dom = setupToolbarDOM();
        scope = dom.scope;
      });
      when('observeToolbar is called', () => {
        obs.observeToolbar();
      });
      then('the observer targets the [role="main"] element', () => {
        const instance = mockObserverInstances[0];
        assert.strictEqual(instance.target, scope);
      });
      then('observation config includes childList and subtree', () => {
        const instance = mockObserverInstances[0];
        assert.strictEqual(instance.options.childList, true);
        assert.strictEqual(instance.options.subtree, true);
        assert.strictEqual(instance.options.attributes, false);
      });
    });

    scenario('does not create duplicate observer if already connected', ({ given, when, then }) => {
      given('observeToolbar has already been called', () => {
        setupToolbarDOM();
        obs.observeToolbar();
      });
      when('observeToolbar is called again', () => {
        obs.observeToolbar();
      });
      then('no second MutationObserver is created', () => {
        assert.strictEqual(mockObserverInstances.length, 1);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Debouncing
  // --------------------------------------------------------------------------

  describe('Debouncing', () => {
    scenario('toolbar debounce waits 250ms before emitting', ({ given, when, then }) => {
      given('a toolbar observer is active', () => {
        setupToolbarDOM();
        mock.timers.enable({ apis: ['setTimeout'] });
        obs.observeToolbar();
      });
      when('a toolbar mutation is triggered', () => {
        const instance = mockObserverInstances[0];
        instance.trigger([makeToolbarMutation('added')]);
      });
      then('no event is emitted immediately', () => {
        assertNotCalled(app.events.emit);
      });
      when('249ms pass', () => {
        mock.timers.tick(249);
      });
      then('still no event emitted', () => {
        assertNotCalled(app.events.emit);
      });
      when('1 more ms passes (total 250ms)', () => {
        mock.timers.tick(1);
      });
      then('toolbarChanged event is emitted', () => {
        assertCallCount(app.events.emit, 1);
        assertCalledWith(app.events.emit, 'toolbarChanged');
      });
      // Cleanup fake timers
      then('cleanup', () => {
        mock.timers.reset();
      });
    });

    scenario('content debounce waits 500ms before emitting', ({ given, when, then }) => {
      given('a content observer is active', () => {
        setupContentDOM();
        mock.timers.enable({ apis: ['setTimeout'] });
        obs.observeContent();
        obs.connected.content = true;
      });
      when('a content mutation is triggered', () => {
        const instance = mockObserverInstances[0];
        instance.trigger([makeGenericMutation()]);
      });
      then('no event is emitted immediately', () => {
        assertNotCalled(app.events.emit);
      });
      when('499ms pass', () => {
        mock.timers.tick(499);
      });
      then('still no event emitted', () => {
        assertNotCalled(app.events.emit);
      });
      when('1 more ms passes (total 500ms)', () => {
        mock.timers.tick(1);
      });
      then('contentChanged event is emitted', () => {
        assertCallCount(app.events.emit, 1);
        assertCalledWith(app.events.emit, 'contentChanged');
      });
      then('cleanup', () => {
        mock.timers.reset();
      });
    });

    scenario('rapid mutations coalesce to single emit', ({ given, when, then }) => {
      given('a toolbar observer is active with fake timers', () => {
        setupToolbarDOM();
        mock.timers.enable({ apis: ['setTimeout'] });
        obs.observeToolbar();
      });
      when('three rapid toolbar mutations fire within 100ms', () => {
        const instance = mockObserverInstances[0];
        instance.trigger([makeToolbarMutation('added')]);
        mock.timers.tick(50);
        instance.trigger([makeToolbarMutation('removed')]);
        mock.timers.tick(50);
        instance.trigger([makeToolbarMutation('added')]);
      });
      when('250ms pass after the last mutation', () => {
        mock.timers.tick(250);
      });
      then('only one toolbarChanged event is emitted', () => {
        assertCallCount(app.events.emit, 1);
        assertCalledWith(app.events.emit, 'toolbarChanged');
      });
      then('cleanup', () => {
        mock.timers.reset();
      });
    });

    scenario('new mutation resets debounce timer', ({ given, when, then }) => {
      given('a toolbar observer is active with fake timers', () => {
        setupToolbarDOM();
        mock.timers.enable({ apis: ['setTimeout'] });
        obs.observeToolbar();
      });
      when('a mutation fires and 200ms pass', () => {
        const instance = mockObserverInstances[0];
        instance.trigger([makeToolbarMutation('added')]);
        mock.timers.tick(200);
      });
      then('no event emitted yet', () => {
        assertNotCalled(app.events.emit);
      });
      when('another mutation fires (resets timer)', () => {
        const instance = mockObserverInstances[0];
        instance.trigger([makeToolbarMutation('added')]);
      });
      when('200ms more pass (400ms since first, 200ms since second)', () => {
        mock.timers.tick(200);
      });
      then('still no event emitted (timer was reset)', () => {
        assertNotCalled(app.events.emit);
      });
      when('50 more ms pass (250ms since second mutation)', () => {
        mock.timers.tick(50);
      });
      then('now toolbarChanged fires', () => {
        assertCallCount(app.events.emit, 1);
      });
      then('cleanup', () => {
        mock.timers.reset();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Disconnect
  // --------------------------------------------------------------------------

  describe('Disconnect', () => {
    scenario('disconnect sets connected flag to false', ({ given, when, then }) => {
      given('a toolbar observer is active', () => {
        setupToolbarDOM();
        obs.observeToolbar();
        assert.strictEqual(obs.connected.toolbar, true);
      });
      when('disconnect("toolbar") is called', () => {
        obs.disconnect('toolbar');
      });
      then('connected.toolbar is false', () => {
        assert.strictEqual(obs.connected.toolbar, false);
      });
      then('observers.toolbar is null', () => {
        assert.strictEqual(obs.observers.toolbar, null);
      });
    });

    scenario('disconnect clears debounce timer', ({ given, when, then }) => {
      given('a toolbar observer with a pending debounce', () => {
        setupToolbarDOM();
        mock.timers.enable({ apis: ['setTimeout'] });
        obs.observeToolbar();
        const instance = mockObserverInstances[0];
        instance.trigger([makeToolbarMutation('added')]);
        // Timer is now pending
        assert.ok(obs.debounceTimers.toolbar !== null);
      });
      when('disconnect("toolbar") is called', () => {
        obs.disconnect('toolbar');
      });
      then('the debounce timer is cleared', () => {
        assert.strictEqual(obs.debounceTimers.toolbar, null);
      });
      when('the debounce period elapses', () => {
        mock.timers.tick(500);
      });
      then('no event is emitted', () => {
        assertNotCalled(app.events.emit);
      });
      then('cleanup', () => {
        mock.timers.reset();
      });
    });

    scenario('disconnectAll disconnects both observers', ({ given, when, then }) => {
      given('both toolbar and content observers are active', () => {
        setupToolbarDOM();
        setupContentDOM();
        obs.observeToolbar();
        obs.observeContent();
        obs.connected.content = true;
      });
      when('disconnectAll is called', () => {
        obs.disconnectAll();
      });
      then('both connected flags are false', () => {
        assert.strictEqual(obs.connected.toolbar, false);
        assert.strictEqual(obs.connected.content, false);
      });
      then('both observers are null', () => {
        assert.strictEqual(obs.observers.toolbar, null);
        assert.strictEqual(obs.observers.content, null);
      });
    });

    scenario('callback after disconnect does not emit', ({ given, when, then }) => {
      given('a toolbar observer that is then disconnected', () => {
        setupToolbarDOM();
        mock.timers.enable({ apis: ['setTimeout'] });
        obs.observeToolbar();
        obs.disconnect('toolbar');
      });
      when('handleToolbarMutations is called directly', () => {
        obs.handleToolbarMutations([makeToolbarMutation('added')]);
      });
      when('time passes beyond debounce', () => {
        mock.timers.tick(500);
      });
      then('no event is emitted', () => {
        assertNotCalled(app.events.emit);
      });
      then('cleanup', () => {
        mock.timers.reset();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Guard Patterns
  // --------------------------------------------------------------------------

  describe('Guard Patterns', () => {
    scenario('callback with null app does not crash', ({ given, when, then }) => {
      given('an observer with app set to null', () => {
        obs.connected.toolbar = true;
        obs.app = null;
      });
      when('handleToolbarMutations is called', () => {
        assertNoThrow(() => {
          obs.handleToolbarMutations([makeToolbarMutation('added')]);
        });
      });
      then('no crash occurs', () => { /* covered by when */ });
    });

    scenario('callback when not connected returns early', ({ given, when, then }) => {
      given('an observer with connected.toolbar = false', () => {
        mock.timers.enable({ apis: ['setTimeout'] });
        obs.connected.toolbar = false;
      });
      when('handleToolbarMutations is called with matching mutations', () => {
        obs.handleToolbarMutations([makeToolbarMutation('added')]);
      });
      when('debounce time elapses', () => {
        mock.timers.tick(500);
      });
      then('no event is emitted', () => {
        assertNotCalled(app.events.emit);
      });
      then('cleanup', () => {
        mock.timers.reset();
      });
    });

    scenario('callback with missing app.events does not crash', ({ given, when, then }) => {
      given('an observer with app.events set to null', () => {
        obs.connected.toolbar = true;
        obs.app.events = null;
      });
      when('handleToolbarMutations is called', () => {
        assertNoThrow(() => {
          obs.handleToolbarMutations([makeToolbarMutation('added')]);
        });
      });
      then('no crash occurs', () => { /* covered by when */ });
    });
  });
});
