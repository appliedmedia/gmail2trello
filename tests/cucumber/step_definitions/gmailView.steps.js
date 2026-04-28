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
  this.instance.root = sharedDocument.body; // was: this.instance.$root = $('body')
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
  this.instance.root = sharedDocument.body; // was: this.instance.$root = $('body')
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
  // Lane 4 will update class_utils.markdownify to accept native elements.
  // Until then, patch it here to wrap native elements with jQuery.
  const origMarkdownify = this.app.utils.markdownify
    ? this.app.utils.markdownify.bind(this.app.utils)
    : null;
  if (origMarkdownify) {
    this.app.utils.markdownify = (el, features, preprocess) => {
      const $el = el && el.nodeType ? $(el) : el;
      return origMarkdownify($el, features, preprocess);
    };
  }
  this.instance.handleTrelloUserAndBoardsReady();
  if (origMarkdownify) {
    this.app.utils.markdownify = origMarkdownify;
  }
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
  // field renamed $root -> root (native Element)
  assert.ok(this.instance.root && this.instance.root.tagName === 'BODY');
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
  // field renamed $root -> root (native Element)
  const viewport = this.instance.root
    ? (this.instance.root.querySelector('.aia') || this.instance.root.querySelector('.nH'))
    : null;
  assert.ok(viewport != null);
});

Then('expanded email elements exist in $root', function () {
  // field renamed $root -> root (native Element)
  const emails = this.instance.root
    ? this.instance.root.querySelectorAll('.h7')
    : [];
  assert.ok(emails.length > 0);
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

// ---------------------------------------------------------------------------
// parseData extraction -- helpers
// ---------------------------------------------------------------------------

/**
 * Build a Gmail-like DOM inside document.body for parseData tests.
 * Options: subject, body, fromName, fromEmail, timestamp, attachmentUrl, imgSrc, imgAlt, ccName, ccEmail
 */
function buildGmailDOM(doc, opts = {}) {
  const subject = opts.subject ?? 'Test Subject';
  const body = opts.body ?? '<p>Default body</p>';
  const fromName = opts.fromName ?? 'Test User';
  const fromEmail = opts.fromEmail ?? 'test@example.com';
  const timestamp = opts.timestamp ?? '2025-01-01 12:00 PM';
  const attachmentHtml = opts.attachmentUrl
    ? `<span class="aZo" download_url="${opts.attachmentUrl}">attachment</span>`
    : (opts.noAttachments ? '' : '');
  const imgHtml = opts.imgSrc
    ? `<img src="${opts.imgSrc}" alt="${opts.imgAlt || ''}" type="image/jpeg">`
    : '';
  const ccHtml = opts.ccName != null
    ? `<span class="g2" email="${opts.ccEmail || ''}" name="${opts.ccName}">CC</span>`
    : '';

  doc.body.innerHTML = `
    <div class="nH">
      <div class="h7" g2t_event="1">
        <div class="adn ads">
          <div class="gs">
            <div class="a3s aiL">${body}${imgHtml}</div>
            <div class="gH"><div class="gK"><div class="g3" title="${timestamp}">${timestamp}</div></div></div>
            ${ccHtml}
            <span class="gD" name="${fromName}" email="${fromEmail}">${fromName}</span>
            ${attachmentHtml}
          </div>
        </div>
      </div>
      <div class="hP">${subject}</div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// parseData extraction -- Given steps
// ---------------------------------------------------------------------------

Given('the DOM contains a Gmail email with subject {string}', function (subject) {
  buildGmailDOM(sharedDocument, { subject });
  this.instance.root = sharedDocument.body; // was: $root = $('body')
  this.instance.parsingData = false;
});

Given('the DOM contains a Gmail email with body {string}', function (body) {
  buildGmailDOM(sharedDocument, { body: `<p>${body}</p>` });
  this.instance.root = sharedDocument.body; // was: $root = $('body')
  this.instance.parsingData = false;
});

Given('the DOM contains a Gmail email from {string} with address {string}', function (name, email) {
  buildGmailDOM(sharedDocument, { fromName: name, fromEmail: email });
  this.instance.root = sharedDocument.body; // was: $root = $('body')
  this.instance.parsingData = false;
});

Given('the DOM contains a Gmail email with timestamp {string}', function (timestamp) {
  buildGmailDOM(sharedDocument, { timestamp });
  this.instance.root = sharedDocument.body; // was: $root = $('body')
  this.instance.parsingData = false;
});

Given('the DOM contains a Gmail email with attachment {string}', function (downloadUrl) {
  buildGmailDOM(sharedDocument, { attachmentUrl: downloadUrl });
  this.instance.root = sharedDocument.body; // was: $root = $('body')
  this.instance.parsingData = false;
});

Given('the DOM contains a Gmail email with an inline image {string} alt {string}', function (src, alt) {
  buildGmailDOM(sharedDocument, { imgSrc: src, imgAlt: alt });
  this.instance.root = sharedDocument.body; // was: $root = $('body')
  this.instance.parsingData = false;
});

Given('the DOM contains a Gmail email with CC {string} at {string}', function (ccName, ccEmail) {
  buildGmailDOM(sharedDocument, { ccName, ccEmail });
  this.instance.root = sharedDocument.body; // was: $root = $('body')
  this.instance.parsingData = false;
});

Given('the DOM contains no Gmail email', function () {
  sharedDocument.body.innerHTML = '<div class="empty"></div>';
  this.instance.root = sharedDocument.body; // was: $root = $('body')
  this.instance.parsingData = false;
});

Given('the DOM contains a Gmail email with no attachments', function () {
  buildGmailDOM(sharedDocument, { noAttachments: true });
  this.instance.root = sharedDocument.body; // was: $root = $('body')
  this.instance.parsingData = false;
});

Given('the DOM contains a Gmail email with empty body', function () {
  buildGmailDOM(sharedDocument, { body: '' });
  this.instance.root = sharedDocument.body; // was: $root = $('body')
  this.instance.parsingData = false;
});

// ---------------------------------------------------------------------------
// parseData extraction -- When steps
// ---------------------------------------------------------------------------

When('parseData is called on the gmailView', function () {
  // Provide stubs for utility methods that parseData depends on
  if (!this.app.utils.getSelectedText) {
    this.app.utils.getSelectedText = () => '';
  }
  // Lane 4 will update class_utils.markdownify to accept native elements.
  // Until then, patch it here to wrap native elements with jQuery.
  const origMarkdownify = this.app.utils.markdownify
    ? this.app.utils.markdownify.bind(this.app.utils)
    : null;
  if (origMarkdownify) {
    this.app.utils.markdownify = (el, features, preprocess) => {
      const $el = el && el.nodeType ? $(el) : el;
      return origMarkdownify($el, features, preprocess);
    };
  }
  this._parsedData = this.instance.parseData({ fullName: 'Test User' });
  if (origMarkdownify) {
    this.app.utils.markdownify = origMarkdownify;
  }
});

// ---------------------------------------------------------------------------
// parseData extraction -- Then steps
// ---------------------------------------------------------------------------

Then('the parsed data subject is {string}', function (expected) {
  assert.ok(this._parsedData, 'parseData should return data');
  assert.strictEqual(this._parsedData.subject, expected);
});

Then('the parsed data bodyAsRaw contains {string}', function (expected) {
  assert.ok(this._parsedData, 'parseData should return data');
  assert.ok(
    this._parsedData.bodyAsRaw.includes(expected),
    `Expected bodyAsRaw to contain "${expected}" but got "${this._parsedData.bodyAsRaw}"`,
  );
});

Then('the parsed data bodyAsMd contains {string}', function (expected) {
  assert.ok(this._parsedData, 'parseData should return data');
  assert.ok(
    this._parsedData.bodyAsMd.includes(expected),
    `Expected bodyAsMd to contain "${expected}" but got "${this._parsedData.bodyAsMd}"`,
  );
});

Then('the parsed data time is {string}', function (expected) {
  assert.ok(this._parsedData, 'parseData should return data');
  assert.strictEqual(this._parsedData.time, expected);
});

Then('the parsed data has {int} attachment(s)', function (count) {
  assert.ok(this._parsedData, 'parseData should return data');
  assert.strictEqual(this._parsedData.attachment.length, count);
});

Then('the first attachment name is {string}', function (expected) {
  assert.ok(this._parsedData, 'parseData should return data');
  assert.ok(this._parsedData.attachment.length > 0, 'Expected at least one attachment');
  assert.strictEqual(this._parsedData.attachment[0].name, expected);
});

Then('the parsed data has {int} image(s)', function (count) {
  assert.ok(this._parsedData, 'parseData should return data');
  assert.strictEqual(this._parsedData.image.length, count);
});

Then('the first image name is {string}', function (expected) {
  assert.ok(this._parsedData, 'parseData should return data');
  assert.ok(this._parsedData.image.length > 0, 'Expected at least one image');
  assert.strictEqual(this._parsedData.image[0].name, expected);
});

Then('the parsed data ccAsRaw contains {string}', function (expected) {
  assert.ok(this._parsedData, 'parseData should return data');
  assert.ok(
    this._parsedData.ccAsRaw.includes(expected),
    `Expected ccAsRaw to contain "${expected}" but got "${this._parsedData.ccAsRaw}"`,
  );
});

Then('the parsed data is undefined', function () {
  assert.strictEqual(this._parsedData, undefined);
});

