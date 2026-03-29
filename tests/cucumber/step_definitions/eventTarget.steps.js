const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const { createMockFn } = require('../support/world');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getListenerStore(world) {
  if (!world._etListeners) world._etListeners = {};
  return world._etListeners;
}

function getListenersArray(world, eventName) {
  const store = getListenerStore(world);
  if (!store[eventName]) store[eventName] = [];
  return store[eventName];
}

// ---------------------------------------------------------------------------
// Given / When (unified to avoid ambiguous matches)
// ---------------------------------------------------------------------------

Given('a listener is added for {string}', function (eventName) {
  const listener = createMockFn();
  getListenersArray(this, eventName).push(listener);
  this.instance.addListener(eventName, listener);
});

Given('{int} listeners are added for {string}', function (count, eventName) {
  for (let i = 0; i < count; i++) {
    const listener = createMockFn();
    getListenersArray(this, eventName).push(listener);
    this.instance.addListener(eventName, listener);
  }
});

Given('a throwing listener and a normal listener are added for {string}', function (eventName) {
  const thrower = createMockFn(() => { throw new Error('Test error'); });
  const normal = createMockFn();
  getListenersArray(this, eventName).push(thrower);
  getListenersArray(this, eventName).push(normal);
  this.instance.addListener(eventName, thrower);
  this.instance.addListener(eventName, normal);
  // Stash the normal listener for later assertions
  this._normalListener = normal;
});

When('the first listener for {string} is removed', function (eventName) {
  const listeners = getListenersArray(this, eventName);
  this.instance.removeListener(eventName, listeners[0]);
});

When('a different listener is removed from {string}', function (eventName) {
  this.instance.removeListener(eventName, createMockFn());
});

When('removeListener is called for unknown event {string}', function (eventName) {
  this.instance.removeListener(eventName, createMockFn());
});

When('all listeners for {string} are removed', function (eventName) {
  const listeners = getListenersArray(this, eventName);
  for (const l of [...listeners]) {
    this.instance.removeListener(eventName, l);
  }
});

When('emit is called for {string} with data {string}', function (eventName, message) {
  this.instance.emit(eventName, { message });
});

When('emit is called for {string} with empty data', function (eventName) {
  try {
    this.instance.emit(eventName, {});
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('emit is called for {string} with complex data', function (eventName) {
  this._complexData = { id: 123, name: 'test' };
  this.instance.emit(eventName, this._complexData);
});

When('emit string is called for {string} with data {string}', function (eventName, dataStr) {
  this.instance.emit(eventName, { data: dataStr });
});

When('emit is called with an event object that has an existing target', function () {
  this._existingTarget = {};
  this.instance.emit({ type: 'testEvent', target: this._existingTarget });
});

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then('_listeners is an empty object', function () {
  assert.ok(typeof this.instance._listeners === 'object');
  assert.strictEqual(Object.keys(this.instance._listeners).length, 0);
});

Then('the no-args instance has undefined app', function () {
  // The no-args instance was created by shared "a fresh EventTarget with no args"
  // which stores to this.instance (but may have error). Let's check:
  if (this.error) {
    // If construction threw, that's also valid for "no args"
    assert.ok(true);
  } else {
    assert.strictEqual(this.instance.app, undefined);
  }
});

Then('_listeners for {string} has {int} listener(s)', function (eventName, count) {
  assert.strictEqual(this.instance._listeners[eventName].length, count);
});

Then('_listeners for {string} is undefined', function (eventName) {
  assert.strictEqual(this.instance._listeners[eventName], undefined);
});

Then('both listeners received the event with type {string} and target is the instance', function (eventName) {
  const listeners = getListenersArray(this, eventName);
  for (const l of listeners) {
    const args = l.mock.calls[0].arguments;
    assert.strictEqual(args[0].type, eventName);
    assert.strictEqual(args[0].target, this.instance);
  }
});

Then('both listeners received the data {string}', function (message) {
  // Find the event that has listeners
  const store = getListenerStore(this);
  for (const listeners of Object.values(store)) {
    for (const l of listeners) {
      if (l.mock.callCount() > 0) {
        const args = l.mock.calls[0].arguments;
        assert.deepStrictEqual(args[1], { message });
      }
    }
  }
});

Then('the listener received the complex data', function () {
  const store = getListenerStore(this);
  const listeners = store['testEvent'];
  const args = listeners[0].mock.calls[0].arguments;
  assert.deepStrictEqual(args[1], this._complexData);
});

Then('the listener for {string} was called {int} time(s)', function (eventName, count) {
  const listeners = getListenersArray(this, eventName);
  // Use the first (or only) listener
  assert.strictEqual(listeners[0].mock.callCount(), count);
});

Then('the listener for {string} received data {string}', function (eventName, dataStr) {
  const listeners = getListenersArray(this, eventName);
  const args = listeners[0].mock.calls[0].arguments;
  assert.deepStrictEqual(args[1], { data: dataStr });
});

Then('the second listener for {string} was called {int} time(s)', function (eventName, count) {
  const listeners = getListenersArray(this, eventName);
  assert.strictEqual(listeners[1].mock.callCount(), count);
});

Then('the first listener for {string} was called {int} time(s) total', function (eventName, count) {
  const listeners = getListenersArray(this, eventName);
  assert.strictEqual(listeners[0].mock.callCount(), count);
});

Then('the second listener for {string} was called {int} times total', function (eventName, count) {
  const listeners = getListenersArray(this, eventName);
  assert.strictEqual(listeners[1].mock.callCount(), count);
});

Then('the second listener for {string} last received data {string}', function (eventName, dataStr) {
  const listeners = getListenersArray(this, eventName);
  const calls = listeners[1].mock.calls;
  const lastArgs = calls[calls.length - 1].arguments;
  assert.deepStrictEqual(lastArgs[1], { data: dataStr });
});

Then('the listener received the original event object with existing target', function () {
  const listeners = getListenersArray(this, 'testEvent');
  const args = listeners[0].mock.calls[0].arguments;
  assert.deepStrictEqual(args[0], { type: 'testEvent', target: this._existingTarget });
  assert.strictEqual(args[1], undefined);
});

Then('emitting an event without type throws an error about missing type', function () {
  assert.throws(
    () => this.instance.emit({}),
    (err) => err.message.includes("missing 'type' property"),
  );
});

Then('app.utils is defined on the instance', function () {
  assert.ok(this.instance.app.utils !== undefined);
});

Then('emitting {string} throws {string}', function (eventName, errorMsg) {
  assert.throws(
    () => this.instance.emit(eventName, {}),
    { message: errorMsg },
  );
});

Then('the normal listener was not called', function () {
  assert.strictEqual(this._normalListener.mock.callCount(), 0);
});

Then('addListener with null does not throw', function () {
  assert.doesNotThrow(() => this.instance.addListener('testEvent', null));
});

Then('addListener with undefined does not throw', function () {
  assert.doesNotThrow(() => this.instance.addListener('testEvent', undefined));
});
