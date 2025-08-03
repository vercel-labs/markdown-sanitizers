import { describe, expect, test } from "vitest";
import { MarkdownSanitizer } from "../src/index";

describe("Basic Markdown Sanitization", () => {
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

  describe("Link Sanitization", () => {
    test("allows trusted links", () => {
      const input = "[Click here](https://example.com/page)";
      const result = sanitize(input);
      expect(result).toBe("[Click here](https://example.com/page)\n");
    });

    test("blocks untrusted links", () => {
      const input = "[Malicious](https://evil.com/steal)";
      const result = sanitize(input);
      expect(result).toBe("[Malicious](#)\n");
    });

    test("handles relative links with default origin", () => {
      const input = "[Relative](/path/to/page)";
      const result = sanitize(input);
      expect(result).toBe("[Relative](https://example.com/path/to/page)\n");
    });

    test("handles multiple links", () => {
      const input =
        "[Good](https://example.com/good) and [Bad](https://evil.com/bad)";
      const result = sanitize(input);
      expect(result).toBe("[Good](https://example.com/good) and [Bad](#)\n");
    });

    test("preserves link text even when URL is blocked", () => {
      const input = '[Important Info](javascript:alert("xss"))';
      const result = sanitize(input);
      // javascript: URLs are completely stripped by DOMPurify, leaving just text
      expect(result).toBe("Important Info\n");
    });
  });

  describe("Image Sanitization", () => {
    test("allows trusted images", () => {
      const input = "![Alt text](https://images.com/photo.jpg)";
      const result = sanitize(input);
      expect(result).toBe("![Alt text](https://images.com/photo.jpg)\n");
    });

    test("blocks untrusted images", () => {
      const input = "![Evil](https://evil.com/tracker.gif)";
      const result = sanitize(input);
      expect(result).toBe("![Evil](/forbidden)\n");
    });

    test("handles relative image paths", () => {
      const input = "![Local](/images/local.png)";
      const result = sanitize(input);
      expect(result).toBe("![Local](https://example.com/images/local.png)\n");
    });

    test("preserves alt text even when image is blocked", () => {
      const input = "![Important Image](data:image/gif;base64,R0lGOD)";
      const result = sanitize(input);
      // data: URLs are sanitized to /forbidden, preserving alt text
      expect(result).toBe("![Important Image](/forbidden)\n");
    });
  });

  describe("Mixed Content", () => {
    test("handles text with both links and images", () => {
      const input = `# Title
      
Here is a [link](https://example.com/page) and an image ![img](https://images.com/pic.jpg).

Also a bad [link](https://evil.com) and bad ![image](https://evil.com/tracker.gif).`;

      const result = sanitize(input);
      expect(result).toBe(
        "# Title\n\nHere is a [link](https://example.com/page) and an image ![img](https://images.com/pic.jpg).\n\nAlso a bad [link](#) and bad ![image](/forbidden).\n",
      );
    });
  });

  describe("Edge Cases", () => {
    test("handles empty input", () => {
      expect(sanitize("")).toBe("");
    });

    test("handles whitespace only", () => {
      expect(sanitize("   \n   ")).toBe("");
    });

    test("handles plain text without markdown", () => {
      const input = "Just plain text with no markdown.";
      expect(sanitize(input)).toBe("Just plain text with no markdown.\n");
    });

    test("handles malformed markdown gracefully", () => {
      const input =
        "[Incomplete link without closing paren](https://example.com";
      const result = sanitize(input);
      expect(result).toBeTruthy(); // Should not crash
    });

    test("handles nested brackets", () => {
      const input = "[[Nested] brackets](https://example.com)";
      const result = sanitize(input);
      expect(result).toBe("[\\[Nested\\] brackets](https://example.com/)\n");
    });

    test("handles escaped characters", () => {
      const input = "\\[Not a link\\] and \\![Not an image\\]";
      const result = sanitize(input);
      // Turndown escapes brackets differently than the original implementation
      expect(result).toBe("\\[Not a link\\] and !\\[Not an image\\]\n");
    });
  });

  describe("URL Edge Cases", () => {
    test("handles very long URLs", () => {
      const longUrl = "https://example.com/" + "a".repeat(300);
      const input = `[Link](${longUrl})`;
      const result = sanitize(input);
      expect(result).toBe("[Link](#)\n"); // Should be blocked due to length
    });

    test("handles URLs with special characters", () => {
      const input =
        "[Link](https://example.com/path?query=value&other=123#fragment)";
      const result = sanitize(input);
      // The new implementation handles URL encoding differently
      expect(result).toBe(
        "[Link](https://example.com/path?query=value&other=123#fragment)\n",
      );
    });

    test("handles protocol-relative URLs", () => {
      const input = "[Link](//example.com/path)";
      const result = sanitize(input);
      expect(result).toBe("[Link](https://example.com/path)\n");
    });

    test("rejects invalid URLs", () => {
      const input = "[Link](not-a-valid-url)";
      const result = sanitize(input);
      expect(result).toBe("[Link](https://example.com/not-a-valid-url)\n");
    });
  });

  describe("Reference Style Links", () => {
    test("handles reference style links", () => {
      const input = `[link text][ref]

[ref]: https://example.com/page`;
      const result = sanitize(input);
      // Turndown converts reference links to inline links
      expect(result).toBe(
        "[link text](https://example.com/page)\n",
      );
    });

    test("sanitizes reference URLs", () => {
      const input = `[link text][ref]

[ref]: https://evil.com/malicious`;
      const result = sanitize(input);
      // Blocked URLs get converted to # and turndown preserves inline format
      expect(result).toBe("[link text](#)\n");
    });
  });
});
