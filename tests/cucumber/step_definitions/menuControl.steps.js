const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const { sharedDocument } = require('../support/world');

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given('{int} menu item(s) in the DOM', function (count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `<div class="menu-item" data-menu-index="${i}">Item ${i + 1}</div>\n`;
  }
  sharedDocument.body.innerHTML = html;
});

Given('selectors are set on the menu control', function () {
  this.instance.selectors = { item: '.menu-item' };
});

Given('selectors property is set to empty string', function () {
  this.instance.selectors = '';
});

Given('selectors property is set to null', function () {
  this.instance.selectors = null;
});

Given('selectors property is set to undefined', function () {
  this.instance.selectors = undefined;
});

Given('a MenuControl constructed with empty object', function () {
  this._noArgsMenuControl = new this.G2T.MenuControl({});
});

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When('reset is called with selectors {string}', function (selectors) {
  assert.doesNotThrow(() => this.instance.reset({ selectors }));
});

When('reset is called with selectors null', function () {
  assert.doesNotThrow(() => this.instance.reset({ selectors: null }));
});

When('reset is called with selectors undefined', function () {
  assert.doesNotThrow(() => this.instance.reset({ selectors: undefined }));
});

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then('the no-args MenuControl is an instance of MenuControl', function () {
  assert.ok(this._noArgsMenuControl instanceof this.G2T.MenuControl);
});

Then('the no-args MenuControl has undefined app', function () {
  assert.strictEqual(this._noArgsMenuControl.app, undefined);
});

Then('DOM has {int} menu items', function (count) {
  assert.strictEqual(sharedDocument.querySelectorAll('.menu-item').length, count);
});

Then('items is defined on the menu control', function () {
  assert.ok(this.instance.items !== undefined);
});

Then('items has a click function', function () {
  assert.strictEqual(typeof this.instance.items.click, 'function');
});

Then('no error occurs', function () {
  // Covered by the doesNotThrow in the When step
  assert.ok(true);
});

Then('app.events is defined on the menu control', function () {
  assert.ok(this.instance.app.events !== undefined);
});

Then('app.utils is defined on the menu control', function () {
  assert.ok(this.instance.app.utils !== undefined);
});

Then('reset with number selector does not throw', function () {
  assert.doesNotThrow(() => this.instance.reset({ selectors: 123 }));
});

Then('reset with object selector does not throw', function () {
  assert.doesNotThrow(() => this.instance.reset({ selectors: {} }));
});

Then('reset with array selector does not throw', function () {
  assert.doesNotThrow(() => this.instance.reset({ selectors: [] }));
});
