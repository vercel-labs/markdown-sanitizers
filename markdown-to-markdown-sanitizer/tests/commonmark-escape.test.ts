import { describe, expect, test } from "vitest";
import { commonmarkEscape } from "../src/index.js";

describe("commonmarkEscape Function", () => {
  describe("Basic Character Escaping", () => {
    test("escapes single special characters", () => {
      expect(commonmarkEscape("!")).toBe("\\!");
      expect(commonmarkEscape("#")).toBe("\\#");
      expect(commonmarkEscape("*")).toBe("\\*");
      expect(commonmarkEscape("[")).toBe("\\[");
      expect(commonmarkEscape("]")).toBe("\\]");
      expect(commonmarkEscape("`")).toBe("\\`");
      expect(commonmarkEscape("_")).toBe("\\_");
      expect(commonmarkEscape("~")).toBe("\\~");
    });

    test("escapes all CommonMark punctuation characters", () => {
      const punctuation = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
      const result = commonmarkEscape(punctuation);
      // Each character should be escaped
      expect(result).toBe("\\!\\\"\\#\\$\\%\\&\\'\\(\\)\\*\\+\\,\\-\\.\\/" +
                         "\\:\\;\\<\\=\\>\\?\\@\\[\\]\\^\\_\\`\\{\\|\\}\\~");
    });

    test("leaves regular text unchanged", () => {
      expect(commonmarkEscape("hello world")).toBe("hello world");
      expect(commonmarkEscape("ABC123")).toBe("ABC123");
      expect(commonmarkEscape("spaces and words")).toBe("spaces and words");
    });

    test("preserves spaces and newlines", () => {
      expect(commonmarkEscape("text with spaces")).toBe("text with spaces");
      expect(commonmarkEscape("line1\nline2")).toBe("line1\nline2");
      expect(commonmarkEscape("  leading spaces")).toBe("  leading spaces");
      expect(commonmarkEscape("trailing spaces  ")).toBe("trailing spaces  ");
    });
  });

  describe("Backslash Handling", () => {
    test("handles double backslashes (escaped backslash)", () => {
      expect(commonmarkEscape("\\\\")).toBe("\\\\");
      expect(commonmarkEscape("text\\\\more")).toBe("text\\\\more");
      expect(commonmarkEscape("\\\\\\\\")).toBe("\\\\\\\\"); // Four backslashes stay as four
    });

    test("preserves valid escape sequences", () => {
      expect(commonmarkEscape("\\*")).toBe("\\*"); // Already escaped asterisk
      expect(commonmarkEscape("\\!")).toBe("\\!"); // Already escaped exclamation
      expect(commonmarkEscape("\\#")).toBe("\\#"); // Already escaped hash
      expect(commonmarkEscape("\\[")).toBe("\\["); // Already escaped bracket
    });

    test("handles backslash before non-escapable characters", () => {
      expect(commonmarkEscape("\\a")).toBe("\\a"); // Backslash before 'a' stays literal
      expect(commonmarkEscape("\\1")).toBe("\\1"); // Backslash before digit stays literal
      expect(commonmarkEscape("\\z")).toBe("\\z"); // Backslash before letter stays literal
      expect(commonmarkEscape("\\ ")).toBe("\\ "); // Backslash before space stays literal
    });

    test("handles backslash at end of string", () => {
      expect(commonmarkEscape("text\\")).toBe("text\\");
    });

    test("handles complex backslash sequences", () => {
      expect(commonmarkEscape("\\\\*")).toBe("\\\\\\*"); // Escaped backslash + asterisk that needs escaping
      expect(commonmarkEscape("\\\\\\*")).toBe("\\\\\\*"); // Escaped backslash + already escaped asterisk
      expect(commonmarkEscape("*\\\\")).toBe("\\*\\\\"); // Asterisk + escaped backslash
    });
  });

  describe("Mixed Content", () => {
    test("handles text with mixed special characters", () => {
      expect(commonmarkEscape("Hello *world* with `code`")).toBe("Hello \\*world\\* with \\`code\\`");
      expect(commonmarkEscape("# Header")).toBe("\\# Header");
      expect(commonmarkEscape("[link](url)")).toBe("\\[link\\]\\(url\\)");
    });

    test("handles already partially escaped content", () => {
      expect(commonmarkEscape("\\*bold* text")).toBe("\\*bold\\* text");
      expect(commonmarkEscape("Some \\# heading")).toBe("Some \\# heading");
    });

    test("handles complex markdown syntax", () => {
      expect(commonmarkEscape("![image](url)")).toBe("\\!\\[image\\]\\(url\\)");
      expect(commonmarkEscape("**bold** and _italic_")).toBe("\\*\\*bold\\*\\* and \\_italic\\_");
      expect(commonmarkEscape("> quote")).toBe("\\> quote");
    });
  });

  describe("Edge Cases", () => {
    test("handles empty string", () => {
      expect(commonmarkEscape("")).toBe("");
    });

    test("handles single characters", () => {
      expect(commonmarkEscape("a")).toBe("a");
      expect(commonmarkEscape("*")).toBe("\\*");
      expect(commonmarkEscape("\\")).toBe("\\");
    });

    test("handles strings with only special characters", () => {
      expect(commonmarkEscape("***")).toBe("\\*\\*\\*");
      expect(commonmarkEscape("###")).toBe("\\#\\#\\#");
      expect(commonmarkEscape("---")).toBe("\\-\\-\\-");
    });

    test("handles unicode and non-ASCII characters", () => {
      expect(commonmarkEscape("café")).toBe("café"); // Non-ASCII letters unchanged
      expect(commonmarkEscape("Hello 世界")).toBe("Hello 世界"); // Unicode unchanged
      expect(commonmarkEscape("emoji 🚀 *test*")).toBe("emoji 🚀 \\*test\\*");
    });

    test("handles very long strings", () => {
      const longString = "a".repeat(1000) + "*" + "b".repeat(1000);
      const expected = "a".repeat(1000) + "\\*" + "b".repeat(1000);
      expect(commonmarkEscape(longString)).toBe(expected);
    });
  });

  describe("CommonMark Specification Compliance", () => {
    test("handles example cases from CommonMark spec", () => {
      // Based on CommonMark spec examples
      expect(commonmarkEscape("\\!\\\"\\#\\$\\%\\&\\'\\(\\)\\*\\+\\,\\-\\.\\/" +
                              "\\:\\;\\<\\=\\>\\?\\@\\[\\\\\\]\\^\\_\\`\\{\\|\\}\\~"))
        .toBe("\\!\\\"\\#\\$\\%\\&\\'\\(\\)\\*\\+\\,\\-\\.\\/" +
              "\\:\\;\\<\\=\\>\\?\\@\\[\\\\\\]\\^\\_\\`\\{\\|\\}\\~");
    });

    test("preserves already properly escaped sequences", () => {
      const input = "This is \\*not emphasis\\*, and \\<br/\\> is not a tag.";
      expect(commonmarkEscape(input)).toBe("This is \\*not emphasis\\*\\, and \\<br\\/\\> is not a tag\\.");
    });

    test("handles nested escaping scenarios", () => {
      expect(commonmarkEscape("\\\\\\*")).toBe("\\\\\\*"); // Escaped backslash + escaped asterisk
      expect(commonmarkEscape("\\\\*")).toBe("\\\\\\*"); // Escaped backslash + unescaped asterisk
    });
  });
});