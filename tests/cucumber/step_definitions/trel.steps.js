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

// ---------------------------------------------------------------------------
// createCard payload verification steps
// ---------------------------------------------------------------------------

When('createCard is called with title {string}', function (title) {
  this.instance.createCard({ title, listId: 'list-1', boardId: 'board-1' });
});

When('createCard is called with subject {string} and no title', function (subject) {
  this.instance.createCard({ subject, listId: 'list-1', boardId: 'board-1' });
});

When('createCard is called with labels {string}', function (labelsStr) {
  const labels = labelsStr.split(',');
  this.instance.createCard({ title: 'Test', listId: 'list-1', boardId: 'board-1', labels });
});

When('createCard is called with members {string}', function (membersStr) {
  const members = membersStr.split(',');
  this.instance.createCard({ title: 'Test', listId: 'list-1', boardId: 'board-1', members });
});

When('createCard is called with dueDate {string}', function (dueDate) {
  this.instance.createCard({ title: 'Test', listId: 'list-1', boardId: 'board-1', dueDate });
});

When('createCard is called with no position specified', function () {
  this.instance.createCard({ title: 'Test', listId: 'list-1', boardId: 'board-1' });
});

When('createCard is called with position {string}', function (position) {
  this.instance.createCard({ title: 'Test', listId: 'list-1', boardId: 'board-1', position });
});

When('createCard is called with null data on Trel', function () {
  this.instance.createCard(null);
});

Then('the wrapApiCall params have name {string}', function (expected) {
  const calls = this._wrapApiCallSpy.mock.calls;
  assert.ok(calls.length > 0, 'Expected wrapApiCall to have been called');
  const params = calls[calls.length - 1].arguments[2];
  assert.strictEqual(params.name, expected);
});

Then('the wrapApiCall params have idLabels {string}', function (expected) {
  const calls = this._wrapApiCallSpy.mock.calls;
  const params = calls[calls.length - 1].arguments[2];
  assert.deepStrictEqual(params.idLabels, expected.split(','));
});

Then('the wrapApiCall params have idMembers {string}', function (expected) {
  const calls = this._wrapApiCallSpy.mock.calls;
  const params = calls[calls.length - 1].arguments[2];
  assert.deepStrictEqual(params.idMembers, expected.split(','));
});

Then('the wrapApiCall params have due {string}', function (expected) {
  const calls = this._wrapApiCallSpy.mock.calls;
  const params = calls[calls.length - 1].arguments[2];
  assert.strictEqual(params.due, expected);
});

Then('the wrapApiCall params have pos {string}', function (expected) {
  const calls = this._wrapApiCallSpy.mock.calls;
  const params = calls[calls.length - 1].arguments[2];
  assert.strictEqual(params.pos, expected);
});

// ---------------------------------------------------------------------------
// Success/failure callback path steps
// ---------------------------------------------------------------------------

When('getUser_success is called with user data on Trel', function () {
  this.instance.getUser_success({ id: 'u1', fullName: 'Test Trello User' });
});

Then('app.persist.user has fullName {string}', function (expected) {
  assert.strictEqual(this.app.persist.user.fullName, expected);
});

When('getBoards_success is called with boards data on Trel', function () {
  this.instance.getBoards_success([{ id: 'b1', name: 'Board 1' }, { id: 'b2', name: 'Board 2' }]);
});

When('getLists_success is called with lists data on Trel', function () {
  this.instance.getLists_success([{ id: 'l1', name: 'List 1' }, { id: 'l2', name: 'List 2' }, { id: 'l3', name: 'List 3' }]);
});

When('getCards_success is called with cards data on Trel', function () {
  this.instance.getCards_success([{ id: 'c1', name: 'Card 1' }, { id: 'c2', name: 'Card 2' }]);
});

When('createCard_success is called on Trel with response id {string}', function (cardId) {
  this.instance.createCard_success({ title: 'Test' }, { id: cardId });
});

Then('the createCard_success event data has cardId {string}', function (expected) {
  const calls = this.app.events.emit.mock.calls;
  const call = calls.find(c => c.arguments[0] === 'createCard_success');
  assert.ok(call, 'Expected createCard_success event');
  assert.strictEqual(call.arguments[1].data.cardId, expected);
});

// ---------------------------------------------------------------------------
// Version counter / stale response steps
// ---------------------------------------------------------------------------

When('getLists_success is called with {int} list on Trel', function (count) {
  const data = Array.from({ length: count }, (_, i) => ({ id: `l-${i}`, name: `List ${i}` }));
  this.instance.getLists_success(data);
});

When('getCards_success is called with {int} card on Trel', function (count) {
  const data = Array.from({ length: count }, (_, i) => ({ id: `c-${i}`, name: `Card ${i}` }));
  this.instance.getCards_success(data);
});

When('getLists_success is called with lists named {string}', function (name) {
  this.instance.getLists_success([{ id: 'l-1', name }]);
});

Then('the first list name is {string}', function (expected) {
  assert.strictEqual(this.app.temp.lists[0].name, expected);
});
