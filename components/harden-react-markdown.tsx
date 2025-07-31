"use client";

import { ComponentType, ComponentProps, createElement } from "react";
import type { Components, Options } from "react-markdown";

interface HardenReactMarkdownOptions {
  defaultOrigin?: string;
  allowedLinkPrefixes?: string[];
  allowedImagePrefixes?: string[];
}

// Ensure component accepts Options and extract its exact prop type
type MarkdownComponentProps<T extends ComponentType<Options>> = ComponentProps<T>;

// Strict validation that component props are compatible with Options
type ValidateMarkdownComponent<T extends ComponentType<Options>> = 
  ComponentProps<T> extends Options
    ? T
    : never;

// Enhanced constraint ensuring the component is both Options-compatible and JSX-renderable
type StrictMarkdownComponent<T extends ComponentType<Options>> = 
  T extends ComponentType<infer P>
    ? P extends Options
      ? ValidateMarkdownComponent<T>
      : never
    : never;

export default function hardenReactMarkdown<
  TMarkdownComponent extends ComponentType<Options>
>(
  MarkdownComponent: StrictMarkdownComponent<TMarkdownComponent>
): ComponentType<MarkdownComponentProps<TMarkdownComponent> & HardenReactMarkdownOptions> {
  return function HardenedReactMarkdown(
    props: MarkdownComponentProps<TMarkdownComponent> & HardenReactMarkdownOptions
  ) {
    const {
      defaultOrigin = "",
      allowedLinkPrefixes = [],
      allowedImagePrefixes = [],
      components: userComponents,
      ...reactMarkdownProps
    } = props;
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

    const componentProps = {
      ...reactMarkdownProps,
      components: mergedComponents
    } as MarkdownComponentProps<TMarkdownComponent>;
    
    return createElement(MarkdownComponent, componentProps);
  };
}
