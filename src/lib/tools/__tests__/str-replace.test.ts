import { test, expect, vi, beforeEach } from "vitest";
import { buildStrReplaceTool } from "../str-replace";

const mockFs = {
  viewFile: vi.fn(),
  createFileWithParents: vi.fn(),
  replaceInFile: vi.fn(),
  insertInFile: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

function makeTool() {
  return buildStrReplaceTool(mockFs as any);
}

test("tool has id str_replace_editor", () => {
  expect(makeTool().id).toBe("str_replace_editor");
});

test("view command calls viewFile with path", async () => {
  mockFs.viewFile.mockReturnValue("1\tcontent");
  const tool = makeTool();
  const result = await tool.execute({ command: "view", path: "/App.jsx" });
  expect(mockFs.viewFile).toHaveBeenCalledWith("/App.jsx", undefined);
  expect(result).toBe("1\tcontent");
});

test("view command passes view_range", async () => {
  mockFs.viewFile.mockReturnValue("2\tline2");
  const tool = makeTool();
  await tool.execute({ command: "view", path: "/App.jsx", view_range: [2, 4] });
  expect(mockFs.viewFile).toHaveBeenCalledWith("/App.jsx", [2, 4]);
});

test("create command calls createFileWithParents", async () => {
  mockFs.createFileWithParents.mockReturnValue("File created: /App.jsx");
  const tool = makeTool();
  const result = await tool.execute({
    command: "create",
    path: "/App.jsx",
    file_text: "export default function App() {}",
  });
  expect(mockFs.createFileWithParents).toHaveBeenCalledWith(
    "/App.jsx",
    "export default function App() {}"
  );
  expect(result).toBe("File created: /App.jsx");
});

test("create command uses empty string when file_text is omitted", async () => {
  mockFs.createFileWithParents.mockReturnValue("File created: /empty.jsx");
  const tool = makeTool();
  await tool.execute({ command: "create", path: "/empty.jsx" });
  expect(mockFs.createFileWithParents).toHaveBeenCalledWith("/empty.jsx", "");
});

test("str_replace command calls replaceInFile", async () => {
  mockFs.replaceInFile.mockReturnValue("Replaced 1 occurrence(s)");
  const tool = makeTool();
  const result = await tool.execute({
    command: "str_replace",
    path: "/App.jsx",
    old_str: "oldCode",
    new_str: "newCode",
  });
  expect(mockFs.replaceInFile).toHaveBeenCalledWith(
    "/App.jsx",
    "oldCode",
    "newCode"
  );
  expect(result).toBe("Replaced 1 occurrence(s)");
});

test("str_replace uses empty strings when old_str/new_str are omitted", async () => {
  mockFs.replaceInFile.mockReturnValue("Replaced 0 occurrence(s)");
  const tool = makeTool();
  await tool.execute({ command: "str_replace", path: "/App.jsx" });
  expect(mockFs.replaceInFile).toHaveBeenCalledWith("/App.jsx", "", "");
});

test("insert command calls insertInFile", async () => {
  mockFs.insertInFile.mockReturnValue("Text inserted at line 3 in /App.jsx");
  const tool = makeTool();
  const result = await tool.execute({
    command: "insert",
    path: "/App.jsx",
    insert_line: 3,
    new_str: "// inserted line",
  });
  expect(mockFs.insertInFile).toHaveBeenCalledWith(
    "/App.jsx",
    3,
    "// inserted line"
  );
  expect(result).toBe("Text inserted at line 3 in /App.jsx");
});

test("insert defaults to line 0 when insert_line is omitted", async () => {
  mockFs.insertInFile.mockReturnValue("Text inserted at line 0 in /App.jsx");
  const tool = makeTool();
  await tool.execute({ command: "insert", path: "/App.jsx", new_str: "line" });
  expect(mockFs.insertInFile).toHaveBeenCalledWith("/App.jsx", 0, "line");
});

test("undo_edit returns unsupported error", async () => {
  const tool = makeTool();
  const result = await tool.execute({ command: "undo_edit", path: "/App.jsx" });
  expect(result).toContain("undo_edit");
  expect(result).toContain("not supported");
  expect(mockFs.replaceInFile).not.toHaveBeenCalled();
});
