import { test, expect, vi, beforeEach } from "vitest";
import { buildFileManagerTool } from "../file-manager";

const mockFs = {
  rename: vi.fn(),
  deleteFile: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

function makeTool() {
  return buildFileManagerTool(mockFs as any);
}

test("rename succeeds and returns success message", async () => {
  mockFs.rename.mockReturnValue(true);
  const tool = makeTool();
  const result = await tool.execute!(
    { command: "rename", path: "/old.jsx", new_path: "/new.jsx" },
    { messages: [], toolCallId: "tc1" }
  );
  expect(mockFs.rename).toHaveBeenCalledWith("/old.jsx", "/new.jsx");
  expect(result).toMatchObject({ success: true });
  expect((result as any).message).toContain("/old.jsx");
  expect((result as any).message).toContain("/new.jsx");
});

test("rename fails and returns error message", async () => {
  mockFs.rename.mockReturnValue(false);
  const tool = makeTool();
  const result = await tool.execute!(
    { command: "rename", path: "/old.jsx", new_path: "/new.jsx" },
    { messages: [], toolCallId: "tc2" }
  );
  expect(result).toMatchObject({ success: false });
  expect((result as any).error).toBeDefined();
});

test("rename without new_path returns error", async () => {
  const tool = makeTool();
  const result = await tool.execute!(
    { command: "rename", path: "/old.jsx" },
    { messages: [], toolCallId: "tc3" }
  );
  expect(result).toMatchObject({ success: false });
  expect((result as any).error).toContain("new_path");
  expect(mockFs.rename).not.toHaveBeenCalled();
});

test("delete succeeds and returns success message", async () => {
  mockFs.deleteFile.mockReturnValue(true);
  const tool = makeTool();
  const result = await tool.execute!(
    { command: "delete", path: "/App.jsx" },
    { messages: [], toolCallId: "tc4" }
  );
  expect(mockFs.deleteFile).toHaveBeenCalledWith("/App.jsx");
  expect(result).toMatchObject({ success: true });
  expect((result as any).message).toContain("/App.jsx");
});

test("delete fails and returns error", async () => {
  mockFs.deleteFile.mockReturnValue(false);
  const tool = makeTool();
  const result = await tool.execute!(
    { command: "delete", path: "/nonexistent.jsx" },
    { messages: [], toolCallId: "tc5" }
  );
  expect(result).toMatchObject({ success: false });
  expect((result as any).error).toBeDefined();
});
