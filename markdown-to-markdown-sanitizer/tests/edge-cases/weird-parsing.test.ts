import { describe, expect, test } from "vitest";
import { MarkdownSanitizer } from "../../src/index";

describe("Weird Parsing Edge Cases", () => {
  const createSanitizer = (options = {}) =>
    new MarkdownSanitizer({
      defaultOrigin: "https://example.com",
      allowedLinkPrefixes: ["https://example.com", "https://trusted.org"],
      allowedImagePrefixes: ["https://example.com", "https://images.com"],
      html: { enabled: true },
      ...options,
    });

  const sanitize = (input: string, options = {}) => {
    return createSanitizer(options).sanitize(input);
  };

  describe("Ambiguous syntax resolution", () => {
    test("text that could be interpreted multiple ways", () => {
      const input = "Price: $[100] or *special* offer: 50% off!";
      const result = sanitize(input);
      expect(result).toBe("Price: $\\[100] or *special* offer: 50% off!\n");
    });

    test("URL-like text that is not a link", () => {
      const input = "Visit https://example.com or call 555-1234";
      const result = sanitize(input);
      expect(result).toBe("Visit https://example.com or call 555-1234\n");
    });

    test("emphasis markers in unexpected contexts", () => {
      const input = "Math: 2*3*4 = 24 and _constant_ = 42";
      const result = sanitize(input);
      expect(result).toBe("Math: 2*3*4 = 24 and *constant* = 42\n");
    });

    test("code-like text without backticks", () => {
      const input = 'Use document.getElementById("test") to get element';
      const result = sanitize(input);
      expect(result).toBe(
        'Use document.getElementById("test") to get element\n',
      );
    });
  });

  describe("Boundary condition parsing", () => {
    test("markdown at start and end of input", () => {
      const input =
        "[Start](https://example.com) middle text [End](https://trusted.org)";
      const result = sanitize(input);
      expect(result).toBe(
        "[Start](https://example.com/) middle text [End](https://trusted.org/)\n",
      );
    });

    test("empty link text and URLs", () => {
      const input = "[](https://example.com) and [text]()";
      const result = sanitize(input);
      expect(result).toBe("[](https://example.com/) and [text]()\n");
    });

    test("single character elements", () => {
      const input =
        "[a](https://example.com) ![b](https://images.com/c.jpg) *d* **e**";
      const result = sanitize(input);
      expect(result).toBe(
        "[a](https://example.com/) ![b](https://images.com/c.jpg) *d* **e**\n",
      );
    });

    test("adjacent syntax elements", () => {
      const input =
        "[Link1](https://example.com)[Link2](https://trusted.org)![Img](https://images.com/pic.jpg)";
      const result = sanitize(input);
      expect(result).toBe(
        "[Link1](https://example.com/)[Link2](https://trusted.org/)![Img](https://images.com/pic.jpg)\n",
      );
    });
  });

  describe("Unicode and international character handling", () => {
    test("unicode in link text and URLs", () => {
      const input =
        "[测试链接](https://example.com/测试) and [🔗emoji](https://example.com/emoji)";
      const result = sanitize(input);
      expect(result).toBe(
        "[测试链接](https://example.com/%E6%B5%8B%E8%AF%95) and [🔗emoji](https://example.com/emoji)\n",
      );
    });

    test("right-to-left text with markdown", () => {
      const input =
        "[العربية](https://example.com/arabic) النص العربي مع **تأكيد**";
      const result = sanitize(input);
      expect(result).toBe(
        "[العربية](https://example.com/arabic) النص العربي مع **تأكيد**\n",
      );
    });

    test("mixed scripts and directions", () => {
      const input = "[English العربية 中文](https://example.com) mixed text";
      const result = sanitize(input);
      expect(result).toBe(
        "[English العربية 中文](https://example.com/) mixed text\n",
      );
    });

    test("zero-width characters and invisible unicode", () => {
      const input =
        "[Link\u200Btext](https://example.com) and \u200Dinvisible chars";
      const result = sanitize(input);
      expect(result).toBe(
        "[Link\u200Btext](https://example.com/) and \u200Dinvisible chars\n",
      );
    });
  });

  describe("Numeric and mathematical notation", () => {
    test("mathematical expressions with markdown-like syntax", () => {
      const input = "Formula: f(x) = x*2 + [constant] where *x* > 0";
      const result = sanitize(input);
      expect(result).toBe(
        "Formula: f(x) = x\\*2 + \\[constant] where *x* &gt; 0\n",
      );
    });

    test("scientific notation and formulas", () => {
      const input = "E = mc^2 and 1.23e-4 is scientific notation";
      const result = sanitize(input);
      expect(result).toBe("E = mc^2 and 1.23e-4 is scientific notation\n");
    });

    test("currency and financial notation", () => {
      const input = "Price: $100.50 or €75,00 with [link](https://example.com)";
      const result = sanitize(input);
      expect(result).toBe(
        "Price: $100.50 or €75,00 with [link](https://example.com/)\n",
      );
    });
  });

  describe("Code and programming text", () => {
    test("code-like syntax without code blocks", () => {
      const input = 'Use getElementById("test") or querySelector("[data-id]")';
      const result = sanitize(input);
      expect(result).toBe(
        'Use getElementById("test") or querySelector("\\[data-id]")\n',
      );
    });

    test("regex patterns with markdown-like characters", () => {
      const input = "Pattern: /[a-z]*\\d+/ matches text";
      const result = sanitize(input);
      expect(result).toBe("Pattern: /\\[a-z]\\*\\d+/ matches text\n");
    });

    test("file paths with brackets and special chars", () => {
      const input =
        "Path: /home/user/[config]/file.txt and C:\\\\Program Files\\\\App";
      const result = sanitize(input);
      expect(result).toBe(
        "Path: /home/user/\\[config]/file.txt and C:\\Program Files\\App\n",
      );
    });
  });

  describe("Nested quotation and citation patterns", () => {
    test("multiple quote levels", () => {
      const input =
        "He said \"She said '[link](https://example.com)' was good\"";
      const result = sanitize(input);
      expect(result).toBe(
        "He said \"She said '[link](https://example.com/)' was good\"\n",
      );
    });

    test("citation-like brackets", () => {
      const input = "According to research [1] and studies [2][3]";
      const result = sanitize(input);
      expect(result).toBe(
        "According to research \\[1] and studies \\[2]\\[3]\n",
      );
    });

    test("academic reference formatting", () => {
      const input =
        "See [Smith et al., 2023](https://example.com/paper) for details";
      const result = sanitize(input);
      expect(result).toBe(
        "See [Smith et al., 2023](https://example.com/paper) for details\n",
      );
    });
  });

  describe("HTML-like text that is not HTML", () => {
    test("XML-like tags in text", () => {
      const input =
        'Use <component prop="value"> in React or <tag>content</tag>';
      const result = sanitize(input);
      expect(result).toBe("Use  in React or content\n");
    });

    test("template engine syntax", () => {
      const input =
        "Template: {{variable}} or {%tag%} and [link](https://example.com)";
      const result = sanitize(input);
      expect(result).toBe("  or {%tag%} and [link](https://example.com/)\n");
    });

    test("pseudo-HTML comments", () => {
      const input =
        "Text <!-- not really a comment --> with [link](https://example.com)";
      const result = sanitize(input);
      expect(result).toBe("Text  with [link](https://example.com/)\n");
    });
  });

  describe("Time, date, and formatted text", () => {
    test("timestamps and dates", () => {
      const input =
        "Date: 2023-12-01 12:34:56 or [formatted](https://example.com)";
      const result = sanitize(input);
      expect(result).toBe(
        "Date: 2023-12-01 12:34:56 or [formatted](https://example.com/)\n",
      );
    });

    test("phone numbers and addresses", () => {
      const input =
        "Call (555) 123-4567 or visit [office](https://example.com)";
      const result = sanitize(input);
      expect(result).toBe(
        "Call (555) 123-4567 or visit [office](https://example.com/)\n",
      );
    });

    test("coordinates and measurements", () => {
      const input =
        "Location: 40.7128°N, 74.0060°W with [map](https://example.com)";
      const result = sanitize(input);
      expect(result).toBe(
        "Location: 40.7128°N, 74.0060°W with [map](https://example.com/)\n",
      );
    });
  });

  describe("Social media and modern text patterns", () => {
    test("hashtags and mentions", () => {
      const input =
        "Follow @user or check #hashtag with [link](https://example.com)";
      const result = sanitize(input);
      expect(result).toBe(
        "Follow @user or check #hashtag with [link](https://example.com/)\n",
      );
    });

    test("email addresses in text", () => {
      const input =
        "Contact user@example.com or [support](https://example.com/contact)";
      const result = sanitize(input);
      expect(result).toBe(
        "Contact user@example.com or [support](https://example.com/contact)\n",
      );
    });

    test("emoji combinations with markdown", () => {
      const input =
        "🚀 [Launch site](https://example.com) 🎉 **celebration** 🎊";
      const result = sanitize(input);
      expect(result).toBe(
        "🚀 [Launch site](https://example.com/) 🎉 **celebration** 🎊\n",
      );
    });
  });

  describe("Edge cases with line breaks and formatting", () => {
    test("mixed line endings", () => {
      const input =
        "[Link1](https://example.com)\\r\\n[Link2](https://trusted.org)\\n";
      const result = sanitize(input);
      expect(result).toBe(
        "[Link1](https://example.com/)\\r\\n[Link2](https://trusted.org/)\\n\n",
      );
    });

    test("trailing whitespace with markdown", () => {
      const input = "[Link](https://example.com)   \\n**Bold**  ";
      const result = sanitize(input);
      expect(result).toBe("[Link](https://example.com/)   \\n**Bold**\n");
    });

    test("indentation and spacing patterns", () => {
      const input =
        "    [Indented link](https://example.com)\\n        **More indent**";
      const result = sanitize(input);
      expect(result).toBe(
        "```\n[Indented link](https://example.com)\\n        **More indent**\n```\n",
      );
    });
  });

  describe("Complex real-world scenarios", () => {
    test("documentation-style text", () => {
      const input =
        "API endpoint: GET /api/v1/users[?limit=10] - see [docs](https://example.com/api)";
      const result = sanitize(input);
      expect(result).toBe(
        "API endpoint: GET /api/v1/users\\[?limit=10] - see [docs](https://example.com/api)\n",
      );
    });

    test("changelog or version text", () => {
      const input =
        "## Version 1.2.3 [2023-12-01]\\n- Fixed [issue #123](https://example.com/issue)";
      const result = sanitize(input);
      expect(result).toBe(
        "## Version 1.2.3 \\[2023-12-01]\\n- Fixed [issue #123](https://example.com/issue)\n",
      );
    });

    test("mixed content with various syntax", () => {
      const input =
        'Config: {key: "value"} or [JSON](https://example.com) **important** note!';
      const result = sanitize(input);
      expect(result).toBe(
        'Config: {key: "value"} or [JSON](https://example.com/) **important** note!\n',
      );
    });
  });
});
