const { Given, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Coerce a string value from a Gherkin step into its JS equivalent.
 */
function coerce(str) {
  if (str === 'true') return true;
  if (str === 'false') return false;
  if (str === 'null') return null;
  if (str === 'undefined') return undefined;
  if (/^\d+$/.test(str)) return Number(str);
  if (/^\d+\.\d+$/.test(str)) return Number(str);
  return str;
}

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

Given('{word} is set to {string}', function (prop, value) {
  const v = coerce(value);
  // Try persist first, then temp
  if (prop in this.app.persist) {
    this.app.persist[prop] = v;
  } else if (prop in this.app.temp) {
    this.app.temp[prop] = v;
  } else {
    // Set on persist by default
    this.app.persist[prop] = v;
  }
});

Given('{word}.{word} is set to {string}', function (obj, prop, value) {
  const v = coerce(value);
  if (!this.app[obj]) {
    this.app[obj] = {};
  }
  this.app[obj][prop] = v;
});

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then('property {word} is {string}', function (prop, expected) {
  const actual = this.instance[prop];
  assert.strictEqual(String(actual), expected);
});

Then('property {word}.{word} is {string}', function (obj, prop, expected) {
  const target = this.instance || this.app;
  const actual = target[obj]?.[prop];
  assert.strictEqual(String(actual), expected);
});

Then('property {word} is true', function (prop) {
  assert.strictEqual(this.instance[prop], true);
});

Then('property {word} is false', function (prop) {
  assert.strictEqual(this.instance[prop], false);
});

Then('property {word} is null', function (prop) {
  assert.strictEqual(this.instance[prop], null);
});

Then('property {word} is undefined', function (prop) {
  assert.strictEqual(this.instance[prop], undefined);
});

Then('app is defined', function () {
  assert.ok(this.app, 'Expected app to be defined');
});

Then('property {word} is a function', function (prop) {
  assert.strictEqual(typeof this.instance[prop], 'function',
    `Expected ${prop} to be a function, got ${typeof this.instance[prop]}`);
});
