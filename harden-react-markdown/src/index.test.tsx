import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import ReactMarkdown from "react-markdown";
import type { Options } from "react-markdown";
import hardenReactMarkdown from "./index";

// Create the hardened version using our function
const HardenedReactMarkdown = hardenReactMarkdown(ReactMarkdown);

describe("HardenedMarkdown", () => {
  // Helper function to test blocked URLs concisely
  const testBlockedUrls = (
    urlType: "link" | "image",
    badUrls: string[],
    allowedPrefixes: string[],
    defaultOrigin: string,
  ) => {
    badUrls.forEach((url) => {
      it(`blocks ${urlType} with URL: ${url}`, () => {
        const markdown =
          urlType === "link" ? `[Test](${url})` : `![Test](${url})`;

        render(
          <HardenedReactMarkdown
            defaultOrigin={defaultOrigin}
            allowedLinkPrefixes={urlType === "link" ? allowedPrefixes : []}
            allowedImagePrefixes={urlType === "image" ? allowedPrefixes : []}
          >
            {markdown}
          </HardenedReactMarkdown>,
        );

        if (urlType === "link") {
          expect(screen.queryByRole("link")).not.toBeInTheDocument();
          expect(screen.getByText("Test [blocked]")).toBeInTheDocument();
        } else {
          expect(screen.queryByRole("img")).not.toBeInTheDocument();
          expect(screen.getByText("[Image blocked: Test]")).toBeInTheDocument();
        }
      });
    });
  };

  describe("defaultOrigin requirement", () => {
    it("throws error when allowedLinkPrefixes provided without defaultOrigin", () => {
      expect(() => {
        render(
          <HardenedReactMarkdown allowedLinkPrefixes={["https://github.com/"]}>
            {"[Test](https://github.com)"}
          </HardenedReactMarkdown>,
        );
      }).toThrow(
        "defaultOrigin is required when allowedLinkPrefixes or allowedImagePrefixes are provided",
      );
    });

    it("throws error when allowedImagePrefixes provided without defaultOrigin", () => {
      expect(() => {
        render(
          <HardenedReactMarkdown
            allowedImagePrefixes={["https://example.com/"]}
          >
            {"![Test](https://example.com/image.jpg)"}
          </HardenedReactMarkdown>,
        );
      }).toThrow(
        "defaultOrigin is required when allowedLinkPrefixes or allowedImagePrefixes are provided",
      );
    });

    it("does not throw when no prefixes are provided", () => {
      expect(() => {
        render(
          <HardenedReactMarkdown>
            {"[Test](https://github.com)"}
          </HardenedReactMarkdown>,
        );
      }).not.toThrow();
    });
  });

  describe("URL transformation", () => {
    it("preserves relative URLs when input is relative and allowed", () => {
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://example.com/"]}
        >
          {"[Test](/path/to/page?query=1#hash)"}
        </HardenedReactMarkdown>,
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/path/to/page?query=1#hash");
    });

    it("returns absolute URL when input is absolute and allowed", () => {
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://github.com/"]}
        >
          {"[Test](https://github.com/user/repo)"}
        </HardenedReactMarkdown>,
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "https://github.com/user/repo");
    });

    it("correctly resolves relative URLs against defaultOrigin for validation", () => {
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://trusted.com"
          allowedLinkPrefixes={["https://trusted.com/"]}
        >
          {"[Test](/api/data)"}
        </HardenedReactMarkdown>,
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/api/data");
    });

    it("blocks relative URLs that resolve to disallowed origins", () => {
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://untrusted.com"
          allowedLinkPrefixes={["https://trusted.com/"]}
        >
          {"[Test](/api/data)"}
        </HardenedReactMarkdown>,
      );

      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.getByText("Test [blocked]")).toBeInTheDocument();
    });

    it("handles protocol-relative URLs", () => {
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://cdn.example.com/"]}
        >
          {"[Test](//cdn.example.com/resource)"}
        </HardenedReactMarkdown>,
      );

      const link = screen.getByRole("link");
      // Protocol-relative URLs become relative paths when input was relative
      expect(link).toHaveAttribute("href", "/resource");
    });

    it("normalizes URLs to prevent bypasses", () => {
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://github.com/"]}
        >
          {"[Test](https://github.com/../../../evil.com)"}
        </HardenedReactMarkdown>,
      );

      // URL normalization resolves to https://github.com/evil.com which is allowed
      // since it starts with https://github.com/
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "https://github.com/evil.com");
    });
  });

  describe("Bad URL cases - Links", () => {
    const badLinkUrls = [
      'javascript:alert("XSS")',
      'data:text/html,<script>alert("XSS")</script>',
      'vbscript:msgbox("XSS")',
      "file:///etc/passwd",
      "about:blank",
      "blob:https://example.com/uuid",
      "mailto:user@example.com",
      "tel:+1234567890",
      "ftp://ftp.example.com/file",
      "../../../etc/passwd",
      "//evil.com/malware",
      "https://evil.com@github.com",
      "https://github.com.evil.com",
      "https://github.com%2e%2e%2f%2e%2e%2fevil.com",
      "https://github.com\\.evil.com",
      "https://github.com%00.evil.com",
      "https://github.com%E2%80%8B.evil.com", // Zero-width space
      "\x00javascript:alert(1)",
      " javascript:alert(1)",
      "javascript\x00:alert(1)",
      "jav&#x61;script:alert(1)",
      "jav&#97;script:alert(1)",
    ];

    testBlockedUrls(
      "link",
      badLinkUrls,
      ["https://github.com/"],
      "https://example.com",
    );

    testBlockedUrls(
      "link",
      badLinkUrls,
      ["https://github.com"],
      "https://example.com",
    );
  });

  describe("Bad URL cases - Images", () => {
    const badImageUrls = [
      "javascript:void(0)",
      "vbscript:execute",
      "file:///etc/passwd",
      "blob:https://example.com/uuid",
      "../../../sensitive.jpg",
      "//evil.com/tracker.gif",
      "https://evil.com@trusted.com/image.jpg",
      "https://trusted.com.evil.com/image.jpg",
      "\x00javascript:void(0)",
    ];

    testBlockedUrls(
      "image",
      badImageUrls,
      ["https://trusted.com/"],
      "https://example.com",
    );
  });

  describe("Edge cases with malformed URLs", () => {
    it("handles null href gracefully", () => {
      render(
        <HardenedReactMarkdown defaultOrigin="https://example.com">
          {"[Test]()"}
        </HardenedReactMarkdown>,
      );
      expect(screen.getByText("Test [blocked]")).toBeInTheDocument();
    });

    it("handles undefined src gracefully", () => {
      render(
        <HardenedReactMarkdown defaultOrigin="https://example.com">
          {"![Test]()"}
        </HardenedReactMarkdown>,
      );
      expect(screen.getByText("[Image blocked: Test]")).toBeInTheDocument();
    });

    it("handles numeric URL inputs", () => {
      const markdown = "[Test](123)"; // Number as URL becomes relative path
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://example.com/"]}
        >
          {markdown}
        </HardenedReactMarkdown>,
      );
      // Numeric URLs resolve to relative paths like /123 which become https://example.com/123
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "https://example.com/123");
    });

    it("handles URLs with unicode characters", () => {
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://example.com/"]}
        >
          {"[Test](https://example.com/路径/文件)"}
        </HardenedReactMarkdown>,
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "href",
        "https://example.com/%E8%B7%AF%E5%BE%84/%E6%96%87%E4%BB%B6",
      );
    });

    it("handles extremely long URLs", () => {
      const longPath = "a".repeat(10000);
      const markdown = `[Test](https://example.com/${longPath})`;

      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://example.com/"]}
        >
          {markdown}
        </HardenedReactMarkdown>,
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", `https://example.com/${longPath}`);
    });
  });
  describe("Basic markdown rendering", () => {
    it("renders headings correctly", () => {
      render(
        <HardenedReactMarkdown>
          {"# Heading 1\n## Heading 2"}
        </HardenedReactMarkdown>,
      );

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Heading 1",
      );
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
        "Heading 2",
      );
    });

    it("renders paragraphs and text formatting", () => {
      render(
        <HardenedReactMarkdown>
          {"This is **bold** and this is *italic*"}
        </HardenedReactMarkdown>,
      );

      expect(screen.getByText("bold")).toBeInTheDocument();
      expect(screen.getByText("italic")).toBeInTheDocument();
    });

    it("renders lists correctly", () => {
      const markdown = `
- Item 1
- Item 2

1. First
2. Second
      `;

      render(<HardenedReactMarkdown>{markdown}</HardenedReactMarkdown>);

      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
      expect(screen.getByText("First")).toBeInTheDocument();
      expect(screen.getByText("Second")).toBeInTheDocument();
    });

    it("renders code blocks", () => {
      const { container } = render(
        <HardenedReactMarkdown>
          {`\`inline code\`

\`\`\`
block code
\`\`\``}
        </HardenedReactMarkdown>,
      );

      expect(screen.getByText("inline code")).toBeInTheDocument();
      // For code blocks, check the pre element exists
      const preElement = container.querySelector("pre");
      expect(preElement).toBeInTheDocument();
      expect(preElement?.textContent).toContain("block code");
    });
  });

  describe("Security properties - Links", () => {
    it("blocks all links when no prefixes are allowed", () => {
      const markdown = "[GitHub](https://github.com)";
      render(<HardenedReactMarkdown>{markdown}</HardenedReactMarkdown>);

      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.getByText("GitHub [blocked]")).toBeInTheDocument();
    });

    it("blocks all links when empty allowedLinkPrefixes array is provided", () => {
      const markdown = "[GitHub](https://github.com)";
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={[]}
        >
          {markdown}
        </HardenedReactMarkdown>,
      );

      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.getByText("GitHub [blocked]")).toBeInTheDocument();
    });

    it("allows links with allowed prefixes", () => {
      const markdown = "[GitHub](https://github.com/user/repo)";
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://github.com/"]}
        >
          {markdown}
        </HardenedReactMarkdown>,
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "https://github.com/user/repo");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("blocks links that do not match allowed prefixes", () => {
      const markdown = `
[Allowed](https://github.com/repo)
[Blocked](https://evil.com/malware)
      `;

      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://github.com/"]}
        >
          {markdown}
        </HardenedReactMarkdown>,
      );

      expect(screen.getByRole("link")).toHaveTextContent("Allowed");
      expect(screen.getByText("Blocked [blocked]")).toBeInTheDocument();
    });

    it("handles multiple allowed prefixes", () => {
      const markdown = `
[GitHub](https://github.com/repo)
[Docs](https://docs.example.com/page)
[Website](https://www.example.com)
[Blocked](https://malicious.com)
      `;

      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={[
            "https://github.com/",
            "https://docs.example.com",
            "https://www.example.com",
          ]}
        >
          {markdown}
        </HardenedReactMarkdown>,
      );

      const links = screen.getAllByRole("link");
      expect(links.map((link) => link.getAttribute("href"))).toEqual([
        "https://github.com/repo",
        "https://docs.example.com/page",
        "https://www.example.com/",
      ]);
      expect(screen.getByText("Blocked [blocked]")).toBeInTheDocument();
    });
  });

  describe("Security properties - Images", () => {
    it("blocks all images when no prefixes are allowed", () => {
      const markdown = "![Alt text](https://example.com/image.jpg)";
      render(<HardenedReactMarkdown>{markdown}</HardenedReactMarkdown>);

      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.getByText("[Image blocked: Alt text]")).toBeInTheDocument();
    });

    it("blocks all images when empty allowedImagePrefixes array is provided", () => {
      const markdown = "![Alt text](https://example.com/image.jpg)";
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedImagePrefixes={[]}
        >
          {markdown}
        </HardenedReactMarkdown>,
      );

      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.getByText("[Image blocked: Alt text]")).toBeInTheDocument();
    });

    it("allows images with allowed prefixes", () => {
      const markdown = "![Placeholder](https://via.placeholder.com/150)";
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedImagePrefixes={["https://via.placeholder.com/"]}
        >
          {markdown}
        </HardenedReactMarkdown>,
      );

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "https://via.placeholder.com/150");
      expect(img).toHaveAttribute("alt", "Placeholder");
    });

    it("blocks images that do not match allowed prefixes", () => {
      const markdown = `
![Allowed](https://via.placeholder.com/150)
![Blocked](https://evil.com/malware.jpg)
      `;

      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedImagePrefixes={["https://via.placeholder.com/"]}
        >
          {markdown}
        </HardenedReactMarkdown>,
      );

      expect(screen.getByRole("img")).toHaveAttribute("alt", "Allowed");
      expect(screen.getByText("[Image blocked: Blocked]")).toBeInTheDocument();
    });

    it("handles images without alt text", () => {
      const markdown = "![](https://example.com/image.jpg)";
      render(<HardenedReactMarkdown>{markdown}</HardenedReactMarkdown>);

      expect(
        screen.getByText("[Image blocked: No description]"),
      ).toBeInTheDocument();
    });

    it("allows local images with correct origin", () => {
      const markdown = "![Logo](/logo.png)";
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedImagePrefixes={["https://example.com/"]}
        >
          {markdown}
        </HardenedReactMarkdown>,
      );

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "/logo.png");
    });

    it("transforms relative image URLs correctly", () => {
      const markdown = "![Image](/images/test.jpg?v=1#section)";
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://trusted.com"
          allowedImagePrefixes={["https://trusted.com/"]}
        >
          {markdown}
        </HardenedReactMarkdown>,
      );

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "/images/test.jpg?v=1#section");
    });
  });

  describe("ReactMarkdown prop compatibility", () => {
    it("accepts standard ReactMarkdown props", () => {
      // Test that it accepts props without error
      const { container } = render(
        <HardenedReactMarkdown skipHtml={true} unwrapDisallowed={true}>
          {"# Test with <span>HTML</span>"}
        </HardenedReactMarkdown>,
      );

      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      // HTML should be skipped
      expect(container.textContent).not.toContain("<span>");
    });

    it("accepts and uses custom components", () => {
      const customComponents = {
        h1: ({ children }: any) => <h1 data-testid="custom-h1">{children}</h1>,
      };

      render(
        <HardenedReactMarkdown components={customComponents}>
          {"# Custom Heading"}
        </HardenedReactMarkdown>,
      );

      expect(screen.getByTestId("custom-h1")).toHaveTextContent(
        "Custom Heading",
      );
    });

    it("hardened components override user components for security", () => {
      const customComponents = {
        a: ({ children }: any) => <a data-testid="custom-link">{children}</a>,
      };

      render(
        <HardenedReactMarkdown components={customComponents}>
          {"[Link](https://example.com)"}
        </HardenedReactMarkdown>,
      );

      // Should use hardened component, not custom one, for blocked URLs
      expect(screen.queryByTestId("custom-link")).not.toBeInTheDocument();
      expect(screen.getByText("Link [blocked]")).toBeInTheDocument();
    });

    it("uses custom components with security enhancements for allowed URLs", () => {
      const customComponents = {
        a: ({ children, className, ...props }: any) => (
          <a
            data-testid="custom-link"
            className={`custom-class ${className || ""}`}
            {...props}
          >
            {children}
          </a>
        ),
      };

      render(
        <HardenedReactMarkdown
          components={customComponents}
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://example.com/"]}
        >
          {"[Link](https://example.com/page)"}
        </HardenedReactMarkdown>,
      );

      // Should use custom component with security enhancements
      const link = screen.getByTestId("custom-link");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "https://example.com/page");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link).toHaveClass("custom-class");
    });

    it("accepts remarkPlugins and rehypePlugins", () => {
      // This just tests that the props are accepted without error
      render(
        <HardenedReactMarkdown remarkPlugins={[]} rehypePlugins={[]}>
          {"# Test"}
        </HardenedReactMarkdown>,
      );

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Test",
      );
    });
  });

  describe("Edge cases", () => {
    it("handles undefined href in links", () => {
      render(<HardenedReactMarkdown>{"[No href]()"}</HardenedReactMarkdown>);
      expect(screen.getByText("No href [blocked]")).toBeInTheDocument();
    });

    it("handles undefined src in images", () => {
      render(<HardenedReactMarkdown>{"![No src]()"}</HardenedReactMarkdown>);
      expect(screen.getByText("[Image blocked: No src]")).toBeInTheDocument();
    });

    it("handles complex markdown with mixed allowed/blocked content", () => {
      const markdown = `
# My Document

This has [allowed link](https://github.com/repo) and [blocked link](https://bad.com).

![Allowed image](https://via.placeholder.com/100)
![Blocked image](https://external.com/img.jpg)

> Quote with [another link](https://docs.github.com)
      `;

      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://github.com/", "https://docs."]}
          allowedImagePrefixes={["https://via.placeholder.com/"]}
        >
          {markdown}
        </HardenedReactMarkdown>,
      );

      // Check allowed content
      expect(
        screen.getAllByRole("link").map((link) => link.getAttribute("href")),
      ).toEqual(["https://github.com/repo"]);
      expect(screen.getByRole("img")).toHaveAttribute("alt", "Allowed image");

      // Check blocked content
      expect(screen.getByText("blocked link [blocked]")).toBeInTheDocument();
      expect(
        screen.getByText("[Image blocked: Blocked image]"),
      ).toBeInTheDocument();
    });
  });

  describe("Image transformation with relative URLs", () => {
    it("preserves query params and hash in relative image URLs", () => {
      const markdown = "![Test](/img.jpg?size=large&v=2#section)";
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://trusted.com"
          allowedImagePrefixes={["https://trusted.com/"]}
        >
          {markdown}
        </HardenedReactMarkdown>,
      );

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "/img.jpg?size=large&v=2#section");
    });

    it("blocks relative images when origin not allowed", () => {
      const markdown = "![Test](/evil.jpg)";
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://untrusted.com"
          allowedImagePrefixes={["https://trusted.com/"]}
        >
          {markdown}
        </HardenedReactMarkdown>,
      );

      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.getByText("[Image blocked: Test]")).toBeInTheDocument();
    });
  });

  describe("Comprehensive URL attribute coverage", () => {
    it("handles cite attribute in blockquotes", () => {
      const CustomBlockquote = ({ cite, children, ...props }: any) => (
        <blockquote cite={cite} {...props}>
          {children}
          {cite && (
            <footer>
              Source: <a href={cite}>{cite}</a>
            </footer>
          )}
        </blockquote>
      );

      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://trusted.com/"]}
          components={{ blockquote: CustomBlockquote }}
        >
          {"> Quote with citation"}
        </HardenedReactMarkdown>,
      );

      // The cite attribute would need to be handled in the custom component
      // Our hardenReactMarkdown only filters a and img components by default
      expect(screen.getByText("Quote with citation")).toBeInTheDocument();
    });

    it("only filters href and src attributes by default", () => {
      // Test that our component only handles the two main URL vectors in markdown
      const markdown = `
[Link](https://evil.com)
![Image](https://evil.com/image.jpg)
      `;

      render(
        <HardenedReactMarkdown defaultOrigin="https://example.com">
          {markdown}
        </HardenedReactMarkdown>,
      );

      // Both should be blocked
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.getByText("Link [blocked]")).toBeInTheDocument();
      expect(screen.getByText("[Image blocked: Image]")).toBeInTheDocument();
    });

    it("does not handle other potential URL attributes without custom components", () => {
      // Standard markdown doesn't generate elements with action, formaction, data, poster, etc.
      // These would only come from raw HTML or custom components
      const markdown = "Regular markdown content";

      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://trusted.com/"]}
        >
          {markdown}
        </HardenedReactMarkdown>,
      );

      expect(screen.getByText("Regular markdown content")).toBeInTheDocument();
    });
  });

  describe("Specific bypass attempts", () => {
    it("correctly handles URLs that appear to bypass but actually resolve correctly", () => {
      // This URL resolves to https://trusted.com/evil.com/image.jpg which should be allowed
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedImagePrefixes={["https://trusted.com/"]}
        >
          {"![Test](https://trusted.com/../../../evil.com/image.jpg)"}
        </HardenedReactMarkdown>,
      );

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute(
        "src",
        "https://trusted.com/evil.com/image.jpg",
      );
    });

    it("handles malformed URLs that contain invalid characters", () => {
      const malformedUrls = [
        "[Test](javascript:alert)",
        "[Test](data:text)",
        "[Test](vbscript:)",
      ];

      malformedUrls.forEach((markdown) => {
        const { unmount } = render(
          <HardenedReactMarkdown defaultOrigin="https://example.com">
            {markdown}
          </HardenedReactMarkdown>,
        );

        // These should be blocked
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
        unmount();
      });
    });
  });

  describe("Function wrapper behavior", () => {
    it("can wrap different markdown components with proper type safety", () => {
      // Create a custom markdown component that properly extends Options
      const CustomMarkdown = (props: Options) => (
        <div data-testid="custom-markdown">
          <ReactMarkdown {...props} />
        </div>
      );
      const HardenedCustomMarkdown = hardenReactMarkdown(CustomMarkdown);

      render(
        <HardenedCustomMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://github.com/"]}
        >
          {"[Test](https://github.com/user/repo)"}
        </HardenedCustomMarkdown>,
      );

      expect(screen.getByTestId("custom-markdown")).toBeInTheDocument();
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "https://github.com/user/repo",
      );
    });

    it("preserves the original component functionality and enforces Options compatibility", () => {
      const HardenedMarkdown = hardenReactMarkdown(ReactMarkdown);

      render(
        <HardenedMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://github.com/"]}
          remarkPlugins={[]}
          rehypePlugins={[]}
        >
          {"# Test Heading"}
        </HardenedMarkdown>,
      );

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Test Heading",
      );
    });

    it("maintains strict type checking for Options properties", () => {
      // This test verifies that our types correctly infer from the wrapped component
      const StrictMarkdown = (props: Options & { customProp?: string }) => (
        <div data-testid="strict-markdown">
          <ReactMarkdown {...props} />
          {props.customProp && (
            <span data-testid="custom-prop">{props.customProp}</span>
          )}
        </div>
      );

      const HardenedStrictMarkdown = hardenReactMarkdown(StrictMarkdown);

      render(
        <HardenedStrictMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://github.com/"]}
          customProp="test-value"
        >
          {"# Strict Test"}
        </HardenedStrictMarkdown>,
      );

      expect(screen.getByTestId("strict-markdown")).toBeInTheDocument();
      expect(screen.getByTestId("custom-prop")).toHaveTextContent("test-value");
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Strict Test",
      );
    });

    it("enforces proper return type from hardenReactMarkdown function", () => {
      const HardenedMarkdown = hardenReactMarkdown(ReactMarkdown);

      // TypeScript should infer this as a ComponentType with the correct props
      const isComponentType = typeof HardenedMarkdown === "function";
      expect(isComponentType).toBe(true);

      // Test that the component accepts the expected props structure
      const TestWrapper = () => (
        <HardenedMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://github.com/"]}
          children="# Test"
        />
      );

      render(<TestWrapper />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Test",
      );
    });
  });

  describe("URL prefix validation behavior", () => {
    it("requires complete valid URL prefixes (protocol-only prefixes don't work)", () => {
      // This test demonstrates that "https://" alone doesn't work as a prefix
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://"]}
        >
          {"[Test Link](https://github.com/test)"}
        </HardenedReactMarkdown>,
      );

      // The link should be blocked because "https://" cannot be parsed as a valid URL
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.getByText("Test Link [blocked]")).toBeInTheDocument();
    });

    it("works with complete domain prefixes", () => {
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://github.com/"]}
        >
          {"[Test Link](https://github.com/user/repo)"}
        </HardenedReactMarkdown>,
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "https://github.com/user/repo");
    });

    it("requires origin and prefix to match for validation", () => {
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://github.com/user/"]}
        >
          {
            "[Allowed](https://github.com/user/repo) [Blocked](https://github.com/other/repo)"
          }
        </HardenedReactMarkdown>,
      );

      // Only the first link should be rendered since it matches the prefix
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute("href", "https://github.com/user/repo");
      expect(screen.getByText("Blocked [blocked]")).toBeInTheDocument();
    });
  });

  describe("Wildcard prefix support", () => {
    it("allows all links when allowedLinkPrefixes includes '*'", () => {
      const testUrls = [
        {
          input: "https://example.com/test",
          expected: "https://example.com/test",
        },
        {
          input: "https://malicious-site.com/tracker",
          expected: "https://malicious-site.com/tracker",
        },
        {
          input: "http://insecure-site.com",
          expected: "http://insecure-site.com/",
        },
        {
          input: "https://any-domain.org/path",
          expected: "https://any-domain.org/path",
        },
      ];

      testUrls.forEach(({ input, expected }) => {
        const { unmount } = render(
          <HardenedReactMarkdown
            defaultOrigin="https://example.com"
            allowedLinkPrefixes={["*"]}
          >
            {`[Test Link](${input})`}
          </HardenedReactMarkdown>,
        );

        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", expected);
        expect(link).toHaveTextContent("Test Link");
        unmount();
      });
    });

    it("allows all images when allowedImagePrefixes includes '*'", () => {
      const testUrls = [
        "https://example.com/image.png",
        "https://untrusted-site.com/tracker.gif",
        "http://insecure-images.com/photo.jpg",
        "https://any-cdn.net/asset.svg",
      ];

      testUrls.forEach((url) => {
        const { unmount } = render(
          <HardenedReactMarkdown
            defaultOrigin="https://example.com"
            allowedImagePrefixes={["*"]}
          >
            {`![Test Image](${url})`}
          </HardenedReactMarkdown>,
        );

        const img = screen.getByRole("img");
        expect(img).toHaveAttribute("src", url);
        expect(img).toHaveAttribute("alt", "Test Image");
        unmount();
      });
    });

    it("handles relative URLs with wildcard prefix", () => {
      const { unmount: unmount1 } = render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["*"]}
        >
          {"[Relative Link](/internal-page)"}
        </HardenedReactMarkdown>,
      );

      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/internal-page",
      );
      unmount1();

      const { unmount: unmount2 } = render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedImagePrefixes={["*"]}
        >
          {"![Relative Image](/images/logo.png)"}
        </HardenedReactMarkdown>,
      );

      expect(screen.getByRole("img")).toHaveAttribute(
        "src",
        "/images/logo.png",
      );
      unmount2();
    });

    it("wildcard works alongside other prefixes", () => {
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["https://github.com/", "*"]}
        >
          {"[Any Link](https://random-site.com/path)"}
        </HardenedReactMarkdown>,
      );

      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "https://random-site.com/path",
      );
    });

    it("wildcard allows malformed URLs that can still be parsed", () => {
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["*"]}
        >
          {"[Test](//example.com/protocol-relative)"}
        </HardenedReactMarkdown>,
      );

      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/protocol-relative",
      );
    });

    it("wildcard allows URLs that can be resolved with defaultOrigin", () => {
      render(
        <HardenedReactMarkdown
          defaultOrigin="https://example.com"
          allowedLinkPrefixes={["*"]}
        >
          {"[Test](invalid-url-without-protocol)"}
        </HardenedReactMarkdown>,
      );

      // With defaultOrigin, this gets resolved to an absolute URL
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "https://example.com/invalid-url-without-protocol",
      );
    });

    it("wildcard doesn't require defaultOrigin for absolute URLs", () => {
      render(
        <HardenedReactMarkdown allowedLinkPrefixes={["*"]}>
          {"[Test](https://example.com/test)"}
        </HardenedReactMarkdown>,
      );

      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "https://example.com/test",
      );
    });

    it("wildcard still blocks completely unparseable URLs", () => {
      render(
        <HardenedReactMarkdown allowedLinkPrefixes={["*"]}>
          {"[Test](ht@tp://not-a-valid-url)"}
        </HardenedReactMarkdown>,
      );

      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.getByText("Test [blocked]")).toBeInTheDocument();
    });

    it("wildcard still blocks javascript: URLs", () => {
      render(
        <HardenedReactMarkdown allowedLinkPrefixes={["*"]}>
          {"[Test](javascript:alert('XSS'))"}
        </HardenedReactMarkdown>,
      );

      // Even with wildcard "*", javascript: URLs are blocked because they can't be parsed by URL()
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.getByText("Test [blocked]")).toBeInTheDocument();
    });

    it("wildcard blocks data: URLs", () => {
      render(
        <HardenedReactMarkdown allowedLinkPrefixes={["*"]}>
          {"[Test](data:text/html,123)"}
        </HardenedReactMarkdown>,
      );

      // Even with wildcard "*", data: URLs are blocked because they can't be parsed by URL()
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.getByText("Test [blocked]")).toBeInTheDocument();
    });
  });
});
