import { describe, expect, test } from "vitest";
import { MarkdownSanitizer } from "../src/index";

describe("Debug HTML Fragmentation", () => {
  const sanitizer = new MarkdownSanitizer({
    defaultOrigin: "https://example.com",
    allowedLinkPrefixes: ["https://example.com"],
    allowedImagePrefixes: ["https://example.com"],
  });

  test("simple HTML tag", () => {
    const input = '<strong>Safe HTML</strong>';
    const result = sanitizer.sanitize(input);
    console.log('Input:', input);
    console.log('Output:', JSON.stringify(result));
    console.log('Raw output:', result);
    
    // HTML is converted to markdown
    expect(result).toBe('**Safe HTML**\n');
  });

  test("plain text comparison", () => {
    const input = 'Compare 5 < 10';
    const result = sanitizer.sanitize(input);
    console.log('Plain text input:', input);
    console.log('Plain text output:', JSON.stringify(result));
    
    // Plain text with < character is properly escaped
    expect(result).toBe('Compare 5 \\< 10\n');
  });
});