/**
 * Model class tests -- node:test + Given/When/Then
 *
 * Equivalent to: tests/test_class_model.js (Jest, 55 tests)
 * Run with: node --test tests/v2/test_class_model.js
 */

const {
  G2T, window, describe, beforeEach, mock, assert,
  loadSourceFile, createApp, installBrowserMocks, scenario,
  assertCalledWith, assertCallCount, assertNotCalled,
  assertDeepEqual, assertNoThrow,
} = require('./test_utils');

// Load Trel and Model source
loadSourceFile('chrome_manifest_v3/class_trel.js');
loadSourceFile('chrome_manifest_v3/class_model.js');

// ---------------------------------------------------------------------------
// Data-driven test cases
// ---------------------------------------------------------------------------

const authorizationTests = [
  { name: 'successful authorization', data: { authorized: true }, expectedAuthorized: true, method: 'checkTrelloAuthorized_success' },
  { name: 'failed authorization', data: { authorized: false }, expectedAuthorized: false, method: 'checkTrelloAuthorized_failure' },
  { name: 'popup failure', data: { authorized: false }, expectedAuthorized: false, method: 'checkTrelloAuthorized_popup_failure' },
];

const userDataTests = [
  { name: 'valid user data', data: { id: '123', fullName: 'Test User', username: 'testuser' }, expectedUser: { id: '123', fullName: 'Test User', username: 'testuser' } },
  { name: 'minimal user data', data: { id: '456', fullName: 'Minimal User' }, expectedUser: { id: '456', fullName: 'Minimal User' } },
  { name: 'empty user data', data: {}, expectedUser: {} },
];

const boardsDataTests = [
  { name: 'single board', data: [{ id: '1', name: 'Board 1', closed: false }], expected: [{ id: '1', name: 'Board 1', closed: false }] },
  { name: 'multiple boards', data: [{ id: '1', name: 'Board 1', closed: false }, { id: '2', name: 'Board 2', closed: false }, { id: '3', name: 'Board 3', closed: true }], expected: [{ id: '1', name: 'Board 1', closed: false }, { id: '2', name: 'Board 2', closed: false }, { id: '3', name: 'Board 3', closed: true }] },
  { name: 'empty boards array', data: [], expected: [] },
];

const listsDataTests = [
  { name: 'single list', data: [{ id: '1', name: 'List 1', idBoard: 'board1' }], expected: [{ id: '1', name: 'List 1', idBoard: 'board1' }] },
  { name: 'multiple lists', data: [{ id: '1', name: 'To Do', idBoard: 'board1' }, { id: '2', name: 'In Progress', idBoard: 'board1' }, { id: '3', name: 'Done', idBoard: 'board1' }], expected: [{ id: '1', name: 'To Do', idBoard: 'board1' }, { id: '2', name: 'In Progress', idBoard: 'board1' }, { id: '3', name: 'Done', idBoard: 'board1' }] },
  { name: 'empty lists', data: [], expected: [] },
];

const cardsDataTests = [
  { name: 'single card', data: [{ id: '1', name: 'Card 1', idList: 'list1' }], expected: [{ id: '1', name: 'Card 1', idList: 'list1' }] },
  { name: 'multiple cards', data: [{ id: '1', name: 'Task 1', idList: 'list1' }, { id: '2', name: 'Task 2', idList: 'list1' }, { id: '3', name: 'Task 3', idList: 'list1' }], expected: [{ id: '1', name: 'Task 1', idList: 'list1' }, { id: '2', name: 'Task 2', idList: 'list1' }, { id: '3', name: 'Task 3', idList: 'list1' }] },
  { name: 'empty cards', data: [], expected: [] },
];

const membersDataTests = [
  { name: 'single member', data: [{ id: '1', fullName: 'John Doe', username: 'johndoe' }], expected: [{ id: '1', fullName: 'John Doe', username: 'johndoe' }] },
  { name: 'multiple members', data: [{ id: '1', fullName: 'John Doe', username: 'johndoe' }, { id: '2', fullName: 'Jane Smith', username: 'janesmith' }, { id: '3', fullName: 'Bob Johnson', username: 'bobjohnson' }], expected: [{ id: '1', fullName: 'John Doe', username: 'johndoe' }, { id: '2', fullName: 'Jane Smith', username: 'janesmith' }, { id: '3', fullName: 'Bob Johnson', username: 'bobjohnson' }] },
  { name: 'empty members', data: [], expected: [] },
];

const labelsDataTests = [
  { name: 'single label', data: [{ id: '1', name: 'Bug', color: 'red' }], expected: [{ id: '1', name: 'Bug', color: 'red' }] },
  { name: 'multiple labels', data: [{ id: '1', name: 'Bug', color: 'red' }, { id: '2', name: 'Feature', color: 'green' }, { id: '3', name: 'Enhancement', color: 'blue' }], expected: [{ id: '1', name: 'Bug', color: 'red' }, { id: '2', name: 'Feature', color: 'green' }, { id: '3', name: 'Enhancement', color: 'blue' }] },
  { name: 'empty labels', data: [], expected: [] },
];

const cardSubmissionTests = [
  { name: 'basic card data', data: { title: 'Test Card', description: 'Test Description', listId: 'test-list-id' }, shouldThrow: false },
  { name: 'card with attachments', data: { title: 'Card with Attachments', description: 'Description with files', listId: 'test-list-id', attachments: [{ name: 'test.txt', value: 'test-content' }] }, shouldThrow: false },
  { name: 'card with members', data: { title: 'Card with Members', description: 'Description with members', listId: 'test-list-id', members: ['member1', 'member2'] }, shouldThrow: false },
  { name: 'card with labels', data: { title: 'Card with Labels', description: 'Description with labels', listId: 'test-list-id', labels: ['label1', 'label2'] }, shouldThrow: false },
  { name: 'empty card data', data: {}, shouldThrow: false },
  { name: 'null card data', data: null, shouldThrow: false },
];

const performanceTests = {
  defaults: { duration_max: 200 },
  Cards: { dataSize: 200 },
  Boards: { dataSize: 100 },
  Lists: { dataSize: 50 },
  Members: { dataSize: 75 },
  Labels: { dataSize: 25, duration_max: 50 },
};

function findKeyValueOrDefault(element, key) {
  return element[key] !== undefined ? element[key] : performanceTests.defaults[key] !== undefined ? performanceTests.defaults[key] : '';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Model Class', () => {
  let app, model;

  beforeEach(() => {
    installBrowserMocks();
    app = createApp();
    const mockTrel = new G2T.Trel({ app });
    model = new G2T.Model({ parent: mockTrel, app });
  });

  // --------------------------------------------------------------------------
  // Constructor and Initialization
  // --------------------------------------------------------------------------

  describe('Constructor and Initialization', () => {
    scenario('should have correct app reference', ({ then }) => {
      then('model.app is the test app', () => {
        assert.strictEqual(model.app, app);
      });
    });

    scenario('should have correct parent reference', ({ then }) => {
      then('model.parent is a Trel instance', () => {
        assert.ok(model.parent instanceof G2T.Trel);
      });
    });

    scenario('should have correct trel property', ({ then }) => {
      then('model.trel is a Trel instance', () => {
        assert.ok(model.trel instanceof G2T.Trel);
      });
    });

    scenario('should have emailBoardListCardMap property', ({ then }) => {
      then('emailBoardListCardMap is an object', () => {
        assert.strictEqual(typeof model.emailBoardListCardMap, 'object');
      });
    });

    scenario('static ck.id is g2t_model', ({ then }) => {
      then('G2T.Model.ck.id equals g2t_model', () => {
        assert.strictEqual(G2T.Model.ck.id, 'g2t_model');
      });
    });

    scenario('instance ck.id is g2t_model', ({ then }) => {
      then('model.ck.id equals g2t_model', () => {
        assert.strictEqual(model.ck.id, 'g2t_model');
      });
    });

    scenario('initializes with default state', ({ then }) => {
      then('default values match expected', () => {
        const expectedDefaults = {
          'app.persist.trelloAuthorized': false,
          'app.temp.boards': [],
          'app.temp.lists': [],
          'app.temp.cards': [],
          'app.temp.members': [],
          'app.temp.labels': [],
        };
        for (const [pathStr, expected] of Object.entries(expectedDefaults)) {
          const value = pathStr.split('.').reduce((obj, key) => obj[key], model);
          assertDeepEqual(value, expected);
        }
      });
    });

    scenario('init should initialize the model', ({ then }) => {
      then('does not throw', () => {
        assertNoThrow(() => model.init());
      });
    });
  });

  // --------------------------------------------------------------------------
  // Trello Authorization
  // --------------------------------------------------------------------------

  describe('Trello Authorization', () => {
    scenario('checkTrelloAuthorized does not throw', ({ then }) => {
      then('no error', () => {
        assertNoThrow(() => model.checkTrelloAuthorized());
      });
    });

    for (const { name, data, expectedAuthorized, method } of authorizationTests) {
      scenario(`${method} handles ${name}`, ({ given, when, then }) => {
        given('reset authorization', () => {
          model.app.persist.trelloAuthorized = false;
        });
        when(`${method} is called`, () => {
          model[method](data);
        });
        then(`trelloAuthorized is ${expectedAuthorized}`, () => {
          assert.strictEqual(model.app.persist.trelloAuthorized, expectedAuthorized);
        });
      });
    }

    scenario('deauthorizeTrello sets authorized to false', ({ given, when, then }) => {
      given('authorized state', () => {
        model.app.persist.trelloAuthorized = true;
      });
      when('deauthorizeTrello is called', () => {
        model.deauthorizeTrello();
      });
      then('trelloAuthorized is false', () => {
        assert.strictEqual(model.app.persist.trelloAuthorized, false);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Trello Data Loading
  // --------------------------------------------------------------------------

  describe('Trello Data Loading', () => {
    scenario('loadTrelloUser does not throw', ({ then }) => {
      then('no error', () => {
        assertNoThrow(() => model.loadTrelloUser());
      });
    });

    for (const { name, data, expectedUser } of userDataTests) {
      scenario(`loadTrelloUser_success handles ${name}`, ({ when, then }) => {
        when('loadTrelloUser_success is called', () => {
          model.loadTrelloUser_success(data);
        });
        then('app.persist.user matches expected', () => {
          assertDeepEqual(model.app.persist.user, expectedUser);
        });
      });
    }

    scenario('loadTrelloBoards does not throw', ({ then }) => {
      then('no error', () => {
        assertNoThrow(() => model.loadTrelloBoards());
      });
    });

    for (const { name, data, expected } of boardsDataTests) {
      scenario(`loadTrelloBoards_success handles ${name}`, ({ when, then }) => {
        when('loadTrelloBoards_success is called', () => {
          model.loadTrelloBoards_success(data);
        });
        then('app.temp.boards matches expected', () => {
          assertDeepEqual(model.app.temp.boards, expected);
        });
      });
    }

    scenario('loadTrelloUser_failure does not throw', ({ then }) => {
      then('no error', () => {
        assertNoThrow(() => model.loadTrelloUser_failure({ error: 'Failed to load user data' }));
      });
    });

    scenario('loadTrelloBoards_failure does not throw', ({ then }) => {
      then('no error', () => {
        assertNoThrow(() => model.loadTrelloBoards_failure({ error: 'Failed to load boards data' }));
      });
    });

    scenario('handleTrelloUserReady triggers boards loading', ({ given, when, then }) => {
      let spy;
      given('a spy on loadTrelloBoards', () => {
        spy = mock.method(model, 'loadTrelloBoards');
      });
      when('handleTrelloUserReady is called', () => {
        model.handleTrelloUserReady();
      });
      then('loadTrelloBoards was called', () => {
        assert.ok(spy.mock.callCount() > 0);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Trello Lists Loading
  // --------------------------------------------------------------------------

  describe('Trello Lists Loading', () => {
    scenario('loadTrelloLists does not throw', ({ then }) => {
      then('no error', () => {
        assertNoThrow(() => model.loadTrelloLists('test-board-id'));
      });
    });

    for (const { name, data, expected } of listsDataTests) {
      scenario(`loadTrelloLists_success handles ${name}`, ({ when, then }) => {
        when('loadTrelloLists_success is called', () => {
          model.loadTrelloLists_success(data);
        });
        then('app.temp.lists matches expected', () => {
          assertDeepEqual(model.app.temp.lists, expected);
        });
      });
    }

    scenario('loadTrelloLists_failure does not throw', ({ then }) => {
      then('no error', () => {
        assertNoThrow(() => model.loadTrelloLists_failure({ error: 'Failed to load lists' }));
      });
    });
  });

  // --------------------------------------------------------------------------
  // Trello Cards Loading
  // --------------------------------------------------------------------------

  describe('Trello Cards Loading', () => {
    scenario('loadTrelloCards does not throw', ({ then }) => {
      then('no error', () => {
        assertNoThrow(() => model.loadTrelloCards('test-list-id'));
      });
    });

    for (const { name, data, expected } of cardsDataTests) {
      scenario(`loadTrelloCards_success handles ${name}`, ({ when, then }) => {
        when('loadTrelloCards_success is called', () => {
          model.loadTrelloCards_success(data);
        });
        then('app.temp.cards matches expected', () => {
          assertDeepEqual(model.app.temp.cards, expected);
        });
      });
    }

    scenario('loadTrelloCards_failure does not throw', ({ then }) => {
      then('no error', () => {
        assertNoThrow(() => model.loadTrelloCards_failure({ error: 'Failed to load cards' }));
      });
    });
  });

  // --------------------------------------------------------------------------
  // Trello Members Loading
  // --------------------------------------------------------------------------

  describe('Trello Members Loading', () => {
    scenario('loadTrelloMembers does not throw', ({ then }) => {
      then('no error', () => {
        assertNoThrow(() => model.loadTrelloMembers('test-board-id'));
      });
    });

    for (const { name, data, expected } of membersDataTests) {
      scenario(`loadTrelloMembers_success handles ${name}`, ({ when, then }) => {
        when('loadTrelloMembers_success is called', () => {
          model.loadTrelloMembers_success(data);
        });
        then('app.temp.members matches expected', () => {
          assertDeepEqual(model.app.temp.members, expected);
        });
      });
    }

    scenario('loadTrelloMembers_failure does not throw', ({ then }) => {
      then('no error', () => {
        assertNoThrow(() => model.loadTrelloMembers_failure({ error: 'Failed to load members' }));
      });
    });
  });

  // --------------------------------------------------------------------------
  // Trello Labels Loading
  // --------------------------------------------------------------------------

  describe('Trello Labels Loading', () => {
    scenario('loadTrelloLabels does not throw', ({ then }) => {
      then('no error', () => {
        assertNoThrow(() => model.loadTrelloLabels('test-board-id'));
      });
    });

    for (const { name, data, expected } of labelsDataTests) {
      scenario(`loadTrelloLabels_success handles ${name}`, ({ when, then }) => {
        when('loadTrelloLabels_success is called', () => {
          model.loadTrelloLabels_success(data);
        });
        then('app.temp.labels matches expected', () => {
          assertDeepEqual(model.app.temp.labels, expected);
        });
      });
    }

    scenario('loadTrelloLabels_failure does not throw', ({ then }) => {
      then('no error', () => {
        assertNoThrow(() => model.loadTrelloLabels_failure({ error: 'Failed to load labels' }));
      });
    });
  });

  // --------------------------------------------------------------------------
  // Card Creation and Submission
  // --------------------------------------------------------------------------

  describe('Card Creation and Submission', () => {
    for (const { name, data, shouldThrow } of cardSubmissionTests) {
      scenario(`submit handles ${name}`, ({ given, when, then }) => {
        given('trello is authorized', () => {
          model.app.persist.trelloAuthorized = true;
        });
        then(`${shouldThrow ? 'throws' : 'does not throw'}`, () => {
          if (shouldThrow) {
            assert.throws(() => model.submit(data));
          } else {
            assertNoThrow(() => model.submit(data));
          }
        });
      });
    }

    scenario('createCard does not throw', ({ then }) => {
      then('no error', () => {
        assertNoThrow(() => model.createCard({ title: 'Test Card', description: 'Test Description' }));
      });
    });

    scenario('uploadAttachment does not throw', ({ then }) => {
      then('no error', () => {
        assertNoThrow(() => model.uploadAttachment({ attachments: [{ name: 'test.txt', value: 'test-content' }] }));
      });
    });
  });

  // --------------------------------------------------------------------------
  // Email Board List Card Mapping
  // --------------------------------------------------------------------------

  describe('Email Board List Card Mapping', () => {
    scenario('emailBoardListCardMapLookup handles existing mapping', ({ given, when, then }) => {
      let result;
      given('an existing mapping', () => {
        model.app.persist.eblcmArray = [{
          email: 'test@example.com', boardId: 123, listId: 456, cardId: 789, timestamp: Date.now(),
        }];
      });
      when('lookup is called', () => {
        result = model.emailBoardListCardMapLookup({ email: 'test@example.com' });
      });
      then('returns the correct mapping', () => {
        assert.notStrictEqual(result, undefined);
        assert.strictEqual(result.email, 'test@example.com');
        assert.strictEqual(result.boardId, 123);
        assert.strictEqual(result.listId, 456);
        assert.strictEqual(result.cardId, 789);
      });
    });

    scenario('emailBoardListCardMapUpdate adds new mapping', ({ given, when, then }) => {
      let result;
      given('empty map', () => {
        model.app.persist.eblcmArray = [];
      });
      when('update is called', () => {
        model.emailBoardListCardMapUpdate({
          email: 'new@example.com', boardId: 999, listId: 888, cardId: 777,
        });
      });
      then('lookup returns the new mapping', () => {
        result = model.emailBoardListCardMapLookup({ email: 'new@example.com' });
        assert.notStrictEqual(result, undefined);
        assert.strictEqual(result.email, 'new@example.com');
        assert.strictEqual(result.boardId, 999);
        assert.strictEqual(result.listId, 888);
        assert.strictEqual(result.cardId, 777);
      });
    });

    scenario('emailBoardListCardMapUpdate updates existing mapping', ({ given, when, then }) => {
      given('existing mapping', () => {
        model.app.persist.eblcmArray = [{
          email: 'update@example.com', boardId: 'old-board', listId: 'old-list', timestamp: Date.now(),
        }];
      });
      when('update is called with new values', () => {
        model.emailBoardListCardMapUpdate({
          email: 'update@example.com', boardId: 'new-board', listId: 'new-list',
        });
      });
      then('only one entry exists and it is updated', () => {
        const results = model.app.persist.eblcmArray.filter(e => e.email === 'update@example.com');
        assert.strictEqual(results.length, 1);
        const result = model.emailBoardListCardMapLookup({ email: 'update@example.com' });
        assert.notStrictEqual(result, undefined);
        assert.strictEqual(result.email, 'update@example.com');
        assert.strictEqual(result.boardId, 'new-board');
        assert.strictEqual(result.listId, 'new-list');
      });
    });
  });

  // --------------------------------------------------------------------------
  // Event Handling
  // --------------------------------------------------------------------------

  describe('Event Handling', () => {
    const eventHandlingTests = [
      { name: 'state loaded event', method: 'handleClassModelStateLoaded', args: [{ type: 'stateLoaded' }, { data: 'test-data' }] },
      { name: 'form submission', method: 'handleSubmittedFormShownComplete', args: [{ id: 'test-form' }, { data: 'test-data' }] },
      { name: 'upload completion', method: 'handlePostCardCreateUploadDisplayDone', args: [{ id: 'test-upload' }, { data: 'test-data' }] },
      { name: 'board change', method: 'handleBoardChanged', args: [{ id: 'test-board' }, { boardId: 'test-board-id' }] },
      { name: 'list change', method: 'handleListChanged', args: [{ id: 'test-list' }, { listId: 'test-list-id' }] },
    ];

    for (const { name, method, args } of eventHandlingTests) {
      scenario(`${method} handles ${name}`, ({ then }) => {
        then('does not throw', () => {
          assertNoThrow(() => model[method](...args));
        });
      });
    }

    scenario('bindEvents does not throw', ({ then }) => {
      then('no error', () => {
        assertNoThrow(() => model.bindEvents());
      });
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    scenario('submit emits APIFail when not authorized', ({ given, when, then }) => {
      let emitSpy;
      given('unauthorized state and spy on events.emit', () => {
        model.app.persist.trelloAuthorized = false;
        emitSpy = mock.method(model.app.events, 'emit');
      });
      when('submit is called', () => {
        model.submit({ title: 'Test Card', boardId: 'board1', listId: 'list1' });
      });
      then('APIFail is emitted', () => {
        const calls = emitSpy.mock.calls;
        const apiFail = calls.find(c => c.arguments[0] === 'APIFail');
        assert.ok(apiFail, 'Expected APIFail event to be emitted');
      });
    });

    scenario('submit emits invalidFormData when missing boardId', ({ given, when, then }) => {
      let emitSpy;
      given('authorized state and spy', () => {
        model.app.persist.trelloAuthorized = true;
        emitSpy = mock.method(model.app.events, 'emit');
      });
      when('submit with missing boardId', () => {
        model.submit({ title: 'Test Card', listId: 'list1' });
      });
      then('invalidFormData is emitted', () => {
        const calls = emitSpy.mock.calls;
        const found = calls.find(c => c.arguments[0] === 'invalidFormData');
        assert.ok(found, 'Expected invalidFormData event');
      });
    });

    scenario('submit emits invalidFormData when missing listId', ({ given, when, then }) => {
      let emitSpy;
      given('authorized state and spy', () => {
        model.app.persist.trelloAuthorized = true;
        emitSpy = mock.method(model.app.events, 'emit');
      });
      when('submit with missing listId', () => {
        model.submit({ title: 'Test Card', boardId: 'board1' });
      });
      then('invalidFormData is emitted', () => {
        const calls = emitSpy.mock.calls;
        const found = calls.find(c => c.arguments[0] === 'invalidFormData');
        assert.ok(found, 'Expected invalidFormData event');
      });
    });

    scenario('submit emits invalidFormData when data is null', ({ given, when, then }) => {
      let emitSpy;
      given('authorized state and spy', () => {
        model.app.persist.trelloAuthorized = true;
        emitSpy = mock.method(model.app.events, 'emit');
      });
      when('submit with null', () => {
        model.submit(null);
      });
      then('invalidFormData is emitted', () => {
        const calls = emitSpy.mock.calls;
        const found = calls.find(c => c.arguments[0] === 'invalidFormData');
        assert.ok(found, 'Expected invalidFormData event');
      });
    });

    scenario('createCard emits invalidFormData when data is null', ({ given, when, then }) => {
      let emitSpy;
      given('spy on events.emit', () => {
        emitSpy = mock.method(model.app.events, 'emit');
      });
      when('createCard with null', () => {
        model.createCard(null);
      });
      then('invalidFormData is emitted', () => {
        const calls = emitSpy.mock.calls;
        const found = calls.find(c => c.arguments[0] === 'invalidFormData');
        assert.ok(found, 'Expected invalidFormData event');
      });
    });

    scenario('uploadAttachment emits newCardUploadsComplete when no attachments', ({ given, when, then }) => {
      let emitSpy;
      given('spy on events.emit', () => {
        emitSpy = mock.method(model.app.events, 'emit');
      });
      when('uploadAttachment with no attachments', () => {
        model.uploadAttachment({ title: 'Test' });
      });
      then('newCardUploadsComplete is emitted', () => {
        const calls = emitSpy.mock.calls;
        const found = calls.find(c => c.arguments[0] === 'newCardUploadsComplete');
        assert.ok(found, 'Expected newCardUploadsComplete event');
      });
    });

    scenario('uploadAttachment emits newCardUploadsComplete when empty attachments', ({ given, when, then }) => {
      let emitSpy;
      given('spy on events.emit', () => {
        emitSpy = mock.method(model.app.events, 'emit');
      });
      when('uploadAttachment with empty array', () => {
        model.uploadAttachment({ attachment: [] });
      });
      then('newCardUploadsComplete is emitted', () => {
        const calls = emitSpy.mock.calls;
        const found = calls.find(c => c.arguments[0] === 'newCardUploadsComplete');
        assert.ok(found, 'Expected newCardUploadsComplete event');
      });
    });
  });

  // --------------------------------------------------------------------------
  // Performance Tests
  // --------------------------------------------------------------------------

  describe('Performance Tests', () => {
    for (const [tag, element] of Object.entries(performanceTests).filter(([k]) => k !== 'defaults')) {
      const tag_lc = tag.toLowerCase();
      const dataSize = findKeyValueOrDefault(element, 'dataSize');
      const methodName = `loadTrello${tag}_success`;
      const duration_max = findKeyValueOrDefault(element, 'duration_max');

      scenario(`handles large ${tag_lc} dataset efficiently`, ({ given, when, then }) => {
        let largeData, duration;
        given(`${dataSize} ${tag_lc} items`, () => {
          largeData = Array.from({ length: dataSize }, (_, i) => ({
            id: `${tag_lc}-${i}`, name: `${tag.charAt(0).toUpperCase() + tag.slice(1)} ${i}`,
          }));
        });
        when(`${methodName} is called`, () => {
          assert.notStrictEqual(model[methodName], undefined, `${methodName} should be defined`);
          const start = Date.now();
          model[methodName](largeData);
          duration = Date.now() - start;
        });
        then(`data is stored and completed within ${duration_max}ms`, () => {
          const actualData = `app.temp.${tag_lc}`.split('.').reduce((obj, key) => obj[key], model);
          assertDeepEqual(actualData, largeData);
          assert.ok(duration < duration_max, `took ${duration}ms, max is ${duration_max}ms`);
        });
      });
    }

    scenario('handles many event handlers efficiently', ({ when, then }) => {
      let duration;
      when('bindEvents is called', () => {
        const start = Date.now();
        assertNoThrow(() => model.bindEvents());
        duration = Date.now() - start;
      });
      then('completes within 50ms', () => {
        assert.ok(duration < 50, `took ${duration}ms`);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    scenario('complete workflow from authorization to card creation', ({ when, then }) => {
      when('full workflow is executed', () => {
        model.checkTrelloAuthorized_success({ authorized: true });
        assert.strictEqual(model.app.persist.trelloAuthorized, true);

        model.loadTrelloUser_success({ id: '123', fullName: 'Test User' });
        assertDeepEqual(model.app.persist.user, { id: '123', fullName: 'Test User' });

        model.loadTrelloBoards_success([{ id: '1', name: 'Test Board' }]);
        assertDeepEqual(model.app.temp.boards, [{ id: '1', name: 'Test Board' }]);

        model.loadTrelloLists_success([{ id: '1', name: 'Test List' }]);
        assertDeepEqual(model.app.temp.lists, [{ id: '1', name: 'Test List' }]);
      });
      then('submit does not throw', () => {
        assertNoThrow(() => model.submit({ title: 'Test Card', description: 'Test Description', listId: '1' }));
      });
    });

    scenario('error recovery gracefully', ({ when, then }) => {
      when('failure then success', () => {
        model.loadTrelloBoards_failure({ error: 'Network error' });
        model.loadTrelloBoards_success([{ id: '1', name: 'Recovery Board' }]);
      });
      then('boards are populated', () => {
        assertDeepEqual(model.app.temp.boards, [{ id: '1', name: 'Recovery Board' }]);
      });
    });
  });
});
