import { NextResponse } from "next/server"
import { refreshSession, withAuth } from "@workos-inc/authkit-nextjs"

/**
 * Access-token endpoint for the two Convex clients (Bilan + A2E Core).
 *
 * WHY A ROUTE HANDLER AND NOT `useAccessToken()`:
 * AuthKit's client hook resolves the token through a Next **Server Action**.
 * Behind a reverse proxy whose browser `Origin` differs from `x-forwarded-host`
 * (this preview cluster, Vercel preview aliases, any ingress), that POST can be
 * rejected or stall — and a stalled token fetch leaves Convex permanently
 * unauthenticated with no visible error. A plain GET is immune to that.
 *
 * The token never leaves the authenticated browser session: the endpoint reads
 * the httpOnly AuthKit cookie server-side and returns nothing when signed out.
 * Note: `/api/*` is deliberately avoided — the preview ingress routes it away.
 */
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const force = url.searchParams.get("refresh") === "1"

  try {
    if (force) {
      try {
        const refreshed = await refreshSession({ ensureSignedIn: false })
        if (refreshed?.accessToken) {
          return NextResponse.json(
            { accessToken: refreshed.accessToken },
            { headers: { "Cache-Control": "no-store" } },
          )
        }
      } catch {
        // fall through to the current session below
      }
    }
    const { accessToken } = await withAuth()
    return NextResponse.json(
      { accessToken: accessToken ?? null },
      { status: accessToken ? 200 : 401, headers: { "Cache-Control": "no-store" } },
    )
  } catch {
    return NextResponse.json({ accessToken: null }, { status: 401, headers: { "Cache-Control": "no-store" } })
  }
}
