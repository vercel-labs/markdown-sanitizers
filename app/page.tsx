"use client";

import { useState } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import HardenedReactMarkdown from "@/components/hardened-react-markdown";

export default function Home() {
  const [useHardened, setUseHardened] = useState(true);

  const markdownExamples = [
    {
      title: "Basic Text Formatting",
      content: `# Heading 1
## Heading 2
### Heading 3

This is a paragraph with **bold text** and *italic text*.

You can also use ***bold and italic*** together.`,
    },
    {
      title: "Lists",
      content: `## Unordered List
- First item
- Second item
  - Nested item
  - Another nested item
- Third item

## Ordered List
1. First step
2. Second step
3. Third step`,
    },
    {
      title: "Links and Images",
      content: `[Visit GitHub](https://github.com)

![Alt text for image](https://via.placeholder.com/150)

You can also have [links with **bold** text](https://example.com).`,
    },
    {
      title: "Code Blocks",
      content: `Inline code: \`const greeting = "Hello World";\`

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('React'));
\`\`\`

\`\`\`python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
\`\`\``,
    },
    {
      title: "Tables",
      content: `| Feature | Support |
|---------|---------|
| Tables | ✅ |
| Images | ✅ |
| Links | ✅ |
| Code | ✅ |`,
    },
    {
      title: "Blockquotes",
      content: `> This is a blockquote.
> It can span multiple lines.
>
> > And can be nested too!`,
    },
  ];

  const securityExamples = [
    {
      title: "Allowed Links",
      content: `These links are allowed:
- [GitHub](https://github.com)
- [Official Docs](https://docs.github.com)
- [Website](https://www.example.com)`,
    },
    {
      title: "Blocked Links",
      content: `These links will be blocked:
- [Suspicious Site](https://suspicious-site.com)
- [Unknown Domain](https://random-domain.xyz)
- [HTTP Link](http://insecure.com)`,
    },
    {
      title: "Allowed Images",
      content: `Allowed image sources:
![Placeholder](https://via.placeholder.com/150)
![Unsplash](https://images.unsplash.com/photo-12345)
![Local](/logo.png)`,
    },
    {
      title: "Blocked Images",
      content: `These images will be blocked:
![External](https://external-site.com/image.jpg)
![Unknown CDN](https://cdn.suspicious.com/img.png)
![Random Source](https://random.io/pic.jpg)`,
    },
  ];

  return (
    <div className="font-sans min-h-screen p-8 pb-20 sm:p-20">
      <main className="max-w-6xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold mb-4">React Markdown Examples</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Demonstrating various markdown features using react-markdown
          </p>

          <div className="mt-6 inline-flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useHardened}
                onChange={(e) => setUseHardened(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="font-medium">Use Hardened Markdown</span>
            </label>
            <span className="text-sm text-gray-500">
              (Filters URLs for security)
            </span>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {markdownExamples.map((example, index) => (
            <div
              key={index}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
                {example.title}
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                {useHardened ? (
                  <HardenedReactMarkdown
                    defaultOrigin="https://example.com"
                    allowedLinkPrefixes={[
                      "https://github.com/",
                      "https://docs.",
                      "https://www.",
                    ]}
                    allowedImagePrefixes={[
                      "https://via.placeholder.com/",
                      "https://images.unsplash.com/",
                      "https://example.com/",
                    ]}
                  >
                    {example.content}
                  </HardenedReactMarkdown>
                ) : (
                  <ReactMarkdown>{example.content}</ReactMarkdown>
                )}
              </div>
            </div>
          ))}
        </div>

        {useHardened && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6 text-center">
              Security Examples
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
              HardenedMarkdown filters URLs based on allowed prefixes
            </p>
            <div className="grid gap-8 md:grid-cols-2">
              {securityExamples.map((example, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-6"
                >
                  <h3 className="text-xl font-semibold mb-4 text-purple-600 dark:text-purple-400">
                    {example.title}
                  </h3>
                  <div className="prose dark:prose-invert max-w-none">
                    <HardenedReactMarkdown
                      defaultOrigin="https://example.com"
                      allowedLinkPrefixes={[
                        "https://github.com/",
                        "https://docs.",
                        "https://www.",
                      ]}
                      allowedImagePrefixes={[
                        "https://via.placeholder.com/",
                        "https://images.unsplash.com/",
                        "https://example.com/",
                      ]}
                    >
                      {example.content}
                    </HardenedReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {useHardened && (
          <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h3 className="text-xl font-bold mb-3">
              HardenedMarkdown Configuration
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Allowed Link Prefixes:</strong>
              </p>
              <ul className="list-disc list-inside ml-4">
                <li>
                  <code>https://github.com/</code>
                </li>
                <li>
                  <code>https://docs.</code>
                </li>
                <li>
                  <code>https://www.</code>
                </li>
              </ul>
              <p className="mt-3">
                <strong>Allowed Image Prefixes:</strong>
              </p>
              <ul className="list-disc list-inside ml-4">
                <li>
                  <code>https://via.placeholder.com/</code>
                </li>
                <li>
                  <code>https://images.unsplash.com/</code>
                </li>
                <li>
                  <code>/</code> (local images)
                </li>
              </ul>
            </div>
          </div>
        )}

        <div className="mt-12 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Try It Yourself!</h2>
          <p className="mb-4">
            Here's a live example with all features combined:
          </p>
          <div className="prose dark:prose-invert max-w-none bg-white dark:bg-gray-900 p-6 rounded-lg">
            {useHardened ? (
              <HardenedReactMarkdown
                defaultOrigin="https://example.com"
                allowedLinkPrefixes={[
                  "https://github.com/",
                  "https://docs.",
                  "https://www.",
                ]}
                allowedImagePrefixes={[
                  "https://via.placeholder.com/",
                  "https://images.unsplash.com/",
                  "https://example.com/",
                ]}
              >
                {`# Welcome to React Markdown! 🚀

This **powerful** library lets you render *Markdown* content in your React apps.

## Features Include:

1. **Text formatting** - bold, italic, ~~strikethrough~~
2. Lists (ordered and unordered)
3. [Links](https://github.com) and images
4. \`inline code\` and code blocks
5. Tables and blockquotes

### Code Example:

\`\`\`jsx
import ReactMarkdown from 'react-markdown';

function MyComponent() {
  return <ReactMarkdown>{'# Hello World!'}</ReactMarkdown>;
}
\`\`\`

> "Markdown is a lightweight markup language with plain-text formatting syntax."
> — John Gruber

Happy coding! 💻`}
              </HardenedReactMarkdown>
            ) : (
              <ReactMarkdown>
                {`# Welcome to React Markdown! 🚀

This **powerful** library lets you render *Markdown* content in your React apps.

## Features Include:

1. **Text formatting** - bold, italic, ~~strikethrough~~
2. Lists (ordered and unordered)
3. [Links](https://github.com) and images
4. \`inline code\` and code blocks
5. Tables and blockquotes

### Code Example:

\`\`\`jsx
import ReactMarkdown from 'react-markdown';

function MyComponent() {
  return <ReactMarkdown>{'# Hello World!'}</ReactMarkdown>;
}
\`\`\`

> "Markdown is a lightweight markup language with plain-text formatting syntax."
> — John Gruber

Happy coding! 💻`}
              </ReactMarkdown>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
