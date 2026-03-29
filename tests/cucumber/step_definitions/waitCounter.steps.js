const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const { createMockFn, sharedWindow } = require('../support/world');

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given('setInterval is mocked to execute immediately', function () {
  sharedWindow.setInterval = createMockFn((callback) => {
    if (typeof callback === 'function') {
      callback();
    }
    return 1;
  });
  sharedWindow.clearInterval = createMockFn();
});

Given('start is called with name {string} interval {int} maxSteps {int} and a callback', function (name, interval, maxSteps) {
  if (!this._wcCallback) this._wcCallback = createMockFn();
  this.app.utils.log = createMockFn();
  this.instance.start(name, interval, maxSteps, this._wcCallback);
});

When('start is called again with name {string} interval {int} maxSteps {int} and same callback', function (name, interval, maxSteps) {
  this.instance.start(name, interval, maxSteps, this._wcCallback);
});

When('stop is called for {string}', function (name) {
  this.instance.stop(name);
});

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then('property items is an empty object', function () {
  assert.ok(typeof this.instance.items === 'object');
  assert.strictEqual(Object.keys(this.instance.items).length, 0);
});

Then('the wait item {string} exists', function (name) {
  assert.ok(this.instance.items[name] !== undefined);
});

Then('the wait item {string} has maxSteps {int}', function (name, maxSteps) {
  assert.strictEqual(this.instance.items[name].maxSteps, maxSteps);
});

Then('the callback was called', function () {
  assert.ok(this._wcCallback.mock.callCount() > 0);
});

Then('utils.log was called', function () {
  assert.ok(this.app.utils.log.mock.callCount() > 0);
});

Then('the wait item {string} has busy false', function (name) {
  assert.strictEqual(this.instance.items[name].busy, false);
});

Then('the wait item {string} has a handler', function (name) {
  assert.ok(this.instance.items[name].handler !== undefined);
});
