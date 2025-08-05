import { describe, expect, test } from "vitest";
import { MarkdownSanitizer } from "../src/index";

describe("Code Block Security and Functionality", () => {
  const sanitizer = new MarkdownSanitizer({
    defaultOrigin: "https://example.com",
    allowedLinkPrefixes: ["https://example.com", "https://github.com"],
    allowedImagePrefixes: ["https://example.com/images"],
  });

  describe("Inline code functionality", () => {
    test("inline code with HTML should be preserved", () => {
      const input = 'Use `<script>alert("test")</script>` in your code.';
      const result = sanitizer.sanitize(input);
      
      expect(result).toBe('Use `<script>alert("test")</script>` in your code.\n');
    });

    test("inline code with markdown syntax should be preserved", () => {
      const input = 'The syntax is `![image](url)` for images and `[link](url)` for links.';
      const result = sanitizer.sanitize(input);
      
      expect(result).toBe('The syntax is `![image](url)` for images and `[link](url)` for links.\n');
    });

    test("inline code with dangerous protocols should be preserved", () => {
      const input = 'Example: `<img src="javascript:alert()">` is dangerous.';
      const result = sanitizer.sanitize(input);
      
      expect(result).toBe('Example&3a; `<img src="javascript:alert()">` is dangerous.\n');
    });

    test("inline code with quotes and special chars should be preserved", () => {
      const input = 'Use `document.getElementById("test")` and `element.setAttribute("class", "active")`.';
      const result = sanitizer.sanitize(input);
      
      expect(result).toBe('Use `document.getElementById("test")` and `element.setAttribute("class", "active")`.\n');
    });
  });

  describe("Fenced code block functionality", () => {
    test("fenced code block with HTML should be preserved", () => {
      const input = `Code example:

\`\`\`html
<script>
  alert("This should not execute");
  document.getElementById("test");
</script>
<img src="javascript:alert('xss')" onerror="alert('xss')">
\`\`\`

End of example.`;

      const result = sanitizer.sanitize(input);
      
      const expected = `Code example&3a;

\`\`\`html
<script>
  alert("This should not execute");
  document.getElementById("test");
</script>
<img src="javascript:alert('xss')" onerror="alert('xss')">
\`\`\`

End of example.
`;

      expect(result).toBe(expected);
    });

    test("fenced code block with markdown syntax should be preserved", () => {
      const input = `Markdown examples:

\`\`\`markdown
# Header
![Dangerous image](javascript:alert('xss'))
[Dangerous link](javascript:alert('xss'))
<img src="x" onerror="alert('xss')">
\`\`\`

These are just examples.`;

      const result = sanitizer.sanitize(input);
      
      const expected = `Markdown examples&3a;

\`\`\`markdown
# Header
![Dangerous image](javascript:alert('xss'))
[Dangerous link](javascript:alert('xss'))
<img src="x" onerror="alert('xss')">
\`\`\`

These are just examples.
`;

      expect(result).toBe(expected);
    });

    test("fenced code block with mixed quotes and special chars", () => {
      const input = `JavaScript example:

\`\`\`javascript
function dangerous() {
  eval('alert("XSS")');
  document.write('<img src="x" onerror="alert()">');
  location.href = "javascript:alert('xss')";
}
\`\`\`

Don't run this code.`;

      const result = sanitizer.sanitize(input);
      
      const expected = `JavaScript example&3a;

\`\`\`javascript
function dangerous() {
  eval('alert("XSS")');
  document.write('<img src="x" onerror="alert()">');
  location.href = "javascript:alert('xss')";
}
\`\`\`

Don&27;t run this code.
`;

      expect(result).toBe(expected);
    });
  });

  describe("Indented code block functionality", () => {
    test("indented code block with HTML should be preserved", () => {
      const input = `Example:

    <script>alert('xss')</script>
    <img src="javascript:alert()" onerror="alert()">
    
End of code.`;

      const result = sanitizer.sanitize(input);
      
      const expected = `Example&3a;

\`\`\`
<script>alert('xss')</script>
<img src="javascript:alert()" onerror="alert()">
\`\`\`

End of code.
`;

      expect(result).toBe(expected);
    });
  });

  describe("Mixed code and non-code content", () => {
    test("code blocks should not affect surrounding markdown", () => {
      const input = `Here is safe content with [a link](https://example.com).

\`\`\`html
<script>alert('This is in code')</script>
\`\`\`

And here is more safe content with **bold text**.

Inline code&26;26;26;3a; \`<img src="x" onerror="alert()">\` in text.

Final [link](https://example.com) here.`;

      const result = sanitizer.sanitize(input);
      
      const expected = `Here is safe content with [a link](https://example.com/).

\`\`\`html
<script>alert('This is in code')</script>
\`\`\`

And here is more safe content with **bold text**.

Inline code&26;26;26;3a; \`<img src="x" onerror="alert()">\` in text.

Final [link](https://example.com/) here.
`;

      expect(result).toBe(expected);
    });

    test("dangerous content outside code blocks should be sanitized", () => {
      const input = `Code example:

\`\`\`html
<script>alert('safe in code')</script>
\`\`\`

But this should be sanitized: <script>alert('dangerous')</script>

And this: ![bad](javascript:alert('xss'))`;

      const result = sanitizer.sanitize(input);
      
      const expected = `Code example&3a;

\`\`\`html
<script>alert('safe in code')</script>
\`\`\`

But this should be sanitized&3a;

And this&3a;
`;

      expect(result).toBe(expected);
    });
  });
});