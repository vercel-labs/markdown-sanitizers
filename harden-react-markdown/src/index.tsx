"use client";

import { ComponentType, ComponentProps } from "react";
import type { Options } from "react-markdown";
import { harden } from "rehype-harden";

interface HardenReactMarkdownOptions {
  defaultOrigin?: string;
  allowedLinkPrefixes?: string[];
  allowedImagePrefixes?: string[];
}

export default function hardenReactMarkdown(
  MarkdownComponent: ComponentType<Options>,
): ComponentType<Options & HardenReactMarkdownOptions> {
  return function HardenedReactMarkdown({
    defaultOrigin,
    allowedLinkPrefixes,
    allowedImagePrefixes,
    rehypePlugins,
    ...props
  }: Options & HardenReactMarkdownOptions) {
    return (
      <MarkdownComponent
        {...props}
        rehypePlugins={[
          [
            harden,
            { defaultOrigin, allowedLinkPrefixes, allowedImagePrefixes },
          ],
          ...(rehypePlugins ?? []),
        ]}
      />
    );
  };
}
