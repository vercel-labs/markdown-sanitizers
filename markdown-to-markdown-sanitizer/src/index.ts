import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import TurndownService from "turndown";
// @ts-ignore - no types available for turndown-plugin-gfm
import { gfm } from "turndown-plugin-gfm";
import { UrlNormalizer } from "./url-normalizer.js";
import { HtmlSanitizer } from "./html-sanitizer.js";
import { SanitizeOptions } from "./types.js";

// Re-export types for convenience
export type { SanitizeOptions, HtmlSanitizeOptions } from "./types.js";

export class MarkdownSanitizer {
  private options: SanitizeOptions;
  private markdownToHtmlProcessor: any;
  private htmlToMarkdownProcessor: TurndownService;
  private urlNormalizer: UrlNormalizer;
  private htmlSanitizer: HtmlSanitizer;

  constructor(options: SanitizeOptions) {
    this.options = options;
    if (!this.options.defaultOrigin) {
      throw new Error("defaultOrigin is required");
    }

    // Create unified processor for markdown to HTML with raw HTML support
    this.markdownToHtmlProcessor = unified()
      .use(remarkParse)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeStringify);

    // Create turndown processor for HTML to markdown with GFM support
    this.htmlToMarkdownProcessor = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      fence: "```",
      emDelimiter: "*",
      strongDelimiter: "**",
      linkStyle: "inlined",
      linkReferenceStyle: "collapsed",
    });
    const defaultEscape = this.htmlToMarkdownProcessor.escape;
    this.htmlToMarkdownProcessor.escape = (str: string) => {
      const markdownSyntaxCharacters = /[\<\>\&\"\'\[\]\:\=\/\!\(\)\\]/g;
      // If anything dangerous is found, encode it using HTML entities which
      // are supported by markdown.
      if (markdownSyntaxCharacters.test(str)) {
        return str.replace(
          markdownSyntaxCharacters,
          (char) => `&${char.charCodeAt(0).toString(16)};`
        );
      }
      return defaultEscape(str);
    };

    // Add GFM plugin for tables and other GitHub Flavored Markdown features
    this.htmlToMarkdownProcessor.use(gfm);

    // Initialize URL normalizer
    this.urlNormalizer = new UrlNormalizer({
      allowedLinkPrefixes: options.allowedLinkPrefixes,
      allowedImagePrefixes: options.allowedImagePrefixes,
      defaultOrigin: options.defaultOrigin,
      defaultLinkOrigin: options.defaultLinkOrigin,
      defaultImageOrigin: options.defaultImageOrigin,
      urlMaxLength: options.urlMaxLength,
    });

    // Initialize HTML sanitizer
    this.htmlSanitizer = new HtmlSanitizer(this.urlNormalizer);
  }

  sanitize(markdown: string): string {
    // DoS protection: limit input size
    const maxLength = this.options.maxMarkdownLength ?? 100000;
    if (maxLength > 0 && markdown.length > maxLength) {
      // Truncate instead of throwing
      markdown = markdown.substring(0, maxLength);
    }

    try {
      // Step 1: Parse markdown and convert to HTML using remark
      const html = String(this.markdownToHtmlProcessor.processSync(markdown));

      // Step 2: Sanitize the HTML
      const sanitizedHtml = this.htmlSanitizer.sanitizeHtml(html);

      // Step 3: Convert sanitized HTML back to markdown using turndown
      let result = this.htmlToMarkdownProcessor.turndown(sanitizedHtml);

      // Ensure trailing newline to match expected test output
      if (result && !result.endsWith("\n")) {
        result += "\n";
      }

      return result;
    } catch (error) {
      // Fallback: return empty string if processing fails
      console.error("Markdown sanitization failed:", error);
      return "";
    }
  }
}

// Convenience function for one-shot sanitization
export function sanitizeMarkdown(
  markdown: string,
  options: SanitizeOptions
): string {
  const sanitizer = new MarkdownSanitizer(options);
  return sanitizer.sanitize(markdown);
}

