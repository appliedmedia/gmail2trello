/**
 * Utils class tests -- node:test + Given/When/Then
 *
 * Equivalent to: tests/test_class_utils.js (Jest)
 * Run with: node --test tests/v2/test_class_utils.js
 */

const {
  G2T, describe, beforeEach, mock, assert,
  loadSourceFile, scenario, assertDeepEqual,
  window, document,
} = require('./test_utils');

// ---------------------------------------------------------------------------
// Helper: create a jQuery element with properties merged (replaces _ts.e())
// ---------------------------------------------------------------------------

function e(elementInput) {
  const commonElementFields = {
    length: 1,
    features: true,
    duration_max_ms: 300,
  };
  const merged = { ...commonElementFields, ...elementInput };
  const div = window.$('<div></div>');
  const htmlContent = merged.html || '';
  div.html(htmlContent);
  const { html, ...fields } = merged;
  void html;
  Object.assign(div, fields);
  return div;
}

// ---------------------------------------------------------------------------
// Markdownify test data
// ---------------------------------------------------------------------------

const markdownifyTests = {
  a: e({
    html: '<a href="https://example.com">Example</a>',
    expected: '[Example](<https://example.com>)',
  }),
  a_long: e({
    html: '<p>Visit <a href="https://example.com">This is a very long link text that should be converted</a></p>',
    expected: 'Visit [This is a very long link text that should be converted](<https://example.com>)',
  }),
  a_multiple: e({
    html: '<p><a href="https://example.com">First</a> and <a href="https://test.com">Second</a></p>',
    expected: '[First](<https://example.com>) and [Second](<https://test.com>)',
  }),
  a_same: e({
    html: '<p>Visit <a href="https://example.com">https://example.com</a></p>',
    expected: 'Visit <https://example.com>',
  }),
  a_short: e({
    html: '<p>Visit <a href="https://example.com">Hi</a> for more info</p>',
    expected: 'Visit Hi for more info',
  }),
  a_title: e({
    html: '<p>Visit <a href="https://example.com" title="Example Site">Example</a></p>',
    expected: 'Visit [Example](<https://example.com>)',
  }),
  b: e({
    html: '<p>This is <b>bold</b> text</p>',
    expected: 'This is **bold** text',
  }),
  br: e({
    html: '<p>Line 1<br>Line 2</p>',
    expected: 'Line 1\nLine 2',
  }),
  br_attr: e({
    html: '<p>Line 1<br class="test">Line 2</p>',
    expected: 'Line 1\nLine 2',
  }),
  bullet: e({
    html: '<p>• Item 1<br>• Item 2<br>• Item 3</p>',
    expected: '• Item 1\n• Item 2\n• Item 3',
  }),
  bullet_chars: e({
    html: '<p>• First item<br>• Second item</p>',
    expected: '• First item\n• Second item',
  }),
  del: e({
    html: '<p>This is <del>deleted</del> text</p>',
    expected: 'This is ~~deleted~~ text',
  }),
  div2: e({
    html: '<div>First div</div><div>Second div</div>',
    expected: 'First div\n\nSecond div',
  }),
  em: e({
    html: '<em>italic</em>',
    expected: '*italic*',
  }),
  em_text: e({
    html: '<p>This is <em>italic</em> text</p>',
    expected: 'This is *italic* text',
  }),
  email_content: e({
    html: "<div><h1>Meeting Summary</h1><p>Hello team,</p><p>Here's what we discussed:</p><ul><li>• Project timeline</li><li>• Budget concerns</li></ul><p>Best regards,<br>John</p></div>",
    expected: "# Meeting Summary\n\nHello team,\n\nHere's what we discussed:\n\n• Project timeline• Budget concerns\n\nBest regards,\nJohn",
  }),
  empty_content: e({
    html: '<div><p></p><p>Content</p></div>',
    expected: 'Content',
  }),
  empty_input: e({
    html: '',
    expected: '',
  }),
  h1: e({ html: '<h1>h1 title</h1>', expected: '# h1 title' }),
  h2: e({ html: '<h2>h2 title</h2>', expected: '## h2 title' }),
  h3: e({ html: '<h3>h3 title</h3>', expected: '### h3 title' }),
  h4: e({ html: '<h4>h4 title</h4>', expected: '#### h4 title' }),
  h5: e({ html: '<h5>h5 title</h5>', expected: '##### h5 title' }),
  h6: e({ html: '<h6>h6 title</h6>', expected: '###### h6 title' }),
  headers_spacing: e({
    html: '<h1>Title</h1><p>Content</p><h2>Subtitle</h2>',
    expected: '# Title\n\nContent\n\n## Subtitle',
  }),
  hr: e({
    html: '<p>Text before</p><hr><p>Text after</p>',
    expected: 'Text before\n\n---\n\nText after',
  }),
  hr2: e({
    html: '<p>Before</p>----<p>After</p>',
    expected: 'Before\n\n---\n\nAfter',
  }),
  html_entities: e({
    html: '<p>This &amp; that &lt; &gt; &quot; &#39;</p>',
    expected: 'This & that < > " \'',
  }),
  i: e({
    html: '<p>This is <i>italic</i> text</p>',
    expected: 'This is *italic* text',
  }),
  linebreaks: e({
    html: '<p>First line</p>\n\n\n<p>Second line</p>',
    expected: 'First line\n\nSecond line',
  }),
  long_text: e({
    html: 'A'.repeat(10000),
    duration_max_ms: 1000,
    expected: 'A'.repeat(10000),
  }),
  mailto: e({
    html: '<p>Contact <a href="mailto:test@example.com">us</a></p>',
    expected: 'Contact us',
  }),
  malformed_html: e({
    html: '<p>Unclosed tag<strong>Bold text<p>Another paragraph',
    expected: 'Unclosed tagBold text\n\n**Another paragraph**',
  }),
  nested_html: e({
    html: '<div><p>Outer <strong>bold <em>italic</em></strong> text</p></div>',
    expected: 'Outer **bold italic** text',
  }),
  numeric_entities: e({
    html: '<p>Copyright &#169; 2023</p>',
    expected: 'Copyright \u00A9 2023',
  }),
  p: e({ html: '<p>Paragraph content</p>', expected: 'Paragraph content' }),
  p2: e({
    html: '<p>First paragraph</p><p>Second paragraph</p>',
    expected: 'First paragraph\n\nSecond paragraph',
  }),
  s: e({
    html: '<p>This is <s>strikethrough</s> text</p>',
    expected: 'This is ~~strikethrough~~ text',
  }),
  spaces: e({
    html: '<p>This    has    multiple    spaces</p>',
    expected: 'This has multiple spaces',
  }),
  space_normalize: e({
    html: '<p>Text   with   multiple   spaces</p>',
    expected: 'Text with multiple spaces',
  }),
  special_chars: e({
    html: '<p>Special chars: &copy; &trade; &reg; &euro; &pound;</p>',
    expected: 'Special chars: \u00A9 \u2122 \u00AE \u20AC \u00A3',
  }),
  strike: e({
    html: '<p>This is <strike>strikethrough</strike> text</p>',
    expected: 'This is ~~strikethrough~~ text',
  }),
  strong: e({ html: '<strong>bold</strong>', expected: '**bold**' }),
  strong_em: e({
    html: '<p>This is <strong><em>bold italic</em></strong> text</p>',
    expected: 'This is *bold italic* text',
  }),
  strong_em_both: e({
    html: '<p>This is <strong>bold</strong> and <em>italic</em> text</p>',
    expected: 'This is **bold** and *italic* text',
  }),
  strong_off_italic_off: e({
    html: '<p>This is <strong>bold</strong> and <em>italic</em> text</p>',
    features: false,
    expected: 'This is bold and italic text',
  }),
  strong_off_italic_on: e({
    html: '<p>This is <strong>bold</strong> and <em>italic</em> text</p>',
    features: { strong: false, em: true },
    expected: 'This is bold and *italic* text',
  }),
  strong_simple: e({
    html: '<p>This is <strong>bold</strong> text</p>',
    expected: 'This is **bold** text',
  }),
  tabs_whitespace: e({
    html: '<p>Content\twith\ttabs\tand   spaces</p>',
    expected: 'Content with tabs and spaces',
  }),
  title_bold_italic_link: e({
    html: '<h1>Title</h1><p>This is <strong>bold</strong> and <em>italic</em> text with a <a href="https://example.com">link</a>.</p>',
    expected: '# Title\n\nThis is **bold** and *italic* text with a [link](<https://example.com>) .',
  }),
  trim: e({ html: '   <p>Content</p>   ', expected: 'Content' }),
  u: e({
    html: '<p>This is <u>underlined</u> text</p>',
    expected: 'This is __underlined__ text',
  }),
  whitespace_input: e({ html: '   \n\t   ', expected: '' }),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Utils Class', () => {
  let utils, app;

  beforeEach(() => {
    app = {
      utils: { log: mock.fn() },
      temp: {
        log: { count: 0, debugMode: false, max: 100, memory: [] },
      },
      persist: { storageHashes: {} },
      goog: {
        storageSyncGet: mock.fn(),
        storageSyncSet: mock.fn(),
      },
    };
    utils = new G2T.Utils({ app });
  });

  // --------------------------------------------------------------------------
  // Basic setup
  // --------------------------------------------------------------------------

  scenario('basic setup test', ({ then }) => {
    then('utils is defined', () => {
      assert.ok(utils !== undefined);
    });
    then('app is defined', () => {
      assert.ok(app !== undefined);
    });
  });

  scenario('simple $ test', ({ then }) => {
    let result;
    then('$ returns a defined result', () => {
      result = window.$('div');
      assert.ok(result !== undefined);
      assert.ok(result.length !== undefined);
    });
  });

  scenario('window $ availability test', ({ then }) => {
    then('window.$ is defined and is a function', () => {
      assert.ok(window.$ !== undefined);
      assert.strictEqual(typeof window.$, 'function');
    });
  });

  // --------------------------------------------------------------------------
  // Constructor and Initialization
  // --------------------------------------------------------------------------

  describe('Constructor and Initialization', () => {
    scenario('creating Utils instance with default settings', ({ then }) => {
      then('it is an instance of G2T.Utils', () => {
        assert.ok(utils instanceof G2T.Utils);
      });
      then('it stores the app reference', () => {
        assert.strictEqual(utils.app, app);
      });
    });

    scenario('creating Utils instance with debug enabled', ({ given, when, then }) => {
      let debugUtils;
      given('an app with debugMode true', () => {});
      when('Utils is constructed', () => {
        const debugApp = {
          ...app,
          temp: { ...app.temp, log: { ...app.temp.log, debugMode: true } },
        };
        debugUtils = new G2T.Utils({ app: debugApp });
      });
      then('debugMode is true on the app', () => {
        assert.strictEqual(debugUtils.app.temp.log.debugMode, true);
      });
    });

    scenario('constructor with no arguments throws', ({ then }) => {
      then('throws an error', () => {
        assert.throws(() => new G2T.Utils());
      });
    });
  });

  // --------------------------------------------------------------------------
  // Debug and Logging
  // --------------------------------------------------------------------------

  describe('Debug and Logging', () => {
    scenario('log outputs when debug is enabled', ({ given, when, then }) => {
      given('debugMode is true', () => {
        app.temp.log.debugMode = true;
      });
      when('log is called', () => {
        utils.log('Test message');
      });
      then('message is stored in memory', () => {
        assert.ok(app.temp.log.memory.length > 0);
      });
    });

    scenario('log stores to memory even when debug is disabled', ({ given, when, then }) => {
      given('debugMode is false', () => {
        app.temp.log.debugMode = false;
      });
      when('log is called', () => {
        utils.log('Test message');
      });
      then('message is still stored in memory', () => {
        assert.ok(app.temp.log.memory.length > 0);
      });
    });

    scenario('ck getter returns correct value', ({ then }) => {
      then('instance ck is defined', () => {
        assert.ok(utils.ck !== undefined);
      });
    });

    scenario('ck static getter returns correct value', ({ then }) => {
      then('static ck is defined', () => {
        assert.ok(G2T.Utils.ck !== undefined);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Chrome Storage Operations
  // --------------------------------------------------------------------------

  describe('Chrome Storage Operations', () => {
    scenario('loadFromChromeStorage calls goog.storageSyncGet', ({ given, when, then }) => {
      given('storageSyncGet returns a value', () => {
        app.goog.storageSyncGet.mock.mockImplementation((key, callback) => {
          callback({ testKey: JSON.stringify('testValue') });
        });
      });
      when('loadFromChromeStorage is called', () => {
        utils.loadFromChromeStorage('testKey');
      });
      then('storageSyncGet was called with the key and a function', () => {
        assert.ok(app.goog.storageSyncGet.mock.callCount() > 0);
        const callArgs = [...app.goog.storageSyncGet.mock.calls[0].arguments];
        assert.strictEqual(callArgs[0], 'testKey');
        assert.strictEqual(typeof callArgs[1], 'function');
      });
    });

    scenario('saveToChromeStorage calls goog.storageSyncSet', ({ when, then }) => {
      when('saveToChromeStorage is called', () => {
        utils.saveToChromeStorage('testKey', 'testValue');
      });
      then('storageSyncSet was called with the serialized data', () => {
        assert.ok(app.goog.storageSyncSet.mock.callCount() > 0);
        const callArgs = [...app.goog.storageSyncSet.mock.calls[0].arguments];
        assertDeepEqual(callArgs[0], { testKey: JSON.stringify('testValue') });
      });
    });

    scenario('loadFromChromeStorage handles missing keys', ({ given, when, then }) => {
      given('storageSyncGet returns empty object', () => {
        app.goog.storageSyncGet.mock.mockImplementation((key, callback) => {
          callback({});
        });
      });
      when('loadFromChromeStorage is called for nonexistent key', () => {
        utils.loadFromChromeStorage('nonexistentKey');
      });
      then('storageSyncGet was called', () => {
        assert.ok(app.goog.storageSyncGet.mock.callCount() > 0);
        const callArgs = [...app.goog.storageSyncGet.mock.calls[0].arguments];
        assert.strictEqual(callArgs[0], 'nonexistentKey');
        assert.strictEqual(typeof callArgs[1], 'function');
      });
    });
  });

  // --------------------------------------------------------------------------
  // String Manipulation
  // --------------------------------------------------------------------------

  describe('String Manipulation', () => {
    const escapeRegExpTests = {
      test: 'test',
      'test*test': 'test\\*test',
      'test.test': 'test\\.test',
      'test+test': 'test\\+test',
      'test?test': 'test\\?test',
      'test^test': 'test\\^test',
      test$test: 'test\\$test',
      'test|test': 'test\\|test',
      'test(test': 'test\\(test',
      'test)test': 'test\\)test',
      'test[test': 'test\\[test',
      'test]test': 'test\\]test',
      'test{test': 'test\\{test',
      'test}test': 'test\\}test',
    };

    Object.entries(escapeRegExpTests).forEach(([input, expected]) => {
      scenario(`escapeRegExp "${input}" produces "${expected}"`, ({ when, then }) => {
        let result;
        when('escapeRegExp is called', () => {
          result = utils.escapeRegExp(input);
        });
        then('it returns the expected value', () => {
          assert.strictEqual(result, expected);
        });
      });
    });

    const replacerTests = [
      { text: 'Hello %name%, welcome to %place%', dict: { name: 'John', place: 'Trello' }, expected: 'Hello John, welcome to Trello' },
      { text: 'Hello %name%', dict: {}, expected: 'Hello %name%' },
      { text: null, dict: {}, expected: null },
      { text: undefined, dict: {}, expected: '' },
    ];

    replacerTests.forEach(({ text, dict, expected }) => {
      scenario(`replacer "${text}" + ${JSON.stringify(dict)} produces "${expected}"`, ({ when, then }) => {
        let result;
        when('replacer is called', () => {
          result = utils.replacer(text, dict);
        });
        then('it returns the expected value', () => {
          assert.strictEqual(result, expected);
        });
      });
    });
  });

  // --------------------------------------------------------------------------
  // URI and URL Handling
  // --------------------------------------------------------------------------

  describe('URI and URL Handling', () => {
    const uriForDisplayTests = {
      'https://example.com': 'https://example.com',
      'http://example.com': 'http://example.com',
      'ftp://example.com': 'ftp://example.com',
      'mailto:test@example.com': 'mailto:test@example.com',
      'tel:+1234567890': 'tel:+1234567890',
      '': '',
      'not-a-uri': 'not-a-uri',
    };

    Object.entries(uriForDisplayTests).forEach(([input, expected]) => {
      scenario(`uriForDisplay "${input}" produces "${expected}"`, ({ when, then }) => {
        let result;
        when('uriForDisplay is called', () => {
          result = utils.uriForDisplay(input);
        });
        then('it returns the expected value', () => {
          assert.strictEqual(result, expected);
        });
      });
    });

    const urlAddVarTests = [
      { url: 'https://example.com', param: 'param=value', expected: 'https://example.com?param=value' },
      { url: 'https://example.com?existing=1', param: 'param=value', expected: 'https://example.com?existing=1&param=value' },
      { url: 'https://example.com', param: '', expected: 'https://example.com' },
      { url: '', param: 'param=value', expected: 'param=value' },
    ];

    urlAddVarTests.forEach(({ url, param, expected }) => {
      scenario(`url_add_var "${url}" + "${param}" produces "${expected}"`, ({ when, then }) => {
        let result;
        when('url_add_var is called', () => {
          result = utils.url_add_var(url, param);
        });
        then('it returns the expected value', () => {
          assert.strictEqual(result, expected);
        });
      });
    });
  });

  // --------------------------------------------------------------------------
  // Hash and Data Processing
  // --------------------------------------------------------------------------

  describe('Hash and Data Processing', () => {
    const djb2HashTests = {
      '': 5381,
      a: 177670,
      test: 2090756197,
      hello: 261238937,
      world: 279393645,
      test1: 275477814,
      test2: 275477815,
    };

    Object.entries(djb2HashTests).forEach(([input, expected]) => {
      scenario(`djb2Hash "${input}" produces ${expected}`, ({ when, then }) => {
        let result;
        when('djb2Hash is called', () => {
          result = utils.djb2Hash(input);
        });
        then('it returns the expected number', () => {
          assert.strictEqual(result, expected);
          assert.strictEqual(typeof result, 'number');
        });
      });
    });

    const excludeFieldsTests = [
      { obj: { a: 1, b: 2, c: 3, d: 4 }, fieldsToExclude: ['b', 'd'], expected: { a: 1, c: 3 } },
      { obj: {}, fieldsToExclude: ['field1'], expected: {} },
      { obj: { x: 1, y: 2, z: 3 }, fieldsToExclude: [], expected: { x: 1, y: 2, z: 3 } },
      { obj: { only: 'field' }, fieldsToExclude: ['only'], expected: {} },
    ];

    excludeFieldsTests.forEach(({ obj, fieldsToExclude, expected }) => {
      scenario(`excludeFields ${JSON.stringify(obj)} - [${fieldsToExclude.join(',')}]`, ({ when, then }) => {
        let result;
        when('excludeFields is called', () => {
          result = utils.excludeFields(obj, fieldsToExclude);
        });
        then('it returns the expected object', () => {
          assertDeepEqual(result, expected);
        });
      });
    });

    scenario('excludeFields handles null/undefined object', ({ then }) => {
      then('null throws', () => {
        assert.throws(() => utils.excludeFields(null, []));
      });
      then('undefined throws', () => {
        assert.throws(() => utils.excludeFields(undefined, []));
      });
    });
  });

  // --------------------------------------------------------------------------
  // Email Processing
  // --------------------------------------------------------------------------

  describe('Email Processing', () => {
    const splitEmailDomainTests = {
      'test@example.com': { name: 'test', domain: 'example.com' },
      '': { name: '', domain: '' },
      testemail: { name: 'testemail', domain: '' },
      'test@example@domain.com': { name: 'test', domain: 'example' },
      'user@domain.co.uk': { name: 'user', domain: 'domain.co.uk' },
      '@domain.com': { name: '', domain: 'domain.com' },
      'user@': { name: 'user', domain: '' },
    };

    Object.entries(splitEmailDomainTests).forEach(([input, expected]) => {
      scenario(`splitEmailDomain "${input}" produces ${JSON.stringify(expected)}`, ({ when, then }) => {
        let result;
        when('splitEmailDomain is called', () => {
          result = utils.splitEmailDomain(input);
        });
        then('it returns the expected object', () => {
          assertDeepEqual(result, expected);
        });
      });
    });
  });

  // --------------------------------------------------------------------------
  // String Formatting
  // --------------------------------------------------------------------------

  describe('String Formatting', () => {
    const addCharTests = [
      { front: 'front', back: 'back', char: '-', expected: 'front-back' },
      { front: 'front', back: '', char: '-', expected: 'front-' },
      { front: '', back: 'back', char: '-', expected: '-back' },
      { front: '', back: '', char: '-', expected: '' },
      { front: 'hello', back: 'world', char: '_', expected: 'hello_world' },
      { front: 'test', back: 'case', char: '|', expected: 'test|case' },
    ];

    addCharTests.forEach(({ front, back, char, expected }) => {
      scenario(`addChar "${front}" + "${back}" + "${char}" produces "${expected}"`, ({ when, then }) => {
        let result;
        when('addChar is called', () => { result = utils.addChar(front, back, char); });
        then('it returns the expected value', () => { assert.strictEqual(result, expected); });
      });
    });

    const addSpaceTests = {
      'front,back': 'front back',
      'front,': 'front ',
      ',back': ' back',
      ',': '',
      'hello,world': 'hello world',
      'test,': 'test ',
    };

    Object.entries(addSpaceTests).forEach(([input, expected]) => {
      const [front, back] = input.split(',');
      scenario(`addSpace "${front}" + "${back}" produces "${expected}"`, ({ when, then }) => {
        let result;
        when('addSpace is called', () => { result = utils.addSpace(front, back); });
        then('it returns the expected value', () => { assert.strictEqual(result, expected); });
      });
    });

    const addCRLFTests = {
      'front,back': 'front\nback',
      'front,': 'front\n',
      ',back': '\nback',
      ',': '',
      'line1,line2': 'line1\nline2',
      'single,': 'single\n',
    };

    Object.entries(addCRLFTests).forEach(([input, expected]) => {
      const [front, back] = input.split(',');
      scenario(`addCRLF "${front}" + "${back}" produces expected`, ({ when, then }) => {
        let result;
        when('addCRLF is called', () => { result = utils.addCRLF(front, back); });
        then('it returns the expected value', () => { assert.strictEqual(result, expected); });
      });
    });
  });

  // --------------------------------------------------------------------------
  // Text Processing
  // --------------------------------------------------------------------------

  describe('Text Processing', () => {
    const truncateTests = [
      { text: 'Hello World', length: 5, suffix: undefined, expected: 'Hello' },
      { text: 'Hello World', length: 5, suffix: '***', expected: 'He***' },
      { text: 'Hello', length: 10, suffix: undefined, expected: 'Hello' },
      { text: 'Testing truncate', length: 7, suffix: '...', expected: 'Test...' },
      { text: '', length: 5, suffix: undefined, expected: '' },
      { text: 'Short', length: 20, suffix: undefined, expected: 'Short' },
    ];

    truncateTests.forEach(({ text, length, suffix, expected }) => {
      const suffixDesc = suffix ? `, "${suffix}"` : '';
      scenario(`truncate "${text}", ${length}${suffixDesc} produces "${expected}"`, ({ when, then }) => {
        let result;
        when('truncate is called', () => { result = utils.truncate(text, length, suffix); });
        then('it returns the expected value', () => { assert.strictEqual(result, expected); });
      });
    });

    const midTruncateTests = [
      { text: 'Hello World', length: 8, suffix: undefined, expected: 'Helloorld' },
      { text: 'Hello World', length: 8, suffix: '***', expected: 'Hel***ld' },
      { text: 'Hello', length: 10, suffix: undefined, expected: 'Hello' },
      { text: 'VeryLongStringToTruncate', length: 12, suffix: '...', expected: 'VeryL...cate' },
      { text: '', length: 5, suffix: undefined, expected: '' },
    ];

    midTruncateTests.forEach(({ text, length, suffix, expected }) => {
      const suffixDesc = suffix ? `, "${suffix}"` : '';
      scenario(`midTruncate "${text}", ${length}${suffixDesc} produces "${expected}"`, ({ when, then }) => {
        let result;
        when('midTruncate is called', () => { result = utils.midTruncate(text, length, suffix); });
        then('it returns the expected value', () => { assert.strictEqual(result, expected); });
      });
    });

    const bookendTests = [
      { char: '*', text: 'Hello', style: 'bold', expected: '<* style="bold">Hello</*>' },
      { char: '`', text: 'code', style: 'code', expected: '<` style="code">code</`>' },
      { char: '_', text: 'underline', style: 'italic', expected: '<_ style="italic">underline</_>' },
      { char: '#', text: 'heading', style: 'header', expected: '<# style="header">heading</#>' },
    ];

    bookendTests.forEach(({ char, text, style, expected }) => {
      scenario(`bookend "${char}", "${text}", "${style}" produces "${expected}"`, ({ when, then }) => {
        let result;
        when('bookend is called', () => { result = utils.bookend(char, text, style); });
        then('it returns the expected value', () => { assert.strictEqual(result, expected); });
      });
    });
  });

  // --------------------------------------------------------------------------
  // HTML Entity Processing
  // --------------------------------------------------------------------------

  describe('HTML Entity Processing', () => {
    const encodeEntitiesTests = {
      '& < > " \'': '',
      'Hello & World': '',
      '<script>': '',
      '"quoted"': '',
      "'single'": '',
      'No entities here': '',
      '': '',
    };

    Object.entries(encodeEntitiesTests).forEach(([input, expected]) => {
      scenario(`encodeEntities "${input}" produces "${expected}"`, ({ when, then }) => {
        let result;
        when('encodeEntities is called', () => { result = utils.encodeEntities(input); });
        then('it returns the expected value', () => { assert.strictEqual(result, expected); });
      });
    });

    const decodeEntitiesTests = {
      '&amp; &lt; &gt; &quot; &#39;': '& < > " \'',
      '&unknown;': '&unknown;',
      '': '',
      'Hello &amp; World': 'Hello & World',
      '&lt;script&gt;': '<script>',
      '&quot;quoted&quot;': '"quoted"',
      '&#39;single&#39;': "'single'",
      'No entities here': 'No entities here',
      '&copy; &nbsp; &trade;': '\u00A9 \u00A0 \u2122',
    };

    Object.entries(decodeEntitiesTests).forEach(([input, expected]) => {
      scenario(`decodeEntities "${input}" produces expected`, ({ when, then }) => {
        let result;
        when('decodeEntities is called', () => { result = utils.decodeEntities(input); });
        then('it returns the expected value', () => { assert.strictEqual(result, expected); });
      });
    });
  });

  // --------------------------------------------------------------------------
  // Event Handling
  // --------------------------------------------------------------------------

  describe('Event Handling', () => {
    const modKeyTests = [
      { event: { ctrlKey: true, metaKey: false, shiftKey: false, altKey: false }, expected: 'ctrl-right', description: 'ctrl key' },
      { event: { ctrlKey: false, metaKey: true, shiftKey: false, altKey: false }, expected: 'metakey-windows', description: 'meta/cmd key' },
      { event: { ctrlKey: false, metaKey: false, shiftKey: true, altKey: false }, expected: 'shift-right', description: 'shift key' },
      { event: { ctrlKey: false, metaKey: false, shiftKey: false, altKey: true }, expected: 'alt-right', description: 'alt key' },
      { event: { ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }, expected: '', description: 'no modifiers' },
      { event: { ctrlKey: true, metaKey: true, shiftKey: false, altKey: false }, expected: 'ctrl-right', description: 'multiple modifiers (ctrl+meta)' },
    ];

    modKeyTests.forEach(({ event, expected, description }) => {
      scenario(`modKey ${description} produces "${expected}"`, ({ when, then }) => {
        let result;
        when('modKey is called', () => { result = utils.modKey(event); });
        then('it returns the expected value', () => { assert.strictEqual(result, expected); });
      });
    });
  });

  // --------------------------------------------------------------------------
  // Avatar URL Generation
  // --------------------------------------------------------------------------

  describe('Avatar URL Generation', () => {
    const makeAvatarUrlTests = [
      { args: { avatarUrl: 'https://example.com/avatar' }, expected: 'https://example.com/avatar/30.png' },
      { args: { avatarUrl: 'https://trello.com/user' }, expected: 'https://trello.com/user/30.png' },
      { args: { avatarUrl: '' }, expected: '' },
    ];

    makeAvatarUrlTests.forEach(({ args, expected }) => {
      scenario(`makeAvatarUrl "${args.avatarUrl}" produces "${expected}"`, ({ when, then }) => {
        let result;
        when('makeAvatarUrl is called', () => { result = utils.makeAvatarUrl(args); });
        then('it returns the expected value', () => { assert.strictEqual(result, expected); });
      });
    });
  });

  // --------------------------------------------------------------------------
  // Lifecycle Methods
  // --------------------------------------------------------------------------

  describe('Lifecycle Methods', () => {
    scenario('bindEvents is callable', ({ then }) => {
      then('does not throw', () => {
        assert.doesNotThrow(() => utils.bindEvents());
      });
    });

    scenario('init is callable', ({ then }) => {
      then('does not throw', () => {
        assert.doesNotThrow(() => utils.init());
      });
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    const nullUndefinedTests = [
      { fn: 'escapeRegExp', args: [null], shouldThrow: false },
      { fn: 'escapeRegExp', args: [undefined], shouldThrow: false },
      { fn: 'replacer', args: [null, {}], shouldThrow: false },
      { fn: 'replacer', args: [undefined, {}], shouldThrow: false },
      { fn: 'truncate', args: [null, 5], shouldThrow: false },
      { fn: 'truncate', args: [undefined, 5], shouldThrow: false },
      { fn: 'midTruncate', args: [null, 5], shouldThrow: false },
      { fn: 'midTruncate', args: [undefined, 5], shouldThrow: false },
    ];

    nullUndefinedTests.forEach(({ fn, args, shouldThrow }) => {
      const argsDesc = args.map(a => a === null ? 'null' : a === undefined ? 'undefined' : JSON.stringify(a)).join(', ');
      scenario(`${fn}(${argsDesc}) ${shouldThrow ? 'throws' : 'does not throw'}`, ({ then }) => {
        then('behaves as expected', () => {
          if (shouldThrow) {
            assert.throws(() => utils[fn](...args));
          } else {
            assert.doesNotThrow(() => utils[fn](...args));
          }
        });
      });
    });

    describe('Edge Cases', () => {
      scenario('truncate empty string', ({ then }) => {
        then('returns empty string', () => { assert.strictEqual(utils.truncate('', 5), ''); });
      });
      scenario('midTruncate empty string', ({ then }) => {
        then('returns empty string', () => { assert.strictEqual(utils.midTruncate('', 5), ''); });
      });
      scenario('addChar all empty', ({ then }) => {
        then('returns empty string', () => { assert.strictEqual(utils.addChar('', '', ''), ''); });
      });
      scenario('addSpace all empty', ({ then }) => {
        then('returns empty string', () => { assert.strictEqual(utils.addSpace('', ''), ''); });
      });
      scenario('addCRLF all empty', ({ then }) => {
        then('returns empty string', () => { assert.strictEqual(utils.addCRLF('', ''), ''); });
      });
      scenario('uriForDisplay empty', ({ then }) => {
        then('returns empty string', () => { assert.strictEqual(utils.uriForDisplay(''), ''); });
      });
      scenario('djb2Hash empty', ({ then }) => {
        then('returns 5381', () => { assert.strictEqual(utils.djb2Hash(''), 5381); });
      });
      scenario('uriForDisplay null', ({ then }) => {
        then('returns empty string', () => { assert.strictEqual(utils.uriForDisplay(null), ''); });
      });
      scenario('uriForDisplay undefined', ({ then }) => {
        then('returns empty string', () => { assert.strictEqual(utils.uriForDisplay(undefined), ''); });
      });
    });
  });

  // --------------------------------------------------------------------------
  // Performance Tests
  // --------------------------------------------------------------------------

  describe('Performance Tests', () => {
    scenario('handles large strings efficiently', ({ when, then }) => {
      let result, duration_ms;
      when('escapeRegExp is called with a large string', () => {
        const largeString = markdownifyTests.long_text.html();
        const begin_ms = Date.now();
        result = utils.escapeRegExp(largeString);
        duration_ms = Date.now() - begin_ms;
      });
      then('result matches expected', () => {
        assert.strictEqual(result, markdownifyTests.long_text.expected);
      });
      then('completes within time limit', () => {
        assert.ok(duration_ms < markdownifyTests.long_text.duration_max_ms);
      });
    });

    scenario('handles large objects efficiently', ({ when, then }) => {
      let result, duration_ms;
      when('excludeFields is called with a large object', () => {
        const largeObj = {};
        for (let i = 0; i < 1000; i++) { largeObj[`key${i}`] = `value${i}`; }
        const startTime = Date.now();
        result = utils.excludeFields(largeObj, ['key1', 'key2']);
        duration_ms = Date.now() - startTime;
      });
      then('result is defined', () => {
        assert.ok(result !== undefined);
      });
      then('completes within 100ms', () => {
        assert.ok(duration_ms < 100);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Additional Utility Methods
  // --------------------------------------------------------------------------

  describe('Additional Utility Methods', () => {
    const anchorMarkdownifyTests = [
      { text: 'Link Text', href: 'https://example.com', expected: ' [Link Text](<https://example.com>) ' },
      { text: 'https://example.com', href: 'https://example.com', expected: ' <https://example.com> ' },
      { text: 'test@example.com', href: 'mailto:test@example.com', expected: ' <test@example.com> ' },
      { text: '', href: '', expected: '' },
      { text: 'GitHub', href: 'https://github.com', expected: ' [GitHub](<https://github.com>) ' },
    ];

    anchorMarkdownifyTests.forEach(({ text, href, expected }) => {
      scenario(`anchorMarkdownify "${text}", "${href}" produces "${expected}"`, ({ when, then }) => {
        let result;
        when('anchorMarkdownify is called', () => { result = utils.anchorMarkdownify(text, href); });
        then('it returns the expected value', () => { assert.strictEqual(result, expected); });
      });
    });

    const luminanceTests = {
      '#ffffff': 'inherit',
      '#000000': 'inherit',
      '#808080': 'inherit',
      '#404040': 'inherit',
      'rgb(255,255,255)': 'inherit',
      'rgb(0,0,0)': 'inherit',
      'invalid-color': 'inherit',
    };

    Object.entries(luminanceTests).forEach(([color, expected]) => {
      scenario(`luminance "${color}" produces "${expected}"`, ({ when, then }) => {
        let result;
        when('luminance is called', () => { result = utils.luminance(color); });
        then('it returns the expected value', () => { assert.strictEqual(result, expected); });
      });
    });

    const getSelectedTextTests = [
      {
        mockSelection: {
          toString: () => 'Selected text',
          rangeCount: 1,
          getRangeAt: () => ({ toString: () => 'Selected text' }),
        },
        expected: '',
        description: 'with selection',
      },
      {
        mockSelection: {
          toString: () => '',
          rangeCount: 0,
        },
        expected: '',
        description: 'no selection',
      },
    ];

    getSelectedTextTests.forEach(({ mockSelection, expected, description }) => {
      scenario(`getSelectedText ${description} produces "${expected}"`, ({ given, when, then }) => {
        let result;
        given('window.getSelection is mocked', () => {
          Object.defineProperty(window, 'getSelection', {
            value: () => mockSelection,
            writable: true,
            configurable: true,
          });
        });
        when('getSelectedText is called', () => {
          result = utils.getSelectedText();
        });
        then('it returns the expected value', () => {
          assert.strictEqual(result, expected);
        });
      });
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    scenario('handles complex markdownify operations', ({ then }) => {
      then('markdownify is a function', () => {
        assert.strictEqual(typeof utils.markdownify, 'function');
      });
      then('markdownify does not throw with a basic jQuery mock', () => {
        const $emailBody = { html: () => '<p>Test</p>', length: 1 };
        assert.doesNotThrow(() => utils.markdownify($emailBody, {}, {}));
      });
    });

    scenario('handles markdownify preprocessing', ({ when, then }) => {
      let result;
      when('markdownify is called with preprocess option', () => {
        const $emailBody = { html: () => '<p>Test</p>', length: 1 };
        result = utils.markdownify($emailBody, {}, { preprocess: true });
      });
      then('result is defined', () => {
        assert.ok(result !== undefined);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Markdownify
  // --------------------------------------------------------------------------

  describe('Markdownify', () => {
    Object.entries(markdownifyTests).forEach(([elementKey, element]) => {
      scenario(`Markdownify Test "${elementKey}"`, ({ when, then }) => {
        let result, duration_ms;
        when('markdownify is called', () => {
          const begin_ms = Date.now();
          result = utils.markdownify(element, element.features, {});
          duration_ms = Date.now() - begin_ms;
        });
        then('it returns the expected value', () => {
          assert.strictEqual(result, element.expected);
        });
        then('it completes within the time limit', () => {
          assert.ok(duration_ms < element.duration_max_ms);
        });
      });
    });

    describe('Edge cases and error handling', () => {
      scenario('handles null/undefined input gracefully', ({ then }) => {
        then('null does not throw', () => {
          assert.doesNotThrow(() => utils.markdownify(null, true, {}));
        });
        then('undefined does not throw', () => {
          assert.doesNotThrow(() => utils.markdownify(undefined, true, {}));
        });
      });
    });
  });
});
