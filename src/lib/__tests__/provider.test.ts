import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => ({ provider: "anthropic", modelId: "claude-haiku-4-5" })),
}));

import { anthropic } from "@ai-sdk/anthropic";
import { MockLanguageModel, getLanguageModel } from "../provider";

beforeEach(() => {
  vi.clearAllMocks();
  // Ensure delay resolves instantly for all tests
  vi.spyOn(MockLanguageModel.prototype as any, "delay").mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  vi.restoreAllMocks();
});

describe("getLanguageModel", () => {
  test("returns MockLanguageModel when ANTHROPIC_API_KEY is not set", () => {
    delete process.env.ANTHROPIC_API_KEY;
    const model = getLanguageModel();
    expect(model).toBeInstanceOf(MockLanguageModel);
  });

  test("returns MockLanguageModel when ANTHROPIC_API_KEY is the placeholder", () => {
    process.env.ANTHROPIC_API_KEY = "your-api-key-here";
    const model = getLanguageModel();
    expect(model).toBeInstanceOf(MockLanguageModel);
  });

  test("calls anthropic() when a real API key is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-real-key-12345";
    getLanguageModel();
    expect(anthropic).toHaveBeenCalledWith("claude-haiku-4-5");
  });

  test("returns anthropic model (not MockLanguageModel) for real key", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-real-key-12345";
    const model = getLanguageModel();
    expect(model).not.toBeInstanceOf(MockLanguageModel);
  });
});

describe("MockLanguageModel", () => {
  test("has correct specificationVersion and provider", () => {
    const model = new MockLanguageModel("mock-claude");
    expect(model.specificationVersion).toBe("v1");
    expect(model.provider).toBe("mock");
    expect(model.modelId).toBe("mock-claude");
  });

  test("has defaultObjectGenerationMode of tool", () => {
    const model = new MockLanguageModel("mock-claude");
    expect(model.defaultObjectGenerationMode).toBe("tool");
  });

  test("doStream returns a ReadableStream", async () => {
    const model = new MockLanguageModel("mock-claude");
    const result = await model.doStream({
      inputFormat: "messages",
      mode: { type: "regular" },
      prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
    });
    expect(result.stream).toBeInstanceOf(ReadableStream);
  });

  test("doStream produces text-delta and tool-call chunks", async () => {
    const model = new MockLanguageModel("mock-claude");
    const result = await model.doStream({
      inputFormat: "messages",
      mode: { type: "regular" },
      prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
    });

    const chunks: any[] = [];
    const reader = result.stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const types = chunks.map((c) => c.type);
    expect(types).toContain("text-delta");
    expect(types).toContain("finish");
  });

  test("doGenerate returns text and toolCalls", async () => {
    const model = new MockLanguageModel("mock-claude");
    const result = await model.doGenerate({
      inputFormat: "messages",
      mode: { type: "regular" },
      prompt: [{ role: "user", content: [{ type: "text", text: "create a button card" }] }],
    });

    expect(result.text).toBeDefined();
    expect(Array.isArray(result.toolCalls)).toBe(true);
    expect(result.finishReason).toBeDefined();
    expect(result.usage).toMatchObject({
      promptTokens: expect.any(Number),
      completionTokens: expect.any(Number),
    });
  });

  test("doGenerate with tool messages triggers component file creation", async () => {
    const model = new MockLanguageModel("mock-claude");

    // Step with one tool message means the mock is on "Step 1: create component"
    const result = await model.doGenerate({
      inputFormat: "messages",
      mode: { type: "regular" },
      prompt: [
        { role: "user", content: [{ type: "text", text: "create a counter" }] },
        {
          role: "tool",
          content: [{ type: "tool-result", toolCallId: "c1", toolName: "str_replace_editor", result: "ok", isError: false }],
        },
      ],
    });

    expect(result.toolCalls.length).toBeGreaterThan(0);
    const toolCall = result.toolCalls[0];
    expect(toolCall.toolName).toBe("str_replace_editor");
    const args = JSON.parse(toolCall.args);
    expect(args.command).toBe("create");
    expect(args.path).toContain("Counter");
  });

  test("detects form component type from prompt", async () => {
    const model = new MockLanguageModel("mock-claude");
    const result = await model.doGenerate({
      inputFormat: "messages",
      mode: { type: "regular" },
      prompt: [
        { role: "user", content: [{ type: "text", text: "make a form" }] },
        {
          role: "tool",
          content: [{ type: "tool-result", toolCallId: "c1", toolName: "str_replace_editor", result: "ok", isError: false }],
        },
      ],
    });

    const toolCall = result.toolCalls[0];
    const args = JSON.parse(toolCall.args);
    expect(args.path).toContain("ContactForm");
  });

  test("detects card component type from prompt", async () => {
    const model = new MockLanguageModel("mock-claude");
    const result = await model.doGenerate({
      inputFormat: "messages",
      mode: { type: "regular" },
      prompt: [
        { role: "user", content: [{ type: "text", text: "create a card" }] },
        {
          role: "tool",
          content: [{ type: "tool-result", toolCallId: "c1", toolName: "str_replace_editor", result: "ok", isError: false }],
        },
      ],
    });

    const toolCall = result.toolCalls[0];
    const args = JSON.parse(toolCall.args);
    expect(args.path).toContain("Card");
  });

  test("final step (3+ tool messages) produces text summary with no tool calls", async () => {
    const model = new MockLanguageModel("mock-claude");
    const toolMessages = Array.from({ length: 3 }, (_, i) => ({
      role: "tool" as const,
      content: [{ type: "tool-result" as const, toolCallId: `c${i}`, toolName: "str_replace_editor", result: "ok", isError: false }],
    }));

    const result = await model.doGenerate({
      inputFormat: "messages",
      mode: { type: "regular" },
      prompt: [
        { role: "user", content: [{ type: "text", text: "create a counter" }] },
        ...toolMessages,
      ],
    });

    expect(result.toolCalls).toHaveLength(0);
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.finishReason).toBe("stop");
  });
});
