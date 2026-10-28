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
type scale, rhythm, spacing, schemes and breakpoints are imported
through the native [token adapter](../packages/twenty-front/src/modules/public-site/tokens.ts).
Its Heading, Body, SectionShell, section stacks, corner markers
and notched card geometry are ported under
[public-site/ui](../packages/twenty-front/src/modules/public-site/ui), with native
React Router links and frontend naming conventions. The adapter scopes the
website's 16px typography to a page inside the application's 13px root.

The native page retains the website's hero/preview, application strip, problem,
three-card features, guided steps, application explanations, use cases, FAQ and
notched footer structure. It uses precomputed geometric ASCII illustrations and self-hosted fonts. The heavy Next.js/WebGL scene engine is not embedded in the application;
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

The Suite, Bureau, Bilan, Agenda, Archive and Syna artwork is served locally from
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

## Brand kit (2026-10-28)

The native token adapter maps the website primitives to the nine supplied
pigments in `twenty-ui/src/theme/constants/A2eBrandColors.ts`: cream `#FAF6F2`,
charcoal `#31302E`, peach `#FFBDB2`, red `#E14B3D`, amber `#FBB04B`, orange
`#EB773C`, olive `#8A8D56`, lavender `#8590C8` and rose `#B67585`. The peach
value follows the SVG fill; its printed charcoal label was duplicated.
Translucent washes and surface depth mix these pigments; no additional base
palette is introduced. Existing semantic color names remain stable for saved
field colors, charts and application preferences.

Plus Jakarta Sans is self-hosted in normal and italic variable weights for the
application, account entry and public site. The supplied Dream Kudos face is
limited to the homepage hero's highlighted phrase. Subpages and the product use
Plus Jakarta Sans; ASCII art retains its monospace font. Public controls use
rounded shapes, restrained motion, visible keyboard focus and the existing
reduced-motion/pause controls.

The shared light theme uses cream surfaces and charcoal ink; the dark theme
uses charcoal surfaces and cream ink. The desktop home retains its native
widgets with a small brand-colour rule and quiet icon tiles. Small action labels
use the neutral pair because the unmodified accent pigments do not meet AA
text contrast. Accent borders, focus rings, tags and illustrations retain colour.
The PWA and pre-React loading surface use the supplied foundations too.

Focused checks cover normal/muted text, tag and button-pair contrast, all shared
runtime CSS tokens matching their TypeScript definitions, and existing public
navigation/home behavior. Isolated production previews verify the real public
components and native control specimens; they do not certify authenticated
workspace journeys or a deployed release. The separate `twenty-website` package
retains its own original identity.

## Detailed product preview (2026-10-28)

The hero and application pages share the same interactive example workspace.
Its sidebar follows the product grouping: Bureau contains Pages and Projects;
Agenda, Bilan, Archive, CRM and Syna are the other application destinations.
The homepage starts with the Bureau project table, while each application page
selects its own example. Scoped light/dark switching uses the real ThemeProvider
without changing the visitor's application preference.

Tables share the native row-height constant, fonts, borders, spacing and colour
tokens. The real calendar toolbar drives the sample day, week, month and agenda
views. The authenticated record renderer depends on workspace metadata and is
not mounted on a public route; small semantic tables illustrate the same visual
contract without connecting a demo to workspace records.

Working interactions include search, filters, sort direction, project completion,
table/board views, company records and opportunity pipelines, invoice/quote views,
file/folder details and calendar ranges. Record details use an adjacent panel;
closing a task returns keyboard focus to its current row or board card. Changes
remain local and survive switching preview applications. Syna offers prepared
answers and a link back to the example Bureau pages; it never calls an AI provider.
All companies, documents, amounts and events are labelled sample data.

ASCII illustrations are sampled from orthographic 3D geometry: an open book for
knowledge, layered pages for structured work, modular blocks for growth, and an
arched bridge for connection. A large, subdued lavender bridge frames the hero;
the section illustrations retain their legible silhouettes. Glyphs scale to their
containers, and motion follows the existing pause, visibility and reduced-motion
controls. Regenerate the static frames from the repository root with
`node packages/twenty-front/scripts/generate-public-ascii.mjs`, then format
`src/modules/public-site/art/PublicAsciiFrames.ts` in the frontend package.
No renderer, animation loop or geometry calculation runs in the browser.

## Application artwork (2026-10-28)

Large application cards use the supplied transparent ASCII PNGs for Bureau,
Agenda, Bilan, Archive and Syna, contained on the page surface without colored
backplates. Small card marks, the application strip and navigation retain the
compact transparent logos. CRM keeps its semantic people icon because no CRM
artwork was supplied. Archive also uses its compact mark in onboarding, the
application catalogue, the template gallery and the public workspace preview.

Archive ownership resolves through the installed application's universal
identifier, including renamed workspace installations. Sidebar folders use
stable logo components with the existing cached workspace state; they do not
poll or fetch application metadata to resolve a logo.
