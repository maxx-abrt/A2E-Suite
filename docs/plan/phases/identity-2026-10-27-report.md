# A2E Suite identity — 2026-10-27

User-pinned scope: complete the customer-facing Suite/app identity with supplied
transparent artwork; replace upstream public links and publish legal routes on
`a2esuite.com` using the supplied association details.

## Implementation

- Local Suite, Bureau, Bilan, Agenda and Syna artwork; browser and PWA exports.
- Stable app ownership selects logos in sidebar folders, installed/available
  apps and app details. Semantic actions, personal folders, third-party apps and
  workspace-uploaded logos retain their behavior.
- Native public site, account entry, onboarding, app headers, settings, emails,
  subjects, sender defaults, assistant descriptions and TOTP issuer use A2E.
- Native public Terms/Privacy/DPA routes, canonical URLs and legal/footer links.
  Shared operator identity and versioned DPA text; no fabricated operator
  signature, US affiliate, certification or assumed hosting vendor.
- Existing agreement PDFs and records are preserved; new acceptance records
  snapshot the new operator/version. No entity/schema changes or migration.
- Help resolves to the Suite's public routes, with no default upstream search
  request. An explicitly configured documentation provider still works.
- Internal package names, tool identifiers, webhook headers and compatibility
  protocols remain stable. No generated translation catalogs included.

Dedicated artwork was supplied for four app identities. Archive, base CRM and
Links retain their native semantic icons; no unprovided brand artwork is invented.

## Verification before release

Baseline: working checkout `3e9cf316`; production/main `bc1e163d`. Unrelated
Notion/Bureau changes were present at entry and must be excluded from release.

- Front focused checks: 21 suites / 129 tests passed; Bilan overview 5 passed.
- Server focused checks: 5 suites / 32 tests passed (DPA resolution/HTML,
  MFA resolver, MCP card and help lookup).
- Uncached package `tsgo -p tsconfig.json --noEmit`: front, server, emails and
  shared passed. Direct typed lint/format checks cover the changed sources.
- Production frontend Vite build passed (temporary output). Docker build-context
  import checks: 2 passed. This is not a complete container acceptance run.
- Public production preview rebuilt with a temporary extracted English catalog:
  Suite assets loaded; no page errors or missing images; desktop and 320/375px
  pages have no horizontal overflow; legal navigation and contact work.
- Actual generated DPA PDF: 3 A4 pages, correct title/operator/contact and
  accented glyphs; rendered pages visually checked. Acceptance remains together.
- Email host resolution checked for production/local origins and invalid URLs.
- Docs tests/checker passed; whitespace review clean.

The initial uncached Nx shared build retained a live barrel-generator worker
once generation was complete. Stopped only that invocation; regenerated barrels
with an explicit process exit and ran the declared Vite, declaration emit and
alias steps directly. Shared runtime exports were verified before dependent checks.

Production release and live acceptance must be recorded separately from these
local results. Coolify read-only inspection confirmed the existing application
serves both apex and www domains and was healthy before release preparation.

## 2026-10-28 14:17 UTC — Codex [executor]
**Task:** User-pinned logo refresh · **Slice:** supplied ASCII card artwork and Archive identity · **Claim:** done-for-review
**Base:** `069ebe80`; local macOS / Node 24.20.0; working tree clean at entry.
**Changed:** Six transparent PNG assets, shared logo/ASCII constants, public cards/catalogue/preview, onboarding/template catalogue and both sidebar folder renderers; logo ownership and DOM-persistence tests; branding/public-site docs.
**Decisions:** Preserve supplied PNG bytes/colors. Large cards contain the ASCII art without colored backplates; static alpha compensation keeps thin strokes visible at card scale. Small marks stay compact. Archive resolves by its universal application identifier; stable icon components prevent remounts on refreshed sidebar data, with no polling/query added. CRM retains its semantic icon because no CRM artwork was supplied.
**Checks:** Frontend focused Jest (six explicit suites) → 56/56; direct `npx tsgo -p tsconfig.json --noEmit` → exit 0; typed oxlint and oxfmt on all 13 touched/new TS/TSX files → clean. Production public-site Vite preview build → exit 0; six asset byte-equality checks and ASCII alpha checks → pass. Docs checker/tests → 37 documents / 356 links and 6/6; whitespace review → clean.
**Visual:** Local production preview at 1440px: all ten card images loaded, all six illustration panels transparent, complete silhouettes; 375px and 320px: no horizontal overflow. Archive detail: ASCII and compact marks loaded, no overflow; browser error log empty. Captures saved outside the repository.
**Missing for tick:** Authenticated installed-app sidebar journey and production deployment remain unverified; no app stack was launched, database modified, PLAN.md edited or commit created.
**Do not redo:** Shared Archive identity, cached workspace lookup and stable sidebar component mapping; retain semantic folder/file actions and third-party branding.
**Next:** Maintainer review and normal release/authenticated sidebar acceptance.
