import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { UrlNormalizer } from "./url-normalizer";

// Setup DOMPurify with JSDOM
const window = new JSDOM("").window;

// Configure DOMPurify allow-lists
export const ALLOWED_TAGS = [
  // Text formatting
  "strong",
  "b",
  "em",
  "i",
  "code",
  "tt",
  "s",
  "strike",
  "del",
  "ins",
  "sub",
  "sup",

  // Links and images
  "a",
  "img",

  // Lists
  "ul",
  "ol",
  "li",

  // Headers and text structure
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "blockquote",
  "q",

  // Line breaks and horizontal rules
  "br",
  "hr",

  // Code blocks and preformatted text
  "pre",
  "samp",
  "kbd",
  "var",

  // Tables
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",

  // Definition lists
  "dl",
  "dt",
  "dd",

  // Details/summary
  "details",
  "summary",

  // Div and span with restrictions
  "div",
  "span",
];

export const ALLOWED_ATTR = [
  // Link attributes
  "href",
  "title",
  "target",

  // Image attributes
  "src",
  "alt",
  "width",
  "height",

  // List attributes
  "start",
  "reversed",
  "value",

  // Table attributes
  "colspan",
  "rowspan",
  "headers",

  // Details attributes
  "open",

  // General attributes
  "class",
  "id",
];

export class HtmlSanitizer {
  private urlNormalizer: UrlNormalizer;

  constructor(urlNormalizer: UrlNormalizer) {
    this.urlNormalizer = urlNormalizer;
  }

  sanitizeHtml(html: string): string {
    // Reject overly large content without parsing to avoid performance issues
    if (html.length > 10000) {
      // 10KB limit
      return "";
    }

    // Create a custom DOMPurify instance with hooks for URL sanitization
    const customPurify = DOMPurify(window);

    // Configure DOMPurify
    customPurify.setConfig({
      ALLOWED_TAGS: ALLOWED_TAGS,
      ALLOWED_ATTR: ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SAFE_FOR_TEMPLATES: true,
      WHOLE_DOCUMENT: false,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      FORCE_BODY: false,
      IN_PLACE: false,
      KEEP_CONTENT: true,
      ADD_TAGS: ["#text"],
      ADD_ATTR: [],
      FORBID_TAGS: [],
      FORBID_ATTR: [],
    });

    // Add hook to handle URL sanitization
    customPurify.addHook("afterSanitizeAttributes", (node) => {
      // Handle href attributes
      if (node.hasAttribute && node.hasAttribute("href")) {
        const url = node.getAttribute("href") || "";
        const sanitizedUrl = this.urlNormalizer.sanitizeUrl(url, "href");
        if (sanitizedUrl === "#") {
          // For blocked hrefs, remove the href attribute entirely
          node.removeAttribute("href");
        } else {
          node.setAttribute("href", sanitizedUrl);
        }
      }

      // Handle src attributes
      if (node.hasAttribute && node.hasAttribute("src")) {
        const url = node.getAttribute("src") || "";
        const sanitizedUrl = this.urlNormalizer.sanitizeUrl(url, "src");
        if (sanitizedUrl === "/forbidden") {
          // Remove the entire element if src is blocked
          node.remove();
        } else {
          node.setAttribute("src", sanitizedUrl);
        }
      }
    });

    // Remove all hooks after sanitization to avoid leaking
    const result = customPurify.sanitize(html);

    // Clear hooks
    customPurify.removeAllHooks();

    // Post-process to ensure trailing newlines match expected output
    // Only add newline if result is not empty
    if (!result) return result;
    return result.endsWith("\n") ? result : result + "\n";
  }
}
