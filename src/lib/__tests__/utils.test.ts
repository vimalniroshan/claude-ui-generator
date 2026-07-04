import { test, expect } from "vitest";
import { cn } from "../utils";

test("returns a single class unchanged", () => {
  expect(cn("flex")).toBe("flex");
});

test("merges multiple class names", () => {
  expect(cn("flex", "items-center", "gap-2")).toBe("flex items-center gap-2");
});

test("handles conditional classes — falsy values are omitted", () => {
  expect(cn("flex", false && "items-hidden", null, undefined, "gap-2")).toBe(
    "flex gap-2"
  );
});

test("handles object syntax", () => {
  expect(cn({ flex: true, "items-center": false, "gap-2": true })).toBe("flex gap-2");
});

test("resolves tailwind conflicts (later class wins)", () => {
  expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  expect(cn("p-4", "p-2")).toBe("p-2");
});

test("handles empty input", () => {
  expect(cn()).toBe("");
});

test("handles array input", () => {
  expect(cn(["flex", "items-center"])).toBe("flex items-center");
});

test("deduplicates identical classes via tailwind-merge", () => {
  expect(cn("flex", "flex")).toBe("flex");
});
