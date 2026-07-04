import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { HeaderActions } from "../HeaderActions";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/actions", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

vi.mock("@/components/auth/AuthDialog", () => ({
  AuthDialog: ({ open, defaultMode }: any) =>
    open ? <div data-testid="auth-dialog" data-mode={defaultMode} /> : null,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/command", () => ({
  Command: ({ children }: any) => <div>{children}</div>,
  CommandInput: ({ placeholder, value, onValueChange }: any) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  ),
  CommandList: ({ children }: any) => <div>{children}</div>,
  CommandEmpty: ({ children }: any) => <div>{children}</div>,
  CommandGroup: ({ children }: any) => <div>{children}</div>,
  CommandItem: ({ children, onSelect, value }: any) => (
    <div onClick={() => onSelect?.(value)}>{children}</div>
  ),
}));

vi.mock("lucide-react", () => ({
  Plus: () => <svg data-testid="plus-icon" />,
  LogOut: () => <svg data-testid="logout-icon" />,
  FolderOpen: () => <svg data-testid="folder-icon" />,
  ChevronDown: () => <svg data-testid="chevron-icon" />,
}));

import { useRouter } from "next/navigation";
import { signOut } from "@/actions";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockPush = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (useRouter as any).mockReturnValue({ push: mockPush });
  (getProjects as any).mockResolvedValue([]);
  (createProject as any).mockResolvedValue({ id: "new-proj" });
  (signOut as any).mockResolvedValue(undefined);
});

afterEach(cleanup);

test("shows Sign In and Sign Up buttons when user is null", () => {
  render(<HeaderActions user={null} />);
  expect(screen.getByText("Sign In")).toBeDefined();
  expect(screen.getByText("Sign Up")).toBeDefined();
});

test("does not show Sign In/Sign Up when user is present", async () => {
  render(
    <HeaderActions
      user={{ id: "u1", email: "user@example.com" }}
      projectId="p1"
    />
  );
  await waitFor(() => {
    expect(screen.queryByText("Sign In")).toBeNull();
    expect(screen.queryByText("Sign Up")).toBeNull();
  });
});

test("opens AuthDialog in signin mode when Sign In is clicked", () => {
  render(<HeaderActions user={null} />);
  fireEvent.click(screen.getByText("Sign In"));
  const dialog = screen.getByTestId("auth-dialog");
  expect(dialog.getAttribute("data-mode")).toBe("signin");
});

test("opens AuthDialog in signup mode when Sign Up is clicked", () => {
  render(<HeaderActions user={null} />);
  fireEvent.click(screen.getByText("Sign Up"));
  const dialog = screen.getByTestId("auth-dialog");
  expect(dialog.getAttribute("data-mode")).toBe("signup");
});

test("shows New Design button when user is present", async () => {
  render(
    <HeaderActions user={{ id: "u1", email: "user@example.com" }} projectId="p1" />
  );
  await waitFor(() => {
    expect(screen.getByText("New Design")).toBeDefined();
  });
});

test("creates a project and navigates on New Design click", async () => {
  (createProject as any).mockResolvedValue({ id: "created-proj" });
  render(
    <HeaderActions user={{ id: "u1", email: "user@example.com" }} projectId="p1" />
  );

  await waitFor(() => screen.getByText("New Design"));
  fireEvent.click(screen.getByText("New Design"));

  await waitFor(() => {
    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/created-proj");
  });
});

test("calls signOut when logout button is clicked", async () => {
  render(
    <HeaderActions user={{ id: "u1", email: "user@example.com" }} projectId="p1" />
  );
  await waitFor(() => screen.getByTitle("Sign out"));
  fireEvent.click(screen.getByTitle("Sign out"));
  await waitFor(() => expect(signOut).toHaveBeenCalled());
});

test("shows project list from getProjects", async () => {
  (getProjects as any).mockResolvedValue([
    { id: "proj-alpha", name: "Alpha Project", createdAt: new Date(), updatedAt: new Date() },
    { id: "proj-beta", name: "Beta Project", createdAt: new Date(), updatedAt: new Date() },
  ]);
  render(
    <HeaderActions user={{ id: "u1", email: "user@example.com" }} projectId="current-proj" />
  );
  await waitFor(() => {
    expect(screen.getByText("Alpha Project")).toBeDefined();
    expect(screen.getByText("Beta Project")).toBeDefined();
  });
});

test("navigates to selected project", async () => {
  (getProjects as any).mockResolvedValue([
    { id: "proj-beta", name: "Beta Project", createdAt: new Date(), updatedAt: new Date() },
  ]);
  render(
    <HeaderActions user={{ id: "u1", email: "user@example.com" }} projectId="current-proj" />
  );
  await waitFor(() => screen.getByText("Beta Project"));
  fireEvent.click(screen.getByText("Beta Project"));
  expect(mockPush).toHaveBeenCalledWith("/proj-beta");
});
