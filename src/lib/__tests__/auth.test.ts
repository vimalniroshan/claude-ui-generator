import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("jose", () => ({
  SignJWT: vi.fn(),
  jwtVerify: vi.fn(),
}));

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import {
  createSession,
  getSession,
  deleteSession,
  verifySession,
} from "../auth";
import { NextRequest } from "next/server";

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

const mockSignJWTInstance = {
  setProtectedHeader: vi.fn().mockReturnThis(),
  setExpirationTime: vi.fn().mockReturnThis(),
  setIssuedAt: vi.fn().mockReturnThis(),
  sign: vi.fn().mockResolvedValue("mock.jwt.token"),
};

beforeEach(() => {
  vi.clearAllMocks();
  (cookies as any).mockResolvedValue(mockCookieStore);
  (SignJWT as any).mockImplementation(() => mockSignJWTInstance);
});

describe("createSession", () => {
  test("signs a JWT and sets the auth-token cookie", async () => {
    await createSession("user-123", "test@example.com");

    expect(SignJWT).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-123", email: "test@example.com" })
    );
    expect(mockSignJWTInstance.setProtectedHeader).toHaveBeenCalledWith({
      alg: "HS256",
    });
    expect(mockSignJWTInstance.sign).toHaveBeenCalled();
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "auth-token",
      "mock.jwt.token",
      expect.objectContaining({ httpOnly: true, path: "/" })
    );
  });
});

describe("getSession", () => {
  test("returns null when cookie is missing", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns session payload when token is valid", async () => {
    const payload = {
      userId: "user-123",
      email: "test@example.com",
      expiresAt: new Date(),
    };
    mockCookieStore.get.mockReturnValue({ value: "valid.token" });
    (jwtVerify as any).mockResolvedValue({ payload });

    const session = await getSession();
    expect(session).toEqual(payload);
    expect(jwtVerify).toHaveBeenCalledWith("valid.token", expect.anything());
  });

  test("returns null when token is invalid (jwtVerify throws)", async () => {
    mockCookieStore.get.mockReturnValue({ value: "bad.token" });
    (jwtVerify as any).mockRejectedValue(new Error("invalid token"));

    const session = await getSession();
    expect(session).toBeNull();
  });
});

describe("deleteSession", () => {
  test("deletes the auth-token cookie", async () => {
    await deleteSession();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  test("returns null when cookie is absent from request", async () => {
    const req = new NextRequest("http://localhost/protected");
    const session = await verifySession(req);
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token in request", async () => {
    const payload = {
      userId: "user-456",
      email: "user@example.com",
      expiresAt: new Date(),
    };
    (jwtVerify as any).mockResolvedValue({ payload });

    const req = new NextRequest("http://localhost/protected", {
      headers: { Cookie: "auth-token=valid.token" },
    });
    const session = await verifySession(req);
    expect(session).toEqual(payload);
  });

  test("returns null when token in request is invalid", async () => {
    (jwtVerify as any).mockRejectedValue(new Error("expired"));
    const req = new NextRequest("http://localhost/protected", {
      headers: { Cookie: "auth-token=expired.token" },
    });
    const session = await verifySession(req);
    expect(session).toBeNull();
  });
});
