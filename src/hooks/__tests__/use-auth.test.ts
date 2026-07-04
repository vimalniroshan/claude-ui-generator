import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { useRouter } from "next/navigation";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";
import { useAuth } from "../use-auth";

const mockPush = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (useRouter as any).mockReturnValue({ push: mockPush });
  (getAnonWorkData as any).mockReturnValue(null);
  (getProjects as any).mockResolvedValue([]);
  (createProject as any).mockResolvedValue({ id: "new-proj" });
});

describe("signIn", () => {
  test("calls signInAction with credentials", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(signInAction).toHaveBeenCalledWith("user@example.com", "password");
  });

  test("returns failure result without redirecting", async () => {
    (signInAction as any).mockResolvedValue({
      success: false,
      error: "Invalid credentials",
    });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signIn("bad@example.com", "wrong");
    });

    expect(returnValue).toMatchObject({ success: false, error: "Invalid credentials" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("redirects to most recent project after success (no anon work)", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getProjects as any).mockResolvedValue([
      { id: "proj-1", name: "Project 1" },
    ]);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(mockPush).toHaveBeenCalledWith("/proj-1");
  });

  test("creates a new project when user has no projects", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getProjects as any).mockResolvedValue([]);
    (createProject as any).mockResolvedValue({ id: "brand-new" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(createProject).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/brand-new");
  });

  test("migrates anon work to a project after sign-in", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue({
      messages: [{ id: "1", role: "user", content: "hello" }],
      fileSystemData: { "/App.jsx": "code" },
    });
    (createProject as any).mockResolvedValue({ id: "saved-proj" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ id: "1", role: "user", content: "hello" }],
        data: { "/App.jsx": "code" },
      })
    );
    expect(clearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/saved-proj");
  });

  test("sets isLoading to true during request and back to false after", async () => {
    let resolveSignIn: (v: any) => void;
    (signInAction as any).mockReturnValue(
      new Promise((resolve) => { resolveSignIn = resolve; })
    );

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.signIn("user@example.com", "password");
    });
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn!({ success: false, error: "bad" });
    });
    expect(result.current.isLoading).toBe(false);
  });
});

describe("signUp", () => {
  test("calls signUpAction with credentials", async () => {
    (signUpAction as any).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(signUpAction).toHaveBeenCalledWith("new@example.com", "password123");
  });

  test("returns failure without redirecting", async () => {
    (signUpAction as any).mockResolvedValue({
      success: false,
      error: "Email taken",
    });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signUp("taken@example.com", "password");
    });

    expect(returnValue).toMatchObject({ success: false });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("redirects after successful sign-up", async () => {
    (signUpAction as any).mockResolvedValue({ success: true });
    (getProjects as any).mockResolvedValue([{ id: "first-proj", name: "First" }]);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/first-proj");
  });
});
