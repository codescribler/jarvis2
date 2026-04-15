import { v } from "convex/values";
import {
  action,
  query,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `jv_${hex}`;
}

export const create = action({
  args: { label: v.string() },
  handler: async (ctx, { label }): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const rawKey = randomKey();
    const hashedKey = await sha256Hex(rawKey);
    await ctx.runMutation(internal.apiKeys.insert, {
      userId,
      hashedKey,
      label: label.trim() || "Unnamed key",
    });
    return rawKey;
  },
});

export const insert = internalMutation({
  args: {
    userId: v.id("users"),
    hashedKey: v.string(),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("apiKeys", args);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const items = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return items
      .map((k) => ({
        _id: k._id,
        _creationTime: k._creationTime,
        label: k.label,
        lastUsedAt: k.lastUsedAt,
      }))
      .sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const revoke = mutation({
  args: { id: v.id("apiKeys") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

export const getByHash = internalQuery({
  args: { hashedKey: v.string() },
  handler: async (ctx, { hashedKey }) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_hash", (q) => q.eq("hashedKey", hashedKey))
      .unique();
  },
});

export const touch = internalMutation({
  args: { id: v.id("apiKeys") },
  handler: async (ctx, { id }: { id: Id<"apiKeys"> }) => {
    await ctx.db.patch(id, { lastUsedAt: Date.now() });
  },
});
