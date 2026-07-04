import { test, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInForm } from "../SignInForm";
import { useAuth } from "@/hooks/use-auth";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));
vi.mock("@/components/ui/input", () => ({
  Input: ({ ...props }: any) => <input {...props} />,
}));
vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

const mockSignIn = vi.fn();
afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  (useAuth as any).mockReturnValue({ signIn: mockSignIn, isLoading: false });
});

test("renders email and password fields", () => {
  render(<SignInForm />);
  expect(screen.getByLabelText("Email")).toBeDefined();
  expect(screen.getByLabelText("Password")).toBeDefined();
});

test("renders sign in button", () => {
  render(<SignInForm />);
  expect(screen.getByRole("button", { name: "Sign In" })).toBeDefined();
});

test("disables inputs and button while loading", () => {
  (useAuth as any).mockReturnValue({ signIn: mockSignIn, isLoading: true });
  render(<SignInForm />);
  expect(screen.getByLabelText("Email")).toHaveProperty("disabled", true);
  expect(screen.getByLabelText("Password")).toHaveProperty("disabled", true);
  expect(screen.getByRole("button")).toHaveProperty("disabled", true);
  expect(screen.getByText("Signing in...")).toBeDefined();
});

test("calls signIn with email and password on submit", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  render(<SignInForm />);

  await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "password123");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() => {
    expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "password123");
  });
});

test("calls onSuccess when signIn succeeds", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  const onSuccess = vi.fn();
  render(<SignInForm onSuccess={onSuccess} />);

  await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "password123");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
});

test("shows error message when signIn fails", async () => {
  mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });
  render(<SignInForm />);

  await userEvent.type(screen.getByLabelText("Email"), "bad@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "wrong");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() => {
    expect(screen.getByText("Invalid credentials")).toBeDefined();
  });
});

test("shows fallback error when signIn returns no error message", async () => {
  mockSignIn.mockResolvedValue({ success: false });
  render(<SignInForm />);

  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() => {
    expect(screen.getByText("Failed to sign in")).toBeDefined();
  });
});

test("clears previous error on new submit", async () => {
  mockSignIn
    .mockResolvedValueOnce({ success: false, error: "First error" })
    .mockResolvedValueOnce({ success: true });
  const onSuccess = vi.fn();
  render(<SignInForm onSuccess={onSuccess} />);

  fireEvent.submit(screen.getByRole("button").closest("form")!);
  await waitFor(() => screen.getByText("First error"));

  fireEvent.submit(screen.getByRole("button").closest("form")!);
  await waitFor(() => onSuccess.mock.calls.length > 0);

  expect(screen.queryByText("First error")).toBeNull();
});
