import { describe, expect, test, vi } from "vitest";
import { markdownSanitizerMiddleware } from "../src/index";

describe("AI SDK Middleware", () => {
  describe("Middleware Configuration", () => {
    test("creates middleware with basic configuration", () => {
      const middleware = markdownSanitizerMiddleware({
        allowedLinkPrefixes: ["https://example.com"],
        allowedImagePrefixes: ["https://images.com"],
        defaultOrigin: "https://example.com",
      });

      expect(middleware).toHaveProperty("wrapGenerate");
      expect(middleware).toHaveProperty("wrapStream");
      expect(typeof middleware.wrapGenerate).toBe("function");
      expect(typeof middleware.wrapStream).toBe("function");
    });

    test("handles deprecated allowedPrefixes option", () => {
      const middleware = markdownSanitizerMiddleware({
        allowedPrefixes: ["https://example.com"],
        defaultOrigin: "https://example.com",
      });

      expect(middleware).toHaveProperty("wrapGenerate");
      expect(middleware).toHaveProperty("wrapStream");
    });

    test("uses default origin when not specified", () => {
      const middleware = markdownSanitizerMiddleware({
        allowedLinkPrefixes: ["https://example.com"],
      });

      expect(middleware).toHaveProperty("wrapGenerate");
      expect(middleware).toHaveProperty("wrapStream");
    });

    test("configures HTML sanitization", () => {
      const middleware = markdownSanitizerMiddleware({
        allowedLinkPrefixes: ["https://example.com"],
        defaultOrigin: "https://example.com",
        enableHtmlSanitization: false,
      });

      expect(middleware).toHaveProperty("wrapGenerate");
      expect(middleware).toHaveProperty("wrapStream");
    });
  });

  describe("Generate Wrapper", () => {
    test("sanitizes text content in generate result", async () => {
      const middleware = markdownSanitizerMiddleware({
        allowedLinkPrefixes: ["https://example.com"],
        allowedImagePrefixes: ["https://images.com"],
        defaultOrigin: "https://example.com",
      });

      const mockGenerate = vi.fn().mockResolvedValue({
        text: "[Good link](https://example.com/page) [Bad link](https://evil.com/malware)",
      });

      const result = await middleware.wrapGenerate({}, mockGenerate);

      expect(result.text).toBe(
        "[Good link](https://example.com/page) [Bad link](#)\n",
      );
    });

    test("sanitizes response messages", async () => {
      const middleware = markdownSanitizerMiddleware({
        allowedLinkPrefixes: ["https://example.com"],
        allowedImagePrefixes: ["https://images.com"],
        defaultOrigin: "https://example.com",
      });

      const mockGenerate = vi.fn().mockResolvedValue({
        response: {
          messages: [
            {
              role: "assistant",
              content:
                "[Safe](https://example.com/safe) [Unsafe](https://evil.com/malware)",
            },
            {
              role: "assistant",
              content: "Plain text message",
            },
          ],
        },
      });

      const result = await middleware.wrapGenerate({}, mockGenerate);

      expect(result.response.messages[0].content).toBe(
        "[Safe](https://example.com/safe) [Unsafe](#)\n",
      );
      expect(result.response.messages[1].content).toBe("Plain text message\n");
    });

    test("handles non-string message content", async () => {
      const middleware = markdownSanitizerMiddleware({
        allowedLinkPrefixes: ["https://example.com"],
        defaultOrigin: "https://example.com",
      });

      const mockGenerate = vi.fn().mockResolvedValue({
        response: {
          messages: [
            {
              role: "user",
              content: { type: "text", text: "Non-string content" },
            },
          ],
        },
      });

      const result = await middleware.wrapGenerate({}, mockGenerate);

      expect(result.response.messages[0].content).toEqual({
        type: "text",
        text: "Non-string content",
      });
    });

    test("handles missing text and response properties", async () => {
      const middleware = markdownSanitizerMiddleware({
        allowedLinkPrefixes: ["https://example.com"],
        defaultOrigin: "https://example.com",
      });

      const mockGenerate = vi.fn().mockResolvedValue({
        someOtherProperty: "value",
      });

      const result = await middleware.wrapGenerate({}, mockGenerate);

      expect(result).toEqual({
        someOtherProperty: "value",
      });
    });

    test("sanitizes HTML content in generate result", async () => {
      const middleware = markdownSanitizerMiddleware({
        allowedLinkPrefixes: ["https://example.com"],
        defaultOrigin: "https://example.com",
        enableHtmlSanitization: true,
      });

      const mockGenerate = vi.fn().mockResolvedValue({
        text: '<script>alert("xss")</script><strong>Safe HTML</strong>',
      });

      const result = await middleware.wrapGenerate({}, mockGenerate);

      // Script tags are stripped, but safe HTML is converted to markdown
      expect(result.text).toBe("**Safe HTML**\n");
    });
  });

  describe("Stream Wrapper", () => {
    test("sanitizes streaming text content", async () => {
      const middleware = markdownSanitizerMiddleware({
        allowedLinkPrefixes: ["https://example.com"],
        allowedImagePrefixes: ["https://images.com"],
        defaultOrigin: "https://example.com",
      });

      const mockTextStream = async function* () {
        yield "[Good link](https://example.com/page)\n";
        yield "[Bad link](https://evil.com/malware)\n";
        yield "![Good image](https://images.com/pic.jpg)\n";
        yield "![Bad image](https://evil.com/tracker.gif)\n";
      };

      const mockStream = vi.fn().mockResolvedValue({
        textStream: mockTextStream,
        otherProperty: "preserved",
      });

      const wrappedStream = await middleware.wrapStream({}, mockStream);

      expect(wrappedStream.otherProperty).toBe("preserved");
      expect(typeof wrappedStream.textStream).toBe("function");

      const chunks: string[] = [];
      for await (const chunk of wrappedStream.textStream()) {
        chunks.push(chunk);
      }

      const combined = chunks.join("");
      expect(combined).toBe(
        "[Good link](https://example.com/page)\n[Bad link](#)\n![Good image](https://images.com/pic.jpg)\n![Bad image](/forbidden)\n",
      );
    });

    test("handles streaming HTML sanitization", async () => {
      const middleware = markdownSanitizerMiddleware({
        allowedLinkPrefixes: ["https://example.com"],
        defaultOrigin: "https://example.com",
        enableHtmlSanitization: true,
      });

      const mockTextStream = async function* () {
        yield "<strong>Safe HTML</strong>\n";
        yield '<script>alert("xss")</script>\n';
        yield "<em>More safe HTML</em>\n";
      };

      const mockStream = vi.fn().mockResolvedValue({
        textStream: mockTextStream,
      });

      const wrappedStream = await middleware.wrapStream({}, mockStream);

      const chunks: string[] = [];
      for await (const chunk of wrappedStream.textStream()) {
        chunks.push(chunk);
      }

      const combined = chunks.join("");
      // Script tags are stripped, safe HTML is converted to markdown
      expect(combined).toBe(
        "**Safe HTML**\n*More safe HTML*\n",
      );
    });

    test("preserves other stream properties", async () => {
      const middleware = markdownSanitizerMiddleware({
        allowedLinkPrefixes: ["https://example.com"],
        defaultOrigin: "https://example.com",
      });

      const mockTextStream = async function* () {
        yield "Some text\n";
      };

      const mockStream = vi.fn().mockResolvedValue({
        textStream: mockTextStream,
        usage: { totalTokens: 100 },
        finishReason: "stop",
        warnings: [],
      });

      const wrappedStream = await middleware.wrapStream({}, mockStream);

      expect(wrappedStream.usage).toEqual({ totalTokens: 100 });
      expect(wrappedStream.finishReason).toBe("stop");
      expect(wrappedStream.warnings).toEqual([]);
    });

    test("handles empty streaming chunks", async () => {
      const middleware = markdownSanitizerMiddleware({
        allowedLinkPrefixes: ["https://example.com"],
        defaultOrigin: "https://example.com",
      });

      const mockTextStream = async function* () {
        yield "";
        yield "Text\n";
        yield "";
      };

      const mockStream = vi.fn().mockResolvedValue({
        textStream: mockTextStream,
      });

      const wrappedStream = await middleware.wrapStream({}, mockStream);

      const chunks: string[] = [];
      for await (const chunk of wrappedStream.textStream()) {
        chunks.push(chunk);
      }

      expect(chunks.filter((chunk) => chunk.length > 0)).toEqual(["Text\n"]);
    });

    test("flushes remaining content at end of stream", async () => {
      const middleware = markdownSanitizerMiddleware({
        allowedLinkPrefixes: ["https://example.com"],
        defaultOrigin: "https://example.com",
      });

      const mockTextStream = async function* () {
        yield "Complete line\n";
        yield "Incomplete line without newline";
      };

      const mockStream = vi.fn().mockResolvedValue({
        textStream: mockTextStream,
      });

      const wrappedStream = await middleware.wrapStream({}, mockStream);

      const chunks: string[] = [];
      for await (const chunk of wrappedStream.textStream()) {
        chunks.push(chunk);
      }

      const combined = chunks.join("");
      expect(combined).toBe("Complete line\nIncomplete line without newline\n");
    });
  });

  describe("Error Handling", () => {
    test("handles errors in generate wrapper gracefully", async () => {
      const middleware = markdownSanitizerMiddleware({
        allowedLinkPrefixes: ["https://example.com"],
        defaultOrigin: "https://example.com",
      });

      const mockGenerate = vi
        .fn()
        .mockRejectedValue(new Error("Generation failed"));

      await expect(middleware.wrapGenerate({}, mockGenerate)).rejects.toThrow(
        "Generation failed",
      );
    });

    test("handles errors in stream wrapper gracefully", async () => {
      const middleware = markdownSanitizerMiddleware({
        allowedLinkPrefixes: ["https://example.com"],
        defaultOrigin: "https://example.com",
      });

      const mockStream = vi.fn().mockRejectedValue(new Error("Stream failed"));

      await expect(middleware.wrapStream({}, mockStream)).rejects.toThrow(
        "Stream failed",
      );
    });

    test("handles malformed content in generate wrapper", async () => {
      const middleware = markdownSanitizerMiddleware({
        allowedLinkPrefixes: ["https://example.com"],
        defaultOrigin: "https://example.com",
      });

      const mockGenerate = vi.fn().mockResolvedValue({
        text: "[Malformed markdown structure...",
      });

      const result = await middleware.wrapGenerate({}, mockGenerate);

      expect(result.text).toBeTruthy(); // Should not crash
    });
  });
});
