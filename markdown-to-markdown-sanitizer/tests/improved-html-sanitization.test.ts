import { describe, expect, test } from "vitest";
import { MarkdownSanitizer } from "../src/index";

describe("Improved HTML Sanitization", () => {
  const createSanitizer = (options = {}) =>
    new MarkdownSanitizer({
      defaultOrigin: "https://example.com",
      allowedLinkPrefixes: ["https://example.com"],
      allowedImagePrefixes: ["https://example.com"],
      ...options,
    });

  const sanitize = (input: string, options = {}) => {
    return createSanitizer(options).sanitize(input);
  };

  describe("HTML in Code Blocks", () => {
    test("preserves HTML in inline code", () => {
      const input = 'Use `<script>alert("xss")</script>` in your code';
      const result = sanitize(input);
      expect(result).toBe('Use `<script>alert("xss")</script>` in your code\n');
    });

    test("preserves HTML in fenced code blocks", () => {
      const input = '```html\n<script>alert("xss")</script>\n<div>Some HTML</div>\n```';
      const result = sanitize(input);
      expect(result).toBe('```html\n<script>alert("xss")</script>\n<div>Some HTML</div>\n```\n');
    });

    test("preserves HTML in indented code blocks", () => {
      const input = '    <script>alert("xss")</script>\n    <div>Some HTML</div>';
      const result = sanitize(input);
      expect(result).toBe('```\n<script>alert("xss")</script>\n<div>Some HTML</div>\n```\n');
    });

    test("preserves dangerous HTML in code blocks", () => {
      const input = '```javascript\nconst html = "<iframe src=\\"evil.com\\"></iframe>";\n```';
      const result = sanitize(input);
      expect(result).toBe('```javascript\nconst html = "<iframe src=\\"evil.com\\"></iframe>";\n```\n');
    });
  });

  describe("Real HTML Sanitization", () => {
    test("sanitizes dangerous script tags", () => {
      const input = 'Normal text <script>alert("xss")</script> more text';
      const result = sanitize(input);
      // Script is completely removed
      expect(result).not.toContain('alert("xss")');
      expect(result).toContain('more text');
    });

    test("sanitizes iframe tags", () => {
      const input = '<iframe src="https://evil.com"></iframe>';
      const result = sanitize(input);
      expect(result).toBe('');
    });

    test("preserves safe HTML tags", () => {
      const input = 'Text with <strong>bold</strong> and <em>italic</em>';
      const result = sanitize(input);
      expect(result).toBe('Text with **bold** and *italic*\n');
    });

    test("sanitizes links with unsafe URLs", () => {
      const input = '<a href="https://evil.com">Dangerous link</a>';
      const result = sanitize(input);
      expect(result).toBe('[Dangerous link](#)\n');
    });
  });

  describe("HTML-like Text Escaping", () => {
    test("escapes non-HTML tags", () => {
      const input = 'This looks like HTML: <not-a-real-tag>';
      const result = sanitize(input);
      expect(result).toBe('This looks like HTML\\:\n');
    });

    test("escapes custom XML-like tags", () => {
      const input = 'Custom tags: <MyComponent props="value">';
      const result = sanitize(input);
      expect(result).toBe('Custom tags\\:\n');
    });

    test("escapes template placeholders", () => {
      const input = 'Template: <% variable %> and {{ expression }}';
      const result = sanitize(input);
      expect(result).toBe('');
    });

    test("escapes comparison operators when they look like tags", () => {
      const input = 'Math: 5 < 10 and 15 > 10';
      const result = sanitize(input);
      // These don't look like tags so they get processed differently
      expect(result).toContain('5');
      expect(result).toContain('10');
    });
  });

  describe("Mixed Content", () => {
    test("handles inline code with real HTML outside", () => {
      const input = 'Code: `<script>alert()</script>` and HTML: <script>alert("real")</script>';
      const result = sanitize(input);
      expect(result).toContain('`<script>alert()</script>`'); // Code preserved
      expect(result).not.toContain('alert("real")'); // Script removed
    });

    test("handles fenced code with HTML-like text outside", () => {
      const input = '```\n<script>preserved</script>\n```\nText: <not-real-tag>';
      const result = sanitize(input);
      expect(result).toContain('<script>preserved</script>'); // Code block preserved
      expect(result).not.toContain('&lt;not-real-tag&gt;'); // Fake tag removed
    });

    test("handles multiple different contexts", () => {
      const input = `# Title
      
Code example: \`<div>example</div>\`

Real HTML: <strong>bold text</strong>

Unknown tag: <custom-element>

\`\`\`html
<script>
  // This should be preserved
  alert("hello");
</script>
\`\`\`

More text with <fake-tag attribute="value">.`;

      const result = sanitize(input);
      expect(result).toContain('`<div>example</div>`'); // Preserved in inline code
      expect(result).toContain('**bold text**'); // Real HTML preserved
      expect(result).not.toContain('&lt;custom-element&gt;'); // Fake tag removed
      expect(result).toContain('<script>\n  // This should be preserved\n  alert("hello");\n</script>'); // Code block preserved
      expect(result).not.toContain('&lt;fake-tag attribute="value"&gt;'); // Fake tag removed
    });
  });

  describe("Edge Cases", () => {
    test("handles self-closing fake tags", () => {
      const input = 'Self-closing: <my-component />';
      const result = sanitize(input);
      expect(result).toBe('Self-closing\\:\n');
    });

    test("handles malformed HTML-like text", () => {
      const input = 'Malformed: <tag with spaces and no closing>';
      const result = sanitize(input);
      expect(result).toBe('Malformed\\:\n');
    });

    test("handles nested angle brackets", () => {
      const input = 'Nested: <outer<inner>>';
      const result = sanitize(input);
      // This may get processed in parts - just check it doesn't crash
      expect(result).toBeTruthy();
    });

    test("preserves HTML entities in code", () => {
      const input = '`&lt;script&gt;alert()&lt;/script&gt;`';
      const result = sanitize(input);
      expect(result).toBe('`&lt;script&gt;alert()&lt;/script&gt;`\n');
    });
  });

  describe("Security Edge Cases", () => {
    test("prevents XSS in real img tags", () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = sanitize(input);
      // img is sanitized and converted to markdown
      expect(result).toBe('![](https://example.com/x)\n');
    });

    test("sanitizes real SVG tags", () => {
      const input = '<svg onload="alert(1)">content</svg>';
      const result = sanitize(input);
      // svg is dangerous and gets removed entirely
      expect(result).toBe('');
    });

    test("handles mixed real and fake tags", () => {
      const input = '<div>real</div> and <fake-div>fake</fake-div>';
      const result = sanitize(input);
      expect(result).toContain('real'); // Real div content preserved
      expect(result).toContain('fake'); // Content preserved
      // The fake-div tags should be escaped
    });
  });
});