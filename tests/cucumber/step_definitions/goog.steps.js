const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const { sharedWindow, createMockFn } = require('../support/world');

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given('a Goog created with no arguments', function () {
  this.instance = new this.G2T.Goog();
});

Given('a Goog instance without popupView', function () {
  this.instance = new this.G2T.Goog({ app: { ...this.app, popupView: null } });
});

Given('a Goog instance without utils', function () {
  const appCopy = { ...this.app };
  delete appCopy.utils;
  this.instance = new this.G2T.Goog({ app: appCopy });
});

Given('bindEvents has been called on the Goog instance', function () {
  this.instance.bindEvents();
  this._storageListener = sharedWindow.chrome.storage.onChanged.addListener.mock.calls[0].arguments[0];
});

Given('chrome.storage.sync.get is set to throw context invalidated', function () {
  sharedWindow.chrome.storage.sync.get = createMockFn(() => {
    throw new Error('Extension context invalidated');
  });
});

Given('chrome.storage.sync.set is set to throw context invalidated', function () {
  sharedWindow.chrome.storage.sync.set = createMockFn(() => {
    throw new Error('Extension context invalidated');
  });
});

Given('chrome.runtime.sendMessage is set to throw context invalidated', function () {
  sharedWindow.chrome.runtime.sendMessage = createMockFn(() => {
    throw new Error('Extension context invalidated');
  });
});

Given('chrome.runtime.getURL is set to throw context invalidated', function () {
  sharedWindow.chrome.runtime.getURL = createMockFn(() => {
    throw new Error('Extension context invalidated');
  });
});

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When('bindEvents is called on the Goog instance', function () {
  try {
    this.instance.bindEvents();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('a sync debugMode change fires with value true', function () {
  assert.strictEqual(this.app.temp.log.debugMode, false);
  this._storageListener({ debugMode: { newValue: true } }, 'sync');
});

When('a local namespace debugMode change fires', function () {
  this._storageListener({ debugMode: { newValue: true } }, 'local');
});

When('a sync change with key {string} fires', function (key) {
  const changes = {};
  changes[key] = { newValue: true };
  this._storageListener(changes, 'sync');
});

When('wrapApiCall is called with a successful apiCall and callback', function () {
  this._apiCall = createMockFn(cb => { cb('success'); return 'result'; });
  this._callback = createMockFn();
  this.result = this.instance.wrapApiCall(this._apiCall, 'test operation', this._callback);
});

When('wrapApiCall is called with an error apiCall and callback', function () {
  this._apiCall = createMockFn(cb => { cb('error'); return 'error'; });
  this._callback = createMockFn();
  this.result = this.instance.wrapApiCall(this._apiCall, 'test operation', this._callback);
});

When('wrapApiCall is called without callback', function () {
  this._apiCall = createMockFn(() => 'result');
  this.result = this.instance.wrapApiCall(this._apiCall, 'test operation');
});

When('handleChromeError is called with {string}', function (msg) {
  try {
    this.instance.handleChromeError(new Error(msg), 'test operation');
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('handleChromeError is called with {string} for {string}', function (msg, operation) {
  try {
    this.instance.handleChromeError(new Error(msg), operation);
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('handleChromeError is called with an empty message', function () {
  try {
    this.instance.handleChromeError(new Error(''), 'test');
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('handleChromeError is called with null', function () {
  try {
    this.instance.handleChromeError(null, 'test');
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('handleChromeError is called with undefined', function () {
  try {
    this.instance.handleChromeError(undefined, 'test');
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('showContextInvalidMessage is called', function () {
  try {
    this.instance.showContextInvalidMessage();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('storageSyncGet is called with keys and callback', function () {
  this._googKeys = ['debugMode'];
  this._googCallback = createMockFn();
  try {
    this.instance.storageSyncGet(this._googKeys, this._googCallback);
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('storageSyncSet is called with items and callback', function () {
  this._googItems = { debugMode: true };
  this._googCallback = createMockFn();
  try {
    this.instance.storageSyncSet(this._googItems, this._googCallback);
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('storageSyncGet is called with keys only', function () {
  try {
    this.instance.storageSyncGet(['debugMode']);
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('storageSyncSet is called with items only', function () {
  try {
    this.instance.storageSyncSet({ debugMode: true });
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('runtimeSendMessage is called with a message and callback', function () {
  this._googMessage = { type: 'test' };
  this._googCallback = createMockFn();
  try {
    this.instance.runtimeSendMessage(this._googMessage, this._googCallback);
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('runtimeGetURL is called with {string}', function (path) {
  try {
    this.result = this.instance.runtimeGetURL(path);
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('runtimeSendMessage is called with a message only', function () {
  try {
    this.instance.runtimeSendMessage({ type: 'test' });
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then('the Goog instance app is undefined', function () {
  assert.strictEqual(this.instance.app, undefined);
});

Then('the Goog static ck has all expected fields', function () {
  const ck = this.G2T.Goog.ck;
  assert.strictEqual(ck.id, 'g2t_goog');
  assert.strictEqual(ck.errorPrefix, 'Error:');
  assert.strictEqual(ck.contextInvalidError, 'Extension context invalidated');
  assert.strictEqual(ck.reloadMessage, 'Extension needs to be reloaded.');
});

Then('the Goog instance ck has all expected fields', function () {
  const ck = this.instance.ck;
  assert.strictEqual(ck.id, 'g2t_goog');
  assert.strictEqual(ck.errorPrefix, 'Error:');
  assert.strictEqual(ck.contextInvalidError, 'Extension context invalidated');
  assert.strictEqual(ck.reloadMessage, 'Extension needs to be reloaded.');
});

Then('chrome.storage.onChanged.addListener was called', function () {
  assert.ok(sharedWindow.chrome.storage.onChanged.addListener.mock.callCount() > 0);
});

Then('app.temp.log.debugMode is true', function () {
  assert.strictEqual(this.app.temp.log.debugMode, true);
});

Then('app.temp.log.debugMode is false', function () {
  assert.strictEqual(this.app.temp.log.debugMode, false);
});

Then('the apiCall was called with the callback', function () {
  const calls = this._apiCall.mock.calls;
  assert.ok(calls.length > 0, 'Expected apiCall to have been called');
  assert.strictEqual(calls[calls.length - 1].arguments[0], this._callback);
});

Then('the callback received {string}', function (expected) {
  const calls = this._callback.mock.calls;
  assert.ok(calls.length > 0, 'Expected callback to have been called');
  assert.strictEqual(calls[calls.length - 1].arguments[0], expected);
});

Then('the wrapApiCall result is {string}', function (expected) {
  assert.strictEqual(this.result, expected);
});

Then('the apiCall was called once', function () {
  assert.strictEqual(this._apiCall.mock.callCount(), 1);
});

Then('chrome.storage.sync.get was called with the keys and callback', function () {
  const calls = sharedWindow.chrome.storage.sync.get.mock.calls;
  assert.ok(calls.length > 0);
  const lastCall = calls[calls.length - 1].arguments;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(lastCall[0])), this._googKeys);
  assert.strictEqual(lastCall[1], this._googCallback);
});

Then('chrome.storage.sync.set was called with the items and callback', function () {
  const calls = sharedWindow.chrome.storage.sync.set.mock.calls;
  assert.ok(calls.length > 0);
  const lastCall = calls[calls.length - 1].arguments;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(lastCall[0])), this._googItems);
  assert.strictEqual(lastCall[1], this._googCallback);
});

Then('chrome.runtime.sendMessage was called with the message and callback', function () {
  const calls = sharedWindow.chrome.runtime.sendMessage.mock.calls;
  assert.ok(calls.length > 0);
  const lastCall = calls[calls.length - 1].arguments;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(lastCall[0])), this._googMessage);
  assert.strictEqual(lastCall[1], this._googCallback);
});

Then('the result is {string}', function (expected) {
  assert.strictEqual(this.result, expected);
});

Then('the Goog instance app.utils is undefined', function () {
  assert.strictEqual(this.instance.app.utils, undefined);
});

Then('the Goog instance app.utils is defined', function () {
  assert.notStrictEqual(this.instance.app.utils, undefined);
});

Then('the Goog instance app.utils.log is defined', function () {
  assert.notStrictEqual(this.instance.app.utils.log, undefined);
});
