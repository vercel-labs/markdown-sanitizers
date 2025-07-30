"use client";

import ReactMarkdown from "react-markdown";
import type { Components, Options } from "react-markdown";

interface HardenedMarkdownProps extends Options {
  allowedLinkPrefixes?: string[];
  allowedImagePrefixes?: string[];
}

export default function HardenedMarkdown({
  allowedLinkPrefixes = [],
  allowedImagePrefixes = [],
  components: userComponents,
  ...reactMarkdownProps
}: HardenedMarkdownProps) {
  const isAllowedUrl = (url: unknown, allowedPrefixes: string[]): boolean => {
    if (!url) return false;
    const urlString = String(url);
    return allowedPrefixes.some((prefix) => urlString.startsWith(prefix));
  };

  const hardenedComponents: Components = {
    a: ({ href, children, ...props }) => {
      if (isAllowedUrl(href, allowedLinkPrefixes)) {
        return (
          <a href={href} {...props} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      }
      return (
        <span className="text-gray-500" title={`Blocked URL: ${href}`}>
          {children} [blocked]
        </span>
      );
    },
    img: ({ src, alt, ...props }) => {
      if (isAllowedUrl(src as string, allowedImagePrefixes)) {
        return <img src={src} alt={alt} {...props} />;
      }
      return (
        <span className="inline-block bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded text-sm">
          [Image blocked: {alt || "No description"}]
        </span>
      );
    },
  };

  const mergedComponents = {
    ...userComponents,
    ...hardenedComponents,
  };

  return (
    <ReactMarkdown components={mergedComponents} {...reactMarkdownProps} />
  );
}
