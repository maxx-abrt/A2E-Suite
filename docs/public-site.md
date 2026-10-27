# A2E Suite public site

[Documentation home](README.md) · [Product naming](product-experience.md)

The native application serves its public marketing homepage at `/` on the default
domain. `/welcome` remains the account/sign-in entry. Signed-in visitors to `/`
continue through that account flow; dedicated workspace domains retain their
existing sign-in behavior.

Public subpages are `/product`, `/apps`, `/use-cases`, `/why-a2e` and
`/getting-started`. Application detail pages live under `/apps/` for `bureau`,
`agenda`, `bilan`, `archive`, `crm` and `syna`. Both root and workspace routers
register the same paths. The account navigation guard permits those public paths
without granting access to workspace records. Product, import and FAQ links work
on direct entry and with native client navigation.

## Relationship to the local website

The implementation uses the local `packages/twenty-website` base. Its authored
palette, type scale, rhythm, spacing, schemes and breakpoints are imported directly
through the native [token adapter](../packages/twenty-front/src/modules/public-site/tokens.ts).
Its Heading, Body, SectionShell, section stacks, corner markers, beveled buttons
and notched card geometry are ported under
[public-site/ui](../packages/twenty-front/src/modules/public-site/ui), with native
React Router links and frontend naming conventions. The adapter scopes the
website's 16px typography to a page inside the application's 13px root.

The native page retains the website's hero/preview, application strip, problem,
three-card features, guided steps, application explanations, use cases, FAQ and
notched footer structure. It uses the original bridge illustration and self-hosted
fonts. The heavy Next.js/WebGL scene engine is not embedded in the application;
CSS transitions, interactive preview tabs and sticky sections provide native
motion with a reduced-motion mode. `twenty-website` remains a separate, unchanged
source package; this work does not publish that standalone site.

All visible branding, metadata, favicon, explanations and CTAs belong to A2E.
Upstream customer endorsements, community counts, pricing, partner claims, social
accounts and booking endpoints are not reused as A2E claims. Application copy
states installation/provider conditions where they affect availability. Preview
content is labeled as sample data. No external service is required by the page.
All text uses the existing Lingui pipeline; the Docker frontend build already
extracts and compiles catalogs before building. Generated catalogs are not part of
this change.

## Verification boundaries

Focused tests cover public entry, account routing, all eleven subpages, preview
keyboard navigation, FAQ disclosure and the existing account/onboarding redirect
matrix. An isolated production render with an extracted temporary English catalog
checks readable text, native routing, original fonts, desktop/mobile composition,
no horizontal overflow at 320/375/768px, and A2E-only visible branding.

The public site is served by the native SPA. This change does not add server-side
prerendering, deploy a release, or certify live account and workspace operations.
Those require the normal running-app acceptance checks.

## Supplied identity and legal pages (2026-10-27)

The Suite, Bureau, Bilan, Agenda and Syna artwork is served locally from
`twenty-front/public/branding`. First-party application marks resolve through
stable universal identifiers, including Bureau's constituent applications;
renaming a folder or translating its label does not change its logo. Personal
folders and third-party applications retain their existing icons. Browser/PWA
exports use the supplied Suite assets.

`/legal/terms`, `/legal/privacy` and `/legal/dpa` are registered in both native
routers and the public-route guard. Account-entry legal links target
`https://a2esuite.com/legal/…`; footer navigation links to the same public pages.
The operator information supplied by the maintainer is shared through
`A2E_SUITE_IDENTITY`: Association d’Entraide Étudiante, SIREN 994 936 789,
65 avenue Maréchal Lyautey, 21000 Dijon, contact@association2e.org.

The public DPA and generated document share `A2E_DPA_TERMS`. New acceptance
records snapshot version `2026-10-27` and the association's legal name. The
acceptance PDF records the customer's representative and timestamp; it does not
generate an association representative's signature. Existing agreement records
and stored PDFs remain historical evidence. Hosting/provider schedules must
reflect the actual deployment; upstream corporate affiliations, certifications,
pre-signed executives and assumed AWS locations are not A2E commitments.

In-app help and the default assistant help lookup use public A2E Suite routes.
An explicitly configured documentation search provider remains supported.
