import { NextResponse } from "next/server"
import { getWorkOS, saveSession } from "@workos-inc/authkit-nextjs"

/**
 * DEV-ONLY login bypass.
 *
 * Establishes a REAL WorkOS AuthKit session (password grant) without the
 * cross-domain hosted-login redirect, which headless browsers cannot complete in
 * the preview environment. The session cookie is written by AuthKit's own
 * `saveSession()`, so its format always matches what the middleware expects.
 *
 * Guarded by `ALLOW_DEV_LOGIN=true` (set only in .env.local, never committed).
 * MUST be false/absent in production.
 */
export async function GET(request: Request) {
  if (process.env.ALLOW_DEV_LOGIN !== "true") {
    return new NextResponse("Not found", { status: 404 })
  }

  const url = new URL(request.url)
  const email = url.searchParams.get("email") || "devlogin@association.org"
  const password = url.searchParams.get("password") || "A2eMoney!Test2025"
  const returnPathname = url.searchParams.get("returnPathname") || "/dashboard"

  try {
    const workos = getWorkOS()
    const authResponse = await workos.userManagement.authenticateWithPassword({
      clientId: process.env.WORKOS_CLIENT_ID!,
      email,
      password,
    })

    // Writes the `wos-session` cookie with AuthKit's own sealing + options.
    await saveSession(authResponse, process.env.NEXT_PUBLIC_SITE_URL || url.origin)

    const base = process.env.NEXT_PUBLIC_SITE_URL || url.origin
    return NextResponse.redirect(new URL(returnPathname, base))
  } catch (e: any) {
    console.error("[dev-login] failed", e)
    return new NextResponse("Dev login failed: " + (e?.message || "error"), { status: 500 })
  }
}
