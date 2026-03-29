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
  // Clean up setInterval leaks from PopupView
  if (this.instance?.intervalId) {
    clearInterval(this.instance.intervalId);
  }
  if (this.app?.popupView?.intervalId) {
    clearInterval(this.app.popupView.intervalId);
  }
});
