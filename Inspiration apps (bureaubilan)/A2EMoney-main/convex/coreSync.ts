import { ConvexHttpClient } from "convex/browser"
import { makeFunctionReference } from "convex/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { action, internalAction, internalMutation, query } from "./_generated/server"
import { getWorkosId, requireWorkosId } from "./lib/auth"

/**
 * A2E CORE SERVICE BRIDGE (app → core, server-to-server only).
 *
 * Bilan's backend mirrors the caller's core workspace memberships so it can
 * enforce access on its OWN tables, and fans notifications out through core's
 * shared bell. Every call carries `A2E_SERVICE_SECRET`, which exists only as a
 * Convex deployment env var — never in the client bundle.
 *
 * Core functions are addressed BY NAME (`makeFunctionReference`) so core can
 * evolve without any generated-API import in this repo.
 */

type CoreWorkspaceRow = {
  workspaceId: string
  name: string
  slug: string
  avatar?: string
  locale?: string
  currency?: string
  type?: string
  role: "owner" | "admin" | "member" | "viewer"
}

const workspacesForUser = makeFunctionReference<
  "query",
  { workosId: string; secret: string },
  CoreWorkspaceRow[]
>("sync:workspacesForUser")

const notifyWorkspaceRef = makeFunctionReference<
  "mutation",
  {
    secret: string
    workspaceId: string
    type: string
    title: string
    message?: string
    link?: string
    sourceApp: string
  },
  { sent: number }
>("sync:notifyWorkspace")

const importDriveFileRef = makeFunctionReference<
  "mutation",
  {
    secret: string
    workosId: string
    workspaceId: string
    name: string
    s3Key: string
    size: number
    contentType?: string
    sourceApp: string
    linkedTo?: { app: string; type: string; id: string }
    createdAt?: number
  },
  { fileId: string; created: boolean }
>("sync:importDriveFile")

function bridge(): { client: ConvexHttpClient; secret: string; url: string } {
  const url = process.env.CONVEX_CORE_URL
  const secret = process.env.A2E_SERVICE_SECRET
  if (!url || !secret) {
    throw new Error(
      "A2E core bridge is not configured: set CONVEX_CORE_URL and A2E_SERVICE_SECRET on this Convex deployment.",
    )
  }
  return { client: new ConvexHttpClient(url), secret, url }
}

// ------------------------------------------------------------------ mirror

export const applyMirror = internalMutation({
  args: {
    workosId: v.string(),
    rows: v.array(
      v.object({
        workspaceId: v.string(),
        name: v.string(),
        slug: v.optional(v.string()),
        avatar: v.optional(v.string()),
        locale: v.optional(v.string()),
        currency: v.optional(v.string()),
        type: v.optional(v.string()),
        role: v.union(
          v.literal("owner"),
          v.literal("admin"),
          v.literal("member"),
          v.literal("viewer"),
        ),
      }),
    ),
  },
  handler: async (ctx, { workosId, rows }) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("coreMemberships")
      .withIndex("by_workos", (q) => q.eq("workosId", workosId))
      .collect()
    const seen = new Set<string>()

    for (const row of rows) {
      seen.add(row.workspaceId)
      const current = existing.find((e) => e.workspaceId === row.workspaceId)
      const patch = {
        role: row.role,
        name: row.name,
        slug: row.slug,
        avatar: row.avatar,
        locale: row.locale,
        currency: row.currency,
        type: row.type,
        syncedAt: now,
      }
      if (current) await ctx.db.patch(current._id, patch)
      else await ctx.db.insert("coreMemberships", { workosId, workspaceId: row.workspaceId, ...patch })
    }

    // Membership revoked in core → the mirror must forget it immediately.
    for (const stale of existing) {
      if (!seen.has(stale.workspaceId)) await ctx.db.delete(stale._id)
    }
    return { workspaces: rows.length, removed: existing.length - seen.size }
  },
})

/**
 * Refreshes the caller's membership mirror from core. Called by the client on
 * login, on workspace switch, and after any membership change. The WorkOS id is
 * always derived from the verified JWT — never accepted as an argument.
 */
export const syncFromCore = action({
  args: {},
  handler: async (ctx): Promise<{ workspaces: number; syncedAt: number }> => {
    const workosId = await requireWorkosId(ctx)
    const { client, secret } = bridge()
    const rows = await client.query(workspacesForUser, { workosId, secret })
    await ctx.runMutation(internal.coreSync.applyMirror, {
      workosId,
      rows: (rows ?? []).map((r) => ({
        workspaceId: r.workspaceId,
        name: r.name,
        slug: r.slug,
        avatar: r.avatar,
        locale: r.locale,
        currency: r.currency,
        type: r.type,
        role: r.role,
      })),
    })
    return { workspaces: rows?.length ?? 0, syncedAt: Date.now() }
  },
})

// ------------------------------------------------------------------ outbound

export const notifyWorkspace = internalAction({
  args: {
    workspaceId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.optional(v.string()),
    link: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    try {
      const { client, secret } = bridge()
      await client.mutation(notifyWorkspaceRef, {
        secret,
        workspaceId: args.workspaceId,
        type: args.type,
        title: args.title,
        message: args.message,
        link: args.link,
        sourceApp: "bilan",
      })
    } catch (error) {
      // Never let the shared bell break a financial write.
      console.error("[coreSync.notifyWorkspace] failed", error)
    }
  },
})

/** Registers a file whose bytes already live in B2 as a core drive file (idempotent per s3Key). */
export const importDriveFile = internalAction({
  args: {
    workosId: v.string(),
    workspaceId: v.string(),
    name: v.string(),
    s3Key: v.string(),
    size: v.number(),
    contentType: v.optional(v.string()),
    linkedTo: v.optional(v.object({ app: v.string(), type: v.string(), id: v.string() })),
    createdAt: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const { client, secret } = bridge()
    return await client.mutation(importDriveFileRef, {
      secret,
      workosId: args.workosId,
      workspaceId: args.workspaceId,
      name: args.name,
      s3Key: args.s3Key,
      size: args.size,
      contentType: args.contentType,
      sourceApp: "bilan",
      linkedTo: args.linkedTo,
      createdAt: args.createdAt,
    })
  },
})

// ------------------------------------------------------------------ status

/**
 * Everything the Settings → "Espace partagé A2E" panel needs to make the
 * invisible shared layer debuggable (guide §5 of the runbook).
 */
export const status = query({
  args: {},
  handler: async (ctx) => {
    const workosId = await getWorkosId(ctx)
    const configured = Boolean(process.env.CONVEX_CORE_URL && process.env.A2E_SERVICE_SECRET)
    const coreHost = (process.env.CONVEX_CORE_URL ?? "").replace(/^https?:\/\//, "")
    if (!workosId) {
      return { authenticated: false, configured, coreHost, workosId: null, memberships: [], lastSyncedAt: null }
    }
    const rows = await ctx.db
      .query("coreMemberships")
      .withIndex("by_workos", (q) => q.eq("workosId", workosId))
      .collect()
    return {
      authenticated: true,
      configured,
      coreHost,
      workosId,
      memberships: rows.map((r) => ({
        workspaceId: r.workspaceId,
        name: r.name,
        role: r.role,
        syncedAt: r.syncedAt,
      })),
      lastSyncedAt: rows.reduce<number | null>((max, r) => (max === null || r.syncedAt > max ? r.syncedAt : max), null),
    }
  },
})
