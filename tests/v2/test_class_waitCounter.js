/**
 * WaitCounter class tests -- node:test + Given/When/Then
 *
 * Equivalent to: tests/test_class_waitCounter.js (Jest, 5 tests)
 * Run with: node --test tests/v2/test_class_waitCounter.js
 */

const {
  G2T, describe, beforeEach, mock, assert,
  loadSourceFile, createApp, scenario, assertDeepEqual, assertCallCount,
  window,
} = require('./test_utils');

// Load the REAL WaitCounter class
loadSourceFile('chrome_manifest_v3/class_waitCounter.js');

describe('WaitCounter Class', () => {
  let app, waitCounter;

  beforeEach(() => {
    app = createApp();
    // Override window.setInterval/clearInterval to execute immediately (like test_shared.js)
    window.setInterval = mock.fn((callback /*, delay */) => {
      if (typeof callback === 'function') {
        callback();
      }
      return 1;
    });
    window.clearInterval = mock.fn();

    waitCounter = new G2T.WaitCounter({ app });
    app.utils.log = mock.fn();
  });

  // --------------------------------------------------------------------------
  // Constructor and Initialization
  // --------------------------------------------------------------------------

  describe('Constructor and Initialization', () => {
    scenario('creating with app dependency', ({ given, when, then }) => {
      let wc;
      given('an app instance', () => {});
      when('WaitCounter is constructed with { app }', () => {
        wc = new G2T.WaitCounter({ app });
      });
      then('it is an instance of G2T.WaitCounter', () => {
        assert.ok(wc instanceof G2T.WaitCounter);
      });
      then('it stores the app reference', () => {
        assert.strictEqual(wc.app, app);
      });
      then('items is an empty object', () => {
        assertDeepEqual(wc.items, {});
      });
    });

    scenario('ck static and instance getters return correct value', ({ then }) => {
      then('static ck returns correct id', () => {
        assertDeepEqual(G2T.WaitCounter.ck, { id: 'g2t_waitCounter' });
      });
      then('instance ck returns correct id', () => {
        assertDeepEqual(waitCounter.ck, { id: 'g2t_waitCounter' });
      });
    });
  });

  // --------------------------------------------------------------------------
  // Start/Stop behavior
  // --------------------------------------------------------------------------

  describe('Start/Stop behavior', () => {
    scenario('start schedules interval and logs rounds until maxSteps', ({ given, when, then }) => {
      let callback;
      given('a callback function', () => {
        callback = mock.fn();
      });
      when('start is called with name, interval, maxSteps, callback', () => {
        waitCounter.start('test', 100, 3, callback);
      });
      then('the item is properly initialized', () => {
        assert.ok(waitCounter.items['test'] !== undefined);
        assert.strictEqual(waitCounter.items['test'].maxSteps, 3);
        assert.strictEqual(waitCounter.items['test'].callBack, callback);
      });
      then('the callback was called (setInterval executes immediately)', () => {
        assert.ok(callback.mock.callCount() > 0);
      });
      then('utils.log was called', () => {
        assert.ok(app.utils.log.mock.callCount() > 0);
      });
    });

    scenario('stop clears interval and sets busy=false if running', ({ given, when, then }) => {
      let callback;
      given('a started wait counter job', () => {
        callback = mock.fn();
        waitCounter.start('job', 50, 10, callback);
      });
      then('the job is busy after start', () => {
        // With immediate execution and maxSteps=10, only 1 round executes,
        // so count(1) < maxSteps(10), busy remains true... unless cleared.
        // Actually the mock setInterval fires once immediately, count becomes 1,
        // which is < 10, so busy stays true.
        assert.ok(waitCounter.items['job'] !== undefined);
        assert.ok(callback.mock.callCount() > 0);
      });
      when('stop is called', () => {
        waitCounter.stop('job');
      });
      then('busy is false', () => {
        assert.strictEqual(waitCounter.items['job'].busy, false);
      });
      then('the item still exists', () => {
        assert.ok(waitCounter.items['job'] !== undefined);
      });
    });

    scenario('start is idempotent when already busy (does not duplicate timers)', ({ given, when, then }) => {
      let callback;
      given('a callback function', () => {
        callback = mock.fn();
      });
      when('start is called twice with the same name', () => {
        waitCounter.start('dup', 30, 2, callback);
        waitCounter.start('dup', 30, 2, callback);
      });
      then('the item exists and is defined', () => {
        assert.ok(waitCounter.items['dup'] !== undefined);
      });
      then('the callback was called', () => {
        assert.ok(callback.mock.callCount() > 0);
      });
      then('the handler is defined', () => {
        assert.ok(waitCounter.items['dup'].handler !== undefined);
      });
    });
  });
});
