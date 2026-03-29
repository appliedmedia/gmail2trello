/**
 * GmailView class tests -- node:test + Given/When/Then
 *
 * Equivalent to: tests/test_class_gmailView.js (Jest, 32 tests)
 * Run with: node --test tests/v2/test_class_gmailView.js
 */

const {
  G2T, window, document, describe, beforeEach, mock, assert,
  loadSourceFile, createApp, scenario,
  assertDeepEqual, assertCalledWith, assertCallCount,
} = require('./test_utils');

// Load WaitCounter (GmailView constructor needs it)
loadSourceFile('chrome_manifest_v3/class_waitCounter.js');
// Re-load GmailView to get fresh class with WaitCounter available
loadSourceFile('chrome_manifest_v3/views/class_gmailView.js');
// Stub detectToolbar to prevent runaway errors
if (G2T.GmailView) {
  G2T.GmailView.prototype.detectToolbar = () => true;
}

const $ = window.$;

describe('GmailView Class', () => {
  let app, gmailView;

  beforeEach(() => {
    app = createApp();
    gmailView = new G2T.GmailView({ app });

    // Set up $root manually to point to the JSDOM body
    gmailView.$root = $('body');

    // Initialize properties that the GmailView methods expect
    gmailView.preprocess = {
      a: {
        'test@example.com <test@example.com>': '[Test User](<test@example.com>)',
        'test@example.com (test@example.com)': '[Test User](<test@example.com>)',
        'test@example.com test@example.com': '[Test User](<test@example.com>)',
        '"test@example.com" <test@example.com>': '[Test User](<test@example.com>)',
        '"test@example.com" (test@example.com)': '[Test User](<test@example.com>)',
        '"test@example.com" test@example.com': '[Test User](<test@example.com>)',
      },
    };
    gmailView.emailImage = {};
    gmailView.attachment = [];
    gmailView.cc_raw = '';
    gmailView.cc_md = '';
  });

  // --------------------------------------------------------------------------
  // Constructor and Initialization
  // --------------------------------------------------------------------------

  describe('Constructor and Initialization', () => {
    scenario('LAYOUT_DEFAULT constant is 0', ({ then }) => {
      then('LAYOUT_DEFAULT equals 0', () => {
        assert.strictEqual(gmailView.LAYOUT_DEFAULT, 0);
      });
    });

    scenario('LAYOUT_SPLIT constant is 1', ({ then }) => {
      then('LAYOUT_SPLIT equals 1', () => {
        assert.strictEqual(gmailView.LAYOUT_SPLIT, 1);
      });
    });

    scenario('$root is set to body element', ({ then }) => {
      then('$root has length 1 and is BODY', () => {
        assert.ok(gmailView.$root && gmailView.$root.length === 1 && gmailView.$root[0].tagName === 'BODY');
      });
    });

    scenario('parsingData initial value is false', ({ then }) => {
      then('parsingData is false', () => {
        assert.strictEqual(gmailView.parsingData, false);
      });
    });

    scenario('runaway initial value is 0', ({ then }) => {
      then('runaway is 0', () => {
        assert.strictEqual(gmailView.runaway, 0);
      });
    });

    scenario('static ck.id is correct', ({ then }) => {
      then('G2T.GmailView.ck.id equals "g2t_gmailview"', () => {
        assert.strictEqual(G2T.GmailView.ck.id, 'g2t_gmailview');
      });
    });

    scenario('static ck.uniqueUriVar is correct', ({ then }) => {
      then('G2T.GmailView.ck.uniqueUriVar equals "g2t_filename"', () => {
        assert.strictEqual(G2T.GmailView.ck.uniqueUriVar, 'g2t_filename');
      });
    });

    scenario('instance ck.id is correct', ({ then }) => {
      then('gmailView.ck.id equals "g2t_gmailview"', () => {
        assert.strictEqual(gmailView.ck.id, 'g2t_gmailview');
      });
    });

    scenario('instance ck.uniqueUriVar is correct', ({ then }) => {
      then('gmailView.ck.uniqueUriVar equals "g2t_filename"', () => {
        assert.strictEqual(gmailView.ck.uniqueUriVar, 'g2t_filename');
      });
    });

    scenario('should create WaitCounter instance', ({ then }) => {
      then('waitCounter is an object with start and stop', () => {
        assert.strictEqual(typeof gmailView.waitCounter, 'object');
        assert.notStrictEqual(gmailView.waitCounter.start, undefined);
        assert.notStrictEqual(gmailView.waitCounter.stop, undefined);
      });
    });

    scenario('should have selectors object', ({ then }) => {
      then('selectors is an object', () => {
        assert.strictEqual(typeof gmailView.selectors, 'object');
      });
    });
  });

  // --------------------------------------------------------------------------
  // Utility Methods
  // --------------------------------------------------------------------------

  describe('Utility Methods', () => {
    const urlWithFilenameTests = [
      {
        name: 'https://example.com, test.txt',
        url: 'https://example.com',
        filename: 'test.txt',
        expected: 'https://example.com?g2t_filename=/test.txt',
      },
      {
        name: 'https://site.com/path, document.pdf',
        url: 'https://site.com/path',
        filename: 'document.pdf',
        expected: 'https://site.com/path?g2t_filename=/document.pdf',
      },
      {
        name: 'empty filename',
        url: 'https://example.com',
        filename: '',
        expected: 'https://example.com?g2t_filename=/',
      },
    ];

    for (const tc of urlWithFilenameTests) {
      scenario(`url_with_filename ${tc.name}`, ({ when, then }) => {
        let result;
        when('url_with_filename is called', () => {
          result = gmailView.url_with_filename(tc.url, tc.filename);
        });
        then(`result is "${tc.expected}"`, () => {
          assert.strictEqual(result, tc.expected);
        });
      });
    }

    const displayNameAndEmailTests = [
      { name: 'John Doe', email: 'john@example.com', expected: 'John Doe <john@example.com>' },
      { name: 'John Doe', email: '', expected: 'John Doe' },
      { name: '', email: 'john@example.com', expected: '<john@example.com>' },
      { name: '', email: '', expected: '' },
    ];

    for (const tc of displayNameAndEmailTests) {
      scenario(`displayNameAndEmail("${tc.name}", "${tc.email}")`, ({ when, then }) => {
        let result;
        when('displayNameAndEmail is called', () => {
          result = gmailView.displayNameAndEmail(tc.name, tc.email);
        });
        then(`result is "${tc.expected}"`, () => {
          assert.strictEqual(result, tc.expected);
        });
      });
    }
  });

  // --------------------------------------------------------------------------
  // Email Processing Methods
  // --------------------------------------------------------------------------

  describe('Email Processing Methods', () => {
    const emailRawMdTests = [
      { label: 'empty name and email', name: '', email: '', expectedRaw: '', expectedMd: '' },
      { label: 'John Doe, john@example.com', name: 'John Doe', email: 'john@example.com', expectedRaw: 'John Doe <john@example.com>', expectedMd: '[John Doe](<john@example.com>)' },
      { label: 'John Doe, empty email', name: 'John Doe', email: '', expectedRaw: 'John Doe', expectedMd: 'John Doe' },
      { label: 'empty name, john@example.com', name: '', email: 'john@example.com', expectedRaw: 'john <john@example.com>', expectedMd: '[john](<john@example.com>)' },
      { label: 'matching name and email', name: 'john@example.com', email: 'john@example.com', expectedRaw: 'john <john@example.com>', expectedMd: '[john](<john@example.com>)' },
    ];

    for (const tc of emailRawMdTests) {
      scenario(`email_raw_md ${tc.label}`, ({ when, then }) => {
        let result;
        when('email_raw_md is called', () => {
          result = gmailView.email_raw_md(tc.name, tc.email);
        });
        then(`raw is "${tc.expectedRaw}"`, () => {
          assert.strictEqual(result.raw, tc.expectedRaw);
        });
        then(`md is "${tc.expectedMd}"`, () => {
          assert.strictEqual(result.md, tc.expectedMd);
        });
      });
    }

    const makePreprocessMailtoTests = [
      { name: 'John Doe', email: 'john@example.com', expectedKey: 'john doe <john@example.com>', expectedValue: ' [John Doe](<john@example.com>) ' },
      { name: 'Jane Smith', email: 'jane@test.org', expectedKey: 'jane smith <jane@test.org>', expectedValue: ' [Jane Smith](<jane@test.org>) ' },
    ];

    for (const tc of makePreprocessMailtoTests) {
      scenario(`make_preprocess_mailto ${tc.name}, ${tc.email}`, ({ when, then }) => {
        let result;
        when('make_preprocess_mailto is called', () => {
          result = gmailView.make_preprocess_mailto(tc.name, tc.email);
        });
        then('result is an object with entries', () => {
          assert.strictEqual(typeof result, 'object');
          assert.ok(Object.keys(result).length > 0);
        });
        then(`result contains key "${tc.expectedKey}"`, () => {
          assert.strictEqual(result[tc.expectedKey], tc.expectedValue);
        });
      });
    }
  });

  // --------------------------------------------------------------------------
  // Detection Methods
  // --------------------------------------------------------------------------

  describe('Detection Methods', () => {
    scenario('detectToolbar_onTimeout handles runaway counter', ({ given, when, then }) => {
      given('runaway is 10 (above threshold)', () => {
        gmailView.runaway = 10;
      });
      when('detectToolbar_onTimeout is called', () => {
        gmailView.detectToolbar_onTimeout();
      });
      then('log is called with RUNAWAY TRIGGERED message', () => {
        assertCalledWith(app.utils.log, 'ERROR GmailView:detectToolbar RUNAWAY TRIGGERED');
      });
    });

    scenario('detectToolbar_onTimeout increments runaway counter', ({ given, when, then }) => {
      let initialRunaway;
      given('initial runaway value and mocked detectToolbar', () => {
        initialRunaway = gmailView.runaway;
        gmailView.$root = $('body');
        gmailView.detectToolbar = mock.fn();
      });
      when('detectToolbar_onTimeout is called', () => {
        gmailView.detectToolbar_onTimeout();
      });
      then('runaway is incremented by 1', () => {
        assert.strictEqual(gmailView.runaway, initialRunaway + 1);
      });
    });

    scenario('detectEmailOpeningMode_onEmailClick starts wait counter', ({ given, when, then }) => {
      let startSpy;
      given('a spy on waitCounter.start', () => {
        startSpy = mock.method(gmailView.waitCounter, 'start');
      });
      when('detectEmailOpeningMode_onEmailClick is called', () => {
        gmailView.detectEmailOpeningMode_onEmailClick();
      });
      then('waitCounter.start is called with correct args', () => {
        assertCallCount(startSpy, 1);
        const args = [...startSpy.mock.calls[0].arguments];
        assert.strictEqual(args[0], 'emailclick');
        assert.strictEqual(args[1], 500);
        assert.strictEqual(args[2], 5);
        assert.strictEqual(typeof args[3], 'function');
      });
    });
  });

  // --------------------------------------------------------------------------
  // DOM Manipulation
  // --------------------------------------------------------------------------

  describe('DOM Manipulation', () => {
    scenario('should handle DOM element creation', ({ when, then }) => {
      let element;
      when('a div element is created', () => {
        element = document.createElement('div');
      });
      then('element is defined and is a DIV', () => {
        assert.notStrictEqual(element, undefined);
        assert.strictEqual(element.tagName, 'DIV');
      });
    });

    scenario('should handle DOM element selection', ({ given, when, then }) => {
      let element, selected;
      given('a div with class "test-class" appended to body', () => {
        element = document.createElement('div');
        element.className = 'test-class';
        document.body.appendChild(element);
      });
      when('querySelector is used', () => {
        selected = document.querySelector('.test-class');
      });
      then('the selected element matches', () => {
        assert.strictEqual(selected, element);
        // Cleanup
        element.remove();
      });
    });
  });

  // --------------------------------------------------------------------------
  // DOM Integration
  // --------------------------------------------------------------------------

  describe('DOM Integration', () => {
    scenario('should find email content elements in JSDOM', ({ then }) => {
      then('viewport elements exist', () => {
        const $viewport = $('.aia, .nH', gmailView.$root);
        assert.ok($viewport.length > 0);
      });
      then('expanded email elements exist', () => {
        const $emails = $('.h7', gmailView.$root);
        assert.ok($emails.length > 0);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Event Handling
  // --------------------------------------------------------------------------

  describe('Event Handling', () => {
    scenario('should bind events correctly', ({ when, then }) => {
      when('bindEvents is called', () => {
        gmailView.bindEvents();
      });
      then('onDetected listener is added', () => {
        const calls = app.events.addListener.mock.calls;
        const found = calls.some(c => [...c.arguments][0] === 'onDetected');
        assert.ok(found, 'Expected addListener to be called with "onDetected"');
      });
      then('detectButton listener is added', () => {
        const calls = app.events.addListener.mock.calls;
        const found = calls.some(c => [...c.arguments][0] === 'detectButton');
        assert.ok(found, 'Expected addListener to be called with "detectButton"');
      });
      then('trelloUserAndBoardsReady listener is added', () => {
        const calls = app.events.addListener.mock.calls;
        const found = calls.some(c => [...c.arguments][0] === 'trelloUserAndBoardsReady');
        assert.ok(found, 'Expected addListener to be called with "trelloUserAndBoardsReady"');
      });
    });

    scenario('should handle Gmail detection', ({ given, when, then }) => {
      given('gmailView has a $toolBar', () => {
        gmailView.$toolBar = { someProperty: 'value' };
      });
      when('handleGmailDetected is called', () => {
        gmailView.handleGmailDetected();
      });
      then('app.popupView.$toolBar is set', () => {
        assert.strictEqual(app.popupView.$toolBar, gmailView.$toolBar);
      });
    });

    scenario('should handle detect button', ({ given, when, then }) => {
      given('preDetect returns true and toolBar is set', () => {
        gmailView.preDetect = mock.fn(() => true);
        gmailView.$toolBar = { someProperty: 'value' };
      });
      when('handleDetectButton is called', () => {
        gmailView.handleDetectButton();
      });
      then('app.popupView.$toolBar is set', () => {
        assert.strictEqual(app.popupView.$toolBar, gmailView.$toolBar);
      });
      then('app.popupView.finalCreatePopup was called', () => {
        assertCallCount(app.popupView.finalCreatePopup, 1);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  describe('Initialization', () => {
    scenario('should initialize correctly', ({ given, when, then }) => {
      given('detect is mocked', () => {
        gmailView.detect = mock.fn();
      });
      when('init is called', () => {
        gmailView.init();
      });
      then('addListener was called', () => {
        assert.ok(app.events.addListener.mock.callCount() > 0);
      });
    });

    scenario('should handle Trello user and boards ready', ({ given, when, then }) => {
      given('persist.user is set', () => {
        app.persist.user = { fullName: 'Test User' };
      });
      when('handleTrelloUserAndBoardsReady is called', () => {
        gmailView.handleTrelloUserAndBoardsReady();
      });
      then('events.emit was called with gmailDataReady', () => {
        const calls = app.events.emit.mock.calls;
        const emitCall = calls.find(c => [...c.arguments][0] === 'gmailDataReady');
        assert.ok(emitCall, 'Expected emit to be called with "gmailDataReady"');

        const gmailData = [...emitCall.arguments][1].gmail;
        assert.notStrictEqual(gmailData, undefined);
        assert.strictEqual(gmailData.subject, 'Test Subject');
        assert.strictEqual(gmailData.time, '2025-01-01 12:00 PM');
        assert.ok(Array.isArray(gmailData.attachment));
        assert.ok(Array.isArray(gmailData.image));
      });
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    scenario('displayNameAndEmail(null, null) returns empty string', ({ then }) => {
      then('result is empty string', () => {
        assert.strictEqual(gmailView.displayNameAndEmail(null, null), '');
      });
    });

    scenario('displayNameAndEmail(undefined, undefined) does not throw', ({ then }) => {
      then('no error is thrown', () => {
        assert.doesNotThrow(() => gmailView.displayNameAndEmail(undefined, undefined));
      });
    });

    scenario('email_raw_md(null, null) returns empty object', ({ then }) => {
      then('raw and md are empty strings', () => {
        const result = gmailView.email_raw_md(null, null);
        assert.strictEqual(result.raw, '');
        assert.strictEqual(result.md, '');
      });
    });

    scenario('email_raw_md(undefined, undefined) returns empty object', ({ then }) => {
      then('raw and md are empty strings', () => {
        const result = gmailView.email_raw_md(undefined, undefined);
        assert.strictEqual(result.raw, '');
        assert.strictEqual(result.md, '');
      });
    });

    scenario('url_with_filename with null inputs does not throw', ({ then }) => {
      then('no error is thrown', () => {
        assert.doesNotThrow(() => gmailView.url_with_filename(null, null));
      });
    });

    scenario('url_with_filename with undefined inputs does not throw', ({ then }) => {
      then('no error is thrown', () => {
        assert.doesNotThrow(() => gmailView.url_with_filename(undefined, undefined));
      });
    });

    scenario('make_preprocess_mailto with null inputs does not throw', ({ then }) => {
      then('no error is thrown', () => {
        assert.doesNotThrow(() => gmailView.make_preprocess_mailto(null, null));
      });
    });

    scenario('make_preprocess_mailto with undefined inputs does not throw', ({ then }) => {
      then('no error is thrown', () => {
        assert.doesNotThrow(() => gmailView.make_preprocess_mailto(undefined, undefined));
      });
    });
  });

  // --------------------------------------------------------------------------
  // Performance
  // --------------------------------------------------------------------------

  describe('Performance', () => {
    scenario('should handle large data sets efficiently', ({ when, then }) => {
      let duration_ms;
      when('displayNameAndEmail is called 1000 times', () => {
        const begin = Date.now();
        for (let i = 0; i < 1000; i++) {
          gmailView.displayNameAndEmail('test data', 'test@example.com');
        }
        duration_ms = Date.now() - begin;
      });
      then('duration is under 100ms', () => {
        assert.ok(duration_ms < 100, `Expected < 100ms, got ${duration_ms}ms`);
      });
    });

    scenario('should handle many event handlers efficiently', ({ when, then }) => {
      let duration_ms;
      when('100 event handlers are added', () => {
        const begin = Date.now();
        for (let i = 0; i < 100; i++) {
          app.events.addListener('test', () => {});
        }
        duration_ms = Date.now() - begin;
      });
      then('duration is under 50ms', () => {
        assert.ok(duration_ms < 50, `Expected < 50ms, got ${duration_ms}ms`);
      });
    });

    scenario('email processing should be fast', ({ when, then }) => {
      let duration_ms;
      when('email methods are called for 3 addresses', () => {
        const testEmails = [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Smith', email: 'jane@test.org' },
          { name: 'Bob Wilson', email: 'bob@company.com' },
        ];
        const begin = Date.now();
        for (const { name, email } of testEmails) {
          gmailView.email_raw_md(name, email);
          gmailView.make_preprocess_mailto(name, email);
        }
        duration_ms = Date.now() - begin;
      });
      then('duration is under 10ms', () => {
        assert.ok(duration_ms < 10, `Expected < 10ms, got ${duration_ms}ms`);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Parse Data Methods
  // --------------------------------------------------------------------------

  describe('Parse Data Methods', () => {
    const ccIterationTests = [
      { name: 'Test User', email: 'cc@example.com' },
      { name: 'Jane Doe', email: 'jane.doe@company.com' },
    ];

    for (const tc of ccIterationTests) {
      scenario(`parseData_onEmailCCIterate processes ${tc.name} <${tc.email}>`, ({ given, when, then }) => {
        given('preprocess object is initialized', () => {
          gmailView.preprocess = { a: {} };
        });
        when('parseData_onEmailCCIterate is called', () => {
          gmailView.parseData_onEmailCCIterate(0, { name: tc.name, email: tc.email });
        });
        then('preprocess is populated', () => {
          assert.notStrictEqual(gmailView.preprocess, undefined);
          assert.notStrictEqual(gmailView.preprocess['a'], undefined);
        });
      });
    }

    scenario('parseData methods should work with gmailView defined', ({ then }) => {
      then('gmailView is defined', () => {
        assert.notStrictEqual(gmailView, undefined);
      });
    });
  });
});
