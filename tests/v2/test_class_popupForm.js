/**
 * PopupForm class tests -- node:test + Given/When/Then
 *
 * Equivalent to: tests/test_class_popupForm.js (Jest, 12 tests)
 * Run with: node --test tests/v2/test_class_popupForm.js
 */

const {
  G2T, window, document, describe, beforeEach, mock, assert,
  loadSourceFile, createApp, scenario, assertCallCount,
  assertDeepEqual, assertCalledWith,
} = require('./test_utils');

// Load the REAL PopupForm class (overrides the mock in G2T namespace)
loadSourceFile('chrome_manifest_v3/views/class_popupForm.js');

const $ = window.$;

describe('PopupForm Class', () => {
  let app, popupForm, mockParent;

  beforeEach(() => {
    app = createApp();

    // Ensure g2t_combobox mock is set up
    if ($.fn && !$.fn.g2t_combobox) {
      $.fn.g2t_combobox = mock.fn(function () { return this; });
    }

    // Create mock parent with basic state interface
    mockParent = {
      state: {
        boardId: '',
        listId: '',
        cardName: '',
        cardDescription: '',
      },
      $popup: $('<div id="g2tPopup"></div>'),
      $popupMessage: $('<div id="g2tPopupMessage"></div>'),
      $popupContent: $('<div id="g2tPopupContent"></div>'),
      size_k: {
        text: {
          min: 100,
        },
      },
    };

    popupForm = new G2T.PopupForm({ parent: mockParent, app });
  });

  // --------------------------------------------------------------------------
  // Constructor and Initialization
  // --------------------------------------------------------------------------

  describe('Constructor and Initialization', () => {
    scenario('creating with parent and app dependencies', ({ given, when, then }) => {
      let pf;
      given('a mock parent and app', () => {});
      when('PopupForm is constructed', () => {
        pf = new G2T.PopupForm({ parent: mockParent, app });
      });
      then('it is an instance of G2T.PopupForm', () => {
        assert.ok(pf instanceof G2T.PopupForm);
      });
      then('it stores the parent reference', () => {
        assert.strictEqual(pf.parent, mockParent);
      });
      then('it stores the app reference', () => {
        assert.strictEqual(pf.app, app);
      });
    });

    scenario('initializing with default properties', ({ then }) => {
      then('isInitialized is false', () => {
        assert.strictEqual(popupForm.isInitialized, false);
      });
    });

    scenario('ck static getter returns correct value', ({ then }) => {
      then('static ck equals { id: "g2t_popupform" }', () => {
        assertDeepEqual(G2T.PopupForm.ck, { id: 'g2t_popupform' });
      });
    });

    scenario('ck instance getter returns correct value', ({ then }) => {
      then('instance ck equals { id: "g2t_popupform" }', () => {
        assertDeepEqual(popupForm.ck, { id: 'g2t_popupform' });
      });
    });

    scenario('init initializes the form', ({ when, then }) => {
      when('init is called', () => {
        popupForm.init();
      });
      then('isInitialized becomes true', () => {
        assert.strictEqual(popupForm.isInitialized, true);
      });
      then('no error is thrown', () => {
        // Covered by the when step completing without error
      });
    });

    scenario('bindEvents binds event listeners to app.events', ({ when, then }) => {
      when('bindEvents is called', () => {
        popupForm.bindEvents();
      });
      then('addListener was called at least once', () => {
        assert.ok(app.events.addListener.mock.callCount() > 0);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Basic Functionality
  // --------------------------------------------------------------------------

  describe('Basic Functionality', () => {
    scenario('should have bindData method', ({ then }) => {
      then('bindData is a function', () => {
        assert.strictEqual(typeof popupForm.bindData, 'function');
      });
    });

    scenario('should have reset method', ({ then }) => {
      then('reset is a function', () => {
        assert.strictEqual(typeof popupForm.reset, 'function');
      });
    });

    scenario('should have submit method', ({ then }) => {
      then('submit is a function', () => {
        assert.strictEqual(typeof popupForm.submit, 'function');
      });
    });

    scenario('bindData should bind data to form elements', ({ given, when, then }) => {
      let savedHTML;
      given('necessary DOM structure', () => {
        savedHTML = document.body.innerHTML;
        document.body.innerHTML = `
          <div class="header">
            <a href="#">Test Link</a>
          </div>
          <div id="g2tSignOutButton"></div>
        `;
      });
      when('bindData is called', () => {
        assert.doesNotThrow(() => popupForm.bindData());
      });
      then('no error is thrown', () => {
        document.body.innerHTML = savedHTML;
      });
    });

    scenario('reset should reset form state', ({ given, when, then }) => {
      let savedHTML;
      given('DOM structure with form elements', () => {
        savedHTML = document.body.innerHTML;
        document.body.innerHTML = `
          <input id="g2tTitle" value="Test Title" />
          <input id="g2tDesc" value="Test Description" />
          <select id="g2tPosition">
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
          </select>
        `;
      });
      when('reset is called', () => {
        assert.doesNotThrow(() => popupForm.reset());
      });
      then('no error is thrown', () => {
        document.body.innerHTML = savedHTML;
      });
    });

    scenario('submit should trigger form submission', ({ given, when, then }) => {
      let savedHTML;
      given('DOM structure with title and description', () => {
        savedHTML = document.body.innerHTML;
        document.body.innerHTML = `
          <input id="g2tTitle" value="Test Card" />
          <textarea id="g2tDesc">Test Description</textarea>
        `;
        popupForm.app.temp = { title: 'Test Card' };
        popupForm.app.persist = { boardId: 'test-board', listId: 'test-list' };
      });
      when('submit is called', () => {
        assert.doesNotThrow(() => popupForm.submit());
      });
      then('events.emit was called with "submit"', () => {
        assertCalledWith(app.events.emit, 'submit');
        document.body.innerHTML = savedHTML;
      });
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    scenario('should integrate with parent correctly', ({ then }) => {
      then('parent reference matches mockParent', () => {
        assert.strictEqual(popupForm.parent, mockParent);
      });
      then('parent.state is defined', () => {
        assert.notStrictEqual(popupForm.parent.state, undefined);
      });
    });

    scenario('should integrate with app correctly', ({ then }) => {
      then('app reference matches', () => {
        assert.strictEqual(popupForm.app, app);
      });
      then('app.events is defined', () => {
        assert.notStrictEqual(popupForm.app.events, undefined);
      });
      then('app.utils is defined', () => {
        assert.notStrictEqual(popupForm.app.utils, undefined);
      });
    });
  });
});
