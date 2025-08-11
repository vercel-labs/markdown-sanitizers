// Test to verify the complete attribute removal fix

import { MarkdownSanitizer } from './dist/index.js';

const sanitizer = new MarkdownSanitizer({
  defaultOrigin: 'https://example.com',
  allowedImagePrefixes: ['https://example.com', 'https://images.com'],
  allowedLinkPrefixes: ['https://example.com']
});

const testCases = [
  // These should have alt and title completely removed
  '![javascript:alert(1)](https://evil.com/evil.jpg "javascript:alert(2)")',
  '![<script>alert(xss)</script>](https://evil.com/evil.jpg)',
  '![safe text](https://evil.com/evil.jpg "dangerous title")',
  '![normal](https://example.com/safe.jpg "safe title")', // This should keep title since URL is allowed
  '![normal](https://example.com/safe.jpg)', // This should work normally
];

console.log('=== Testing Complete Attribute Removal Fix ===\n');

for (const test of testCases) {
  console.log(`Input: ${test}`);
  const result = sanitizer.sanitize(test);
  console.log(`Output: ${result.trim()}`);
  console.log('---');
}