import { describe, expect, test } from "vitest";
import { MarkdownSanitizer } from "../src/index";

describe("HTML Sanitization", () => {
  const createSanitizer = (options = {}) =>
    new MarkdownSanitizer({
      defaultOrigin: "https://example.com",
      allowedLinkPrefixes: ["https://example.com", "https://trusted.org"],
      allowedImagePrefixes: ["https://example.com", "https://images.com"],
      ...options,
    });

  const sanitize = (input: string, options = {}) => {
    return createSanitizer(options).sanitize(input);
  };

  describe("Safe HTML Tags", () => {
    test("converts safe HTML tags to markdown", () => {
      const input = "Text with <strong>bold</strong> and <em>italic</em>";
      const result = sanitize(input);
      expect(result).toBe(
        "Text with **bold** and *italic*\n"
      );
    });

    test("converts code tags to markdown", () => {
      const input = "Here is <code>inline code</code>";
      const result = sanitize(input);
      expect(result).toBe("Here is `inline code`\n");
    });

    test("converts links to markdown with href sanitization", () => {
      const input = '<a href="https://example.com/page">Safe link</a>';
      const result = sanitize(input);
      expect(result).toBe('[Safe link](https://example.com/page)\n');
    });

    test("sanitizes links with untrusted hrefs", () => {
      const input = '<a href="https://evil.com/malware">Dangerous link</a>';
      const result = sanitize(input);
      expect(result).toBe("[Dangerous link](#)\n");
    });

    test("converts images to markdown with src sanitization", () => {
      const input = '<img src="https://images.com/safe.jpg" alt="Safe image">';
      const result = sanitize(input);
      expect(result).toBe(
        '![Safe image](https://images.com/safe.jpg)\n'
      );
    });

    test("sanitizes images with untrusted src", () => {
      const input = '<img src="https://evil.com/tracker.gif" alt="Tracker">';
      const result = sanitize(input);
      expect(result).toBe("![Tracker](/forbidden)\n");
    });
  });

  describe("Dangerous HTML Tags", () => {
    test("removes script tags completely", () => {
      const input = 'Safe text <script>alert("xss")</script> more text';
      const result = sanitize(input);
      expect(result).toBe("Safe text more text\n");
    });

    test("removes iframe tags", () => {
      const input = '<iframe src="https://evil.com/embed"></iframe>';
      const result = sanitize(input);
      expect(result).toBe("");
    });

    test("removes object and embed tags", () => {
      const input =
        '<object data="malware.swf"></object><embed src="evil.exe">';
      const result = sanitize(input);
      expect(result).toBe("");
    });

    test("removes form elements", () => {
      const input = '<form><input type="text"><button>Submit</button></form>';
      const result = sanitize(input);
      expect(result).toBe("Submit\n");
    });

    test("removes style tags", () => {
      const input = "<style>body { background: red; }</style>";
      const result = sanitize(input);
      expect(result).toBe("");
    });
  });

  describe("XSS Prevention", () => {
    test("removes javascript: URLs in links", () => {
      const input = "<a href=\"javascript:alert('xss')\">Click me</a>";
      const result = sanitize(input);
      expect(result).toBe("Click me\n");
    });

    test("removes javascript: URLs in images", () => {
      const input = '<img src="javascript:alert(\'xss\')" alt="Evil">';
      const result = sanitize(input);
      expect(result).toBe('');
    });

    test("removes data: URLs in images", () => {
      const input =
        '<img src="data:text/html,<script>alert(\'xss\')</script>" alt="Data URL attack">';
      const result = sanitize(input);
      expect(result).toBe("![Data URL attack](/forbidden)\n");
    });

    test("removes vbscript: URLs", () => {
      const input = "<a href=\"vbscript:msgbox('xss')\">VBScript attack</a>";
      const result = sanitize(input);
      expect(result).toBe("VBScript attack\n");
    });

    test("removes onload and other event handlers", () => {
      const input =
        '<img src="https://images.com/safe.jpg" onload="alert(\'xss\')" alt="Evil image">';
      const result = sanitize(input);
      expect(result).toBe(
        '![Evil image](https://images.com/safe.jpg)\n'
      );
    });

    test("removes onerror handlers", () => {
      const input =
        '<img src="nonexistent.jpg" onerror="alert(\'xss\')" alt="Error handler attack">';
      const result = sanitize(input);
      expect(result).toBe(
        '![Error handler attack](https://example.com/nonexistent.jpg)\n'
      );
    });

    test("removes onclick handlers", () => {
      const input = "<div onclick=\"alert('xss')\">Click me</div>";
      const result = sanitize(input);
      expect(result).toBe("Click me\n");
    });
  });

  describe("HTML Attribute Sanitization", () => {
    test("preserves safe attributes", () => {
      const input =
        '<img src="https://images.com/photo.jpg" alt="Photo" width="100" height="50">';
      const result = sanitize(input);
      expect(result).toBe(
        '![Photo](https://images.com/photo.jpg)\n'
      );
    });

    test("removes dangerous attributes", () => {
      const input =
        '<div style="background: url(javascript:alert(\'xss\'))" class="safe">Content</div>';
      const result = sanitize(input);
      expect(result).toBe('Content\n');
    });

    test("sanitizes href attributes in anchor tags", () => {
      const input =
        '<a href="https://evil.com/malware" title="Safe title">Link</a>';
      const result = sanitize(input);
      expect(result).toBe('[Link](# "Safe title")\n');
    });
  });

  describe("Complex HTML Structures", () => {
    test("handles nested HTML tags", () => {
      const input =
        "<div><p>Paragraph with <strong>bold <em>and italic</em></strong> text</p></div>";
      const result = sanitize(input);
      expect(result).toBe(
        "Paragraph with **bold *and italic*** text\n"
      );
    });

    test("handles HTML tables", () => {
      const input = `<table>
        <thead>
          <tr><th>Header</th></tr>
        </thead>
        <tbody>
          <tr><td>Data</td></tr>
        </tbody>
      </table>`;
      const result = sanitize(input);
      expect(result).toBe(
        "| Header |\n| --- |\n| Data |\n"
      );
    });

    test("handles HTML lists", () => {
      const input = "<ul><li>Item 1</li><li>Item 2</li></ul>";
      const result = sanitize(input);
      expect(result).toBe("*   Item 1\n*   Item 2\n");
    });
  });

  describe("Malformed HTML", () => {
    test("handles unclosed tags", () => {
      const input = "<div><p>Unclosed paragraph<strong>Bold text</div>";
      const result = sanitize(input);
      expect(result).toBeTruthy(); // Should not crash
    });

    test("handles mismatched tags", () => {
      const input = "<strong><em>Text</strong></em>";
      const result = sanitize(input);
      expect(result).toBeTruthy(); // Should not crash
    });

    test("handles HTML comments", () => {
      const input = "<!-- This is a comment --><p>Visible text</p>";
      const result = sanitize(input);
      expect(result).toBe("Visible text\n");
    });
  });
});
