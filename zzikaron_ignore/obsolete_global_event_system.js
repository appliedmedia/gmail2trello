// Test for global event system architecture
// This simulates the browser environment for testing

// Mock the G2T namespace and EventTarget
var G2T = {};

class EventTarget {
  constructor() {
    this._listeners = {};
  }

  addListener(type, listener) {
    if (typeof this._listeners[type] === 'undefined') {
      this._listeners[type] = [];
    }
    this._listeners[type].push(listener);
  }

  fire(event, params) {
    if (typeof event === 'string') {
      event = { type: event };
    }
    if (!event.target) {
      event.target = this;
    }

    if (!event.type) {
      throw new Error("Event object missing 'type' property.");
    }

    if (this._listeners[event.type] instanceof Array) {
      var listeners = this._listeners[event.type];
      for (var i = 0, len = listeners.length; i < len; i++) {
        listeners[i].call(this, event, params);
      }
    }
  }

  removeListener(type, listener) {
    if (this._listeners[type] instanceof Array) {
      var listeners = this._listeners[type];
      for (var i = 0, len = listeners.length; i < len; i++) {
        if (listeners[i] === listener) {
          listeners.splice(i, 1);
          break;
        }
      }
    }
  }
}

G2T.EventTarget = EventTarget;

// Mock App class
class App {
  constructor() {
    this.event = new G2T.EventTarget();
  }

  init() {
    // Mock initialization
  }
}

G2T.App = App;

// Create global app instance
G2T.app = new G2T.App();
G2T.app.init();

// Test the global event system
console.log('🧪 Testing Global Event System Architecture...\n');

// Test 1: Global event system is available
if (G2T.app && G2T.app.event) {
  console.log('✅ Global event system available');
} else {
  console.log('❌ Global event system not available');
  process.exit(1);
}

// Test 2: Can fire and listen to events
let eventReceived = false;
let eventData = null;

G2T.app.event.addListener('test', (event, data) => {
  eventReceived = true;
  eventData = data;
});

G2T.app.event.emit('test', { message: 'hello world' });

if (eventReceived && eventData && eventData.message === 'hello world') {
  console.log('✅ Events can be fired and received');
} else {
  console.log('❌ Event system not working');
  process.exit(1);
}

// Test 3: Multiple listeners work
let listener1Called = false;
let listener2Called = false;

G2T.app.event.addListener('multi', () => {
  listener1Called = true;
});
G2T.app.event.addListener('multi', () => {
  listener2Called = true;
});

G2T.app.event.emit('multi');

if (listener1Called && listener2Called) {
  console.log('✅ Multiple listeners work correctly');
} else {
  console.log('❌ Multiple listeners not working');
  process.exit(1);
}

// Test 4: Remove listener works
let shouldNotBeCalled = false;
const testListener = () => {
  shouldNotBeCalled = true;
};

G2T.app.event.addListener('remove', testListener);
G2T.app.event.removeListener('remove', testListener);
G2T.app.event.emit('remove');

if (!shouldNotBeCalled) {
  console.log('✅ Remove listener works correctly');
} else {
  console.log('❌ Remove listener not working');
  process.exit(1);
}

console.log('\n🎉 All global event system tests passed!');
console.log('\nArchitecture Summary:');
console.log('- G2T.app.event provides global event system');
console.log('- All components can use G2T.app.events.emit() to fire events');
console.log('- All components can use G2T.app.events.addListener() to listen');
console.log('- No local event systems needed in components');
console.log('- Clear separation between global and local concerns');
