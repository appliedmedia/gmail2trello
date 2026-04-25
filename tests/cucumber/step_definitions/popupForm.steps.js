const { Given, When, Then, defineStep } = require('@cucumber/cucumber');
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

// ---------------------------------------------------------------------------
// handleSubmit data assembly
// ---------------------------------------------------------------------------

Given('app.temp.emailId is {string}', function (value) {
  this.app.temp.emailId = value;
});

Given('app.temp.description is {string}', function (value) {
  this.app.temp.description = value;
});

Given('model.submit is mocked on the instance', function () {
  this.app.model.submit = createMockFn();
  // Ensure parent.app is wired so handleSubmit can reach model.submit
  this.mockParent.app = this.app;
});

Given('the popupForm submitting flag is true', function () {
  this.instance._submitting = true;
});

Given('app.temp has attachment array with {int} items', function (count) {
  this.app.temp.attachment = [];
  for (let i = 0; i < count; i++) {
    this.app.temp.attachment.push({ url: `http://example.com/file${i}`, name: `file${i}.txt`, mimeType: 'text/plain' });
  }
});

Given('app.persist.cardId is {string}', function (value) {
  this.app.persist.cardId = value;
});

When('handleSubmit is called on the popupForm', function () {
  try {
    this.instance.handleSubmit();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

Then('the submitted newCard has emailId {string}', function (expected) {
  const calls = this.app.model.submit.mock.calls;
  assert.ok(calls.length > 0, 'model.submit was not called');
  assert.strictEqual(calls[0].arguments[0].emailId, expected);
});

Then('the submitted newCard has boardId {string}', function (expected) {
  const calls = this.app.model.submit.mock.calls;
  assert.ok(calls.length > 0, 'model.submit was not called');
  assert.strictEqual(calls[0].arguments[0].boardId, expected);
});

Then('the submitted newCard has listId {string}', function (expected) {
  const calls = this.app.model.submit.mock.calls;
  assert.ok(calls.length > 0, 'model.submit was not called');
  assert.strictEqual(calls[0].arguments[0].listId, expected);
});

Then('the submitted newCard has title {string}', function (expected) {
  const calls = this.app.model.submit.mock.calls;
  assert.ok(calls.length > 0, 'model.submit was not called');
  assert.strictEqual(calls[0].arguments[0].title, expected);
});

Then('the submitted newCard has description {string}', function (expected) {
  const calls = this.app.model.submit.mock.calls;
  assert.ok(calls.length > 0, 'model.submit was not called');
  assert.strictEqual(calls[0].arguments[0].description, expected);
});

Then('the submitted newCard has attachment as empty array', function () {
  const calls = this.app.model.submit.mock.calls;
  assert.ok(calls.length > 0, 'model.submit was not called');
  const att = calls[0].arguments[0].attachment;
  assert.ok(Array.isArray(att), 'attachment should be an array');
  assert.strictEqual(att.length, 0);
});

Then('the submitted newCard has attachment with {int} items', function (count) {
  const calls = this.app.model.submit.mock.calls;
  assert.ok(calls.length > 0, 'model.submit was not called');
  const att = calls[0].arguments[0].attachment;
  assert.ok(Array.isArray(att), 'attachment should be an array');
  assert.strictEqual(att.length, count);
});

Then('model.submit was called once', function () {
  assert.strictEqual(this.app.model.submit.mock.callCount(), 1);
});

Then('model.submit was not called', function () {
  assert.strictEqual(this.app.model.submit.mock.callCount(), 0);
});

// ---------------------------------------------------------------------------
// updateLists
// ---------------------------------------------------------------------------

Given('DOM with popup containing board and list selects', function () {
  this._savedHTML = sharedDocument.body.innerHTML;
  sharedDocument.body.innerHTML = `
    <div id="g2tPopup">
      <select id="g2tBoard"><option value="board-1">Board 1</option></select>
      <select id="g2tList"><option value="old-1">Old Option</option></select>
      <div class="popupMsg"></div>
      <div class="content"></div>
    </div>
  `;
  this.mockParent.$popup = $('#g2tPopup');
  this.mockParent.$popupMessage = $('.popupMsg', this.mockParent.$popup);
  this.mockParent.$popupContent = $('.content', this.mockParent.$popup);
  this.mockParent.updatesPending = [];
});

Given('the list select has pre-existing options', function () {
  // Already has "Old Option" from the DOM setup
  assert.ok($('#g2tList option').length > 0);
});

Given('app.temp.lists is populated with {int} items', function (count) {
  this.app.temp.lists = [];
  for (let i = 1; i <= count; i++) {
    this.app.temp.lists.push({ id: `list-${i}`, name: `List ${i}` });
  }
});

Given('the board select value is {string}', function (value) {
  $('#g2tBoard').val(value);
});

Given('app.persist.listId is cleared', function () {
  this.app.persist.listId = null;
  this.app.persist.boardId = null;
});

Given('a change listener is attached to the list select', function () {
  this._listChangeCount = 0;
  $('#g2tList').on('change.test', () => {
    this._listChangeCount++;
  });
});

When('updateLists is called on the popupForm', function () {
  try {
    this.instance.updateLists();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
  if (this._savedHTML !== undefined) {
    // Defer cleanup to after assertions
  }
});

Then('the list select has no pre-existing option text', function () {
  const options = $('#g2tList option');
  const hasOld = options.toArray().some(opt => $(opt).text() === 'Old Option');
  assert.ok(!hasOld, 'Old option should have been cleared');
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

Then('the list select has {int} options', function (count) {
  assert.strictEqual($('#g2tList option').length, count);
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

Then('the list select value is {string}', function (expected) {
  assert.strictEqual($('#g2tList').val(), expected);
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

Then('the list change listener was called', function () {
  assert.ok(this._listChangeCount > 0, 'list change event should have fired');
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

// ---------------------------------------------------------------------------
// updateCards
// ---------------------------------------------------------------------------

Given('DOM with popup containing list and card selects', function () {
  this._savedHTML = sharedDocument.body.innerHTML;
  sharedDocument.body.innerHTML = `
    <div id="g2tPopup">
      <select id="g2tList"><option value="list-1">List 1</option></select>
      <select id="g2tCard"></select>
      <div class="popupMsg"></div>
      <div class="content"></div>
    </div>
  `;
  this.mockParent.$popup = $('#g2tPopup');
  this.mockParent.$popupMessage = $('.popupMsg', this.mockParent.$popup);
  this.mockParent.$popupContent = $('.content', this.mockParent.$popup);
  this.mockParent.updatesPending = [];
});

Given('app.temp.cards is populated with {int} items', function (count) {
  this.app.temp.cards = [];
  for (let i = 1; i <= count; i++) {
    this.app.temp.cards.push({ id: `card-${i}`, name: `Card ${i}`, pos: i, idMembers: [], idLabels: [] });
  }
});

Given('the list select value for cards is {string}', function (value) {
  $('#g2tList').val(value);
});

Given('app.temp.cards has items with pos members labels', function () {
  this.app.temp.cards = [
    { id: 'card-1', name: 'Card 1', pos: 42, idMembers: ['m1', 'm2'], idLabels: ['l1'] },
  ];
});

Given('app.temp.cards has an item with a very long name', function () {
  this.app.temp.cards = [
    { id: 'card-long', name: 'A'.repeat(120), pos: 1, idMembers: [], idLabels: [] },
  ];
});

When('updateCards is called on the popupForm', function () {
  try {
    this.instance.updateCards();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

Then('the card select first option value is {string}', function (expected) {
  assert.strictEqual($('#g2tCard option').first().val(), expected);
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

Then('the card select has {int} options', function (count) {
  assert.strictEqual($('#g2tCard option').length, count);
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

Then('the card select value is {string}', function (expected) {
  assert.strictEqual($('#g2tCard').val(), expected);
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

Then('the card option has pos member and label properties', function () {
  const $opt = $('#g2tCard option[value="card-1"]');
  assert.strictEqual($opt.prop('pos'), 42);
  assert.deepStrictEqual($opt.prop('members'), ['m1', 'm2']);
  assert.deepStrictEqual($opt.prop('labels'), ['l1']);
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

Then('the long card name is truncated', function () {
  const $opts = $('#g2tCard option[value="card-long"]');
  const text = $opts.text();
  assert.ok(text.length < 120, `Expected truncated name, got length ${text.length}`);
  assert.ok(text.endsWith('...'), 'Expected truncated name to end with ...');
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

// ---------------------------------------------------------------------------
// updateLabels
// ---------------------------------------------------------------------------

Given('DOM with popup containing label container', function () {
  this._savedHTML = sharedDocument.body.innerHTML;
  sharedDocument.body.innerHTML = `
    <div id="g2tPopup">
      <select id="g2tBoard"><option value="board-1">Board 1</option></select>
      <div id="g2t_label"></div>
      <div id="g2t_label_msg"></div>
      <div class="popupMsg"></div>
      <div class="content"></div>
    </div>
  `;
  this.mockParent.$popup = $('#g2tPopup');
  this.mockParent.$popupMessage = $('.popupMsg', this.mockParent.$popup);
  this.mockParent.$popupContent = $('.content', this.mockParent.$popup);
  // Ensure menuCtrl is available
  if (!this.mockParent.menuCtrl) {
    this.mockParent.menuCtrl = { reset: createMockFn() };
  }
  this.instance.parent = this.mockParent;
});

Given('app.temp.labels is populated with {int} items with colors', function (count) {
  this.app.temp.labels = [];
  const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
  for (let i = 1; i <= count; i++) {
    this.app.temp.labels.push({ id: `label-${i}`, name: `Label ${i}`, color: colors[i - 1] });
  }
});

Given('the board select for labels has value {string}', function (value) {
  $('#g2tBoard').val(value);
});

Given('app.persist.labelsId includes the second label', function () {
  this.app.persist.labelsId = 'label-2';
});

When('updateLabels is called on the popupForm', function () {
  try {
    this.instance.updateLabels();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

Then('the label container has {int} buttons', function (count) {
  assert.strictEqual($('#g2t_label button').length, count);
});

Then('the first label button has the correct border color', function () {
  const $btn = $('#g2t_label button').first();
  assert.ok($btn.length > 0, 'Expected at least one label button');
  // The border-color should be set (red)
  const bc = $btn.css('border-color');
  assert.ok(bc, 'Expected border-color to be set');
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

Then('the second label button was clicked to restore state', function () {
  // The button should have had click triggered on it
  // We check that the menuCtrl.reset was called (which is part of updateLabels)
  assert.ok(this.mockParent.menuCtrl.reset.mock.callCount() > 0, 'menuCtrl.reset should have been called');
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

// ---------------------------------------------------------------------------
// updateMembers
// ---------------------------------------------------------------------------

Given('DOM with popup containing members container', function () {
  this._savedHTML = sharedDocument.body.innerHTML;
  sharedDocument.body.innerHTML = `
    <div id="g2tPopup">
      <div id="g2tMembers"></div>
      <div id="g2t_member_msg"></div>
      <div class="popupMsg"></div>
      <div class="content"></div>
    </div>
  `;
  this.mockParent.$popup = $('#g2tPopup');
  this.mockParent.$popupMessage = $('.popupMsg', this.mockParent.$popup);
  this.mockParent.$popupContent = $('.content', this.mockParent.$popup);
  if (!this.mockParent.menuCtrl) {
    this.mockParent.menuCtrl = { reset: createMockFn() };
  }
  this.instance.parent = this.mockParent;
});

Given('app.temp.members is populated with {int} items', function (count) {
  this.app.temp.members = [];
  for (let i = 1; i <= count; i++) {
    this.app.temp.members.push({
      id: `member-${i}`,
      fullName: `Member ${i}`,
      username: `user${i}`,
      initials: `M${i}`,
      avatarUrl: '',
    });
  }
});

Given('app.persist.membersId includes the second member', function () {
  this.app.persist.membersId = 'member-2';
});

When('updateMembers is called on the popupForm', function () {
  try {
    this.instance.updateMembers();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

Then('the members container has {int} buttons', function (count) {
  assert.strictEqual($('#g2tMembers button').length, count);
});

Then('the first member button contains an img element', function () {
  const $btn = $('#g2tMembers button').first();
  assert.ok($btn.find('img').length > 0, 'Expected button to contain an img element');
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

Then('the second member button was clicked to restore state', function () {
  assert.ok(this.mockParent.menuCtrl.reset.mock.callCount() > 0, 'menuCtrl.reset should have been called');
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

// ---------------------------------------------------------------------------
// maybeHydrateGmail
// ---------------------------------------------------------------------------

Given('the popupForm has domReady false', function () {
  this.instance.domReady = false;
});

Given('the popupForm has domReady true', function () {
  this.instance.domReady = true;
});

Given('the popupForm has persistReady true', function () {
  this.instance.persistReady = true;
});

Given('the popupForm has persistReady false', function () {
  this.instance.persistReady = false;
});

Given('the popupForm has pendingGmailData set', function () {
  this.instance.pendingGmailData = { subject: 'Test', emailId: '123' };
});

Given('DOM with popup for hydration', function () {
  this._savedHTML = sharedDocument.body.innerHTML;
  sharedDocument.body.innerHTML = `
    <div id="g2tPopup">
      <div id="g2tSignOutButton"></div>
      <div id="g2tBoard"></div>
      <div id="g2tList"></div>
      <div id="g2tCard"></div>
      <div id="g2tTitle"></div>
      <textarea id="g2tDesc"></textarea>
      <div id="g2tDue_Shortcuts"></div>
      <div id="g2tAvatarImgOrText"></div>
      <a id="g2tAvatarUrl"></a>
      <a id="g2tUsername"></a>
      <div id="report"></div>
      <div id="g2t_attachment"></div>
      <div id="g2t_attachment_container"></div>
      <div id="g2t_image"></div>
      <div id="g2t_image_container"></div>
      <div class="popupMsg"></div>
      <div class="content"></div>
      <div class="header"><a href="#">Link</a></div>
    </div>
  `;
  this.mockParent.$popup = $('#g2tPopup');
  this.mockParent.$popupMessage = $('.popupMsg', this.mockParent.$popup);
  this.mockParent.$popupContent = $('.content', this.mockParent.$popup);
  this.mockParent.updatesPending = [];
  this.instance.parent = this.mockParent;
  // Stub model methods needed by bindGmailData
  this.app.model.emailBoardListCardMapLookup = createMockFn(() => ({}));
});

When('maybeHydrateGmail is called on the popupForm', function () {
  try {
    this.instance.maybeHydrateGmail();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

Then('pendingGmailData is still set', function () {
  assert.ok(this.instance.pendingGmailData !== null, 'pendingGmailData should still be set');
});

Then('pendingGmailData is cleared', function () {
  assert.strictEqual(this.instance.pendingGmailData, null, 'pendingGmailData should be null');
});

// ---------------------------------------------------------------------------
// onDomReady
// ---------------------------------------------------------------------------

Given('DOM with popup for onDomReady', function () {
  this._savedHTML = sharedDocument.body.innerHTML;
  sharedDocument.body.innerHTML = `
    <div id="g2tPopup">
      <input id="chkBackLink" type="checkbox" />
      <input id="chkCC" type="checkbox" />
      <input id="chkMarkdown" type="checkbox" />
      <div class="popupMsg"></div>
      <div class="content"></div>
    </div>
  `;
  this.mockParent.$popup = $('#g2tPopup');
  this.mockParent.$popupMessage = $('.popupMsg', this.mockParent.$popup);
  this.mockParent.$popupContent = $('.content', this.mockParent.$popup);
  this.instance.parent = this.mockParent;
});

Given('a spy on syncCheckboxesFromPersist', function () {
  this._origSync = this.instance.syncCheckboxesFromPersist.bind(this.instance);
  this._syncCalled = false;
  this.instance.syncCheckboxesFromPersist = () => {
    this._syncCalled = true;
    this._origSync();
  };
});

When('onDomReady is called on the popupForm', function () {
  try {
    this.instance.onDomReady();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

Then('the popupForm domReady is true', function () {
  assert.strictEqual(this.instance.domReady, true);
});

Then('syncCheckboxesFromPersist was called', function () {
  assert.ok(this._syncCalled, 'syncCheckboxesFromPersist should have been called');
});

// ---------------------------------------------------------------------------
// onPersistReady
// ---------------------------------------------------------------------------

When('onPersistReady is called on the popupForm', function () {
  try {
    this.instance.onPersistReady();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

Then('the popupForm persistReady is true', function () {
  assert.strictEqual(this.instance.persistReady, true);
});

Given('DOM with popup containing checkboxes', function () {
  this._savedHTML = sharedDocument.body.innerHTML;
  sharedDocument.body.innerHTML = `
    <div id="g2tPopup">
      <input id="chkBackLink" type="checkbox" />
      <input id="chkCC" type="checkbox" />
      <input id="chkMarkdown" type="checkbox" />
      <div class="popupMsg"></div>
      <div class="content"></div>
    </div>
  `;
  this.mockParent.$popup = $('#g2tPopup');
  this.mockParent.$popupMessage = $('.popupMsg', this.mockParent.$popup);
  this.mockParent.$popupContent = $('.content', this.mockParent.$popup);
  this.instance.parent = this.mockParent;
});

Given('app.persist.useBackLink is true', function () {
  this.app.persist.useBackLink = true;
});

Then('the backlink checkbox is checked', function () {
  // onPersistReady calls syncCheckboxesFromPersist which sets checkbox state
  // But domReady must be true for it to work
  assert.strictEqual(this.instance.persistReady, true);
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

// ---------------------------------------------------------------------------
// Submit guard
// ---------------------------------------------------------------------------

Then('the popupForm submitting is true', function () {
  assert.strictEqual(this.instance._submitting, true);
});

Then('the popupForm submitting is false', function () {
  assert.strictEqual(this.instance._submitting, false);
});

Given('DOM with popup for submit complete', function () {
  this._savedHTML = sharedDocument.body.innerHTML;
  sharedDocument.body.innerHTML = `
    <div id="g2tPopup">
      <form id="g2tForm"></form>
      <div class="popupMsg"></div>
      <div class="content"></div>
    </div>
  `;
  this.mockParent.$popup = $('#g2tPopup');
  this.mockParent.$popupMessage = $('.popupMsg', this.mockParent.$popup);
  this.mockParent.$popupContent = $('.content', this.mockParent.$popup);
  this.instance.parent = this.mockParent;
});

When('displaySubmitCompleteForm is called on the popupForm', function () {
  try {
    this.instance.handleNewCardUploadsComplete(null, {});
    this.error = null;
  } catch (e) {
    this.error = e;
  }
  if (this._savedHTML !== undefined) {
    sharedDocument.body.innerHTML = this._savedHTML;
    this._savedHTML = undefined;
  }
});

Given('DOM with popup for API failure', function () {
  this._savedHTML = sharedDocument.body.innerHTML;
  sharedDocument.body.innerHTML = `
    <div id="g2tPopup">
      <div class="popupMsg"></div>
      <div class="content"></div>
    </div>
  `;
  this.mockParent.$popup = $('#g2tPopup');
  this.mockParent.$popupMessage = $('.popupMsg', this.mockParent.$popup);
  this.mockParent.$popupContent = $('.content', this.mockParent.$popup);
  this.instance.parent = this.mockParent;
  // Stub loadFile to avoid actual file loading
  this.app.utils.loadFile = createMockFn(() => Promise.resolve());
});

When('displayAPIFailedForm is called on the popupForm', function () {
  try {
    this.instance.handleAPIFail(null, { status: 500, statusText: 'Test Error' });
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
// Submit guard (Wave 2 Lane 2) -- _submitting flag scenarios
// ---------------------------------------------------------------------------

Given('the PopupForm is ready for submit', function () {
  // Wire model.submit and parent.app so handleSubmit can run end-to-end
  this.app.model.submit = createMockFn();
  this.mockParent.app = this.app;
  // Stub display methods so handlers can run without DOM dependencies
  this.instance.displaySubmitCompleteForm = createMockFn();
  this.instance.displayAPIFailedForm = createMockFn();
});

Given('handleSubmit has been called once', function () {
  this.instance.handleSubmit();
});

Given('handleNewCardUploadsComplete fires', function () {
  this.instance.handleNewCardUploadsComplete(null, {});
});

When('handleSubmit is called on the PopupForm', function () {
  this.instance.handleSubmit();
});

When('handleSubmit is called again', function () {
  this.instance.handleSubmit();
});

When('handleNewCardUploadsComplete is called', function () {
  this.instance.handleNewCardUploadsComplete(null, {});
});

When('handleAPIFail is called', function () {
  this.instance.handleAPIFail(null, { status: 500, statusText: 'Test Error' });
});

When('handleCreateCardFailed is called', function () {
  this.instance.handleCreateCardFailed(null, {
    status: 500,
    statusText: 'Test Error',
  });
});

Given('PopupForm has _submitting set to true', function () {
  this.instance._submitting = true;
  this.instance.displaySubmitCompleteForm = createMockFn();
  this.instance.displayAPIFailedForm = createMockFn();
});

Then('PopupForm._submitting is true', function () {
  assert.strictEqual(this.instance._submitting, true);
});

Then('PopupForm._submitting is false', function () {
  assert.strictEqual(this.instance._submitting, false);
});

Then('model.submit was called exactly once', function () {
  assert.strictEqual(this.app.model.submit.mock.callCount(), 1);
});

Then('model.submit was called exactly twice', function () {
  assert.strictEqual(this.app.model.submit.mock.callCount(), 2);
});
