"use client"

/**
 * COMPAT SHIM — Bilan's workspace context is now A2E Core's.
 *
 * Every page keeps importing `useWorkspace()` from here, but the state comes
 * from `@a2e/core`'s `WorkspaceProvider`: the same workspace ids, the same
 * localStorage key (`a2e_active_workspace`) as every other suite app, so
 * switching workspace in Bureau switches it in Bilan too.
 *
 * `activeWorkspace._id` is therefore a **core** workspace id — exactly what
 * Bilan's own Convex functions expect (`workspaceId: v.string()`).
 */
export { WorkspaceProvider, useWorkspace, useActiveWorkspaceId } from "@a2e/core"
export type { WorkspaceMembership } from "@a2e/core"
