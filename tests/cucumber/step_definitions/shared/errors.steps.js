const { When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');

When('the action is performed', function () {
  try {
    if (typeof this.pendingAction !== 'function') {
      throw new Error('No pendingAction has been set. Set this.pendingAction in a prior step.');
    }
    this.result = this.pendingAction();
    this.error = null;
  } catch (e) {
    this.error = e;
    this.result = null;
  }
});

Then('no error is thrown', function () {
  assert.strictEqual(this.error, null,
    `Expected no error, but got: ${this.error?.message}`);
});

Then('an error is thrown', function () {
  assert.ok(this.error, 'Expected an error to be thrown, but none was');
});

Then('the error message contains {string}', function (str) {
  assert.ok(this.error, 'Expected an error to be thrown, but none was');
  assert.ok(this.error.message.includes(str),
    `Expected error message to contain "${str}", got: "${this.error.message}"`);
});
