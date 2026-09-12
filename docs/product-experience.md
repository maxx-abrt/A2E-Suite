# Product experience: a workspace, not a collection of tools

[Documentation home](README.md) · [Delivery plan](../PLAN.md)

## Direction and boundaries

A2E Suite should let a person take notes and organize work without learning CRM
terminology, and let a team add collaboration, client work and finance without
moving to another product. Notion's approachable pages and Asana/ClickUp's work
organization are references, not a request to copy every feature or expose every
setting. Avoid overwhelming navigation and mandatory configuration up front.

Build on Twenty's identity, workspace isolation, permissions, metadata, sidebar,
views, record pages, workflows and storage. Preserve existing CRM journeys. Do
not embed the old reference applications, add their login systems, introduce
another backend, or fork the design system.

## Names users should understand

| Name | Product meaning | Current implementation boundary |
| --- | --- | --- |
| **A2E Suite** | The platform, workspace and shared shell | Twenty fork; internal package names remain `twenty-*` |
| **Bureau** | Intended installable work/knowledge experience: documents, projects and tasks; later collaboration and Drive | No Bureau app definition today. `a2e-documents` and `a2e-projects` supply parts of this experience |
| **Bilan** | Intended installable finance experience: quotes, invoices, cash movements, books, budgets, fiches and funding | Existing `a2e-accounting` app, display name `Bilan`; not release-certified |
| **CRM** | Optional user journey for client/contact/opportunity management | Existing standard objects; hiding navigation does not delete records or revoke access |
| **Texxel / A2EMoney** | Old inspiration applications | Reference-only trees under `Inspiration apps (bureaubilan)` |

**Proposed simplest Bureau packaging:** compose the existing Documents and
Projects apps through the existing installation/preset path, with one clear
Bureau entry experience. Do not create duplicate document/task objects. Before
implementation, confirm with the maintainer whether Bureau must have a distinct
application registration or a bundle/preset entry. Bundle dependency, version,
partial-install and removal semantics need an explicit contract; no generic
bundle engine or new universal identifier is assumed in this documentation MR.

## Five journeys that define intuitive

These are **acceptance targets**, not implemented-feature claims.

1. **Start:** create a workspace → choose a useful starting template or skip →
   see a short description of the requested apps → get visible installation
   progress → land on one useful page with one primary next action.
2. **Add an app:** find Applications without knowing Twenty internals → inspect
   purpose, permissions and prerequisites → install → open its sidebar entry.
   Missing server packages show a clear unavailable state, not an empty page.
3. **Do work:** create a document/project/invoice → link existing people, tasks
   or files using native relations → reopen the same record from search or the
   side panel without changing identity or workspace.
4. **Collaborate:** invite a member → grant a suitable role → share only what
   that role can access → edits survive reload and reconnect. Presence alone
   is not durable collaboration or lost-update protection.
5. **Change safely:** add another template without overwriting user work →
   retry failed installs without duplicate samples → hide navigation separately
   from uninstall → review data/dependency consequences before removal.

## Workspace templates

A **workspace template** selects apps, navigation and optional starter content.
A **content template** creates a document/project/fiche from reusable content.
A **workflow recipe** installs an editable automation in Twenty's workflow
engine. These are different lifecycle objects, not interchangeable labels.

### Current presets (observed, not install verification)

Source: [server definitions](../packages/twenty-server/src/engine/core-modules/onboarding/constants/workspace-template-definitions.constant.ts).

| Preset | Requested apps now | CRM navigation | Starter-content seeding now |
| --- | --- | --- | --- |
| CRM | None | Kept | Off |
| Individual | Documents | Three managed CRM entries hidden | Off |
| Student | Documents | Three managed CRM entries hidden | Off |
| Team | Documents | Kept | Off |
| Non-profit | Documents + Bilan | Kept | Off |
| Small business | Documents + Bilan | Kept | Off |

Projects/Bureau are not included. Preset selection is not proof of installation:
missing registrations/install failures can be skipped, and no generic starter
content seeder exists. See [troubleshooting](applications.md).

### Proposed starter packs

| Starting point | Apps to offer | Useful starter content | First action |
| --- | --- | --- | --- |
| Individual | Bureau foundation | Personal home, notes inbox, weekly plan | Write a note |
| Student | Bureau foundation | Course notes, assignment project, revision checklist | Add an assignment |
| Team | Bureau foundation; CRM opt-in | Team home, meeting note, project brief, task board | Create a project |
| Non-profit | Bureau + Bilan | Association profile checklist, activity project, balanced-budget fiche, funding dossier | Complete the organization profile |
| Small business | Bureau + Bilan; CRM opt-in | Client project, quote/invoice draft, monthly budget | Prepare a quote |
| CRM | Existing CRM; other apps opt-in | Preserve existing onboarding defaults | Add a contact or opportunity |

These are proposed content specifications; the starter packs and complete
onboarding seeding are **not shipped** by this MR. Bilan's existing fiche
registry contains eight domain templates; that is not a complete workspace
starter-pack implementation.

### Implementation contract for every starter pack

- Stable template identity and version; declare app prerequisites and locale.
- Preview included apps, content and permission requests before applying.
- Optional sample content, clearly labeled, with no invented real customers,
  bank details or legally certified documents.
- Reuse installed apps and user records. Track created samples by template
  provenance; reruns must not duplicate or overwrite them.
- Show requested/applied/failed app steps and a safe retry action; do not mark
  a template successful merely because its name was saved.
- Preserve user navigation outside template-managed entries. Test transitions
  both ways, especially Individual → CRM and back.
- Fresh workspace and populated-workspace tests, repeated apply, partial
  failure, permission denial and two-workspace isolation.

## Native interaction and visual rules

- One sidebar and workspace switcher. Group each app's entries; avoid dumping
  every internal object into navigation. Use a useful landing page and reveal
  advanced administration progressively.
- Reuse metadata table/kanban views and page-layout widgets before bespoke
  components. A table is not a board unless the object has meaningful stages.
- Use the existing side panel for previews and stable routes for full pages;
  back navigation, browser reload and copied links must work.
- Reuse Twenty UI tokens, icons and components; no reference-app theme or new
  component framework. Verify light/dark, keyboard focus, narrow screens,
  loading, empty, error and permission-denied states.
- Host strings use Lingui. App metadata localization and app JSX localization
  require separate verification against the actual SDK version; hard-coded
  French JSX is not bilingual merely because metadata has translations.
- Offer creation from an empty state and contextual help. Do not use AI as a
  prerequisite for routine actions; AI suggestions need review before writes.

## Files, sharing and collaboration contract

**Existing foundations:** server file storage, attachments, FILES fields,
preview components, workspace roles and record permissions. **Planned Drive:**
a management surface over those foundations, not a second storage service.

A complete file journey must specify:

- ownership (workspace, record and source app), folder relation and ordering;
- upload limits, failure/retry state, correct MIME/filename handling and preview;
- permission checks for listing, downloading and every share route;
- link expiry/revocation, private-by-default behavior and cross-workspace denial;
- archive, restore, purge and what happens when a referencing record or app is
  removed; no silent deletion of a shared file still used elsewhere;
- usage/quota reporting from actual storage data, not client-side estimates;
- consistent database plus object/local-storage backup and a restore drill.

For documents, persist revisions/comments and enforce stale-write detection
before advertising reliable co-editing. For finance, test rounding, numbering,
ledger provenance, retries and period locks before promising correctness or
compliance. Audit findings F01–F06 and F12 in the
[architecture audit](repository-architecture-audit.md) explain the current gaps.
