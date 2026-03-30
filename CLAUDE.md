# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

UIGen is an AI-powered React component generator with live preview. Users describe components in natural chat, Claude generates them via tool use, and results render in a sandboxed iframe with a virtual file system (no files written to disk).

## Commands

- **Setup**: `npm run setup` — installs deps, generates Prisma client, runs migrations
- **Dev**: `npm run dev` — starts Next.js dev server with Turbopack
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Test**: `npm run test` — runs Vitest in watch mode
- **Single test**: `npx vitest run src/path/to/file.test.ts`
- **DB reset**: `npm run db:reset`

All dev/build/start scripts require `NODE_OPTIONS='--require ./node-compat.cjs'` (already configured in package.json) — this is a workaround for Node 25+ Web Storage globals breaking SSR.

## Architecture

### Tech Stack
Next.js 15 (App Router) / React 19 / TypeScript / Tailwind CSS v4 / Prisma + SQLite / Vercel AI SDK + Claude Haiku 4.5

### Key Architectural Patterns

**AI Tool Use Flow**: The chat API (`src/app/api/chat/route.ts`) uses `streamText()` from the Vercel AI SDK with two tools:
- `str_replace_editor` (`src/lib/tools/str-replace.ts`) — create/view/edit files in the virtual file system
- `file_manager` (`src/lib/tools/file-manager.ts`) — rename/delete files

Tool calls from the AI are processed client-side by `FileSystemContext`, which applies them to the in-memory `VirtualFileSystem`.

**Virtual File System** (`src/lib/file-system.ts`): All project files live in memory as a `VirtualFileSystem` instance. It serializes to/from JSON for database persistence. The file system is the source of truth for both the code editor and the preview.

**Preview Rendering** (`src/lib/transform/jsx-transformer.ts` + `src/components/preview/PreviewFrame.tsx`): Babel standalone transpiles JSX client-side. An ESM import map resolves React/lucide/etc. from esm.sh CDN. The result renders in a sandboxed iframe.

**State Management**: Two React contexts drive the app:
- `ChatContext` (`src/lib/contexts/chat-context.tsx`) — chat messages, input, AI streaming
- `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) — virtual file system state, tool call handling

**Auth**: JWT sessions (jose) stored in httpOnly cookies. Passwords hashed with bcrypt. Middleware protects API routes. Server actions in `src/actions/` handle sign up/in/out.

**Mock Mode**: Without `ANTHROPIC_API_KEY` in `.env`, the app uses `MockLanguageModel` (`src/lib/provider.ts`) that returns canned components — useful for UI development without API costs.

### Data Model
Schema defined in `prisma/schema.prisma` — reference it for database structure.
- `User` has many `Project`s
- `Project` stores `messages` (chat history) and `data` (file system snapshot) as JSON strings
- Projects can be anonymous (nullable `userId`)

### Layout
The UI uses `react-resizable-panels` with a left chat panel and right preview/code panel. Code view further splits into file tree and Monaco editor.

## Conventions

- Path alias: `@/` maps to `src/`
- Server/client boundaries use explicit `"use server"` and `"use client"` directives
- UI primitives are shadcn/ui components in `src/components/ui/`
- Tests live in `__tests__/` directories next to the code they test
- Test setup: Vitest + jsdom + @testing-library/react
- Use comments sparingly. Only comment complex code.
