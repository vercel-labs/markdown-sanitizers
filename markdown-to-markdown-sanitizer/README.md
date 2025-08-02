# Markdown Sanitizer

A robust markdown sanitizer that filters URLs in markdown links and images against a prefix allow-list, with GitHub-compatible HTML sanitization using sanitize-html.

## Features

- **URL Sanitization**: Filters `href` and `src` attributes against configurable prefix allow-lists
- **HTML Sanitization**: GitHub-compatible HTML sanitization with the same elements and attributes allowed by GitHub
- **Streaming Support**: Robust handling of incomplete markdown streams
- **Custom Inspection**: Support for custom URL validation functions
- **Character-by-character Parsing**: Reliable parsing that handles edge cases and malformed markdown
- **TypeScript Support**: Full TypeScript definitions included

## Installation

```bash
pnpm add markdown-sanitizer
```

## Basic Usage

### Markdown-only Sanitization

```typescript
import { sanitizeMarkdown } from "markdown-to-markdown-sanitizer";

const options = {
  allowedPrefixes: ["https://example.com", "https://trusted-site.org"],
};

const input = `
# My Document

Check out this [safe link](https://example.com/page) and this [unsafe link](https://malicious.com/page).

![Safe image](https://example.com/image.png)
![Unsafe image](https://malicious.com/image.png)
`;

const sanitized = sanitizeMarkdown(input, options);
console.log(sanitized);
// Output:
// # My Document
//
// Check out this [safe link](https://example.com/page) and this [unsafe link](#).
//
// ![Safe image](https://example.com/image.png)
// ![Unsafe image]()
```

### HTML Sanitization

```typescript
import { sanitizeMarkdown } from "markdown-to-markdown-sanitizer";

const options = {
  allowedPrefixes: ["https://example.com"],
  html: {
    enabled: true,
  },
};

const input = `
# My Document

<div class="content">
  <p>This is safe HTML with a <a href="https://example.com">safe link</a></p>
  <script>alert('This will be removed')</script> <!-- Dangerous: removed -->
  <img src="https://example.com/safe.png" alt="Safe image">
  <img src="https://malicious.com/bad.png" alt="Unsafe image"> <!-- Bad URL: removed -->
  
  <details open>
    <summary>GitHub-style collapsible section</summary>
    <p>Content with <kbd>keyboard shortcuts</kbd> and <samp>sample output</samp></p>
  </details>
  
  <table>
    <tr><th>Feature</th><th>Supported</th></tr>
    <tr><td>Tables</td><td>✅</td></tr>
    <tr><td>Scripts</td><td>❌</td></tr>
  </table>
</div>
`;

const sanitized = sanitizeMarkdown(input, options);
// HTML is sanitized using GitHub's whitelist and URLs are validated
```

## Configuration Options

### SanitizeOptions

```typescript
interface SanitizeOptions {
  /** Array of allowed URL prefixes */
  allowedPrefixes: string[];

  /** Custom function to inspect href URLs (optional) */
  inspectHref?: (href: string) => boolean;

  /** Custom function to inspect src URLs (optional) */
  inspectSrc?: (src: string) => boolean;

  /** HTML sanitization options (optional) */
  html?: HtmlSanitizeOptions;
}
```

### HtmlSanitizeOptions

```typescript
interface HtmlSanitizeOptions {
  /** Enable HTML sanitization using sanitize-html */
  enabled?: boolean;
}
```

The HTML sanitizer uses a GitHub-compatible configuration that matches GitHub's default HTML allow-list:

**Text Formatting:**

- `strong`, `b`, `em`, `i`, `code`, `tt`, `s`, `strike`, `del`, `ins`
- `sub`, `sup` (subscript and superscript)

**Structure:**

- `h1`, `h2`, `h3`, `h4`, `h5`, `h6` (headers)
- `p`, `blockquote`, `q` (paragraphs and quotes)
- `br`, `hr` (line breaks and horizontal rules)

**Lists:**

- `ul`, `ol`, `li` (with `start`, `reversed`, `value` attributes)
- `dl`, `dt`, `dd` (definition lists)

**Links and Media:**

- `a` (with `href`, `name`, `target`, `title` attributes)
- `img` (with `src`, `alt`, `title`, `width`, `height` attributes)

**Code and Technical:**

- `pre`, `samp`, `kbd`, `var` (preformatted text, sample output, keyboard input, variables)

**Tables:**

- `table`, `thead`, `tbody`, `tfoot`, `tr`, `td`, `th`
- Table attributes: `colspan`, `rowspan`, `headers`

**GitHub-Specific:**

- `details`, `summary` (disclosure widgets with `open` attribute)
- `div`, `span` (with `class`, `id` attributes)
- `ruby`, `rt`, `rp` (East Asian typography)

**Security Features:**

- All URLs in `href` and `src` are sanitized using the same prefix rules as markdown links
- User-generated `id` and `name` attributes get prefixed with `user-content-`
- Dangerous tags like `script`, `iframe`, `style` are completely removed
- Maximum nesting depth of 10 levels to prevent abuse

## Advanced Usage

### Custom URL Inspection

```typescript
const options = {
  allowedPrefixes: ["https://example.com"],
  inspectHref: (href: string) => {
    // Custom validation logic
    return !href.includes("malicious") && href.length < 200;
  },
  inspectSrc: (src: string) => {
    // Only allow specific image types
    return /\\.(png|jpg|jpeg|gif|webp)$/i.test(src);
  },
};
```

### AI SDK Middleware

The package includes middleware for the AI SDK to automatically sanitize markdown content in AI responses:

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { markdownSanitizerMiddleware } from "markdown-to-markdown-sanitizer";

const result = await generateText({
  model: openai("gpt-4"),
  prompt: "Generate a markdown document with links and HTML",
  experimental_middleware: [
    markdownSanitizerMiddleware({
      allowedPrefixes: ["https://example.com", "https://trusted.org"],
      // HTML sanitization is enabled by default
      enableHtmlSanitization: true,
      // Optional custom inspection functions
      inspectHref: (href) => !href.includes("malicious"),
    }),
  ],
});

// result.text will have sanitized markdown/HTML content
console.log(result.text);
```

#### Streaming Support

The middleware also works with streaming:

```typescript
import { streamText } from "ai";

const stream = await streamText({
  model: openai("gpt-4"),
  prompt: "Generate markdown with links",
  experimental_middleware: [
    markdownSanitizerMiddleware({
      allowedPrefixes: ["https://example.com"],
    }),
  ],
});

for await (const chunk of stream.textStream()) {
  // Each chunk is sanitized before being yielded
  process.stdout.write(chunk);
}
```

### Streaming Usage

```typescript
import { MarkdownSanitizer } from "markdown-to-markdown-sanitizer";

const sanitizer = new MarkdownSanitizer({
  allowedPrefixes: ["https://example.com"],
  html: { enabled: true },
});

// Stream processing
let result = "";
result += sanitizer.write("# Title\\n\\n[Link](https://exam");
result += sanitizer.write("ple.com/page) and some ");
result += sanitizer.write("<strong>HTML</strong>");
result += sanitizer.end(); // Flush remaining buffer

console.log(result);
```

## Security Features

### URL Sanitization

- Validates all `href` and `src` attributes against allow-lists
- Supports custom inspection functions for advanced validation
- Replaces invalid `href` with `#` and removes invalid `src` entirely

### HTML Sanitization

- Uses sanitize-html with GitHub's exact whitelist of allowed elements and attributes
- Supports all HTML elements that GitHub allows in markdown (tables, details/summary, kbd/samp, etc.)
- Removes JavaScript URLs, event handlers, and malicious content
- Applies URL sanitization to `href` and `src` in sanitized HTML
- Matches GitHub's behavior including user-content prefixing for anchors

### Parsing Robustness

- Character-by-character parsing handles malformed markdown gracefully
- Streaming support ensures incomplete constructs are never output
- Handles nested brackets, escaped characters, and edge cases

## Security Best Practices

1. **Always use HTTPS prefixes** in your allow-lists
2. **Be specific with prefixes** - use full domains rather than partial matches
3. **Enable HTML sanitization** when processing user-generated content
4. **Use custom inspection functions** for additional validation logic
5. **Test with adversarial inputs** to ensure your configuration is secure

## Performance

The sanitizer is designed for performance:

- Streaming support for large documents
- Character-by-character parsing avoids regex catastrophic backtracking
- sanitize-html is only used when HTML sanitization is enabled
- Efficient buffering prevents incomplete output in streaming scenarios

## Testing

The package includes comprehensive tests covering:

- 143 base tests for markdown sanitization
- 28 tests for GitHub-compatible HTML sanitization
- 13 tests for AI SDK middleware
- Security tests for XSS prevention
- Performance tests for large documents
- Edge cases and malformed input handling

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test tests/html/
pnpm test tests/security/

# Run with coverage
pnpm test --coverage
```

## Dependencies

- **sanitize-html**: HTML sanitization

## License

MIT
