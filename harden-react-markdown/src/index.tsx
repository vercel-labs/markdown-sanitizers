"use client";

import { ComponentType, ComponentProps } from "react";
import type { Options } from "react-markdown";
import { defaultUrlTransform } from "react-markdown";
import { harden, type BlockPolicyType } from "rehype-harden";

export type { BlockPolicyType };

// Only opt-in schemes that are safe to preserve after rehype-harden has run.
// blob: stays on React Markdown's default filter until its validation is stricter.
const unsafeCustomProtocols = new Set([
  "javascript:",
  "data:",
  "file:",
  "vbscript:",
  "blob:",
]);

interface HardenReactMarkdownOptions {
  defaultOrigin?: string;
  allowedLinkPrefixes?: string[];
  allowedImagePrefixes?: string[];
  allowDataImages?: boolean;
  allowedProtocols?: string[];
  linkBlockPolicy?: BlockPolicyType;
  imageBlockPolicy?: BlockPolicyType;
}

export default function hardenReactMarkdown(
  MarkdownComponent: ComponentType<Options>,
): ComponentType<Options & HardenReactMarkdownOptions> {
  return function HardenedReactMarkdown({
    defaultOrigin,
    allowedLinkPrefixes,
    allowedImagePrefixes,
    allowDataImages,
    allowedProtocols,
    linkBlockPolicy,
    imageBlockPolicy,
    rehypePlugins,
    urlTransform,
    ...props
  }: Options & HardenReactMarkdownOptions) {
    const customUrlTransform: NonNullable<Options["urlTransform"]> = (
      url,
      key,
      node,
    ) => {
      // If allowDataImages is enabled and this is an image with a data:image/ URL, allow it
      if (allowDataImages && key === "src" && url.startsWith("data:image/")) {
        return url;
      }

      if (urlTransform) return urlTransform(url, key, node);

      const transformed = defaultUrlTransform(url);
      if (transformed) return transformed;

      // rehype-harden runs last and validates links before this transform.
      // React Markdown's default transform would discard explicitly allowed
      // custom protocols, so preserve those links after hardening.
      if (node.tagName === "a" && key === "href" && allowedProtocols?.length) {
        try {
          const protocol = new URL(url).protocol;
          if (
            !unsafeCustomProtocols.has(protocol) &&
            (allowedProtocols.includes(protocol) ||
              allowedProtocols.includes("*"))
          ) {
            return url;
          }
        } catch {
          // Leave invalid URLs to React Markdown's default transform.
        }
      }

      // Retain React Markdown's defaults for other URLs, including blob:.
      return transformed;
    };

    return (
      <MarkdownComponent
        {...props}
        urlTransform={customUrlTransform}
        rehypePlugins={[
          ...(rehypePlugins ?? []),
          [
            harden,
            { defaultOrigin, allowedLinkPrefixes, allowedImagePrefixes, allowDataImages, allowedProtocols, linkBlockPolicy, imageBlockPolicy },
          ],
        ]}
      />
    );
  };
}
