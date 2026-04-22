# Task Update API and `high` Priority — Design

Two related changes to the Jarvis sync API and task model:

1. Add a new `high` priority, sitting between `urgent` and `normal`.
2. Add `PATCH /api/tasks/:id` so external systems can update tasks they
   created (or any task owned by the API key's user).

---

## 1. New `high` priority

### Ordering

`urgent > high > normal > low`

`urgent` remains the top priority. `high` is added directly below it.

### Backend changes

- **`convex/schema.ts`** — add `v.literal("high")` to the `priority` union
  on the `tasks` table. Adding a literal to a union is backward-compatible:
  existing rows with the old three values still validate.
- **`convex/tasks.ts`** — add `v.literal("high")` to `priorityValidator`.
- **`convex/sync.ts`** — add `"high"` to the `TaskPriority` type and the
  `PRIORITIES` set. Update the error message in `createTaskForUser`'s
  priority validation to read `urgent|high|normal|low`.

No data migration is needed; no existing rows have priority `"high"`.

### Frontend changes

- **`src/types/task.ts`** — extend `TaskPriority`:
  `"urgent" | "high" | "normal" | "low"`.
- **`src/components/tasks/TaskPriorityBadge.tsx`** — add a colour for
  `high`. Use `bg-orange-100 text-orange-700` (sits visually between
  red `urgent` and amber `normal`).
- **`src/components/tasks/TaskForm.tsx`** — extend the `priorities` array
  to `["urgent", "high", "normal", "low"]` so the dropdown lists in order.
- **`src/components/tasks/TasksApp.tsx`** — `priorityOrder` becomes
  `{ urgent: 0, high: 1, normal: 2, low: 3 }`.
- **`src/components/TaskModal.tsx`** and
  **`src/components/AutoTaskModal.tsx`** — add a `high` entry to each
  file's local `priorityStyles` map (same orange as the badge).
- **`src/lib/useTasks.ts`** — change `PRIORITY_MAP["high"]` from `"urgent"`
  to `"high"`. Keep `medium` → `normal` as-is.
- **`src/services/gemini.ts`** — no change. Gemini already emits
  `"high" | "medium" | "low"`; previously these were squashed by
  `PRIORITY_MAP`. After this change `"high"` will round-trip correctly.

### Docs

- **`docs/api.md`** — update the `priority ∈ ...` line in both the GET
  response field-notes section and the POST request body table to
  `urgent | high | normal | low`.

---

## 2. `PATCH /api/tasks/:id`

### Routing

Register a new HTTP route in `convex/http.ts`:

- `pathPrefix: "/api/tasks/"`, `method: "PATCH"` — the handler.
- `pathPrefix: "/api/tasks/"`, `method: "OPTIONS"` — CORS preflight.

Add `"PATCH"` to `Access-Control-Allow-Methods` in `corsHeaders`.

The handler extracts the id from the URL path:

```
const url = new URL(request.url);
const taskId = url.pathname.slice("/api/tasks/".length);
```

If `taskId` is empty, return `400`.

### Internal mutation

Add `updateTaskForUser` to `convex/sync.ts`, parallel to
`createTaskForUser`:

- **Args:** `userId: v.id("users")`, `taskId: v.string()`,
  `input: v.any()`.
- Use `ctx.db.normalizeId("tasks", taskId)` to convert the string id.
  If it returns `null`, return `{ error: "Invalid task id" }` →
  HTTP layer maps to **400**.
- Load the task. If it doesn't exist OR
  `task.userId !== userId`, return `{ error: "not_found" }` →
  HTTP layer maps to **404**.
- Validate `input` is an object (otherwise `400`).
- For each field present on `input`, validate using the same rules as
  `createTaskForUser`. Each field is **optional** on update — only
  fields present in the body get patched.
  - `title`: if present, trim and require non-empty.
  - `description`: if present, must be a string.
  - `notes`: if present, must be a string.
  - `priority`: if present, must be in `PRIORITIES`.
  - `status`: if present, must be in `STATUSES`.
  - `size`: if present, must be in `SIZES`.
  - `tags`: if present, normalise via `normalizeTags`.
  - `dueDate`: if present, must be `string` or `null`.
  - `parentId` is **not** updatable via the API (mirrors POST).
  - Unknown fields are silently ignored.
- `doneAt` transitions, mirroring `convex/tasks.ts` `update`:
  - If new status is `done` and existing status is not `done`,
    set `doneAt = now`.
  - If new status is set and is not `done` and existing status is
    `done`, set `doneAt = undefined`.
  - Otherwise leave `doneAt` alone.
- Always set `updatedAt = now`.
- On success, return the serialised updated task using `serializeTask`.

### HTTP layer

In `convex/http.ts`:

- `200 OK` on success, body is the serialised task (same shape as
  entries in `/api/sync`'s `activeTasks` / `newlyDoneTasks`).
- `400 Bad Request` — invalid JSON body, empty/invalid task id,
  invalid field values.
- `401 Unauthorized` — missing/invalid Bearer token.
- `404 Not Found` — task does not exist, or is owned by a different
  user than the API key.

Touch the API key's `lastUsedAt` on success, same as the other
endpoints.

### Docs

In `docs/api.md`:

- New `### PATCH /api/tasks/:id` section, modelled on the POST section:
  - Headers (Auth + Content-Type).
  - Field table — all fields optional; same types as POST minus
    `parentId`. Note that omitted fields are left unchanged
    (no defaults are re-applied on update).
  - Response: `200`, body shape matches a task from `/api/sync`.
  - Error responses: `400` / `401` / `404`.
  - Curl example.
- Update the CORS section: methods become
  `GET, POST, PATCH, OPTIONS`.
- Update the error-handling table to include `404` and to mention
  `PATCH` for `200` / `400`.
- Update the line "Subtasks, merging, and updates are managed only
  inside the Jarvis UI" in the POST section to drop "and updates"
  (only subtasks and merging remain UI-only).

---

## Out of scope

- Bulk update endpoint.
- Updating `parentId` via the API (subtask reparenting stays UI-only).
- Re-running any auto-classification or re-sorting of existing tasks
  to take advantage of the new `high` priority — users will set it
  themselves.
- Deleting tasks via the API.
