# Bilan — AI Handoff & Developer Guide

> **Read this first.** It explains the app, how to run/login inside the Emergent
> preview, what has been done, what is in progress, and what remains — so you
> don't waste time/credits rediscovering the setup.

---

## 1. What this app is

**Bilan** is the finance / treasury app of the **A2E suite** (rebranded from the
old name "A2EMoney"). It targets **French non-profits (associations) and small
companies**: bookkeeping sheets, expenses, invoices, budgets, projects,
documents, and **legally-grounded French documents** (CERFA, reçus fiscaux,
budgets prévisionnels, conventions, rapports d'activité).

- **Repo:** `github.com/maxx-abrt/A2EMoney` (branch **`main`**)
- **Live prod:** deploys to **Vercel** (`SITE_URL=https://a2e-money.vercel.app`, target domain `a2e.app`)
- **Brand accent:** `#8590C8` (lavender). Font: **Plus Jakarta Sans**. Icons: **iconsax Bulk** everywhere (via `components/iconsax.tsx`, which forces `variant="Bulk"`).

### Tech stack (NOT the default Emergent FARM template)
| Layer | Tech |
|---|---|
| Framework | **Next.js 15** (App Router, RSC, Server Actions) |
| Backend/DB | **Convex** (cloud, realtime) — deployment `academic-stoat-784` |
| Auth | **WorkOS AuthKit** (`@workos-inc/authkit-nextjs`) + Convex JWT validation |
| File storage | **Backblaze B2** (S3-compatible) |
| i18n | **next-intl** (`fr` default, `en`) — strings in `messages/{fr,en}.json` |
| UI | Tailwind v4 + shadcn/ui (`components/ui/*`), jsPDF for documents |

> ⚠️ There is **NO FastAPI backend**. Convex cloud is the backend, exercised
> entirely through the browser. The `/app/backend` FastAPI template is unused.

---

## 2. How it runs inside Emergent (critical)

The Next.js repo lives at **`/app/frontend`**. Supervisor runs `yarn start`
there, and `package.json`'s `start` = `next dev -H 0.0.0.0 -p 3000`. So the
Next.js dev server **is** the Emergent "frontend" service.

- **Preview URL:** `https://finance-bilan.preview.emergentagent.com`
- **Restart:** `supervisorctl restart frontend`
- **Logs:** `tail -n 80 /var/log/supervisor/frontend.*.log`
- **Ingress:** routes `/api/*` → (unused) port 8001, everything else → 3000.
  The app has **no** `/api` routes (WorkOS callback is at `/callback`), so no conflict.

### ⚠️ Gotcha #1 — Next.js Server Actions CSRF behind the ingress
The browser `Origin` is a **multi-label cluster host**
(`finance-bilan.cluster-5.preview.emergentcf.cloud`) while `x-forwarded-host` is
the public domain. Next.js rejects Server Actions ("Invalid Server Actions
request") unless the origin is allow-listed. **Fixed** in `next.config.mjs` using
Next's recursive wildcard:
```js
allowedDevOrigins: ["**.emergentagent.com", "**.emergentcf.cloud"],
experimental: { serverActions: { allowedOrigins: ["**.emergentagent.com", "**.emergentcf.cloud", "localhost:3000"] } }
```
If auth silently fails / dashboard bounces to `/sign-in`, check this first.
Changing `next.config.mjs` requires `supervisorctl restart frontend`.

### ⚠️ Gotcha #2 — Convex needs WorkOS env for JWT validation
`convex/auth.config.ts` validates WorkOS JWTs using `process.env.WORKOS_CLIENT_ID`.
These are set **on the Convex deployment** (already done):
`WORKOS_CLIENT_ID`, `WORKOS_API_KEY`. After editing `convex/` you must
**redeploy** for auth config to take effect (see §4).

---

## 3. How to LOGIN (dev / testing) — do NOT use hosted WorkOS here

Real WorkOS hosted login **won't work in the preview** (the preview `/callback`
redirect URI is not whitelisted in the WorkOS dashboard). Instead use the
**dev-login bypass** (guarded by `ALLOW_DEV_LOGIN=true` in `.env.local`):

```
https://finance-bilan.preview.emergentagent.com/dev-login?email=qa.tester@a2emoney.app&password=A2eMoney!Test2025
```

This authenticates a real WorkOS user via password grant, sets the `wos-session`
cookie, and redirects to `/dashboard`. The QA user already exists in WorkOS and
has a workspace named **"Association 2E"**.

- Route: `app/dev-login/route.ts`. If the QA user is missing, recreate it:
  `POST https://api.workos.com/user_management/users` with `Authorization: Bearer $WORKOS_API_KEY` and body `{email, password, email_verified:true}`.
- **Before deploying to prod:** set `ALLOW_DEV_LOGIN=false` (or remove the route) and add the prod `/callback` URL to the WorkOS dashboard redirect URIs.

### Testing agent notes
- Always authenticate via the **dev-login URL** above (never hosted login).
- shadcn `<Input>` has **no explicit `type="text"`** → don't select with
  `input[type='text']`; use `data-testid`s instead.
- **Skip** file-upload drag-and-drop, camera, and voice tests.
- A recurring dev-only console warning `Failed to get WorkOS access token: Failed to fetch` is **non-blocking** (aborted Server-Action fetches during navigation); auth persists and Convex mutations succeed.

---

## 4. Convex workflow (the backend)

Deployment: **`academic-stoat-784`** (prod, EU). Use it directly. **Schema
changes MUST be additive** (new optional fields / new tables) — do not delete or
retype existing fields; there is live data (don't seed/truncate).

```bash
cd /app/frontend
export CONVEX_DEPLOY_KEY="<in .env.local>"
npx convex deploy -y            # push schema + functions (typechecks convex/)
npx convex env list             # inspect deployment env vars
npx convex env set KEY value    # set a deployment env var
```
- Generated client lives in `convex/_generated/` (committed). `npx convex deploy` regenerates it.
- Data model: `convex/schema.ts`. **App tables are prefixed `a2e_`** (e.g. `a2e_expenses`, `a2e_bookSheets`, `a2e_fiches`, `a2e_budgets`, `a2e_documents`, `a2e_grantReports`, `a2e_orgProfile`). Shared suite tables: `workspaces`, `memberships`, `users`, `activities`, `projects`, `invoices`, `clients`, invitations.
- Every mutation/query enforces membership via `assertWorkspaceMember(ctx, workspaceId[, role])` in `convex/lib/auth.ts` and logs via `logActivity`. Follow this pattern for new functions.

---

## 5. Secrets & env

- **`.env.local`** (gitignored — NEVER commit): WorkOS keys, `CONVEX_DEPLOY_KEY`, `WORKOS_COOKIE_PASSWORD`, `WORKOS_REDIRECT_URI`, `ALLOW_DEV_LOGIN=true`, Backblaze `B2_*`.
- **`.env`** (already tracked by the repo owner — left untouched): contains Convex URL etc. Don't add new secrets to tracked files.
- `NEXT_PUBLIC_CONVEX_URL` = `https://academic-stoat-784.eu-west-1.convex.cloud`.
- Never modify env values the platform manages; never echo/log real secrets.

---

## 6. Design system (already implemented)

Single source of truth: **`app/globals.css`** (warm-paper "Texxel/Flux" family).
- Tokens for **light + dark**; accent `--primary: #8590C8`; `--radius: 0.9rem`.
- Utilities: `tx-card`, `tx-card-hover`, `tx-pill`, `bento-tile`, `tile-purple/lime/ink` (re-mapped to lavender/mint/ink), `glass`, `text-gradient-brand`, elevations `--elev-1/2/3`, motion `animate-fade-*`.
- Legacy brand vars remapped so old pages stay coherent: `--brand-purple`→primary, `--brand-green`→emerald `#3fa780`.
- Fonts wired in `app/layout.tsx` (`--font-jakarta`, `--font-jetbrains-mono` for numbers via `.font-numeric`).
- Brand logo: **`components/bilan-logo.tsx`** (`<BilanMark/>`, `<BilanWordmark/>`) — lavender puzzle piece with a Σ.
- Primitives updated to soft 1px borders + soft shadows: `components/ui/{button,badge,card}.tsx`, `components/glass-card.tsx`.

**Rule:** don't invent new palettes. Use tokens / existing utilities. Keep it clean, minimal, mobile-first, responsive.

---

## 7. Document engine (how legal docs work)

Documents are **"fiches"** — a template-driven system already wired end to end:

1. **Registry:** `lib/fiche-templates.ts` → `FICHE_TEMPLATES[id] = { i18nKey, defaultTitle, defaultData }`.
2. **Editor:** `components/fiches/document-editors.tsx` exports a React editor per template (reuses local `Section`/`Field`/`Check`/`Pill` helpers).
3. **Route wiring:** `app/dashboard/fiches/[id]/page.tsx` switches on `fiche.template` to render the editor (autosaves `data` to Convex `a2e_fiches`).
4. **PDF dispatch:** `lib/fiche-pdf.ts` `exportFicheToPdf({template,title,data,locale})` lazy-imports the right generator.
5. **Generators:** `lib/documents/*.ts` — each exports `XXX_DEFAULT` + `generateXXXPdf(data, fileTitle)`.
6. **i18n:** names/descriptions under `pages.fiches.templates.<id>.{name,description}` in `messages/{fr,en}.json`.

**Shared PDF kit:** `lib/documents/pdf-kit.ts` — `createPdf()` returns a builder
with brand header, `section`, `kv`, `para`, `bullet`, `checkbox`, `budgetTable`,
`signature`, `divider`, `finish(note, filename)`. **Use it for all new docs** so
they look consistent and on-brand.

**Org profile (auto-prefill):** `convex/a2e_org.ts` (`get`/`upsert`) + table
`a2e_orgProfile`. Stores association legal identity ONCE (legalName, RNA, SIRET,
address, representative, IBAN…) and is meant to auto-prefill every legal document.

### Legal reference (verified, FR associations)
- **Request:** CERFA **12156*06** (dossier de demande de subvention, décret 2016-1971) + budget prévisionnel équilibré + **attestation sur l'honneur** + Contrat d'engagement républicain.
- **Agreement:** **convention de subvention** obligatory when a single public funder pays **> 23 000 €/year** (décret 2001-495).
- **Report (after grant):** CERFA **15059*02** (compte rendu financier) within **6 months** of exercise close + **rapport d'activité** + comptes annuels approuvés (arrêté 11/10/2006). One CERFA 15059 **per action**.
- **Donations:** reçu fiscal CERFA **11580** (art. 200 / 238 bis / 978 CGI).

---

## 8. STATUS — what's done vs. in progress vs. TODO

### ✅ Done (committed `82a8561` on `main`)
- App runs in preview; full auth chain verified (WorkOS → Convex → provisioning → workspace).
- Full redesign to Bilan (#8590C8 warm-paper, Plus Jakarta Sans, soft cards, dark mode).
- Rebrand A2EMoney → Bilan everywhere (UI, metadata, messages, PDFs). `a2e_` table prefix intentionally kept.
- Smart Sheets custom-column management (add/rename/type/options/required/delete) in `app/dashboard/book/[id]/page.tsx`.
- Expenses form `data-testid`s; verified expense create + totals.
- Fixed Server-Actions CSRF; set WorkOS env on Convex; created QA user.

### 🚧 In progress (NOT yet committed) — new legal documents
Files **already written** (present in working tree):
- `lib/documents/pdf-kit.ts` (shared kit) ✔
- `convex/a2e_org.ts` (org profile get/upsert) ✔
- `lib/documents/demande-subvention.ts` (CERFA 12156) ✔
- `lib/documents/convention-subvention.ts` ✔
- `lib/documents/rapport-activite.ts` ✔
- `lib/documents/attestation-honneur.ts` ✔

**Remaining wiring to make them appear/work (do these next):**
1. **`convex/schema.ts`** — add additive table:
   `a2e_orgProfile` (workspaceId + identity fields, `by_workspace` index). Then `npx convex deploy -y`.
2. **`lib/fiche-templates.ts`** — add 4 template entries: `demande_subvention`, `convention_subvention`, `rapport_activite`, `attestation_honneur` (with `defaultData` = each generator's `*_DEFAULT`).
3. **`components/fiches/document-editors.tsx`** — add 4 editors (`DemandeSubventionEditor`, `ConventionEditor`, `RapportActiviteEditor`, `AttestationEditor`).
4. **`app/dashboard/fiches/[id]/page.tsx`** — import + add 4 `else if (fiche.template === …)` branches.
5. **`lib/fiche-pdf.ts`** — add 4 dispatch branches (lazy import each `generateXXXPdf`).
6. **`messages/fr.json` + `messages/en.json`** — add `pages.fiches.templates.<id>.{name,description}` for the 4 (+ any editor labels).
7. **`app/dashboard/fiches/page.tsx`** — (a) group the template picker into "Documents de subvention / légaux" vs "Autres", add a "legally required" badge; (b) on create, fetch `api.a2e_org.get` and merge org identity into the new fiche `data` (auto-prefill).
8. **`app/dashboard/settings/page.tsx`** — add an **"Organisation"** card (form) bound to `api.a2e_org.get`/`upsert`.
9. **`lib/documents/budget-equilibre.ts`** — recolor PDF (currently old `#7c5cff`/lime) to Bilan palette, ideally refactor onto `pdf-kit`.
10. Deploy Convex, run `testing_agent_v3` (dev-login) on the new docs, fix, then **commit + push**.

### 📋 TODO / future ideas (not started)
- Deeper **auto-linking UI**: pick/attach expenses ↔ sheet entries ↔ documents (schema already has `linkedExpenses/linkedDocuments/linkedInvoices` on `a2e_bookEntries`).
- **Budget "à l'équilibre" assistant** that pulls real expense/income data to prefill charges/produits.
- One-click **"dossier de subvention" bundle** (zip/merged PDF: demande + budget + attestation + RIB placeholder).
- Reports page export presets (PDF/ръ; currently CSV/XLSX/JSON exist).
- Comptes annuels (bilan + compte de résultat) generator.
- Disable dev-login + configure WorkOS redirect URIs for prod before deploy.

---

## 9. Working efficiently (save time/credits)

- **Don't rebuild** — features mostly exist; extend the existing engines (fiches, sheets, expenses) rather than starting over.
- **Batch file writes** (`bulk_file_writer`) and **parallelize** independent reads/edits.
- Verify routes compile fast: `for r in / /dashboard /dashboard/fiches; do curl -s -o /dev/null -w "$r %{http_code}\n" --max-time 45 localhost:3000$r; done`.
- Next.js **ignores TS build errors** in dev (`next.config` `typescript.ignoreBuildErrors`), so unused imports won't crash — but keep code clean.
- After `convex/` edits: `npx convex deploy -y`. After `.env`/`next.config` edits: `supervisorctl restart frontend`. CSS/TSX hot-reload automatically.
- Commit style: work in `/app/frontend` (its own git repo, remote has PAT). `git config user.email maxaubert17@gmail.com`, push to `main`. `.env.local` is gitignored.
- Screenshots: use the QA dev-login URL; note that low-quality (q≤25) screenshots make Plus Jakarta thin spaces look collapsed — that's an artifact, not a bug.

---

## 10. Key paths quick-map
```
app/globals.css                      Design tokens (light+dark)
app/layout.tsx                       Fonts + metadata
app/page.tsx                         Public landing
app/dashboard/layout.tsx             Sidebar + shell (workspace switcher, storage, theme)
app/dashboard/book/[id]/page.tsx     Smart Sheet editor (custom columns)
app/dashboard/expenses/page.tsx      Expenses + S3 receipt attachments
app/dashboard/fiches/*               Documents (template engine)
app/dashboard/{budget,reports,projects,invoices,documents,team,activity,settings,legal}
components/iconsax.tsx               iconsax proxy (forces Bulk)
components/bilan-logo.tsx            Brand mark/wordmark
components/fiches/document-editors.tsx  Per-template editors
components/ui/*                      shadcn primitives (restyled)
lib/documents/*                      PDF generators + pdf-kit
lib/fiche-templates.ts               Template registry
lib/fiche-pdf.ts                     PDF dispatch
convex/schema.ts                     Data model (a2e_* tables)
convex/a2e_*.ts                      App queries/mutations
convex/auth.config.ts                WorkOS JWT validation
middleware.ts                        authkitMiddleware
next.config.mjs                      allowedOrigins (CSRF fix), i18n plugin
app/dev-login/route.ts               DEV auth bypass (ALLOW_DEV_LOGIN)
```
