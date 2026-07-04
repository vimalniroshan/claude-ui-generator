import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
  hash: vi.fn(),
  compare: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { signUp, signIn, signOut, getUser } from "../index";
import { createSession, deleteSession, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { redirect } from "next/navigation";

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  password: "hashed-password",
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signUp", () => {
  test("returns error when email is missing", async () => {
    const result = await signUp("", "password123");
    expect(result).toMatchObject({ success: false });
    expect(result.error).toBeTruthy();
  });

  test("returns error when password is missing", async () => {
    const result = await signUp("test@example.com", "");
    expect(result).toMatchObject({ success: false });
    expect(result.error).toBeTruthy();
  });

  test("returns error when password is too short", async () => {
    const result = await signUp("test@example.com", "short");
    expect(result).toMatchObject({ success: false });
    expect(result.error).toContain("8");
  });

  test("returns error when email already exists", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    const result = await signUp("test@example.com", "password123");
    expect(result).toMatchObject({ success: false });
    expect(result.error).toContain("registered");
  });

  test("creates user and session on success", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (bcrypt.hash as any).mockResolvedValue("hashed-password");
    (prisma.user.create as any).mockResolvedValue(mockUser);
    (createSession as any).mockResolvedValue(undefined);

    const result = await signUp("test@example.com", "password123");

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: "test@example.com", password: "hashed-password" },
    });
    expect(createSession).toHaveBeenCalledWith("user-123", "test@example.com");
    expect(result).toMatchObject({ success: true });
  });

  test("returns error on unexpected exception", async () => {
    (prisma.user.findUnique as any).mockRejectedValue(new Error("DB error"));
    const result = await signUp("test@example.com", "password123");
    expect(result).toMatchObject({ success: false });
  });
});

describe("signIn", () => {
  test("returns error when email is missing", async () => {
    const result = await signIn("", "password123");
    expect(result).toMatchObject({ success: false });
  });

  test("returns error when password is missing", async () => {
    const result = await signIn("test@example.com", "");
    expect(result).toMatchObject({ success: false });
  });

  test("returns error when user does not exist", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const result = await signIn("unknown@example.com", "password123");
    expect(result).toMatchObject({ success: false });
    expect(result.error).toContain("Invalid");
  });

  test("returns error when password is incorrect", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(false);
    const result = await signIn("test@example.com", "wrongpass");
    expect(result).toMatchObject({ success: false });
    expect(result.error).toContain("Invalid");
  });

  test("creates session and returns success on valid credentials", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(true);
    (createSession as any).mockResolvedValue(undefined);

    const result = await signIn("test@example.com", "password123");

    expect(createSession).toHaveBeenCalledWith("user-123", "test@example.com");
    expect(result).toMatchObject({ success: true });
  });

  test("returns error on unexpected exception", async () => {
    (prisma.user.findUnique as any).mockRejectedValue(new Error("DB down"));
    const result = await signIn("test@example.com", "password123");
    expect(result).toMatchObject({ success: false });
  });
});

describe("signOut", () => {
  test("deletes session and redirects to /", async () => {
    (deleteSession as any).mockResolvedValue(undefined);
    try {
      await signOut();
    } catch {
      // redirect() throws in Next.js server actions
    }
    expect(deleteSession).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/");
  });
});

describe("getUser", () => {
  test("returns null when not authenticated", async () => {
    (getSession as any).mockResolvedValue(null);
    const user = await getUser();
    expect(user).toBeNull();
  });

  test("returns user data for authenticated session", async () => {
    (getSession as any).mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      createdAt: new Date(),
    });

    const user = await getUser();
    expect(user).toMatchObject({ id: "user-123", email: "test@example.com" });
  });

  test("returns null on DB error", async () => {
    (getSession as any).mockResolvedValue({ userId: "user-123" });
    (prisma.user.findUnique as any).mockRejectedValue(new Error("DB error"));
    const user = await getUser();
    expect(user).toBeNull();
  });
});
