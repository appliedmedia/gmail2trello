/**
 * Step definitions for Utils class tests.
 */

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const { sharedWindow, createMockFn } = require('../support/world');

// ---------------------------------------------------------------------------
// Helper: create a jQuery element with properties merged (matches v2 e())
// ---------------------------------------------------------------------------

function e(elementInput) {
  const commonElementFields = {
    length: 1,
    features: true,
    duration_max_ms: 300,
  };
  const merged = { ...commonElementFields, ...elementInput };
  const div = sharedWindow.$('<div></div>');
  const htmlContent = merged.html || '';
  div.html(htmlContent);
  const { html, ...fields } = merged;
  void html;
  Object.assign(div, fields);
  return div;
}

// ---------------------------------------------------------------------------
// Markdownify test data (must match v2 exactly)
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
// anchorMarkdownify expected values
// ---------------------------------------------------------------------------

const anchorMarkdownifyExpected = {
  'Link Text|https://example.com': ' [Link Text](<https://example.com>) ',
  'https://example.com|https://example.com': ' <https://example.com> ',
  'test@example.com|mailto:test@example.com': ' <test@example.com> ',
  '|': '',
  'GitHub|https://github.com': ' [GitHub](<https://github.com>) ',
};

// ---------------------------------------------------------------------------
// decodeEntities expected values
// ---------------------------------------------------------------------------

const decodeEntitiesExpected = {
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

// ---------------------------------------------------------------------------
// Basic Setup
// ---------------------------------------------------------------------------

Then('the instance is defined', function () {
  assert.ok(this.instance !== undefined);
});

Then('jQuery selector {string} returns a defined result', function (selector) {
  const result = sharedWindow.$(selector);
  assert.ok(result !== undefined);
  assert.ok(result.length !== undefined);
});

Then('window.$ is a function', function () {
  assert.ok(sharedWindow.$ !== undefined);
  assert.strictEqual(typeof sharedWindow.$, 'function');
});

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

Given('debugMode is set to true on the app', function () {
  this.app.temp.log.debugMode = true;
});

Given('debugMode is set to false on the app', function () {
  this.app.temp.log.debugMode = false;
});

When('a new Utils is created with that app', function () {
  this._debugUtils = new this.G2T.Utils({ app: this.app });
});

Then('debugMode is true on the new instance app', function () {
  assert.strictEqual(this._debugUtils.app.temp.log.debugMode, true);
});

When('Utils is constructed with no arguments', function () {
  try {
    new this.G2T.Utils();
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

// ---------------------------------------------------------------------------
// Debug and Logging
// ---------------------------------------------------------------------------

When('log is called with {string}', function (msg) {
  this.instance.log(msg);
});

Then('a message is stored in app memory', function () {
  assert.ok(this.app.temp.log.memory.length > 0);
});

Then('the instance ck is defined', function () {
  assert.ok(this.instance.ck !== undefined);
});

Then('the static ck of Utils is defined', function () {
  assert.ok(this.G2T.Utils.ck !== undefined);
});

// ---------------------------------------------------------------------------
// Chrome Storage Operations
// ---------------------------------------------------------------------------

Given('storageSyncGet returns a value for {string}', function (key) {
  this.app.goog.storageSyncGet = createMockFn((k, callback) => {
    callback({ [key]: JSON.stringify('testValue') });
  });
});

Given('storageSyncGet returns empty object', function () {
  this.app.goog.storageSyncGet = createMockFn((_k, callback) => {
    callback({});
  });
});

When('loadFromChromeStorage is called with {string}', function (key) {
  this.instance.loadFromChromeStorage(key);
});

Then('storageSyncGet was called with {string} and a function', function (key) {
  assert.ok(this.app.goog.storageSyncGet.mock.callCount() > 0);
  const callArgs = [...this.app.goog.storageSyncGet.mock.calls[0].arguments];
  assert.strictEqual(callArgs[0], key);
  assert.strictEqual(typeof callArgs[1], 'function');
});

When('saveToChromeStorage is called with {string} and {string}', function (key, value) {
  this.instance.saveToChromeStorage(key, value);
});

Then('storageSyncSet was called with serialized data for {string} and {string}', function (key, value) {
  assert.ok(this.app.goog.storageSyncSet.mock.callCount() > 0);
  const callArgs = [...this.app.goog.storageSyncSet.mock.calls[0].arguments];
  const expected = { [key]: JSON.stringify(value) };
  assert.strictEqual(JSON.stringify(callArgs[0]), JSON.stringify(expected));
});

// ---------------------------------------------------------------------------
// escapeRegExp
// ---------------------------------------------------------------------------

When('escapeRegExp is called with {string}', function (input) {
  this.result = this.instance.escapeRegExp(input);
});

// ---------------------------------------------------------------------------
// replacer
// ---------------------------------------------------------------------------

When('replacer is called with {string} and dict name=John,place=Trello', function (text) {
  this.result = this.instance.replacer(text, { name: 'John', place: 'Trello' });
});

When('replacer is called with {string} and empty dict', function (text) {
  this.result = this.instance.replacer(text, {});
});

When('replacer is called with null text and empty dict', function () {
  this.result = this.instance.replacer(null, {});
});

When('replacer is called with undefined text and empty dict', function () {
  this.result = this.instance.replacer(undefined, {});
});

// ---------------------------------------------------------------------------
// URI / URL
// ---------------------------------------------------------------------------

When('uriForDisplay is called with {string}', function (input) {
  this.result = this.instance.uriForDisplay(input);
});

When('uriForDisplay is called with null', function () {
  this.result = this.instance.uriForDisplay(null);
});

When('uriForDisplay is called with undefined', function () {
  this.result = this.instance.uriForDisplay(undefined);
});

When('url_add_var is called with {string} and {string}', function (url, param) {
  this.result = this.instance.url_add_var(url, param);
});

// ---------------------------------------------------------------------------
// djb2Hash
// ---------------------------------------------------------------------------

When('djb2Hash is called with {string}', function (input) {
  this.result = this.instance.djb2Hash(input);
});

// ---------------------------------------------------------------------------
// excludeFields
// ---------------------------------------------------------------------------

When('excludeFields is called to remove {string} from object with keys {word}', function (excludeStr, kvPairs) {
  // Parse kvPairs like "a=1,b=2,c=3,d=4"
  const obj = {};
  kvPairs.split(',').forEach(pair => {
    const [k, v] = pair.split('=');
    obj[k] = isNaN(v) ? v : Number(v);
  });
  const fieldsToExclude = excludeStr ? excludeStr.split(',').filter(Boolean) : [];
  this.result = this.instance.excludeFields(obj, fieldsToExclude);
});

When('excludeFields is called to remove {string} from empty object', function (excludeStr) {
  const fieldsToExclude = excludeStr ? excludeStr.split(',').filter(Boolean) : [];
  this.result = this.instance.excludeFields({}, fieldsToExclude);
});

Then('the excludeFields result has keys {string} with values {string}', function (keysStr, valuesStr) {
  const keys = keysStr.split(',');
  const values = valuesStr.split(',');
  assert.strictEqual(Object.keys(this.result).length, keys.length);
  keys.forEach((k, i) => {
    const expected = isNaN(values[i]) ? values[i] : Number(values[i]);
    assert.strictEqual(this.result[k], expected);
  });
});

Then('the excludeFields result is empty', function () {
  assert.strictEqual(Object.keys(this.result).length, 0);
});

Then('excludeFields with null throws', function () {
  assert.throws(() => this.instance.excludeFields(null, []));
});

Then('excludeFields with undefined throws', function () {
  assert.throws(() => this.instance.excludeFields(undefined, []));
});

// ---------------------------------------------------------------------------
// splitEmailDomain
// ---------------------------------------------------------------------------

When('splitEmailDomain is called with {string}', function (input) {
  this.result = this.instance.splitEmailDomain(input);
});

Then('the result name is {string} and domain is {string}', function (name, domain) {
  assert.strictEqual(this.result.name, name);
  assert.strictEqual(this.result.domain, domain);
});

// ---------------------------------------------------------------------------
// addChar / addSpace / addCRLF
// ---------------------------------------------------------------------------

When('addChar is called with {string} and {string} and {string}', function (front, back, char) {
  this.result = this.instance.addChar(front, back, char);
});

When('addSpace is called with {string} and {string}', function (front, back) {
  this.result = this.instance.addSpace(front, back);
});

When('addCRLF is called with {string} and {string}', function (front, back) {
  this.result = this.instance.addCRLF(front, back);
  this._addCRLF_front = front;
  this._addCRLF_back = back;
});

Then('the addSpace result for {string} and {string} is correct', function (front, back) {
  // addSpace returns front + ' ' + back, or '' if both empty
  let expected;
  if (front === '' && back === '') {
    expected = '';
  } else {
    expected = front + ' ' + back;
  }
  assert.strictEqual(this.result, expected);
});

Then('the addCRLF result for {string} and {string} is correct', function (front, back) {
  // Compute expected: front\nback, but empty if both empty
  let expected;
  if (front === '' && back === '') {
    expected = '';
  } else {
    expected = front + '\n' + back;
  }
  assert.strictEqual(this.result, expected);
});

// ---------------------------------------------------------------------------
// truncate / midTruncate
// ---------------------------------------------------------------------------

When('truncate is called with {string} and {int} and suffix {string}', function (text, length, suffix) {
  this.result = this.instance.truncate(text, length, suffix || undefined);
});

When('midTruncate is called with {string} and {int} and suffix {string}', function (text, length, suffix) {
  this.result = this.instance.midTruncate(text, length, suffix || undefined);
});

// ---------------------------------------------------------------------------
// bookend
// ---------------------------------------------------------------------------

When('bookend is called with {string} and {string} and {string}', function (char, text, style) {
  this.result = this.instance.bookend(char, text, style);
});

Then('the bookend result matches char {string} text {string} style {string}', function (char, text, style) {
  const expected = `<${char} style="${style}">${text}</${char}>`;
  assert.strictEqual(this.result, expected);
});

// ---------------------------------------------------------------------------
// encodeEntities / decodeEntities
// ---------------------------------------------------------------------------

When('encodeEntities is called with {string}', function (input) {
  this.result = this.instance.encodeEntities(input);
});

When('encodeEntities is called with special input {string}', function (key) {
  const specialInputs = {
    amp_angles_quotes: '& < > " \'',
    script_tag: '<script>',
    double_quoted: '"quoted"',
    single_quoted: "'single'",
  };
  this.result = this.instance.encodeEntities(specialInputs[key]);
});

When('decodeEntities is called with {string}', function (input) {
  this.result = this.instance.decodeEntities(input);
  this._decodeInput = input;
});

Then('the decodeEntities result for {string} is correct', function (input) {
  const expected = decodeEntitiesExpected[input];
  assert.strictEqual(this.result, expected,
    `decodeEntities("${input}") expected "${expected}", got "${this.result}"`);
});

// ---------------------------------------------------------------------------
// modKey
// ---------------------------------------------------------------------------

When('modKey is called with ctrl={word} meta={word} shift={word} alt={word}', function (ctrl, meta, shift, alt) {
  const event = {
    ctrlKey: ctrl === 'true',
    metaKey: meta === 'true',
    shiftKey: shift === 'true',
    altKey: alt === 'true',
  };
  this.result = this.instance.modKey(event);
});

// ---------------------------------------------------------------------------
// makeAvatarUrl
// ---------------------------------------------------------------------------

When('makeAvatarUrl is called with {string}', function (avatarUrl) {
  this.result = this.instance.makeAvatarUrl({ avatarUrl });
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

Then('calling bindEvents does not throw', function () {
  assert.doesNotThrow(() => this.instance.bindEvents());
});

Then('calling init does not throw', function () {
  assert.doesNotThrow(() => this.instance.init());
});

// ---------------------------------------------------------------------------
// Error handling - null/undefined inputs
// ---------------------------------------------------------------------------

Then('calling {word} with {word} does not throw', function (fn, argType) {
  const argMap = {
    null: null,
    undefined: undefined,
  };
  const arg = argMap[argType];

  // Some functions need additional args
  const extraArgs = {
    replacer: [{}],
    truncate: [5],
    midTruncate: [5],
    escapeRegExp: [],
  };

  const args = [arg, ...(extraArgs[fn] || [])];
  assert.doesNotThrow(() => this.instance[fn](...args));
});

// ---------------------------------------------------------------------------
// Generic result assertions
// ---------------------------------------------------------------------------

Then('the string result is {string}', function (expected) {
  assert.strictEqual(this.result, expected);
});

Then('the result is null', function () {
  assert.strictEqual(this.result, null);
});

Then('the numeric result is {int}', function (expected) {
  assert.strictEqual(this.result, expected);
  assert.strictEqual(typeof this.result, 'number');
});

Then('the result is defined', function () {
  assert.ok(this.result !== undefined);
});

// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------

When('escapeRegExp is called with a 10000-char string', function () {
  const largeString = 'A'.repeat(10000);
  this._perfStart = Date.now();
  this.result = this.instance.escapeRegExp(largeString);
  this._perfDuration = Date.now() - this._perfStart;
});

Then('the result is a 10000-char string', function () {
  assert.strictEqual(this.result, 'A'.repeat(10000));
});

Then('the utils operation completes within {int}ms', function (maxMs) {
  assert.ok(this._perfDuration < maxMs,
    `Expected completion within ${maxMs}ms, took ${this._perfDuration}ms`);
});

When('excludeFields is called with a 1000-key object excluding key1,key2', function () {
  const largeObj = {};
  for (let i = 0; i < 1000; i++) { largeObj[`key${i}`] = `value${i}`; }
  this._perfStart = Date.now();
  this.result = this.instance.excludeFields(largeObj, ['key1', 'key2']);
  this._perfDuration = Date.now() - this._perfStart;
});

// ---------------------------------------------------------------------------
// anchorMarkdownify
// ---------------------------------------------------------------------------

When('anchorMarkdownify is called with {string} and {string}', function (text, href) {
  this.result = this.instance.anchorMarkdownify(text, href);
  this._anchorKey = `${text}|${href}`;
});

Then('the anchorMarkdownify result for {string} and {string} is correct', function (text, href) {
  const key = `${text}|${href}`;
  const expected = anchorMarkdownifyExpected[key];
  assert.strictEqual(this.result, expected,
    `anchorMarkdownify("${text}", "${href}") expected "${expected}", got "${this.result}"`);
});

// ---------------------------------------------------------------------------
// luminance
// ---------------------------------------------------------------------------

When('luminance is called with {string}', function (color) {
  this.result = this.instance.luminance(color);
});

// ---------------------------------------------------------------------------
// getSelectedText
// ---------------------------------------------------------------------------

Given('window.getSelection returns {string} with rangeCount {int}', function (text, rangeCount) {
  const mockSelection = {
    toString: () => text,
    rangeCount,
    getRangeAt: () => ({ toString: () => text }),
  };
  Object.defineProperty(sharedWindow, 'getSelection', {
    value: () => mockSelection,
    writable: true,
    configurable: true,
  });
});

When('getSelectedText is called', function () {
  this.result = this.instance.getSelectedText();
});

// ---------------------------------------------------------------------------
// Integration - markdownify
// ---------------------------------------------------------------------------

Then('markdownify is a function on utils', function () {
  assert.strictEqual(typeof this.instance.markdownify, 'function');
});

Then('markdownify does not throw with a basic jQuery mock', function () {
  const $emailBody = { html: () => '<p>Test</p>', length: 1 };
  assert.doesNotThrow(() => this.instance.markdownify($emailBody, {}, {}));
});

When('markdownify is called with preprocess option', function () {
  const $emailBody = { html: () => '<p>Test</p>', length: 1 };
  this.result = this.instance.markdownify($emailBody, {}, { preprocess: true });
});

// ---------------------------------------------------------------------------
// Markdownify data-driven tests
// ---------------------------------------------------------------------------

Given('a markdownify test element {string}', function (key) {
  this._markdownifyElement = markdownifyTests[key];
  if (!this._markdownifyElement) {
    throw new Error(`Unknown markdownify test key: "${key}"`);
  }
});

When('markdownify is called on the test element', function () {
  const element = this._markdownifyElement;
  this._perfStart = Date.now();
  this.result = this.instance.markdownify(element, element.features, {});
  this._perfDuration = Date.now() - this._perfStart;
});

Then('the markdownify result matches the expected value', function () {
  const expected = this._markdownifyElement.expected;
  assert.strictEqual(this.result, expected);
});

Then('it completes within the duration limit', function () {
  const maxMs = this._markdownifyElement.duration_max_ms;
  assert.ok(this._perfDuration < maxMs,
    `Expected completion within ${maxMs}ms, took ${this._perfDuration}ms`);
});

Then('markdownify with null does not throw', function () {
  assert.doesNotThrow(() => this.instance.markdownify(null, true, {}));
});

Then('markdownify with undefined does not throw', function () {
  assert.doesNotThrow(() => this.instance.markdownify(undefined, true, {}));
});
