import { v } from "convex/values"
import { internal } from "./_generated/api"
import { action, internalMutation, mutation, query } from "./_generated/server"
import { assertWorkspaceMember, getWorkosId, requireWorkosId } from "./lib/auth"

/**
 * VERIFIED IDENTITY DIRECTORY
 *
 * WorkOS AuthKit access tokens carry no `email`/`name` claims, so neither Bilan
 * nor core can learn a display identity from the JWT alone. Instead of trusting
 * the browser, `syncMe` resolves the caller's profile **server-side** from the
 * WorkOS Management API using the `sub` of the verified token, and stores it in
 * `a2e_directory`. Member lists then join core membership rows (mirrored per
 * workspace) with these verified profiles.
 *
 * A caller can only ever write their own row.
 */

export const upsert = internalMutation({
  args: {
    workosId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    coreUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("a2e_directory")
      .withIndex("by_workos", (q) => q.eq("workosId", args.workosId))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email ?? existing.email,
        name: args.name ?? existing.name,
        image: args.image ?? existing.image,
        coreUserId: args.coreUserId ?? existing.coreUserId,
        lastSeenAt: now,
        updatedAt: now,
      })
      return existing._id
    }
    return await ctx.db.insert("a2e_directory", {
      workosId: args.workosId,
      email: args.email,
      name: args.name,
      image: args.image,
      coreUserId: args.coreUserId,
      lastSeenAt: now,
      updatedAt: now,
    })
  },
})

/** Resolves the caller's authoritative profile from WorkOS and records it. */
export const syncMe = action({
  args: { coreUserId: v.optional(v.string()) },
  handler: async (ctx, { coreUserId }) => {
    const workosId = await requireWorkosId(ctx)
    const apiKey = process.env.WORKOS_API_KEY
    let email: string | undefined
    let name: string | undefined
    let image: string | undefined

    if (apiKey) {
      try {
        const res = await fetch(`https://api.workos.com/user_management/users/${workosId}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        if (res.ok) {
          const user = (await res.json()) as {
            email?: string
            first_name?: string | null
            last_name?: string | null
            profile_picture_url?: string | null
          }
          email = user.email ?? undefined
          name = [user.first_name, user.last_name].filter(Boolean).join(" ") || undefined
          image = user.profile_picture_url ?? undefined
        }
      } catch (error) {
        console.error("[directory.syncMe] WorkOS lookup failed", error)
      }
    }

    await ctx.runMutation(internal.directory.upsert, { workosId, email, name, image, coreUserId })
    return { workosId, email, name, image }
  },
})

/** Lets the client attach its resolved core user id to its own directory row. */
export const linkCoreUser = mutation({
  args: { coreUserId: v.string() },
  handler: async (ctx, { coreUserId }) => {
    const workosId = await requireWorkosId(ctx)
    const existing = await ctx.db
      .query("a2e_directory")
      .withIndex("by_workos", (q) => q.eq("workosId", workosId))
      .unique()
    const now = Date.now()
    if (existing) {
      if (existing.coreUserId !== coreUserId) await ctx.db.patch(existing._id, { coreUserId, updatedAt: now })
      else await ctx.db.patch(existing._id, { lastSeenAt: now })
      return existing._id
    }
    return await ctx.db.insert("a2e_directory", {
      workosId,
      coreUserId,
      lastSeenAt: now,
      updatedAt: now,
    })
  },
})

export const me = query({
  args: {},
  handler: async (ctx) => {
    const workosId = await getWorkosId(ctx)
    if (!workosId) return null
    const row = await ctx.db
      .query("a2e_directory")
      .withIndex("by_workos", (q) => q.eq("workosId", workosId))
      .unique()
    return row
      ? {
          _id: row._id,
          workosId: row.workosId,
          coreUserId: row.coreUserId ?? null,
          name: row.name ?? null,
          email: row.email ?? null,
          image: row.image ?? null,
        }
      : { _id: null, workosId, coreUserId: null, name: null, email: null, image: null }
  },
})

/**
 * Verified profiles of the people who share the given workspace. Scoped by the
 * membership mirror, so a member can never enumerate the directory at large.
 */
export const membersOf = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, { workspaceId }) => {
    await assertWorkspaceMember(ctx, workspaceId)
    const mirror = await ctx.db
      .query("coreMemberships")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect()
    const out: Array<{
      workosId: string
      coreUserId: string | null
      name: string | null
      email: string | null
      image: string | null
      role: string
      lastSeenAt: number | null
    }> = []
    for (const m of mirror) {
      const profile = await ctx.db
        .query("a2e_directory")
        .withIndex("by_workos", (q) => q.eq("workosId", m.workosId))
        .unique()
      out.push({
        workosId: m.workosId,
        coreUserId: profile?.coreUserId ?? null,
        name: profile?.name ?? null,
        email: profile?.email ?? null,
        image: profile?.image ?? null,
        role: m.role,
        lastSeenAt: profile?.lastSeenAt ?? null,
      })
    }
    return out
  },
})
