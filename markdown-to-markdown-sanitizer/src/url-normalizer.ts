import type { SanitizeOptions } from "./types";

export class UrlNormalizer {
  private options: SanitizeOptions;

  constructor(options: SanitizeOptions) {
    this.options = options;
    if (this.options.urlMaxLength === undefined) {
      this.options.urlMaxLength = 200;
    }
  }

  normalizeUrl(url: string, defaultOrigin?: string): string {
    try {
      const normalized = new URL(url, defaultOrigin).href;
      if (
        this.options.urlMaxLength &&
        normalized.length > this.options.urlMaxLength
      ) {
        return "";
      }
      return normalized;
    } catch {
      // Invalid URL - reject
      return "";
    }
  }

  private isAllowedUrlInternal(
    normalizedUrl: string,
    defaultOrigin: string,
    allowedPrefixes: string[]
  ): boolean {
    if (!normalizedUrl) return false;

    // Check if normalized URL starts with any allowed prefix
    return allowedPrefixes.some((prefix) => {
      // Handle protocol-only prefixes like "https:" or "http:"
      if (prefix.match(/^[a-z][a-z0-9+.-]*:$/i)) {
        return normalizedUrl
          .toLowerCase()
          .startsWith(prefix.toLowerCase() + "//");
      }

      // Handle protocol with slashes like "https://"
      if (prefix.match(/^[a-z][a-z0-9+.-]*:\/\/$/i)) {
        return normalizedUrl.toLowerCase().startsWith(prefix.toLowerCase());
      }

      // Handle full URL prefixes
      const normalizedPrefix = this.normalizeUrl(prefix, defaultOrigin);
      if (!normalizedPrefix) return false;
      if (new URL(normalizedPrefix).origin !== new URL(normalizedUrl).origin) {
        return false;
      }
      return normalizedUrl.startsWith(normalizedPrefix);
    });
  }

  isAllowedUrl(normalizedUrl: string): boolean {
    return this.isAllowedUrlInternal(
      normalizedUrl,
      this.options.defaultLinkOrigin || this.options.defaultOrigin,
      this.options.allowedLinkPrefixes || []
    );
  }

  isAllowedImageUrl(normalizedUrl: string): boolean {
    return this.isAllowedUrlInternal(
      normalizedUrl,
      this.options.defaultImageOrigin || this.options.defaultOrigin,
      this.options.allowedImagePrefixes || []
    );
  }

  sanitizeUrl(url: string, type: "href" | "src"): string {
    const normalizedUrl = this.normalizeUrl(
      url,
      type === "src"
        ? this.options.defaultImageOrigin || this.options.defaultOrigin
        : this.options.defaultLinkOrigin || this.options.defaultOrigin
    );
    // Check if URL is allowed based on type
    if (type === "src") {
      if (!this.isAllowedImageUrl(normalizedUrl)) {
        return "/forbidden";
      }
    } else {
      if (!this.isAllowedUrl(normalizedUrl)) {
        return "#";
      }
    }

    return normalizedUrl;
  }
}
