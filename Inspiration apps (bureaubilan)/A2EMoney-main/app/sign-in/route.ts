import { NextResponse } from "next/server"
import { getSignInUrl } from "@workos-inc/authkit-nextjs"

export async function GET(request: Request) {
  const returnTo =
    new URL(request.url).searchParams.get("returnPathname") ?? undefined
  const url = await getSignInUrl(returnTo ? { returnTo } : undefined)
  return NextResponse.redirect(url)
}
