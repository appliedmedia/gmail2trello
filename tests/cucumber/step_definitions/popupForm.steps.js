const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const { createMockFn, sharedWindow, sharedDocument } = require('../support/world');

const $ = sharedWindow.$;

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

Given('a PopupForm with mock parent', function () {
  // Ensure PopupForm class is loaded
  this.loadSourceFile('chrome_manifest_v3/views/class_popupForm.js');

  this.mockParent = {
    state: {
      boardId: '',
      listId: '',
      cardName: '',
      cardDescription: '',
    },
    $popup: $('<div id="g2tPopup"></div>'),
    $popupMessage: $('<div id="g2tPopupMessage"></div>'),
    $popupContent: $('<div id="g2tPopupContent"></div>'),
    size_k: {
      text: { min: 100 },
    },
  };

  this.instance = new this.G2T.PopupForm({ parent: this.mockParent, app: this.app });
});

Given('DOM with header and sign-out button', function () {
  this._savedHTML = sharedDocument.body.innerHTML;
  sharedDocument.body.innerHTML = `
    <div class="header">
      <a href="#">Test Link</a>
    </div>
    <div id="g2tSignOutButton"></div>
  `;
});

Given('DOM with form input elements', function () {
  this._savedHTML = sharedDocument.body.innerHTML;
  sharedDocument.body.innerHTML = `
    <input id="g2tTitle" value="Test Title" />
    <input id="g2tDesc" value="Test Description" />
    <select id="g2tPosition">
      <option value="top">Top</option>
      <option value="bottom">Bottom</option>
    </select>
  `;
});

Given('DOM with title and description inputs', function () {
  this._savedHTML = sharedDocument.body.innerHTML;
  sharedDocument.body.innerHTML = `
    <input id="g2tTitle" value="Test Card" />
    <textarea id="g2tDesc">Test Description</textarea>
  `;
});

Given('app.temp.title is {string}', function (value) {
  this.app.temp.title = value;
});

Given('app.persist.boardId is {string}', function (value) {
  this.app.persist.boardId = value;
});

Given('app.persist.listId is {string}', function (value) {
  this.app.persist.listId = value;
});

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('init is called on the instance', function () {
  this.instance.init();
});

When('bindEvents is called on the instance', function () {
  this.instance.bindEvents();
});

When('bindData is called on the instance', function () {
  try {
    this.instance.bindData();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
  // Restore DOM
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

When('reset is called on the instance', function () {
  try {
    this.instance.reset();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

When('submit is called on the instance', function () {
  try {
    this.instance.submit();
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

Then('the instance is a PopupForm', function () {
  assert.ok(this.instance instanceof this.G2T.PopupForm);
});

Then('it stores the parent reference', function () {
  assert.strictEqual(this.instance.parent, this.mockParent);
});

Then('the parent reference matches the mock parent', function () {
  assert.strictEqual(this.instance.parent, this.mockParent);
});

Then('the parent state is defined', function () {
  assert.notStrictEqual(this.instance.parent.state, undefined);
});

Then('app events is defined', function () {
  assert.notStrictEqual(this.instance.app.events, undefined);
});

Then('app utils is defined', function () {
  assert.notStrictEqual(this.instance.app.utils, undefined);
});
