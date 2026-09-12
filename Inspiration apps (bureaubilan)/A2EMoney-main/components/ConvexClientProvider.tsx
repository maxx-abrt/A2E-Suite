"use client";

import { ReactNode, useCallback, useState } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-nextjs/components";
import type { UserInfo, NoUserInfo } from "@workos-inc/authkit-nextjs";

/**
 * Fetches the WorkOS access token through `/session/token` (a plain GET Route
 * Handler) instead of AuthKit's Server-Action-based `useAccessToken()`.
 *
 * Rationale: behind any reverse proxy where the browser `Origin` differs from
 * `x-forwarded-host`, Next can reject or stall the Server Action POST, which
 * leaves both Convex clients unauthenticated with no visible error. A GET is
 * immune, behaves identically in dev/preview/production, and the token still
 * never leaves the authenticated session (httpOnly cookie read server-side).
 *
 * Exported so the A2E Core client uses exactly the same token — one login,
 * two deployments (integration guide §2 Step 3).
 */
export async function fetchWorkOSToken({
  forceRefreshToken,
}: { forceRefreshToken?: boolean } = {}): Promise<string | null> {
  try {
    const res = await fetch(`/session/token${forceRefreshToken ? "?refresh=1" : ""}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken: string | null };
    return data.accessToken ?? null;
  } catch {
    return null;
  }
}

export function ConvexClientProvider({
  children,
  initialAuth,
}: {
  children: ReactNode;
  initialAuth?: Omit<UserInfo | NoUserInfo, "accessToken">;
}) {
  const [convex] = useState(
    () =>
      new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
        unsavedChangesWarning: false,
        // Treat the WorkOS token as expired 30s early so the refresh completes
        // before the backend rejects it, avoiding a stuck-unauthenticated state
        // after a token refresh (get-convex/convex-backend#259).
        authRefreshTokenLeewaySeconds: 30,
      }),
  );

  return (
    // `onSessionExpired={false}` disables AuthKit's visibility-change probe,
    // which also relies on a Server Action.
    <AuthKitProvider initialAuth={initialAuth} onSessionExpired={false}>
      <ConvexProviderWithAuth client={convex} useAuth={useAuthFromAuthKit}>
        {children}
      </ConvexProviderWithAuth>
    </AuthKitProvider>
  );
}

function useAuthFromAuthKit() {
  const { user, loading } = useAuth();
  const isAuthenticated = !!user;

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken?: boolean } = {}) => {
      if (!user) return null;
      return await fetchWorkOSToken({ forceRefreshToken });
    },
    [user],
  );

  return { isLoading: loading, isAuthenticated, fetchAccessToken };
}
