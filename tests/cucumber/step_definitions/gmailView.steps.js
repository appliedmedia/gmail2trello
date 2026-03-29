const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const { createMockFn, sharedWindow, sharedDocument } = require('../support/world');

const $ = sharedWindow.$;

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

Given('a fresh GmailView with initialized properties', function () {
  // Ensure dependencies are loaded
  this.loadSourceFile('chrome_manifest_v3/class_waitCounter.js');
  this.loadSourceFile('chrome_manifest_v3/views/class_gmailView.js');
  // Stub detectToolbar to prevent runaway errors
  if (this.G2T.GmailView) {
    this.G2T.GmailView.prototype.detectToolbar = () => true;
  }

  this.instance = new this.G2T.GmailView({ app: this.app });
  this.instance.$root = $('body');
  this.instance.preprocess = {
    a: {
      'test@example.com <test@example.com>': '[Test User](<test@example.com>)',
      'test@example.com (test@example.com)': '[Test User](<test@example.com>)',
      'test@example.com test@example.com': '[Test User](<test@example.com>)',
      '"test@example.com" <test@example.com>': '[Test User](<test@example.com>)',
      '"test@example.com" (test@example.com)': '[Test User](<test@example.com>)',
      '"test@example.com" test@example.com': '[Test User](<test@example.com>)',
    },
  };
  this.instance.emailImage = {};
  this.instance.attachment = [];
  this.instance.cc_raw = '';
  this.instance.cc_md = '';
});

Given('runaway is set to {int}', function (value) {
  this.instance.runaway = value;
});

Given('detectToolbar is mocked', function () {
  this.instance.$root = $('body');
  this.instance.detectToolbar = createMockFn();
});

Given('a div with class {string} appended to body', function (className) {
  this._testElement = sharedDocument.createElement('div');
  this._testElement.className = className;
  sharedDocument.body.appendChild(this._testElement);
});

Given('gmailView has a $toolBar', function () {
  this.instance.$toolBar = { someProperty: 'value' };
});

Given('preDetect returns true and toolBar is set', function () {
  this.instance.preDetect = createMockFn(() => true);
  this.instance.$toolBar = { someProperty: 'value' };
});

Given('detect is mocked on gmailView', function () {
  this.instance.detect = createMockFn();
});

Given('persist.user is set to a test user', function () {
  this.app.persist.user = { fullName: 'Test User' };
});

Given('preprocess object is initialized', function () {
  this.instance.preprocess = { a: {} };
});

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('url_with_filename is called with {string} and {string}', function (url, filename) {
  this.result = this.instance.url_with_filename(url, filename);
});

When('displayNameAndEmail is called with {string} and {string}', function (name, email) {
  this.result = this.instance.displayNameAndEmail(name, email);
});

When('email_raw_md is called with {string} and {string}', function (name, email) {
  this.result = this.instance.email_raw_md(name, email);
});

When('make_preprocess_mailto is called with {string} and {string}', function (name, email) {
  this.result = this.instance.make_preprocess_mailto(name, email);
});

When('detectToolbar_onTimeout is called', function () {
  this.instance.detectToolbar_onTimeout();
});

When('detectEmailOpeningMode_onEmailClick is called', function () {
  this._startSpy = createMockFn(function (...args) {});
  this.instance.waitCounter.start = this._startSpy;
  this.instance.detectEmailOpeningMode_onEmailClick();
});

When('a div element is created', function () {
  this._createdElement = sharedDocument.createElement('div');
});

When('querySelector selects {string}', function (selector) {
  this._selectedElement = sharedDocument.querySelector(selector);
});

When('bindEvents is called on the gmailView', function () {
  this.instance.bindEvents();
});

When('handleGmailDetected is called', function () {
  this.instance.handleGmailDetected();
});

When('handleDetectButton is called', function () {
  this.instance.handleDetectButton();
});

When('init is called on the gmailView', function () {
  this.instance.init();
});

When('handleTrelloUserAndBoardsReady is called', function () {
  this.instance.handleTrelloUserAndBoardsReady();
});

When('displayNameAndEmail is called 1000 times', function () {
  const begin = Date.now();
  for (let i = 0; i < 1000; i++) {
    this.instance.displayNameAndEmail('test data', 'test@example.com');
  }
  this._duration_ms = Date.now() - begin;
});

When('{int} event handlers are added', function (count) {
  const begin = Date.now();
  for (let i = 0; i < count; i++) {
    this.app.events.addListener('test', () => {});
  }
  this._duration_ms = Date.now() - begin;
});

When('email methods are called for {int} addresses', function (count) {
  const testEmails = [
    { name: 'John Doe', email: 'john@example.com' },
    { name: 'Jane Smith', email: 'jane@test.org' },
    { name: 'Bob Wilson', email: 'bob@company.com' },
  ];
  const begin = Date.now();
  for (const { name, email } of testEmails.slice(0, count)) {
    this.instance.email_raw_md(name, email);
    this.instance.make_preprocess_mailto(name, email);
  }
  this._duration_ms = Date.now() - begin;
});

When('parseData_onEmailCCIterate is called with {string} and {string}', function (name, email) {
  this.instance.parseData_onEmailCCIterate(0, { name, email });
});

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then('the $root is the body element', function () {
  assert.ok(this.instance.$root && this.instance.$root.length === 1
    && this.instance.$root[0].tagName === 'BODY');
});

Then('static ck.uniqueUriVar of GmailView is {string}', function (expected) {
  assert.strictEqual(this.G2T.GmailView.ck.uniqueUriVar, expected);
});

Then('instance ck.uniqueUriVar is {string}', function (expected) {
  assert.strictEqual(this.instance.ck.uniqueUriVar, expected);
});

Then('the waitCounter is an object with start and stop', function () {
  assert.strictEqual(typeof this.instance.waitCounter, 'object');
  assert.notStrictEqual(this.instance.waitCounter.start, undefined);
  assert.notStrictEqual(this.instance.waitCounter.stop, undefined);
});

Then('the selectors is an object', function () {
  assert.strictEqual(typeof this.instance.selectors, 'object');
});

Then('the gmailView result is {string}', function (expected) {
  assert.strictEqual(this.result, expected);
});

Then('the raw result is {string}', function (expected) {
  assert.strictEqual(this.result.raw, expected);
});

Then('the md result is {string}', function (expected) {
  assert.strictEqual(this.result.md, expected);
});

Then('the result is an object with entries', function () {
  assert.strictEqual(typeof this.result, 'object');
  assert.ok(Object.keys(this.result).length > 0);
});

Then('the result contains key {string} with value {string}', function (key, value) {
  assert.strictEqual(this.result[key], value);
});

Then('the result contains key {string}', function (key) {
  assert.ok(key in this.result, `Expected result to contain key "${key}"`);
});

Then('log was called with {string}', function (expectedMsg) {
  const calls = this.app.utils.log.mock.calls;
  const found = calls.some(c => [...c.arguments].includes(expectedMsg));
  assert.ok(found, `Expected log to be called with "${expectedMsg}"`);
});

Then('runaway is incremented by {int}', function (increment) {
  // The initial runaway was 0 (from the Background step), so after calling
  // detectToolbar_onTimeout it should be 0 + increment
  assert.strictEqual(this.instance.runaway, increment);
});

Then('waitCounter.start was called with correct arguments', function () {
  assert.strictEqual(this._startSpy.mock.callCount(), 1);
  const args = [...this._startSpy.mock.calls[0].arguments];
  assert.strictEqual(args[0], 'emailclick');
  assert.strictEqual(args[1], 500);
  assert.strictEqual(args[2], 5);
  assert.strictEqual(typeof args[3], 'function');
});

Then('the created element is a DIV', function () {
  assert.notStrictEqual(this._createdElement, undefined);
  assert.strictEqual(this._createdElement.tagName, 'DIV');
});

Then('the selected element matches the appended div', function () {
  assert.strictEqual(this._selectedElement, this._testElement);
  // Cleanup
  this._testElement.remove();
});

Then('viewport elements exist in $root', function () {
  const $viewport = $('.aia, .nH', this.instance.$root);
  assert.ok($viewport.length > 0);
});

Then('expanded email elements exist in $root', function () {
  const $emails = $('.h7', this.instance.$root);
  assert.ok($emails.length > 0);
});

Then('{string} listener was added', function (eventName) {
  const calls = this.app.events.addListener.mock.calls;
  const found = calls.some(c => [...c.arguments][0] === eventName);
  assert.ok(found, `Expected addListener to be called with "${eventName}"`);
});

Then('app.popupView.$toolBar is set to gmailView.$toolBar', function () {
  assert.strictEqual(this.app.popupView.$toolBar, this.instance.$toolBar);
});

Then('app.popupView.finalCreatePopup was called once', function () {
  assert.strictEqual(this.app.popupView.finalCreatePopup.mock.callCount(), 1);
});

Then('the emitted gmail data has correct fields', function () {
  const calls = this.app.events.emit.mock.calls;
  const emitCall = calls.find(c => [...c.arguments][0] === 'gmailDataReady');
  assert.ok(emitCall, 'Expected emit to be called with "gmailDataReady"');

  const gmailData = [...emitCall.arguments][1].gmail;
  assert.notStrictEqual(gmailData, undefined);
  assert.strictEqual(gmailData.subject, 'Test Subject');
  assert.strictEqual(gmailData.time, '2025-01-01 12:00 PM');
  assert.ok(Array.isArray(gmailData.attachment));
  assert.ok(Array.isArray(gmailData.image));
});

// Edge cases
Then('displayNameAndEmail with null and null returns {string}', function (expected) {
  assert.strictEqual(this.instance.displayNameAndEmail(null, null), expected);
});

Then('displayNameAndEmail with undefined and undefined does not throw', function () {
  assert.doesNotThrow(() => this.instance.displayNameAndEmail(undefined, undefined));
});

Then('email_raw_md with null and null returns empty raw and md', function () {
  const result = this.instance.email_raw_md(null, null);
  assert.strictEqual(result.raw, '');
  assert.strictEqual(result.md, '');
});

Then('email_raw_md with undefined and undefined returns empty raw and md', function () {
  const result = this.instance.email_raw_md(undefined, undefined);
  assert.strictEqual(result.raw, '');
  assert.strictEqual(result.md, '');
});

Then('url_with_filename with null and null does not throw', function () {
  assert.doesNotThrow(() => this.instance.url_with_filename(null, null));
});

Then('url_with_filename with undefined and undefined does not throw', function () {
  assert.doesNotThrow(() => this.instance.url_with_filename(undefined, undefined));
});

Then('make_preprocess_mailto with null and null does not throw', function () {
  assert.doesNotThrow(() => this.instance.make_preprocess_mailto(null, null));
});

Then('make_preprocess_mailto with undefined and undefined does not throw', function () {
  assert.doesNotThrow(() => this.instance.make_preprocess_mailto(undefined, undefined));
});

// Performance
Then('the duration is under {int}ms', function (maxMs) {
  assert.ok(this._duration_ms < maxMs, `Expected < ${maxMs}ms, got ${this._duration_ms}ms`);
});

// Parse data
Then('the preprocess is populated', function () {
  assert.notStrictEqual(this.instance.preprocess, undefined);
  assert.notStrictEqual(this.instance.preprocess['a'], undefined);
});

Then('the gmailView instance is defined', function () {
  assert.notStrictEqual(this.instance, undefined);
});
