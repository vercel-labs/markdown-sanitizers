# Markdown to Markdown Sanitizer

A robust markdown sanitizer focused on avoiding unexpected image and link URLs in markdown.

Note: This is brand new software and comes without security guarantees. Do your own testing for
your own use case.

The sanitizer consumes markdown and produces markdown output. Generally speaking, this is
less secure than sanitizing the final rendered output such as the generated HTML. Hence, this
package should only be used when the markdown is rendered by a third-party such as GitHub
or GitLab.

The primary use-case for this package is to [sanitize AI-generated markdown which may have
been subject to prompt-injection with the goal of exfiltrating data](https://vercel.com/blog/building-secure-ai-agents).

Note: The output of the sanitizer is designed to be unambiguous in terms of markdown parsing.
This comes at the trade-off of reduced human readability of the generated markdown. Hence,
it is only recommended to use this package when the markdown is meant to be rendered to an
output format such as HTML, rather than being directly consumed by humans.

## Why is markdown-to-markdown sanitization hard?

Markdown parsing substantially differs between implementations. Hence the parsed representation
that may appear valid with one parser, may not be valid with another.

The way this package tests whether it is doing a good job is:

- Tests in `tests/bypass-attempts/*.md`
- Sanitize with this package
- Use a range of markdown renderers to turn the sanitized markdown to HTML
  - `remark`
  - `marked`
  - `markdown-it`
  - `showdown`
  - `commonmark`
- Render the HTML output and check if it is secure

## How it works

The current implementation is quite involved. Simpler implementations may be possible, but the interleaved
markdown and HTML nature makes this quite hard.

Current steps:

- Parse input markdown with `remark`
- Render to HTML
- Use `DOMPurify` to sanitize the HTML according to the input rules
- Use `turndown` to re-create the markdown
- Escape all characters in text that are markdown control characters as HTML-entities

The last step is causing the reduced readability of the output (see trade-off documented above)
but it robustly avoids parsing ambiguities Backslash-based escaping has proven to lead to parsing
ambiguities between implementations.

## Features

- **URL Sanitization**: Filters `href` and `src` attributes against configurable prefix allow-lists
- **HTML Sanitization**: DOMPurify-based HTML sanitization with GitHub-compatible allow-lists
- **Entity Encoding**: Aggressive HTML entity encoding for dangerous characters to prevent XSS
- **Length Limits**: Configurable maximum markdown length for DoS protection
- **TypeScript Support**: Full TypeScript definitions included

## Installation

```bash
npm install markdown-to-markdown-sanitizer
```

## Basic Usage

```typescript
import { sanitizeMarkdown } from "markdown-to-markdown-sanitizer";

const options = {
  defaultOrigin: "https://example.com",
  allowedLinkPrefixes: ["https://example.com", "https://trusted-site.org"],
  allowedImagePrefixes: ["https://example.com/images"],
};

const input = `
# My Document

Check out this [safe link](https://example.com/page) and this [unsafe link](https://malicious.com/page).

![Safe image](https://example.com/images/photo.png)
![Unsafe image](https://malicious.com/image.png)
`;

const sanitized = sanitizeMarkdown(input, options);
console.log(sanitized);
// Output:
// # My Document
//
// Check out this [safe link](https://example.com/page) and this [unsafe link](#).
//
// ![Safe image](https://example.com/images/photo.png)
// ![Unsafe image]()
```

## Configuration Options

### SanitizeOptions

```typescript
interface SanitizeOptions {
  /**
   * Default origin for relative URLs (e.g., "https://github.com")
   * Required if your content contains relative URLs that should be allowed.
   */
  defaultOrigin: string;

  /** Allowed URL prefixes for links (href attributes) */
  allowedLinkPrefixes?: string[];

  /** Allowed URL prefixes for images (src attributes) */
  allowedImagePrefixes?: string[];

  /**
   * Default origin specifically for relative links
   * (overrides defaultOrigin if set)
   */
  defaultLinkOrigin?: string;

  /**
   * Default origin specifically for relative images
   * (overrides defaultOrigin if set)
   */
  defaultImageOrigin?: string;

  /**
   * Maximum length of URLs to be sanitized.
   * Default is 200 characters. 0 means no limit.
   */
  urlMaxLength?: number;

  /**
   * Maximum length of markdown content to process.
   * Default is 100000 characters. 0 means no limit.
   */
  maxMarkdownLength?: number;
}
```

## HTML Sanitization

The sanitizer uses DOMPurify with GitHub-compatible allow-lists for HTML elements and attributes:

### Allowed HTML Elements

**Text Formatting:**

- `strong`, `b`, `em`, `i`, `code`, `pre`, `tt`
- `s`, `strike`, `del`, `ins`, `mark`
- `sub`, `sup` (subscript and superscript)

**Structure:**

- `h1`, `h2`, `h3`, `h4`, `h5`, `h6` (headers)
- `p`, `blockquote`, `q` (paragraphs and quotes)
- `br`, `hr` (line breaks and horizontal rules)

**Lists:**

- `ul`, `ol`, `li` (with `start`, `reversed`, `value` attributes)
- `dl`, `dt`, `dd` (definition lists)

**Links and Media:**

- `a` (with `href`, `name`, `id`, `title`, `target` attributes)
- `img` (with `src`, `alt`, `title`, `width`, `height`, `align` attributes)

**Code and Technical:**

- `pre`, `code`, `samp`, `kbd`, `var`

**Tables:**

- `table`, `thead`, `tbody`, `tfoot`, `tr`, `td`, `th`
- Table attributes: `colspan`, `rowspan`, `align`, `valign`

**GitHub-Specific:**

- `details`, `summary` (with `open` attribute)
- `div`, `span` (with `class`, `id`, `dir` attributes)
- `ruby`, `rt`, `rp` (East Asian typography)

### Security Features

- **URL Validation**: All URLs in `href` and `src` are validated against allow-lists
- **ID Prefixing**: User-generated `id` and `name` attributes are prefixed with `user-content-`
- **Entity Encoding**: Dangerous characters are encoded as HTML entities
- **XSS Prevention**: Scripts, event handlers, and dangerous elements are removed

## Advanced Usage

### URL Prefix Configuration

The sanitizer supports flexible URL prefix matching:

```typescript
// Protocol-only prefixes
const options1 = {
  defaultOrigin: "https://example.com",
  allowedLinkPrefixes: ["https:", "http:"], // Allow any HTTPS or HTTP URL
};

// Domain prefixes
const options2 = {
  defaultOrigin: "https://example.com",
  allowedLinkPrefixes: ["https://example.com", "https://api.example.com"],
};

// Path prefixes
const options3 = {
  defaultOrigin: "https://example.com",
  allowedLinkPrefixes: ["https://example.com/docs", "https://example.com/api"],
};
```

### Length Limits

Configure maximum markdown length to prevent DoS attacks:

```typescript
const options = {
  defaultOrigin: "https://example.com",
  allowedLinkPrefixes: ["https://example.com"],
  maxMarkdownLength: 50000, // Limit to 50k characters
  urlMaxLength: 500, // Limit URL length to 500 characters
};

// Content over the limit will be truncated before processing
const longContent = "a".repeat(60000);
const result = sanitizeMarkdown(longContent, options);
// Result will be based on truncated content (first 50k chars)
```

## Processing Pipeline

The sanitizer follows a multi-step pipeline to ensure security:

1. **Autolink Normalization**: Converts `<url>` syntax to `[url](url)` and rejects URLs with HTML entities
2. **Markdown → HTML**: Uses unified/remark to parse markdown and convert to HTML
3. **HTML Sanitization**: Uses DOMPurify with GitHub-compatible allow-lists
4. **HTML → Markdown**: Uses Turndown with GFM plugin to convert back to markdown
5. **Entity Encoding**: Encodes dangerous characters as HTML entities

## Security Considerations

### Best Practices

1. **Always specify `defaultOrigin`** - Required for relative URL handling
2. **Use HTTPS prefixes** in your allow-lists when possible
3. **Be specific with prefixes** - Avoid overly broad matches
4. **Set appropriate length limits** for your use case
5. **Test with untrusted input** to ensure your configuration is secure

### Entity Encoding

The sanitizer aggressively encodes dangerous characters to prevent XSS:

- Characters encoded: `<>&"'[]:()/!\`
- Encoding format: `&{hex};` (e.g., `<` becomes `&3c;`)
- Applied to all text containing dangerous characters

## Performance

- **Configurable length limits** to prevent DoS attacks
- **Efficient HTML processing** using DOMPurify
- **Optimized markdown parsing** using unified ecosystem

## Testing

The package includes comprehensive test coverage:

- 800+ total tests including:
  - Core sanitization functionality
  - HTML sanitization with DOMPurify
  - Security attack prevention
  - Edge cases and malformed input
  - Length limit configuration
  - 555 bypass attempt tests

Run tests:

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test -- tests/basic-sanitization.test.ts

```

## Dependencies

- **unified ecosystem**: Markdown parsing and processing
- **DOMPurify**: HTML sanitization
- **Turndown**: HTML to Markdown conversion
- **JSDOM**: DOM implementation for Node.js

## License

MIT
