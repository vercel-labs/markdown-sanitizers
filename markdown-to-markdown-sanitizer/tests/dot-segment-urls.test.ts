import { describe, expect, test } from "vitest";
import { MarkdownSanitizer } from "../src/index";

// Relative URLs whose normalized pathname begins with an empty segment
// (e.g. "/.//host/x") must stay on the configured origin.
describe("Relative URLs whose normalized pathname begins with an empty segment", () => {
  const ORIGIN = "https://app.example";
  const inputs = [
    "/.//other.example/x.png",
    "/././/other.example/x.png",
    ".//other.example/x.png",
    "/a/..//other.example/x.png",
    "/..//other.example/x.png",
    "../..//other.example/x.png",
    "/%2e//other.example/x.png",
    "/%2E%2E//other.example/x.png",
    "/a/.%2e//other.example/x.png",
    "/.///other.example/x.png",
  ];

  const extractUrls = (output: string) =>
    [...output.matchAll(/\]\(([^)\s]*)\)/g)].map((m) => m[1]);

  for (const sanitizeForCommonmark of [false, true]) {
    describe(`sanitizeForCommonmark: ${sanitizeForCommonmark}`, () => {
      const sanitizer = new MarkdownSanitizer({
        defaultOrigin: ORIGIN,
        allowedLinkPrefixes: ["/"],
        allowedImagePrefixes: ["/"],
        sanitizeForCommonmark,
      });

      test.each(inputs)("markdown and HTML URLs stay on the origin: %s", (input) => {
        const output = sanitizer.sanitize(
          `![a](${input}) [l](${input}) <img src="${input}"> <a href="${input}">h</a>`,
        );
        const urls = extractUrls(output);
        expect(urls).toHaveLength(4);
        for (const url of urls) {
          expect(url.startsWith("//")).toBe(false);
          expect(url.startsWith(`${ORIGIN}/`)).toBe(true);
          expect(new URL(url).origin).toBe(ORIGIN);
        }
      });

      test.each(["//other.example/x.png", "///other.example/x.png"])(
        "still blocks network-path references: %s",
        (input) => {
          const output = sanitizer.sanitize(`![a](${input}) [l](${input})`);
          expect(output).not.toContain("other.example");
        },
      );
    });
  }
});
