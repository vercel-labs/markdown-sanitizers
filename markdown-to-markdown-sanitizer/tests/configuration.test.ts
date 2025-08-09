import { describe, expect, test } from "vitest";
import { MarkdownSanitizer, sanitizeMarkdown } from "../src/index";

describe("Configuration Options", () => {
  describe("URL Prefix Configuration", () => {
    test("allows different prefixes for links and images", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        allowedLinkPrefixes: ["https://links.com"],
        allowedImagePrefixes: ["https://images.com"],
      });

      const input =
        "[Link](https://links.com/page) ![Image](https://images.com/pic.jpg)";
      const result = sanitizer.sanitize(input);

      expect(result).toBe(
        "[Link](https://links.com/page) ![Image](https://images.com/pic.jpg)\n"
      );
    });

    test("blocks links not in allowedLinkPrefixes", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        allowedLinkPrefixes: ["https://allowed.com"],
        allowedImagePrefixes: ["https://images.com"],
      });

      const input = "[Link](https://blocked.com/page)";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("[Link](#)\n");
    });

    test("blocks images not in allowedImagePrefixes", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        allowedLinkPrefixes: ["https://links.com"],
        allowedImagePrefixes: ["https://allowed-images.com"],
      });

      const input = "![Image](https://blocked-images.com/pic.jpg)";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("![Image](/forbidden)\n");
    });

    test("handles protocol-only prefixes", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        allowedLinkPrefixes: ["https:"],
        allowedImagePrefixes: ["https:"],
      });

      const input =
        "[HTTPS Link](https://any-https-site.com) [HTTP Link](http://insecure.com)";
      const result = sanitizer.sanitize(input);

      expect(result).toBe(
        "[HTTPS Link](https://any-https-site.com/) [HTTP Link](#)\n"
      );
    });

    test("handles protocol with slashes prefixes", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        allowedLinkPrefixes: ["https://"],
        allowedImagePrefixes: ["https://"],
      });

      const input = "[HTTPS](https://secure.com) [FTP](ftp://files.com)";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("[HTTPS](https://secure.com/) [FTP](#)\n");
    });
  });

  describe("Default Origin Configuration", () => {
    test("uses defaultOrigin for relative URLs", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://mysite.com",
        allowedLinkPrefixes: ["https://mysite.com"],
        allowedImagePrefixes: ["https://mysite.com"],
      });

      const input = "[Relative](/page) ![Relative](/image.jpg)";
      const result = sanitizer.sanitize(input);

      expect(result).toBe(
        "[Relative](https://mysite.com/page) ![Relative](https://mysite.com/image.jpg)\n"
      );
    });

    test("uses defaultLinkOrigin for relative links when specified", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        defaultLinkOrigin: "https://links.example.com",
        allowedLinkPrefixes: ["https://links.example.com"],
        allowedImagePrefixes: ["https://example.com"],
      });

      const input = "[Relative](/page)";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("[Relative](https://links.example.com/page)\n");
    });

    test("uses defaultImageOrigin for relative images when specified", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        defaultImageOrigin: "https://cdn.example.com",
        allowedLinkPrefixes: ["https://example.com"],
        allowedImagePrefixes: ["https://cdn.example.com"],
      });

      const input = "![Relative](/image.jpg)";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("![Relative](https://cdn.example.com/image.jpg)\n");
    });

    test("overrides defaultOrigin with specific origins", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        defaultLinkOrigin: "https://links.example.com",
        defaultImageOrigin: "https://images.example.com",
        allowedLinkPrefixes: ["https://links.example.com"],
        allowedImagePrefixes: ["https://images.example.com"],
      });

      const input = "[Link](/page) ![Image](/pic.jpg)";
      const result = sanitizer.sanitize(input);

      expect(result).toBe(
        "[Link](https://links.example.com/page) ![Image](https://images.example.com/pic.jpg)\n"
      );
    });
  });

  describe("HTML Sanitization Configuration", () => {
    test("enables HTML sanitization by default", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        allowedLinkPrefixes: ["https://example.com"],
      });

      const input = '<script>alert("xss")</script><strong>Safe</strong>';
      const result = sanitizer.sanitize(input);

      expect(result).toBe("**Safe**\n");
    });
  });

  describe("Empty and Undefined Configuration", () => {
    test("handles empty allowedLinkPrefixes array", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        allowedLinkPrefixes: [],
        allowedImagePrefixes: ["https://images.com"],
      });

      const input = "[Link](https://example.com/page)";
      const result = sanitizer.sanitize(input);

      expect(result).toContain("[Link](#)");
    });

    test("handles empty allowedImagePrefixes array", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        allowedLinkPrefixes: ["https://example.com"],
        allowedImagePrefixes: [],
      });

      const input = "![Image](https://example.com/image.jpg)";
      const result = sanitizer.sanitize(input);

      expect(result).toContain("![Image](/forbidden)");
    });

    test("blocks all links when allowedLinkPrefixes is empty array", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        allowedLinkPrefixes: [],
        allowedImagePrefixes: ["https://images.com"],
      });

      const input = "[GitHub](https://github.com) [Example](https://example.com) [Relative](/page)";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("[GitHub](#) [Example](#) [Relative](#)\n");
    });

    test("blocks all images when allowedImagePrefixes is empty array", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        allowedLinkPrefixes: ["https://example.com"],
        allowedImagePrefixes: [],
      });

      const input = "![GitHub](https://github.com/image.png) ![Example](https://example.com/image.jpg) ![Relative](/image.svg)";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("![GitHub](/forbidden) ![Example](/forbidden) ![Relative](/forbidden)\n");
    });

    test("blocks both links and images when both allow-lists are empty", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        allowedLinkPrefixes: [],
        allowedImagePrefixes: [],
      });

      const input = `# Test Document
[GitHub Link](https://github.com/repo)
![GitHub Image](https://github.com/image.png)
[Relative Link](/page)
![Relative Image](/image.jpg)`;

      const result = sanitizer.sanitize(input);

      expect(result).toContain("[GitHub Link](#)");
      expect(result).toContain("![GitHub Image](/forbidden)");
      expect(result).toContain("[Relative Link](#)");
      expect(result).toContain("![Relative Image](/forbidden)");
    });

    test("handles undefined allowedLinkPrefixes", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        allowedImagePrefixes: ["https://images.com"],
      });

      const input = "[Link](https://example.com/page)";
      const result = sanitizer.sanitize(input);

      expect(result).toContain("[Link](#)");
    });

    test("handles undefined allowedImagePrefixes", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        allowedLinkPrefixes: ["https://example.com"],
      });

      const input = "![Image](https://example.com/image.jpg)";
      const result = sanitizer.sanitize(input);

      expect(result).toContain("![Image](/forbidden)");
    });
  });

  describe("Complex Prefix Patterns", () => {
    test("handles domain-specific prefixes", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        allowedLinkPrefixes: [
          "https://example.com",
          "https://subdomain.example.com",
          "https://trusted.org",
        ],
        allowedImagePrefixes: [
          "https://cdn.example.com",
          "https://images.trusted.org",
        ],
      });

      const tests = [
        {
          input: "[Link1](https://example.com/page)",
          expected: "https://example.com/page",
        },
        {
          input: "[Link2](https://subdomain.example.com/page)",
          expected: "https://subdomain.example.com/page",
        },
        {
          input: "[Link3](https://trusted.org/page)",
          expected: "https://trusted.org/page",
        },
        { input: "[Link4](https://untrusted.com/page)", expected: "#" },
        {
          input: "![Img1](https://cdn.example.com/pic.jpg)",
          expected: "https://cdn.example.com/pic.jpg",
        },
        {
          input: "![Img2](https://images.trusted.org/pic.jpg)",
          expected: "https://images.trusted.org/pic.jpg",
        },
        {
          input: "![Img3](https://untrusted.com/pic.jpg)",
          expected: "/forbidden",
        },
      ];

      tests.forEach(({ input, expected }) => {
        const result = sanitizer.sanitize(input);
        if (expected === "#") {
          expect(result).toContain("](#)");
        } else if (expected === "/forbidden") {
          expect(result).toContain("](/forbidden)");
        } else {
          expect(result).toContain(`](${expected})`);
        }
      });
    });

    test("handles path-specific prefixes", () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: "https://example.com",
        allowedLinkPrefixes: [
          "https://example.com/safe",
          "https://example.com/api/v1",
        ],
        allowedImagePrefixes: ["https://example.com/images"],
      });

      const tests = [
        {
          input: "[Safe](https://example.com/safe/page)",
          expected: "https://example.com/safe/page",
        },
        {
          input: "[API](https://example.com/api/v1/endpoint)",
          expected: "https://example.com/api/v1/endpoint",
        },
        { input: "[Unsafe](https://example.com/dangerous)", expected: "#" },
        {
          input: "![Safe](https://example.com/images/pic.jpg)",
          expected: "https://example.com/images/pic.jpg",
        },
        {
          input: "![Unsafe](https://example.com/other/pic.jpg)",
          expected: "/forbidden",
        },
      ];

      tests.forEach(({ input, expected }) => {
        const result = sanitizer.sanitize(input);
        if (expected === "#") {
          expect(result).toContain("](#)");
        } else if (expected === "/forbidden") {
          expect(result).toContain("](/forbidden)");
        } else {
          expect(result).toContain(`](${expected})`);
        }
      });
    });
  });

  describe("Convenience Function Configuration", () => {
    test("sanitizeMarkdown function works with options", () => {
      const input =
        "[Link](https://example.com/page) ![Image](https://evil.com/tracker.gif)";
      const result = sanitizeMarkdown(input, {
        defaultOrigin: "https://example.com",
        allowedLinkPrefixes: ["https://example.com"],
        allowedImagePrefixes: ["https://images.com"],
      });

      expect(result).toContain("[Link](https://example.com/page)");
      expect(result).toContain("![Image](/forbidden)");
    });
  });
});
