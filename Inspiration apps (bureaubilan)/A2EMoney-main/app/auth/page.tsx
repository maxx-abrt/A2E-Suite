import { redirect } from "next/navigation"

// Auth is handled by WorkOS AuthKit hosted login. Keep /auth as a friendly
// entry point that forwards to the WorkOS sign-in flow, preserving any
// post-login return path (e.g. invitations).
export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const target = next
    ? `/sign-in?returnPathname=${encodeURIComponent(next)}`
    : "/sign-in"
  redirect(target)
}
