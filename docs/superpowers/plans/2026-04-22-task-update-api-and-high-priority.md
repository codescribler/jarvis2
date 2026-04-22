# Task Update API and `high` Priority — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `high` priority between `urgent` and `normal`, and add a `PATCH /api/tasks/:id` endpoint for external clients to update tasks.

**Architecture:** Priority is a union in the Convex schema, mirrored in TypeScript types and several UI files; adding `high` is a set of small parallel edits. The new PATCH endpoint follows the existing pattern in `convex/http.ts` + `convex/sync.ts`: a thin HTTP handler calls an internal mutation that validates the body and patches the task after checking ownership.

**Tech Stack:** Convex (backend + HTTP), Next.js + React (frontend), TypeScript end-to-end.

**Spec:** `docs/superpowers/specs/2026-04-22-task-update-api-and-high-priority-design.md`

**Testing note:** This project has no automated test suite. Verification at each step uses `npx tsc --noEmit`, `npx convex dev --once` (to push schema and catch backend errors), and at the end, manual `curl` checks against a running dev deployment. Adding a test framework is out of scope.

---

## Task 1: Add `high` priority to the Convex backend

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/tasks.ts`
- Modify: `convex/sync.ts`

Convex requires the schema, validators, and runtime checks to agree. These three files must change together. Adding a new literal to an existing union is additive — no migration needed because no row currently has priority `"high"`.

- [ ] **Step 1: Add `high` to the schema priority union**

In `convex/schema.ts`, change the priority field in the `tasks` table (lines 19-23) to include `high`:

```ts
    priority: v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("normal"),
      v.literal("low"),
    ),
```

- [ ] **Step 2: Add `high` to the tasks mutation validator**

In `convex/tasks.ts`, change `priorityValidator` (lines 30-34):

```ts
const priorityValidator = v.union(
  v.literal("urgent"),
  v.literal("high"),
  v.literal("normal"),
  v.literal("low"),
);
```

- [ ] **Step 3: Add `high` to the sync runtime validation**

In `convex/sync.ts`:

1. Update the type alias (line 5):

```ts
type TaskPriority = "urgent" | "high" | "normal" | "low";
```

2. Update the `PRIORITIES` set (lines 9-13):

```ts
const PRIORITIES: ReadonlySet<TaskPriority> = new Set([
  "urgent",
  "high",
  "normal",
  "low",
]);
```

3. Update the error message in `createTaskForUser` (line 80) so it lists all four options:

```ts
      return { error: `priority must be one of urgent|high|normal|low` };
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Push schema to Convex dev to catch validation issues**

Run: `npx convex dev --once`
Expected: deploys cleanly, no schema validation error. If this fails because existing documents somehow have unexpected priority values, stop and investigate before proceeding.

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/tasks.ts convex/sync.ts
git commit -m "Add high priority to tasks backend"
```

---

## Task 2: Add `high` to the frontend priority type and ordering

**Files:**
- Modify: `src/types/task.ts`
- Modify: `src/components/tasks/TasksApp.tsx`
- Modify: `src/lib/useTasks.ts`

- [ ] **Step 1: Extend the `TaskPriority` union**

In `src/types/task.ts`, line 3:

```ts
export type TaskPriority = "urgent" | "high" | "normal" | "low";
```

- [ ] **Step 2: Update the priority sort order**

In `src/components/tasks/TasksApp.tsx`, line 25:

```ts
const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
```

- [ ] **Step 3: Stop squashing Gemini's `high` into `urgent`**

In `src/lib/useTasks.ts`, lines 9-11, change `PRIORITY_MAP` so `"high"` maps to itself:

```ts
const PRIORITY_MAP: Record<string, Task["priority"]> = {
  high: "high",
  medium: "normal",
};
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: errors will surface in components that exhaustively switch on priority (e.g. `TaskPriorityBadge.tsx`, `TaskModal.tsx`, `AutoTaskModal.tsx`, form). These are fixed in Task 3. Note the failures and continue.

- [ ] **Step 5: Commit**

```bash
git add src/types/task.ts src/components/tasks/TasksApp.tsx src/lib/useTasks.ts
git commit -m "Add high to frontend priority type and ordering"
```

---

## Task 3: Add `high` to the UI components

**Files:**
- Modify: `src/components/tasks/TaskPriorityBadge.tsx`
- Modify: `src/components/tasks/TaskForm.tsx`
- Modify: `src/components/TaskModal.tsx`
- Modify: `src/components/AutoTaskModal.tsx`

All four files have a `priority` → Tailwind class mapping or a priority list. After Task 2, these files now fail type-checking because `TaskPriority` has a value not in their maps.

The chosen colour for `high` is `bg-orange-100 text-orange-700` — sits between red (urgent) and amber (normal).

- [ ] **Step 1: Badge colour**

In `src/components/tasks/TaskPriorityBadge.tsx`, lines 5-9:

```tsx
const styles: Record<TaskPriority, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};
```

- [ ] **Step 2: Form dropdown order**

In `src/components/tasks/TaskForm.tsx`, line 15:

```ts
const priorities: TaskPriority[] = ["urgent", "high", "normal", "low"];
```

- [ ] **Step 3: Task modal priority style**

Open `src/components/TaskModal.tsx` and look at `priorityStyles` around line 13. Add a `high` entry with the same orange classes. For example, if it currently reads:

```ts
const priorityStyles = {
  urgent: "bg-red-100 text-red-700",
  normal: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};
```

Change to:

```ts
const priorityStyles = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};
```

If the file uses slightly different class names, match them — the point is to add a new `high` key using orange in the same style the file already uses.

- [ ] **Step 4: AutoTaskModal priority style**

Open `src/components/AutoTaskModal.tsx`. It has a `priorityStyles` object around line 8. Add a `high` entry the same way as Step 3.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new warnings.

- [ ] **Step 6: Smoke-test the UI**

Start dev server (`npm run dev` + `npx convex dev` in another terminal) and:

1. Open the tasks page, open the form, confirm the priority dropdown lists `urgent, high, normal, low` in that order.
2. Create or edit a task with priority `high`. Confirm the badge renders in orange.
3. Sort by priority. Confirm a `high` task sits between `urgent` and `normal`.

- [ ] **Step 7: Commit**

```bash
git add src/components/tasks/TaskPriorityBadge.tsx src/components/tasks/TaskForm.tsx src/components/TaskModal.tsx src/components/AutoTaskModal.tsx
git commit -m "Add high priority styling to task UI components"
```

---

## Task 4: Document `high` priority in the API docs

**Files:**
- Modify: `docs/api.md`

- [ ] **Step 1: Update the `/api/sync` field notes**

In `docs/api.md`, find the field-notes list under `### GET /api/sync` (around line 124) and change the `priority` bullet:

```
- `priority` ∈ `urgent | high | normal | low`
```

- [ ] **Step 2: Update the POST body table**

In the POST `/api/tasks` section field table (around line 168), change the `priority` row's Type column:

```
| `priority`    | `urgent` \| `high` \| `normal` \| `low`  | `normal`   |       |
```

- [ ] **Step 3: Commit**

```bash
git add docs/api.md
git commit -m "Document high priority in sync API docs"
```

---

## Task 5: Add `updateTaskForUser` internal mutation

**Files:**
- Modify: `convex/sync.ts`

This mirrors `createTaskForUser`: validate the body, patch the row, serialise it, return the result. All fields are optional on update.

- [ ] **Step 1: Add the mutation**

Append to `convex/sync.ts` (below `createTaskForUser`, above `pull`):

```ts
export const updateTaskForUser = internalMutation({
  args: {
    userId: v.id("users"),
    taskId: v.string(),
    input: v.any(),
  },
  handler: async (
    ctx,
    { userId, taskId, input },
  ): Promise<
    | { task: ReturnType<typeof serializeTask> }
    | { error: string; code?: "not_found" }
  > => {
    const id = ctx.db.normalizeId("tasks", taskId);
    if (!id) return { error: "Invalid task id" };

    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) {
      return { error: "Task not found", code: "not_found" };
    }

    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return { error: "Body must be a JSON object" };
    }
    const raw = input as Record<string, unknown>;

    const patch: Partial<Doc<"tasks">> = {};

    if ("title" in raw) {
      if (typeof raw.title !== "string") {
        return { error: "title must be a string" };
      }
      const trimmed = raw.title.trim();
      if (!trimmed) return { error: "title must not be empty" };
      patch.title = trimmed;
    }

    if ("description" in raw) {
      if (typeof raw.description !== "string") {
        return { error: "description must be a string" };
      }
      patch.description = raw.description;
    }

    if ("notes" in raw) {
      if (typeof raw.notes !== "string") {
        return { error: "notes must be a string" };
      }
      patch.notes = raw.notes;
    }

    if ("priority" in raw) {
      if (
        typeof raw.priority !== "string" ||
        !PRIORITIES.has(raw.priority as TaskPriority)
      ) {
        return { error: "priority must be one of urgent|high|normal|low" };
      }
      patch.priority = raw.priority as TaskPriority;
    }

    if ("status" in raw) {
      if (
        typeof raw.status !== "string" ||
        !STATUSES.has(raw.status as TaskStatus)
      ) {
        return {
          error: "status must be one of todo|in_progress|blocked|someday|done",
        };
      }
      patch.status = raw.status as TaskStatus;
    }

    if ("size" in raw) {
      if (typeof raw.size !== "number" || !SIZES.has(raw.size)) {
        return { error: "size must be 1, 2, 3, 4 or 5" };
      }
      patch.size = raw.size as TaskSize;
    }

    if ("tags" in raw) {
      patch.tags = normalizeTags(raw.tags);
    }

    if ("dueDate" in raw) {
      if (raw.dueDate !== null && typeof raw.dueDate !== "string") {
        return { error: "dueDate must be a string or null" };
      }
      patch.dueDate = raw.dueDate as string | null;
    }

    const now = Date.now();
    patch.updatedAt = now;

    if (patch.status !== undefined) {
      if (patch.status === "done" && existing.status !== "done") {
        patch.doneAt = now;
      } else if (patch.status !== "done" && existing.status === "done") {
        patch.doneAt = undefined;
      }
    }

    await ctx.db.patch(id, patch);
    const updated = await ctx.db.get(id);
    if (!updated) return { error: "Task not found", code: "not_found" };
    return { task: serializeTask(updated) };
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Push to Convex dev**

Run: `npx convex dev --once`
Expected: deploys cleanly.

- [ ] **Step 4: Commit**

```bash
git add convex/sync.ts
git commit -m "Add updateTaskForUser internal mutation"
```

---

## Task 6: Wire up `PATCH /api/tasks/:id`

**Files:**
- Modify: `convex/http.ts`

Registers a new PATCH route on `pathPrefix: "/api/tasks/"`, an OPTIONS route on the same prefix for CORS preflight, and adds `PATCH` to the allowed methods header. Note that POST requests to `/api/tasks` (exact path, no trailing slash) continue to hit the existing POST handler — Convex's router dispatches by `(method, path)`, so there's no conflict.

- [ ] **Step 1: Add PATCH to CORS allowed methods**

In `convex/http.ts`, lines 18-23:

```ts
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};
```

- [ ] **Step 2: Add OPTIONS preflight for the PATCH path**

Add this route in `convex/http.ts` after the existing POST `/api/tasks` route (after line 140):

```ts
http.route({
  pathPrefix: "/api/tasks/",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});
```

- [ ] **Step 3: Add the PATCH handler**

Add this route immediately after the OPTIONS route from Step 2:

```ts
http.route({
  pathPrefix: "/api/tasks/",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const authResult = await authenticateKey(request);
    if ("error" in authResult) return authResult.error;

    const record = await ctx.runQuery(internal.apiKeys.getByHash, {
      hashedKey: authResult.hashedKey,
    });
    if (!record) return jsonResponse({ error: "Invalid token" }, 401);

    const url = new URL(request.url);
    const taskId = url.pathname.slice("/api/tasks/".length);
    if (!taskId) return jsonResponse({ error: "Missing task id" }, 400);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const result = await ctx.runMutation(internal.sync.updateTaskForUser, {
      userId: record.userId,
      taskId,
      input: body as Record<string, unknown>,
    });

    if ("error" in result) {
      const status = result.code === "not_found" ? 404 : 400;
      return jsonResponse({ error: result.error }, status);
    }

    await ctx.runMutation(internal.apiKeys.touch, { id: record._id });

    return jsonResponse(result.task, 200);
  }),
});
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Push to Convex dev**

Run: `npx convex dev --once`
Expected: deploys cleanly.

- [ ] **Step 6: Manual curl verification**

Start dev (`npx convex dev` in one terminal). Generate a test API key in the app's Settings → API Keys page and export it:

```bash
export KEY=jv_...
export BASE=$(npx convex env get NEXT_PUBLIC_CONVEX_SITE_URL)
```

Create a test task and capture the id:

```bash
TASK_ID=$(curl -s -X POST \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"patch test","priority":"normal"}' \
  "$BASE/api/tasks" | python -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo $TASK_ID
```

Happy path — update priority to `high`:

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"priority":"high"}' \
  "$BASE/api/tasks/$TASK_ID"
```

Expected: `200`, body is the serialised task with `"priority":"high"` and a bumped `updatedAt`.

Error cases (each should return the documented status):

- `PATCH $BASE/api/tasks/not_a_real_id` with valid auth → `400 Invalid task id`
- `PATCH $BASE/api/tasks/$TASK_ID` without `Authorization` → `401`
- `PATCH $BASE/api/tasks/$TASK_ID` with body `{"priority":"bogus"}` → `400`
- `PATCH $BASE/api/tasks/$TASK_ID` with body `not json` → `400 Invalid JSON body`
- Delete the task via the UI, then PATCH the same id → `404 Task not found`

Status transitions:

- `PATCH` with `{"status":"done"}` → response `doneAt` is now (non-null).
- `PATCH` with `{"status":"todo"}` → response `doneAt` is `null`.

Confirm CORS preflight: `curl -s -i -X OPTIONS $BASE/api/tasks/anything` returns `204` with the updated `Access-Control-Allow-Methods` header.

- [ ] **Step 7: Commit**

```bash
git add convex/http.ts
git commit -m "Add PATCH /api/tasks/:id endpoint"
```

---

## Task 7: Document the PATCH endpoint

**Files:**
- Modify: `docs/api.md`

- [ ] **Step 1: Add the PATCH section**

In `docs/api.md`, insert a new `### PATCH /api/tasks/:id` section between the POST section and the CORS section (after the POST "Example" subsection, around line 227). Content:

```markdown
### `PATCH /api/tasks/:id`

Update an existing task owned by the API key's user. Only fields present
in the request body are changed; omitted fields are left as-is.

#### Headers

```
Authorization: Bearer jv_...
Content-Type: application/json
```

#### Request body

All fields are optional. Same types as `POST /api/tasks` minus `parentId`.

| Field         | Type                                      | Notes |
|---------------|-------------------------------------------|-------|
| `title`       | string                                    | Trimmed, non-empty |
| `description` | string                                    |       |
| `notes`       | string                                    | Pass `""` to clear |
| `priority`    | `urgent` \| `high` \| `normal` \| `low`   |       |
| `status`      | `todo` \| `in_progress` \| `blocked` \| `someday` \| `done` | Transitioning to `done` stamps `doneAt`; transitioning away clears it |
| `size`        | `1` \| `2` \| `3` \| `4` \| `5`           |       |
| `tags`        | string[]                                  | Trimmed, lower-cased, de-duplicated — **replaces** the existing tag list |
| `dueDate`     | string \| null                            |       |

Unknown fields are ignored. `parentId` cannot be changed via this endpoint.

Example — change priority and tags:

```json
{ "priority": "high", "tags": ["work", "urgent"] }
```

#### Response

`200 OK` — body is the updated task in the same shape as entries in the
`/api/sync` response:

```json
{
  "id": "k3abc...",
  "title": "Draft Q2 report",
  "description": "",
  "notes": null,
  "priority": "high",
  "size": 3,
  "status": "todo",
  "tags": ["work", "urgent"],
  "dueDate": null,
  "parentId": null,
  "doneAt": null,
  "createdAt": 1744700000000,
  "updatedAt": 1744800000000
}
```

`400 Bad Request` — invalid JSON, missing/invalid task id, or invalid field value.
`401 Unauthorized` — missing/invalid Bearer token.
`404 Not Found` — the task doesn't exist, or is owned by a different user.

#### Example

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer jv_..." \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}' \
  "https://<deployment>.convex.site/api/tasks/k3abc..."
```
```

- [ ] **Step 2: Update the POST section's "Subtasks, merging, and updates" note**

In `docs/api.md`, find the POST section's notes block (around line 215) and change:

```
- Subtasks, merging, and updates are managed only inside the Jarvis UI.
```

to:

```
- Subtasks and merging are managed only inside the Jarvis UI.
```

- [ ] **Step 3: Update the CORS section**

In `docs/api.md` (around line 236) change the `Access-Control-Allow-Methods` line:

```
Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS
```

- [ ] **Step 4: Update the error-handling table**

In `docs/api.md` (around line 273), add a row for `404` and update the `200` / `400` descriptions to mention PATCH:

```
| Status | Meaning |
|--------|---------|
| `200`  | OK (sync / PATCH success) |
| `201`  | Created (tasks POST) |
| `400`  | Invalid JSON body or invalid field |
| `401`  | Missing / empty / unrecognised Bearer token |
| `404`  | Task not found (PATCH) |
```

- [ ] **Step 5: Commit**

```bash
git add docs/api.md
git commit -m "Document PATCH /api/tasks/:id endpoint"
```

---

## Task 8: End-to-end verification

**Files:** none.

Final check that the two changes work together.

- [ ] **Step 1: Round-trip a `high` priority update via the API**

With Convex dev running:

```bash
TASK_ID=$(curl -s -X POST \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"round-trip","priority":"normal"}' \
  "$BASE/api/tasks" | python -c "import sys, json; print(json.load(sys.stdin)['id'])")

curl -s -X PATCH \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"priority":"high","title":"round-trip v2"}' \
  "$BASE/api/tasks/$TASK_ID" | python -m json.tool
```

Expected: response shows `"priority": "high"`, `"title": "round-trip v2"`, `updatedAt` bumped.

- [ ] **Step 2: Confirm it appears in sync and in the UI**

```bash
curl -s -H "Authorization: Bearer $KEY" "$BASE/api/sync?since=0" | python -m json.tool | grep -A2 round-trip
```

Expected: the task is in `activeTasks` with priority `high`.

Open the tasks page in the browser. Expected: the task appears with the orange `high` badge, sorted between urgent and normal.

- [ ] **Step 3: Tidy up**

Delete the round-trip test task via the UI. Nothing to commit.

---

## Done

At this point:

- New `high` priority is available in the schema, the UI, the API docs, and works in create + update + sort.
- `PATCH /api/tasks/:id` is live and documented.
- No new files outside `docs/superpowers/`; all edits are additive.
