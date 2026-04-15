import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("journalEntries")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1000);
  },
});

export const create = mutation({
  args: {
    rawText: v.string(),
    polishedText: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return await ctx.db.insert("journalEntries", {
      userId,
      rawText: args.rawText,
      polishedText: args.polishedText,
      timestamp: args.timestamp,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("journalEntries") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const entry = await ctx.db.get(args.id);
    if (!entry || entry.userId !== userId) {
      throw new Error("Not found");
    }
    await ctx.db.delete(args.id);
  },
});
