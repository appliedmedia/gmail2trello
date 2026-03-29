/**
 * PopupView class tests -- node:test + Given/When/Then
 *
 * Equivalent to: tests/test_class_popupView.js (Jest, 12 tests)
 * Run with: node --test tests/v2/test_class_popupView.js
 */

const {
  G2T, window, document, describe, beforeEach, mock, assert,
  loadSourceFile, createApp, scenario,
  assertDeepEqual,
} = require('./test_utils');

// Load PopupForm first (PopupView creates a PopupForm in its constructor)
loadSourceFile('chrome_manifest_v3/views/class_popupForm.js');
// Load MenuControl (PopupView.init creates a MenuControl)
loadSourceFile('chrome_manifest_v3/class_menuControl.js');
// PopupView.init() calls setInterval(periodicChecks, 5000) which keeps
// the Node process alive after tests complete. Mock it during load.
const _origSetInterval = window.setInterval;
window.setInterval = function() { return 0; };
loadSourceFile('chrome_manifest_v3/views/class_popupView.js');
window.setInterval = _origSetInterval;

const $ = window.$;

describe('PopupView Class', () => {
  let app, popupView;

  beforeEach(() => {
    // Stub window.innerWidth to ensure deterministic tests
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      configurable: true,
    });

    app = createApp();
    // Prevent setInterval in PopupView constructor from keeping process alive
    const origSI = window.setInterval;
    window.setInterval = function() { return 0; };
    popupView = new G2T.PopupView({ app });
    window.setInterval = origSI;
  });

  // --------------------------------------------------------------------------
  // Constructor and Initialization
  // --------------------------------------------------------------------------

  describe('Constructor and Initialization', () => {
    scenario('creating with app dependency', ({ given, when, then }) => {
      then('it is an instance of G2T.PopupView', () => {
        assert.ok(popupView instanceof G2T.PopupView);
      });
      then('it stores the app reference', () => {
        assert.strictEqual(popupView.app, app);
      });
    });

    scenario('initializing with default properties', ({ then }) => {
      then('isInitialized is false', () => {
        assert.strictEqual(popupView.isInitialized, false);
      });
      then('dataDirty is true', () => {
        assert.strictEqual(popupView.dataDirty, true);
      });
      then('MAX_BODY_SIZE is 16384', () => {
        assert.strictEqual(popupView.MAX_BODY_SIZE, 16384);
      });
      then('mouseDownTracker is empty object', () => {
        assertDeepEqual(popupView.mouseDownTracker, {});
      });
      then('lastError is empty string', () => {
        assert.strictEqual(popupView.lastError, '');
      });
      then('intervalId is 0', () => {
        assert.strictEqual(popupView.intervalId, 0);
      });
      then('updatesPending is empty array', () => {
        assertDeepEqual(popupView.updatesPending, []);
      });
      then('comboInitialized is false', () => {
        assert.strictEqual(popupView.comboInitialized, false);
      });
    });

    scenario('initializing size constraints', ({ then }) => {
      then('width.min is 700', () => {
        assert.strictEqual(popupView.size_k.width.min, 700);
      });
      then('width.max is window.innerWidth - 16', () => {
        assert.strictEqual(popupView.size_k.width.max, 1024 - 16);
      });
      then('height.min is 464', () => {
        assert.strictEqual(popupView.size_k.height.min, 464);
      });
      then('height.max is 1400', () => {
        assert.strictEqual(popupView.size_k.height.max, 1400);
      });
      then('text.min is 111', () => {
        assert.strictEqual(popupView.size_k.text.min, 111);
      });
    });

    scenario('creating PopupForm instance', ({ then }) => {
      then('form is an instance of G2T.PopupForm', () => {
        assert.ok(popupView.form instanceof G2T.PopupForm);
      });
      then('form.parent is the popupView', () => {
        assert.strictEqual(popupView.form.parent, popupView);
      });
      then('form.app is the same app', () => {
        assert.strictEqual(popupView.form.app, app);
      });
    });

    scenario('ck static getter returns correct value', ({ then }) => {
      then('static ck equals { id: "g2t_popupview" }', () => {
        assertDeepEqual(G2T.PopupView.ck, { id: 'g2t_popupview' });
      });
    });

    scenario('ck instance getter returns correct value', ({ then }) => {
      then('instance ck equals { id: "g2t_popupview" }', () => {
        assertDeepEqual(popupView.ck, { id: 'g2t_popupview' });
      });
    });
  });

  // --------------------------------------------------------------------------
  // Basic Functionality
  // --------------------------------------------------------------------------

  describe('Basic Functionality', () => {
    scenario('should have init method', ({ then }) => {
      then('init is a function', () => {
        assert.strictEqual(typeof popupView.init, 'function');
      });
    });

    scenario('should have finalCreatePopup method', ({ then }) => {
      then('finalCreatePopup is a function', () => {
        assert.strictEqual(typeof popupView.finalCreatePopup, 'function');
      });
    });

    scenario('should have centerPopup method', ({ then }) => {
      then('centerPopup is a function', () => {
        assert.strictEqual(typeof popupView.centerPopup, 'function');
      });
    });

    scenario('init should initialize the popup view', ({ given, when, then }) => {
      let savedHTML, origSetInterval;
      given('necessary DOM structure', () => {
        savedHTML = document.body.innerHTML;
        document.body.innerHTML = `
          <div id="g2tButton"></div>
          <div id="g2tPopup"></div>
          <div class="toolbar"></div>
        `;
        popupView.$toolBar = $('.toolbar');
        popupView.$g2tButton = $('#g2tButton');
        popupView.$popup = $('#g2tPopup');
        // Mock setInterval to prevent keeping the process alive
        origSetInterval = window.setInterval;
        window.setInterval = mock.fn(() => 999);
      });
      when('init is called', () => {
        assert.doesNotThrow(() => popupView.init());
      });
      then('no error is thrown', () => {
        window.setInterval = origSetInterval;
        if (popupView.intervalId) {
          clearInterval(popupView.intervalId);
          popupView.intervalId = 0;
        }
        document.body.innerHTML = savedHTML;
      });
    });

    scenario('finalCreatePopup should create popup elements', ({ given, when, then }) => {
      let savedHTML;
      given('necessary DOM structure', () => {
        savedHTML = document.body.innerHTML;
        document.body.innerHTML = `
          <div class="toolbar"></div>
          <div id="g2tButton"></div>
          <div id="g2tPopup"></div>
        `;
        popupView.$toolBar = $('.toolbar');
        popupView.$g2tButton = $('#g2tButton');
        popupView.$popup = $('#g2tPopup');
      });
      when('finalCreatePopup is called', () => {
        assert.doesNotThrow(() => popupView.finalCreatePopup());
      });
      then('no error is thrown', () => {
        document.body.innerHTML = savedHTML;
      });
    });

    scenario('centerPopup should center the popup on screen', ({ given, when, then }) => {
      let savedHTML;
      given('DOM with button and popup elements', () => {
        savedHTML = document.body.innerHTML;
        document.body.innerHTML = `
          <div id="g2tButton" style="position: absolute; left: 100px; top: 50px; width: 50px; height: 30px;"></div>
          <div id="g2tPopup" style="position: absolute; width: 400px; height: 300px;"></div>
        `;
        popupView.$g2tButton = $('#g2tButton');
        popupView.$popup = $('#g2tPopup');
      });
      given('mocked jQuery position methods', () => {
        popupView.$g2tButton.position = mock.fn(() => ({ left: 100, top: 50 }));
        popupView.$g2tButton.width = mock.fn(() => 50);
        popupView.$g2tButton.outerWidth = mock.fn(() => 50);
        popupView.$g2tButton.offsetParent = mock.fn(() => ({
          position: mock.fn(() => ({ left: 0, top: 0 })),
          width: mock.fn(() => 1024),
        }));
        popupView.$popup.position = mock.fn(() => ({ left: 200, top: 100 }));
        popupView.$popup.width = mock.fn(() => 400);
        popupView.$popup.css = mock.fn();
      });
      when('centerPopup is called', () => {
        assert.doesNotThrow(() => popupView.centerPopup());
      });
      then('no error is thrown', () => {
        document.body.innerHTML = savedHTML;
      });
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    scenario('should integrate with app correctly', ({ then }) => {
      then('app reference matches', () => {
        assert.strictEqual(popupView.app, app);
      });
      then('app.utils is defined', () => {
        assert.notStrictEqual(popupView.app.utils, undefined);
      });
    });

    scenario('should integrate with form correctly', ({ then }) => {
      then('form is an instance of G2T.PopupForm', () => {
        assert.ok(popupView.form instanceof G2T.PopupForm);
      });
      then('form.parent is the popupView', () => {
        assert.strictEqual(popupView.form.parent, popupView);
      });
      then('form.app matches', () => {
        assert.strictEqual(popupView.form.app, app);
      });
    });
  });
});
