import { describe, expect, test } from "vitest";
import { MarkdownSanitizer } from "../src/index";
import { JSDOM } from "jsdom";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { marked } from "marked";
import MarkdownIt from "markdown-it";
import { Converter as ShowdownConverter } from "showdown";
import { Parser as CommonMarkParser, HtmlRenderer } from "commonmark";
import fs from "fs";
import path from "path";

const allowedElements = new Set(
  [
    "a",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "img",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "hr",
    "table",
    "tbody",
    "thead",
    "tfoot",
    "tr",
    "td",
    "th",
    "span",
    "br",
    "div",
    "html",
    "body",
    "head",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "s",
    "sup",
    "sub",
    "small",
    "big",
    "del",
  ].map((element) => element.toUpperCase()),
);

const allowedAttributes = new Set(["href", "src", "alt", "title", "class"]);

describe("Markdown Sanitizer Bypass Attempts", () => {
  const trustedOrigins = [
    "https://example.com/",
    "https://trusted.org/",
    "https://images.com/",
    "https://prefix.com/",
  ];
  const createSanitizer = (options = {}) =>
    new MarkdownSanitizer({
      defaultOrigin: "https://example.com",
      allowedLinkPrefixes: ["https://example.com", "https://trusted.org"],
      allowedImagePrefixes: [
        "https://example.com",
        "https://images.com",
        "https://prefix.com/prefix/",
      ],
      ...options,
    });

  // Multiple markdown renderers to test against
  const renderers = {
    remark: async (markdown: string) => {
      const html = await remark()
        .use(remarkHtml, { allowDangerousHtml: true })
        .process(markdown);
      return html.toString();
    },

    marked: async (markdown: string) => {
      return marked(markdown, {
        gfm: true,
        breaks: false,
      });
    },

    "markdown-it": async (markdown: string) => {
      const md = new MarkdownIt({
        html: true,
        linkify: false,
        typographer: false,
      });
      return md.render(markdown);
    },

    showdown: async (markdown: string) => {
      const converter = new ShowdownConverter({
        noHeaderId: true,
        ghCodeBlocks: true,
        parseImgDimensions: true,
        simplifiedAutoLink: true,
        literalMidWordUnderscores: true,
        strikethrough: true,
        tables: true,
        tasklists: true,
      });
      return converter.makeHtml(markdown);
    },

    commonmark: async (markdown: string) => {
      const parser = new CommonMarkParser();
      const renderer = new HtmlRenderer({ safe: false });
      const parsed = parser.parse(markdown);
      return renderer.render(parsed);
    },

    commonmarkWithCommonmarkEscape: async (markdown: string) => {
      const parser = new CommonMarkParser();
      const renderer = new HtmlRenderer({ safe: false });
      const parsed = parser.parse(markdown);
      return renderer.render(parsed);
    },
  };

  const sanitizeAndRenderToHtml = async (
    markdown: string,
    rendererName: string,
    options = {},
  ) => {
    const sanitizer = createSanitizer(options);
    const sanitized = sanitizer.sanitize(markdown);

    const renderer = renderers[rendererName as keyof typeof renderers];
    if (!renderer) {
      throw new Error(`Unknown renderer: ${rendererName}`);
    }

    const html = await renderer(sanitized);
    return {
      html,
      sanitized,
    };
  };

  const validateHtml = (html: string) => {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const issues: string[] = [];

    // Check all elements with src attributes
    const srcElements = document.querySelectorAll("[src]");
    srcElements.forEach((element) => {
      const src = element.getAttribute("src");
      if (!src) {
        return;
      }
      const issue = isDangerousUrl(src);
      if (issue) {
        issues.push(
          `Dangerous src attribute found: ${src} (${issue}): ${element.outerHTML}`,
        );
      }
    });

    // Check all elements with href attributes
    const hrefElements = document.querySelectorAll("[href]");
    hrefElements.forEach((element) => {
      const href = element.getAttribute("href");
      if (!href) {
        return;
      }
      const issue = isDangerousUrl(href);
      if (issue) {
        issues.push(
          `Dangerous href attribute found: ${href} (${issue}): ${element.outerHTML}`,
        );
      }
    });

    const allElements = document.querySelectorAll("*");
    allElements.forEach((element) => {
      const attributes = element.attributes;
      for (let i = 0; i < attributes.length; i++) {
        const attr = attributes[i];
        if (!allowedAttributes.has(attr.name.toLowerCase())) {
          issues.push(
            `Illegal attribute found: ${attr.name}="${attr.value}": ${element.outerHTML}`,
          );
        }
      }
    });

    const forbiddenElements = Array.from(document.querySelectorAll("*")).filter(
      (element) => !allowedElements.has(element.tagName),
    );
    if (forbiddenElements.length > 0) {
      issues.push(
        `Forbidden elements found: ${forbiddenElements
          .map((element) => element.tagName)
          .join(", ")}: ${forbiddenElements
          .map((element) => element.outerHTML)
          .join("\n")}`,
      );
    }

    return issues;
  };

  const isDangerousUrl = (url: string): false | string => {
    if (url === "/forbidden") {
      return false;
    }

    if (url === "#") {
      return false;
    }

    // Allow hash-only fragments (in-page navigation)
    // These are safe because they're just fragment identifiers, not executable URLs
    if (url.startsWith("#")) {
      return false;
    }

    try {
      const parsedUrl = new URL(url);

      // Check if protocol is dangerous
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        return "bad protocol";
      }

      if (parsedUrl.origin === new URL("https://prefix.com/").origin) {
        if (!parsedUrl.href.startsWith("https://prefix.com/prefix/")) {
          return "prefix bypass";
        }
        if (!url.startsWith("https://prefix.com/prefix/")) {
          return "prefix bypass";
        }
      }

      // Check if origin is trusted
      const isTrustedOrigin = trustedOrigins.some((origin) => {
        const trustedUrl = new URL(origin);
        return trustedUrl.origin === parsedUrl.origin;
      });

      if (!isTrustedOrigin) {
        return "untrusted origin";
      }

      return false;
    } catch {
      // If URL parsing fails, consider it dangerous
      return "url parsing failed";
    }
  };

  describe("Individual Bypass Files", () => {
    const bypassDir = path.join(__dirname, "bypass-attempts");

    // Read all markdown files from bypass-attempts directory
    let files = fs
      .readdirSync(bypassDir)
      .filter((file) => file.endsWith(".md"))
      .sort();

    // If SINGLE_BYPASS_FILE is set, only run that specific file
    const singleFile = process.env.SINGLE_BYPASS_FILE;
    if (singleFile) {
      const targetFile = singleFile.endsWith(".md")
        ? singleFile
        : `${singleFile}.md`;
      if (files.includes(targetFile)) {
        files = [targetFile];
        console.log(`Running single bypass file: ${targetFile}`);
      } else {
        console.log(
          `Warning: File ${targetFile} not found. Available files:`,
          files.slice(0, 5),
          "...",
        );
      }
    }

    const rendererNames = Object.keys(renderers);

    let ranCommonMarkEscapeTest = false;

    files.forEach((file) => {
      describe(file, () => {
        rendererNames.forEach((rendererName) => {
          test(`should sanitize with ${rendererName}`, async () => {
            const filePath = path.join(bypassDir, file);
            const markdown = fs.readFileSync(filePath, "utf-8");

            const sanitizeOptions =
              rendererName === "commonmarkWithCommonmarkEscape"
                ? { sanitizeForCommonmark: true }
                : {};

            if (sanitizeOptions.sanitizeForCommonmark) {
              ranCommonMarkEscapeTest = true;
            }

            // Sanitize and render to HTML using specific renderer
            const { html, sanitized } = await sanitizeAndRenderToHtml(
              markdown,
              rendererName,
              sanitizeOptions,
            );

            // Validate the HTML
            const issues = validateHtml(html);

            // Log details for debugging
            if (issues.length > 0) {
              console.log(`\nFile: ${file} | Renderer: ${rendererName}`);
              console.log(
                "\n\n##########################\nOriginal markdown:",
                markdown,
              );
              console.log(
                "\n\n##########################\nSanitized markdown:",
                sanitized,
              );
              console.log(
                "\n\n##########################\nRendered HTML:",
                html,
              );
              console.log(
                "\n\n##########################\nIssues found:",
                issues,
              );
            }

            // Assert no dangerous content made it through
            expect(issues).toEqual([]);
          });
        });
      });
    });
    test("should have run the commonmark escape test", () => {
      expect(ranCommonMarkEscapeTest).toBe(true);
    });
  });

  describe("Sanity checks of validateHtml", () => {
    test("should detect script tags", () => {
      const html = "<script>alert('xss')</script>";
      const issues = validateHtml(html);
      expect(issues.join(",")).toEqual(
        "Forbidden elements found: SCRIPT: <script>alert('xss')</script>",
      );
    });

    test("should detect style tags", () => {
      const html = "<style>body { background-color: red; }</style>";
      const issues = validateHtml(html);
      expect(issues.join(",")).toEqual(
        "Forbidden elements found: STYLE: <style>body { background-color: red; }</style>",
      );
    });

    test("should detect iframe tags", () => {
      const html = "<iframe src='https://example.com'></iframe>";
      const issues = validateHtml(html);
      expect(issues.join(",")).toEqual(
        `Forbidden elements found: IFRAME: <iframe src="https://example.com"></iframe>`,
      );
    });

    test("should detect bad attributes", () => {
      const html = "<h1 onclick='alert(\"xss\")'>Hello</h1>";
      const issues = validateHtml(html);
      expect(issues.join(",")).toEqual(
        `Illegal attribute found: onclick="alert("xss")": <h1 onclick="alert(&quot;xss&quot;)">Hello</h1>`,
      );
    });

    test("should detect bad image src", () => {
      const html = "<img src='https://evil.com/xss.png'>";
      const issues = validateHtml(html);
      expect(issues.join(",")).toEqual(
        `Dangerous src attribute found: https://evil.com/xss.png (untrusted origin): <img src="https://evil.com/xss.png">`,
      );
    });
  });
});
