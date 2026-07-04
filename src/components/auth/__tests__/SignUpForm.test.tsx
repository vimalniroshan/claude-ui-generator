import { test, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignUpForm } from "../SignUpForm";
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

const mockSignUp = vi.fn();
afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  (useAuth as any).mockReturnValue({ signUp: mockSignUp, isLoading: false });
});

test("renders email, password, and confirm password fields", () => {
  render(<SignUpForm />);
  expect(screen.getByLabelText("Email")).toBeDefined();
  expect(screen.getByLabelText("Password")).toBeDefined();
  expect(screen.getByLabelText("Confirm Password")).toBeDefined();
});

test("renders sign up button", () => {
  render(<SignUpForm />);
  expect(screen.getByRole("button", { name: "Sign Up" })).toBeDefined();
});

test("disables inputs and button while loading", () => {
  (useAuth as any).mockReturnValue({ signUp: mockSignUp, isLoading: true });
  render(<SignUpForm />);
  expect(screen.getByRole("button")).toHaveProperty("disabled", true);
  expect(screen.getByText("Creating account...")).toBeDefined();
});

test("shows error when passwords do not match — does not call signUp", async () => {
  render(<SignUpForm />);

  await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "password123");
  await userEvent.type(screen.getByLabelText("Confirm Password"), "different");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() => {
    expect(screen.getByText("Passwords do not match")).toBeDefined();
  });
  expect(mockSignUp).not.toHaveBeenCalled();
});

test("calls signUp with email and password when passwords match", async () => {
  mockSignUp.mockResolvedValue({ success: true });
  render(<SignUpForm />);

  await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "password123");
  await userEvent.type(screen.getByLabelText("Confirm Password"), "password123");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() => {
    expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "password123");
  });
});

test("calls onSuccess when signUp succeeds", async () => {
  mockSignUp.mockResolvedValue({ success: true });
  const onSuccess = vi.fn();
  render(<SignUpForm onSuccess={onSuccess} />);

  await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "password123");
  await userEvent.type(screen.getByLabelText("Confirm Password"), "password123");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
});

test("shows error message when signUp fails", async () => {
  mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });
  render(<SignUpForm />);

  await userEvent.type(screen.getByLabelText("Password"), "password123");
  await userEvent.type(screen.getByLabelText("Confirm Password"), "password123");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() => {
    expect(screen.getByText("Email already registered")).toBeDefined();
  });
});

test("shows fallback error when signUp returns no error message", async () => {
  mockSignUp.mockResolvedValue({ success: false });
  render(<SignUpForm />);

  await userEvent.type(screen.getByLabelText("Password"), "password123");
  await userEvent.type(screen.getByLabelText("Confirm Password"), "password123");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() => {
    expect(screen.getByText("Failed to sign up")).toBeDefined();
  });
});

test("does not call onSuccess when signUp fails", async () => {
  mockSignUp.mockResolvedValue({ success: false, error: "Error" });
  const onSuccess = vi.fn();
  render(<SignUpForm onSuccess={onSuccess} />);

  await userEvent.type(screen.getByLabelText("Password"), "password123");
  await userEvent.type(screen.getByLabelText("Confirm Password"), "password123");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() => screen.getByText("Error"));
  expect(onSuccess).not.toHaveBeenCalled();
});
