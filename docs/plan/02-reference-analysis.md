# Report 02 — Reference Apps Analysis (Texxel/Bureau + A2EMoney)

> Feature/UX evidence, not an integration or code-copy specification.
> Reviewed 2026-09-12 against A2E baseline `3e664c89`. Local sources below
> replace the historical `../Texxel` and `/tmp/A2EMoney` locations.
> PLAN.md owns proposed scope, scheduling, contracts and acceptance.

## 0. Boundary, complete project inventory and confidence

These are **different applications from multiple projects**. Every reference
is exclusively feature/UX inspiration: do not install them into A2E, copy their
full code, import their packages, connect their deployments, or adopt their
architecture, dependencies, identity, schemas or design system. Even shared
names (`A2E`, `core`, `Bureau`, `Bilan`) do not establish compatibility with
Twenty. Translate observed interactions into Twenty-native requirements.

Source keys are repository-relative directories (append the paths in the
feature tables):

- **B** = `Inspiration apps (bureaubilan)/A2EMoney-main`
- **W** = `Inspiration apps (bureaubilan)/Texxel-main/apps/web`
- **M** = `Inspiration apps (bureaubilan)/Texxel-main/apps/mobile`
- **D** = `Inspiration apps (bureaubilan)/Texxel-main/DEBUTMOBILEAPP`
- **L** = `Inspiration apps (bureaubilan)/Texxel-main/Inspiration`
- **T** = `Inspiration apps (bureaubilan)/Texxel-main`

Inventory method: enumerated **816 tracked paths: B 250, T 566**, all **12
package manifests** and route entrypoint paths; a filesystem boundary scan
(excluding dependencies/build/runtime directories) found the same 12 manifests,
no extra untracked packages. Read both domain schemas in full and inspected
feature components, handlers, template definitions and client contracts.
All **five runnable app/client surfaces** below were inspected.
This is complete coverage of local project boundaries, **not** a claim to have
read every source line, executed any reference app, or audited external services.

| Source/project boundary | Classification and inspection evidence | Treatment |
| --- | --- | --- |
| B: `package.json`, `app/dashboard/`, `convex/schema.ts` | Separate Bilan finance web app; domain UI and schema inspected | Finance, funding discovery, books and reporting requirements; not a Bureau submodule to import |
| W: `package.json`, `app/app/`, `convex/schema.ts` | Bureau web workspace client; documents/projects/tasks/calendar/databases/chat/files/team surfaces | Independent UX evidence, not proof of Twenty behavior |
| M: `package.json`, `app/(tabs)/_layout.tsx`, `src/data/hooks.ts` | Expo client of the Bureau project; real query/mutation hooks for docs/tasks/projects/members/events/inbox, distinct from D | Responsive/quick-capture requirements; native mobile delivery deferred |
| D: `package.json`, `lib/mock-data.ts`, `components/schedule/schedule-view.tsx`, `components/assistant/assistant-view.tsx` | Separate Next.js mobile UX prototype, mock records and canned timed AI replies | Home/project/doc rails, focus card, task detail, day schedule, search/inbox/profile and assistant action layout only; not working AI, scheduling or sync evidence |
| L: `package.json`, `app/page.tsx`, `components/Features.tsx` | Separate `pixelcraft-landing` site with hero, features, comparison, pricing, FAQ and testimonials | Progressive explanation/feature discovery only; marketing claims and decorative design are not product capabilities |
| B and T: each `packages/a2e-core/src/index.ts` and `src/types.ts` | Two vendored client copies, not two locally supplied core servers. Hooks cover drive, events/attendees, tasks, contacts, roles, notifications, links, shares, search and quotas | Interaction contracts only; external core behavior unverified |
| T: `packages/api/src/index.ts`, `packages/ui/package.json`, `packages/config/package.json`, root `package.json` | RPC/auth bridge, UI tokens, TypeScript config and monorepo orchestration; not additional end-user apps | No architecture/dependency adoption |
| T: `.patches/suggest-changes/package.json`, W `components/app/editor-tools.tsx`; T `convex/_generated/` | Vendored editor dependency and generated API artifacts, not distinct products | Review/suggestion UX observed at W; no vendor transplant |
| B: `poc/test_core.mjs`, `poc/test_stack.mjs` (inventory only) | Operational probes, not product apps | Not executed; no claims based on their expected outcomes |

**Unavailable sources:** vendored `APP_KEYS` names `bilan`, `bureau`, `drive`,
`forms`, `crm`, `core`. Standalone Drive/Forms/CRM app implementations and the
shared core server are **not present** in the supplied trees. Embedded file,
event and contact surfaces are inspectable; standalone feature completeness,
backend guarantees, live open-data availability, external AI and mobile push
are not. Do not infer a Forms roadmap from an app key. Request additional source
if that product is intended as further inspiration. Secrets, HAR/runtime logs,
installed dependencies and remote deployments were not inspected.

### 0.1 Feature traceability (observed versus intended)

**UI** = behavior expressed in inspected UI code; **schema/client** = declared
shape or call, not verified functioning behavior; **prototype** = mock/static
UX. None means production-tested. IDs map to actionable PLAN.md tasks.

| ID / family | Source anchors and exact observation | A2E destination / acceptance link |
| --- | --- | --- |
| R01 Documents and templates | W `lib/doc-templates.ts`: meeting notes, project brief, PRD, one-on-one in fr/en; `components/app/template-picker-dialog.tsx`: blank, categorized/searchable built-ins, saved workspace templates, HTML Notion import. `convex/schema.ts`: nested docs, favorites/tags, versions, visibility, guest edit, comments, fonts/styles. UI/schema, not all runtime-verified | P1.6 reusable templates; P3 repairs + P3.4; E04/E05 |
| R02 Rich authoring | W `lib/editor-schema.tsx`: chart/database/math/diagram/multi-column blocks, mentions, fonts; `components/app/editor-tools.tsx`: text suggestions, accept/reject; `components/app/export-dialog.tsx`: PDF/DOCX/ODT, page sizes/margins/header/footer, font fallback and progress; export fidelity remains unverified | P3.4 staged editor/portability backlog; no new editor stack; E05 |
| R03 Projects and tasks | W `components/app/project-detail.tsx`: overview, tasks, timeline, retroplanning, discussion, time and activity tabs, member add/remove and progress. `convex/schema.ts`: parent tasks, dependencies, estimates, IDs, statuses, labels, time entries. `components/app/tasks-view.tsx`: CSV export | P4 existing-slice repair, native task views, import/export; E06 |
| R04 Retroplanning | W `components/retro-planning.tsx`: deadline-relative steps with duration/offset, overlap warning, draggable preview, append/replace draft templates, create/edit/delete generated tasks; five presets: product launch, client delivery, marketing launch, content campaign, event planning | P4.2 + P1.6; preview/confirm, retry-safe standard-task creation and rescheduling; E06 |
| R05 Full calendar | W `components/app/calendar-view.tsx`: month/week/day, today/previous/next, all-day and time slots, drag-to-create, event CRUD, color/location, quick task creation, recurring occurrence versus series edit/delete. `lib/recurrence.ts` + schema: daily/weekly/monthly interval, weekdays, monthly position, count/until, exceptions. Reminders/project/task IDs are schema-level; attendee responses are client-level in T `packages/a2e-core/src/types.ts`, not demonstrated in EventDialog | **P4C**, not merely a task calendar view; E07; reminder/attendee runtime needs independent A2E checks |
| R06 Custom databases | W `components/app/database-view.tsx`: typed columns/cells, table/gallery/kanban/calendar selection, grouping/date field, CSV import/export and JSON export; source behavior, not runtime parity | P1.6 native metadata templates and P3.4 embedded-view spike; no JSON database engine; E03/E04 |
| R07 Team discussions | W `convex/schema.ts`: workspace/project/custom channels, private visibility, posting/member roles, thread replies, reactions, mentions, attachments, read cursors; `components/app/chat-panel.tsx` is UI consumer | P5/P8 + C4 permissions; E08 |
| R08 Files | W `app/app/files/page.tsx`: folder breadcrumbs, grid/list, upload queue/retry, multi/range selection, bulk move/download/delete with undo and attribution; external core hooks back operations. B `app/dashboard/documents/page.tsx` separately exposes upload/search/folders/trash/restore, quota usage, source-app labels and file-to-transaction/invoice/project/fiche/report/journal back-links | P6 over Twenty storage; E09; core storage guarantees unverified in references |
| R09 Workbench, personal and team UX | W `components/app/onboarding.tsx`: name + individual/business/association; schema user prefs: theme/locale/density/easy-read/tabs/shortcuts/quiet hours; `components/app/analytics-view.tsx`: completion/status/priority/weekly charts. M tab layout and data hooks: compact home/docs/tasks/insights/profile, project membership, comments, daily events, inbox and heatmap | P1.6/P1.7, P2/P8/P10; progressive disclosure, not a dense workbench requirement; E01–E03/E08/E12 |
| R10 Finance | B `convex/schema.ts`: invoices/items/statuses, income/expenses/recurrence, categories, budgets, project budget/spent, org profile, consent/data requests. B `app/dashboard/reports/page.tsx`: income/expense/invoice totals, trends, categories and project/category budget gauges | P7.1/P7.2, C6; E10; quotes/partial payments/VAT modes are A2E requirements, not inferred from the invoice reference schema |
| R11 Livre / tracking sheets | B `app/dashboard/book/page.tsx`: cashflow, donations, grants and custom starters; `app/dashboard/book/[id]/page.tsx`: typed columns, editable cells, required/select options, identity customization, proofs, CSV/XLSX exports and auto-row locks; schema + `convex/lib/defaultBook.ts`: system journal provenance | P7.1b, C6; E10. See terminology below |
| R12 Fiches and grant reporting | B `lib/fiche-templates.ts`: eight templates listed in §3.3. `app/dashboard/projects/[id]/cerfa/[reportId]/page.tsx` + `lib/cerfa-15059/types.ts`: five-step qualitative/expenses/income/annex/review wizard, projected versus actual amounts, project prefill, validation and PDF call | P7.1d + P7.2 grant report; E10; official form identity/version must be reviewed, not certified from source |
| R13 Funding discovery and dossiers | B `app/dashboard/subventions/page.tsx`: paginated text search, audience/territorial scale/aid type/open/call filters; counts/source freshness, external application links, shortlist, status, project link, decision amount → income confirmation. AI consent, reasons/next steps, model/cache indicator and recent runs; schema stores notes/runs/catalogue | P7.1f/P9, C6; E11; ingestion availability, legal suitability and zero-token history re-open not guaranteed |
| R14 Assistant and focus extras | W `components/app/ai-panel.tsx`: context summaries and pending/applied/rejected actions, task/document/project creation paths (not all declared edit actions supported); `components/pomodoro-timer.tsx`; `components/app/music/music-player-host.tsx`: persistent Spotify/YouTube/SoundCloud embed hosts. D assistant is canned, not real actions | P9 for authorized reviewed actions; optional P10 Pomodoro; music deferred pending product/privacy/provider review; E12. No external SDK adoption implied |
| R15 Prototype and landing discoveries | D day selector, focus/quick-action cards and contextual task detail; L page composes feature explanation, comparison and FAQ sections | P10 first-open help and responsive usability evaluation; E12; not mandatory imitation of either shell, colors, pricing or claims |

### 0.2 Terminology and evidence caveats

- User's **“following book”** has no exact match in the inspected tracked
  source text (`.ts/.tsx/.json/.md` search for that phrase, “livre de suivi”,
  “carnet de suivi”, “livre de comptes”). The concrete labels are **Livre /
  Book**, **Journal automatique**, and customizable tracking sheets. The
  grants sheet and the separate saved-subvention tracker both track progress.
  Plan all these observed flows; whether a separate non-financial follow-up
  notebook was intended remains a product question, not an invented synonym.
- The previous analysis called CERFA 15059 a donation receipt. B's inspected
  wizard models a **grant financial/qualitative report**, whereas current
  A2E `a2e-accounting/src/lib/cerfa.ts` calls it a donation receipt. This is a
  concrete contradiction: keep donation receipts (`recu_don`) and grant
  reports distinct, and require authoritative form/version review before PDF
  acceptance. Source naming alone is not legal evidence.
- B's recent-run button calls matching again; saved-run schema and cache
  fields do not prove a zero-token re-open in every case. That behavior is an
  explicit P9 requirement with a provider-call assertion.
- Full calendar UX is present in W; reminders/attendee delivery, timezone/DST
  correctness, recurring-event atomicity and external provider parity are not
  established by inspecting controls. These become A2E acceptance tests.
- W's duplicated `a2e_*` tables are a historical finance subset, not the same
  schema as B. Use B for finance feature detail; do not merge their schemas.

## 1. Bureau (Texxel) in one paragraph

Bureau's supplied web and Expo clients aim to connect documents, tasks,
projects, calendar, databases, chat and files. Its source distinguishes local
Convex data from an external shared core client; that is reference context,
**not an architecture to adopt**. Bilan remains a separate project with a
separate domain schema. Neither repository's connected-product claims prove
end-to-end operation in this checkout.

## 2. Bureau feature inventory → A2E Suite mapping

Observed declarations in W `convex/schema.ts` (read in full). Table names
below are reference data shapes, not A2E models or runtime verification.
Overlap notes distinguish native primitives from pending integration; current
implementation details and release gates are in PLAN.md.

| Bureau feature (real tables) | A2E Suite target | Overlap with Twenty today |
|---|---|---|
| Documents: `flux_documents` (nested tree, BlockNote JSON, icon, cover + coverY crop, isArchived, isPublished, allowGuestEdit, order + fractional `sortKey`, shareToken, visibility workspace/private/custom + accessUserIds, isFolder, AES-GCM passphrase lock: salt/iv/hint), `flux_documentVersions`, `flux_presence` + `flux_guestPresence`, `flux_comments` + `flux_commentThreads` (anchorFrom/To, referenceText) + `flux_commentMessages` (reactions), `flux_fonts` + `flux_documentStyles` (font/size/lineHeight/pageSize/margins/header/footer), `flux_docTemplates`, `flux_favorites`, `flux_tags`/`flux_documentTags` | **P3 Documents app** | `note` object, blocknote-editor, noteTargets, PDF export, favorites |
| Tasks: shared `tasks` table (projectId, parentId subtasks, status string, assignee, dueDate, blockedBy[], estimation, startDate, number for PRJ-42 ids) + `flux_taskMeta` sidecar (priority, labels, order, estimateMinutes, color), `flux_taskComments`, `flux_taskBin` (7-day trash + cron), `flux_taskStatuses` (custom kanban columns: key/label/color/order/isDone), `flux_labels`, `flux_timeEntries` (task and/or project, minutes, spentAt) | **P4 Projects & Tasks 2.0** | Standard task/status/targets plus partial app extensions; real task dependencies still pending |
| Projects: `projects` (client, status planning/active/completed/on_hold, targetDate, key, nextTaskNumber) + `flux_projectMembers` (lead/member) | P4 | Existing app project/member/milestone definitions, pending installed-behavior validation |
| Calendar: `flux_events` (full recurrence: freq/interval/daysOfWeek/monthlyPosition first..last/endAfterN/until/exceptions[], color, location, projectId, taskId, reminders[] minutes) | **P4C full calendar** | Provider create/import/sync exists; full local calendar/recurrence UX needs implementation and tests |
| Databases: `flux_databases` (columns JSON, viewType table/gallery/kanban/calendar, viewConfig) + `flux_databaseRows` | Native configurable objects/views and templates | Reuse metadata engine; exact view/import/embed feature parity must be tested |
| Chat: `flux_chatChannels` (workspace/project/custom, public/private, postPermission all/admin/moderator, archived), `flux_channelMembers` (viewer/poster/moderator), `flux_chatMessages` (attachments, mentionedUserIds, mentionedEntities {type,id,name}, parentId threads, editedAt/deletedAt), `flux_chatReactions`, `flux_chatUserReads` (lastReadAt, lastMessageId) | **P5 Live Chat** | none |
| Roles & teams: `flux_roles` (Discord-style, name/color/permissions[]/isDefault/order), `flux_roleAssignments`, `flux_teams` (memberIds; @team mentions notify all) | P4/P8 — Twenty has roles; add custom roles + teams on top if gap confirmed | workspace roles exist |
| Prefs: `flux_userPrefs` (locale, theme, accentColor, density, easyRead, tabs[], commandHistory frecency, shortcuts overrides, quietHours {enabled,start,end}) | P2 workbench (tabs, frecency) + P8 (quiet hours) | partial |
| Notifications: shared `notifications` (type/title/message/body/read/link/metadata/relatedId) | P8 | timelineActivities exist |

## 3. Bilan finance feature detail — local source B

Schema read in full (`convex/schema.ts`) and all eight definitions in
`lib/fiche-templates.ts`; selected domain routes/components inspected.
These are observed feature requirements to adapt, not a finance backend to
replicate and not a claim that every referenced feature works.

### 3.1 Observed finance declarations → native requirement

- `projects`: budget/spent plus client/status/dates. Extend and validate the
  existing A2E project fields and finance rollups (P4/P7), not a second project.
- `a2e_invoices`: number/client/contact link and snapshots, items (description,
  quantity, unit price), draft/sent/paid/overdue/cancelled, dates, notes,
  document/proof/book links, tax rate, currency and project. P7 already has
  invoice/line metadata; verify and complete it. Quotes, per-line VAT modes and
  partial payments are A2E additions, not claimed reference schema parity.
- `a2e_expenses`: expense/income, amount/category/date/payment method,
  invoice/book/saved-subvention links, recurrence weekly/monthly/yearly,
  tags/currency/sheet/project. P7 retains these requirements with authoritative
  money, provenance and recurrence checks.
- `a2e_bookSheets`: name/icon/color/type; typed columns with width/options/
  formula/required/linkedType/managed declarations; template flag and system
  key `bilan.default.ledger`, default/locked flags. Actual UI exposes six
  column types and editable manual cells; a formula field is not proof of a
  complete formula engine. P7.1b provides tracking sheets and managed journal.
- `a2e_bookEntries`: cells, proof/expense/invoice/project links, auto flag and
  sourceKind/sourceId provenance. Keep machine-managed versus manual edits
  explicit and server-enforced in A2E (C6); do not reproduce destructive
  reference ledger deletion semantics without finance review.
- `a2e_budgets`: amount/spent, category, monthly/yearly/custom period, dates,
  color/currency. `a2e_categories`: name/icon/color/type and archive. P7 maps
  these to existing metadata, rollup and accessible budget/report views.

### 3.2 Org identity & compliance

- `a2e_orgProfile` — ONE row per workspace: legalName, shortName, objet,
  **rna, siret**, address/postalCode/city, email/phone/website,
  representativeName/Role, **iban + bic encrypted at rest (AES-256-GCM)**,
  rupRecognized, fiscalRegime, structureKind (association/entreprise),
  projectSummary, headcount. `convex/a2e_org.ts` calls encryption helpers on
  sensitive fields and decrypts for workspace members; runtime security is
  unverified. P7 uses Twenty protection/permissions, plus reviewed prefill.
- GDPR: `a2e_consents`, `a2e_dataRequests`, `convex/gdpr.ts` declare consent
  history and export/erasure requests. P7 must define actual rights/retention
  behavior, not claim GDPR compliance from the presence of tables.
- `a2e_directory` + `security.ts` — member directory + security posture.

### 3.3 Fiches — templated official documents (the gem)

`a2e_fiches`: projectId, **template key**, title, subtitle, `data` (free JSON
matching template schema), status draft/submitted/approved/archived, locale.
`lib/fiche-templates.ts` defines **8 templates** (defaultTitle + defaultData).
These source structures are not certification of current official forms:

1. `asso_fr` — Fiche projet associatif (thematic, needs checkboxes, action
   types, actions[], volunteers/employees, partners, tracking tools…)
2. `blank` — Sheet
3. `recu_don` — Reçu fiscal de dons (art. 200 / 238bis / 978 regime
   checkboxes, donor info, forme/nature/modeVersement…)
4. **`budget_equilibre` — Budget prévisionnel à l'équilibre**: charges[]
   pre-seeded with French PCG account lines (60 Achats, 61 Services ext,
   62 Autres services, 63 Impôts, 64 Charges perso, 65 Autres) and produits[]
   (70 Ventes, 74 Subventions, 75 Cotisations/dons, 76 Produits financiers),
   year, scope, notes
5. `demande_subvention` — Demande CERFA 12156 (org identity, agrements, RUP,
   aidesPubliques3ans, budget charges/produits, project section,
   attestation flags)
6. `convention_subvention` — Convention (financeur + bénéficiaire blocks,
   paymentTerms, duration, affectation)
7. `rapport_activite` — Rapport annuel (presidentWord, governance,
   activities[], results, financialSummary)
8. `attestation_honneur` — Attestation sur l'honneur (dec* flags)

Editor/export source anchors: `components/fiches/document-editors.tsx` and
`lib/fiche-pdf.ts`. Separate `components/cerfa-15059/`, `lib/cerfa-15059/` and
`cerfa-15059-fields.csv` support the **15059-labelled grant-report wizard**
(qualitative, forecast/actual, annex, signature), not established donation-receipt
support. P7 adapts typed template editors and exports using native app surfaces;
official identity/version validation is pending (§0.2, PLAN D04).

### 3.4 Subventions — the public-funding marketplace (AI-driven)

- `a2e_subventions` — **global (not workspace-scoped) open-data catalogue**
  of French public funding: source/sourceId, title, description, eligibility,
  financers[]/instructors[]/programs[], audiences[] (association,
  entreprise, commune, particulier), aidTypes[], categories[], perimeter +
  scale, region, isCallForProject, dates (start/submissionDeadline/
  predeposit), rateMin/Max, url/applicationUrl, recurrence, european,
  isLive, searchText, hash. Ingested daily by `a2e_subventions.refreshAll`.
- `a2e_subventionSources` — ingestion bookkeeping per source; catalogVersion
  bump drives AI cache keys.
- `a2e_subventionSaved` — per-workspace tracking: status shortlisted/
  preparing/submitted/granted/rejected/abandoned, amountRequested/Granted,
  deadline, encrypted notes, **aiScore + aiReason**, incomeExpenseId (income
  created on grant).
- `a2e_subventionRuns` — saved AI matching run declarations (prompt, profile,
  results, model, cacheKey). Zero-token re-open remains an A2E acceptance
  requirement, not a verified result of the reference history button (§0.2).
- `a2e_aiCache` — **global LLM cache keyed sha256(kind+model+payload+
  catalogVersion)** with hits counter.

**A2E adaptation:** keep funding discovery first-class (R13/P7.1f), with
workspace-private dossiers/runs and optional reviewed AI. Current A2E catalogue
objects are workspace metadata; instance-shared ingestion is unresolved D03,
not mandatory architecture inherited from Bilan. Use existing queue/tool
primitives and C6 privacy rules.

### 3.5 UI surface (routes under `/dashboard`)

activity, book + book/[id], budget, clients, documents, expenses, fiches +
fiches/[id], invoices, legal, projects + projects/[id], reports, settings,
subventions, team. Components of note: command-palette, notifications-
dropdown, workspace-switcher, feature-bento, charts, attachments-field,
empty-state, consent-banner. Adapt these interactions through Twenty views,
record pages and grouped finance navigation; not every reference route needs
its own A2E page. Avoid overloading first-time users.

## 4. Architectural lessons (from both repos' guides)

1. **"What lives where" test** — cross-app readable → core/shared; app-shaped
   → app. We adapt: shared = standard objects + workspace-level services;
   app = SDK objects.
2. **Additive-only law** — never rename/remove shared fields. Matches our
   upgrade-command rules.
3. **Usability**: predictable navigation, stable links and clear save/reconnect
   feedback. Prefer Notion-like progressive disclosure; reference workbench
   density is not an A2E requirement.
4. **Auto-journal pattern** (A2EMoney): system-managed rows carry
   provenance (`auto`, sourceKind/sourceId) and are read-only in UI —
   replicate for any machine-written financial rows.
5. **AI cost discipline**: versioned caching and saved runs inspire P9,
   but private prompts/results must remain workspace/access-scoped (PLAN C6).
   Never replicate the reference global cache indiscriminately.
6. **Availability**: app install state + permissions + verified readiness;
   kill-switches are containment, not install or data-retention policy. Do not
   inherit reference default-ON behavior.

## 5. What NOT to port

- Convex/WorkOS/tRPC stacks; per-app Vercel frontends; the two-backend
  split (Twenty is one backend — simpler).
- Bureau's "Warm Paper" design system — keep Twenty tokens/twenty-ui.
- `flux_databases` — replaced by metadata engine.
- Mobile clients — future roadmap only.
