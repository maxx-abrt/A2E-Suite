import { handleAuth } from "@workos-inc/authkit-nextjs"
import { NextRequest, NextResponse } from "next/server"

// Handles the WorkOS OAuth callback at /callback (outside /api on purpose:
// /api/* is routed to a different service by the ingress).
export const GET = handleAuth({
  returnPathname: "/dashboard",
  onError: (params: { error?: unknown; request: NextRequest }) => {
    const { error, request } = params
    const message = error instanceof Error ? error.message : String(error ?? "Unknown error")
    console.error("[AuthKit callback error]", message, { url: request.url })
    return NextResponse.json(
      { message: "Authentication callback failed", error: message },
      { status: 500 },
    )
  },
})
