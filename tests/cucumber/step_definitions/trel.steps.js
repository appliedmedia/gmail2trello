const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const { createMockFn } = require('../support/world');

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given('trelloData is set to some data', function () {
  this.app.persist.trelloData = { some: 'data' };
});

Given('a spy on wrapApiCall', function () {
  const orig = this.instance.wrapApiCall.bind(this.instance);
  const spy = createMockFn(function (...args) { return orig(...args); });
  this.instance.wrapApiCall = spy;
  this._wrapApiCallSpy = spy;
});

Given('a Trel created with no arguments', function () {
  this.instance = new this.G2T.Trel();
});

Given('a Trel created without persist', function () {
  const appCopy = { ...this.app };
  delete appCopy.persist;
  this.instance = new this.G2T.Trel({ app: appCopy });
});

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When('bindEvents is called on the Trel instance', function () {
  try {
    this.instance.bindEvents();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('setApiKey is called with {string}', function (key) {
  this._setApiKeyResult = this.instance.setApiKey(key);
});

When('trelloAuthorized is changed to false', function () {
  this.app.persist.trelloAuthorized = false;
});

When('authorize is called with true', function () {
  try {
    this.instance.authorize(true);
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('deauthorize is called on the Trel instance', function () {
  this.instance.deauthorize();
});

When('wrapApiCall is called with get {string}', function (path) {
  this._successCb = createMockFn();
  this._failureCb = createMockFn();
  this.instance.wrapApiCall('get', path, {}, this._successCb, this._failureCb);
});

When('Trel API method {word} is called with arg {string}', function (method, arg) {
  if (arg === '') {
    this.instance[method]();
  } else {
    this.instance[method](arg);
  }
});

When('getUser is called on the Trel instance', function () {
  this.instance.getUser();
});

When('getBoards is called on the Trel instance', function () {
  this.instance.getBoards();
});

When('getLists is called on the Trel instance with {string}', function (id) {
  this.instance.getLists(id);
});

When('createCard is called on the Trel instance', function () {
  this.instance.createCard({ name: 'Test Card', listId: 'list123', boardId: 'board123' });
});

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then('the Trel ck has all expected fields', function () {
  const ck = this.instance.ck;
  assert.strictEqual(ck.errorPrefix, 'Trello API Error:');
  assert.strictEqual(ck.unauthorizedError, 'Trello not authorized');
  assert.strictEqual(ck.apiCallPrefix, 'Trello API call:');
});

Then('the setApiKey result is true', function () {
  assert.strictEqual(this._setApiKeyResult, true);
});

Then('getApiKey returns {string}', function (expected) {
  assert.strictEqual(this.instance.getApiKey(), expected);
});

Then('isAuthorized returns true', function () {
  assert.strictEqual(this.instance.isAuthorized(), true);
});

Then('isAuthorized returns false', function () {
  assert.strictEqual(this.instance.isAuthorized(), false);
});

Then('trelloAuthorized is false on the app', function () {
  assert.strictEqual(this.app.persist.trelloAuthorized, false);
});

Then('trelloData is null on the app', function () {
  assert.strictEqual(this.app.persist.trelloData, null);
});

Then('the failure callback was called with unauthorized error', function () {
  assert.ok(this._failureCb.mock.callCount() > 0, 'Expected failure callback to have been called');
  const args = this._failureCb.mock.calls[0].arguments;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(args[0])), { error: 'Trello not authorized' });
});

Then('utils.log was called with {string}', function (expected) {
  const calls = this.app.utils.log.mock.calls;
  const found = calls.some(c => c.arguments[0] === expected);
  assert.ok(found, `Expected utils.log to have been called with "${expected}"`);
});

Then('the success callback was not called', function () {
  assert.strictEqual(this._successCb.mock.callCount(), 0);
});

Then('wrapApiCall was called with {string} and {string}', function (verb, path) {
  const calls = this._wrapApiCallSpy.mock.calls;
  assert.ok(calls.length > 0, 'Expected wrapApiCall to have been called');
  const lastCall = calls[calls.length - 1].arguments;
  assert.strictEqual(lastCall[0], verb);
  assert.strictEqual(lastCall[1], path);
});

Then('wrapApiCall was called at least once', function () {
  assert.ok(this._wrapApiCallSpy.mock.callCount() > 0);
});

Then('wrapApiCall was called {int} times', function (count) {
  assert.strictEqual(this._wrapApiCallSpy.mock.callCount(), count);
});

Then('the Trel instance app is undefined', function () {
  assert.strictEqual(this.instance.app, undefined);
});

Then('the Trel instance app.persist is undefined', function () {
  assert.strictEqual(this.instance.app.persist, undefined);
});
