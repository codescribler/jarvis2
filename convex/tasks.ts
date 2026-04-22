import { v } from "convex/values";
import {
  query,
  mutation,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const n = t.trim().toLowerCase();
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

const priorityValidator = v.union(
  v.literal("urgent"),
  v.literal("high"),
  v.literal("normal"),
  v.literal("low"),
);
const sizeValidator = v.union(
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4),
  v.literal(5),
);
const statusValidator = v.union(
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("blocked"),
  v.literal("someday"),
  v.literal("done"),
);

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(5000);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    priority: priorityValidator,
    size: sizeValidator,
    status: statusValidator,
    tags: v.array(v.string()),
    dueDate: v.union(v.string(), v.null()),
    parentId: v.union(v.id("tasks"), v.null()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    return await ctx.db.insert("tasks", {
      userId,
      title: args.title,
      description: args.description,
      priority: args.priority,
      size: args.size,
      status: args.status,
      tags: normalizeTags(args.tags),
      dueDate: args.dueDate,
      parentId: args.parentId,
      notes: args.notes,
      doneAt: args.status === "done" ? now : undefined,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(priorityValidator),
    size: v.optional(sizeValidator),
    status: v.optional(statusValidator),
    tags: v.optional(v.array(v.string())),
    dueDate: v.optional(v.union(v.string(), v.null())),
    parentId: v.optional(v.union(v.id("tasks"), v.null())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Not found");
    }
    const { id, ...rest } = args;
    const now = Date.now();
    const patch: Partial<Doc<"tasks">> = { ...rest, updatedAt: now };
    if (patch.tags) patch.tags = normalizeTags(patch.tags);
    if (args.status !== undefined) {
      if (args.status === "done" && existing.status !== "done") {
        patch.doneAt = now;
      } else if (args.status !== "done" && existing.status === "done") {
        patch.doneAt = undefined;
      }
    }
    await ctx.db.patch(id, patch);
  },
});

async function collectDescendants(
  ctx: MutationCtx,
  userId: Id<"users">,
  rootId: Id<"tasks">,
): Promise<Id<"tasks">[]> {
  const result: Id<"tasks">[] = [];
  const queue: Id<"tasks">[] = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = await ctx.db
      .query("tasks")
      .withIndex("by_user_parent", (q) =>
        q.eq("userId", userId).eq("parentId", current),
      )
      .take(500);
    for (const child of children) {
      result.push(child._id);
      queue.push(child._id);
    }
  }
  return result;
}

export const merge = mutation({
  args: {
    keepId: v.id("tasks"),
    mergeIds: v.array(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const keeper = await ctx.db.get(args.keepId);
    if (!keeper || keeper.userId !== userId) {
      throw new Error("Not found");
    }

    const mergedTitles: string[] = [];
    const mergedTagSet = new Set<string>(keeper.tags);
    for (const id of args.mergeIds) {
      if (id === args.keepId) continue;
      const other = await ctx.db.get(id);
      if (!other || other.userId !== userId) continue;
      mergedTitles.push(other.title);
      for (const tag of other.tags) mergedTagSet.add(tag);
    }

    if (mergedTitles.length === 0) return;

    const existingNotes = keeper.notes?.trim() ?? "";
    const appended = mergedTitles.map((t) => `- ${t}`).join("\n");
    const newNotes = existingNotes
      ? `${existingNotes}\n\nMerged:\n${appended}`
      : `Merged:\n${appended}`;

    await ctx.db.patch(args.keepId, {
      notes: newNotes,
      tags: Array.from(mergedTagSet),
      updatedAt: Date.now(),
    });

    // Reparent any children of merged tasks to the keeper, then delete
    for (const id of args.mergeIds) {
      if (id === args.keepId) continue;
      const children = await ctx.db
        .query("tasks")
        .withIndex("by_user_parent", (q) =>
          q.eq("userId", userId).eq("parentId", id),
        )
        .collect();
      for (const child of children) {
        await ctx.db.patch(child._id, { parentId: args.keepId });
      }
      await ctx.db.delete(id);
    }
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Not found");
    }
    const descendants = await collectDescendants(ctx, userId, args.id);
    for (const id of descendants) {
      await ctx.db.delete(id);
    }
    await ctx.db.delete(args.id);
  },
});
