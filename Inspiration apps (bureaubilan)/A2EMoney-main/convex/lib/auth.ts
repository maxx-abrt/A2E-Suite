import { GenericMutationCtx, GenericQueryCtx } from "convex/server"
import type { DataModel } from "../_generated/dataModel"
import { internal } from "../_generated/api"

export type QCtx = GenericQueryCtx<DataModel>
export type MCtx = GenericMutationCtx<DataModel>
/** Anything that carries a verified identity (queries, mutations AND actions). */
export type AuthCtx = { auth: QCtx["auth"] }

export type Role = "owner" | "admin" | "member" | "viewer"
const ROLE_RANK: Record<Role, number> = { owner: 4, admin: 3, member: 2, viewer: 1 }

/** Thrown when the core membership mirror has no row yet — the client must run `coreSync.syncFromCore`. */
export const NOT_SYNCED = "WORKSPACE_NOT_SYNCED"

/**
 * The caller's WorkOS user id (`sub`), taken from the verified JWT.
 * This is the suite-wide identity: the same human has the same id in every A2E
 * app (WorkOS ids are environment-scoped). Bilan stores it as `createdBy`.
 */
export async function requireWorkosId(ctx: AuthCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error("Not authenticated")
  return identity.subject
}

export async function getWorkosId(ctx: AuthCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity()
  return identity ? identity.subject : null
}

/** Back-compat alias: Bilan's "user id" is the WorkOS subject. */
export const requireUserId = requireWorkosId
export const getOptionalUserId = getWorkosId

/**
 * Authorises access to a **core** workspace for Bilan's own rows, using the
 * membership mirror (Pattern A). Core remains the source of truth; the mirror is
 * refreshed server-to-server through the secret-gated bridge.
 */
export async function assertWorkspaceMember(
  ctx: QCtx | MCtx,
  workspaceId: string,
  minRole: Role = "viewer",
): Promise<{ userId: string; workosId: string; role: Role }> {
  const workosId = await requireWorkosId(ctx)
  const membership = await ctx.db
    .query("coreMemberships")
    .withIndex("by_workos_workspace", (q) =>
      q.eq("workosId", workosId).eq("workspaceId", workspaceId),
    )
    .unique()
  if (!membership) throw new Error(NOT_SYNCED)
  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    throw new Error(`Forbidden: requires ${minRole} or higher`)
  }
  return { userId: workosId, workosId, role: membership.role }
}

export async function assertWorkspaceAdmin(ctx: QCtx | MCtx, workspaceId: string) {
  return assertWorkspaceMember(ctx, workspaceId, "admin")
}

/** Bilan-local audit entry (the shared audit trail lives in core). */
export async function logActivity(
  ctx: MCtx,
  args: {
    workspaceId: string
    actorId: string
    action: string
    targetType: string
    targetId: string
    metadata?: any
  },
) {
  await ctx.db.insert("a2e_activity", {
    workspaceId: args.workspaceId,
    actorId: args.actorId,
    action: args.action,
    targetType: args.targetType,
    targetId: args.targetId,
    metadata: args.metadata,
    createdAt: Date.now(),
  })
}

/**
 * Fans a notification out to the whole workspace through the CORE bell
 * (`sync:notifyWorkspace`). Mutations cannot call the bridge directly, so the
 * work is scheduled immediately after the transaction commits.
 */
export async function notifyWorkspaceMembers(
  ctx: MCtx,
  args: {
    workspaceId: string
    type: string
    title: string
    message?: string
    link?: string
    metadata?: any
    exceptUserId?: string
  },
) {
  await ctx.scheduler.runAfter(0, internal.coreSync.notifyWorkspace, {
    workspaceId: args.workspaceId,
    type: args.type.includes(".") ? args.type : `bilan.${args.type}`,
    title: args.title,
    message: args.message,
    link: args.link,
  })
}

export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40)
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base || "workspace"}-${suffix}`
}
