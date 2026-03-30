const { Given, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const { loadSourceFile } = require('../../support/world');

// ---------------------------------------------------------------------------
// Class-name to source-file mapping and dependency loading
// ---------------------------------------------------------------------------

const CLASS_FILE_MAP = {
  EventTarget: 'chrome_manifest_v3/class_eventTarget.js',
  Goog: 'chrome_manifest_v3/class_goog.js',
  Trel: 'chrome_manifest_v3/class_trel.js',
  Model: 'chrome_manifest_v3/class_model.js',
  Gmail: 'chrome_manifest_v3/class_gmail.js',
  WaitCounter: 'chrome_manifest_v3/class_waitCounter.js',
  MenuControl: 'chrome_manifest_v3/class_menuControl.js',
  Utils: 'chrome_manifest_v3/class_utils.js',
  PopupForm: 'chrome_manifest_v3/views/class_popupForm.js',
  PopupView: 'chrome_manifest_v3/views/class_popupView.js',
  GmailView: 'chrome_manifest_v3/views/class_gmailView.js',
  App: 'chrome_manifest_v3/class_app.js',
};

// Dependencies that must be loaded before a given class
const CLASS_DEPS = {
  Model: ['Trel'],
  GmailView: ['WaitCounter'],
  PopupView: ['PopupForm', 'MenuControl'],
  App: [
    'EventTarget', 'Goog', 'Trel', 'Model', 'Gmail',
    'WaitCounter', 'GmailView', 'PopupForm', 'MenuControl', 'PopupView', 'Utils',
  ],
};

// Track which classes have been loaded into the shared JSDOM
const loadedClasses = new Set(['Utils', 'GmailView']); // loaded at module level in world.js

function ensureClassLoaded(className) {
  if (loadedClasses.has(className)) return;

  // Load dependencies first
  const deps = CLASS_DEPS[className] || [];
  for (const dep of deps) {
    ensureClassLoaded(dep);
  }

  const filePath = CLASS_FILE_MAP[className];
  if (!filePath) {
    throw new Error(`Unknown class name: ${className}. Known: ${Object.keys(CLASS_FILE_MAP).join(', ')}`);
  }

  // Mock setInterval before loading PopupView (it may use setInterval in init)
  if (className === 'PopupView' || className === 'App') {
    const win = require('../../support/world').sharedWindow;
    if (!win._origSetInterval) {
      win._origSetInterval = win.setInterval;
      win.setInterval = function (fn, ms) {
        return win._origSetInterval(fn, ms);
      };
    }
  }

  loadSourceFile(filePath);
  loadedClasses.add(className);
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

Given('a fresh {word}', function (className) {
  ensureClassLoaded(className);

  const Ctor = this.G2T[className];
  if (!Ctor) {
    throw new Error(`G2T.${className} is not defined after loading. Check the source file.`);
  }

  if (className === 'App') {
    // App constructor takes no args -- it self-wires
    this.instance = new Ctor();
  } else {
    this.instance = new Ctor({ app: this.app });
  }
});

Given('a fresh {word} with no args', function (className) {
  ensureClassLoaded(className);

  const Ctor = this.G2T[className];
  if (!Ctor) {
    throw new Error(`G2T.${className} is not defined after loading.`);
  }

  try {
    this.instance = new Ctor({});
  } catch (e) {
    this.error = e;
  }
});

Then('it is an instance of {word}', function (className) {
  ensureClassLoaded(className);
  const Ctor = this.G2T[className];
  assert.ok(this.instance instanceof Ctor,
    `Expected instance to be instanceof G2T.${className}`);
});

Then('it stores the app reference', function () {
  assert.strictEqual(this.instance.app, this.app,
    'Expected instance.app to be the mock app');
});

Then('ck.id is {string}', function (expected) {
  assert.strictEqual(this.instance.ck.id, expected);
});

Then('static ck.id of {word} is {string}', function (className, expected) {
  ensureClassLoaded(className);
  const Ctor = this.G2T[className];
  assert.strictEqual(Ctor.ck.id, expected);
});
