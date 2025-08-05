# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a robust markdown sanitizer that filters URLs in markdown links and images against prefix allow-lists, with comprehensive HTML sanitization. The sanitizer uses a sophisticated markdown-to-HTML-to-markdown pipeline to ensure security while preserving markdown structure.

## Core Architecture

### Processing Pipeline

The sanitizer follows this flow:

1. **Autolink Normalization** (`normalizeAutolinks`): Converts `<url>` syntax to explicit link format `[url](url)` and rejects URLs containing HTML entities
2. **Markdown → HTML**: Uses unified/remark to parse markdown and convert to HTML
3. **HTML Sanitization**: Uses DOMPurify with GitHub-compatible allow-lists to sanitize HTML
4. **HTML → Markdown**: Uses Turndown with GFM plugin to convert back to markdown
5. **Aggressive Escaping**: Custom escape function converts special characters to HTML entities

### Key Components

- `MarkdownSanitizer` (main class in `src/index.ts`): Orchestrates the entire pipeline
- `UrlNormalizer` (`src/url-normalizer.ts`): Validates URLs against allow-lists and normalizes them
- `HtmlSanitizer` (`src/html-sanitizer.ts`): DOMPurify wrapper with GitHub-compatible configuration
- `SanitizeOptions` (`src/types.ts`): Configuration interface for URL prefixes and origins

### Security Features

- **URL Validation**: Comprehensive prefix matching with support for protocol-only prefixes
- **HTML Entity Escaping**: Aggressive character-to-entity conversion for dangerous characters
- **Streaming Support**: Safe processing of incomplete markdown chunks

## Development Commands

Always use pnpm, not npm.

### Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test -- tests/basic-sanitization.test.ts

# Run tests matching pattern
pnpm test -- --testNamePattern="should sanitize"
```

### Code Quality

```bash
# TypeScript compilation
pnpm run build

# Type checking (source)
pnpm run check-types

# Type checking (tests)
pnpm run check-types:tests

# Type checking (all)
pnpm run check-types:all

# Linting (source)
pnpm run lint

# Linting (tests)
pnpm run lint:tests
```

## Testing Architecture

### Test Structure

- `tests/bypass-attempts/`: 99 adversarial markdown files testing security bypasses
- `tests/bypass-attempts.test.ts`: Runs all bypass attempts against 5 different markdown parsers
- `tests/basic-sanitization.test.ts`: Core functionality tests
- `tests/html-sanitization.test.ts`: HTML sanitization tests
- `tests/security-attacks.test.ts`: XSS prevention tests
- `tests/ai-sdk-middleware.test.ts`: AI SDK integration tests

### Security Testing

The codebase includes extensive security testing with 99 bypass attempt files that test various attack vectors:

- Protocol smuggling and confusion
- Unicode normalization attacks
- Parser state confusion
- Encoding bypass attempts
- URL validation bypasses
- HTML entity attacks

### Test Execution

Tests use Vitest and run against multiple markdown parsers (remark, marked, markdown-it, showdown, commonmark) to ensure comprehensive coverage. The bypass tests expect empty arrays (no dangerous content) and flag any successful bypasses.

## Key Implementation Details

### Autolink Handling

The sanitizer preprocesses autolinks (`<url>`) by:

1. Matching with regex: `/<([a-z][a-z0-9+.-]*:\/\/[^\s<>]+)>/gi`
2. Decoding HTML entities within the URL
3. Rejecting the autolink if entities were found (returns empty string)
4. Converting to explicit link format: `[sanitizedUrl](sanitizedUrl)`

### URL Normalization

- Uses browser URL constructor for parsing and normalization
- Supports relative URLs with `defaultOrigin` configuration
- Validates against `allowedLinkPrefixes` and `allowedImagePrefixes`
- Replaces invalid hrefs with `#` and removes invalid src attributes entirely
- Encodes markdown-dangerous characters (`!()[]` `) as percent-encoded

### HTML Sanitization

- Uses DOMPurify with GitHub-compatible tag and attribute allow-lists
- Supports advanced HTML elements like `<details>`, `<kbd>`, `<samp>`, tables
- Prefixes user-generated IDs with `user-content-`
- Applies URL sanitization to all `href` and `src` attributes in HTML

### Character Escaping

Recent implementation uses aggressive HTML entity encoding for dangerous characters:

```typescript
function encodeAllCharactersToEntities(str: string): string {
  return str.replace(/./g, (char) => `&${char.charCodeAt(0).toString(16)};`);
}
```

This is applied to strings containing: `<>&"'[]:()/!()`

## Configuration

### Required Options

- `defaultOrigin`: Required for relative URL handling (e.g., "https://github.com")

### URL Prefixes

- `allowedLinkPrefixes`: Array of allowed prefixes for links
- `allowedImagePrefixes`: Array of allowed prefixes for images
- Supports protocol-only prefixes like `["https:", "http:"]`
- Supports domain prefixes like `["https://example.com"]`
- Supports path prefixes like `["https://example.com/api"]`

### URL Length Limits

- `urlMaxLength`: Default 200 characters, set to 0 for no limit

## AI SDK Integration

The package includes middleware for the AI SDK that automatically sanitizes markdown content in AI responses, supporting both `generateText` and `streamText` functions.

## Performance Considerations

- Streaming support prevents memory issues with large documents
- Character-by-character parsing avoids regex catastrophic backtracking
- HTML sanitization only runs when needed
- Efficient buffering in streaming mode

## Security Best Practices

When working with this codebase:

1. Always test security changes against the bypass attempt files
2. Use HTTPS prefixes in allow-lists
3. Be specific with URL prefixes (avoid overly broad matches)
4. Test with the comprehensive test suite before making changes
5. Consider the markdown-to-HTML-to-markdown pipeline when making modifications
