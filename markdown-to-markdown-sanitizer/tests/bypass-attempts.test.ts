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

describe("Markdown Sanitizer Bypass Attempts", () => {
  const trustedOrigins = [
    "https://example.com/",
    "https://trusted.org/",
    "https://images.com/",
  ];
  const createSanitizer = (options = {}) =>
    new MarkdownSanitizer({
      defaultOrigin: "https://example.com",
      allowedLinkPrefixes: ["https://example.com", "https://trusted.org"],
      allowedImagePrefixes: ["https://example.com", "https://images.com"],
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
  };

  const sanitizeAndRenderToHtml = async (
    markdown: string,
    rendererName: string,
    options = {}
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
          `Dangerous src attribute found: ${src} (${issue}): ${element.outerHTML}`
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
          `Dangerous href attribute found: ${href} (${issue}): ${element.outerHTML}`
        );
      }
    });

    // Check for event handlers
    const allElements = document.querySelectorAll("*");
    allElements.forEach((element) => {
      const attributes = element.attributes;
      for (let i = 0; i < attributes.length; i++) {
        const attr = attributes[i];
        if (attr.name.startsWith("on")) {
          issues.push(
            `Event handler found: ${attr.name}="${attr.value}": ${element.outerHTML}`
          );
        }
      }
    });

    // Check for script tags
    const scripts = document.querySelectorAll("script");
    if (scripts.length > 0) {
      issues.push(
        `Script tags found: ${scripts.length}: ${Array.from(scripts)
          .map((script) => script.outerHTML)
          .join("\n")}`
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

    try {
      const parsedUrl = new URL(url);

      // Check if protocol is dangerous
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        return "bad protocol";
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
    const files = fs
      .readdirSync(bypassDir)
      .filter((file) => file.endsWith(".md"))
      .sort();

    const rendererNames = Object.keys(renderers);

    files.forEach((file) => {
      describe(file, () => {
        rendererNames.forEach((rendererName) => {
          test(`should sanitize with ${rendererName}`, async () => {
            const filePath = path.join(bypassDir, file);
            const markdown = fs.readFileSync(filePath, "utf-8");

            // Sanitize and render to HTML using specific renderer
            const { html, sanitized } = await sanitizeAndRenderToHtml(
              markdown,
              rendererName
            );

            // Validate the HTML
            const issues = validateHtml(html);

            // Log details for debugging
            if (issues.length > 0) {
              console.log(`\nFile: ${file} | Renderer: ${rendererName}`);
              console.log("Original markdown:", markdown);
              console.log("Sanitized markdown:", sanitized);
              console.log("Rendered HTML:", html);
              console.log("Issues found:", issues);
            }

            // Assert no dangerous content made it through
            expect(issues).toEqual([]);
          });
        });
      });
    });
  });
});
