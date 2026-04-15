import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

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
    priority: v.union(
      v.literal("urgent"),
      v.literal("normal"),
      v.literal("low"),
    ),
    size: v.union(
      v.literal(1),
      v.literal(2),
      v.literal(3),
      v.literal(4),
      v.literal(5),
    ),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("blocked"),
      v.literal("someday"),
      v.literal("done"),
    ),
    tags: v.array(v.string()),
    dueDate: v.union(v.string(), v.null()),
    parentId: v.union(v.id("tasks"), v.null()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_parent", ["userId", "parentId"]),
});
