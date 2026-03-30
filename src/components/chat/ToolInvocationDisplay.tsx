import {
  FilePlus,
  FilePen,
  Eye,
  Trash2,
  ArrowRightLeft,
  Loader2,
  Wrench,
  type LucideIcon,
} from "lucide-react";

interface ToolInvocationDisplayProps {
  toolName: string;
  args: Record<string, unknown>;
  state: string;
}

function getFilename(path: unknown): string | undefined {
  if (typeof path !== "string") return undefined;
  return path.split("/").pop();
}

function getLabel(toolName: string, args: Record<string, unknown>): string {
  const command = args?.command as string | undefined;
  const filename = getFilename(args?.path);

  if (toolName === "str_replace_editor") {
    if (!command) return "Modifying file...";
    switch (command) {
      case "create":
        return filename ? `Creating ${filename}` : "Creating file...";
      case "str_replace":
      case "insert":
        return filename ? `Editing ${filename}` : "Editing file...";
      case "view":
        return filename ? `Viewing ${filename}` : "Viewing file...";
      default:
        return filename ? `Modifying ${filename}` : "Modifying file...";
    }
  }

  if (toolName === "file_manager") {
    if (!command) return "Managing files...";
    switch (command) {
      case "rename": {
        const newFilename = getFilename(args?.new_path);
        if (filename && newFilename)
          return `Renaming ${filename} to ${newFilename}`;
        return filename ? `Renaming ${filename}` : "Renaming file...";
      }
      case "delete":
        return filename ? `Deleting ${filename}` : "Deleting file...";
      default:
        return "Managing files...";
    }
  }

  return toolName;
}

function getIcon(
  toolName: string,
  args: Record<string, unknown>
): LucideIcon {
  const command = args?.command as string | undefined;

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":
        return FilePlus;
      case "str_replace":
      case "insert":
        return FilePen;
      case "view":
        return Eye;
      default:
        return FilePen;
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "delete":
        return Trash2;
      case "rename":
        return ArrowRightLeft;
      default:
        return Wrench;
    }
  }

  return Wrench;
}

export function ToolInvocationDisplay({
  toolName,
  args,
  state,
}: ToolInvocationDisplayProps) {
  const label = getLabel(toolName, args ?? {});
  const Icon = getIcon(toolName, args ?? {});
  const isComplete = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isComplete ? (
        <Icon className="w-3 h-3 text-emerald-600" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
