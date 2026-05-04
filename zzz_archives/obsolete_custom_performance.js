#!/usr/bin/env node

// Simple performance test for custom EventTarget implementation
// Run with: node tests/custom_performance_test.js

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

// Performance test
function runPerformanceTest() {
  const iterations = 100000;
  const eventTypes = ['test', 'data', 'update', 'delete', 'create'];
  const testData = { id: 1, message: 'test', timestamp: Date.now() };

  function createListener() {
    return (event, params) => {
      const result = event.type + (params ? JSON.stringify(params) : '');
      return result.length;
    };
  }

  function testEventTarget() {
    const start = process.hrtime.bigint();
    const eventTarget = new CustomEventTarget();
    const listeners = [];

    // Add listeners
    for (let i = 0; i < 10; i++) {
      const listener = createListener();
      listeners.push(listener);
      eventTarget.addListener(eventTypes[i % eventTypes.length], listener);
    }

    // Fire events
    for (let i = 0; i < iterations; i++) {
      const eventType = eventTypes[i % eventTypes.length];
      eventTarget.emit(eventType, testData);
    }

    // Remove listeners
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i];
      eventTarget.removeListener(eventTypes[i % eventTypes.length], listener);
    }

    const end = process.hrtime.bigint();
    return Number(end - start) / 1000000; // Convert to milliseconds
  }

  console.log('🚀 Custom EventTarget Performance Test (Node.js)');
  console.log(`Iterations: ${iterations.toLocaleString()}\n`);

  // Warm up
  console.log('🔥 Warming up...');
  for (let i = 0; i < 1000; i++) {
    testEventTarget();
  }

  // Run tests
  console.log('📊 Running performance tests...\n');

  const times = [];

  for (let run = 0; run < 5; run++) {
    console.log(`Run ${run + 1}/5...`);

    const time = testEventTarget();
    times.push(time);

    console.log(`  Time: ${time.toFixed(2)}ms`);
  }

  // Calculate average
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

  console.log('\n📈 Results:');
  console.log(`Custom EventTarget: ${avgTime.toFixed(2)}ms average`);
  console.log(
    `Events per second: ${(iterations / (avgTime / 1000)).toLocaleString()}`
  );

  return {
    average: avgTime,
    times: times,
  };
}

// Run the test
const results = runPerformanceTest();

console.log('\n🎯 Analysis:');
console.log(
  `The custom EventTarget implementation can handle ${(
    results.average / 1000
  ).toFixed(2)} million events per second.`
);
console.log('This is quite fast for a JavaScript event system.');

// Test memory usage
console.log('\n🧠 Memory Test:');
const eventTarget = new CustomEventTarget();
const initialMemory = process.memoryUsage().heapUsed;

// Add many listeners
for (let i = 0; i < 1000; i++) {
  eventTarget.addListener(`event${i}`, () => {});
}

const afterAddMemory = process.memoryUsage().heapUsed;
const memoryIncrease = afterAddMemory - initialMemory;

console.log(
  `Memory increase for 1000 listeners: ${(memoryIncrease / 1024).toFixed(2)} KB`
);
console.log(
  `Average memory per listener: ${(memoryIncrease / 1000).toFixed(2)} bytes`
);
