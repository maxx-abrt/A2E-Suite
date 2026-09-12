"use client"

import "@/lib/intl-guard"
import * as React from "react"
import { useAuth } from "@workos-inc/authkit-nextjs/components"
import { CoreProvider, WorkspaceProvider } from "@a2e/core"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { FilePreviewProvider } from "@/components/file-preview-provider"
import { ConvexClientProvider, fetchWorkOSToken } from "@/components/ConvexClientProvider"
import { CoreErrorBoundary } from "@/components/core-error-boundary"
import { CoreBridge } from "@/lib/core-bridge"
import { coreRoutes } from "@/lib/core-api"
import type { UserInfo, NoUserInfo } from "@workos-inc/authkit-nextjs"

export type InitialAuth = Omit<UserInfo | NoUserInfo, "accessToken">

/**
 * Provider order is contractual (A2E guide §2 Step 4):
 *   ConvexClientProvider (Bilan's own deployment)
 *     → CoreProvider      (a second Convex client, the A2E Core deployment)
 *       → WorkspaceProvider (shared active workspace, same ids + storage key
 *                            as every other suite app)
 *         → CoreBridge      (membership mirror + verified identity)
 *
 * The SAME WorkOS access token authenticates both deployments — no token
 * exchange, no second login.
 */
function CoreLayer({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const fetchToken = React.useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!user) return null
      return await fetchWorkOSToken({ forceRefreshToken })
    },
    [user],
  )

  return (
    <CoreProvider
      /* Passed explicitly: the vendored package reads env vars dynamically, and
         Next only inlines *literal* `process.env.NEXT_PUBLIC_*` references. */
      url={process.env.NEXT_PUBLIC_CONVEX_CORE_URL}
      fetchToken={fetchToken}
      routes={coreRoutes}
    >
      <WorkspaceProvider>
        <CoreBridge>{children}</CoreBridge>
      </WorkspaceProvider>
    </CoreProvider>
  )
}

export function Providers({
  children,
  initialAuth,
}: {
  children: React.ReactNode
  initialAuth?: InitialAuth
}) {
  return (
    <ConvexClientProvider initialAuth={initialAuth}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <CoreErrorBoundary>
          <CoreLayer>
            <FilePreviewProvider>{children}</FilePreviewProvider>
            <Toaster />
            <SonnerToaster position="top-right" richColors closeButton />
          </CoreLayer>
        </CoreErrorBoundary>
      </ThemeProvider>
    </ConvexClientProvider>
  )
}
