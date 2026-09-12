import { NextResponse } from "next/server"
import { getSignUpUrl } from "@workos-inc/authkit-nextjs"

export async function GET(request: Request) {
  const returnTo =
    new URL(request.url).searchParams.get("returnPathname") ?? undefined
  const url = await getSignUpUrl(returnTo ? { returnTo } : undefined)
  return NextResponse.redirect(url)
}
