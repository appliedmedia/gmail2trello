const { When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const { createMockFn } = require('../../support/world');

When('addListener is called for {string} with a listener', function (eventName) {
  this._testListeners[eventName] = createMockFn();
  this.instance.addListener(eventName, this._testListeners[eventName]);
});

When('emit is called for {string}', function (eventName) {
  this.instance.emit({ type: eventName });
});

When('emit is called for {string} with data', function (eventName) {
  this.instance.emit({ type: eventName, data: this._testEventData || {} });
});

Then('the listener was called', function () {
  const listeners = Object.values(this._testListeners);
  const lastListener = listeners[listeners.length - 1];
  assert.ok(lastListener.mock.callCount() > 0, 'Expected listener to have been called');
});

Then('the listener was called {int} time(s)', function (count) {
  const listeners = Object.values(this._testListeners);
  const lastListener = listeners[listeners.length - 1];
  assert.strictEqual(lastListener.mock.callCount(), count,
    `Expected listener called ${count} time(s), got ${lastListener.mock.callCount()}`);
});

Then('the listener was not called', function () {
  const listeners = Object.values(this._testListeners);
  const lastListener = listeners[listeners.length - 1];
  assert.strictEqual(lastListener.mock.callCount(), 0, 'Expected listener NOT to have been called');
});

Then('addListener was called', function () {
  assert.ok(this.app.events.addListener.mock.callCount() > 0,
    'Expected app.events.addListener to have been called');
});

Then('events.emit was called with {string}', function (eventName) {
  const calls = this.app.events.emit.mock.calls;
  const found = calls.some((call) => {
    const arg = call.arguments[0];
    if (typeof arg === 'object' && arg.type === eventName) return true;
    if (typeof arg === 'string' && arg === eventName) return true;
    return false;
  });
  assert.ok(found, `Expected events.emit to have been called with "${eventName}"`);
});
