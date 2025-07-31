"use client";

import ReactMarkdown from "react-markdown";
import type { Components, Options } from "react-markdown";

interface HardenedMarkdownProps extends Options {
  defaultOrigin?: string;
  allowedLinkPrefixes?: string[];
  allowedImagePrefixes?: string[];
}

export default function HardenedReactMarkdown({
  defaultOrigin = "",
  allowedLinkPrefixes = [],
  allowedImagePrefixes = [],
  components: userComponents,
  ...reactMarkdownProps
}: HardenedMarkdownProps) {
  if (
    !defaultOrigin &&
    (allowedLinkPrefixes.length || allowedImagePrefixes.length)
  ) {
    throw new Error(
      "defaultOrigin is required when allowedLinkPrefixes or allowedImagePrefixes are provided"
    );
  }

  const parseUrl = (url: unknown): URL | null => {
    if (typeof url !== "string") return null;
    try {
      const urlObject = new URL(url, defaultOrigin);
      return urlObject;
    } catch (error) {
      return null;
    }
  };

  const isPathRelativeUrl = (url: unknown): boolean => {
    if (typeof url !== "string") return false;
    return url.startsWith("/");
  };

  const transformUrl = (
    url: unknown,
    allowedPrefixes: string[]
  ): string | null => {
    if (!url) return null;
    // If the input is path relative, we output a path relative URL as well,
    // however, we always run the same checks on an absolute URL and we
    // always rescronstruct the output from the parsed URL to ensure that
    // the output is always a valid URL.
    const inputWasRelative = isPathRelativeUrl(url);
    const urlString = parseUrl(url);
    if (
      urlString &&
      allowedPrefixes.some((prefix) => urlString.href.startsWith(prefix))
    ) {
      if (inputWasRelative) {
        return urlString.pathname + urlString.search + urlString.hash;
      }
      return urlString.href;
    }
    return null;
  };

  const hardenedComponents: Components = {
    a: ({ href, children, ...props }) => {
      const transformedUrl = transformUrl(href, allowedLinkPrefixes);
      if (transformedUrl !== null) {
        return (
          <a
            href={transformedUrl}
            {...props}
            target="_blank"
            rel="noopener noreferrer"
          >
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
      const transformedUrl = transformUrl(src, allowedImagePrefixes);
      if (transformedUrl !== null) {
        return <img src={transformedUrl} alt={alt} {...props} />;
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
