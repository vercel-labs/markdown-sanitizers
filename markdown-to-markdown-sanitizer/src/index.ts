import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { visit } from "unist-util-visit";
import type { Root } from "mdast";
import { UrlNormalizer } from "./url-normalizer";
import { HtmlSanitizer } from "./html-sanitizer";
import { SanitizeOptions } from "./types";

export class MarkdownSanitizer {
  private options: SanitizeOptions;
  private buffer: string = "";
  private processor: any;
  private urlNormalizer: UrlNormalizer;
  private htmlSanitizer: HtmlSanitizer;

  constructor(options: SanitizeOptions) {
    this.options = options;
    if (!this.options.defaultOrigin) {
      throw new Error("defaultOrigin is required");
    }

    // Create unified processor with remark plugins
    this.processor = unified().use(remarkParse).use(remarkStringify);

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
    if (markdown.length > 100000) {
      // 100KB limit - truncate instead of throwing
      markdown = markdown.substring(0, 100000);
    }

    try {
      // Parse the markdown first
      const tree = this.processor.parse(markdown) as Root;

      // Apply URL sanitization to links, images, and definitions
      visit(tree, ["link", "image", "definition"], (node) => {
        if (node.type === "link" && node.url) {
          node.url = this.urlNormalizer.sanitizeUrl(node.url, "href");
        } else if (node.type === "image" && node.url) {
          node.url = this.urlNormalizer.sanitizeUrl(node.url, "src");
        } else if (node.type === "definition" && node.url) {
          node.url = this.urlNormalizer.sanitizeUrl(node.url, "href");
        } else if ("url" in node && node.url) {
          node.url = this.urlNormalizer.sanitizeUrl(node.url, "href");
        }
      });

      // Serialize back to markdown
      let result = String(this.processor.stringify(tree));

      result = this.htmlSanitizer.sanitizeHtml(result);

      return result;
    } catch (error) {
      // Fallback: return empty string if parsing fails
      console.error("Markdown sanitization failed:", error);
      return "";
    }
  }

  // Streaming support - processes chunks but ensures completeness
  write(chunk: string): string {
    this.buffer += chunk;

    // Find the last complete line to process
    const lastNewlineIndex = this.buffer.lastIndexOf("\n");

    if (lastNewlineIndex === -1) {
      // No complete lines yet, return empty
      return "";
    }

    // Process complete lines only
    const toProcess = this.buffer.substring(0, lastNewlineIndex + 1);
    this.buffer = this.buffer.substring(lastNewlineIndex + 1);

    return this.sanitize(toProcess);
  }

  // Flush any remaining buffer
  end(): string {
    if (!this.buffer.trim()) {
      return "";
    }

    const result = this.sanitize(this.buffer);
    this.buffer = "";
    return result;
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

// AI SDK Middleware
export interface MarkdownSanitizerMiddlewareOptions
  extends Partial<Omit<SanitizeOptions, "html">> {
  /** @deprecated Use allowedLinkPrefixes instead */
  allowedPrefixes?: string[];
  /** Enable HTML sanitization (default: true) */
  enableHtmlSanitization?: boolean;
}

/**
 * AI SDK middleware that sanitizes markdown content in AI responses
 *
 * @param options Configuration options for markdown sanitization
 * @returns Middleware function for AI SDK
 *
 * @example
 * ```typescript
 * import { markdownSanitizerMiddleware } from 'markdown-sanitizer';
 *
 * const result = await generateText({
 *   model: openai('gpt-4'),
 *   prompt: 'Generate some markdown with links',
 *   experimental_middleware: [
 *     markdownSanitizerMiddleware({
 *       allowedPrefixes: ['https://example.com', 'https://trusted.org']
 *     })
 *   ]
 * });
 * ```
 */
export function markdownSanitizerMiddleware(
  options: MarkdownSanitizerMiddlewareOptions
) {
  const sanitizeOptions: SanitizeOptions = {
    allowedLinkPrefixes: options.allowedLinkPrefixes || options.allowedPrefixes,
    allowedImagePrefixes:
      options.allowedImagePrefixes || options.allowedPrefixes,
    defaultOrigin: options.defaultOrigin || "https://example.com",
    defaultLinkOrigin: options.defaultLinkOrigin,
    defaultImageOrigin: options.defaultImageOrigin,
  };

  const sanitizer = new MarkdownSanitizer(sanitizeOptions);

  return {
    wrapGenerate: async (
      params: unknown,
      generate: (...args: unknown[]) => Promise<unknown>
    ) => {
      const result = (await generate(params)) as Record<string, unknown>;

      // Sanitize text content if present
      if (result.text && typeof result.text === "string") {
        result.text = sanitizer.sanitize(result.text);
      }

      // Sanitize response messages if present
      if (
        result.response &&
        typeof result.response === "object" &&
        result.response !== null
      ) {
        const response = result.response as Record<string, unknown>;
        if (Array.isArray(response.messages)) {
          response.messages = response.messages.map(
            (message: Record<string, unknown>) => {
              if (message.content && typeof message.content === "string") {
                return {
                  ...message,
                  content: sanitizer.sanitize(message.content),
                };
              }
              return message;
            }
          );
        }
      }

      return result;
    },

    wrapStream: async (
      params: unknown,
      stream: (...args: unknown[]) => Promise<unknown>
    ) => {
      const wrappedStream = (await stream(params)) as Record<string, unknown>;

      return {
        ...wrappedStream,
        async *textStream() {
          const streamingSanitizer = new MarkdownSanitizer(sanitizeOptions);
          const originalTextStream =
            wrappedStream.textStream as () => AsyncGenerator<string>;

          for await (const chunk of originalTextStream()) {
            // Use the streaming API to safely handle partial markdown
            const sanitizedChunk = streamingSanitizer.write(chunk);
            if (sanitizedChunk) {
              yield sanitizedChunk;
            }
          }

          // Flush any remaining content
          const finalChunk = streamingSanitizer.end();
          if (finalChunk) {
            yield finalChunk;
          }
        },
      };
    },
  };
}
