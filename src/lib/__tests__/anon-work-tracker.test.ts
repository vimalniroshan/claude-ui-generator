import { describe, test, expect, beforeEach } from "vitest";
import {
  setHasAnonWork,
  getHasAnonWork,
  getAnonWorkData,
  clearAnonWork,
} from "../anon-work-tracker";

beforeEach(() => {
  sessionStorage.clear();
});

describe("setHasAnonWork", () => {
  test("stores data when messages are present", () => {
    const messages = [{ id: "1", role: "user", content: "Hello" }];
    const fsData = { "/": { type: "directory" } };
    setHasAnonWork(messages, fsData);
    expect(sessionStorage.getItem("uigen_has_anon_work")).toBe("true");
  });

  test("stores data when file system has content beyond root", () => {
    const fsData = {
      "/": { type: "directory" },
      "/App.jsx": { type: "file", content: "code" },
    };
    setHasAnonWork([], fsData);
    expect(sessionStorage.getItem("uigen_has_anon_work")).toBe("true");
  });

  test("does not store when no messages and only root exists", () => {
    setHasAnonWork([], { "/": { type: "directory" } });
    expect(sessionStorage.getItem("uigen_has_anon_work")).toBeNull();
  });

  test("does not store when empty messages and empty fs", () => {
    setHasAnonWork([], {});
    expect(sessionStorage.getItem("uigen_has_anon_work")).toBeNull();
  });

  test("serializes messages and fileSystemData as JSON", () => {
    const messages = [{ id: "1", role: "user", content: "hi" }];
    const fsData = { "/App.jsx": "code" };
    setHasAnonWork(messages, fsData);
    const raw = sessionStorage.getItem("uigen_anon_data");
    const parsed = JSON.parse(raw!);
    expect(parsed.messages).toEqual(messages);
    expect(parsed.fileSystemData).toEqual(fsData);
  });
});

describe("getHasAnonWork", () => {
  test("returns false when nothing is stored", () => {
    expect(getHasAnonWork()).toBe(false);
  });

  test("returns true after setHasAnonWork with content", () => {
    setHasAnonWork([{ id: "1", role: "user", content: "hi" }], {});
    expect(getHasAnonWork()).toBe(true);
  });

  test("returns false when flag is not 'true'", () => {
    sessionStorage.setItem("uigen_has_anon_work", "false");
    expect(getHasAnonWork()).toBe(false);
  });
});

describe("getAnonWorkData", () => {
  test("returns null when nothing stored", () => {
    expect(getAnonWorkData()).toBeNull();
  });

  test("returns parsed data after set", () => {
    const messages = [{ id: "1", role: "user", content: "hello" }];
    const fsData = { "/": {}, "/App.jsx": "code" };
    setHasAnonWork(messages, fsData);
    const data = getAnonWorkData();
    expect(data).not.toBeNull();
    expect(data!.messages).toEqual(messages);
    expect(data!.fileSystemData).toEqual(fsData);
  });

  test("returns null for corrupt JSON", () => {
    sessionStorage.setItem("uigen_anon_data", "{ invalid json");
    expect(getAnonWorkData()).toBeNull();
  });
});

describe("clearAnonWork", () => {
  test("removes both storage keys", () => {
    setHasAnonWork([{ id: "1", role: "user", content: "hi" }], {});
    clearAnonWork();
    expect(sessionStorage.getItem("uigen_has_anon_work")).toBeNull();
    expect(sessionStorage.getItem("uigen_anon_data")).toBeNull();
  });

  test("is safe to call when nothing is stored", () => {
    expect(() => clearAnonWork()).not.toThrow();
  });
});
