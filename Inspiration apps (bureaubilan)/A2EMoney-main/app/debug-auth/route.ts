import { NextResponse } from "next/server"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { cookies, headers } from "next/headers"

/** DEV-ONLY auth diagnostics (guarded by ALLOW_DEV_LOGIN). */
export async function GET() {
  if (process.env.ALLOW_DEV_LOGIN !== "true") {
    return new NextResponse("Not found", { status: 404 })
  }
  const jar = await cookies()
  const hdrs = await headers()
  let auth: any = null
  let error: string | null = null
  try {
    const { accessToken, ...rest } = await withAuth()
    auth = { ...rest, hasAccessToken: Boolean(accessToken) }
  } catch (e: any) {
    error = e?.message ?? String(e)
  }
  return NextResponse.json({
    cookies: jar.getAll().map((c) => ({ name: c.name, length: c.value.length })),
    host: hdrs.get("host"),
    xForwardedHost: hdrs.get("x-forwarded-host"),
    origin: hdrs.get("origin"),
    hasAuthkitHeaders: [...hdrs.keys()].filter((k) => k.startsWith("x-workos")),
    auth,
    error,
  })
}
