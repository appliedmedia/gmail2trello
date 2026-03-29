/**
 * MenuControl class tests -- node:test + Given/When/Then
 *
 * Equivalent to: tests/test_class_menuControl.js (Jest, 10 tests)
 * Run with: node --test tests/v2/test_class_menuControl.js
 */

const {
  G2T, describe, beforeEach, mock, assert,
  loadSourceFile, createApp, scenario, assertDeepEqual,
  window, document,
} = require('./test_utils');

// Load the REAL MenuControl class
loadSourceFile('chrome_manifest_v3/class_menuControl.js');

describe('MenuControl Class', () => {
  let app, menuControl;

  beforeEach(() => {
    app = createApp();
    menuControl = new G2T.MenuControl({ app });
    // Clean up DOM between tests
    document.body.innerHTML = '';
  });

  // --------------------------------------------------------------------------
  // Constructor and Initialization
  // --------------------------------------------------------------------------

  describe('Constructor and Initialization', () => {
    scenario('creating with app dependency', ({ given, when, then }) => {
      then('it is an instance of G2T.MenuControl', () => {
        assert.ok(menuControl instanceof G2T.MenuControl);
      });
      then('it stores the app reference', () => {
        assert.strictEqual(menuControl.app, app);
      });
    });

    scenario('creating with no arguments', ({ given, when, then }) => {
      let defaultMenuControl;
      when('constructed with empty object', () => {
        defaultMenuControl = new G2T.MenuControl({});
      });
      then('it is an instance of G2T.MenuControl', () => {
        assert.ok(defaultMenuControl instanceof G2T.MenuControl);
      });
      then('app is undefined', () => {
        assert.strictEqual(defaultMenuControl.app, undefined);
      });
    });

    scenario('ck static getter returns correct value', ({ then }) => {
      then('returns correct id', () => {
        assertDeepEqual(G2T.MenuControl.ck, { id: 'g2t_menuControl' });
      });
    });

    scenario('ck instance getter returns correct value', ({ then }) => {
      then('returns correct id', () => {
        assertDeepEqual(menuControl.ck, { id: 'g2t_menuControl' });
      });
    });
  });

  // --------------------------------------------------------------------------
  // Menu Reset
  // --------------------------------------------------------------------------

  describe('Menu Reset', () => {
    scenario('reset initializes menu with selectors', ({ given, when, then }) => {
      given('menu items in the DOM', () => {
        document.body.innerHTML = `
          <div class="menu-item" data-menu-index="0">Item 1</div>
          <div class="menu-item" data-menu-index="1">Item 2</div>
        `;
      });
      given('selectors are set on the menu control', () => {
        menuControl.selectors = { item: '.menu-item' };
      });
      then('DOM has 2 menu items', () => {
        assert.strictEqual(document.querySelectorAll('.menu-item').length, 2);
      });
      when('reset is called with selectors', () => {
        assert.doesNotThrow(() => menuControl.reset({ selectors: '.menu-item' }));
      });
      then('items is defined', () => {
        assert.ok(menuControl.items !== undefined);
      });
    });

    scenario('reset handles empty selector', ({ when, then }) => {
      given('selectors is empty string', () => {
        menuControl.selectors = '';
      });
      when('reset is called with empty selectors', () => {
        assert.doesNotThrow(() => menuControl.reset({ selectors: '' }));
      });
      then('no error occurs', () => { /* covered by when */ });

      function given(label, action) { action(); }
    });

    scenario('reset handles null selector', ({ when, then }) => {
      given('selectors is null', () => {
        menuControl.selectors = null;
      });
      when('reset is called with null selectors', () => {
        assert.doesNotThrow(() => menuControl.reset({ selectors: null }));
      });
      then('no error occurs', () => { /* covered by when */ });

      function given(label, action) { action(); }
    });

    scenario('reset handles undefined selector', ({ when, then }) => {
      given('selectors is undefined', () => {
        menuControl.selectors = undefined;
      });
      when('reset is called with undefined selectors', () => {
        assert.doesNotThrow(() => menuControl.reset({ selectors: undefined }));
      });
      then('no error occurs', () => { /* covered by when */ });

      function given(label, action) { action(); }
    });
  });

  // --------------------------------------------------------------------------
  // Menu Item Management
  // --------------------------------------------------------------------------

  describe('Menu Item Management', () => {
    scenario('handles menu items with click handlers', ({ given, when, then }) => {
      given('one menu item in the DOM', () => {
        document.body.innerHTML = `
          <div class="menu-item" data-menu-index="0">Item 1</div>
        `;
      });
      given('selectors are set', () => {
        menuControl.selectors = { item: '.menu-item' };
      });
      then('DOM has 1 menu item', () => {
        assert.strictEqual(document.querySelectorAll('.menu-item').length, 1);
      });
      when('reset is called', () => {
        menuControl.reset({ selectors: '.menu-item' });
      });
      then('items is defined', () => {
        assert.ok(menuControl.items !== undefined);
      });
      then('items has a click function', () => {
        assert.strictEqual(typeof menuControl.items.click, 'function');
      });
    });

    scenario('handles multiple menu items', ({ given, when, then }) => {
      given('three menu items in the DOM', () => {
        document.body.innerHTML = `
          <div class="menu-item" data-menu-index="0">Item 1</div>
          <div class="menu-item" data-menu-index="1">Item 2</div>
          <div class="menu-item" data-menu-index="2">Item 3</div>
        `;
      });
      given('selectors are set', () => {
        menuControl.selectors = { item: '.menu-item' };
      });
      then('DOM has 3 menu items', () => {
        assert.strictEqual(document.querySelectorAll('.menu-item').length, 3);
      });
      when('reset is called', () => {
        assert.doesNotThrow(() => menuControl.reset({ selectors: '.menu-item' }));
      });
      then('items is defined', () => {
        assert.ok(menuControl.items !== undefined);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    scenario('integrates with app correctly', ({ then }) => {
      then('app reference is accessible', () => {
        assert.strictEqual(menuControl.app, app);
      });
      then('app.events is defined', () => {
        assert.ok(menuControl.app.events !== undefined);
      });
      then('app.utils is defined', () => {
        assert.ok(menuControl.app.utils !== undefined);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    scenario('handles invalid selectors gracefully', ({ then }) => {
      then('reset with number does not throw', () => {
        assert.doesNotThrow(() => menuControl.reset({ selectors: 123 }));
      });
      then('reset with object does not throw', () => {
        assert.doesNotThrow(() => menuControl.reset({ selectors: {} }));
      });
      then('reset with array does not throw', () => {
        assert.doesNotThrow(() => menuControl.reset({ selectors: [] }));
      });
    });
  });
});
