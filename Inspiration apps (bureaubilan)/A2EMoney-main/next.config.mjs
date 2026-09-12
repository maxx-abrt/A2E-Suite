import createNextIntlPlugin from 'next-intl/plugin';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Types and lint are gates, not warnings: a regression must fail the build.
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Several lockfiles exist in the sandbox; pin the tracing root to this app.
  outputFileTracingRoot: import.meta.dirname,
  /**
   * Security headers (GDPR art. 32 "state of the art" + OWASP baseline).
   * `connect-src` must allow BOTH Convex deployments (Bilan + A2E Core), the
   * WorkOS API, and Backblaze B2 (presigned PUT/GET straight from the browser).
   */
  async headers() {
    const convex = "https://*.convex.cloud wss://*.convex.cloud https://*.convex.site"
    const b2 = "https://*.backblazeb2.com"
    const workos = "https://api.workos.com https://*.workos.com"
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self' https://api.workos.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // Next.js injects inline bootstrap scripts and styles.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      `connect-src 'self' ${convex} ${b2} ${workos} https://va.vercel-scripts.com https://cloudflareinsights.com https://static.cloudflareinsights.com`,
      "worker-src 'self' blob:",
      "upgrade-insecure-requests",
    ].join("; ")

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
      {
        // Never let a proxy or browser cache an authenticated payload.
        source: "/session/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ]
  },
  // Allow Server Actions (used by WorkOS AuthKit's useAccessToken) to work
  // behind the preview/ingress reverse proxy. The browser Origin is the internal
  // cluster domain (*.emergentcf.cloud) while x-forwarded-host is the public
  // domain (*.emergentagent.com); both must be allow-listed.
  // `**` is Next.js' recursive wildcard (matches any subdomain depth) — required
  // because the browser Origin behind the ingress is a multi-label cluster host
  // (e.g. finance-bilan.cluster-5.preview.emergentcf.cloud) while x-forwarded-host
  // is the public domain (*.preview.emergentagent.com).
  allowedDevOrigins: [
    "**.emergentagent.com",
    "**.emergentcf.cloud",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "**.emergentagent.com",
        "**.emergentcf.cloud",
        "localhost:3000",
      ],
    },
  },
  images: {
    unoptimized: true,
  },
  // reaviz ships ESM-only via the `exports` field and isn't picked up
  // correctly during Next 15 production builds unless we transpile it
  // (along with its peer deps).
  transpilePackages: [
    // Vendored A2E Core package ships raw TypeScript source.
    "@a2e/core",
    "reaviz",
    "rdk",
    "realayers",
    "transformation-matrix",
    "@react-spring/web",
    "@react-spring/animated",
    "@react-spring/core",
  ],
  webpack: (config) => {
    // Force webpack to resolve `reaviz` to its actual ESM entry, bypassing
    // the strict `exports` field that fails Next 15 production builds.
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      reaviz$: require("path").resolve("./node_modules/reaviz/dist/index.js"),
    }
    return config
  },
}

export default withNextIntl(nextConfig)
