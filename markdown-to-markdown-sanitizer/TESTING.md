# Testing Guide

This project has a comprehensive test suite with 192 tests across 9 test suites covering all aspects of the markdown sanitizer, including GitHub-compatible HTML sanitization and AI SDK middleware.

## Test Structure

```
tests/
├── unit/                          # Unit tests for core functionality
│   ├── basic-sanitization.test.ts # URL filtering, HTML processing
│   └── streaming.test.ts          # Streaming and buffering
├── edge-cases/                    # Edge case and parsing tests
│   ├── weird-parsing.test.ts      # Complex parsing scenarios
│   └── malformed-markdown.test.ts # Malformed input handling
├── security/                      # Security-focused tests
│   ├── xss-prevention.test.ts     # XSS attack prevention
│   └── adversarial-inputs.test.ts # Performance & resource attacks
├── integration/                   # Real-world usage tests
│   └── real-world-scenarios.test.ts # Documentation, CMS, chat systems
├── html/                          # HTML sanitization tests
│   └── html-sanitization.test.ts # sanitize-html integration, XSS prevention
├── middleware/                    # AI SDK middleware tests
│   └── ai-sdk-middleware.test.ts  # AI SDK integration, streaming sanitization
├── globals.d.ts                   # Global Jest type definitions
└── .eslintrc.js                  # Test-specific ESLint config
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm test tests/unit/basic-sanitization.test.ts
pnpm test tests/security/
pnpm test tests/middleware/

# Run tests with coverage
pnpm test --coverage

# Watch mode for development
pnpm test --watch
```

## TypeScript Support

The test suite has full TypeScript support with explicit Jest imports:

```typescript
// All test files use explicit imports
import { describe, it, expect } from "@jest/globals";
import { sanitizeMarkdown } from "../../src/index";
```

```bash
# Type check source code
pnpm run typecheck

# Type check test files
pnpm run typecheck:tests

# Type check everything
pnpm run typecheck:all
```

## Linting

```bash
# Lint source code
pnpm run lint

# Lint test files
pnpm run lint:tests
```

## Test Categories

### Unit Tests (20 tests)

- Basic URL prefix filtering
- HTML tag processing
- Custom inspection functions
- Streaming functionality

### Edge Cases (65 tests)

- Weird parsing scenarios (nested brackets, escaped characters, Unicode)
- Malformed markdown (unclosed constructs, invalid nesting, broken escaping)

### Security Tests (42 tests)

- XSS prevention (JavaScript protocols, data URIs, encoding bypasses)
- Adversarial inputs (parser bombs, memory exhaustion, Unicode attacks)

### HTML Sanitization Tests (28 tests)

- sanitize-html integration with GitHub-compatible configuration
- HTML XSS prevention (script tags, event handlers, dangerous URLs)
- HTML and markdown mixed content processing
- GitHub-specific elements (details/summary, tables, kbd/samp/var, etc.)
- User-content prefixing for anchors (matching GitHub behavior)
- Automatic URL prefix enforcement

### AI SDK Middleware Tests (21 tests)

- AI SDK integration for generateText and streamText
- Automatic markdown/HTML sanitization in AI responses
- Streaming content sanitization with proper buffering
- Custom inspection function integration
- Edge cases: null/undefined content, empty responses, complex nested structures
- Performance testing with large streaming content
- Error handling and graceful failure scenarios
- GitHub-specific HTML elements in AI-generated content

### Integration Tests (16 tests)

- Real-world scenarios (documentation, user content, CMS, chat systems)
- Performance under realistic load

## Configuration Files

- `tsconfig.test.json` - TypeScript config for tests
- `jest.config.js` - Jest configuration with explicit imports (`injectGlobals: false`)
- `tests/.eslintrc.js` - Test-specific ESLint rules

## IDE Support

The test files have full TypeScript support in editors like VS Code:

- Explicit Jest imports (`describe`, `it`, `expect`) are properly typed from `@jest/globals`
- Auto-completion for the sanitizer API
- Type checking and error highlighting
- Import suggestions and refactoring support
- No reliance on global Jest types - all imports are explicit
