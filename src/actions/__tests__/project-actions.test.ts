import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProject } from "../create-project";
import { getProject } from "../get-project";
import { getProjects } from "../get-projects";

const mockSession = { userId: "user-1", email: "user@example.com" };

const mockDbProject = {
  id: "proj-abc",
  name: "My Project",
  userId: "user-1",
  messages: JSON.stringify([{ id: "1", role: "user", content: "hi" }]),
  data: JSON.stringify({ "/App.jsx": "code" }),
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-02"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createProject", () => {
  test("throws when not authenticated", async () => {
    (getSession as any).mockResolvedValue(null);
    await expect(
      createProject({ name: "Test", messages: [], data: {} })
    ).rejects.toThrow("Unauthorized");
  });

  test("creates and returns project on success", async () => {
    (getSession as any).mockResolvedValue(mockSession);
    (prisma.project.create as any).mockResolvedValue(mockDbProject);

    const result = await createProject({
      name: "My Project",
      messages: [{ id: "1", role: "user", content: "hi" }],
      data: { "/App.jsx": "code" },
    });

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "My Project",
        userId: "user-1",
        messages: expect.any(String),
        data: expect.any(String),
      },
    });
    expect(result).toBe(mockDbProject);
  });
});

describe("getProject", () => {
  test("throws when not authenticated", async () => {
    (getSession as any).mockResolvedValue(null);
    await expect(getProject("proj-abc")).rejects.toThrow("Unauthorized");
  });

  test("throws when project not found", async () => {
    (getSession as any).mockResolvedValue(mockSession);
    (prisma.project.findUnique as any).mockResolvedValue(null);
    await expect(getProject("nonexistent")).rejects.toThrow("Project not found");
  });

  test("returns parsed project data on success", async () => {
    (getSession as any).mockResolvedValue(mockSession);
    (prisma.project.findUnique as any).mockResolvedValue(mockDbProject);

    const result = await getProject("proj-abc");

    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: "proj-abc", userId: "user-1" },
    });
    expect(result.id).toBe("proj-abc");
    expect(result.name).toBe("My Project");
    expect(result.messages).toEqual([{ id: "1", role: "user", content: "hi" }]);
    expect(result.data).toEqual({ "/App.jsx": "code" });
  });
});

describe("getProjects", () => {
  test("throws when not authenticated", async () => {
    (getSession as any).mockResolvedValue(null);
    await expect(getProjects()).rejects.toThrow("Unauthorized");
  });

  test("returns ordered list of projects", async () => {
    (getSession as any).mockResolvedValue(mockSession);
    const mockList = [
      { id: "p1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
      { id: "p2", name: "Project 2", createdAt: new Date(), updatedAt: new Date() },
    ];
    (prisma.project.findMany as any).mockResolvedValue(mockList);

    const result = await getProjects();

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });
    expect(result).toEqual(mockList);
  });

  test("returns empty array when user has no projects", async () => {
    (getSession as any).mockResolvedValue(mockSession);
    (prisma.project.findMany as any).mockResolvedValue([]);
    const result = await getProjects();
    expect(result).toEqual([]);
  });
});
