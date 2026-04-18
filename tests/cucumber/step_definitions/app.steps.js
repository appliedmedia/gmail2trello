const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const { sharedWindow, createMockFn, createApp, loadSourceFile } = require('../support/world');

// ---------------------------------------------------------------------------
// Ensure all App dependencies are loaded
// ---------------------------------------------------------------------------

const classFiles = [
  'chrome_manifest_v3/class_eventTarget.js',
  'chrome_manifest_v3/class_goog.js',
  'chrome_manifest_v3/class_gmail.js',
  'chrome_manifest_v3/class_waitCounter.js',
  'chrome_manifest_v3/class_menuControl.js',
  'chrome_manifest_v3/class_trel.js',
  'chrome_manifest_v3/class_model.js',
  'chrome_manifest_v3/views/class_popupForm.js',
  'chrome_manifest_v3/views/class_popupView.js',
  'chrome_manifest_v3/class_app.js',
];

for (const f of classFiles) {
  try { loadSourceFile(f); } catch (_) { /* already loaded */ }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a real App instance with all timer/observer mocks to prevent hangs.
 */
function createRealApp(world) {
  const win = world.window;

  const origSI = win.setInterval;
  const origST = win.setTimeout;

  win.setInterval = function () { return 0; };
  win.setTimeout = function () { return 0; };

  const app = new world.G2T.App();

  win.setInterval = origSI;
  win.setTimeout = origST;

  // Stub bindData/bindGmailData if missing (they may live on PopupForm)
  if (typeof app.popupView.bindData !== 'function') {
    app.popupView.bindData = createMockFn();
  }
  if (typeof app.popupView.bindGmailData !== 'function') {
    app.popupView.bindGmailData = createMockFn();
  }

  return app;
}

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given('a real App instance', function () {
  this._realApp = createRealApp(this);
  this.instance = this._realApp;
  // Keep a reference mock app for comparison
  this._refApp = this.app;
});

Given('the App model is set to null', function () {
  this._realApp.model = null;
});

Given('the App model.trello is set to null', function () {
  this._realApp.model.trello = null;
});

Given('the App popupView is set to null', function () {
  this._realApp.popupView = null;
});

Given('the App goog.init is set to throw', function () {
  this._realApp.goog.init = createMockFn(() => {
    throw new Error('Chrome init failed');
  });
});

Given('the App has {int} log entries pre-loaded', function (count) {
  this._realApp.temp.log.memory = Array.from({ length: count }, (_, i) => `log entry ${i}`);
  this._realApp.temp.log.count = count;
});

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When('persistLoad is called on the App', function () {
  try {
    this._realApp.persistLoad();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('persistSave is called on the App', function () {
  try {
    this._realApp.persistSave();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('updateData is called on the App', function () {
  try {
    this._realApp.updateData();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('handleClassAppStateLoaded is called with state values', function () {
  this._originalPersist = { ...this._realApp.persist };
  this._realApp.handleClassAppStateLoaded({ type: 'stateLoaded' }, {
    trelloAuthorized: true,
    boardId: 'test-board',
    listId: 'test-list',
  });
});

When('handleClassAppStateLoaded is called with null params', function () {
  this._originalPersist = { ...this._realApp.persist };
  this._realApp.handleClassAppStateLoaded({ type: 'stateLoaded' }, null);
});

When('handleClassAppStateLoaded is called with null event', function () {
  try {
    this._realApp.handleClassAppStateLoaded(null, {});
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('handleClassAppStateLoaded is called with event missing type', function () {
  try {
    this._realApp.handleClassAppStateLoaded({ data: {} }, {});
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('bindEvents is called on the App', function () {
  try {
    this._realApp.bindEvents();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('init is called on the App', function () {
  try {
    this._realApp.init();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('the App persist is updated with trelloAuthorized, boardId, listId', function () {
  this._realApp.persist.trelloAuthorized = true;
  this._realApp.persist.boardId = 'test-board';
  this._realApp.persist.listId = 'test-list';
});

When('the App temp is updated with description, title, and attachments', function () {
  this._realApp.temp.description = 'Test description';
  this._realApp.temp.title = 'Test title';
  this._realApp.temp.attachments = [{ name: 'test.txt', value: 'content' }];
});

When('Object.assign merges new state into App persist', function () {
  Object.assign(this._realApp.persist, {
    trelloAuthorized: true,
    boardId: 'new-board',
    listId: 'new-list',
  });
});

When('init is called on the App and timed', function () {
  const start = Date.now();
  this._realApp.init();
  this._duration = Date.now() - start;
});

When('a large state update is applied to the App', function () {
  const largeState = {
    trelloBoards: Array.from({ length: 100 }, (_, i) => ({ id: `board-${i}`, name: `Board ${i}` })),
    trelloLists: Array.from({ length: 100 }, (_, i) => ({ id: `list-${i}`, name: `List ${i}` })),
    trelloCards: Array.from({ length: 100 }, (_, i) => ({ id: `card-${i}`, name: `Card ${i}` })),
  };
  const start = Date.now();
  Object.assign(this._realApp.persist, largeState);
  this._duration = Date.now() - start;
});

When('{int} log entries are pushed to the App', function (count) {
  for (let i = 0; i < count; i++) {
    this._realApp.temp.log.memory.push(`log entry ${i}`);
    this._realApp.temp.log.count++;
  }
});

When('log cleanup trims to max', function () {
  const log = this._realApp.temp.log;
  if (log.memory.length > log.max) {
    log.memory = log.memory.slice(-log.max);
    log.count = log.memory.length;
  }
});

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then('the App has Trello API key {string}', function (expected) {
  assert.strictEqual(this._realApp.trelloApiKey, expected);
});

Then('the App has all subsystems wired', function () {
  const expectedDeps = [
    { name: 'goog', method: 'bindEvents' },
    { name: 'events', method: 'addListener' },
    { name: 'model', method: 'init' },
    { name: 'gmailView', method: 'init' },
    { name: 'popupView', method: 'init' },
    { name: 'utils', method: 'log' },
  ];
  for (const { name, method } of expectedDeps) {
    assert.notStrictEqual(this._realApp[name], undefined, `${name} should be defined`);
    assert.strictEqual(this._realApp[name].app, this._realApp, `${name}.app should reference the app`);
    assert.strictEqual(typeof this._realApp[name][method], 'function', `${name}.${method} should be a function`);
  }
});

Then('persist matches expected defaults', function () {
  const refApp = this._refApp;
  for (const [property, expected] of Object.entries(refApp.persist)) {
    if (typeof expected === 'object' && expected !== null) {
      assert.deepStrictEqual(
        JSON.parse(JSON.stringify(this._realApp.persist[property])),
        JSON.parse(JSON.stringify(expected)),
        `persist.${property}`
      );
    } else {
      assert.strictEqual(this._realApp.persist[property], expected, `persist.${property}`);
    }
  }
});

Then('temp matches expected defaults', function () {
  const refApp = this._refApp;
  const checkNested = (actual, expected, path) => {
    for (const [prop, expVal] of Object.entries(expected)) {
      const actVal = actual[prop];
      const curPath = `${path}.${prop}`;
      if (typeof expVal === 'object' && expVal !== null && !Array.isArray(expVal)) {
        checkNested(actVal, expVal, curPath);
      } else if (Array.isArray(expVal)) {
        assert.deepStrictEqual(
          JSON.parse(JSON.stringify(actVal)),
          JSON.parse(JSON.stringify(expVal)),
          curPath
        );
      } else {
        assert.strictEqual(actVal, expVal, curPath);
      }
    }
  };
  checkNested(this._realApp.temp, refApp.temp, 'temp');
});

Then('the App initialized flag is false', function () {
  assert.strictEqual(this._realApp.initialized, false);
});

Then('the App has all subsystems present', function () {
  assert.notStrictEqual(this._realApp.events, undefined);
  assert.notStrictEqual(this._realApp.model, undefined);
  assert.notStrictEqual(this._realApp.gmailView, undefined);
  assert.notStrictEqual(this._realApp.popupView, undefined);
  assert.notStrictEqual(this._realApp.utils, undefined);
});

Then('gmailView.parsingData is false on the App', function () {
  assert.strictEqual(this._realApp.gmailView.parsingData, false);
});

Then('calling updateData on the App throws', function () {
  assert.throws(() => this._realApp.updateData());
});

Then('the App persist has trelloAuthorized true', function () {
  assert.strictEqual(this._realApp.persist.trelloAuthorized, true);
});

Then('the App persist has boardId {string}', function (expected) {
  assert.strictEqual(this._realApp.persist.boardId, expected);
});

Then('the App persist has listId {string}', function (expected) {
  assert.strictEqual(this._realApp.persist.listId, expected);
});

Then('the App persist is unchanged', function () {
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(this._realApp.persist)),
    JSON.parse(JSON.stringify(this._originalPersist))
  );
});

Then('the App temp has the expected values', function () {
  assert.strictEqual(this._realApp.temp.description, 'Test description');
  assert.strictEqual(this._realApp.temp.title, 'Test title');
  assert.strictEqual(this._realApp.temp.attachments.length, 1);
});

Then('the App operation completes within {int}ms', function (maxMs) {
  assert.ok(this._duration < maxMs, `took ${this._duration}ms, max is ${maxMs}ms`);
});

Then('the App persist has {int} trelloBoards', function (count) {
  assert.strictEqual(this._realApp.persist.trelloBoards.length, count);
});

Then('the App has {int} log entries', function (count) {
  assert.strictEqual(this._realApp.temp.log.memory.length, count);
  assert.strictEqual(this._realApp.temp.log.count, count);
});

Then('the App log memory length is at most max', function () {
  assert.ok(this._realApp.temp.log.memory.length <= this._realApp.temp.log.max);
});

Then('the App has gmail adapter wired', function () {
  assert.ok(this._realApp.gmail, 'gmail adapter should exist');
  assert.strictEqual(this._realApp.gmail.app, this._realApp, 'gmail.app should reference the app');
});

Then('the App gmail adapter is initialized', function () {
  // After init(), gmail.init() should have been called, setting _initialized flag
  assert.ok(this._realApp.gmail._initialized, 'Gmail adapter should be initialized');
});
