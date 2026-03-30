const { Before, After } = require('@cucumber/cucumber');

Before(function () {
  this.installBrowserMocks();
  this.app = this.createApp();
  this.instance = null;
  this.result = null;
  this.error = null;
  this.pendingAction = null;
  this._testListeners = {};
});

After(function () {
  // Clean up any interval leaks
  if (this.instance?.intervalId) {
    clearInterval(this.instance.intervalId);
  }
});
