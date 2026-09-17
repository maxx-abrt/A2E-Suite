# P1.6a — Template and setup-operation contracts

Spec for [PLAN.md](../../PLAN.md) **P1.6a** (contracts C1/C2). Every symbol
below was verified in source on 2026-09-13; where the plan says "logical
requirement, not existing SDK exports", this doc records the actual
representation chosen for P1.6b/c. Normative language: **must** = enforced in
P1.6b, **may** = open follow-up.

> 2026-09-17: re-verified against source at `91cb20a9` (drift audit, US-001).
> Corrections below are appended in place; prior text is kept per repo handoff
> convention. Verified as still accurate: every file link resolves
> (`node docs/scripts/check-docs.mjs` → PASS, 19 maintained / 130 links);
> `WorkspaceTemplate`, `WORKSPACE_TEMPLATE_DEFINITIONS`,
> `TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS`,
> `ApplyTemplateRequest`/`ApplyTemplateStep`/`ApplyTemplateResult`/
> `TemplatePreview`, `ApplicationRegistrationService.findOneByUniversalIdentifierGlobal`,
> `ApplicationVersionValidationService.validateServerCompatibility`/
> `validateWorkspaceCompatibility`/`validateVersionProgression`, and the §7
> fixture UUIDs (app `19126a9c-…`, nav rows `20202020-b001/b004/b005-…`) all
> exist with the documented shape. Drift corrections requiring a P1.6b/c
> decision: §3 (third app package a2e-projects), §4 (deselect field is
> negative), §2/§5/§8 (sample seeding is app-owned, async, and currently
> broken — do not treat `seed-samples: succeeded` as proof). No `UNVERIFIED`
> claims remain: the async post-install failure has a recorded root-cause
> suspect but no live re-verification since the fixes — flagged as a P1.6b
> obligation rather than asserted working.

## 1. Template identity and classification (C1)

Three lifecycle-distinct template kinds — never interchange them:

| Kind | Representation today | Owner of content |
| --- | --- | --- |
| Workspace preset | `WorkspaceTemplate` enum + `WORKSPACE_TEMPLATE_DEFINITIONS` ([workspace-template-definitions.constant.ts](../../packages/twenty-server/src/engine/core-modules/onboarding/constants/workspace-template-definitions.constant.ts)) | Server code (versioned with the repo) |
| Content template | None yet (P1.6d/e): app-owned objects, e.g. `_document` tree, with a template descriptor | Workspace-owned rows created from a descriptor |
| Workflow recipe | Opt-in workflow installed via the app's workspace migration (workflow definitions are app metadata) | App-owned on install; editable (becomes workspace-owned) on edit |

Workspace presets **must** carry a stable `key` (the `WorkspaceTemplate` value)
and an integer `version` bumped whenever the definition changes meaningfully
(app set, managed nav rows, samples). The version is recorded in the operation
result so a client can detect stale previews. Definitions stay code-data in the
server until P1.6e justifies a table; no new engine.

## 2. Ownership inventory (app-owned vs workspace/user-owned)

Established by reading how the template service mutates state:

- **App-owned (installed via workspace migration from the app manifest):**
  objects, fields, views, page layouts, roles, app navigation-menu items,
  workflow definitions, logic functions, command-menu items. Removed with the
  app; templates must never re-declare these, only require the app.
- **Template-managed standard rows:** standard-object navigation menu items are
  DB rows. Presets may hide/restore only rows in
  `TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS`
  (derived union of all definitions). Everything else is user-owned and
  untouchable — this constant is the codified boundary between "template hid
  it" and "user hid it", which C2 requires for safe template switches.
- **Workspace/user-owned (never touched by templates):** records, attachments,
  user-added fields/views, user nav rows, favorites, roles created by users,
  active workflow runs.

  > 2026-09-17: inventory re-verified against `workspace-template.service.ts`.
  > App-owned and standard-row boundaries hold: installs go through
  > `ApplicationInstallService.installApplication` (workspace migration), nav
  > toggling only touches rows in the allow-list constant, and the sole
  > workspace-state mutation is `workspace.workspaceTemplate`. The one caveat
  > is sample content: it is no longer created by the template service at all
  > but by app post-install hooks — see the §5 2026-09-17 note; the hook
  > currently seeds 0 rows, so "templates create sample content" is **not**
  > true today.

Rule: a template operation may create app-owned metadata only by installing a
registered application, and may mutate workspace state only through the
template-managed allow-list above. Direct object/field/view creation inside a
preset is forbidden — it belongs in an app manifest or a P1.6e content template.

## 3. Compatibility surface (real, verified)

- App→server: manifest `engines.twenty` semver range, validated at
  publish/install by `ApplicationVersionValidationService`
  (`validateServerCompatibility` against the instance completed version,
  `validateWorkspaceCompatibility` against the workspace completed version).
- App versions: from the app package (a2e-documents `0.2.0`,
  a2e-accounting `0.1.0`); progression enforced by `validateVersionProgression`
  (no downgrade, no same-version reinstall as upgrade).

  > 2026-09-17: the published internal app set is **three** packages, not two —
  > add a2e-projects `0.1.1` (`packages/twenty-apps/internal/a2e-projects/package.json`).
  > All three still declare `engines.twenty >=2.19.0` (projections of
  > `requiredServerVersionRange`). The Bilan (a2e-accounting) manifest is
  > `0.1.0` on disk: the `0.1.0`→`0.1.1` bump seen in the 2026-09-16
  > orchestrator log was a scratch version used to exercise app:install and was
  > reverted before commit (phase-01-report.md line 628), so the doc's `0.1.0`
  > is correct. The post-09-13 accounting manifest fixes were landed under the
  > unchanged `0.1.0` version (reserved names, FILES `maxNumberOfValues`,
  > relation targets, view-field refs) — see phase-01-report.md 2026-09-16
  > 12:10 entry. Not yet reflected in `WORKSPACE_TEMPLATE_DEFINITIONS`: no
  > preset lists a2e-projects (`4f759655-84f8-434d-9c76-ee1850e8c1a4`).
- App→app dependencies: **the SDK manifest has no dependency field today.**
  Preset definitions therefore encode inter-app ordering as a flat list;
  P1.6b must reject a preset that lists the same app twice and must treat
  required-but-unregistered apps as `failed` (or `skipped` if optional) —
  never the current silent `logger.warn` + skip.

## 4. Setup-operation request (C2)

One operation, used by onboarding **and** Settings "Change workspace template".
Current input is only `{ template }` ([apply-workspace-template.input.ts](../../packages/twenty-server/src/engine/core-modules/onboarding/dtos/apply-workspace-template.input.ts));
P1.6b extends it additively:

```ts
type ApplyTemplateRequest = {
  workspaceId: string;            // server-derived from session, not client-sent
  templateKey: WorkspaceTemplate | 'none'; // 'none' = blank/CRM, skip default
  templateVersion?: number;       // optimistic concurrency vs the previewed version
  selectedAppUniversalIdentifiers?: string[]; // subset of definition apps (C2: allow exclusion of optional apps)
  sampleContentEnabled?: boolean; // default false
  idempotencyKey: string;         // same key retried = same operation, no duplicate seeds
};
```

> 2026-09-17: the implemented field is the **negative** `deselectedOptionalAppUniversalIdentifiers?: string[]`
> (`dtos/apply-workspace-template.input.ts`), not the doc's positive
> `selectedAppUniversalIdentifiers`. The negative form was chosen so an omitted
> field means "install everything" (a whitelist default would silently drop
> apps); the server derives required apps as
> `applicationUniversalIdentifiers` minus `optionalApplicationUniversalIdentifiers`
> minus the deselected list, and rejects a deselection of any app outside
> `optionalApplicationUniversalIdentifiers` (`TEMPLATE_REQUIRED_APP_DESELECTED`
> when it is a required app, else `TEMPLATE_APP_NOT_IN_DEFINITION`).
> `WorkspaceTemplateService.applyWorkspaceTemplateOperation` owns the accepted
> shape; the doc type above stays the abstract contract.

Validation **must** reject: unknown `templateKey`/version, an app ID not in the
template's definition (or its managed-nav allow-list), a selected app that is
required by the template (required apps cannot be deselected), and any content
reference that is not a declarable metadata reference (universal identifier +
type). Record IDs, user IDs, share URLs, tokens and live finance rows from any
workspace are invalid template content by construction (C1 §3) — descriptors
carry universal identifiers and default values only.

## 5. Setup-operation result and steps

```ts
type OperationStepStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';

type ApplyTemplateStep = {
  kind: 'install-app' | 'navigation-visibility' | 'seed-samples' | 'set-workspace-template';
  targetUniversalIdentifier?: string;      // app or nav row
  status: OperationStepStatus;
  createdRecordUniversalIdentifiers?: string[]; // samples only, for provenance
  errorCode?: 'APP_NOT_REGISTERED' | 'VERSION_INCOMPATIBLE' | 'INSTALL_FAILED' | 'NAVIGATION_FAILED' | 'SEED_FAILED';
  localizedMessage?: string;               // safe for display; retry guidance included
};

type ApplyTemplateResult = {
  operationId: string;            // UUID; async steps report under it
  requestedTemplateKeyVersion: { key: string; version: number } | null;
  appliedTemplateKeyVersion: { key: string; version: number } | null; // null until 'set-workspace-template' succeeds
  steps: ApplyTemplateStep[];
};
```

- Installed application state (`application` table) remains the single truth of
  activation; the result is a report, never a parallel activation table (C2).
- Steps run: validate availability/versions → install apps (additive, one step
  each) → navigation visibility (template-managed rows only) → seed samples
  (provenance-tagged) → set `workspace.workspaceTemplate`. The service is
  already structured this way ([workspace-template.service.ts](../../packages/twenty-server/src/engine/core-modules/onboarding/workspace-template.service.ts));
  P1.6b adds per-step capture instead of today's warn-and-continue.
- Partial failure keeps successful steps; retry with the same idempotency key
  re-runs only non-succeeded steps. Sample seeding must be
  repeat-safe: skip when provenance (template key+version) already present.

  > 2026-09-17 (known P1.6b obligation — seeding does **not** work today):
  > sample seeding is no longer a server-side seeder. Since P1.6d it is
  > **app-owned** via each app manifest's `postInstallLogicFunction`, and
  > `WorkspaceTemplateService.resolveSampleSeedingStep` only inspects the
  > succeeded install steps' registration manifests to report the outcome. Two
  > live defects make the current report an over-report: (1) the post-install
  > hooks run **asynchronously**
  > (`shouldRunSynchronously: false`, e.g. Bilan `b11a0000-0012-4000-8000-000000000001`),
  > so the `install-app` step resolves and `seed-samples` reports `succeeded`
  > before seeding has run; (2) the Bilan hook fails silently at runtime — an
  > orchestrator Tier-2 run on 2026-09-16 (phase-01-report.md line 631)
  > observed 0 seeded rows on both fresh install and reinstall, with the
  > suspected `coreClient()` auth/context in the worker still unproven (a
  > per-step `runInstallStep` logging fix and an SDK-layer extraction fix have
  > since landed, but no live re-verification is recorded). **P1.6b must not
  > treat the current `seed-samples: succeeded` as proof of seeding**: either
  > report hook completion truthfully (await / hook-failure status) or keep the
  > `SEED_FAILED` code reachable, and re-run the Tier-2 install before claiming
  > seeding works. The doc's repeat-safe provenance rule above remains the
  > target contract, not current behavior.

## 6. Preview contract

Before apply, a resolved preview **must** return:

```ts
type TemplatePreview = {
  templateKey: string; version: number;
  apps: Array<{ universalIdentifier: string; displayName: string;
    registered: boolean; versionCompatible: boolean; required: boolean;
    currentlyInstalled: boolean; // install/keep distinction
  }>;
  navigationChanges: Array<{ universalIdentifier: string; action: 'hide' | 'restore' }>; // managed rows only
  samples: Array<{ label: string; locale: string }>; // empty when off
  blocked: boolean; // true when a required app is unregistered/incompatible
};
```

Unavailable **optional** apps are excludable; blocked templates can still
preview but cannot apply. Preview reads registration (`ApplicationRegistrationService`)
and compatibility (`ApplicationVersionValidationService`) — the same sources
apply will use, so preview cannot lie.

## 7. Fixtures (normative examples)

Preview, `individual` on a fresh workspace with a2e-accounting unregistered
(optional there), a2e-documents 0.2.0 compatible:

```json
{
  "templateKey": "individual", "version": 1,
  "apps": [
    { "universalIdentifier": "19126a9c-7cc0-4368-aaba-c7e5a87b0c48",
      "displayName": "A2E Documents", "registered": true,
      "versionCompatible": true, "required": true, "currentlyInstalled": false }
  ],
  "navigationChanges": [
    { "universalIdentifier": "20202020-b001-4b01-8b01-c0aba11c0001", "action": "hide" },
    { "universalIdentifier": "20202020-b005-4b05-8b05-c0aba11c0005", "action": "hide" },
    { "universalIdentifier": "20202020-b004-4b04-8b04-c0aba11c0004", "action": "hide" }
  ],
  "samples": [], "blocked": false
}
```

Result after a required-app install failure and successful retry of the rest:

```json
{
  "operationId": "9f1c3a20-8f4e-4d9a-9c1e-2b6a7d8e9f01",
  "requestedTemplateKeyVersion": { "key": "individual", "version": 1 },
  "appliedTemplateKeyVersion": { "key": "individual", "version": 1 },
  "steps": [
    { "kind": "install-app", "targetUniversalIdentifier": "19126a9c-7cc0-4368-aaba-c7e5a87b0c48",
      "status": "succeeded" },
    { "kind": "navigation-visibility", "status": "succeeded" },
    { "kind": "seed-samples", "status": "skipped" },
    { "kind": "set-workspace-template", "status": "succeeded" }
  ]
}
```

Rejection matrix (each must produce a localized, typed error, not a throw):

| Input | Result |
| --- | --- |
| Unknown `templateKey` | reject before any step |
| Selected app not in template definition | reject |
| Deselect a required app | reject |
| Required app unregistered / version incompatible | step `failed` with `APP_NOT_REGISTERED`/`VERSION_INCOMPATIBLE`; blocked preview |
| Same idempotency key retried | return existing operation result; no duplicate seeds |
| Template content referencing another workspace's record | invalid descriptor; reject at load time |

## 8. Deliberate gaps (handed to later slices)

- No app→app dependency field in the SDK manifest — ordering stays preset-flat
  until the SDK adds it (do not invent one in server code).
- No sample seeder exists; `seed-samples` step is specified but its content
  arrives with P1.6d (per-app safe slices).

  > 2026-09-17: superseded — P1.6d shipped app-owned post-install seeders
  > (a2e-documents, a2e-projects, a2e-accounting payloads + hook exist and unit
  > tests are green), but live seeding still writes 0 rows and the hook is
  > async, so the `seed-samples` step over-reports `succeeded` (phase-01-report.md
  > 2026-09-16 entries). What remains for P1.6b is **truthful reporting /
  > sync semantics**, not the seeder content — see the §5 2026-09-17 note.
- Content templates (P1.6e) reuse §4 idempotency and §2 provenance rules; their
  descriptor schema is out of scope here.
- `ApplyTemplateResult` persistence (async progress queryable by another
  session) is P1.6b's decision — this contract only fixes the shape.
