import { authkitProxy } from "@workos-inc/authkit-nextjs"

// WorkOS AuthKit middleware: refreshes the session cookie and makes auth state
// available throughout the app. Route protection is enforced in-app (dashboard
// layout + Convex <Authenticated> helpers) so all public marketing/legal/invite
// routes stay reachable.
export default authkitProxy({
  debug: true,
  redirectUri: process.env.WORKOS_REDIRECT_URI,
  eagerAuth: true,
  middlewareAuth: {
    enabled: false,
    unauthenticatedPaths: [],
  },
})

export const config = {
  matcher: [
    // Skip Next.js internals, the ingress-routed /api/*, and static files.
    "/((?!_next|api|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
}
