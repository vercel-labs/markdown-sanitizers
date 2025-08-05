import { describe, expect, test } from "vitest";
import { MarkdownSanitizer } from "../src/index";

describe("Comprehensive Markdown Test", () => {
  const sanitizer = new MarkdownSanitizer({
    defaultOrigin: "https://example.com",
    allowedLinkPrefixes: ["https://example.com", "https://github.com"],
    allowedImagePrefixes: ["https://example.com/images", "https://cdn.example.com"],
  });

  test("long markdown document with various features", () => {
    const input = `# Complete Markdown Guide

This is a comprehensive test document that demonstrates **various markdown features** working together in a _realistic document_ format.

## Text Formatting

Here we have **bold text**, *italic text*, and ***bold italic text***. We can also use \`inline code\` for technical terms like \`getElementById()\` and \`querySelector()\`.

### Lists and Structure

Here's an unordered list:
- First item with [a link](https://example.com/page1)
- Second item with **bold text**
- Third item with \`code snippet\`

And here's an ordered list:
1. Step one: Visit [our documentation](https://example.com/docs)
2. Step two: Read the *important* guidelines
3. Step three: Follow the \`installation\` process

## Links and Images

Check out our [main website](https://example.com) for more information. You can also view our [GitHub repository](https://github.com/example/repo) for the source code.

Here's an image: ![Example diagram](https://example.com/images/diagram.png)

And another image with alt text: ![Chart showing growth](https://cdn.example.com/charts/growth.jpg)

## Code Examples

Here's a code block example:

\`\`\`python
def greet_user(name):
    return f"Hello, {name}!"
\`\`\`

And some inline code: use \`npm install\` to install packages.

## Quotes and References

> This is an important quote that provides valuable information about the topic we're discussing.

As mentioned in the [research paper](https://example.com/research), this approach has been proven effective.

## Technical Documentation

The API endpoint \`GET /api/users\` returns user data. Here are the parameters:

- \`limit\`: Number of users to return (default: 10&29;
- \`offset\`: Starting position (default: 0&29;  
- \`sort\`: Sort field (options: "name", "date", "id")

Example usage: \`curl https://example.com/api/users?limit=20&sort=name\`

## Mixed Content

Sometimes we need to discuss **technical concepts** like \`document.querySelector('.class')\` while also referencing [external resources](https://example.com/tools) and showing *emphasis* on important points.

The configuration format is:
\`\`\`json
{
  "api_key": "your_key_here",
  "timeout": 5000,
  "retries": 3
}
\`\`\`

---

*This document demonstrates comprehensive markdown usage in a realistic, non-malicious context.*`;

    const result = sanitizer.sanitize(input);

    const expected = `# Complete Markdown Guide

This is a comprehensive test document that demonstrates **various markdown features** working together in a *realistic document* format.

## Text Formatting

Here we have **bold text**, *italic text*, and ***bold italic text***. We can also use \`inline code\` for technical terms like \`getElementById()\` and \`querySelector()\`.

### Lists and Structure

Here&27;s an unordered list&3a;

*   First item with [a link](https://example.com/page1)
*   Second item with **bold text**
*   Third item with \`code snippet\`

And here&27;s an ordered list&3a;

1.  Step one&3a; Visit [our documentation](https://example.com/docs)
2.  Step two&3a; Read the *important* guidelines
3.  Step three&3a; Follow the \`installation\` process

## Links and Images

Check out our [main website](https://example.com/) for more information. You can also view our [GitHub repository](https://github.com/example/repo) for the source code.

Here&27;s an image&3a; ![Example diagram](https://example.com/images/diagram.png)

And another image with alt text&3a; ![Chart showing growth](https://cdn.example.com/charts/growth.jpg)

## Code Examples

Here&27;s a code block example&3a;

\`\`\`python
def greet_user(name):
    return f"Hello, {name}!"
\`\`\`

And some inline code&3a; use \`npm install\` to install packages.

## Quotes and References

> This is an important quote that provides valuable information about the topic we&27;re discussing.

As mentioned in the [research paper](https://example.com/research), this approach has been proven effective.

## Technical Documentation

The API endpoint \`GET /api/users\` returns user data. Here are the parameters&3a;

*   \`limit\`&3a; Number of users to return &28;default&3a; 10&26;29;
*   \`offset\`&3a; Starting position &28;default&3a; 0&26;29;
*   \`sort\`&3a; Sort field &28;options&3a; &22;name&22;, &22;date&22;, &22;id&22;&29;

Example usage&3a; \`curl https://example.com/api/users?limit=20&sort=name\`

## Mixed Content

Sometimes we need to discuss **technical concepts** like \`document.querySelector('.class')\` while also referencing [external resources](https://example.com/tools) and showing *emphasis* on important points.

The configuration format is&3a;

\`\`\`json
{
  "api_key": "your_key_here",
  "timeout": 5000,
  "retries": 3
}
\`\`\`

* * *

*This document demonstrates comprehensive markdown usage in a realistic, non-malicious context.*
`;

    expect(result).toBe(expected);
  });
});