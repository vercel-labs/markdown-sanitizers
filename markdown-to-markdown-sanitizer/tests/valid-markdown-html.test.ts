import { describe, expect, test } from "vitest";
import { MarkdownSanitizer } from "../src/index";

describe("Valid Markdown with HTML", () => {
  const createSanitizer = (options = {}) =>
    new MarkdownSanitizer({
      defaultOrigin: "https://example.com",
      allowedLinkPrefixes: ["https://example.com", "https://trusted.org"],
      allowedImagePrefixes: ["https://example.com", "https://images.com"],
      ...options,
    });

  const sanitize = (input: string, options = {}) => {
    return createSanitizer(options).sanitize(input);
  };

  test("preserves valid markdown with safe HTML tags", () => {
    const input = `# Title

Here is a [link](https://example.com/page) with **bold** text.

<strong>Safe HTML</strong> and <em>emphasis</em>.

## Subsection

More content with <code>inline code</code> and a [trusted link](https://trusted.org/page).`;

    const result = sanitize(input);
    
    // The new pipeline properly converts HTML to markdown, preserving all formatting
    expect(result).toBe(
      "# Title\n\nHere is a [link](https://example.com/page) with **bold** text.\n\n**Safe HTML** and *emphasis*.\n\n## Subsection\n\nMore content with `inline code` and a [trusted link](https://trusted.org/page).\n"
    );
  });

  test("handles markdown lists and preserves valid links", () => {
    const input = `## List Example

- Markdown list item
- Another item with [link](https://example.com/test)
- Item with [bad link](https://evil.com/malware)`;

    const result = sanitize(input);
    
    // Markdown lists preserved, bad links sanitized
    expect(result).toBe(
      "## List Example\n\n*   Markdown list item\n*   Another item with [link](https://example.com/test)\n*   Item with [bad link](#)\n"
    );
  });

  test("sanitizes malicious content while preserving safe content", () => {
    const input = `# Safe Content

Here is safe content with <strong>emphasis</strong>.

<script>alert('xss')</script>

More safe content with [good link](https://example.com/safe).

[bad link](https://evil.com/malware)`;

    const result = sanitize(input);
    
    // Script should be removed, bad link should be sanitized to #
    expect(result).not.toContain("script");
    expect(result).not.toContain("alert");
    expect(result).toContain("# Safe Content");
    expect(result).toContain("emphasis"); // HTML emphasis becomes plain text
    expect(result).toContain("[good link](https://example.com/safe)");
    expect(result).toContain("[bad link](#)");
  });

  test("converts HTML tables to markdown tables", () => {
    const input = `# Table Example

<table>
<thead>
<tr>
<th>Header 1</th>
<th>Header 2</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Bold cell</strong></td>
<td><a href="https://example.com/link">Safe link</a></td>
</tr>
</tbody>
</table>`;

    const result = sanitize(input);
    
    // HTML tables are properly converted to markdown tables with GFM support
    expect(result).toBe("# Table Example\n\n| Header 1 | Header 2 |\n| --- | --- |\n| **Bold cell** | [Safe link](https://example.com/link) |\n");
  });
});