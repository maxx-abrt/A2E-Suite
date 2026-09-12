# A2E Suite — App Integration Guide

How to build, modify, or extend an app on the A2E shared platform. Read this fully before writing a line of code. Everything here is contractual: deviating from it breaks the suite.

> Audience: AI agents (e.g. emergent.sh) and developers building or modifying a suite app (Bilan, Bureau/Thread, Drive, Forms, CRM, or app N+1), or evolving the shared core itself.

---

## 0. MEGA BRIEF — the whole platform on one page

**What A2E is:** a suite of independent apps (web + mobile) that share one backend "core" so a user's identity, workspaces, files, calendar, tasks, contacts, and notifications are the same everywhere. Each app keeps its own repo, its own database, its own deployment — they only *share data* through the core.

**The 5 facts that explain everything:**

1. **One core, many apps.** Core is a standalone [Convex](https://convex.dev) backend (repo `A2E Core`, deployment `superb-grasshopper-152`). Every app also has its *own* Convex backend for its own domain data. Two backends per app, one login.
2. **One login, one identity.** All apps use WorkOS AuthKit in the *same WorkOS environment* but each with its *own WorkOS application* (own client id). WorkOS user ids are environment-scoped, so the same person has the same `sub` everywhere → core maps `sub` → one core user → shared data. No token exchange, no re-login.
3. **Apps never touch core's database directly.** They consume the npm package **`@a2e/core`** (typed React hooks + a second Convex client). Server-to-server needs go through the secret-gated **service bridge** (`sync:*` functions on core, §12.1).
4. **The core schema is additive-only.** Fields/tables are only ever *added*, never renamed or removed — so apps pin a package version and upgrade deliberately, and old apps never break.
5. **Workspaces are the scope of everything.** Every shared record belongs to a workspace. The active workspace is shared across apps (same ids, same localStorage key), so switching in one app switches everywhere.

**The repos and what's live today (July 2026):**

| Repo (path under `~/Dev/`) | App | Stack | Own Convex deployment | Core adoption |
|---|---|---|---|---|
| `A2E Core` | Core backend + `@a2e/core` package | Convex only, **no frontend** | `superb-grasshopper-152` (prod, eu-west-1) | — |
| `A2EMoney` | **Bilan** (finance) | Next.js on Vercel | dev `fortunate-squirrel-301`, prod `academic-stoat-784` | **Pattern A** (full cutover) — done |
| `A2E Thread Final` | **Bureau / Thread** (workspace: chat, projects, docs) | pnpm monorepo: `apps/web` Next.js + `apps/mobile` Expo | `veracious-reindeer-573` (prod) | **Pattern B** (linked mirror) — done, web + mobile |

**Hosting model:** Vercel hosts *frontends only*. Convex Cloud hosts *all backends* (core + each app's). Mobile ships via EAS. **A2E Core itself is never deployed to Vercel** — it has no UI; `npx convex deploy` pushes it to Convex Cloud, and the `@a2e/core` package is bundled into each app at build time.

**If you are an AI builder asked to "create a new A2E app"**: go to §13 — there is a complete, copy-pasteable brief.

**If you are asked to "add something to the shared data"** (new shared table/field/capability): go to §6 — core evolution workflow.

**If you are asked to work on Bilan or Bureau**: read §12 for exactly how each is wired and which files matter.

---

## 1. The mental model

```
┌────────────────────────── YOUR APP ──────────────────────────┐
│  Own repo · own Vercel project · own Convex deployment       │
│  Own tables (prefixed, e.g. forms_forms, forms_submissions)  │
│                                                              │
│  @a2e/core package                                           │
│   ├─ <CoreProvider>     ── second ConvexReactClient ──┐      │
│   ├─ <WorkspaceProvider> (active workspace, shared)   │      │
│   └─ hooks: useUpload, useEvents, useTasks, …         │      │
└───────────────────────────────────────────────────────┼──────┘
                                                        │
        one WorkOS token validates on both deployments  ▼
┌──────────────────────── A2E CORE ────────────────────────────┐
│  Standalone Convex deployment (repo: A2E Core)               │
│  users · workspaces · memberships · invitations · roles      │
│  plans/entitlements/usage · drive (Backblaze B2) · events    │
│  tasks · contacts · notifications · activities · comments    │
│  links · intents · shares · search · presence · prefs        │
└──────────────────────────────────────────────────────────────┘
```

- **Your app owns**: its UI, its routes, its app-specific tables and Convex functions, its Vercel project, its mobile app (if any).
- **Core owns**: anything that must be identical across apps. If two apps could ever want the same record, it belongs in core.
- **Auth**: one WorkOS **environment** for the whole suite, but **each app keeps its own WorkOS application** (own client id, redirects, branding). Core trusts every suite app's issuer; your token validates on both deployments — no bridging, no re-login. Same person = same `sub` = same core user everywhere (see §2 Step 3).
- **Data residency rule of thumb**: a record lives in core if another app could reasonably read it (a file, an event, a contact, a task, a notification). It lives in your app if it's your domain (an invoice, a chat message, a form definition) — and you *link* it to core entities by string id or via the `links` module.

---

## 2. Setup in 5 steps

### Step 1 — Install

Current package version: **`@a2e/core@0.2.0`** — always pin an exact version
(see `packages/core/CHANGELOG.md` for what each version changes).

```jsonc
// package.json — production / CI
"dependencies": {
  "@a2e/core": "github:<org>/A2ECore#v0.2.0",  // ALWAYS pin a version tag
  "convex": "^1.30.0"
}
```

```jsonc
// package.json — local development against a checked-out A2ECore repo
"dependencies": {
  "@a2e/core": "link:../A2E Core/packages/core",
  "convex": "^1.30.0"
}
```

The package ships **source TypeScript** (`"main": "./src/index.ts"`) — no build
step; your bundler compiles it. Peer deps: `convex ^1.30.0`, `react >=18`.
Expo/Metro consumers: add the linked package path to
`watchFolders` + `resolver.nodeModulesPaths` in `metro.config.js` (see Bureau's
`apps/mobile/metro.config.js`).

### Step 2 — Environment variables

```bash
# .env.local (+ Vercel, per environment)
NEXT_PUBLIC_CONVEX_URL=...            # YOUR app's deployment (existing)
NEXT_PUBLIC_CONVEX_CORE_URL=...       # the CORE deployment (dev/staging/prod)
WORKOS_CLIENT_ID=client_...           # YOUR app's WorkOS application client id
WORKOS_API_KEY=...                    # server-side only
WORKOS_COOKIE_PASSWORD=...            # ≥ 32 chars, per app
```

Core Convex env vars (`WORKOS_CLIENT_ID`, `WORKOS_SUITE_CLIENT_IDS`, `B2_*`)
live on the core deployment — you never touch them. To register YOUR app as a
trusted suite issuer, hand your `WORKOS_CLIENT_ID` to whoever operates core
(one `npx convex env set` + redeploy on their side, zero code change).

Only needed if your backend uses the §12.1 service bridge (Pattern A/B apps):

```bash
# on YOUR app's Convex deployment (npx convex env set — server-side, no NEXT_PUBLIC_)
A2E_SERVICE_SECRET=<shared secret>      # same value as on core
CONVEX_CORE_URL=https://superb-grasshopper-152.eu-west-1.convex.cloud
```

### Step 3 — Auth config (multi-app model)

Each suite app keeps **its own WorkOS application** (own `client_id`, redirect
URIs, branding) inside the **same WorkOS environment**. Core trusts every suite
app's issuer; your own backend trusts only yours.

Identity is unified because WorkOS user ids (`sub`) are scoped to the
*environment*, not to an application — the same person has the same `sub` from
Bilan, Bureau, or any future app. Core links users via
`authIdentities.workosId = identity.subject`, so one human = one core user =
shared workspaces/data across apps.

**On core** (already configured): `WORKOS_CLIENT_ID` (primary app client),
`WORKOS_ISSUER_CLIENT_ID` (environment issuer), and
`WORKOS_SUITE_CLIENT_IDS` — comma-separated client ids of every other suite
app whose tokens core must accept (currently includes Bilan and Bureau).
Redeploy core after changing it.

**On your app's own Convex deployment** — trust only your app:

```ts
const clientId = process.env.WORKOS_CLIENT_ID; // YOUR app's client id

export default {
  providers: [
    {
      type: "customJwt",
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: "RS256",
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
  ],
};
```

Your app passes its own WorkOS access token straight to `<CoreProvider
fetchToken={…}>` — no token exchange, no shared client. Onboarding a new suite
app = add its client id to `WORKOS_SUITE_CLIENT_IDS` on core, nothing else.

**Workspaces/teams live in A2E Core, not in WorkOS.** Do not adopt WorkOS
Organizations (or its membership/invitation APIs) as the workspace store — the
suite's workspace graph (roles, quotas, drive, cross-app links) is core's
schema, read via `@a2e/core` hooks and the §12.1 service bridge. WorkOS features
may be used adjacently (AuthKit, Directory Sync, MFA); if a requirement
genuinely needs WorkOS Organizations, open an RFC on A2ECore first.

### Step 4 — Mount providers

```tsx
// app/providers.tsx (Next.js App Router example)
"use client";
import { ConvexClientProvider } from "./ConvexClientProvider"; // your existing one
import { CoreProvider, WorkspaceProvider } from "@a2e/core";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexClientProvider>          {/* your own deployment */}
      <CoreProvider                 {/* the core deployment */}
        fetchToken={getWorkOSToken} /* your AuthKit token getter */}
        routes={{ drive: (id) => `/files/${id}` }}  {/* optional deep-link mapping */}
      >
        <WorkspaceProvider>         {/* shared active-workspace state */}
          {children}
        </WorkspaceProvider>
      </CoreProvider>
    </ConvexClientProvider>
  );
}
```

Order matters: your `ConvexClientProvider` outermost (existing behavior preserved), `CoreProvider` inside it, `WorkspaceProvider` inside that.

### Step 5 — Provision the user

Call `users.store` once after first authentication (the package's `WorkspaceProvider` does this automatically). It creates the core user, and on very first login a personal workspace with free-tier entitlements.

---

## 3. The rules (memorize)

1. **NEVER copy core Convex files into your repo.** Core functions live only in the A2ECore repo. You interact via `@a2e/core` hooks (client) or `makeFunctionReference` against the service bridge (server).
2. **NEVER duplicate shared tables** (`users`, `workspaces`, `memberships`, `tasks`, `events`, `contacts`, `drive_*`, `notifications`, …) in your own schema. Reference core entities by **string id**.
3. **Your tables are prefixed** with your app key: `forms_forms`, `forms_submissions`. Registered app keys (`APP_KEYS` in `@a2e/core`): `"bilan" | "bureau" | "drive" | "forms" | "crm" | "core"`. New keys are registered via PR to A2ECore.
4. **Everything is workspace-scoped.** Every query starts from `useWorkspace().activeWorkspaceId`. Never show cross-workspace data.
5. **Cross-app references go through `links`** (or the `linkedTo` field on drive files/events/tasks) — never by storing foreign table names yourself.
6. **Pin `@a2e/core` versions.** Upgrade deliberately, read the CHANGELOG. Core schema only ever grows (additive-only), so old versions never break.
7. **Quota UX is your job, enforcement is core's.** Core rejects over-quota writes with `QuotaExceededError`. Catch it with `useQuota()` pre-checks and show the upgrade dialog.
8. **Stamp `sourceApp` on everything you create** (drive uploads, events, tasks, contacts) so other apps can filter/attribute.
9. **Server-to-server calls go through the service bridge only** (`convex/sync.ts` on core, §12.1). The `A2E_SERVICE_SECRET` never appears in client code, and client-supplied roles/userIds are never trusted — membership/role changes are always re-derived server-side from the caller's identity or from your own verified data.
10. **Core has no delete for workspaces.** Deleting a shared workspace is a core-side decision; apps archive/hide/delete only their *local copy* (see §12.3).

---

## 4. Shared DB schema reference (what core owns)

This is the complete shared data model (`A2E Core/convex/schema.ts`). All ids are Convex document ids; apps store them as **strings**. Every table is workspace-scoped unless noted. **Additive-only: nothing here is ever renamed or removed.**

### Identity & workspaces
| Table | Key fields | Notes |
|---|---|---|
| `users` | `email, name?, image?, createdAt` | one per human, suite-wide |
| `authIdentities` | `workosId → userId` | maps WorkOS `sub` to core user; idx `by_workos` |
| `workspaces` | `name, slug, description?, avatar?, storageQuota, ownerId, locale?, currency?, type? (individual/business/association)` | **no delete** |
| `memberships` | `userId, workspaceId, role (owner/admin/member/viewer), joinedAt` | the team roster |
| `invitations` | `email, workspaceId, role, token, status (pending/accepted/revoked/expired), invitedBy, expiresAt` | accept via token |
| `activities` | `workspaceId, actorId, action, targetType, targetId, metadata?, sourceApp?` | audit trail, GDPR-exportable |

### Roles & entitlements
| Table | Key fields | Notes |
|---|---|---|
| `roles` | `workspaceId, name, color, permissions[], isDefault?, order` | custom per-workspace roles |
| `roleAssignments` | `workspaceId, userId, roleId, assignedBy?` | |
| `plans` | `key, name, limits, appAccess[]` | plan catalog |
| `workspaceEntitlements` | `workspaceId, planKey, overrides?, stripeCustomerId?` | |
| `usageCounters` | `workspaceId, storageUsed, taskCount, driveFileCount, eventCount, contactCount, formsResponsesThisMonth` | quota accounting |

Plan limits (the `planLimitsValidator` domains): `storageBytes · maxMembers · maxTasks · maxDriveFiles · maxEvents · maxContacts · maxFileUploadBytes · maxCustomRoles · maxFormsResponsesPerMonth` (`-1` = unlimited).

### Drive (files on Backblaze B2)
| Table | Key fields | Notes |
|---|---|---|
| `drive_folders` | `workspaceId, parentId?, name, color?, sourceApp, createdBy` | |
| `drive_files` | `workspaceId, folderId?, name, s3Key, size, contentType?, sourceApp, linkedTo?, deletedAt?, createdBy` | soft delete; search idx on `name`; idx `by_linked` |

### Calendar
| Table | Key fields | Notes |
|---|---|---|
| `events` | `workspaceId, title, start, end?, allDay?, recurrence* (freq/interval/daysOfWeek/monthlyPosition/endAfter/until/exceptions), color?, location?, sourceApp, linkedTo?` | one row per series; expansion client-side |
| `eventAttendees` | `eventId, workspaceId, userId? / email?+name?, status (invited/accepted/declined/tentative)` | |

### Tasks
| Table | Key fields | Notes |
|---|---|---|
| `tasks` | `workspaceId, parentId?, title, status (string!), assigneeId?, dueDate?, priority?, labels[]?, order?, startDate?, estimateMinutes?, sourceApp, linkedTo?, deletedAt?` | subtasks via `parentId`; soft delete |
| `taskStatuses` | `workspaceId, key, label, color, order, isDone?` | auto-seeded todo/in_progress/done |
| `labels` | `workspaceId, name, color` | |

### Contacts (suite People directory)
| Table | Key fields | Notes |
|---|---|---|
| `contacts` | `workspaceId, name, email?, phone?, company?, address?, siret?, notes?, tags[]?, sourceApp` | search idx on `name` |
| `contactLinks` | `workspaceId, contactId, app, type, id` | back-references to app entities |

### Collaboration & platform services
| Table | Key fields | Notes |
|---|---|---|
| `notifications` | `userId (string), workspaceId?, type ("<app>.<event>"), title, message?, read, link?, metadata?, sourceApp?` | the shared bell |
| `comments` | `workspaceId, target {app,type,id}, userId, content, mentionedUserIds[]?, parentId?, resolved?` | mentions auto-notify |
| `links` | `workspaceId, from{App,Type,Id}, to{App,Type,Id}, label?` | N-N cross-app references |
| `intents` | `workspaceId, type ("<app>.<event>"), fromApp, toApps[], payload, status (pending/handled/dismissed), handledBy?` | the cross-app event bus |
| `shares` | `workspaceId, target, token, permission (read/write), expiresAt?, passphraseHash?, revokedAt?` | public links |
| `presence` | `workspaceId, entityType, entityId, userId, state, lastSeen` | 8s heartbeats |
| `userPrefs` | `userId, locale?, theme?, accentColor?, lastWorkspaceId?, notificationsEmail?, notificationsPush?, onboardingCompleted?` | cross-app settings |
| `pushTokens` | `userId, token, platform (ios/android), appKey` | mobile push |

---

## 5. Module cookbook

### 5.1 Workspaces & members

```tsx
const { activeWorkspace, activeWorkspaceId, workspaces, setActiveWorkspaceId, isLoading } = useWorkspace();
// activeWorkspace: { _id, name, slug, role, memberCount, locale, currency, type, storageQuota, ... }
```

- Always gate pages on `isLoading` and `activeWorkspace == null` (prompt to create/select a workspace).
- Members list: `useCoreQuery(coreApi.workspaces.listMembers, { workspaceId })` → hydrated `{_id, name, email, image, role}`.
- Invitations: `coreApi.invitations.invite({workspaceId, email, role})` → `{id, token}`; build the accept URL as `<your-app-origin>/invite/<token>` and render an accept page that calls `invitations.accept({token})`. Roles available: `"admin" | "member" | "viewer"`. Throws `QuotaExceededError("maxMembers")` at plan limit.
- UI gating by permission: `useMyPermissions(workspaceId)` → string array; check e.g. `"drive:manage"`.

### 5.2 Drive (files)

**Upload flow** (presign → PUT → done; metadata row is created atomically by the action):

```
your UI ──▶ useUpload().upload({workspaceId, file, sourceApp:"<yourapp>", linkedTo})
              │
              ├─▶ action drive.presignUpload (auth + quota check; reserves drive_files row)
              ├─▶ XHR PUT file bytes to B2 presigned URL (progress events)
              └─▶ returns { fileId }
```

```tsx
const { upload, isUploading } = useUpload({ onProgress: setPct });
const { fileId } = await upload({
  workspaceId,
  file,
  sourceApp: "forms",
  linkedTo: { app: "forms", type: "submission", id: submissionId },
});

const files = useLinkedFiles(workspaceId, { app: "forms", type: "submission", id: submissionId });
const url = useFileUrl(fileId, "view");      // inline preview (600s presigned, cached 8 min)
const dl = useFileUrl(fileId, "download");   // attachment disposition
```

- Folders: `useFolders`, `useDriveMutations().createFolder/renameFolder/deleteFolder` (delete refuses non-empty).
- Trash: `removeFile` (soft delete, B2 object deleted, 30-day metadata retention) / `restoreFile` / `emptyTrash`.
- **Link files to your entities via `linkedTo`** — that's how the Drive app shows "files linked to this expense/form" and how your app lists them back. For many-files-per-entity, upload each with the same `linkedTo`.
- Quotas enforced server-side: per-file size (`maxFileUploadBytes`), total storage (`storageBytes`), file count (`maxDriveFiles`). Catch `QuotaExceededError`.

### 5.3 Calendar (events)

```tsx
const events = useEvents(workspaceId, { start: rangeStart, end: rangeEnd });
const expanded = expandEvents(events ?? [], rangeStart, rangeEnd); // recurring → instances
const { create, update, remove, rsvp } = useEventMutations();
```

- Full recurrence model: `recurrenceFreq` (none/daily/weekly/monthly), `recurrenceInterval`, `recurrenceDaysOfWeek` (0=Sun..6=Sat), `recurrenceMonthlyPosition` (same_day/first/…/last), `recurrenceEndAfter`, `recurrenceUntil`, `recurrenceExceptions` (epoch ms of skipped instances).
- Expansion is **client-side** (`expandEvents`) — the DB stores one row per series.
- Attendees: pass `attendees: [{userId} | {email, name}]` on create; users RSVP via `rsvp({eventId, status})` (`accepted|declined|tentative`). Perfect for form-driven signups (see intents).
- Link events to your entities: `linkedTo: {app:"forms", type:"form", id}`.

### 5.4 Tasks

```tsx
const tasks = useTasks(workspaceId);          // hydrated w/ assignee, sorted
const statuses = useTaskStatuses(workspaceId); // auto-seeds todo/in_progress/done
const { create, update, setStatus, remove } = useTaskMutations();
```

- `status` is a **string** — built-in keys or workspace-custom statuses (`createStatus`). Never hardcode a closed enum.
- Subtasks via `parentId`; ordering via `order`; `priority` ∈ none/low/medium/high/urgent; `labels` are string arrays (managed via `useLabels`).
- Quota: `maxTasks`. Deleted tasks soft-delete (`deletedAt`) — `restore` available.

### 5.5 Contacts (suite People directory)

```tsx
const contacts = useContacts(workspaceId);
const hits = useContactSearch(workspaceId, "dupont");
await createContact({
  workspaceId, name, email, siret,
  link: { app: "bilan", type: "client", id: clientId }, // optional back-reference
});
const linked = useContactsFor(workspaceId, { app: "bilan", type: "client", id: clientId });
```

- Bilan's clients, Bureau's project contacts, Forms' respondents, CRM's leads all read/write this directory. Deduplicate by email before creating (search first).

### 5.6 Notifications

```tsx
const notifications = useNotifications({ limit: 50 });
const unread = useUnreadCount();
const { markRead, markAllRead, remove, clearAll } = useNotificationMutations();
```

- **Reading is shared**: the bell shows notifications from every app.
- **Sending** (from your app, to the whole workspace): `coreApi.notifications.sendToWorkspace({workspaceId, type:"<yourapp>.<event>", title, message, link})`. `link` must be **your app's absolute path** (e.g. `/forms/abc`) — each app renders its own routes. Prefix `type` with your app key.
- Respect user prefs (`useUserPrefs().notificationsEmail/Push`) — fan-out to email/push is core's job (later phase).

### 5.7 Activities (audit trail)

```tsx
const activities = useActivities(workspaceId, 50); // hydrated w/ actor
```

- Core mutations log automatically. For YOUR app-specific actions, log via your own activities table **or** request a core `activities.log` passthrough — do not insert into core tables through raw clients.
- GDPR export: `coreApi.activities.exportWorkspace({workspaceId})` (owner/admin) covers all core data; combine with your own export for full portability.

### 5.8 Comments (any entity)

```tsx
const comments = useComments(workspaceId, { app: "forms", type: "form", id: formId });
const { add, resolve, remove } = useCommentMutations();
await add({ workspaceId, target, content, mentionedUserIds }); // mentions auto-notify
```

### 5.9 Links (cross-app references)

```tsx
await link({ workspaceId,
  from: { app: "forms", type: "submission", id: subId },
  to:   { app: "bilan", type: "expense",    id: expId },
  label: "Reçu traité comme dépense",
});
const related = useLinks(workspaceId, target, "both");
```

Use for N-N relations between apps' entities. Direction matters: `from` = the thing that triggered, `to` = the thing created/affected.

### 5.10 Intents (cross-app actions, real-time)

The suite's event bus. Producer posts; consumer apps subscribe and react.

```tsx
// PRODUCER (e.g. Forms after a submission):
await postIntent({
  workspaceId,
  type: "forms.submission_received",
  fromApp: "forms",
  toApps: ["bilan"],              // empty array = broadcast to all apps
  payload: { formId, submissionId, mappedFields: { amount: 42.5, label: "…" } },
});

// CONSUMER (e.g. Bilan, mounted once in its dashboard layout):
const pending = usePendingIntents(workspaceId, "bilan");
useEffect(() => {
  for (const intent of pending ?? []) {
    if (intent.type === "forms.submission_received") {
      // create the expense in YOUR deployment with YOUR functions,
      // then: markHandled({ intentId: intent._id, appKey: "bilan" })
      // optionally: link(...) the submission ↔ expense
    }
  }
}, [pending]);
```

- Intent types are namespaced `"<producerApp>.<event>"`. Document new types in your app's README.
- Always `markHandled` (or `dismiss`) — pending intents are visible to the whole workspace.
- Idempotency: re-handling the same intent must not duplicate your entity (check `links` first).

### 5.11 Shares (public links)

```tsx
const { create, revoke } = useShareMutations();
const share = await create({
  workspaceId,
  target: { app: "core", type: "drive_file", id: fileId },  // or your own entity type
  permission: "read",
  expiresAt: Date.now() + 7 * 86400_000,   // optional
  passphrase: "optional",                   // optional
});
// Public URL: https://<your-app>/share/<share.token>
```

- Your public `/share/[token]` page calls `resolveShare(token, passphrase?)` (no auth) → metadata → render. For core drive files, `getSharedFileUrl(token)` streams via a 600s presign.
- For YOUR entity types, `resolveShare` returns the share row; your page then fetches the entity through YOUR public function, gated by the share's validity (never expose raw table reads by id).

### 5.12 Search (federated cmd-K)

```tsx
const results = useCoreSearch(workspaceId, query); // debounced 250 ms
// { files, contacts, events, tasks, members } — each item {id, title, subtitle?, href?}
```

Merge core results with your own app-local search in your command palette. `href`s are generated via the `routes` map you passed to `CoreProvider`.

### 5.13 Entitlements & quotas

```tsx
const ent = useEntitlement(workspaceId);           // { planKey, limits, usage, appAccess }
const storage = useQuota(workspaceId, "storageBytes"); // { allowed, used, limit, percent, upgradeRequired }
const tasks = useQuota(workspaceId, "maxTasks");
```

- **Pre-check** before offering a create/upload action; render your upgrade dialog when `!allowed`.
- Server enforcement still applies — always catch `QuotaExceededError` (`err.domain`, `err.used`, `err.limit`).
- App gating: `ent.appAccess.includes("forms")` — hide/upsell your app when absent.
- Limit sentinel: `-1` = unlimited. Never divide by it.

### 5.14 Presence

```tsx
const viewers = usePresence(workspaceId, { type: "form", id: formId }, "editing");
// heartbeats every 8s while mounted, leave on unmount; returns active hydrated users
```

Use on any screen where "who else is here" adds value.

### 5.15 User preferences

```tsx
const prefs = useUserPrefs();      // locale, theme, accentColor, notificationsEmail/Push, …
const update = useUpdatePrefs();
```

Cross-app settings (locale, theme) should be honored by every app; app-specific settings stay in your own tables.

---

## 6. Evolving the core (adding to the shared DB)

Core is owned by the `A2E Core` repo. **All shared-data changes happen there — never in an app repo.** The workflow, whether you're adding a field, a table, a function, a permission string, an intent type, or an app key:

### 6.1 The additive-only law

- **Allowed**: new tables, new *optional* fields, new indexes, new functions, new optional function args, new permission strings, new app keys, new quota domains (with a matching entry in `planLimitsValidator` + `usageCounters` if counted).
- **Forbidden**: renaming/removing tables, fields, indexes, functions, or required args; tightening a validator; changing a return shape. Apps pin versions of `@a2e/core`, but the *deployed core backend* serves all pins at once — a breaking backend change breaks old apps immediately.
- Need a "rename"? Add the new field, dual-write for one cycle, migrate readers, leave the old field forever (deprecated in comments).

### 6.2 The change workflow (checklist)

1. **Schema** — edit `A2E Core/convex/schema.ts` (strict validation is ON; header comment repeats the additive-only rule).
2. **Functions** — add/modify `convex/<module>.ts`. Mirror the `convex/lib/auth.ts` pattern: every function verifies identity (`ctx.auth.getUserIdentity()`) and workspace membership; quota-checked writes throw `QuotaExceededError`.
3. **Package surface** — update `packages/core/src/`:
   - `types.ts` — mirror any new doc shape (additive-only here too; apps' pinned types must stay valid).
   - `refs.ts` — add string refs (`coreApi.<module>.<fn>`) for new public functions.
   - `<module>.ts` — add the typed hook(s). Re-export from `index.ts`.
   - If bridging server-to-server: add a secret-gated endpoint in `convex/sync.ts` (see §12.1 for the pattern).
4. **Typecheck** — `pnpm -r typecheck` (or `npx tsc -p packages/core --noEmit`).
5. **CHANGELOG** — add an entry under a new version in `packages/core/CHANGELOG.md` (it covers *both* the package and the backend contract).
6. **Bump version** — `packages/core/package.json` → minor for new capabilities, patch for fixes (0.x: minor = features, patch = fixes; majors are for contract breaks, which the additive-only law should make unnecessary).
7. **Deploy core** — `npx convex deploy` from `A2E Core` (pushes to `superb-grasshopper-152`). If you added env vars, `npx convex env set` first.
8. **Tag the release** — commit, then `git tag v0.3.0 && git push --tags` so consumers can pin `github:<org>/A2ECore#v0.3.0`.
9. **Roll out to apps** — each app bumps its pin + `pnpm install` *when ready*. There is no urgency: old pins keep working against the new backend.

### 6.3 Registering a new app key

Add the key to `APP_KEYS` in `packages/core/src/types.ts`, ship it as a minor version, then the new app: (1) pins the new version, (2) gets its WorkOS client id added to `WORKOS_SUITE_CLIENT_IDS` on core, (3) prefixes its own tables with the key, (4) stamps `sourceApp: "<key>"` on everything it creates in core.

### 6.4 Decision test: core table vs app table

Ask: *"Would another suite app ever read or reference this record?"*
- **Yes** (a file, an event, a contact, a shared doc) → core, via §6.2.
- **No** (an invoice line item, a chat message, a form definition) → your app's own deployment, prefixed table, referencing core ids as strings.
- **Unsure** → default to your app + a `links` row to the core entity. Moving app→core later is a migration; moving core→app breaks the additive-only law.

---

## 7. Managing `@a2e/core` across the repos

**What the package is:** the *only* client-side integration surface — `CoreProvider` (a second `ConvexReactClient` pointed at the core deployment, authenticated via your `fetchToken`), `WorkspaceProvider` (shared active-workspace state), typed hooks for every core module, typed errors, and `coreApi` string refs for anything without a dedicated hook. It ships raw TypeScript source; each app's bundler compiles it.

**How each repo consumes it:**

| Mode | Specifier | When |
|---|---|---|
| Local dev | `"@a2e/core": "link:../A2E Core/packages/core"` | sibling checkout; edits hot-reload |
| CI / Vercel / EAS | `"@a2e/core": "github:<org>/A2ECore#v0.2.0"` | always an exact git tag |

**Version policy:**

- The CHANGELOG is the contract diff — read it before every bump.
- Backend deploys and package releases move together (one git tag = one backend contract + one package version).
- Apps upgrade on their own schedule. There is no fleet-wide lockstep deploy.
- Never ship an app pointing at a core deployment whose contract is *older* than the app's pinned package (the app would call functions that don't exist). The reverse (app older than backend) is always safe.
- Mobile note: Metro needs the package reachable — with `link:`, add it to `watchFolders` and `resolver.nodeModulesPaths` (see `A2E Thread Final/apps/mobile/metro.config.js`); with git tags it resolves like any npm dep.
- Mobile storage note: `WorkspaceProvider` persists the active workspace via a `storage` adapter (`WorkspaceStorageAdapter`); on web it defaults to `localStorage` (key `a2e_active_workspace`), on RN pass an AsyncStorage-backed adapter.

**Verify a consumer is healthy after a bump:** typecheck the app, then smoke the happy paths — login, workspace switch, one core read (e.g. notifications), one core write (e.g. a task), one upload.

---

## 8. Mobile (Expo) notes

- Same package, same hooks. Convex React client is RN-compatible.
- **Uploads**: `File` doesn't exist in RN. Get a blob via `fetch(uri).blob()` (expo-file-system assets) and pass it to `useUpload` with explicit `name` + `contentType`.
- `localStorage` doesn't exist — pass a `WorkspaceStorageAdapter` (AsyncStorage) to `WorkspaceProvider`; otherwise it falls back to in-memory.
- Env vars use the `EXPO_PUBLIC_` prefix: `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_CORE_URL`, `EXPO_PUBLIC_WORKOS_CLIENT_ID`. (Bureau's `src/config.ts` shows the fallback pattern.)
- Auth uses the sealed-session handoff pattern (`/api/mobile/auth/start` → deep link `bureau://auth?session=<sealed>` → keychain → token exchange). Reuse Bureau's `apps/web` session routes + `apps/mobile/src/auth/auth-provider.tsx` as the reference implementation; a shared `@a2e/mobile-auth` recipe will be extracted when the second mobile app ships.
- Register push tokens: `coreApi.pushTokens.register({token, platform, appKey})` after Expo permissions granted.

---

## 9. Branding & UX coherence

- Include the **AppSwitcher** (from `@a2e/core-ui` when available; until then a simple menu linking the suite apps' origins) so users can jump between apps.
- Honor `activeWorkspace` everywhere: switching workspace in one app switches it in all (shared localStorage key `a2e_active_workspace` on web; same workspace ids on mobile).
- Use the shared i18n keys for common UI (workspace, drive, notifications) when published; your domain copy stays yours.
- Icons: iconsax (Bulk variant) is the suite standard.

---

## 10. Security checklist

- [ ] Every one of YOUR Convex functions verifies identity (`ctx.auth.getUserIdentity()`) and workspace membership for workspace-scoped data (mirror the core `convex/lib/auth.ts` pattern in your own deployment).
- [ ] Never trust client-sent `userId` — always derive from the JWT.
- [ ] Files only flow through core presigned URLs. Never proxy B2 keys into client code, never build public bucket URLs.
- [ ] Public share pages re-validate the share on every request (expiry/revocation/passphrase).
- [ ] No `A2E_SERVICE_SECRET` / `WORKOS_API_KEY` / B2 credentials in client bundles (`NEXT_PUBLIC_`/`EXPO_PUBLIC_` only for the two Convex URLs + WorkOS client id).
- [ ] Your `auth.config.ts` matches §2 Step 3 exactly — a typo silently logs users out of core.
- [ ] Service-bridge calls (`sync:*`) include the secret read from a server-side env var, and roles sent to `importMembership` come from your own verified records, never from client input.

---

## 11. Testing & releasing

- Develop against the **staging** core (`NEXT_PUBLIC_CONVEX_CORE_URL` of staging); production apps use prod core (`https://superb-grasshopper-152.eu-west-1.convex.cloud`).
- Core-side smoke test after deploying core: `node scripts/verify-auth.mjs` (needs `SMOKE_TOKEN` + `CONVEX_URL`), and `npx convex run sync:workspacesForUser '{"secret":"…","workosId":"…"}'` for the bridge.
- App-side after any core-integration change: login → workspace list appears → switch workspace → create/rename in app A → confirm it appears in app B → reload 3× (idempotency: no duplicates).
- Upgrading `@a2e/core`: bump the git tag, `pnpm install`, run typecheck + your e2e happy paths (auth, workspace switch, upload, your core-consuming flows).
- Need a new core capability (table, permission string, intent type, app key)? Follow §6 — it's a PR on **A2ECore** shipping as a minor version.
- Never deploy your app pointing at a core deployment whose `@a2e/core` contract is newer than the version you pinned.

---

## 12. Existing apps: adoption patterns & current wiring

For apps that predate core, there are two sanctioned rollout patterns. Both end with core as the source of truth for workspaces, teams, and files. **Bilan uses Pattern A; Bureau uses Pattern B.**

### 12.1 The service bridge (`convex/sync.ts` on core)

Core exposes secret-gated endpoints so an app's **backend** can sync
server-verified workspace data. Never callable by clients.

```
App backend (Convex action)                 Core deployment
────────────────────────────              ─────────────────────────
ConvexHttpClient(CONVEX_CORE_URL)
  .query/makeFunctionReference ──secret──▶  sync:workspacesForUser {secret, workosId}
                                            → [{workspaceId, name, slug, role, ...}]
  .mutation ──secret──▶                     sync:importMembership {secret, workspaceId, workosId, role}
                                            sync:importDriveFile  {secret, workspaceId, name, s3Key, size, contentType, sourceApp, linkedTo?, createdByWorkosId}
                                            sync:notifyWorkspace  {secret, workspaceId, type:"<app>.<event>", title, message?, link?, sourceApp}
```

- Env: `A2E_SERVICE_SECRET` (same value) set via `npx convex env set` on **core and each app deployment**; `CONVEX_CORE_URL` set on each app deployment (server-side var, **no** `NEXT_PUBLIC_`).
- Endpoints throw `Forbidden: invalid service secret` otherwise. Roles passed to `importMembership` must be derived from YOUR verified legacy data, never from client args.
- `importDriveFile` is idempotent per `s3Key` (returns `{fileId, created}`).
- `notifyWorkspace` fans out one `notifications` row per workspace member (type namespaced `"<app>.<event>"`, `link` = your app's absolute path).
- Reference via `makeFunctionReference<"query", {secret: string; workosId: string}, any>("sync:workspacesForUser")` — no cross-repo api imports.

### 12.2 Pattern A — full cutover (used by Bilan/Money — STATUS: done)

Core becomes the only workspaces backend:

1. App tables' `workspaceId` becomes `v.string()` (runtime-compatible with existing `Id<"workspaces">` values) so rows can reference core workspace ids.
2. App keeps a `coreMemberships` **mirror table** (userId, workosId, workspaceId string, role, name/slug/avatar snapshot, `syncedAt`); `assertWorkspaceMember` checks the mirror. Mirror is refreshed by a `syncFromCore` action → `applyMirror` internal mutation (upsert/delete) on login and after any membership change.
3. Self-service auto-migration on login (a client "MigrationBridge" effect):
   - **Owner path**: create core workspace (same name) → `claim` mutation (verifies legacy ownership server-side, stamps `coreId` on the legacy workspace, repoints every workspace-scoped row from local id → core id by filter-scan) → backfill legacy files via `importDriveFile` (idempotent per `s3Key`, B2 objects untouched).
   - **Member path**: `joinCore` action finds the claimed core workspace (legacy workspace already has `coreId`) → `importMembership` with the verified legacy role.
4. UI reads workspaces/members/invitations/notifications/drive exclusively from `@a2e/core` hooks. Legacy modules deleted once migration is verified.

**Bilan file map** (`A2EMoney/`): `convex/sync.ts` (bridge client: `syncFromCore`, `applyMirror`), `convex/migrations.ts` (`claim`, `joinCore`, file backfill), `lib/workspace-context.tsx` (`MigrationBridge` + `Bridge`). Legacy `convex/workspaces.ts`/`invitations.ts`/`notifications.ts` removed.

### 12.3 Pattern B — linked mirror (used by Bureau/Thread — STATUS: done, web + mobile)

The app keeps its local workspace tables (its backend is deeply `Id<"workspaces">`-typed), and **links** each local workspace to a core workspace:

1. Add `coreId: v.optional(v.string())` (+ `by_coreId` index) to the local workspaces table. Local membership checks stay as-is (local rows remain the app's enforcement), the core workspace is the cross-app identity.
2. On login, a client bridge (core `useWorkspace()` + local workspace list) reconciles both directions:
   - local without `coreId` → create core workspace (user must be verified local owner) → stamp `coreId` → invite/import the other local members via `importMembership`.
   - core workspace without local counterpart → auto-create a local mirror workspace (same name) + local membership for the current user, so app features work immediately with the shared workspace.
   - Matching heuristic when `coreId` is absent on both sides: normalized name equality for workspaces the user owns; otherwise leave for explicit linking.
3. **New workspace creation is dual**: create in core first (`workspaces.create`), then the local row with `coreId`. Rename propagates local → core (`workspaces.update`). Core has **no delete** — deleting is a core-side decision; apps archive/hide locally.
4. New members invited in either app: invitation accept pages call core `invitations.accept`; the local mirror membership is created on that member's next login by the bridge.

Bureau implementation notes (accepted deviations, July 2026):

- **Sync-then-create ordering**: the bridge runs `syncFromCore` *first* on every login, then pushes unlinked local workspaces — a local workspace whose name already exists in core is stamped with that core id instead of creating a duplicate.
- **Slug is never synced**: core and local slugs are independent (local `generateSlug` is random-suffixed); only `name`, `avatar`, `locale`, `currency`, `type` cross the bridge.
- **Mirror seeding parity**: auto-created mirrors replicate the app's normal create path (`seedDefaultRoles` + `ensureChannel("general")` + `logActivity`), so downstream features can't tell a mirror from a native workspace.
- **Delete is membership-role-guarded when linked**: `workspaces.remove` requires local `owner` membership (not the legacy `ownerId` field) once `coreId` is set; delete only removes the local copy — core and the other apps keep the shared workspace.
- **Member import is best-effort per member**: `importLocalMembers` skips members not yet provisioned in core (they materialize on their own first login) instead of failing the whole import.
- **Onboarding gating**: the bridge renders a loader until the first sync settles, so a fresh signup can't race mirror creation.

**Bureau file map** (`A2E Thread Final/`):
- Web backend: `apps/web/convex/coreSync.ts` (`syncFromCore`, `applyCoreLinks`, `stampCoreId`, `importLocalMembers`), `apps/web/convex/workspaces.ts` (dual-write create/rename, guarded remove, `coreId` in `listMine`), `apps/web/convex/schema.ts` (`coreId` + `by_coreId`).
- Web client: `apps/web/components/app/workspace-link-bridge.tsx` (the bridge, mounted in `apps/web/app/app/layout.tsx`, gating the shell), `apps/web/hooks/use-core-workspace-link.ts`, dual-write in `apps/web/components/app/onboarding.tsx` + `apps/web/app/app/settings/page.tsx`.
- Mobile: `apps/mobile/src/data/use-workspace-link.ts` (bridge hook), `CoreProvider` mounted in `apps/mobile/app/_layout.tsx`, config in `apps/mobile/src/config.ts`.

### 12.4 Legacy files → core drive

Additive, flag-gated, zero-downtime:

1. Make the legacy storage reference optional and add `coreFileId: v.optional(v.string())` to the entity/validator (chat attachments, fonts, covers, …).
2. Behind `NEXT_PUBLIC_A2E_DRIVE=1`: new uploads go through `useUpload()` (core drive, `sourceApp` stamped, `linkedTo` set); legacy uploads still work when the flag is off or no core workspace exists.
3. Reads are dual: render via `useFileUrl(coreFileId, "view")` when present, else the legacy URL. If your backend resolves legacy URLs in a list query, resolve core URLs client-side with a small hook that batch-calls `drive.presignView` (see Bureau's `use-resolved-fonts.ts`).
4. Bulk backfill (optional, later): copy bytes to B2 via `importDriveFile` — or leave legacy files on legacy storage forever; both read paths coexist.

---

## 13. Building a NEW suite app (the emergent.sh brief)

Copy everything below the line into your AI builder / give it to a developer as-is. It assumes this guide is attached as context.

---

### Brief: create app **`<APP_NAME>`** (app key: **`<appkey>`**) for the A2E suite

**Platform summary.** A2E is a multi-app suite sharing one Convex "core" backend (identity, workspaces, memberships, roles, drive on B2, calendar, tasks, contacts, notifications, activities, comments, links, intents, shares, search, entitlements, presence, user prefs). My app is a new member of the suite: it gets its own repo, its own Convex deployment, its own Vercel project, and consumes all shared data through the npm package `@a2e/core` (pinned, currently `0.2.0`). The full contract is in `A2E_APP_INTEGRATION_GUIDE.md` — it is binding.

**Domain.** `<APP_NAME>` lets users `<one-sentence value proposition>` within their shared A2E workspaces. Its own domain data: `<list your entities, e.g. "forms, submissions, templates">`.

**Non-negotiable architecture rules:**
1. Own Next.js (App Router) frontend + own Convex backend. Tables prefixed `<appkey>_` (e.g. `<appkey>_forms`). Core tables are NEVER duplicated; core entities referenced by string id.
2. Auth: WorkOS AuthKit with MY OWN WorkOS application (own client id) in the shared A2E environment. `convex/auth.config.ts` exactly per guide §2 Step 3. The same token is passed to `<CoreProvider fetchToken={…}>`.
3. Providers order: my `ConvexClientProvider` → `CoreProvider` → `WorkspaceProvider` (guide §2 Step 4).
4. Every page is workspace-scoped from `useWorkspace().activeWorkspaceId`; gate on `isLoading` / null workspace.
5. Files go through core drive (`useUpload`, `sourceApp: "<appkey>"`, `linkedTo` set) behind flag `NEXT_PUBLIC_A2E_DRIVE=1` if I have legacy storage.
6. Notifications to the workspace via `coreApi.notifications.sendToWorkspace` with `type: "<appkey>.<event>"` and app-absolute `link`.
7. Cross-app relations via `links`; cross-app reactions via `intents` (`<appkey>.<event>` types, always `markHandled`, idempotent handlers).
8. Quota pre-checks with `useQuota()` + upgrade dialog; catch `QuotaExceededError`.
9. Every Convex function derives the user from `ctx.auth.getUserIdentity()` and asserts workspace membership (mirror core's `convex/lib/auth.ts`). Never trust client-sent ids/roles.
10. Env: `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_CORE_URL`, `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD` (+ server-side `A2E_SERVICE_SECRET`/`CONVEX_CORE_URL` on my Convex deployment only if I use the §12.1 bridge).

**First milestone (MVP):**
- App shell: login (AuthKit), workspace switcher reading `useWorkspace()`, invitation accept page at `/invite/[token]` calling core `invitations.accept`.
- Domain CRUD for `<primary entity>` in my own deployment, workspace-scoped, `sourceApp` stamped on any core entity I create.
- One core integration showcase: `<e.g. "attach drive files to a submission" / "create a task from a submission" / "post a forms.submission_received intent">`.
- Notification bell (`useNotifications` + `useUnreadCount`) in the top bar.
- AppSwitcher menu linking the other suite apps.

**Out of scope for the builder (done by the core operator):** registering `<appkey>` in `APP_KEYS`, adding my WorkOS client id to `WORKOS_SUITE_CLIENT_IDS`, seeding plan `appAccess` for `<appkey>`, setting `A2E_SERVICE_SECRET`.

**Definition of done:** typecheck clean; login → workspace auto-provisions; data correctly scoped per workspace; switching workspace in Bilan/Bureau switches it in my app (shared storage key); no core tables copied; guide security checklist (§10) fully ticked.

---

## 14. Appendix: current live state (July 2026)

**Deployments**

| What | Deployment | URL |
|---|---|---|
| Core (prod) | `superb-grasshopper-152` | `https://superb-grasshopper-152.eu-west-1.convex.cloud` |
| Bureau web (prod) | `veracious-reindeer-573` | `https://veracious-reindeer-573.convex.cloud` |
| Bilan dev | `fortunate-squirrel-301` | `https://fortunate-squirrel-301.convex.cloud` |
| Bilan prod | `academic-stoat-784` | `https://academic-stoat-784.convex.cloud` |

**Env-var matrix**

| Var | Core deployment | Bilan | Bureau web | Bureau mobile |
|---|---|---|---|---|
| `WORKOS_CLIENT_ID` | ✅ (primary) | ✅ own | ✅ own | ✅ own (`EXPO_PUBLIC_`) |
| `WORKOS_ISSUER_CLIENT_ID` | ✅ | — | — | — |
| `WORKOS_SUITE_CLIENT_IDS` | ✅ (bilan, bureau) | — | — | — |
| `B2_ENDPOINT/KEY_ID/APPLICATION_KEY/BUCKET_NAME` | ✅ | — | — | — |
| `A2E_SERVICE_SECRET` | ✅ | ✅ (dev deployment) | ✅ (prod deployment) | — (client never) |
| `CONVEX_CORE_URL` (server) | — | ✅ | ✅ | — |
| `NEXT_PUBLIC_CONVEX_CORE_URL` / `EXPO_PUBLIC_CONVEX_CORE_URL` | — | ✅ | ✅ | ⚠️ uses `config.ts` fallback |

**Package**: `@a2e/core@0.2.0`. App keys registered: `bilan, bureau, drive, forms, crm, core`.

**Known open items (not blockers):**
- Bilan `.env.local` has a duplicate `NEXT_PUBLIC_CONVEX_URL` (dev + prod values; dotenv takes the last) — pick one per environment.
- Bureau mobile relies on the hardcoded core-URL fallback in `src/config.ts`; set `EXPO_PUBLIC_CONVEX_CORE_URL` explicitly for clarity.
- Mobile `WorkspaceProvider` should get an AsyncStorage `storage` adapter (currently in-memory fallback).
- Cross-app workspace flows are implemented and smoke-tested; full manual end-to-end pass (Bilan ↔ Bureau create/rename/member materialization) is the remaining acceptance gate.

---

## 15. Quick reference

### Hooks

| Hook | Returns | Notes |
|---|---|---|
| `useWorkspace()` | `{workspaces, activeWorkspace(Id), setActiveWorkspaceId, isLoading}` | always first |
| `useMe()` / `useMembers(ws)` | user / members | |
| `useMyPermissions(ws)` / `useHasPermission(ws, perm)` | string[] / boolean | UI gating |
| `useInvitations(ws)` + `useInvitationMutations()` | invites + `{invite, revoke}` | accept via token |
| `useRoles(ws)` + `useRoleMutations()` | custom roles | |
| `useUpload({onProgress})` | `{upload, isUploading, error}` | presign→PUT→fileId |
| `useFiles(ws, folderId?)` | `DriveFileDoc[]` | non-deleted |
| `useLinkedFiles(ws, target)` | `DriveFileDoc[]` | per-entity attachments |
| `useFileUrl(fileId, "view"\|"download")` | `string` | cached 8 min |
| `useDriveMutations()` | folder/file mutations | |
| `useEvents(ws, range?)` | `EventDoc[]` | + `expandEvents` client-side |
| `useEventMutations()` | `{create,update,remove,rsvp}` | attendees on create |
| `useTasks(ws, parentId?)` / `useMyTasks(ws)` | `TaskDoc[]` | hydrated assignee |
| `useTaskStatuses(ws)` | statuses | auto-seeds defaults |
| `useContacts(ws)` / `useContactSearch(ws,q)` / `useContactsFor(ws,target)` | `ContactDoc[]` | |
| `useNotifications({limit,unreadOnly})` / `useUnreadCount()` | `NotificationDoc[]` / number | suite-wide bell |
| `useActivities(ws, limit?)` | `ActivityDoc[]` | hydrated actor |
| `useComments(ws, target)` | comments | mentions notify |
| `useLinks(ws, target, dir?)` | links | cross-app refs |
| `usePendingIntents(ws, appKey)` | `IntentDoc[]` | + `postIntent/markHandled/dismiss` |
| `useSharesFor(ws, target)` + `useShareMutations()` | shares | `resolveShare(token)` public |
| `useCoreSearch(ws, query)` | grouped results | debounced |
| `useEntitlement(ws)` / `useQuota(ws, domain)` | entitlements / quota state | upgrade UX |
| `usePresence(ws, entity, state?)` | active users | 8s heartbeat |
| `useUserPrefs()` / `useUpdatePrefs()` | prefs / updater | cross-app settings |
| `useCoreQuery/Mutation/Action(ref, args)` | escape hatch | with `coreApi.*` string refs |

### Quota domains (`useQuota(domain)` / `QuotaExceededError.domain`)

`storageBytes` · `maxMembers` · `maxTasks` · `maxDriveFiles` · `maxEvents` · `maxContacts` · `maxFileUploadBytes` · `maxCustomRoles` · `maxFormsResponsesPerMonth` (`-1` = unlimited)

### Typed errors (from `@a2e/core`)

| Error | When | Your UX |
|---|---|---|
| `QuotaExceededError` | plan limit hit | upgrade dialog |
| `ForbiddenError` | missing role/permission | hide action / explain |
| `NotFoundError` | entity gone | toast + refetch |
| `UnauthenticatedError` | token expired/missing | re-login flow |

### Env vars (your app)

| Var | Where | Value |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | client | your deployment |
| `NEXT_PUBLIC_CONVEX_CORE_URL` | client | core deployment (env-specific) |
| `WORKOS_CLIENT_ID` | client+server | YOUR app's WorkOS application client id |
| `WORKOS_API_KEY` | server only | your app's WorkOS API key |
| `WORKOS_COOKIE_PASSWORD` | server only | ≥32 chars, per app |
| `A2E_SERVICE_SECRET` | your Convex deployment only | bridge calls (Pattern A/B) |
| `CONVEX_CORE_URL` | your Convex deployment only | bridge target (no `NEXT_PUBLIC_`) |

> `WORKOS_ISSUER_CLIENT_ID` and `WORKOS_SUITE_CLIENT_IDS` are **core-side**
> Convex env vars — consumer apps never set them (see §2 Step 3).
>
> Version note: this guide tracks `@a2e/core@0.2.0`. Check
> `packages/core/CHANGELOG.md` before upgrading your pin.
