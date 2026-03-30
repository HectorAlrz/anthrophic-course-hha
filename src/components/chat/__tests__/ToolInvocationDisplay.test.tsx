import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationDisplay } from "../ToolInvocationDisplay";

afterEach(() => {
  cleanup();
});

test("shows 'Creating {filename}' for str_replace_editor create command", () => {
  render(
    <ToolInvocationDisplay
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/Counter.jsx" }}
      state="result"
    />
  );
  expect(screen.getByText("Creating Counter.jsx")).toBeDefined();
});

test("shows 'Editing {filename}' for str_replace_editor str_replace command", () => {
  render(
    <ToolInvocationDisplay
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/src/App.tsx" }}
      state="result"
    />
  );
  expect(screen.getByText("Editing App.tsx")).toBeDefined();
});

test("shows 'Viewing {filename}' for str_replace_editor view command", () => {
  render(
    <ToolInvocationDisplay
      toolName="str_replace_editor"
      args={{ command: "view", path: "/src/index.ts" }}
      state="result"
    />
  );
  expect(screen.getByText("Viewing index.ts")).toBeDefined();
});

test("shows 'Editing {filename}' for str_replace_editor insert command", () => {
  render(
    <ToolInvocationDisplay
      toolName="str_replace_editor"
      args={{ command: "insert", path: "/src/utils.ts" }}
      state="result"
    />
  );
  expect(screen.getByText("Editing utils.ts")).toBeDefined();
});

test("shows 'Deleting {filename}' for file_manager delete command", () => {
  render(
    <ToolInvocationDisplay
      toolName="file_manager"
      args={{ command: "delete", path: "/src/old.tsx" }}
      state="result"
    />
  );
  expect(screen.getByText("Deleting old.tsx")).toBeDefined();
});

test("shows 'Renaming {old} to {new}' for file_manager rename command", () => {
  render(
    <ToolInvocationDisplay
      toolName="file_manager"
      args={{
        command: "rename",
        path: "/src/Button.tsx",
        new_path: "/src/PrimaryButton.tsx",
      }}
      state="result"
    />
  );
  expect(
    screen.getByText("Renaming Button.tsx to PrimaryButton.tsx")
  ).toBeDefined();
});

test("shows fallback text when args are missing (partial-call)", () => {
  render(
    <ToolInvocationDisplay
      toolName="str_replace_editor"
      args={{}}
      state="partial-call"
    />
  );
  expect(screen.getByText("Modifying file...")).toBeDefined();
});

test("shows 'Managing files...' fallback for file_manager with no args", () => {
  render(
    <ToolInvocationDisplay
      toolName="file_manager"
      args={{}}
      state="partial-call"
    />
  );
  expect(screen.getByText("Managing files...")).toBeDefined();
});

test("shows icon (no spinner) when state is result", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/App.tsx" }}
      state="result"
    />
  );
  // Should not have a spinner
  expect(container.querySelector(".animate-spin")).toBeNull();
  // Should have an icon with emerald color
  expect(container.querySelector(".text-emerald-600")).toBeDefined();
});

test("shows spinner when state is not result", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/App.tsx" }}
      state="call"
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("falls back to raw toolName for unknown tools", () => {
  render(
    <ToolInvocationDisplay
      toolName="some_unknown_tool"
      args={{}}
      state="result"
    />
  );
  expect(screen.getByText("some_unknown_tool")).toBeDefined();
});
