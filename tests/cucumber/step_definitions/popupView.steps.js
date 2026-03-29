const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const { createMockFn, sharedWindow, sharedDocument } = require('../support/world');

const $ = sharedWindow.$;

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

Given('a PopupView with mocked setInterval', function () {
  // Ensure dependencies are loaded
  this.loadSourceFile('chrome_manifest_v3/views/class_popupForm.js');
  this.loadSourceFile('chrome_manifest_v3/class_menuControl.js');
  this.loadSourceFile('chrome_manifest_v3/views/class_popupView.js');

  // Stub window.innerWidth for deterministic tests
  Object.defineProperty(sharedWindow, 'innerWidth', {
    value: 1024,
    configurable: true,
  });

  const origSI = sharedWindow.setInterval;
  sharedWindow.setInterval = function () { return 0; };
  this.instance = new this.G2T.PopupView({ app: this.app });
  sharedWindow.setInterval = origSI;
});

Given('popup DOM structure with toolbar and button', function () {
  this._savedHTML = sharedDocument.body.innerHTML;
  sharedDocument.body.innerHTML = `
    <div id="g2tButton"></div>
    <div id="g2tPopup"></div>
    <div class="toolbar"></div>
  `;
  this.instance.$toolBar = $('.toolbar');
  this.instance.$g2tButton = $('#g2tButton');
  this.instance.$popup = $('#g2tPopup');
});

Given('DOM with button and popup for centering', function () {
  this._savedHTML = sharedDocument.body.innerHTML;
  sharedDocument.body.innerHTML = `
    <div id="g2tButton" style="position: absolute; left: 100px; top: 50px; width: 50px; height: 30px;"></div>
    <div id="g2tPopup" style="position: absolute; width: 400px; height: 300px;"></div>
  `;
  this.instance.$g2tButton = $('#g2tButton');
  this.instance.$popup = $('#g2tPopup');
});

Given('mocked jQuery position methods on popupView', function () {
  this.instance.$g2tButton.position = createMockFn(() => ({ left: 100, top: 50 }));
  this.instance.$g2tButton.width = createMockFn(() => 50);
  this.instance.$g2tButton.outerWidth = createMockFn(() => 50);
  this.instance.$g2tButton.offsetParent = createMockFn(() => ({
    position: createMockFn(() => ({ left: 0, top: 0 })),
    width: createMockFn(() => 1024),
  }));
  this.instance.$popup.position = createMockFn(() => ({ left: 200, top: 100 }));
  this.instance.$popup.width = createMockFn(() => 400);
  this.instance.$popup.css = createMockFn();
});

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('popupView init is called with mocked setInterval', function () {
  const origSI = sharedWindow.setInterval;
  sharedWindow.setInterval = createMockFn(() => 999);
  try {
    this.instance.init();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
  sharedWindow.setInterval = origSI;
  if (this.instance.intervalId) {
    clearInterval(this.instance.intervalId);
    this.instance.intervalId = 0;
  }
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

When('finalCreatePopup is called on the instance', function () {
  try {
    this.instance.finalCreatePopup();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

When('centerPopup is called on the instance', function () {
  try {
    this.instance.centerPopup();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then('the instance is a PopupView', function () {
  assert.ok(this.instance instanceof this.G2T.PopupView);
});

Then('the mouseDownTracker is an empty object', function () {
  assert.strictEqual(typeof this.instance.mouseDownTracker, 'object');
  assert.strictEqual(Object.keys(this.instance.mouseDownTracker).length, 0);
});

Then('the updatesPending is an empty array', function () {
  assert.ok(Array.isArray(this.instance.updatesPending));
  assert.strictEqual(this.instance.updatesPending.length, 0);
});

Then('size_k width.min is {int}', function (expected) {
  assert.strictEqual(this.instance.size_k.width.min, expected);
});

Then('size_k width.max is window.innerWidth minus {int}', function (offset) {
  assert.strictEqual(this.instance.size_k.width.max, 1024 - offset);
});

Then('size_k height.min is {int}', function (expected) {
  assert.strictEqual(this.instance.size_k.height.min, expected);
});

Then('size_k height.max is {int}', function (expected) {
  assert.strictEqual(this.instance.size_k.height.max, expected);
});

Then('size_k text.min is {int}', function (expected) {
  assert.strictEqual(this.instance.size_k.text.min, expected);
});

Then('the form is an instance of PopupForm', function () {
  assert.ok(this.instance.form instanceof this.G2T.PopupForm);
});

Then('the form parent is the popupView', function () {
  assert.strictEqual(this.instance.form.parent, this.instance);
});

Then('the form app is the same app', function () {
  assert.strictEqual(this.instance.form.app, this.app);
});

// lastError step removed -- use shared "property {word} is {string}" step instead
