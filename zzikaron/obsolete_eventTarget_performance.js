// Performance test for EventTarget implementations
// Compares current custom EventTarget vs native ES6 EventTarget

// Current EventTarget implementation (copy from lib/eventTarget.js)
class CustomEventTarget {
  constructor() {
    this._listeners = {};
  }

  addListener(type, listener) {
    if (typeof this._listeners[type] === 'undefined') {
      this._listeners[type] = [];
    }
    this._listeners[type].push(listener);
  }

  emit(event, params) {
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

// Native ES6 EventTarget wrapper to maintain same interface
class NativeEventTargetWrapper extends EventTarget {
  constructor() {
    super();
    this._listeners = new Map(); // Track listeners for removeListener
  }

  addListener(type, listener) {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }
    this._listeners.get(type).add(listener);

    // Create wrapper function to maintain same signature
    const wrapper = event => {
      listener.call(this, event, event.detail);
    };

    // Store wrapper for removal
    listener._wrapper = wrapper;
    this.addEventListener(type, wrapper);
  }

  emit(event, params) {
    if (typeof event === 'string') {
      const customEvent = new CustomEvent(event, {
        detail: params,
        bubbles: false,
        cancelable: true,
      });
      customEvent.target = this;
      this.dispatchEvent(customEvent);
    } else {
      if (!event.target) {
        event.target = this;
      }
      const customEvent = new CustomEvent(event.type, {
        detail: event,
        bubbles: false,
        cancelable: true,
      });
      this.dispatchEvent(customEvent);
    }
  }

  removeListener(type, listener) {
    const listeners = this._listeners.get(type);
    if (listeners && listeners.has(listener)) {
      listeners.delete(listener);
      if (listener._wrapper) {
        this.removeEventListener(type, listener._wrapper);
        delete listener._wrapper;
      }
    }
  }
}

// Performance test suite
const PerformanceTest = {
  iterations: 100000,

  // Test data
  eventTypes: ['test', 'data', 'update', 'delete', 'create'],
  testData: { id: 1, message: 'test', timestamp: Date.now() },

  // Test listeners
  createListener() {
    return (event, params) => {
      // Simulate some work
      const result = event.type + (params ? JSON.stringify(params) : '');
      return result.length;
    };
  },

  // Test custom EventTarget
  testCustomEventTarget() {
    const start = performance.now();
    const eventTarget = new CustomEventTarget();
    const listeners = [];

    // Add listeners
    for (let i = 0; i < 10; i++) {
      const listener = this.createListener();
      listeners.push(listener);
      eventTarget.addListener(
        this.eventTypes[i % this.eventTypes.length],
        listener,
      );
    }

    // Fire events
    for (let i = 0; i < this.iterations; i++) {
      const eventType = this.eventTypes[i % this.eventTypes.length];
      eventTarget.emit(eventType, this.testData);
    }

    // Remove listeners
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i];
      eventTarget.removeListener(
        this.eventTypes[i % this.eventTypes.length],
        listener,
      );
    }

    const end = performance.now();
    return end - start;
  },

  // Test native EventTarget wrapper
  testNativeEventTarget() {
    const start = performance.now();
    const eventTarget = new NativeEventTargetWrapper();
    const listeners = [];

    // Add listeners
    for (let i = 0; i < 10; i++) {
      const listener = this.createListener();
      listeners.push(listener);
      eventTarget.addListener(
        this.eventTypes[i % this.eventTypes.length],
        listener,
      );
    }

    // Fire events
    for (let i = 0; i < this.iterations; i++) {
      const eventType = this.eventTypes[i % this.eventTypes.length];
      eventTarget.emit(eventType, this.testData);
    }

    // Remove listeners
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i];
      eventTarget.removeListener(
        this.eventTypes[i % this.eventTypes.length],
        listener,
      );
    }

    const end = performance.now();
    return end - start;
  },

  // Run performance comparison
  runComparison() {
    console.log('🚀 EventTarget Performance Test');
    console.log(`Iterations: ${this.iterations.toLocaleString()}\n`);

    // Warm up
    console.log('🔥 Warming up...');
    for (let i = 0; i < 1000; i++) {
      this.testCustomEventTarget();
      this.testNativeEventTarget();
    }

    // Run tests
    console.log('📊 Running performance tests...\n');

    const customTimes = [];
    const nativeTimes = [];

    for (let run = 0; run < 5; run++) {
      console.log(`Run ${run + 1}/5...`);

      const customTime = this.testCustomEventTarget();
      const nativeTime = this.testNativeEventTarget();

      customTimes.push(customTime);
      nativeTimes.push(nativeTime);

      console.log(`  Custom: ${customTime.toFixed(2)}ms`);
      console.log(`  Native: ${nativeTime.toFixed(2)}ms`);
    }

    // Calculate averages
    const avgCustom =
      customTimes.reduce((a, b) => a + b, 0) / customTimes.length;
    const avgNative =
      nativeTimes.reduce((a, b) => a + b, 0) / nativeTimes.length;

    console.log('\n📈 Results:');
    console.log(`Custom EventTarget: ${avgCustom.toFixed(2)}ms average`);
    console.log(`Native EventTarget: ${avgNative.toFixed(2)}ms average`);

    const difference = avgNative - avgCustom;
    const percentage = (difference / avgCustom) * 100;

    if (difference > 0) {
      console.log(`Native is ${Math.abs(percentage).toFixed(2)}% slower`);
    } else {
      console.log(`Native is ${Math.abs(percentage).toFixed(2)}% faster`);
    }

    console.log(`\nEvents per second:`);
    console.log(
      `Custom: ${(this.iterations / (avgCustom / 1000)).toLocaleString()}`,
    );
    console.log(
      `Native: ${(this.iterations / (avgNative / 1000)).toLocaleString()}`,
    );

    return {
      custom: avgCustom,
      native: avgNative,
      difference,
      percentage,
    };
  },
};

// Run the test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.PerformanceTest = PerformanceTest;
  console.log(
    'Performance test loaded. Run PerformanceTest.runComparison() to test.',
  );
} else {
  // Node.js environment
  module.exports = PerformanceTest;
}
