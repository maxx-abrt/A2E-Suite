import { v } from "convex/values"
import { query } from "./_generated/server"
import { assertWorkspaceMember } from "./lib/auth"

/**
 * Bilan's own audit trail (financial actions). The shared, cross-app trail lives
 * in A2E Core (`activities.list`); the Activity page merges both.
 */
export const list = query({
  args: { workspaceId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { workspaceId, limit }) => {
    await assertWorkspaceMember(ctx, workspaceId)
    const rows = await ctx.db
      .query("a2e_activity")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .order("desc")
      .take(limit ?? 100)

    // Hydrate the actor with the verified directory profile (workosId → person).
    const cache = new Map<string, string | null>()
    const out = []
    for (const row of rows) {
      if (!cache.has(row.actorId)) {
        const profile = await ctx.db
          .query("a2e_directory")
          .withIndex("by_workos", (q) => q.eq("workosId", row.actorId))
          .unique()
        cache.set(row.actorId, profile?.name ?? profile?.email ?? null)
      }
      out.push({ ...row, actorName: cache.get(row.actorId) })
    }
    return out
  },
})
