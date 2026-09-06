# Report 02 — Reference Apps Analysis (Texxel/Bureau + A2EMoney)

> What we are porting, where it comes from, and what maps to what in A2E Suite.
> Texxel (aka "Bureau") lives at `../Texxel` relative to this workspace.
> A2EMoney (Bilan) is cloned at `/tmp/A2EMoney` (re-clone with
> `git clone --depth 1 https://github.com/maxx-abrt/A2EMoney /tmp/A2EMoney`
> if missing) — treat both as the source of truth.

## 1. Bureau (Texxel) in one paragraph

A connected workspace ("second brain") built on Next.js 16 + Convex + WorkOS
with web and Expo mobile clients. Documents, tasks, projects, calendar,
databases, chat, files and accounting share one identity, one workspace graph
and one real-time backend. Its stated goal is identical to ours: "the apps you
use every day should feel like one product, not five."

## 2. Bureau feature inventory → A2E Suite mapping

Verified against `../Texxel/apps/web/convex/schema.ts` (978 lines, read in
full) — table names below are the real Convex tables.

| Bureau feature (real tables) | A2E Suite target | Overlap with Twenty today |
|---|---|---|
| Documents: `flux_documents` (nested tree, BlockNote JSON, icon, cover + coverY crop, isArchived, isPublished, allowGuestEdit, order + fractional `sortKey`, shareToken, visibility workspace/private/custom + accessUserIds, isFolder, AES-GCM passphrase lock: salt/iv/hint), `flux_documentVersions`, `flux_presence` + `flux_guestPresence`, `flux_comments` + `flux_commentThreads` (anchorFrom/To, referenceText) + `flux_commentMessages` (reactions), `flux_fonts` + `flux_documentStyles` (font/size/lineHeight/pageSize/margins/header/footer), `flux_docTemplates`, `flux_favorites`, `flux_tags`/`flux_documentTags` | **P3 Documents app** | `note` object, blocknote-editor, noteTargets, PDF export, favorites |
| Tasks: shared `tasks` table (projectId, parentId subtasks, status string, assignee, dueDate, blockedBy[], estimation, startDate, number for PRJ-42 ids) + `flux_taskMeta` sidecar (priority, labels, order, estimateMinutes, color), `flux_taskComments`, `flux_taskBin` (7-day trash + cron), `flux_taskStatuses` (custom kanban columns: key/label/color/order/isDone), `flux_labels`, `flux_timeEntries` (task and/or project, minutes, spentAt) | **P4 Projects & Tasks 2.0** | `task` object + taskTargets; no statuses/deps/subtasks |
| Projects: `projects` (client, status planning/active/completed/on_hold, targetDate, key, nextTaskNumber) + `flux_projectMembers` (lead/member) | P4 | none |
| Calendar: `flux_events` (full recurrence: freq/interval/daysOfWeek/monthlyPosition first..last/endAfterN/until/exceptions[], color, location, projectId, taskId, reminders[] minutes) | enhance existing calendar module | calendar module exists; recurrence is provider-side |
| Databases: `flux_databases` (columns JSON, viewType table/gallery/kanban/calendar, viewConfig) + `flux_databaseRows` | **Not ported** — Twenty's metadata engine IS this | complete overlap |
| Chat: `flux_chatChannels` (workspace/project/custom, public/private, postPermission all/admin/moderator, archived), `flux_channelMembers` (viewer/poster/moderator), `flux_chatMessages` (attachments, mentionedUserIds, mentionedEntities {type,id,name}, parentId threads, editedAt/deletedAt), `flux_chatReactions`, `flux_chatUserReads` (lastReadAt, lastMessageId) | **P5 Live Chat** | none |
| Roles & teams: `flux_roles` (Discord-style, name/color/permissions[]/isDefault/order), `flux_roleAssignments`, `flux_teams` (memberIds; @team mentions notify all) | P4/P8 — Twenty has roles; add custom roles + teams on top if gap confirmed | workspace roles exist |
| Prefs: `flux_userPrefs` (locale, theme, accentColor, density, easyRead, tabs[], commandHistory frecency, shortcuts overrides, quietHours {enabled,start,end}) | P2 workbench (tabs, frecency) + P8 (quiet hours) | partial |
| Notifications: shared `notifications` (type/title/message/body/read/link/metadata/relatedId) | P8 | timelineActivities exist |

## 3. A2EMoney (Bilan) full domain — verified at `/tmp/A2EMoney`

Schema read in full (`convex/schema.ts`) + `lib/fiche-templates.ts` (all 8
templates) + app routes. **This is the finance backbone to replicate.**

### 3.1 Core finance tables

- `projects` — enriched with `budget` (amount) + `spent` (rolled-up). **Port:
  budget/spent fields on our P4 project object, fed by P7.**
- `a2e_invoices` — number, client (+ `linkedClientId` → contacts), email,
  address, items[{id, description, quantity, unitPrice}], status draft/sent/
  paid/overdue/cancelled, issueDate/dueDate/paidDate, notes, linkedDocuments
  (→ drive), attachments display-cache, linkedBookEntries, taxRate,
  currency, projectId. **Port P7: invoice + invoiceLine objects.**
- `a2e_expenses` — description, amount, category, date, paymentMethod, type
  expense|income, linkedInvoice, linkedBookEntries,
  **linkedSubventionSavedId**, isRecurring + recurringFrequency weekly/
  monthly/yearly, tags, currency, sheetId, projectId. **Port P7.**
- `a2e_bookSheets` ("Livre") — name/icon/color/type, columns[{id, name, type,
  width, options[], formula, required, linkedType, **managed**}],
  isTemplate, **systemKey "bilan.default.ledger" + isDefault + locked**: the
  auto-journal every expense/income writes into, undeletable, managed
  columns. **Port P7 verbatim concept: system ledger sheet.**
- `a2e_bookEntries` — sheetId, cells, linkedDocuments/attachments,
  linkedExpenses/linkedInvoices/linkedProjectId, **auto + sourceKind +
  sourceId provenance for machine rows**. **Port P7.**
- `a2e_budgets` — name, amount, spent, category, period monthly|yearly|
  custom, startDate/endDate, color, currency. **Port P7: budget object +
  tracking (spent = live rollup of expenses in period/category).**
- `a2e_categories` — name/icon/color, type expense|income|both, archived.

### 3.2 Org identity & compliance

- `a2e_orgProfile` — ONE row per workspace: legalName, shortName, objet,
  **rna, siret**, address/postalCode/city, email/phone/website,
  representativeName/Role, **iban + bic encrypted at rest (AES-256-GCM)**,
  rupRecognized, fiscalRegime, structureKind (association/entreprise),
  projectSummary, headcount. Pre-fills every fiche. **Port P7: workspace
  finance profile (encrypt IBAN/BIC via twenty-server secret-encryption).**
- GDPR: `a2e_consents`, `a2e_dataRequests`, `gdpr.ts` — **port P7-lite:
  consent log + data export request objects.**
- `a2e_directory` + `security.ts` — member directory + security posture.

### 3.3 Fiches — templated official documents (the gem)

`a2e_fiches`: projectId, **template key**, title, subtitle, `data` (free JSON
matching template schema), status draft/submitted/approved/archived, locale.
`lib/fiche-templates.ts` defines **8 templates** (defaultTitle + defaultData
with full French official structure):

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

Rendered by `components/fiches/document-editors.tsx` (749 lines, typed
per-template editors) and exported via `lib/fiche-pdf.ts` (332 lines).
Also present: `components/cerfa-15059/` + `lib/cerfa-15059/` +
`cerfa-15059-fields.csv` — **CERFA 15059** (reçu fiscal) fill/print support.
**Port P7: fiche object + template registry in twenty-shared or the app +
typed editors as front components + PDF export.**

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
- `a2e_subventionRuns` — saved AI matching runs (prompt, profile, results,
  model, cacheKey) for history + zero-token re-open.
- `a2e_aiCache` — **global LLM cache keyed sha256(kind+model+payload+
  catalogVersion)** with hits counter.

**Port P7 (as Subventions module): instance-scoped catalogue tables +
ingest job (daily cron via message-queue) + workspace-side saved/runs +
AI scoring wired to P9 registry. This is a flagship differentiator — keep
it first-class.**

### 3.5 UI surface (routes under `/dashboard`)

activity, book + book/[id], budget, clients, documents, expenses, fiches +
fiches/[id], invoices, legal, projects + projects/[id], reports, settings,
subventions, team. Components of note: command-palette, notifications-
dropdown, workspace-switcher, feature-bento, charts, attachments-field,
empty-state, consent-banner. **Port: these become Twenty pages/views in the
accounting app — finance nav folder + record pages.**

## 4. Architectural lessons (from both repos' guides)

1. **"What lives where" test** — cross-app readable → core/shared; app-shaped
   → app. We adapt: shared = standard objects + workspace-level services;
   app = SDK objects.
2. **Additive-only law** — never rename/remove shared fields. Matches our
   upgrade-command rules.
3. **Huly's four pillars** (Texxel UPGRADE-PLAN §0): predictable chrome,
   addressable objects, density discipline, real-time default.
4. **Auto-journal pattern** (A2EMoney): system-managed rows carry
   provenance (`auto`, sourceKind/sourceId) and are read-only in UI —
   replicate for any machine-written financial rows.
5. **AI cost discipline** (A2EMoney): global LLM cache keyed by content
   hash + catalog version; saved runs — replicate in P9 for subvention
   matching and other expensive AI calls.
6. **Flag-gated modules defaulting ON** with env kill-switches.

## 5. What NOT to port

- Convex/WorkOS/tRPC stacks; per-app Vercel frontends; the two-backend
  split (Twenty is one backend — simpler).
- Bureau's "Warm Paper" design system — keep Twenty tokens/twenty-ui.
- `flux_databases` — replaced by metadata engine.
- Mobile clients — future roadmap only.
