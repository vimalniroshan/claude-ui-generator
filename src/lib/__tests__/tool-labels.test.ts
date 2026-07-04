import { test, expect } from "vitest";
import { getFilename, getToolLabel } from "@/lib/tool-labels";

// getFilename
test("getFilename: simple name with no slashes", () => {
  expect(getFilename("Card.jsx")).toBe("Card.jsx");
});

test("getFilename: root-level path", () => {
  expect(getFilename("/App.tsx")).toBe("App.tsx");
});

test("getFilename: deep nested path", () => {
  expect(getFilename("/components/ui/Button.tsx")).toBe("Button.tsx");
});

test("getFilename: just a slash", () => {
  expect(getFilename("/")).toBe("");
});

test("getFilename: empty string", () => {
  expect(getFilename("")).toBe("");
});

test("getFilename: undefined", () => {
  expect(getFilename(undefined)).toBe("");
});

// getToolLabel — str_replace_editor
test("getToolLabel: str_replace_editor create with deep path", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "create", path: "/components/Card.jsx" })
  ).toBe("Creating Card.jsx");
});

test("getToolLabel: str_replace_editor str_replace", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "str_replace", path: "/App.jsx" })
  ).toBe("Editing App.jsx");
});

test("getToolLabel: str_replace_editor insert", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "insert", path: "/lib/utils.ts" })
  ).toBe("Editing utils.ts");
});

test("getToolLabel: str_replace_editor view", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "view", path: "/config.js" })
  ).toBe("Reading config.js");
});

test("getToolLabel: str_replace_editor undo_edit", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "undo_edit", path: "/components/Card.jsx" })
  ).toBe("Undoing edit in Card.jsx");
});

test("getToolLabel: str_replace_editor unknown command falls back", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "copy", path: "/App.jsx" })
  ).toBe("Working...");
});

test("getToolLabel: str_replace_editor empty args falls back", () => {
  expect(getToolLabel("str_replace_editor", {})).toBe("Working...");
});

test("getToolLabel: str_replace_editor undefined args falls back", () => {
  expect(getToolLabel("str_replace_editor", undefined)).toBe("Working...");
});

test("getToolLabel: str_replace_editor null args falls back", () => {
  expect(getToolLabel("str_replace_editor", null)).toBe("Working...");
});

// getToolLabel — file_manager
test("getToolLabel: file_manager rename with flat paths", () => {
  expect(
    getToolLabel("file_manager", { command: "rename", path: "/Card.jsx", new_path: "/CardV2.jsx" })
  ).toBe("Renaming Card.jsx → CardV2.jsx");
});

test("getToolLabel: file_manager rename with deep paths", () => {
  expect(
    getToolLabel("file_manager", {
      command: "rename",
      path: "/components/ui/Button.tsx",
      new_path: "/components/ui/PrimaryButton.tsx",
    })
  ).toBe("Renaming Button.tsx → PrimaryButton.tsx");
});

test("getToolLabel: file_manager delete", () => {
  expect(
    getToolLabel("file_manager", { command: "delete", path: "/components/Button.tsx" })
  ).toBe("Deleting Button.tsx");
});

test("getToolLabel: file_manager empty args falls back", () => {
  expect(getToolLabel("file_manager", {})).toBe("Working...");
});

test("getToolLabel: file_manager rename missing new_path falls back", () => {
  expect(
    getToolLabel("file_manager", { command: "rename", path: "/Card.jsx" })
  ).toBe("Renaming file");
});

// Unknown toolName
test("getToolLabel: unknown tool returns toolName unchanged", () => {
  expect(
    getToolLabel("some_other_tool", { command: "create", path: "/foo.js" })
  ).toBe("some_other_tool");
});

test("getToolLabel: unknown tool with undefined args returns toolName unchanged", () => {
  expect(getToolLabel("some_other_tool", undefined)).toBe("some_other_tool");
});

// State does not affect output
test("getToolLabel: same output regardless of state", () => {
  const args = { command: "create", path: "/App.jsx" };
  const labelCall = getToolLabel("str_replace_editor", args, "call");
  const labelResult = getToolLabel("str_replace_editor", args, "result");
  const labelPartial = getToolLabel("str_replace_editor", args, "partial-call");
  expect(labelCall).toBe("Creating App.jsx");
  expect(labelResult).toBe("Creating App.jsx");
  expect(labelPartial).toBe("Creating App.jsx");
});
