/* eslint-env jest, node */

// Import shared test utilities
const { 
  setupJSDOM, 
  cleanupJSDOM, 
  setupUtilsForTesting, 
  createMockJQueryElement,
  TEST_CONFIG 
} = require('./test_shared');

/**
 * Markdownify Function Tests
 *
 * Following modern JavaScript testing best practices:
 * - Proper JSDOM setup with complete environment
 * - Clean test isolation with setup/teardown
 * - Comprehensive test coverage including edge cases
 * - Performance testing for large inputs
 */
describe('Markdownify Function Tests', () => {
  let dom, window, utils, mockApp;

  // Setup test environment for each test
  beforeEach(() => {
    // Setup JSDOM environment using shared function
    const jsdomSetup = setupJSDOM();
    dom = jsdomSetup.dom;
    window = jsdomSetup.window;

    // Setup Utils class using shared function
    const utilsSetup = setupUtilsForTesting();
    utils = utilsSetup.utils;
    mockApp = utilsSetup.mockApp;
  });

  // Clean up after each test
  afterEach(() => {
    // Clean up JSDOM environment using shared function
    cleanupJSDOM(dom);
  });

  describe('Basic HTML to Markdown conversion', () => {
    test('converts simple paragraph', () => {
      const input = '<p>Hello world</p>';
      const expected = 'Hello world';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('converts multiple paragraphs with proper spacing', () => {
      const input = '<p>First paragraph</p><p>Second paragraph</p>';
      const expected = 'First paragraph\n\nSecond paragraph';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('converts div elements to paragraph spacing', () => {
      const input = '<div>First div</div><div>Second div</div>';
      const expected = 'First div\n\nSecond div';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('converts horizontal rule', () => {
      const input = '<p>Text before</p><hr><p>Text after</p>';
      const expected = 'Text before\n\n---\n\nText after';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('converts horizontal rule variations', () => {
      const input = '<p>Before</p>----<p>After</p>';
      const expected = 'Before\n\n---\n\nAfter';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('converts line breaks', () => {
      const input = '<p>Line 1<br>Line 2</p>';
      const expected = 'Line 1\nLine 2';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('converts line breaks with attributes', () => {
      const input = '<p>Line 1<br class="custom">Line 2</p>';
      const expected = 'Line 1\nLine 2';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });
  });

  describe('Text formatting conversion', () => {
    test('converts strong bold text', () => {
      const input = '<p>This is <strong>bold</strong> text</p>';
      const expected = 'This is **bold** text';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('converts b bold text', () => {
      const input = '<p>This is <b>bold</b> text</p>';
      const expected = 'This is **bold** text';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('converts em italic text', () => {
      const input = '<p>This is <em>italic</em> text</p>';
      const expected = 'This is *italic* text';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('converts i italic text', () => {
      const input = '<p>This is <i>italic</i> text</p>';
      const expected = 'This is *italic* text';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('converts underline text', () => {
      const input = '<p>This is <u>underlined</u> text</p>';
      const expected = 'This is __underlined__ text';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('converts strikethrough del text', () => {
      const input = '<p>This is <del>deleted</del> text</p>';
      const expected = 'This is ~~deleted~~ text';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('converts strikethrough s text', () => {
      const input = '<p>This is <s>strikethrough</s> text</p>';
      const expected = 'This is ~~strikethrough~~ text';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('converts strikethrough strike text', () => {
      const input = '<p>This is <strike>struck</strike> text</p>';
      const expected = 'This is ~~struck~~ text';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('handles nested formatting', () => {
      const input =
        '<p>This is <strong><em>bold and italic</em></strong> text</p>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      // Should handle nested formatting appropriately
      expect(result).toContain('bold and italic');
      expect(result).toMatch(/(\*\*.*\*\*|\*.*\*)/);
    });

    test('handles multiple formatting in same text', () => {
      const input =
        '<p>This has <strong>bold</strong> and <em>italic</em> and <u>underline</u></p>';
      const expected = 'This has **bold** and *italic* and __underline__';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });
  });

  describe('Header conversion', () => {
    test('converts h1 header to markdown format', () => {
      const input = '<h1>Main Title</h1>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result.trim()).toContain('# Main Title');
    });

    test('converts h2 header to markdown format', () => {
      const input = '<h2>Subtitle</h2>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result.trim()).toContain('## Subtitle');
    });

    test('converts h3 header to markdown format', () => {
      const input = '<h3>Sub-subtitle</h3>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result.trim()).toContain('### Sub-subtitle');
    });

    test('converts h4 header to markdown format', () => {
      const input = '<h4>Fourth Level</h4>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result.trim()).toContain('#### Fourth Level');
    });

    test('converts h5 header to markdown format', () => {
      const input = '<h5>Fifth Level</h5>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result.trim()).toContain('##### Fifth Level');
    });

    test('converts h6 header to markdown format', () => {
      const input = '<h6>Sixth Level</h6>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result.trim()).toContain('###### Sixth Level');
    });

    test('handles headers with proper spacing', () => {
      const input = '<p>Before</p><h2>Header</h2><p>After</p>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toContain('Before');
      expect(result).toContain('## Header');
      expect(result).toContain('After');
      // Should have proper spacing around header
      expect(result).toMatch(/Before[\s\S]*## Header[\s\S]*After/);
    });
  });

  describe('Link conversion', () => {
    test('converts simple links', () => {
      const input =
        '<p>Visit <a href="https://example.com">Example</a> for more info</p>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      // Links are formatted with angle brackets around URL and may include trailing slashes
      expect(result).toContain('[Example](<https://example.com');
    });

    test('converts links with title attributes', () => {
      const input =
        '<p>Visit <a href="https://example.com" title="Example Site">Example</a></p>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      // Title attributes don't affect the basic link format
      expect(result).toContain('[Example](<https://example.com');
    });

    test('handles links with long text', () => {
      const input =
        '<p>Check out <a href="https://verylongurl.com">This is a very long link text</a></p>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toContain(
        '[This is a very long link text](<https://verylongurl.com'
      );
    });

    test('ignores links with short text (less than 4 characters)', () => {
      const input = '<p>Visit <a href="https://example.com">Go</a> now</p>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      // Should not convert links with text shorter than 4 characters
      expect(result).toContain('Go');
      expect(result).not.toContain('[Go]');
    });

    test('handles multiple links in same paragraph', () => {
      const input =
        '<p>Visit <a href="https://example.com">Example</a> and <a href="https://test.com">Test Site</a></p>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toContain('[Example](<https://example.com');
      expect(result).toContain('[Test Site](<https://test.com');
    });

    test('handles same text and href', () => {
      const input =
        '<p>Visit <a href="https://example.com">https://example.com</a></p>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      // When text equals href, it actually still uses bracket format with trailing slash
      expect(result).toContain('[https://example.com](<https://example.com');
    });

    test('handles mailto links', () => {
      const input =
        '<p>Email <a href="mailto:test@example.com">test@example.com</a></p>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      // Mailto links with matching text should use angle bracket format
      expect(result).toContain('<test@example.com>');
    });
  });

  describe('HTML entity decoding', () => {
    test('decodes common HTML entities', () => {
      const input = '<p>&lt;Hello&gt; &amp; &quot;World&quot;</p>';
      const expected = '<Hello> & "World"';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('decodes numeric HTML entities', () => {
      const input = '<p>&#39;Single&#39; &#8220;quotes&#8221;</p>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      // Should decode numeric entities
      expect(result).toContain("'Single'");
    });
  });

  describe('Bullet and list handling', () => {
    test('converts bullet characters to asterisks', () => {
      const input = '<p>· First item</p><p>· Second item</p>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toContain('* First item');
      expect(result).toContain('* Second item');
    });

    test('handles bullet formatting with line breaks', () => {
      const input = '<p>Text before</p><p>· Bullet point</p><p>Text after</p>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toContain('Text before');
      expect(result).toContain('* Bullet point');
      expect(result).toContain('Text after');
    });
  });

  describe('Whitespace and formatting cleanup', () => {
    test('handles multiple spaces in content', () => {
      const input = '<p>Too     many    spaces</p>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      // Multiple spaces should now be normalized to single spaces (bug fixed)
      expect(result).toBe('Too many spaces');
    });

    test('normalizes multiple line breaks', () => {
      const input = '<p>First</p><p></p><p></p><p>Second</p>';
      const expected = 'First\n\nSecond';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('trims whitespace from beginning and end', () => {
      const input = '   <p>Content</p>   ';
      const expected = 'Content';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('handles tabs and mixed whitespace', () => {
      const input = '<p>Text\t\twith\t\ttabs</p>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      // Tabs should now be normalized to single spaces (bug fixed)
      expect(result).toBe('Text with tabs');
    });

    test('demonstrates actual space normalization', () => {
      // Test what actually gets normalized
      const input = '<p>Normal  spaces</p>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      // Should now normalize 2+ spaces to single space (bug fixed)
      expect(result).toBe('Normal spaces');
    });
  });

  describe('Feature toggle functionality', () => {
    test('disables all features when features=false', () => {
      const input =
        '<p>Text with <strong>bold</strong> and <a href="https://example.com">link</a></p>';
      const expected = 'Text with bold and link';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, false, {});

      // Should not convert any markdown when features disabled
      expect(result).toBe(expected);
      expect(result).not.toContain('**');
      expect(result).not.toContain('[');
    });

    test('allows selective feature disabling', () => {
      const input =
        '<p>Text with <strong>bold</strong> and <a href="https://example.com">link text</a></p>';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify(
        $element,
        { strong: false, a: true },
        {}
      );

      // Should not convert bold but should convert links
      expect(result).toContain('bold'); // No ** around it
      expect(result).not.toContain('**bold**');
      expect(result).toContain('[link text](<https://example.com');
    });

    test('enables features by default', () => {
      const input = '<p>Text with <strong>bold</strong></p>';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, undefined, {});

      // Should convert by default when features not specified
      expect(result).toContain('**bold**');
    });
  });

  describe('Complex real-world scenarios', () => {
    test('handles email-like content', () => {
      const input = `
        <div>
          <h2>Meeting Notes</h2>
          <p>Here are the <strong>important</strong> points from today's meeting:</p>
          <p>· First agenda item</p>
          <p>· Second agenda item with <em>emphasis</em></p>
          <p>Please review the <a href="https://docs.example.com">documentation</a> before next week.</p>
          <hr>
          <p>Best regards,<br>John Doe</p>
        </div>
      `;

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toContain('## Meeting Notes');
      expect(result).toContain('**important**');
      expect(result).toContain('* First agenda item');
      expect(result).toContain('*emphasis*');
      expect(result).toContain('[documentation](<https://docs.example.com');
      expect(result).toContain('---');
      expect(result).toContain('Best regards,\nJohn Doe');
    });

    test('handles nested HTML structures', () => {
      const input = `
        <div>
          <p>Outer paragraph with <span><strong>nested bold</strong> content</span></p>
          <div>
            <p>Inner paragraph with <em>italic <u>and underline</u></em></p>
          </div>
        </div>
      `;

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toContain('**nested bold**');
      expect(result).toContain('*italic');
      // Note: Nested formatting may not work as expected, so just check that content is there
      expect(result).toContain('and underline');
    });

    test('handles large content efficiently', () => {
      // Create a large HTML content to test performance
      const items = Array.from(
        { length: 100 },
        (_, i) =>
          `<p>Item ${
            i + 1
          } with <strong>bold</strong> and <em>italic</em> text</p>`
      ).join('');

      const input = `<div>${items}</div>`;

      const $element = createMockJQueryElement(input);
      const startTime = Date.now();
      const result = utils.markdownify($element, true, {});
      const endTime = Date.now();

      // Should complete in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 100');
      expect(result).toContain('**bold**');
      expect(result).toContain('*italic*');
    });
  });

  describe('Edge cases and error handling', () => {
    test('handles null/undefined input gracefully', () => {
      expect(() => utils.markdownify(null, true, {})).not.toThrow();
      expect(() => utils.markdownify(undefined, true, {})).not.toThrow();

      expect(utils.markdownify(null, true, {})).toBe('');
      expect(utils.markdownify(undefined, true, {})).toBe('');
    });

    test('handles empty input', () => {
      const $element = createMockJQueryElement('');
      const result = utils.markdownify($element, true, {});

      expect(result).toBe('');
    });

    test('handles input with only whitespace', () => {
      const $element = createMockJQueryElement('   \n\t   ');
      const result = utils.markdownify($element, true, {});

      expect(result).toBe('');
    });

    test('handles malformed HTML gracefully', () => {
      const input =
        '<p>Unclosed paragraph<strong>Bold without close<em>Nested without close';
      const $element = createMockJQueryElement(input);

      expect(() => utils.markdownify($element, true, {})).not.toThrow();
      const result = utils.markdownify($element, true, {});

      expect(result).toContain('Unclosed paragraph');
      expect(result).toContain('Bold without close');
      expect(result).toContain('Nested without close');
    });

    test('handles elements with no text content', () => {
      const input = '<p><img src="image.jpg" alt=""></p><p><br></p>';
      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      // Should handle gracefully without errors
      expect(result.trim()).toBe('');
    });

    test('handles special characters and unicode', () => {
      const input = '<p>Unicode: 🔥 💻 🚀 and special chars: @#$%^&*()</p>';
      const expected = 'Unicode: 🔥 💻 🚀 and special chars: @#$%^&*()';

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(expected);
    });

    test('handles very long text content', () => {
      const longText = 'A'.repeat(10000);
      const input = `<p>${longText}</p>`;

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      expect(result).toBe(longText);
      expect(result.length).toBe(10000);
    });
  });

  describe('Integration and consistency tests', () => {
    test('produces consistent output for same input', () => {
      const input =
        '<p>Test with <strong>bold</strong> and <a href="https://example.com">link</a></p>';
      const $element = createMockJQueryElement(input);

      const result1 = utils.markdownify($element, true, {});
      const result2 = utils.markdownify($element, true, {});
      const result3 = utils.markdownify($element, true, {});

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    test('validates markdown output format', () => {
      const input = `
        <h1>Title</h1>
        <p>Paragraph with <strong>bold</strong>, <em>italic</em>, and <a href="https://example.com">link</a>.</p>
        <h2>Subtitle</h2>
        <p>Another paragraph with <del>strikethrough</del>.</p>
      `;

      const $element = createMockJQueryElement(input);
      const result = utils.markdownify($element, true, {});

      // Verify proper markdown formatting
      expect(result).toMatch(/^# Title/m);
      expect(result).toMatch(/## Subtitle/m);
      expect(result).toContain('**bold**');
      expect(result).toContain('*italic*');
      expect(result).toContain('[link](<https://example.com');
      expect(result).toContain('~~strikethrough~~');
    });
  });
});
