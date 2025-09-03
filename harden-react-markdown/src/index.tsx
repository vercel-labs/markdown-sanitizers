"use client";

import { ComponentType, ComponentProps, createElement } from "react";
import type { Components, Options } from "react-markdown";

interface HardenReactMarkdownOptions {
  defaultOrigin?: string;
  allowedLinkPrefixes?: string[];
  allowedImagePrefixes?: string[];
}

// Ensure component accepts Options and extract its exact prop type
type MarkdownComponentProps<T extends ComponentType<Options>> =
  ComponentProps<T>;

// Strict validation that component props are compatible with Options
type ValidateMarkdownComponent<T extends ComponentType<Options>> =
  ComponentProps<T> extends Options ? T : never;

// Enhanced constraint ensuring the component is both Options-compatible and JSX-renderable
type StrictMarkdownComponent<T extends ComponentType<Options>> =
  T extends ComponentType<infer P>
    ? P extends Options
      ? ValidateMarkdownComponent<T>
      : never
    : never;

export default function hardenReactMarkdown<
  TMarkdownComponent extends ComponentType<Options>,
>(
  MarkdownComponent: StrictMarkdownComponent<TMarkdownComponent>,
): ComponentType<
  MarkdownComponentProps<TMarkdownComponent> & HardenReactMarkdownOptions
> {
  return function HardenedReactMarkdown(
    props: MarkdownComponentProps<TMarkdownComponent> &
      HardenReactMarkdownOptions,
  ) {
    const {
      defaultOrigin = "",
      allowedLinkPrefixes = [],
      allowedImagePrefixes = [],
      components: userComponents,
      ...reactMarkdownProps
    } = props;
    // Only require defaultOrigin if we have specific prefixes (not wildcard only)
    const hasSpecificLinkPrefixes =
      allowedLinkPrefixes.length &&
      !allowedLinkPrefixes.every((p) => p === "*");
    const hasSpecificImagePrefixes =
      allowedImagePrefixes.length &&
      !allowedImagePrefixes.every((p) => p === "*");

    if (
      !defaultOrigin &&
      (hasSpecificLinkPrefixes || hasSpecificImagePrefixes)
    ) {
      throw new Error(
        "defaultOrigin is required when allowedLinkPrefixes or allowedImagePrefixes are provided",
      );
    }

    const parseUrl = (url: unknown): URL | null => {
      if (typeof url !== "string") return null;
      try {
        // Try to parse as absolute URL first
        const urlObject = new URL(url);
        return urlObject;
      } catch (error) {
        // If that fails and we have a defaultOrigin, try with it
        if (defaultOrigin) {
          try {
            const urlObject = new URL(url, defaultOrigin);
            return urlObject;
          } catch (error) {
            return null;
          }
        }
        return null;
      }
    };

    const isPathRelativeUrl = (url: unknown): boolean => {
      if (typeof url !== "string") return false;
      return url.startsWith("/");
    };

    const transformUrl = (
      url: unknown,
      allowedPrefixes: string[],
    ): string | null => {
      if (!url) return null;
      const parsedUrl = parseUrl(url);
      if (!parsedUrl) return null;

      // If the input is path relative, we output a path relative URL as well,
      // however, we always run the same checks on an absolute URL and we
      // always rescronstruct the output from the parsed URL to ensure that
      // the output is always a valid URL.
      const inputWasRelative = isPathRelativeUrl(url);
      const urlString = parseUrl(url);
      if (
        urlString &&
        allowedPrefixes.some((prefix) => {
          const parsedPrefix = parseUrl(prefix);
          if (!parsedPrefix) {
            return false;
          }
          if (parsedPrefix.origin !== urlString.origin) {
            return false;
          }
          return urlString.href.startsWith(parsedPrefix.href);
        })
      ) {
        if (inputWasRelative) {
          return urlString.pathname + urlString.search + urlString.hash;
        }
        return urlString.href;
      }
      // Check for wildcard - allow all URLs
      if (allowedPrefixes.includes("*")) {
        // Wildcard only allows http and https URLs
        if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
          return null;
        }
        const inputWasRelative = isPathRelativeUrl(url);
        if (parsedUrl) {
          if (inputWasRelative) {
            return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
          }
          return parsedUrl.href;
        }
      }
      return null;
    };

    const hardenedComponents: Components = {
      a: ({ href, children, node, ...props }) => {
        const transformedUrl = transformUrl(href, allowedLinkPrefixes);
        if (transformedUrl !== null) {
          // If user provided a custom 'a' component, use it with the transformed URL
          if (userComponents?.a) {
            return createElement(userComponents.a, {
              href: transformedUrl,
              children,
              node,
              target: "_blank",
              rel: "noopener noreferrer",
              ...props,
            });
          }

          // Otherwise use default anchor with security attributes
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
      img: ({ src, alt, node, ...props }) => {
        const transformedUrl = transformUrl(src, allowedImagePrefixes);
        if (transformedUrl !== null) {
          // If user provided a custom 'img' component, use it with the transformed URL
          if (userComponents?.img) {
            return createElement(userComponents.img, {
              src: transformedUrl,
              alt,
              node,
              ...props,
            });
          }

          // Otherwise use default img
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

    const componentProps = {
      ...reactMarkdownProps,
      components: mergedComponents,
    } as MarkdownComponentProps<TMarkdownComponent>;

    return createElement(MarkdownComponent, componentProps);
  };
}
