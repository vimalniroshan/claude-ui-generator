export function getFilename(path: string | undefined): string {
  if (!path) return "";
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

export function getToolLabel(
  toolName: string,
  args: Record<string, unknown> | undefined | null,
  _state?: string
): string {
  const command = args?.command as string | undefined;
  const filename = getFilename(args?.path as string | undefined);
  const newFilename = getFilename(args?.new_path as string | undefined);

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":
        return filename ? `Creating ${filename}` : "Working...";
      case "str_replace":
        return filename ? `Editing ${filename}` : "Working...";
      case "insert":
        return filename ? `Editing ${filename}` : "Working...";
      case "view":
        return filename ? `Reading ${filename}` : "Working...";
      case "undo_edit":
        return filename ? `Undoing edit in ${filename}` : "Working...";
      default:
        return "Working...";
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "rename":
        return filename && newFilename
          ? `Renaming ${filename} → ${newFilename}`
          : "Renaming file";
      case "delete":
        return filename ? `Deleting ${filename}` : "Deleting file";
      default:
        return "Working...";
    }
  }

  return toolName;
}
