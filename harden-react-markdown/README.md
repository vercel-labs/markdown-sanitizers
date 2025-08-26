# harden-react-markdown

A wrapper for [react-markdown](https://www.npmjs.com/package/react-markdown) that ensures that untrusted
markdown does not contain images from and links to unexpected origins.

This is particularly important for markdown returned from [LLMs in AI agents which might have been subject to prompt
injection](https://vercel.com/blog/building-secure-ai-agents).

## Secure prefixes

This package validates URL prefixes and URL origins. Prefix allow-lists can be circumvented
with open redirects, so make sure to make the prefixes are specific enough to avoid such attacks.

E.g. it is more secure to allow `https://example.com/images/` than it is to allow all of
`https://example.com/` which may contain open redirects.

Additionally, URLs may contain path traversal like `/../`. This package does not resolve these.
It is your responsibility that your web server does not allow such traversal.

## Features

- 🔒 **URL Filtering**: Blocks links and images that don't match allowed URL prefixes
- 🔧 **Drop-in Replacement**: Works with any react-markdown compatible component

## Installation

```bash
npm install harden-react-markdown react react-markdown
# or
yarn add harden-react-markdown react react-markdown
# or
pnpm add harden-react-markdown react react-markdown
```

## Quick Start

```tsx
import React from "react";
import ReactMarkdown from "react-markdown";
import hardenReactMarkdown from "harden-react-markdown";

// Create a hardened version of ReactMarkdown
const HardenedMarkdown = hardenReactMarkdown(ReactMarkdown);

function MyComponent() {
  const markdown = `
# My Document
[Safe Link](https://github.com/user/repo)
[Blocked Link](https://malicious-site.com)
![Safe Image](https://via.placeholder.com/150)
![Blocked Image](https://evil.com/tracker.gif)
  `;

  return (
    <HardenedMarkdown
      defaultOrigin="https://mysite.com"
      allowedLinkPrefixes={["https://github.com/", "https://docs."]}
      allowedImagePrefixes={["https://via.placeholder.com/", "/"]}
    >
      {markdown}
    </HardenedMarkdown>
  );
}
```

## API

### `hardenReactMarkdown(MarkdownComponent)`

Creates a hardened version of any react-markdown compatible component.

#### Parameters

- `MarkdownComponent`: A React component that accepts `Options` from react-markdown

#### Returns

A new component with enhanced security that accepts all original props plus:

### Props

#### `defaultOrigin?: string`

- The origin to resolve relative URLs against
- Required when `allowedLinkPrefixes` or `allowedImagePrefixes` are provided
- Example: `"https://mysite.com"`

#### `allowedLinkPrefixes?: string[]`

- Array of URL prefixes that are allowed for links
- Links not matching these prefixes will be blocked and shown as `[blocked]`
- Use `"*"` to allow all URLs (disables filtering. However, `javascript:` and `data:` URLs are always disallowed)
- Default: `[]` (blocks all links)
- Example: `['https://github.com/', 'https://docs.example.com/']` or `['*']`

#### `allowedImagePrefixes?: string[]`

- Array of URL prefixes that are allowed for images
- Images not matching these prefixes will be blocked and shown as placeholders
- Use `"*"` to allow all URLs (disables filtering. However, `javascript:` and `data:` URLs are always disallowed)
- Default: `[]` (blocks all images)
- Example: `['https://via.placeholder.com/', '/']` or `['*']`

All other props are passed through to the wrapped markdown component.

## Examples

### Basic Usage with Default Blocking

```tsx
const HardenedMarkdown = hardenReactMarkdown(ReactMarkdown);

// Blocks all external links and images by default
<HardenedMarkdown>{markdownContent}</HardenedMarkdown>;
```

### Allow Specific Domains

```tsx
<HardenedMarkdown
  defaultOrigin="https://mysite.com"
  allowedLinkPrefixes={[
    "https://github.com/",
    "https://docs.github.com/",
    "https://www.npmjs.com/",
  ]}
  allowedImagePrefixes={[
    "https://via.placeholder.com/",
    "https://images.unsplash.com/",
    "/", // Allow relative images
  ]}
>
  {markdownContent}
</HardenedMarkdown>
```

### Relative URL Handling

```tsx
<HardenedMarkdown
  defaultOrigin="https://mysite.com"
  allowedLinkPrefixes={["https://mysite.com/"]}
  allowedImagePrefixes={["https://mysite.com/"]}
>
  {`
  [Relative Link](/internal-page)
  ![Relative Image](/images/logo.png)
  `}
</HardenedMarkdown>
```

### Allow All URLs (Wildcard)

```tsx
<HardenedMarkdown allowedLinkPrefixes={["*"]} allowedImagePrefixes={["*"]}>
  {`
  [Any Link](https://anywhere.com/link)
  ![Any Image](https://untrusted-site.com/image.jpg)
  `}
</HardenedMarkdown>
```

**Note**: Using `"*"` disables URL filtering entirely. Only use this when you trust the markdown source.

### Custom Components

```tsx
const CustomMarkdown = (props) => (
  <div className="custom-wrapper">
    <ReactMarkdown {...props} />
  </div>
);

const HardenedCustomMarkdown = hardenReactMarkdown(CustomMarkdown);

<HardenedCustomMarkdown
  defaultOrigin="https://mysite.com"
  allowedLinkPrefixes={["https://trusted.com/"]}
>
  {markdownContent}
</HardenedCustomMarkdown>;
```

## Security Features

### URL Filtering

- **Links**: Filters `href` attributes in `<a>` elements
- **Images**: Filters `src` attributes in `<img>` elements
- **Relative URLs**: Properly resolves and validates relative URLs against `defaultOrigin`
- **Path Traversal Protection**: Normalizes URLs to prevent `../` attacks
- **Wildcard Support**: Use `"*"` prefix to disable filtering (only when markdown is trusted)
- **Prefix Matching**: Validates that URLs start with allowed prefixes and have matching origins

### Blocked Content Handling

- **Blocked Links**: Rendered as plain text with `[blocked]` indicator
- **Blocked Images**: Rendered as placeholder text with image description
- **User Feedback**: Clear indication when content has been blocked for security

### Attack Prevention

- **XSS Prevention**: Blocks `javascript:`, `data:`, `vbscript:` and other dangerous protocols
- **Redirect Protection**: Prevents unauthorized redirects to malicious sites
- **Tracking Prevention**: Blocks unauthorized image tracking pixels
- **Domain Spoofing**: Validates full URLs, not just domains

## TypeScript Support

Full TypeScript support with strict type checking:

```tsx
// Type-safe component creation
const HardenedMarkdown = hardenReactMarkdown(ReactMarkdown);

// Inferred prop types include both react-markdown Options and security options
type Props = Parameters<typeof HardenedMarkdown>[0];

// Works with custom markdown components
const CustomMarkdown = (props: Options & { customProp?: string }) => (
  <ReactMarkdown {...props} />
);

const HardenedCustom = hardenReactMarkdown(CustomMarkdown);
// Props now include customProp + security options
```

## Testing

The package includes comprehensive tests covering:

- Basic markdown rendering
- URL filtering for links and images
- Relative URL handling
- Security bypass prevention
- Edge cases and malformed URLs
- TypeScript type safety

Run tests:

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Security

If you discover a security vulnerability, please send an e-mail to <security@vercel.com>.
