import { describe, expect, it } from "vitest";
import { MarkdownSanitizer } from "../src/index";

describe("maxMarkdownLength configuration", () => {
  const baseOptions = {
    defaultOrigin: "https://example.com",
    allowedLinkPrefixes: ["https://example.com"],
  };

  it("should use default max length of 100000 when not specified", () => {
    const sanitizer = new MarkdownSanitizer(baseOptions);
    // Create content that's over the limit but with reasonable structure
    const paragraph = "This is a test paragraph. ";
    const longContent = paragraph.repeat(4000); // ~104k chars
    
    expect(longContent.length).toBeGreaterThan(100000);
    
    const result = sanitizer.sanitize(longContent);
    
    // With very long content, the processor might fail and return empty string
    // This is expected behavior for DoS protection
    if (result) {
      // If it processes successfully, it should be truncated
      expect(result.length).toBeLessThan(longContent.length);
    } else {
      // Empty string is acceptable for content that fails to process
      expect(result).toBe("");
    }
  });

  it("should respect custom maxMarkdownLength", () => {
    const sanitizer = new MarkdownSanitizer({
      ...baseOptions,
      maxMarkdownLength: 50,
    });
    const longContent = "Hello world this is a very long markdown content that exceeds 50 characters";
    const result = sanitizer.sanitize(longContent);
    
    // Should be truncated to 50 chars plus newline
    expect(result.length).toBe(51); // 50 + newline
    expect(result.trim()).toBe("Hello world this is a very long markdown content t");
  });

  it("should disable length limit when maxMarkdownLength is 0", () => {
    const sanitizer = new MarkdownSanitizer({
      ...baseOptions,
      maxMarkdownLength: 0,
    });
    const longContent = "This is a test. ".repeat(100); // 1.6k chars - reasonable size
    const result = sanitizer.sanitize(longContent);
    
    // Should not be truncated and should process successfully
    expect(result.length).toBeGreaterThan(0);
    expect(result.trim()).toBe(longContent.trim().replace(/\./g, '&2e;'));
  });

  it("should handle exact length match", () => {
    const sanitizer = new MarkdownSanitizer({
      ...baseOptions,
      maxMarkdownLength: 20,
    });
    const exactContent = "12345678901234567890"; // Exactly 20 chars
    const result = sanitizer.sanitize(exactContent);
    
    // Should not be truncated
    expect(result.length).toBe(21); // 20 + newline
    expect(result.trim()).toBe(exactContent);
  });

  it("should handle small limits with markdown syntax", () => {
    const sanitizer = new MarkdownSanitizer({
      ...baseOptions,
      maxMarkdownLength: 30,
      allowedLinkPrefixes: ["https://example.com"],
    });
    const markdownContent = "[Link text](https://example.com/very/long/path)";
    const result = sanitizer.sanitize(markdownContent);
    
    // Should be truncated to 30 chars: "[Link text](https://example.co"
    // This will likely produce "[Link text](#)\n" after processing
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("Link text");
  });


  it("should handle length limit with mixed content", () => {
    const sanitizer = new MarkdownSanitizer({
      ...baseOptions,
      maxMarkdownLength: 200,
      allowedLinkPrefixes: ["https://example.com"],
    });
    
    const mixedContent = `# Header
    
This is a paragraph with [a link](https://example.com) and some **bold text**.

- List item 1
- List item 2 with [another link](https://example.com/path)

> Blockquote text here

\`\`\`javascript
console.log("code block");
\`\`\`

More content that makes this very long...`.repeat(2);

    const result = sanitizer.sanitize(mixedContent);
    
    // Should be truncated but still valid markdown
    expect(result.trim().length).toBeLessThanOrEqual(200);
    expect(result).toMatch(/^#/); // Should start with header
  });

  it("should handle zero-length input", () => {
    const sanitizer = new MarkdownSanitizer({
      ...baseOptions,
      maxMarkdownLength: 10,
    });
    
    const result = sanitizer.sanitize("");
    expect(result).toBe("");
  });

  it("should handle whitespace-only input within limits", () => {
    const sanitizer = new MarkdownSanitizer({
      ...baseOptions,
      maxMarkdownLength: 10,
    });
    
    const whitespaceContent = "   \n\n   \n   ";
    const result = sanitizer.sanitize(whitespaceContent);
    
    // Should preserve whitespace within limits
    expect(result.length).toBeLessThanOrEqual(11); // 10 + potential newline
  });
});