# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo containing two related security-focused npm packages for hardening markdown against data exfiltration attacks through LLM prompt injection:

1. **harden-react-markdown**: A wrapper for `react-markdown` that filters URLs with configurable allow-lists
2. **markdown-to-markdown-sanitizer**: A markdown-to-markdown sanitizer for third-party rendering scenarios (GitHub, GitLab)

## Repository Structure

- `harden-react-markdown/`: React wrapper for secure markdown rendering
- `markdown-to-markdown-sanitizer/`: Standalone markdown sanitizer with comprehensive security testing

## Development Commands

Both packages use **pnpm** (not npm) as the package manager.

### Root-level Commands

```bash
# Run tests for both packages
pnpm test

# Run tests for specific package
pnpm run test:harden-react-markdown
pnpm run test:markdown-to-markdown-sanitizer
```

### harden-react-markdown

```bash
cd harden-react-markdown

# Build the package
pnpm run build

# Run tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with UI
pnpm run test:ui

# Prepare for publishing (build + test)
pnpm run prepublishOnly
```

### markdown-to-markdown-sanitizer

```bash
cd markdown-to-markdown-sanitizer

# Build the package
pnpm run build

# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with UI
pnpm run test:ui

# Run tests with coverage
pnpm run test:coverage

# Type checking
pnpm run check-types
pnpm run check-types:tests
pnpm run check-types:all

# Linting
pnpm run lint
pnpm run lint:tests

# Run single test file
pnpm test -- tests/basic-sanitization.test.ts
```

## Architecture Overview

### harden-react-markdown

- **Purpose**: Drop-in replacement for `react-markdown` with URL filtering
- **Key Features**: URL prefix allow-lists for links and images, relative URL handling
- **Security**: Blocks dangerous protocols, provides clear blocked content indicators

### markdown-to-markdown-sanitizer

- **Purpose**: Sanitizes markdown intended for third-party rendering
- **Pipeline**: Markdown → HTML → DOMPurify → Turndown → Entity encoding
- **Key Components**:
  - `MarkdownSanitizer`: Main orchestration class
  - `UrlNormalizer`: URL validation and prefix matching
  - `HtmlSanitizer`: DOMPurify wrapper with GitHub-compatible rules
- **Security**: 111+ bypass attempt tests, comprehensive URL validation, HTML entity escaping

## Testing Strategy

Both packages share the tests based on markdown-to-markdown-sanitizer/tests/bypass-attempts/\*.md.
Adding more examples hardens both packages

### harden-react-markdown

- Basic component functionality tests
- URL filtering validation
- Security bypass prevention
- TypeScript type safety

### markdown-to-markdown-sanitizer

- **Bypass Testing**: 111 adversarial markdown files in `tests/bypass-attempts/`
- **Multi-Parser Testing**: Tests against 5 different markdown parsers (remark, marked, markdown-it, showdown, commonmark)
- **Comprehensive Coverage**: 800+ tests covering sanitization, HTML processing, edge cases
- **Security Focus**: XSS prevention, protocol smuggling, encoding bypass attempts

## Security Considerations

Both packages are designed for **defensive security use only**:

- URL allow-listing to prevent data exfiltration
- XSS prevention through HTML sanitization
- Protocol filtering (javascript:, data:, etc.)
- Comprehensive bypass attempt testing

## Key Implementation Notes

### URL Normalization

- Uses browser URL constructor for parsing
- Supports protocol-only, domain, and path prefixes
- Encodes markdown-dangerous characters as percent-encoded
- Replaces invalid hrefs with `#`, removes invalid src attributes

### HTML Sanitization (markdown-to-markdown-sanitizer)

- DOMPurify with GitHub-compatible allow-lists
- Supports advanced HTML elements (details, tables, ruby)
- Prefixes user-generated IDs with `user-content-`
- Aggressive character-to-entity encoding for dangerous characters

### Performance

- Configurable length limits prevent DoS attacks
- Efficient markdown-to-HTML-to-markdown pipeline
- Character-by-character parsing avoids regex catastrophic backtracking
