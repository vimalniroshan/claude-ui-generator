import { test, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  verifySession: vi.fn(),
}));

import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import { verifySession } from "@/lib/auth";

const mockSession = {
  userId: "user-1",
  email: "user@example.com",
  expiresAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(path: string) {
  return new NextRequest(`http://localhost${path}`);
}

test("passes non-protected paths without a session", async () => {
  (verifySession as any).mockResolvedValue(null);
  const res = await middleware(makeRequest("/"));
  expect(res.status).toBe(200);
});

test("passes /api/chat (not in protected list) without a session", async () => {
  (verifySession as any).mockResolvedValue(null);
  const res = await middleware(makeRequest("/api/chat"));
  expect(res.status).toBe(200);
});

test("returns 401 for /api/projects without a session", async () => {
  (verifySession as any).mockResolvedValue(null);
  const res = await middleware(makeRequest("/api/projects"));
  expect(res.status).toBe(401);
  const body = await res.json();
  expect(body.error).toBe("Authentication required");
});

test("returns 401 for /api/projects/123 without a session", async () => {
  (verifySession as any).mockResolvedValue(null);
  const res = await middleware(makeRequest("/api/projects/abc-123"));
  expect(res.status).toBe(401);
});

test("returns 401 for /api/filesystem without a session", async () => {
  (verifySession as any).mockResolvedValue(null);
  const res = await middleware(makeRequest("/api/filesystem"));
  expect(res.status).toBe(401);
});

test("passes /api/projects with a valid session", async () => {
  (verifySession as any).mockResolvedValue(mockSession);
  const res = await middleware(makeRequest("/api/projects"));
  expect(res.status).toBe(200);
});

test("passes /api/filesystem with a valid session", async () => {
  (verifySession as any).mockResolvedValue(mockSession);
  const res = await middleware(makeRequest("/api/filesystem"));
  expect(res.status).toBe(200);
});

test("passes a page route without a session", async () => {
  (verifySession as any).mockResolvedValue(null);
  const res = await middleware(makeRequest("/some-project-id"));
  expect(res.status).toBe(200);
});
