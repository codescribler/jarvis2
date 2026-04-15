# Convex Migration & Authentication — Design

**Date:** 2026-04-15
**Status:** Approved

## Goal

Replace the browser localStorage data layer with a Convex backend, add email + password authentication via Convex Auth, and make the app fully reactive. Target the existing empty `jarvis` Convex dev deployment first; production wired up later.

## Non-goals

- Migrating existing localStorage data (start fresh — Convex is empty and user confirmed there's nothing worth preserving).
- OAuth / social logins. Email + password only.
- Password reset flow (deferred; can add later via email provider).
- Offline support / optimistic updates beyond what Convex gives by default.
- Production deployment setup (deferred).

## Architecture

Install `convex` + `@convex-dev/auth` and scaffold a `convex/` directory at the repo root. Convex functions become the data layer, replacing `src/lib/journal-storage.ts` and `src/lib/task-storage.ts`. Components call Convex through thin custom hooks in `src/lib/` (`useJournal.ts`, `useTasks.ts`) so component-level changes stay minimal.

Auth: `@convex-dev/auth` with the `Password` provider. `<ConvexAuthProvider>` wraps the app in `src/app/layout.tsx`. Unauthenticated users see a sign-in / sign-up form; authenticated users see the current app. Every query/mutation starts with an auth guard and scopes by `userId`.

**Environments:** existing Convex `jarvis` dev deployment during `next dev` (via `NEXT_PUBLIC_CONVEX_URL` in `.env.local`). Production deployment is deferred.

## Schema (`convex/schema.ts`)

```ts
journalEntries: defineTable({
  userId: v.id("users"),
  timestamp: v.number(),
  rawText: v.string(),
  polishedText: v.string(),
}).index("by_user_time", ["userId", "timestamp"]),

tasks: defineTable({
  userId: v.id("users"),
  title: v.string(),
  description: v.string(),
  priority: v.union(v.literal("urgent"), v.literal("normal"), v.literal("low")),
  size: v.union(
    v.literal(1), v.literal(2), v.literal(3), v.literal(4), v.literal(5),
  ),
  status: v.union(
    v.literal("todo"), v.literal("in_progress"), v.literal("blocked"),
    v.literal("someday"), v.literal("done"),
  ),
  tags: v.array(v.string()),
  dueDate: v.union(v.string(), v.null()),
  parentId: v.union(v.id("tasks"), v.null()),
  updatedAt: v.number(),
}).index("by_user", ["userId"])
  .index("by_user_parent", ["userId", "parentId"]),
```

**Changes from current types:**

- `id: string` → Convex auto `_id: Id<"...">`
- `createdAt` → Convex auto `_creationTime`
- `updatedAt` → explicit field managed in mutations (kept because task UI displays/sorts by it)
- `parentId` becomes a proper `Id<"tasks">` reference
- `users` table is provided automatically by `@convex-dev/auth`

## Convex functions

All functions start with `const userId = await getAuthUserId(ctx); if (!userId) throw new Error("Unauthorized");`

### `convex/auth.ts`
Convex Auth config with the `Password` provider from `@convex-dev/auth/providers/Password`.

### `convex/journal.ts`
- `list` (query) — current user's entries via `by_user_time` index, desc order
- `create` (mutation) — `{ rawText, polishedText, timestamp }` → inserts with `userId`
- `remove` (mutation) — `{ id }` → ownership check, delete

### `convex/tasks.ts`
- `list` (query) — all current user's tasks
- `listRoots` (query) — tasks where `parentId === null` via `by_user_parent`
- `listChildren` (query) — tasks where `parentId === <id>` via `by_user_parent`
- `create` (mutation) — inserts with `userId`, sets `updatedAt = Date.now()`; normalizes tags (trim/lowercase/dedupe)
- `update` (mutation) — partial update by id; ownership-checked; bumps `updatedAt`; normalizes tags if present
- `remove` (mutation) — recursively collects descendants via index queries, deletes atomically in one mutation transaction (same semantics as current `getDescendantIds`)
- `tagCounts` (query) — computes `{ tag, count }[]` sorted desc, server-side

## Frontend integration

### New files
- `src/app/ConvexClientProvider.tsx` — wraps `ConvexAuthProvider` + `ConvexReactClient`
- `src/components/SignInScreen.tsx` — email + password form with sign-in / sign-up toggle, shown when unauthenticated
- `src/lib/useJournal.ts` — `useJournalEntries()`, `useCreateEntry()`, `useDeleteEntry()`
- `src/lib/useTasks.ts` — `useTasks()`, `useRootTasks()`, `useCreateTask()`, `useUpdateTask()`, `useDeleteTask()`, `useTagCounts()`

### Modified files
- `src/app/layout.tsx` — wrap in `ConvexClientProvider` + `<Authenticated>` / `<Unauthenticated>` gates
- `src/types/index.ts` — `JournalEntry.id` → `_id: Id<"journalEntries">`; drop manual `timestamp` if redundant with `_creationTime` (keep `timestamp` — user enters it explicitly in current code)
- `src/types/task.ts` — `id` → `_id: Id<"tasks">`; drop `createdAt` (use `_creationTime`); keep `updatedAt`
- `src/components/JournalApp.tsx`, `JournalEntryList.tsx`, `AutoTaskModal.tsx`, `CommandsPanel.tsx`, `tasks/TasksApp.tsx`, `tasks/TaskBoard.tsx` — replace storage calls with new hooks

### Deleted files
- `src/lib/journal-storage.ts`
- `src/lib/task-storage.ts` (the pure helper `createTaskFromExtracted` moves to `useTasks.ts` or a small utility file)

Components become simpler: `const entries = useJournalEntries()` replaces `useState` + `useEffect` + `getAllEntries()`. Loading state is `entries === undefined` → show spinner.

## Error handling

- Unauthenticated query/mutation calls throw server-side; client shows sign-in screen via `<Unauthenticated>` gate, so this should not happen in practice.
- Ownership check in mutations throws on mismatch (defense-in-depth against forged ids).
- Network errors surface via Convex's built-in retry; user-visible toast for persistent failures (nice-to-have, not required for v1).

## Setup steps

1. `npm install convex @convex-dev/auth @auth/core`
2. `npx convex dev` — links to existing `jarvis` dev deployment, writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local`
3. `npx @convex-dev/auth` — scaffolds auth config (generates `JWT_PRIVATE_KEY` / `JWKS` env vars in the dev deployment)
4. Write schema, functions, and frontend changes
5. `npm run dev` — manually verify sign-up, sign-in, sign-out, create/read/delete for journal entries and tasks, hierarchical task delete, tag counts
6. Production deployment wired up in a follow-up task

## Success criteria

- User signs up with email + password, then signs in and sees an empty app.
- Creating a journal entry or task persists to Convex and appears immediately in the UI.
- Opening the app in a second tab shows changes live without refresh.
- Signing out and back in restores the same data.
- `src/lib/journal-storage.ts` and `src/lib/task-storage.ts` are deleted; no remaining `localStorage` references for journal/task data.
