"use client"

import * as React from "react"
import { useAction, useMutation, useQuery } from "convex/react"
import { useConvexAuth } from "convex/react"
import { useAuth } from "@workos-inc/authkit-nextjs/components"
import { useCoreAuthState, useMe, useWorkspace, useWorkspaceMutations } from "@a2e/core"
import { api } from "@/convex/_generated/api"
import { enableCoreModules } from "@/lib/core-flags"

/**
 * THE BRIDGE between Bilan's own deployment and A2E Core (guide §12.2, Pattern A).
 *
 * On every authenticated session it:
 *  1. refreshes Bilan's `coreMemberships` mirror from core through the
 *     secret-gated service bridge (`coreSync.syncFromCore`) — this is what lets
 *     Bilan's Convex functions authorise access to core-scoped rows;
 *  2. resolves the caller's real identity server-side from the WorkOS Management
 *     API (`directory.syncMe`) because AuthKit access tokens carry no email/name
 *     claim, and links it to the core user id;
 *  3. pushes the resolved display name to core (`users.updateProfile`) so member
 *     lists look right in every suite app.
 *
 * It re-syncs when the workspace list changes, so a freshly accepted invitation
 * or a role change lands without a manual reload.
 */

interface BridgeState {
  ready: boolean
  syncing: boolean
  failed: boolean
  error: string | null
  lastSyncedAt: number | null
  resync: () => Promise<void>
}

const BridgeContext = React.createContext<BridgeState>({
  ready: false,
  syncing: false,
  failed: false,
  error: null,
  lastSyncedAt: null,
  resync: async () => {},
})

export function useCoreBridge() {
  return React.useContext(BridgeContext)
}

export function CoreBridge({ children }: { children: React.ReactNode }) {
  const { isAuthenticated: appAuthed } = useConvexAuth()
  const { isAuthenticated: coreAuthed } = useCoreAuthState()
  const { user } = useAuth()
  const { workspaces } = useWorkspace()
  const coreMe = useMe()

  const syncFromCore = useAction(api.coreSync.syncFromCore)
  const syncDirectory = useAction(api.directory.syncMe)
  const linkCoreUser = useMutation(api.directory.linkCoreUser)

  const [state, setState] = React.useState<{
    ready: boolean
    syncing: boolean
    failed: boolean
    error: string | null
    at: number | null
  }>({ ready: false, syncing: false, failed: false, error: null, at: null })

  const signature = React.useMemo(
    () => (workspaces ? workspaces.map((w) => `${w._id}:${w.role}`).sort().join("|") : null),
    [workspaces],
  )
  const lastSignature = React.useRef<string | null>(null)
  const directoryDone = React.useRef(false)
  // Auto-retry timer for a single transient core hiccup; cleared on unmount/new run.
  const retryTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const run = React.useCallback(
    async (sig: string | null, isRetry = false) => {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current)
        retryTimer.current = null
      }
      setState((s) => ({ ...s, syncing: true, failed: false, error: null }))
      try {
        await syncFromCore({})
        lastSignature.current = sig
        setState({ ready: true, syncing: false, failed: false, error: null, at: Date.now() })
        // Core is healthy again — clear any sticky runtime degradation that an
        // earlier CoreErrorBoundary trip may have set (see lib/core-flags.ts).
        enableCoreModules()
      } catch (error: any) {
        const msg = error?.message ?? "sync failed"
        // One automatic retry for transient core hiccups, then surface failure.
        if (!isRetry) {
          retryTimer.current = setTimeout(() => void run(sig, true), 1500)
          // Stay in `syncing` while the retry is pending so the UI keeps the
          // spinner instead of flashing a failure that may self-resolve.
          return
        }
        setState({ ready: false, syncing: false, failed: true, error: msg, at: null })
      }
    },
    [syncFromCore],
  )

  React.useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [])

  // 1 + 2. Mirror memberships whenever the core workspace list/roles change.
  React.useEffect(() => {
    if (!appAuthed || !coreAuthed || signature === null) return
    if (lastSignature.current === signature) return
    void run(signature)
  }, [appAuthed, coreAuthed, signature, run])

  // Verified identity + core user link (once per session).
  React.useEffect(() => {
    if (!appAuthed || directoryDone.current) return
    directoryDone.current = true
    void syncDirectory({ coreUserId: coreMe?._id }).catch(() => {
      directoryDone.current = false
    })
  }, [appAuthed, coreMe?._id, syncDirectory])

  React.useEffect(() => {
    if (!appAuthed || !coreMe?._id) return
    void linkCoreUser({ coreUserId: coreMe._id }).catch(() => {})
  }, [appAuthed, coreMe?._id, linkCoreUser])

  // 3. Keep the shared profile name in sync (tokens carry no name claim).
  const namePushed = React.useRef(false)
  const { updateProfile } = useWorkspaceMutations()
  React.useEffect(() => {
    if (!coreAuthed || namePushed.current || !coreMe) return
    const workosName = [user?.firstName, user?.lastName].filter(Boolean).join(" ")
    if (!workosName || coreMe.name === workosName) return
    namePushed.current = true
    void updateProfile({ name: workosName }).catch(() => {
      namePushed.current = false
    })
  }, [coreAuthed, coreMe, user?.firstName, user?.lastName, updateProfile])

  const value = React.useMemo<BridgeState>(
    () => ({
      ready: state.ready,
      syncing: state.syncing,
      failed: state.failed,
      error: state.error,
      lastSyncedAt: state.at,
      resync: () => run(signature),
    }),
    [state, run, signature],
  )

  return <BridgeContext.Provider value={value}>{children}</BridgeContext.Provider>
}

/** Convenience: the Bilan-side verified profile of the current user. */
export function useIdentity() {
  const { user, loading } = useAuth()
  const { isAuthenticated } = useConvexAuth()
  const directory = useQuery(api.directory.me, isAuthenticated ? {} : "skip")
  const workosName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || undefined
  return {
    isLoading: loading,
    workosId: directory?.workosId ?? null,
    coreUserId: directory?.coreUserId ?? null,
    name: directory?.name ?? workosName ?? null,
    email: directory?.email ?? user?.email ?? null,
    image: directory?.image ?? (user as any)?.profilePictureUrl ?? null,
  }
}
