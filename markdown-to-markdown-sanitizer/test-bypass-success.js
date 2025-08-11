// Test the specific bypasses that are causing test failures

import { MarkdownSanitizer } from './dist/index.js';

const sanitizer = new MarkdownSanitizer({
  defaultOrigin: 'https://example.com',
  allowedImagePrefixes: ['https://example.com', 'https://images.com'],
  allowedLinkPrefixes: ['https://example.com']
});

// Test cases that are causing the bypass detection to trigger
const criticalTests = [
  '![safe](https://evil.com/image.jpg "`${alert(1)}`")',
  '![safe](https://evil.com/image.jpg "`${document.domain}`")',
  '![safe](https://evil.com/image.jpg "`${fetch(//evil.com)}`")',
  '![javascript:alert(document.cookie)](https://evil.com/steal-cookies.jpg)',
  '![onload:alert(document.domain)](https://attacker.com/domain-leak.jpg)',
  '![blocked-image-js-title](https://evil.com/image.jpg "javascript:alert(document.domain)")'
];

console.log('=== Testing Critical Bypasses ===\n');

for (const test of criticalTests) {
  console.log(`Input: ${test}`);
  const result = sanitizer.sanitize(test);
  console.log(`Output: ${result.trim()}`);
  console.log('---');
}