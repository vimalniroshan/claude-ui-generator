import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PreviewFrame } from "../PreviewFrame";
import { useFileSystem } from "@/lib/contexts/file-system-context";
import { createImportMap, createPreviewHTML } from "@/lib/transform/jsx-transformer";

vi.mock("@/lib/contexts/file-system-context", () => ({
  useFileSystem: vi.fn(),
}));

vi.mock("@/lib/transform/jsx-transformer", () => ({
  createImportMap: vi.fn(),
  createPreviewHTML: vi.fn(),
}));

vi.mock("lucide-react", () => ({
  AlertCircle: () => <svg data-testid="alert-icon" />,
}));

const mockGetAllFiles = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (createImportMap as any).mockReturnValue({
    importMap: "{}",
    styles: "",
    errors: [],
  });
  (createPreviewHTML as any).mockReturnValue("<html><body>preview</body></html>");
});

afterEach(cleanup);

function setupFileSystem(files: Map<string, string>, refreshTrigger = 0) {
  (useFileSystem as any).mockReturnValue({
    getAllFiles: () => files,
    refreshTrigger,
  });
}

test("shows welcome/first-load state when no files exist", () => {
  setupFileSystem(new Map());
  render(<PreviewFrame />);
  expect(screen.getByText("Welcome to UI Generator")).toBeDefined();
});

test("shows no-preview error when files exist but no JSX entry point", () => {
  setupFileSystem(new Map([["/styles.css", "body {}"], ["/README.md", "# Hello"]]));
  render(<PreviewFrame />);
  expect(screen.getByText("No Preview Available")).toBeDefined();
  expect(screen.getByTestId("alert-icon")).toBeDefined();
});

test("renders iframe when App.jsx entry point exists", () => {
  setupFileSystem(new Map([["/App.jsx", "export default function App() {}"]]));
  const { container } = render(<PreviewFrame />);
  const iframe = container.querySelector("iframe");
  expect(iframe).toBeDefined();
});

test("renders iframe when App.tsx entry point exists", () => {
  setupFileSystem(new Map([["/App.tsx", "export default function App() {}"]]));
  const { container } = render(<PreviewFrame />);
  expect(container.querySelector("iframe")).toBeDefined();
});

test("renders iframe for first JSX file when no canonical entry point", () => {
  setupFileSystem(
    new Map([["/components/Widget.jsx", "export default function Widget() {}"]])
  );
  const { container } = render(<PreviewFrame />);
  expect(container.querySelector("iframe")).toBeDefined();
});

test("calls createImportMap and createPreviewHTML with file content", () => {
  const files = new Map([["/App.jsx", 'export default function App() { return <div/>; }']]);
  setupFileSystem(files);
  render(<PreviewFrame />);
  expect(createImportMap).toHaveBeenCalledWith(files);
  expect(createPreviewHTML).toHaveBeenCalledWith(
    "/App.jsx",
    "{}",
    "",
    []
  );
});

test("iframe has correct sandbox and title attributes", () => {
  setupFileSystem(new Map([["/App.jsx", "export default function App() {}"]]));
  const { container } = render(<PreviewFrame />);
  const iframe = container.querySelector("iframe")!;
  expect(iframe.getAttribute("sandbox")).toContain("allow-scripts");
  expect(iframe.getAttribute("sandbox")).toContain("allow-same-origin");
  expect(iframe.getAttribute("title")).toBe("Preview");
});

test("updates preview when refreshTrigger changes", () => {
  const files = new Map([["/App.jsx", "export default function App() {}"]]);
  setupFileSystem(files, 0);

  const { rerender } = render(<PreviewFrame />);
  // initial render may fire the effect multiple times due to internal state (isFirstLoad)
  const callsAfterMount = (createPreviewHTML as any).mock.calls.length;
  expect(callsAfterMount).toBeGreaterThan(0);

  setupFileSystem(files, 1);
  rerender(<PreviewFrame />);
  expect(createPreviewHTML).toHaveBeenCalledTimes(callsAfterMount + 1);
});

test("prefers /App.jsx over other entry points", () => {
  const files = new Map([
    ["/index.jsx", "export default function Index() {}"],
    ["/App.jsx", "export default function App() {}"],
  ]);
  setupFileSystem(files);
  render(<PreviewFrame />);
  expect(createPreviewHTML).toHaveBeenCalledWith("/App.jsx", expect.any(String), expect.any(String), expect.any(Array));
});
