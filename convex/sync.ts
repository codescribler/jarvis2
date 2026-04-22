import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

type TaskPriority = "urgent" | "high" | "normal" | "low";
type TaskStatus = "todo" | "in_progress" | "blocked" | "someday" | "done";
type TaskSize = 1 | 2 | 3 | 4 | 5;

const PRIORITIES: ReadonlySet<TaskPriority> = new Set([
  "urgent",
  "high",
  "normal",
  "low",
]);
const STATUSES: ReadonlySet<TaskStatus> = new Set([
  "todo",
  "in_progress",
  "blocked",
  "someday",
  "done",
]);
const SIZES: ReadonlySet<number> = new Set([1, 2, 3, 4, 5]);

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    if (typeof raw !== "string") continue;
    const n = raw.trim().toLowerCase();
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

function serializeTask(t: Doc<"tasks">) {
  return {
    id: t._id,
    title: t.title,
    description: t.description,
    notes: t.notes ?? null,
    priority: t.priority,
    size: t.size,
    status: t.status,
    tags: t.tags,
    dueDate: t.dueDate,
    parentId: t.parentId,
    doneAt: t.doneAt ?? null,
    createdAt: t._creationTime,
    updatedAt: t.updatedAt,
  };
}

export const createTaskForUser = internalMutation({
  args: {
    userId: v.id("users"),
    input: v.any(),
  },
  handler: async (
    ctx,
    { userId, input },
  ): Promise<{ id: string } | { error: string }> => {
    if (typeof input !== "object" || input === null) {
      return { error: "Body must be a JSON object" };
    }
    const raw = input as Record<string, unknown>;

    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (!title) return { error: "title is required" };

    const description =
      typeof raw.description === "string" ? raw.description : "";
    const notes = typeof raw.notes === "string" ? raw.notes : undefined;

    const priorityInput =
      typeof raw.priority === "string" ? raw.priority : "normal";
    if (!PRIORITIES.has(priorityInput as TaskPriority)) {
      return { error: `priority must be one of urgent|high|normal|low` };
    }
    const priority = priorityInput as TaskPriority;

    const statusInput = typeof raw.status === "string" ? raw.status : "todo";
    if (!STATUSES.has(statusInput as TaskStatus)) {
      return { error: `status must be one of todo|in_progress|blocked|someday|done` };
    }
    const status = statusInput as TaskStatus;

    const sizeInput = typeof raw.size === "number" ? raw.size : 3;
    if (!SIZES.has(sizeInput)) {
      return { error: "size must be 1, 2, 3, 4 or 5" };
    }
    const size = sizeInput as TaskSize;

    const tags = normalizeTags(raw.tags);

    const dueDate =
      typeof raw.dueDate === "string" && raw.dueDate.length > 0
        ? raw.dueDate
        : null;

    const now = Date.now();
    const id = await ctx.db.insert("tasks", {
      userId,
      title,
      description,
      priority,
      size,
      status,
      tags,
      dueDate,
      parentId: null,
      notes,
      doneAt: status === "done" ? now : undefined,
      updatedAt: now,
    });

    return { id };
  },
});

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

export const pull = internalQuery({
  args: { userId: v.id("users"), since: v.number() },
  handler: async (ctx, { userId, since }) => {
    const journalEntries = await ctx.db
      .query("journalEntries")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .collect();

    const newJournalEntries = journalEntries
      .filter((e) => e._creationTime > since)
      .map((e) => ({
        id: e._id,
        timestamp: e.timestamp,
        polishedText: e.polishedText,
        rawText: e.rawText,
        createdAt: e._creationTime,
      }));

    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const activeTasks = allTasks
      .filter((t) => t.status !== "done" && t.status !== "someday")
      .map(serializeTask);

    const newlyDoneTasks = allTasks
      .filter((t) => t.status === "done" && (t.doneAt ?? 0) > since)
      .map(serializeTask);

    return {
      syncedAt: Date.now(),
      newJournalEntries,
      activeTasks,
      newlyDoneTasks,
    };
  },
});
