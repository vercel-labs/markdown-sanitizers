import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { JSDOM } from "jsdom";
import React from "react";
import ReactMarkdown from "react-markdown";
import hardenReactMarkdown from "./index";
import fs from "fs";
import path from "path";

// Create the hardened version using our function
const HardenedReactMarkdown = hardenReactMarkdown(ReactMarkdown);

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
  ].map((element) => element.toUpperCase()),
);

const allowedAttributes = new Set([
  "href",
  "src",
  "alt",
  "title",
  "class",
  "target",
  "rel",
]);

describe("Harden React Markdown Bypass Attempts", () => {
  const trustedOrigins = [
    "https://example.com/",
    "https://trusted.org/",
    "https://images.com/",
    "https://prefix.com/",
  ];

  const hardenedMarkdownConfig = {
    defaultOrigin: "https://example.com",
    allowedLinkPrefixes: ["https://example.com/", "https://trusted.org/"],
    allowedImagePrefixes: [
      "https://example.com/",
      "https://images.com/",
      "https://prefix.com/prefix/",
    ],
  };

  const renderToHtml = (markdown: string) => {
    const { container } = render(
      <HardenedReactMarkdown {...hardenedMarkdownConfig}>
        {markdown}
      </HardenedReactMarkdown>,
    );
    return container.innerHTML;
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

    try {
      const parsedUrl = new URL(url, "https://example.com");

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
    const bypassDir = path.join(
      __dirname,
      "../../markdown-to-markdown-sanitizer/tests/bypass-attempts",
    );

    // Read all markdown files from bypass-attempts directory
    const files = fs
      .readdirSync(bypassDir)
      .filter((file) => file.endsWith(".md"))
      .sort();

    files.forEach((file) => {
      test(`should sanitize ${file}`, () => {
        const filePath = path.join(bypassDir, file);
        const markdown = fs.readFileSync(filePath, "utf-8");

        // Render to HTML using harden-react-markdown
        const html = renderToHtml(markdown);

        // Validate the HTML
        const issues = validateHtml(html);

        // Log details for debugging
        if (issues.length > 0) {
          console.log(`\nFile: ${file}`);
          console.log("Original markdown:", markdown);
          console.log("Rendered HTML:", html);
          console.log("Issues found:", issues);
        }

        // Assert no dangerous content made it through
        expect(issues.join(",")).toEqual("");
      });
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
