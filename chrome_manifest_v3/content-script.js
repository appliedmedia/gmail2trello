/*
 Flows:
    + 1st loading (onDocumentReady)
        - load user settings()
        - initPopup() // html, data binding & event binding
        - initTrelloData()
        - extractData()
 
    + 2nd loading (onButtonToggle)
        - initTrelloData()
        - extractData()
 */

/**
 * Variable for debugging purpose only
 */
let globalInit = false;

/**
 * Show extension context invalidated dialog
 */
function extensionInvalidConfirmReload() {
  if (
    window.confirm(
      'Gmail-2-Trello extension needs to be reloaded to work correctly.\n\nReload now?',
    )
  ) {
    window.location.reload();
  }
}

var G2T = G2T || {}; // Namespace initialization - must be var to guarantee correct scope
var app = new G2T.App();
window.g2t_app = app;

/**
 * Handle request from background.js
 * @param  request      Request object, contain parameters
 * @param  sender
 * @param  sendResponse Callback function
 */
function requestHandler(request, sender, sendResponse) {
  if (request?.message === 'g2t_initialize') {
    globalInit = true;
    // enough delay for gmail finishes rendering
    jQuery(function () {
      app.init();
    });
    // Was:
    // setTimeout(function() {
    //     jQuery(document).ready(function() {
    //         getGmailObject();
    //         app.initialize();
    //     });
    // }, 1000); // But now we're more resiliant with no data, so pop on immediately.
  }
}

// Register Handler
try {
  // Use the app's goog wrapper if available, otherwise fall back to direct call
  if (window.g2t_app?.goog?.runtimeOnMessageAddListener) {
    window.g2t_app.goog.runtimeOnMessageAddListener(requestHandler);
  } else {
    chrome.runtime.onMessage.addListener(requestHandler); // Was: chrome.extension.onMessage.addListener
  }
} catch (error) {
  console.error(
    `requestHandler ERROR: extension context invalidated - failed "chrome.runtime.onMessage.addListener"`,
  );
  // Handle context invalidation if app isn't ready yet
  extensionInvalidConfirmReload();
}

// end, content-script.js
