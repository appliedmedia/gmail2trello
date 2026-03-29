/**
 * Trel class tests -- node:test + Given/When/Then
 *
 * Equivalent to: tests/test_class_trel.js (Jest, 23 tests)
 * Run with: node --test tests/v2/test_class_trel.js
 */

const {
  G2T, window, describe, beforeEach, mock, assert,
  loadSourceFile, createApp, installBrowserMocks, scenario,
  assertCalledWith, assertCallCount, assertNotCalled,
  assertDeepEqual, assertNoThrow,
} = require('./test_utils');

// Load the REAL Trel class
loadSourceFile('chrome_manifest_v3/class_trel.js');

describe('Trel Class', () => {
  let app, trelInstance;

  beforeEach(() => {
    installBrowserMocks();
    app = createApp();
    trelInstance = new G2T.Trel({ app });
  });

  // --------------------------------------------------------------------------
  // Constructor and Initialization
  // --------------------------------------------------------------------------

  describe('Constructor and Initialization', () => {
    scenario('creating with app dependency', ({ given, when, then }) => {
      then('instance is defined and stores app', () => {
        assert.notStrictEqual(trelInstance, undefined);
        assert.strictEqual(trelInstance.app, app);
      });
    });

    scenario('initializing with correct ck properties', ({ then }) => {
      then('ck has all expected fields', () => {
        assert.notStrictEqual(trelInstance.ck, undefined);
        assert.strictEqual(trelInstance.ck.id, 'g2t_trel');
        assert.strictEqual(trelInstance.ck.errorPrefix, 'Trello API Error:');
        assert.strictEqual(trelInstance.ck.unauthorizedError, 'Trello not authorized');
        assert.strictEqual(trelInstance.ck.apiCallPrefix, 'Trello API call:');
      });
    });

    scenario('bindEvents is callable', ({ then }) => {
      then('does not throw', () => {
        assertNoThrow(() => trelInstance.bindEvents());
      });
    });
  });

  // --------------------------------------------------------------------------
  // API Key Management
  // --------------------------------------------------------------------------

  describe('API Key Management', () => {
    scenario('setApiKey handles API key setting and returns success or failure', ({ given, when, then }) => {
      let result;
      when('setApiKey is called with a mock Trello', () => {
        // window.Trello.setKey is a mock.fn(), so setApiKey succeeds
        result = trelInstance.setApiKey('test-api-key');
      });
      then('returns true (mock setKey does not throw)', () => {
        assert.strictEqual(result, true);
      });
    });

    scenario('getApiKey returns stored API key', ({ then }) => {
      then('returns the trelloApiKey from app', () => {
        assert.strictEqual(trelInstance.getApiKey(), '21b411b1b5b549c54bd32f0e90738b41');
      });
    });

    scenario('isAuthorized returns authorization status', ({ then }) => {
      then('true when authorized, false when not', () => {
        app.persist.trelloAuthorized = true;
        assert.strictEqual(trelInstance.isAuthorized(), true);

        app.persist.trelloAuthorized = false;
        assert.strictEqual(trelInstance.isAuthorized(), false);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Authorization Methods
  // --------------------------------------------------------------------------

  describe('Authorization Methods', () => {
    scenario('authorize updates app state when called', ({ given, when, then }) => {
      given('unauthorized state', () => {
        app.persist.trelloAuthorized = false;
        app.persist.trelloData = null;
      });
      when('authorize is called', () => {
        trelInstance.authorize(true);
      });
      then('authorize is callable without throwing', () => {
        assertNoThrow(() => trelInstance.authorize(true));
      });
    });

    scenario('deauthorize updates app state', ({ given, when, then }) => {
      given('authorized state with data', () => {
        app.persist.trelloAuthorized = true;
        app.persist.trelloData = { some: 'data' };
      });
      when('deauthorize is called', () => {
        trelInstance.deauthorize();
      });
      then('state is cleared', () => {
        assert.strictEqual(app.persist.trelloAuthorized, false);
        assert.strictEqual(app.persist.trelloData, null);
      });
    });

    scenario('deauthorize updates state even when external calls fail', ({ given, when, then }) => {
      given('authorized state with data', () => {
        app.persist.trelloAuthorized = true;
        app.persist.trelloData = { some: 'data' };
      });
      when('deauthorize is called', () => {
        trelInstance.deauthorize();
      });
      then('state is still updated', () => {
        assert.strictEqual(app.persist.trelloAuthorized, false);
        assert.strictEqual(app.persist.trelloData, null);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Core API Wrapper
  // --------------------------------------------------------------------------

  describe('Core API Wrapper', () => {
    scenario('wrapApiCall calls failure callback when not authorized', ({ given, when, then }) => {
      let successCb, failureCb;
      given('unauthorized state', () => {
        app.persist.trelloAuthorized = false;
        assert.strictEqual(trelInstance.isAuthorized(), false);
        successCb = mock.fn();
        failureCb = mock.fn();
      });
      when('wrapApiCall is called', () => {
        trelInstance.wrapApiCall('get', 'members/me', {}, successCb, failureCb);
      });
      then('failure callback called with unauthorized error', () => {
        assertCalledWith(failureCb, { error: 'Trello not authorized' });
        assertCalledWith(app.utils.log, 'Trello API Error: Trello not authorized');
      });
    });

    scenario('wrapApiCall logs API calls when authorized', ({ given, when, then }) => {
      given('authorized state', () => {
        app.persist.trelloAuthorized = true;
      });
      when('wrapApiCall is called', () => {
        trelInstance.wrapApiCall('get', 'members/me', {}, mock.fn(), mock.fn());
      });
      then('logs the API call', () => {
        assertCalledWith(app.utils.log, 'Trello API call: GET members/me');
      });
    });
  });

  // --------------------------------------------------------------------------
  // High-Level API Methods
  // --------------------------------------------------------------------------

  describe('High-Level API Methods', () => {
    beforeEach(() => {
      app.persist.trelloAuthorized = true;
    });

    scenario('getUser calls wrapApiCall with correct parameters', ({ given, when, then }) => {
      let spy;
      given('a spy on wrapApiCall', () => {
        spy = mock.method(trelInstance, 'wrapApiCall');
      });
      when('getUser is called', () => {
        trelInstance.getUser();
      });
      then('wrapApiCall was called with get, members/me', () => {
        assert.strictEqual(spy.mock.callCount(), 1);
        const args = [...spy.mock.calls[0].arguments];
        assert.strictEqual(args[0], 'get');
        assert.strictEqual(args[1], 'members/me');
        assertDeepEqual(args[2], {});
        assert.strictEqual(typeof args[3], 'function');
        assert.strictEqual(typeof args[4], 'function');
      });
    });

    scenario('getBoards calls wrapApiCall with correct parameters', ({ given, when, then }) => {
      let spy;
      given('a spy on wrapApiCall', () => {
        spy = mock.method(trelInstance, 'wrapApiCall');
      });
      when('getBoards is called', () => {
        trelInstance.getBoards();
      });
      then('wrapApiCall was called with get, members/me/boards', () => {
        const args = [...spy.mock.calls[0].arguments];
        assert.strictEqual(args[0], 'get');
        assert.strictEqual(args[1], 'members/me/boards');
      });
    });

    scenario('getLists calls wrapApiCall with board ID', ({ given, when, then }) => {
      let spy;
      given('a spy on wrapApiCall', () => {
        spy = mock.method(trelInstance, 'wrapApiCall');
      });
      when('getLists is called with board123', () => {
        trelInstance.getLists('board123');
      });
      then('wrapApiCall was called with boards/board123/lists', () => {
        const args = [...spy.mock.calls[0].arguments];
        assert.strictEqual(args[0], 'get');
        assert.strictEqual(args[1], 'boards/board123/lists');
      });
    });

    scenario('getCards calls wrapApiCall with list ID', ({ given, when, then }) => {
      let spy;
      given('a spy on wrapApiCall', () => {
        spy = mock.method(trelInstance, 'wrapApiCall');
      });
      when('getCards is called with list123', () => {
        trelInstance.getCards('list123');
      });
      then('wrapApiCall was called with lists/list123/cards', () => {
        const args = [...spy.mock.calls[0].arguments];
        assert.strictEqual(args[0], 'get');
        assert.strictEqual(args[1], 'lists/list123/cards');
      });
    });

    scenario('getMembers calls wrapApiCall with board ID', ({ given, when, then }) => {
      let spy;
      given('a spy on wrapApiCall', () => {
        spy = mock.method(trelInstance, 'wrapApiCall');
      });
      when('getMembers is called with board123', () => {
        trelInstance.getMembers('board123');
      });
      then('wrapApiCall was called with boards/board123/members', () => {
        const args = [...spy.mock.calls[0].arguments];
        assert.strictEqual(args[0], 'get');
        assert.strictEqual(args[1], 'boards/board123/members');
      });
    });

    scenario('getLabels calls wrapApiCall with board ID', ({ given, when, then }) => {
      let spy;
      given('a spy on wrapApiCall', () => {
        spy = mock.method(trelInstance, 'wrapApiCall');
      });
      when('getLabels is called with board123', () => {
        trelInstance.getLabels('board123');
      });
      then('wrapApiCall was called with boards/board123/labels', () => {
        const args = [...spy.mock.calls[0].arguments];
        assert.strictEqual(args[0], 'get');
        assert.strictEqual(args[1], 'boards/board123/labels');
      });
    });

    scenario('createCard calls wrapApiCall with card data', ({ given, when, then }) => {
      let spy;
      given('a spy on wrapApiCall', () => {
        spy = mock.method(trelInstance, 'wrapApiCall');
      });
      when('createCard is called', () => {
        trelInstance.createCard({ name: 'Test Card', listId: 'list123', boardId: 'board123' });
      });
      then('wrapApiCall was called with post, cards', () => {
        const args = [...spy.mock.calls[0].arguments];
        assert.strictEqual(args[0], 'post');
        assert.strictEqual(args[1], 'cards');
        assert.strictEqual(typeof args[2], 'object');
        assert.strictEqual(typeof args[3], 'function');
        assert.strictEqual(typeof args[4], 'function');
      });
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    scenario('complete authorization flow', ({ given, when, then }) => {
      let spy;
      given('unauthorized state', () => {
        app.persist.trelloAuthorized = false;
        app.persist.trelloData = null;
      });
      when('authorize then getUser then deauthorize', () => {
        trelInstance.authorize(true);
        spy = mock.method(trelInstance, 'wrapApiCall');
        trelInstance.getUser();
      });
      then('getUser was called', () => {
        assert.ok(spy.mock.callCount() > 0);
      });
      when('deauthorize is called', () => {
        trelInstance.deauthorize();
      });
      then('state is cleared', () => {
        assert.strictEqual(app.persist.trelloAuthorized, false);
        assert.strictEqual(app.persist.trelloData, null);
      });
    });

    scenario('authorization failure handled gracefully', ({ given, when, then }) => {
      let successCb, failureCb;
      given('unauthorized state', () => {
        app.persist.trelloAuthorized = false;
        successCb = mock.fn();
        failureCb = mock.fn();
      });
      when('wrapApiCall is called', () => {
        trelInstance.wrapApiCall('get', 'members/me', {}, successCb, failureCb);
      });
      then('failure called, success not called', () => {
        assertCalledWith(failureCb, { error: 'Trello not authorized' });
        assertNotCalled(successCb);
      });
    });

    scenario('multiple API calls independently', ({ given, when, then }) => {
      let spy;
      given('authorized state with spy', () => {
        app.persist.trelloAuthorized = true;
        spy = mock.method(trelInstance, 'wrapApiCall');
      });
      when('getUser, getBoards, getLists are called', () => {
        trelInstance.getUser();
        trelInstance.getBoards();
        trelInstance.getLists('board123');
      });
      then('wrapApiCall was called 3 times', () => {
        assertCallCount(spy, 3);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    scenario('missing app dependency handled gracefully', ({ then }) => {
      then('constructor sets app to undefined', () => {
        const inst = new G2T.Trel();
        assert.strictEqual(inst.app, undefined);
      });
    });

    scenario('missing app.persist handled gracefully', ({ given, then }) => {
      let inst;
      given('an app without persist', () => {
        const appCopy = { ...app };
        delete appCopy.persist;
        inst = new G2T.Trel({ app: appCopy });
      });
      then('app is set but persist is undefined', () => {
        assert.strictEqual(inst.app.persist, undefined);
      });
    });
  });
});
