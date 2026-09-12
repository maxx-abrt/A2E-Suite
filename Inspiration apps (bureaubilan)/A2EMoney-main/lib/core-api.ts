"use client"

import { makeFunctionReference } from "convex/server"

/**
 * Escape hatch for calling A2E Core functions that the vendored `@a2e/core`
 * package does not expose yet. Core functions are addressed by name, so a
 * brand-new core function is callable from Bilan the moment core is deployed —
 * no package bump, no PR here.
 *
 *   const deals = useCoreQuery(coreRef.query<{ workspaceId: string }>("crm_deals:list"), { workspaceId })
 */
export const coreRef = {
  query: <A extends Record<string, any> = Record<string, any>, R = unknown>(name: string) =>
    makeFunctionReference<"query", A, R>(name),
  mutation: <A extends Record<string, any> = Record<string, any>, R = unknown>(name: string) =>
    makeFunctionReference<"mutation", A, R>(name),
  action: <A extends Record<string, any> = Record<string, any>, R = unknown>(name: string) =>
    makeFunctionReference<"action", A, R>(name),
}

/** Deep links used by core search / notification hrefs inside Bilan. */
export const coreRoutes = {
  drive: (fileId: string) => `/dashboard/documents?file=${fileId}`,
  contact: (contactId: string) => `/dashboard/clients?contact=${contactId}`,
  task: () => "/dashboard/projects",
  member: () => "/dashboard/team",
  event: () => "/dashboard",
}
