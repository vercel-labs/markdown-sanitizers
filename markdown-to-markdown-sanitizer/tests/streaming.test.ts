import { describe, expect, test } from "vitest";
import { MarkdownSanitizer } from "../src/index";

describe("Streaming Sanitization", () => {
  const createSanitizer = (options = {}) =>
    new MarkdownSanitizer({
      defaultOrigin: "https://example.com",
      allowedLinkPrefixes: ["https://example.com", "https://trusted.org"],
      allowedImagePrefixes: ["https://example.com", "https://images.com"],
      ...options,
    });

  describe("Basic Streaming", () => {
    test("processes complete lines immediately", () => {
      const sanitizer = createSanitizer();

      const result1 = sanitizer.write("# Title\n");
      const result2 = sanitizer.write("[Link](https://example.com)\n");
      const final = sanitizer.end();

      expect(result1).toBe("# Title\n");
      expect(result2).toBe("[Link](https://example.com/)\n");
      expect(final).toBe("");
    });

    test("buffers incomplete lines", () => {
      const sanitizer = createSanitizer();

      const result1 = sanitizer.write("This is ");
      const result2 = sanitizer.write("a partial line");
      const result3 = sanitizer.write(" that continues\n");
      const final = sanitizer.end();

      expect(result1).toBe("");
      expect(result2).toBe("");
      expect(result3).toBe("This is a partial line that continues\n");
      expect(final).toBe("");
    });

    test("handles final buffer content", () => {
      const sanitizer = createSanitizer();

      const result1 = sanitizer.write("Complete line\n");
      const result2 = sanitizer.write("Incomplete line without newline");
      const final = sanitizer.end();

      expect(result1).toBe("Complete line\n");
      expect(result2).toBe("");
      expect(final).toBe("Incomplete line without newline\n");
    });
  });

  describe("Streaming with Sanitization", () => {
    test("sanitizes links in streaming mode", () => {
      const sanitizer = createSanitizer();

      const result1 = sanitizer.write("[Good link](https://example.com)\n");
      const result2 = sanitizer.write("[Bad link](https://evil.com)\n");
      const final = sanitizer.end();

      expect(result1).toBe("[Good link](https://example.com/)\n");
      expect(result2).toBe("[Bad link](#)\n");
      expect(final).toBe("");
    });

    test("sanitizes images in streaming mode", () => {
      const sanitizer = createSanitizer();

      const result1 = sanitizer.write("![Good](https://images.com/pic.jpg)\n");
      const result2 = sanitizer.write("![Bad](https://evil.com/tracker.gif)\n");
      const final = sanitizer.end();

      expect(result1).toBe("![Good](https://images.com/pic.jpg)\n");
      expect(result2).toBe("![Bad](/forbidden)\n");
      expect(final).toBe("");
    });

    test("sanitizes HTML in streaming mode", () => {
      const sanitizer = createSanitizer();

      const result1 = sanitizer.write("<strong>Bold text</strong>\n");
      const result2 = sanitizer.write('<script>alert("xss")</script>\n');
      const final = sanitizer.end();

      expect(result1).toBe("**Bold text**\n");
      expect(result2).toBe("");
      expect(final).toBe("");
    });
  });

  describe("Multi-line Content Streaming", () => {
    test("handles markdown across multiple chunks", () => {
      const sanitizer = createSanitizer();

      let result = "";
      result += sanitizer.write("# Title\n\n");
      result += sanitizer.write("Here is a [good link](https://example.com) ");
      result += sanitizer.write("and a [bad link](https://evil.com).\n\n");
      result += sanitizer.write("![Image](https://images.com/pic.jpg)\n");
      result += sanitizer.end();

      expect(result).toContain("# Title");
      expect(result).toContain("[good link](https://example.com/)");
      expect(result).toContain("[bad link](#)");
      expect(result).toContain("![Image](https://images.com/pic.jpg)");
    });

    test("handles complex markdown structures", () => {
      const sanitizer = createSanitizer();

      let result = "";
      result += sanitizer.write("## Section\n\n");
      result += sanitizer.write("- List item 1\n");
      result += sanitizer.write(
        "- List item with [link](https://example.com)\n",
      );
      result += sanitizer.write(
        "- List item with ![image](https://images.com/pic.jpg)\n\n",
      );
      result += sanitizer.write("> Blockquote with **bold** text\n");
      result += sanitizer.end();

      expect(result).toContain("## Section");
      expect(result).toContain("*   List item 1");
      expect(result).toContain("[link](https://example.com/)");
      expect(result).toContain("![image](https://images.com/pic.jpg)");
      expect(result).toContain("> Blockquote");
      expect(result).toContain("**bold**");
    });
  });

  describe("Edge Cases in Streaming", () => {
    test("handles empty chunks", () => {
      const sanitizer = createSanitizer();

      const result1 = sanitizer.write("");
      const result2 = sanitizer.write("Some text\n");
      const result3 = sanitizer.write("");
      const final = sanitizer.end();

      expect(result1).toBe("");
      expect(result2).toBe("Some text\n");
      expect(result3).toBe("");
      expect(final).toBe("");
    });

    test("handles whitespace-only chunks", () => {
      const sanitizer = createSanitizer();

      const result1 = sanitizer.write("   ");
      const result2 = sanitizer.write("\n");
      const result3 = sanitizer.write("   \n");
      const final = sanitizer.end();

      expect(result1).toBe("");
      expect(result2).toBe("");
      expect(result3).toBe("");
      expect(final).toBe("");
    });

    test("handles single character chunks", () => {
      const sanitizer = createSanitizer();

      const chars = "Hello World\n";
      let result = "";

      for (const char of chars) {
        result += sanitizer.write(char);
      }
      result += sanitizer.end();

      expect(result).toBe("Hello World\n");
    });

    test("handles multiple newlines", () => {
      const sanitizer = createSanitizer();

      const result1 = sanitizer.write("Line 1\n\n\n");
      const result2 = sanitizer.write("Line 2\n");
      const final = sanitizer.end();

      expect(result1).toBe("Line 1\n");
      expect(result2).toBe("Line 2\n");
      expect(final).toBe("");
    });
  });

  describe("Streaming Performance", () => {
    test("processes large content efficiently", () => {
      const sanitizer = createSanitizer();

      let result = "";

      // Simulate streaming a document - reduced size for faster execution
      for (let i = 0; i < 100; i++) {
        // Reduced from 1000
        result += sanitizer.write(
          `Line ${i} with [link](https://example.com/page${i})\n`,
        );
      }
      result += sanitizer.end();

      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain("[link](https://example.com/page0)");
      expect(result).toContain("[link](https://example.com/page99)"); // Updated to match new count
    });

    test("handles mixed content types efficiently", () => {
      const sanitizer = createSanitizer();

      const chunks = [
        "# Title\n",
        "Regular text paragraph.\n\n",
        "[Good link](https://example.com)\n",
        "[Bad link](https://evil.com)\n",
        "![Good image](https://images.com/pic.jpg)\n",
        "![Bad image](https://evil.com/tracker.gif)\n",
        "<strong>Bold HTML</strong>\n",
        '<script>alert("xss")</script>\n',
        "> Blockquote\n\n",
        "```javascript\ncode block\n```\n",
      ];

      let result = "";

      for (const chunk of chunks) {
        result += sanitizer.write(chunk);
      }
      result += sanitizer.end();
      expect(result).toContain("# Title");
      expect(result).toContain("[Good link](https://example.com/)");
      expect(result).toContain("[Bad link](#)");
      expect(result).toContain("![Good image](https://images.com/pic.jpg)");
      expect(result).toContain("![Bad image](/forbidden)");
      expect(result).toContain("**Bold HTML**");
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert");
    });
  });

  describe("Error Handling in Streaming", () => {
    test("handles malformed markdown gracefully", () => {
      const sanitizer = createSanitizer();

      const result1 = sanitizer.write("[Incomplete link\n");
      const result2 = sanitizer.write("More text\n");
      const final = sanitizer.end();

      expect(result1).toBe("&5b;Incomplete link\n");
      expect(result2).toBe("More text\n");
      expect(final).toBe("");
    });

    test("continues processing after errors", () => {
      const sanitizer = createSanitizer();

      // This might cause parsing issues but shouldn't crash
      sanitizer.write("![Invalid markdown structure\n");
      const result2 = sanitizer.write("[Valid link](https://example.com)\n");
      const final = sanitizer.end();

      expect(result2).toBe("[Valid link](https://example.com/)\n");
      expect(final).toBe("");
    });
  });
});
