/**
 * Step definitions for Observer class tests.
 */

const { Given, When, Then, After } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const { sharedWindow, sharedDocument, loadSourceFile, createMockFn } = require('../support/world');

// ---------------------------------------------------------------------------
// Mock MutationObserver
// ---------------------------------------------------------------------------

let mockObserverInstances = [];

function installMockMutationObserver() {
  mockObserverInstances = [];

  sharedWindow.MutationObserver = class MockMutationObserver {
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
    trigger(mutations) {
      this.callback(mutations, this);
    }
  };
}

// Ensure Observer class is loaded (idempotent)
let observerLoaded = false;
function ensureObserverLoaded() {
  if (!observerLoaded) {
    installMockMutationObserver();
    loadSourceFile('chrome_manifest_v3/class_observer.js');
    observerLoaded = true;
  }
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function setupToolbarDOM() {
  let scope = sharedDocument.querySelector('[role="main"]');
  if (!scope) {
    scope = sharedDocument.createElement('div');
    scope.setAttribute('role', 'main');
    sharedDocument.body.appendChild(scope);
  }
  let toolbar = sharedDocument.querySelector('[gh="mtb"]');
  if (!toolbar) {
    toolbar = sharedDocument.createElement('div');
    toolbar.setAttribute('gh', 'mtb');
    scope.appendChild(toolbar);
  }
  return { scope, toolbar };
}

function setupContentDOM() {
  let content = sharedDocument.querySelector('.AO');
  if (!content) {
    content = sharedDocument.createElement('div');
    content.classList.add('AO');
    sharedDocument.body.appendChild(content);
  }
  return content;
}

function makeToolbarMutation(type) {
  const node = sharedDocument.createElement('div');
  node.setAttribute('gh', 'mtb');
  return {
    type: 'childList',
    addedNodes: type === 'added' ? [node] : [],
    removedNodes: type === 'removed' ? [node] : [],
  };
}

function makeGenericMutation() {
  const node = sharedDocument.createElement('div');
  return {
    type: 'childList',
    addedNodes: [node],
    removedNodes: [],
  };
}

// ---------------------------------------------------------------------------
// Fake timer support
// ---------------------------------------------------------------------------

let fakeTimerActive = false;
let timerIdCounter = 1;
let pendingTimers = [];
let currentFakeTime = 0;

// Use Node.js native timers (not JSDOM's) as the "real" ones for restore
const nodeTimers = require('node:timers');
const _trueSetTimeout = nodeTimers.setTimeout;
const _trueClearTimeout = nodeTimers.clearTimeout;

function enableFakeTimers() {
  fakeTimerActive = true;
  pendingTimers = [];
  currentFakeTime = 0;
  timerIdCounter = 1;

  sharedWindow.setTimeout = function (fn, ms) {
    const id = timerIdCounter++;
    pendingTimers.push({ id, fn, fireAt: currentFakeTime + (ms || 0) });
    return id;
  };

  sharedWindow.clearTimeout = function (id) {
    pendingTimers = pendingTimers.filter(t => t.id !== id);
  };

  // Also override global
  global.setTimeout = sharedWindow.setTimeout;
  global.clearTimeout = sharedWindow.clearTimeout;
}

function tickFakeTimers(ms) {
  currentFakeTime += ms;
  // Fire timers that should have fired by now, in order
  let fired = true;
  while (fired) {
    fired = false;
    for (let i = 0; i < pendingTimers.length; i++) {
      if (pendingTimers[i].fireAt <= currentFakeTime) {
        const timer = pendingTimers.splice(i, 1)[0];
        timer.fn();
        fired = true;
        break; // restart loop since array changed
      }
    }
  }
}

function disableFakeTimers() {
  if (fakeTimerActive) {
    // Restore using Node.js native timers to avoid JSDOM wrapper recursion
    sharedWindow.setTimeout = _trueSetTimeout;
    sharedWindow.clearTimeout = _trueClearTimeout;
    global.setTimeout = _trueSetTimeout;
    global.clearTimeout = _trueClearTimeout;
  }
  fakeTimerActive = false;
  pendingTimers = [];
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

After(function () {
  disableFakeTimers();
  // Clean up observer
  if (this.instance && typeof this.instance.disconnectAll === 'function') {
    try { this.instance.disconnectAll(); } catch { /* ignore */ }
  }
});

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

Given('a mock MutationObserver is installed', function () {
  ensureObserverLoaded();
  installMockMutationObserver();
});

Given('the DOM has a toolbar scope element', function () {
  this._toolbarDOM = setupToolbarDOM();
});

Given('the DOM has a content area element', function () {
  setupContentDOM();
});

Given('fake timers are enabled', function () {
  enableFakeTimers();
});

Given('observeToolbar has already been called', function () {
  this.instance.observeToolbar();
});

Given('observeToolbar has been called', function () {
  this.instance.observeToolbar();
});

Given('observeContent has been called', function () {
  this.instance.observeContent();
  this.instance.connected.content = true;
});

Given('a toolbar mutation has been triggered', function () {
  const inst = mockObserverInstances[0];
  inst.trigger([makeToolbarMutation('added')]);
  assert.ok(this.instance.debounceTimers.toolbar !== null);
});

Given('disconnect has been called with {string}', function (type) {
  this.instance.disconnect(type);
});

Given('connected.toolbar is set to true on the observer', function () {
  this.instance.connected.toolbar = true;
});

Given('connected.toolbar is set to false on the observer', function () {
  this.instance.connected.toolbar = false;
});

Given('the observer app is set to null', function () {
  this.instance.app = null;
});

Given('the observer app.events is set to null', function () {
  this.instance.app.events = null;
});

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('init\\() is called on the observer', function () {
  try {
    this.instance.init();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('observeToolbar is called', function () {
  this.instance.observeToolbar();
});

When('a toolbar mutation is triggered with type {string}', function (type) {
  const inst = mockObserverInstances[mockObserverInstances.length - 1];
  inst.trigger([makeToolbarMutation(type)]);
});

When('a generic content mutation is triggered', function () {
  const inst = mockObserverInstances[mockObserverInstances.length - 1];
  inst.trigger([makeGenericMutation()]);
});

When('{int}ms pass on fake timers', function (ms) {
  tickFakeTimers(ms);
});

When('{int}ms passes on fake timers', function (ms) {
  tickFakeTimers(ms);
});

When('disconnect is called with {string}', function (type) {
  this.instance.disconnect(type);
});

When('disconnectAll is called', function () {
  this.instance.disconnectAll();
});

When('handleToolbarMutations is called directly with type {string}', function (type) {
  try {
    this.instance.handleToolbarMutations([makeToolbarMutation(type)]);
    if (!this.error) this.error = null;
  } catch (e) {
    this.error = e;
  }
});

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then('observers.toolbar is null', function () {
  assert.strictEqual(this.instance.observers.toolbar, null);
});

Then('observers.content is null', function () {
  assert.strictEqual(this.instance.observers.content, null);
});

Then('observers.toolbar is not null', function () {
  assert.ok(this.instance.observers.toolbar !== null);
});

Then('connected.toolbar is false', function () {
  assert.strictEqual(this.instance.connected.toolbar, false);
});

Then('connected.content is false', function () {
  assert.strictEqual(this.instance.connected.content, false);
});

Then('connected.toolbar is true', function () {
  assert.strictEqual(this.instance.connected.toolbar, true);
});

Then('a new MutationObserver instance is created', function () {
  assert.strictEqual(mockObserverInstances.length, 1);
});

Then('only one MutationObserver instance exists', function () {
  assert.strictEqual(mockObserverInstances.length, 1);
});

Then('the observer targets the scope element', function () {
  const inst = mockObserverInstances[0];
  assert.strictEqual(inst.target, this._toolbarDOM.scope);
});

Then('the observer config has childList true and subtree true and attributes false', function () {
  const inst = mockObserverInstances[0];
  assert.strictEqual(inst.options.childList, true);
  assert.strictEqual(inst.options.subtree, true);
  assert.strictEqual(inst.options.attributes, false);
});

Then('app.events.emit has not been called', function () {
  assert.strictEqual(this.app.events.emit.mock.callCount(), 0,
    `Expected emit not called, but called ${this.app.events.emit.mock.callCount()} times`);
});

Then('app.events.emit was called {int} time(s)', function (count) {
  assert.strictEqual(this.app.events.emit.mock.callCount(), count,
    `Expected emit called ${count} time(s), got ${this.app.events.emit.mock.callCount()}`);
});

Then('app.events.emit was called with event {string}', function (eventName) {
  const calls = this.app.events.emit.mock.calls;
  const found = calls.some((call) => {
    const arg = call.arguments[0];
    if (typeof arg === 'object' && arg.type === eventName) return true;
    if (typeof arg === 'string' && arg === eventName) return true;
    return false;
  });
  assert.ok(found, `Expected emit called with "${eventName}"`);
});

Then('the debounce timer for toolbar is null', function () {
  assert.strictEqual(this.instance.debounceTimers.toolbar, null);
});
