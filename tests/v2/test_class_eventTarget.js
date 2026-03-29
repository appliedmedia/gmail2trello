/**
 * EventTarget class tests -- node:test + Given/When/Then
 *
 * Equivalent to: tests/test_class_eventTarget.js (Jest, 33 tests)
 * Run with: node --test tests/v2/test_class_eventTarget.js
 */

const {
  G2T, describe, beforeEach, mock, assert,
  loadSourceFile, createApp, scenario, assertCalledWith, assertCallCount, assertNotCalled,
  assertDeepEqual,
} = require('./test_utils');

// Load the REAL EventTarget class (overrides the mock in G2T namespace)
loadSourceFile('chrome_manifest_v3/class_eventTarget.js');

describe('EventTarget Class', () => {
  let app, eventTarget;

  beforeEach(() => {
    app = createApp();
    eventTarget = new G2T.EventTarget({ app });
  });

  // --------------------------------------------------------------------------
  // Constructor and Initialization
  // --------------------------------------------------------------------------

  describe('Constructor and Initialization', () => {
    scenario('creating with app dependency', ({ given, when, then }) => {
      let et;
      given('an app instance', () => {});
      when('EventTarget is constructed with { app }', () => {
        et = new G2T.EventTarget({ app });
      });
      then('it stores the app reference', () => {
        assert.strictEqual(et.app, app);
      });
      then('it is an instance of G2T.EventTarget', () => {
        assert.ok(et instanceof G2T.EventTarget);
      });
    });

    scenario('initializing with empty listeners', ({ given, when, then }) => {
      then('_listeners is an empty object', () => {
        assertDeepEqual(eventTarget._listeners, {});
      });
    });

    scenario('creating with no arguments', ({ given, when, then }) => {
      let et;
      when('constructed with empty object', () => {
        et = new G2T.EventTarget({});
      });
      then('app is undefined', () => {
        assert.strictEqual(et.app, undefined);
      });
    });

    scenario('static ck getter', ({ then }) => {
      then('returns correct id', () => {
        assertDeepEqual(G2T.EventTarget.ck, { id: 'g2t_eventtarget' });
      });
    });

    scenario('instance ck getter', ({ then }) => {
      then('returns correct id', () => {
        assertDeepEqual(eventTarget.ck, { id: 'g2t_eventtarget' });
      });
    });
  });

  // --------------------------------------------------------------------------
  // Event Listener Management
  // --------------------------------------------------------------------------

  describe('Event Listener Management', () => {
    scenario('adding a listener for a new event type', ({ given, when, then }) => {
      let listener;
      given('a listener function', () => { listener = mock.fn(); });
      when('addListener is called for "testEvent"', () => {
        eventTarget.addListener('testEvent', listener);
      });
      then('the listener is stored', () => {
        assertDeepEqual(eventTarget._listeners.testEvent, [listener]);
      });
    });

    scenario('adding multiple listeners to same event', ({ given, when, then }) => {
      let l1, l2;
      given('two listener functions', () => { l1 = mock.fn(); l2 = mock.fn(); });
      when('both are added for "testEvent"', () => {
        eventTarget.addListener('testEvent', l1);
        eventTarget.addListener('testEvent', l2);
      });
      then('both are stored in order', () => {
        assertDeepEqual(eventTarget._listeners.testEvent, [l1, l2]);
      });
    });

    scenario('adding listeners to different event types', ({ given, when, then }) => {
      let l1, l2;
      given('two listeners', () => { l1 = mock.fn(); l2 = mock.fn(); });
      when('added to different events', () => {
        eventTarget.addListener('event1', l1);
        eventTarget.addListener('event2', l2);
      });
      then('each event has its own listener', () => {
        assertDeepEqual(eventTarget._listeners.event1, [l1]);
        assertDeepEqual(eventTarget._listeners.event2, [l2]);
      });
    });

    scenario('removing a specific listener', ({ given, when, then }) => {
      let l1, l2;
      given('two listeners on "testEvent"', () => {
        l1 = mock.fn(); l2 = mock.fn();
        eventTarget.addListener('testEvent', l1);
        eventTarget.addListener('testEvent', l2);
      });
      when('the first listener is removed', () => {
        eventTarget.removeListener('testEvent', l1);
      });
      then('only the second remains', () => {
        assertDeepEqual(eventTarget._listeners.testEvent, [l2]);
      });
    });

    scenario('removing a non-existent listener', ({ given, when, then }) => {
      let listener;
      given('one listener on "testEvent"', () => {
        listener = mock.fn();
        eventTarget.addListener('testEvent', listener);
      });
      when('a different function is removed', () => {
        eventTarget.removeListener('testEvent', mock.fn());
      });
      then('the original listener remains', () => {
        assertDeepEqual(eventTarget._listeners.testEvent, [listener]);
      });
    });

    scenario('removing listener for non-existent event type', ({ when, then }) => {
      when('removeListener is called for unknown event', () => {
        eventTarget.removeListener('nonExistentEvent', mock.fn());
      });
      then('no error is thrown and listeners is unchanged', () => {
        assert.strictEqual(eventTarget._listeners.nonExistentEvent, undefined);
      });
    });

    scenario('removing all listeners from an event', ({ given, when, then }) => {
      let l1, l2;
      given('two listeners on "testEvent"', () => {
        l1 = mock.fn(); l2 = mock.fn();
        eventTarget.addListener('testEvent', l1);
        eventTarget.addListener('testEvent', l2);
      });
      when('both are removed', () => {
        eventTarget.removeListener('testEvent', l1);
        eventTarget.removeListener('testEvent', l2);
      });
      then('the listener array is empty', () => {
        assertDeepEqual(eventTarget._listeners.testEvent, []);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Event Dispatching
  // --------------------------------------------------------------------------

  describe('Event Dispatching', () => {
    scenario('emitting calls all listeners with event object and data', ({ given, when, then }) => {
      let l1, l2, eventData;
      given('two listeners on "testEvent"', () => {
        l1 = mock.fn(); l2 = mock.fn();
        eventTarget.addListener('testEvent', l1);
        eventTarget.addListener('testEvent', l2);
      });
      given('event data', () => { eventData = { message: 'test' }; });
      when('emit is called', () => {
        eventTarget.emit('testEvent', eventData);
      });
      then('both listeners receive the event object and data', () => {
        for (const l of [l1, l2]) {
          const args = [...l.mock.calls[0].arguments];
          assert.strictEqual(args[0].type, 'testEvent');
          assert.strictEqual(args[0].target, eventTarget);
          assert.strictEqual(args[1], eventData);
        }
      });
    });

    scenario('emitting event with no listeners does not throw', ({ when, then }) => {
      when('emit is called for event with no listeners', () => {
        assert.doesNotThrow(() => eventTarget.emit('noListenersEvent', {}));
      });
      then('no error occurs', () => { /* covered by when */ });
    });

    scenario('emit passes data to listener', ({ given, when, then }) => {
      let listener, data;
      given('a listener and data object', () => {
        listener = mock.fn();
        data = { id: 123, name: 'test' };
        eventTarget.addListener('testEvent', listener);
      });
      when('emit is called with data', () => {
        eventTarget.emit('testEvent', data);
      });
      then('listener receives the data', () => {
        const args = [...listener.mock.calls[0].arguments];
        assertDeepEqual(args[1], data);
      });
    });

    scenario('emitting multiple event types independently', ({ given, when, then }) => {
      let l1, l2;
      given('listeners on two different events', () => {
        l1 = mock.fn(); l2 = mock.fn();
        eventTarget.addListener('event1', l1);
        eventTarget.addListener('event2', l2);
      });
      when('both events are emitted', () => {
        eventTarget.emit('event1', { data: 'event1' });
        eventTarget.emit('event2', { data: 'event2' });
      });
      then('each listener fires once with correct data', () => {
        assertCallCount(l1, 1);
        assertCallCount(l2, 1);
        assertDeepEqual([...l1.mock.calls[0].arguments][1], { data: 'event1' });
        assertDeepEqual([...l2.mock.calls[0].arguments][1], { data: 'event2' });
      });
    });

    scenario('emitting event object with existing target', ({ given, when, then }) => {
      let listener, existingTarget;
      given('a listener and an event object with a target', () => {
        listener = mock.fn();
        existingTarget = {};
        eventTarget.addListener('testEvent', listener);
      });
      when('emit is called with event object', () => {
        eventTarget.emit({ type: 'testEvent', target: existingTarget });
      });
      then('listener receives the original event object', () => {
        const args = [...listener.mock.calls[0].arguments];
        assertDeepEqual(args[0], { type: 'testEvent', target: existingTarget });
        assert.strictEqual(args[1], undefined);
      });
    });

    scenario('emitting event without type throws', ({ then }) => {
      then('throws error about missing type', () => {
        assert.throws(
          () => eventTarget.emit({}),
          (err) => err.message.includes("missing 'type' property"),
        );
      });
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    scenario('integrates with app dependency', ({ then }) => {
      then('app reference is accessible', () => {
        assert.strictEqual(eventTarget.app, app);
        assert.ok(eventTarget.app.utils !== undefined);
      });
    });

    scenario('complex add/emit/remove lifecycle', ({ given, when, then }) => {
      let l1, l2, l3;
      given('three listeners across two events', () => {
        l1 = mock.fn(); l2 = mock.fn(); l3 = mock.fn();
        eventTarget.addListener('event1', l1);
        eventTarget.addListener('event2', l2);
        eventTarget.addListener('event2', l3);
      });
      when('both events are emitted', () => {
        eventTarget.emit('event1', { data: 'event1' });
        eventTarget.emit('event2', { data: 'event2' });
      });
      then('all listeners fire once', () => {
        assertCallCount(l1, 1);
        assertCallCount(l2, 1);
        assertCallCount(l3, 1);
      });
      when('one listener is removed and event re-emitted', () => {
        eventTarget.removeListener('event2', l2);
        eventTarget.emit('event2', { data: 'event2_updated' });
      });
      then('removed listener not called again, remaining one is', () => {
        assertCallCount(l2, 1); // still 1 from before
        assertCallCount(l3, 2); // 1 + 1
        assertDeepEqual(
          [...l3.mock.calls[1].arguments][1],
          { data: 'event2_updated' },
        );
      });
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    scenario('listener that throws stops subsequent listeners', ({ given, when, then }) => {
      let errorListener, normalListener;
      given('a throwing listener followed by a normal listener', () => {
        errorListener = mock.fn(() => { throw new Error('Test error'); });
        normalListener = mock.fn();
        eventTarget.addListener('testEvent', errorListener);
        eventTarget.addListener('testEvent', normalListener);
      });
      when('the event is emitted', () => {});
      then('emit throws and normal listener is not called', () => {
        assert.throws(() => eventTarget.emit('testEvent', {}), { message: 'Test error' });
        assertCallCount(normalListener, 0);
      });
    });

    scenario('null and undefined listeners are handled gracefully', ({ then }) => {
      then('addListener with null does not throw', () => {
        assert.doesNotThrow(() => eventTarget.addListener('testEvent', null));
      });
      then('addListener with undefined does not throw', () => {
        assert.doesNotThrow(() => eventTarget.addListener('testEvent', undefined));
      });
    });
  });
});
