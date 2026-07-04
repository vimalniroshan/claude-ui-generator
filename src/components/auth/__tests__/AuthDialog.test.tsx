import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AuthDialog } from "../AuthDialog";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("../SignInForm", () => ({
  SignInForm: ({ onSuccess }: any) => (
    <div data-testid="sign-in-form">
      <button onClick={onSuccess}>SignIn Submit</button>
    </div>
  ),
}));

vi.mock("../SignUpForm", () => ({
  SignUpForm: ({ onSuccess }: any) => (
    <div data-testid="sign-up-form">
      <button onClick={onSuccess}>SignUp Submit</button>
    </div>
  ),
}));

afterEach(cleanup);

test("renders nothing when closed", () => {
  render(
    <AuthDialog open={false} onOpenChange={vi.fn()} defaultMode="signin" />
  );
  expect(screen.queryByTestId("sign-in-form")).toBeNull();
});

test("shows SignInForm in signin mode", () => {
  render(
    <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signin" />
  );
  expect(screen.getByTestId("sign-in-form")).toBeDefined();
  expect(screen.queryByTestId("sign-up-form")).toBeNull();
  expect(screen.getByText("Welcome back")).toBeDefined();
});

test("shows SignUpForm in signup mode", () => {
  render(
    <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />
  );
  expect(screen.getByTestId("sign-up-form")).toBeDefined();
  expect(screen.queryByTestId("sign-in-form")).toBeNull();
  expect(screen.getByText("Create an account")).toBeDefined();
});

test("switches from signin to signup when link is clicked", () => {
  render(
    <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signin" />
  );
  fireEvent.click(screen.getByText("Sign up"));
  expect(screen.getByTestId("sign-up-form")).toBeDefined();
  expect(screen.queryByTestId("sign-in-form")).toBeNull();
});

test("switches from signup to signin when link is clicked", () => {
  render(
    <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />
  );
  fireEvent.click(screen.getByText("Sign in"));
  expect(screen.getByTestId("sign-in-form")).toBeDefined();
  expect(screen.queryByTestId("sign-up-form")).toBeNull();
});

test("calls onOpenChange(false) when sign-in form succeeds", () => {
  const onOpenChange = vi.fn();
  render(
    <AuthDialog open={true} onOpenChange={onOpenChange} defaultMode="signin" />
  );
  fireEvent.click(screen.getByText("SignIn Submit"));
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("calls onOpenChange(false) when sign-up form succeeds", () => {
  const onOpenChange = vi.fn();
  render(
    <AuthDialog open={true} onOpenChange={onOpenChange} defaultMode="signup" />
  );
  fireEvent.click(screen.getByText("SignUp Submit"));
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("updates mode when defaultMode prop changes", () => {
  const { rerender } = render(
    <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signin" />
  );
  expect(screen.getByTestId("sign-in-form")).toBeDefined();

  rerender(
    <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />
  );
  expect(screen.getByTestId("sign-up-form")).toBeDefined();
});
