export interface HtmlSanitizeOptions {
  /** Enable HTML sanitization using strict allow-list */
  enabled?: boolean;
}

/**
 * Base interface for URL configuration shared across different option types
 */
export interface SanitizeOptions {
  /** Allowed URL prefixes for links (href attributes) - supports domains and paths */
  allowedLinkPrefixes?: string[];
  /** Allowed URL prefixes for images (src attributes) - supports domains and paths */
  allowedImagePrefixes?: string[];
  /**
   * Default origin specifically for relative links (overrides defaultOrigin if set)
   * Required if your content contains relative links that should be allowed.
   */
  defaultLinkOrigin?: string;
  /**
   * Default origin specifically for relative images (overrides defaultOrigin if set)
   * Required if your content contains relative images that should be allowed.
   */
  defaultImageOrigin?: string;
  /** Maximum length of URLs to be sanitized. Default is 200 characters. 0 means no limit. */
  urlMaxLength?: number;
  /** Maximum length of markdown content to process. Default is 100000 characters. 0 means no limit. */
  maxMarkdownLength?: number;
  /**
   * Default origin for relative URLs (e.g., "https://github.com" or "https://site.com/api")
   * Required if your content contains relative URLs that should be allowed.
   * Without this, all relative URLs will be rejected for security.
   */
  defaultOrigin: string;
  /**
   * Activates sanization designed to be safe in commonmark.
   * Notably, this is what Github uses.
   * The output is less encoded and relies heavier on the markdown
   * parsing to be correct.
   * Default is false.
   */
  sanitizeForCommonmark?: boolean;
}
