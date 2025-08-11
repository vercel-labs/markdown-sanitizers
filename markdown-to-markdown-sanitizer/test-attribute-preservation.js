// Test script to analyze title and alt attribute preservation

import { MarkdownSanitizer } from './dist/index.js';

const sanitizer = new MarkdownSanitizer({
  defaultOrigin: 'https://example.com',
  allowedImagePrefixes: ['https://safe.com'],
  allowedLinkPrefixes: ['https://safe.com']
});

const testCases = [
  // Basic alt attributes
  '![normal-alt](https://safe.com/image.jpg)',
  '![<script>alert("xss")</script>](https://safe.com/image.jpg)',
  '![&lt;script&gt;alert("xss")&lt;/script&gt;](https://safe.com/image.jpg)',
  '![[nested]](https://safe.com/image.jpg)',
  '![alt with "quotes"](https://safe.com/image.jpg)',
  "![alt with 'quotes'](https://safe.com/image.jpg)",
  '![alt with <>&"\'\\[]](https://safe.com/image.jpg)',
  
  // Basic title attributes
  '![alt](https://safe.com/image.jpg "normal title")',
  '![alt](https://safe.com/image.jpg "<script>alert(\\"xss\\")</script>")',
  '![alt](https://safe.com/image.jpg "&lt;script&gt;alert(\\"xss\\")&lt;/script&gt;")',
  '![alt](https://safe.com/image.jpg "[nested]")',
  '![alt](https://safe.com/image.jpg "title with \\"nested quotes\\"")',
  "![alt](https://safe.com/image.jpg 'title with \\'nested quotes\\'')",
  '![alt](https://safe.com/image.jpg "title with <>&\\"\'\\[]")',
  
  // Mixed dangerous content
  '![<img src=x onerror=alert(1)>](https://safe.com/image.jpg "javascript:alert(2)")',
  '![javascript:alert(3)](https://safe.com/image.jpg "data:text/html,<script>alert(4)</script>")',
  '![onclick=alert(5)](https://safe.com/image.jpg "onload=alert(6)")',
  
  // HTML entities in attributes
  '![&#60;script&#62;alert(7)&#60;/script&#62;](https://safe.com/image.jpg)',
  '![alt](https://safe.com/image.jpg "&#60;script&#62;alert(8)&#60;/script&#62;")',
  '![&#x3C;script&#x3E;alert(9)&#x3C;/script&#x3E;](https://safe.com/image.jpg)',
  
  // Unicode and special chars
  '![𝓈𝒸𝓇𝒾𝓅𝓉](https://safe.com/image.jpg "𝒿𝒶𝓋𝒶𝓈𝒸𝓇𝒾𝓅𝓉")',
  '![alert\u0028\u0031\u0029](https://safe.com/image.jpg)',
  '![test\x00injection](https://safe.com/image.jpg "title\x00injection")',
  
  // Markdown inside attributes
  '![alt with **bold**](https://safe.com/image.jpg "title with *italic*")',
  '![alt with [link](javascript:alert(10))](https://safe.com/image.jpg)',
  '![alt with `code`](https://safe.com/image.jpg "title with `code`")',
  
  // Links with similar attribute patterns
  '[link text](https://safe.com/link "title")',
  '[<script>alert(11)</script>](https://safe.com/link "title")',
  '[link](https://safe.com/link "<script>alert(12)</script>")'
];

console.log('=== Testing Alt and Title Attribute Preservation ===\n');

for (const testCase of testCases) {
  console.log(`Input: ${testCase}`);
  const result = sanitizer.sanitize(testCase);
  console.log(`Output: ${result.trim()}`);
  console.log('---');
}