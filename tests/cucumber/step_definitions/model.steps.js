const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const { createMockFn } = require('../support/world');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createModel(world) {
  const mockTrel = new world.G2T.Trel({ app: world.app });
  return new world.G2T.Model({ parent: mockTrel, app: world.app });
}

function generateItems(tag, count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${i + 1}`,
    name: `${tag} ${i + 1}`,
  }));
}

const cardSubmissionData = {
  basic: { title: 'Test Card', description: 'Test Description', listId: 'test-list-id' },
  withAttachments: { title: 'Card with Attachments', description: 'Description with files', listId: 'test-list-id', attachments: [{ name: 'test.txt', value: 'test-content' }] },
  withMembers: { title: 'Card with Members', description: 'Description with members', listId: 'test-list-id', members: ['member1', 'member2'] },
  withLabels: { title: 'Card with Labels', description: 'Description with labels', listId: 'test-list-id', labels: ['label1', 'label2'] },
  empty: {},
  null: null,
};

const eventHandlerArgs = {
  handleClassModelStateLoaded: [{ type: 'stateLoaded' }, { data: 'test-data' }],
  handleSubmittedFormShownComplete: [{ id: 'test-form' }, { data: 'test-data' }],
  handlePostCardCreateUploadDisplayDone: [{ id: 'test-upload' }, { data: 'test-data' }],
  handleBoardChanged: [{ id: 'test-board' }, { boardId: 'test-board-id' }],
  handleListChanged: [{ id: 'test-list' }, { listId: 'test-list-id' }],
};

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given('a Model with Trel parent', function () {
  this.instance = createModel(this);
});

Given('Model trelloAuthorized is reset to false', function () {
  this.instance.app.persist.trelloAuthorized = false;
});

Given('Model trelloAuthorized is set to true', function () {
  this.instance.app.persist.trelloAuthorized = true;
});

Given('an existing email mapping for {string}', function (email) {
  this.instance.app.persist.eblcmArray = [{
    email, boardId: 123, listId: 456, cardId: 789, timestamp: Date.now(),
  }];
});

Given('an empty eblcmArray', function () {
  this.instance.app.persist.eblcmArray = [];
});

Given('an existing email mapping for {string} with old values', function (email) {
  this.instance.app.persist.eblcmArray = [{
    email, boardId: 'old-board', listId: 'old-list', timestamp: Date.now(),
  }];
});

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When('init is called on the Model', function () {
  try {
    this.instance.init();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('checkTrelloAuthorized is called on the Model', function () {
  try {
    this.instance.checkTrelloAuthorized();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('{word} is called on the Model with authorization data {string}', function (method, authorized) {
  const data = { authorized: authorized === 'true' };
  this.instance[method](data);
});

When('deauthorizeTrello is called on the Model', function () {
  this.instance.deauthorizeTrello();
});

When('loadTrelloUser is called on the Model', function () {
  try {
    this.instance.loadTrelloUser();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('loadTrelloUser_success is called with {string} {string} {string}', function (id, fullName, username) {
  const data = {};
  if (id) data.id = id;
  if (fullName) data.fullName = fullName;
  if (username) data.username = username;
  this.instance.loadTrelloUser_success(data);
});

When('loadTrelloUser_failure is called on the Model', function () {
  try {
    this.instance.loadTrelloUser_failure({ error: 'Failed to load user data' });
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('loadTrelloBoards is called on the Model', function () {
  try {
    this.instance.loadTrelloBoards();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('loadTrelloBoards_success is called with {int} boards', function (count) {
  const data = generateItems('Board', count);
  this.instance.loadTrelloBoards_success(data);
});

When('loadTrelloBoards_failure is called on the Model', function () {
  try {
    this.instance.loadTrelloBoards_failure({ error: 'Failed to load boards data' });
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('loadTrelloLists is called on the Model with {string}', function (boardId) {
  try {
    this.instance.loadTrelloLists(boardId);
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('loadTrelloLists_success is called with {int} lists', function (count) {
  const data = generateItems('List', count);
  this.instance.loadTrelloLists_success(data);
});

When('loadTrelloLists_failure is called on the Model', function () {
  try {
    this.instance.loadTrelloLists_failure({ error: 'Failed to load lists' });
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('loadTrelloCards is called on the Model with {string}', function (listId) {
  try {
    this.instance.loadTrelloCards(listId);
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('loadTrelloCards_success is called with {int} cards', function (count) {
  const data = generateItems('Card', count);
  this.instance.loadTrelloCards_success(data);
});

When('loadTrelloCards_failure is called on the Model', function () {
  try {
    this.instance.loadTrelloCards_failure({ error: 'Failed to load cards' });
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('loadTrelloMembers is called on the Model with {string}', function (boardId) {
  try {
    this.instance.loadTrelloMembers(boardId);
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('loadTrelloMembers_success is called with {int} members', function (count) {
  const data = generateItems('Member', count);
  this.instance.loadTrelloMembers_success(data);
});

When('loadTrelloMembers_failure is called on the Model', function () {
  try {
    this.instance.loadTrelloMembers_failure({ error: 'Failed to load members' });
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('loadTrelloLabels is called on the Model with {string}', function (boardId) {
  try {
    this.instance.loadTrelloLabels(boardId);
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('loadTrelloLabels_success is called with {int} labels', function (count) {
  const data = generateItems('Label', count);
  this.instance.loadTrelloLabels_success(data);
});

When('loadTrelloLabels_failure is called on the Model', function () {
  try {
    this.instance.loadTrelloLabels_failure({ error: 'Failed to load labels' });
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('handleTrelloUserReady is called on the Model', function () {
  this._loadTrelloBoardsSpy = createMockFn();
  const orig = this.instance.loadTrelloBoards.bind(this.instance);
  this.instance.loadTrelloBoards = function (...args) {
    this._loadTrelloBoardsSpy(...args);
    return orig(...args);
  }.bind(this);
  this.instance._loadTrelloBoardsSpy = this._loadTrelloBoardsSpy;
  this.instance.handleTrelloUserReady();
});

When('Model submit is called with {string}', function (dataType) {
  try {
    this.instance.submit(cardSubmissionData[dataType]);
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('Model submit is called with missing boardId', function () {
  this.instance.submit({ title: 'Test Card', listId: 'list1' });
});

When('Model submit is called with missing listId', function () {
  this.instance.submit({ title: 'Test Card', boardId: 'board1' });
});

When('Model createCard is called with basic data', function () {
  try {
    this.instance.createCard({ title: 'Test Card', description: 'Test Description' });
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('Model createCard is called with null', function () {
  this.instance.createCard(null);
});

When('Model uploadAttachment is called with attachment data', function () {
  try {
    this.instance.uploadAttachment({ attachments: [{ name: 'test.txt', value: 'test-content' }] });
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('Model uploadAttachment is called with no attachments', function () {
  this.instance.uploadAttachment({ title: 'Test' });
});

When('Model uploadAttachment is called with empty attachments', function () {
  this.instance.uploadAttachment({ attachment: [] });
});

When('emailBoardListCardMapLookup is called for {string}', function (email) {
  this._lookupResult = this.instance.emailBoardListCardMapLookup({ email });
});

When('emailBoardListCardMapUpdate is called for {string}', function (email) {
  this.instance.emailBoardListCardMapUpdate({
    email, boardId: 999, listId: 888, cardId: 777,
  });
});

When('emailBoardListCardMapUpdate is called for {string} with new values', function (email) {
  this.instance.emailBoardListCardMapUpdate({
    email, boardId: 'new-board', listId: 'new-list',
  });
});

When('Model event handler {word} is called', function (method) {
  try {
    const args = eventHandlerArgs[method] || [];
    this.instance[method](...args);
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('bindEvents is called on the Model', function () {
  try {
    this.instance.bindEvents();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('bindEvents is called on the Model and timed', function () {
  const start = Date.now();
  try {
    this.instance.bindEvents();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
  this._duration = Date.now() - start;
});

// Performance: generic timed success method for Scenario Outline
When(/^loadTrello(\w+)_success is called with (\d+) items$/, function (tag, count) {
  const numCount = parseInt(count, 10);
  const data = Array.from({ length: numCount }, (_, i) => ({
    id: `${tag.toLowerCase()}-${i}`,
    name: `${tag} ${i}`,
  }));
  const methodName = `loadTrello${tag}_success`;
  assert.notStrictEqual(this.instance[methodName], undefined, `${methodName} should be defined`);
  const start = Date.now();
  this.instance[methodName](data);
  this._duration = Date.now() - start;
});

When('the full Model workflow is executed', function () {
  this.instance.checkTrelloAuthorized_success({ authorized: true });
  assert.strictEqual(this.instance.app.persist.trelloAuthorized, true);

  this.instance.loadTrelloUser_success({ id: '123', fullName: 'Test User' });
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(this.instance.app.persist.user)),
    { id: '123', fullName: 'Test User' }
  );

  this.instance.loadTrelloBoards_success([{ id: '1', name: 'Test Board' }]);
  this.instance.loadTrelloLists_success([{ id: '1', name: 'Test List' }]);
});

When('Model loadTrelloBoards_failure then loadTrelloBoards_success is called', function () {
  this.instance.loadTrelloBoards_failure({ error: 'Network error' });
  this.instance.loadTrelloBoards_success([{ id: '1', name: 'Recovery Board' }]);
});

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then('the Model stores the app reference', function () {
  assert.strictEqual(this.instance.app, this.app);
});

Then('the Model parent is a Trel instance', function () {
  assert.ok(this.instance.parent instanceof this.G2T.Trel);
});

Then('the Model trel is a Trel instance', function () {
  assert.ok(this.instance.trel instanceof this.G2T.Trel);
});

Then('the Model emailBoardListCardMap is an object', function () {
  assert.strictEqual(typeof this.instance.emailBoardListCardMap, 'object');
});

Then('the Model has default state values', function () {
  const defaults = {
    'app.persist.trelloAuthorized': false,
    'app.temp.boards': [],
    'app.temp.lists': [],
    'app.temp.cards': [],
    'app.temp.members': [],
    'app.temp.labels': [],
  };
  for (const [pathStr, expected] of Object.entries(defaults)) {
    const value = pathStr.split('.').reduce((obj, key) => obj[key], this.instance);
    assert.deepStrictEqual(
      JSON.parse(JSON.stringify(value)),
      JSON.parse(JSON.stringify(expected)),
      pathStr
    );
  }
});

Then('Model trelloAuthorized is {word}', function (expected) {
  assert.strictEqual(this.instance.app.persist.trelloAuthorized, expected === 'true');
});

Then('app.persist.user matches {string} {string} {string}', function (id, fullName, username) {
  const user = this.instance.app.persist.user;
  if (id) assert.strictEqual(user.id, id);
  if (fullName) assert.strictEqual(user.fullName, fullName);
  if (username) assert.strictEqual(user.username, username);
  if (!id && !fullName && !username) {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(user)), {});
  }
});

Then('app.temp.{word} has {int} items', function (prop, count) {
  assert.strictEqual(this.instance.app.temp[prop].length, count);
});

Then('loadTrelloBoards was called on the Model', function () {
  assert.ok(this._loadTrelloBoardsSpy.mock.callCount() > 0);
});

Then('the lookup result has email {string}', function (expected) {
  assert.notStrictEqual(this._lookupResult, undefined);
  assert.strictEqual(this._lookupResult.email, expected);
});

Then('the lookup result has boardId {int}', function (expected) {
  assert.strictEqual(this._lookupResult.boardId, expected);
});

Then('the lookup result has listId {int}', function (expected) {
  assert.strictEqual(this._lookupResult.listId, expected);
});

Then('the lookup result has cardId {int}', function (expected) {
  assert.strictEqual(this._lookupResult.cardId, expected);
});

Then('emailBoardListCardMapLookup for {string} returns the mapping', function (email) {
  const result = this.instance.emailBoardListCardMapLookup({ email });
  assert.notStrictEqual(result, undefined);
  assert.strictEqual(result.email, email);
  assert.strictEqual(result.boardId, 999);
  assert.strictEqual(result.listId, 888);
  assert.strictEqual(result.cardId, 777);
});

Then('only one entry exists for {string}', function (email) {
  const results = this.instance.app.persist.eblcmArray.filter(e => e.email === email);
  assert.strictEqual(results.length, 1);
});

Then('the mapping has boardId {string} and listId {string}', function (boardId, listId) {
  const email = this.instance.app.persist.eblcmArray[0].email;
  const result = this.instance.emailBoardListCardMapLookup({ email });
  assert.notStrictEqual(result, undefined);
  assert.strictEqual(result.boardId, boardId);
  assert.strictEqual(result.listId, listId);
});

Then('the Model emitted {string}', function (eventName) {
  const calls = this.instance.app.events.emit.mock.calls;
  const found = calls.some(c => c.arguments[0] === eventName);
  assert.ok(found, `Expected "${eventName}" event to be emitted`);
});

Then('it completed within {int}ms', function (maxMs) {
  assert.ok(this._duration < maxMs, `took ${this._duration}ms, max is ${maxMs}ms`);
});

Then('Model submit does not throw', function () {
  assert.doesNotThrow(() => {
    this.instance.submit({ title: 'Test Card', description: 'Test Description', listId: '1' });
  });
});
