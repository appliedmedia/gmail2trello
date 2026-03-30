/**
 * Step definitions for Gmail adapter class tests.
 */

const { Given, When, Then, After } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const { sharedWindow, sharedDocument, loadSourceFile, createMockFn } = require('../support/world');

// Ensure Gmail class is loaded (idempotent)
let gmailLoaded = false;
function ensureGmailLoaded() {
  if (!gmailLoaded) {
    loadSourceFile('chrome_manifest_v3/class_gmail.js');
    gmailLoaded = true;
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

After(function () {
  // Clean up any event listeners we added
  if (this._gmailEventCleanup) {
    this._gmailEventCleanup();
    this._gmailEventCleanup = null;
  }
});

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

Given('a fresh Gmail adapter', function () {
  ensureGmailLoaded();

  // Reset emit mock for tracking
  this.app.events.emit = createMockFn();

  this.instance = new this.G2T.Gmail({ app: this.app });

  // Track emitted events for detailed assertions
  this._emittedEvents = {};
  const origEmit = this.app.events.emit;
  this.app.events.emit = createMockFn(function (eventName, data) {
    origEmit(eventName, data);
    this._emittedEvents[eventName] = data;
  }.bind(this));
});

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('init is called on the gmail adapter', function () {
  try {
    this.instance.init();
    // Store cleanup reference for After hook
    this._gmailEventCleanup = () => {
      if (this.instance._gmailEventHandler) {
        sharedDocument.removeEventListener('g2t_gmail_event', this.instance._gmailEventHandler);
      }
    };
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('a g2t_gmail_event is dispatched with type {string} and userEmail {string}', function (type, userEmail) {
  // init the adapter so it listens
  this.instance.init();
  // Store cleanup reference for After hook
  this._gmailEventCleanup = () => {
    if (this.instance._gmailEventHandler) {
      sharedDocument.removeEventListener('g2t_gmail_event', this.instance._gmailEventHandler);
    }
  };

  // Reset mock calls before the action so we only check fresh emits
  this.app.events.emit.mock.resetCalls();

  const event = new sharedWindow.CustomEvent('g2t_gmail_event', {
    detail: { type, userEmail },
  });
  sharedDocument.dispatchEvent(event);
});

When('a g2t_gmail_event is dispatched with type {string}', function (type) {
  // init the adapter so it listens
  this.instance.init();
  // Store cleanup reference for After hook
  this._gmailEventCleanup = () => {
    if (this.instance._gmailEventHandler) {
      sharedDocument.removeEventListener('g2t_gmail_event', this.instance._gmailEventHandler);
    }
  };

  // Reset mock calls before the action so we only check fresh emits
  this.app.events.emit.mock.resetCalls();

  const event = new sharedWindow.CustomEvent('g2t_gmail_event', {
    detail: { type },
  });
  sharedDocument.dispatchEvent(event);
});

When('a g2t_gmail_event is dispatched with type {string} and page {string} and subject {string}', function (type, page, subject) {
  // init the adapter so it listens
  this.instance.init();
  // Store cleanup reference for After hook
  this._gmailEventCleanup = () => {
    if (this.instance._gmailEventHandler) {
      sharedDocument.removeEventListener('g2t_gmail_event', this.instance._gmailEventHandler);
    }
  };

  // Reset mock calls before the action so we only check fresh emits
  this.app.events.emit.mock.resetCalls();

  const event = new sharedWindow.CustomEvent('g2t_gmail_event', {
    detail: { type, page, subject },
  });
  sharedDocument.dispatchEvent(event);
});

When('handleGmailEvent is called with null detail', function () {
  try {
    this.instance.handleGmailEvent({ detail: null });
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('handleGmailEvent is called with empty detail', function () {
  try {
    this.instance.handleGmailEvent({ detail: {} });
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then('a g2t_gmail_event listener is registered on document', function () {
  // Reset mock calls so we only see fresh emits from this dispatch
  this.app.events.emit.mock.resetCalls();

  // We can verify by dispatching an event and checking that handleGmailEvent processes it
  const event = new sharedWindow.CustomEvent('g2t_gmail_event', {
    detail: { type: 'load' },
  });
  sharedDocument.dispatchEvent(event);
  // If init worked, emit should have been called with gmailLoaded
  const calls = this.app.events.emit.mock.calls;
  const found = calls.some(c => {
    const arg = c.arguments[0];
    if (typeof arg === 'string' && arg === 'gmailLoaded') return true;
    if (typeof arg === 'object' && arg.type === 'gmailLoaded') return true;
    return false;
  });
  assert.ok(found, 'Expected gmailLoaded event after dispatching g2t_gmail_event with type "load"');
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

Then('app.events.emit has not been called for gmail events', function () {
  const calls = this.app.events.emit.mock.calls;
  const gmailEvents = ['gmailReady', 'gmailLoaded', 'gmailViewChanged'];
  const found = calls.some(c => {
    const arg = c.arguments[0];
    // Check both string form and object form
    if (typeof arg === 'string') return gmailEvents.includes(arg);
    if (typeof arg === 'object' && arg !== null) return gmailEvents.includes(arg.type);
    return false;
  });
  assert.ok(!found, 'Expected no gmail events emitted');
});

Then('the gmailReady event has userEmail {string}', function (expected) {
  assert.ok(this._emittedEvents['gmailReady'], 'gmailReady event should have been emitted');
  assert.strictEqual(this._emittedEvents['gmailReady'].userEmail, expected);
});

Then('app.model.userEmail is {string}', function (expected) {
  assert.strictEqual(this.app.model.userEmail, expected);
});

Then('the gmailViewChanged event has type {string}', function (expected) {
  assert.ok(this._emittedEvents['gmailViewChanged'], 'gmailViewChanged event should have been emitted');
  assert.strictEqual(this._emittedEvents['gmailViewChanged'].type, expected);
});

Then('the gmailViewChanged event has page {string}', function (expected) {
  assert.ok(this._emittedEvents['gmailViewChanged'], 'gmailViewChanged event should have been emitted');
  assert.strictEqual(this._emittedEvents['gmailViewChanged'].page, expected);
});

Then('the gmailViewChanged event has subject {string}', function (expected) {
  assert.ok(this._emittedEvents['gmailViewChanged'], 'gmailViewChanged event should have been emitted');
  assert.strictEqual(this._emittedEvents['gmailViewChanged'].subject, expected);
});
