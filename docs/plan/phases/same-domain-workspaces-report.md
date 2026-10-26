# Same-domain workspaces phase reports

## 2026-10-22 17:39 UTC — executor

**Task:** Same-domain, multi-user A2E Suite · **Slice:** SDW-1 request workspace
assertion · **Claim:** done-for-review (slice); partial (whole feature).
**Changed:** shared header export; AccessTokenService assertion after native
authentication; distinct REST/GraphQL error; Apollo request header and recovery
message; service/frontend tests and existing session-binding integration suite.
**Decisions:** a workspace selector only narrows native credential grants;
legacy clients may omit it; mismatches preserve the valid cookie. Existing
session/workspace selection is not widened. No migration is needed for SDW-1.
**Do not redo:** preserve native sessions, CRM/Bureau IDs, enterprise checks,
workspace admin permissions and the user's untracked handoff file.
**Next:** SDW-2 authorized per-request/tab context; see the
[implementation sequence](../same-domain-workspaces.md). Full feature remains
unfinished; PLAN.md is unchanged under the executor contract.

### Verification evidence

All commands ran on baseline `8e88f0e2` plus this uncommitted diff, branch
`codex/same-domain-workspace-context`, Node v24.20.0. Root means the repository
root; server/front/shared mean their existing package directories.

| Check | Command / directory | Result |
| --- | --- | --- |
| Server unit regression | `npx jest packages/twenty-server/src/engine/core-modules/auth/token/services/access-token.service.spec.ts packages/twenty-server/src/engine/core-modules/auth/strategies/jwt.auth.strategy.spec.ts packages/twenty-server/src/engine/core-modules/auth/middlewares/__tests__/workspace-auth-context.middleware.spec.ts --config=packages/twenty-server/jest.config.mjs --runInBand` / root | Passed, 53 tests |
| Frontend regression | `npx jest packages/twenty-front/src/modules/apollo/services/__tests__/apollo.factory.test.ts packages/twenty-front/src/modules/apollo/hooks/__tests__/useApolloFactory.test.tsx --config=packages/twenty-front/jest.config.mjs --runInBand --silent` / root | Passed, 17 tests |
| Real session / metadata / REST API | `NODE_ENV=test npx jest --config jest-integration.config.ts test/integration/graphql/suites/auth/user-sessions/successful-session-workspace-binding.integration-spec.ts --runInBand --silent` / server | Passed, 5 tests, existing local test DB, no reset |
| Direct types | `npx tsgo -p tsconfig.json --noEmit` / front and server | Passed after shared declarations rebuilt |
| Type-aware lint | `npx oxlint --type-aware -c .oxlintrc.json` followed by the touched source/test paths / front and server | Passed, no warnings/errors |
| Shared lint | `npx oxlint -c .oxlintrc.json src/constants/WorkspaceRequestHeader.ts src/constants/index.ts` / shared | Passed |
| Formatting | `npx oxfmt` followed by the touched TypeScript paths / root | Passed |
| Docs | `node --test docs/scripts/check-docs.test.mjs` and `node docs/scripts/check-docs.mjs` / root | Passed, 6 tests and 26 maintained docs; new design note reviewed separately |
| Whitespace | `git diff --check` / root | Passed |

Integration coverage: both native workspace sessions for one seeded account;
matching selector; stale-tab selector versus the other session; valid cookie
survives the rejection; real REST API-key request cannot select another tenant.
Unit coverage additionally rejects empty/list/combined selectors and account
sessions without workspace grants. Frontend tests cover independent clients,
global requests, in-flight assertions and a mismatch without sign-out/retry.
These do not prove full browser cache isolation or live membership revocation.

The first frontend run failed against stale shared runtime exports; it passed
after rebuilding. Initial direct typechecks found stale shared declarations;
both passed after declaration generation. The standard
`NX_DAEMON=false npx nx build twenty-shared --skip-nx-cache` first hit a sandbox
IPC restriction; its unsandboxed retry generated barrels but remained idle.
Stopped only that task's idle generator processes. Ran the build's remaining
steps directly in shared: `npx vite build`,
`npx tsgo -p tsconfig.lib.json --declaration --emitDeclarationOnly --noEmit false --outDir dist --rootDir src`,
then `npx tsc-alias -p tsconfig.lib.json --outDir dist`; all exited 0. Do not
report the Nx wrapper itself as a successful build.

Integration startup logged ClickHouse `ECONNREFUSED` on localhost:8123 while
the five test assertions passed. Audit event persistence is unverified. No
database reset, schema change, image build, browser journey or target deployment
verification was performed. No Compose/DEPLOY.md change or release claim.

**Missing for tick:** SDW-2 through SDW-7 and all ten full-feature acceptance
journeys from the supplied handoff, including concurrent quotas, owner backfill,
SSO/invitation return URLs, two live tabs, populated upgrade and deployment.

## 2026-10-22 18:18 UTC — executor

**Task:** Same-domain, multi-user A2E Suite · **Slice:** AUTH-1 native login,
logout and account recovery polish (user-pinned follow-up) · **Claim:** partial
whole feature; authentication slice implemented for review.
**Changed:** existing SignInUpStandardContent becomes a responsive form/product
layout using Twenty theme tokens and Linaria. Email is visible immediately,
with a native account-discovery submit, pending state, visible labels and
password-manager autocomplete. Read Texxel's auth page for visual inspiration
only; no external identity backend, shader dependency or reference-app code.
**Logout:** the existing session-revoking logout returns to its explicitly
constructed central sign-in URL before considering a marketing landing page.
The legacy landing-page fallback remains for callers without a sign-in URL.
Existing failed-sign-out retry and cross-tab handling are preserved.
**Recovery:** both native forms share the reset-link action, pending state and
inline, non-enumerating inbox confirmation. Reset email is normalized. The
existing reset page has loading/recovery/retry, password confirmation and
durable success states. A successful password save no longer attempts automatic
sign-in or a second CAPTCHA step with a consumed token. Returning to sign-in is
an explicit action; an unrelated signed-in profile is never marked as updated.
For the matching account, Continue returns to its workspace. Reset forms remount
when their token changes to avoid retaining another token's completion state.
**Checks:** focused frontend regression, direct typecheck, type-aware lint,
formatting and production Vite build; results recorded below after completion.
**Missing for tick:** actual browser checks (mobile, keyboard, dark/light),
configured email delivery, enabled OAuth/SSO and real different-account login
on the target deployment. Same-origin workspace routing, ownership/quota
migrations and the full original acceptance matrix remain unfinished.
**Do not redo:** preserve SDW-1, native identity/membership/admin permissions,
workspace-specific auth restrictions and the existing server reset endpoints.
No translation catalog edits, database changes, commits or deployment.
**Next:** finish SDW-2/SDW-3 context/routing before claiming the requested full
multi-account, multi-workspace experience. AUTH-1 is not a release certificate.

### AUTH-1 final verification

- Frontend: `npx jest` with `--config=packages/twenty-front/jest.config.mjs
  --runInBand --silent`, explicitly selecting PasswordReset, SignInUpGlobalScopeForm,
  SignInUpWithCredentials, useHandleResetPassword, useSignInUp, useAuth,
  getLogoutRedirectUrl and PendingServerSignOutEffect test files: **48 passed
  across 8 suites**. Covers direct email edits clearing the old password,
  sign-in/sign-up autocomplete, uniform reset-email normalization/confirmation,
  mismatch validation, link-check retry, successful/failed save and same/other
  signed-in account recovery.
- Server: `NODE_ENV=test npx jest --config jest-integration.config.ts
  test/integration/graphql/suites/auth/user-sessions/successful-sign-out.integration-spec.ts
  --runInBand --silent` in twenty-server: **2 passed** on the existing test DB,
  without reset. Confirms actual persisted session revocation, cookie clearing,
  immediate rejection of cookie reuse, and cookie-less cross-site sign-out
  clearing nothing. Startup again logged ClickHouse `ECONNREFUSED`; audit-event
  persistence remains unverified.
- Frontend direct `npx tsgo -p tsconfig.json --noEmit`: **passed**.
- `npx oxlint --type-aware -c .oxlintrc.json` on all 15 touched auth source/test
  files: **passed, zero warnings/errors**. Used the adjacent native suppression
  for React Hook Form's required provider prop spread in its existing test.
- `NODE_ENV=production NODE_OPTIONS=--max-old-space-size=8192 npx vite build`
  in twenty-front: **passed** on the final source, 57.52 seconds. Includes
  production Linaria extraction. Build warned about the existing TypeScript
  browser externalization and ineffective dynamic imports; no new dependency
  or production image was built.
- Touched TypeScript formatted with `npx oxfmt`; `git diff --check` and
  `node docs/scripts/check-docs.mjs`: **passed**. No generated translation
  catalogs changed. New strings use Lingui; catalog generation/localized visual
  review is left to the translation pipeline.

Observed initial check failures were fixed: mutually exclusive snackbar error
props, MockedResponse's import path, and the provider-spread lint rule. Final
checks above passed. No real browser run, mail-provider test, OAuth/SSO exercise,
same-domain routing certification or deployment was performed.

## 2026-10-22 20:08 UTC — executor

**Task:** Native transactional email · **Slice:** EMAIL-1 · **Claim:** partial.
Implemented native SMTP failure propagation/TLS and matched server/worker
settings in both Coolify Compose copies. Saved the user-provided credential
only in an ignored mode-0600 local configuration. Real Resend SMTP auth and an
official delivery-simulator send passed; the provider event reports delivered.
Production sender verification is blocked by three missing DNS records at
Vercel; no live deployment was changed. Routing and quotas remain unfinished.
See the [email phase report](resend-email-report.md) for exact evidence,
required public DNS records and the remaining deployment access requirements.


## 2026-10-22 22:35 UTC — executor · EMAIL-2

Added the user-requested Resend REST account-email driver through the existing queue and API client, with retry idempotency and timeout. Native local server configuration selects RESEND. Current provider status is verified and both REST simulator messages report delivered. 31 email tests, 48 frontend authentication tests and 7 real logout/workspace-binding integration tests passed; direct server types and type-aware lint passed. Production activation, real inbox/browser journeys, same-domain workspace routing and durable ownership/quotas remain incomplete. See the [email report](resend-email-report.md) for current evidence, superseding its earlier DNS blocker.

## 2026-10-23 — executor · AUTH-2

**Task:** Account-entry polish · **Slice:** workspace picker and shared visual shell · **Claim:** done-for-review.
**Changed:** Shared sign-in panel adds a quiet token-based layered background and decorative pixel motif. Workspace selection shows the signed-in email, distinguishes joined/joinable workspaces, deduplicates choices, and explains empty/maintenance states. Creation and account switching use keyboard-accessible native buttons; sign-out has a pending state.
**Checks:** Eight focused auth suites: 52 tests passed. Direct frontend `tsgo`, type-aware oxlint on the four touched files, and final production Vite build (38.40s) passed. No generated translation catalogs changed.
**Missing for tick:** Light/dark and responsive browser review; production and two-account lifecycle acceptance. Routing, durable ownership and quotas remain unfinished.
**Do not redo:** Preserve the native authentication, onboarding and workspace URL actions; no new identity system was introduced.
**Next:** User's subsequent Bureau request: native task sheet and real daily progress on the Bureau home.

## 2026-10-23 08:46 UTC — executor · AUTH-3

**Task:** Different email refused after logout · **Slice:** shared-domain account entry and public root · **Claim:** done-for-review in source; deployment unverified.
**Observed:** The live `/client-config` reports `isMultiWorkspaceEnabled: false`; the browser redirects `/` to `/welcome` with “Welcome, Test.” Existing workspace-scoped signup correctly rejects an unrelated email. This is account-entry routing/configuration, not permission to relax workspace membership.
**Changed:** Added explicit `IS_SHARED_DOMAIN_WORKSPACE_ENABLED` (native server default false; A2E Coolify server/worker default true), independent of Twenty's domain routing. Native account signup and workspace creation recognize this mode; client config exposes native multi-workspace features. The frontend keeps workspace/onboarding routes on the shared origin while login and email verification use global account operations. Logout clears old workspace/login hints and returns to `/`. No identity backend or database schema was added.
**Isolation:** Login-token and OTP exchanges resolve the verified token's workspace only on the configured frontend origin, then retain native membership/provider/2FA checks. Global entry never picks the first database workspace. Picker links reload the document to discard old workspace caches; dropdown switches carry native login tokens. Explicit invitations retain their signed/hash credentials and are not displaced by account resumption. SSO-only choices offer the native identity provider instead of redirecting into an account-picker loop. Domain settings are hidden in shared mode. Existing admin restrictions and the five-workspace enterprise gate remain intact.
**Experience:** Public root landing, responsive layout, token-based light/dark styles and a reduced-motion-aware pixel preview; native account form, workspace picker and recovery share the existing shell. Browser review found missing production Lingui entries, including earlier auth/recovery copy: added exactly 56 English and French messages, plus the missing French “Get started” translation. No unrelated locale catalogs changed. Local ignored server environment now enables shared mode; mail secrets were not changed or displayed.
**Checks:** 374 focused frontend tests across 12 suites; 33 server unit tests across four suites; three new shared-domain database integration tests and seven existing native logout/workspace-binding integration tests passed. Both direct package `tsgo` checks, touched-file type-aware oxlint, production frontend Vite build (29.07s), scoped catalog compilation, docs checker and `git diff --check` passed. Integration used the existing local test DB, no reset; only its newly created account was removed through native `deleteUser` cleanup. Initial test-fixture failures (provider context, animation timing, reuse of the already-rotated account cookie) were fixed without weakening assertions.
**Browser evidence:** Inspected the old production login read-only. Inspected English and French landing and landing → account form navigation in the local production build, using a public client-config fixture with shared mode enabled; no production account or email was created. Screenshots saved under `/private/tmp/a2e-public-landing-preview.png` and `/private/tmp/a2e-account-entry-preview.png`. This static preview does not prove a live signup, email delivery, mobile layout, OAuth or enforced 2FA journey.
**Missing for tick:** Deploy an image containing this source and update the existing service's saved Compose; verify both client-config flags true, then run fresh-account workspace creation, invitation, reset-email, 2FA and workspace-switching browser journeys on the target. Local ClickHouse at port 8123 is unavailable: integration assertions passed, audit-event persistence is unverified. Independent concurrent workspace cookies per tab, full path routing, ownership/backfill and per-owner quotas remain outside this slice. No PLAN.md edit, commit, image publication, production configuration change or deployment was performed.
**Next:** Follow the shared-domain account section in DEPLOY.md on the existing service, preserve its volumes/secrets, and verify a different email from a private browser after release.


## 2026-10-23 — executor · AUTH-4 / RELEASE

**Task:** Coolify still serves old account entry · **Slice:** image packaging and deployment identity · **Claim:** partial; source ready for review, production unverified.
**Observed:** Live `/client-config` still reports version 0.2.1, no revision/shared-mode field and multi-workspace false. Read the actual GitHub run 39931916416 build logs: Documents, Bilan, Projects and Drive fail to resolve `twenty-shared/application` in the isolated `/apps` context. The shell loop masks early failures; archive collection then fails. No new image was published. Root `docker-compose.coolify.yml` pulls the image; its Dockerfile is `packages/twenty-docker/twenty/Dockerfile`.
**Changed:** Bundled apps inherit the built native shared package from the server build; a dependency-free Node builder stops immediately and verifies each archive's exact package version and application manifest. Updated the existing frontend provisioning drift guard. Docker always compiles the frontend; local `.twenty`, frontend/server outputs and the ignored Resend secret file are excluded from the context. The production image enables shared account mode by default even with older saved Compose, retaining explicit legacy opt-out. Both Compose copies remain identical; no volumes changed.
**Identity:** Image APP_REVISION is exposed through REST client config and a frontend release.json stamp. The new check requires matching full frontend/backend Git SHAs, correct host and both mode flags. CD runs tooling tests and, when the existing webhook secret plus A2E_PUBLIC_URL variable are configured, waits for the intended deployed revision. Missing automation configuration explicitly reports live deployment as unverified. DEPLOY.md documents exact build paths and verification.
**Passed:** Final Node release-tooling tests: 13/13 (`node --test packages/twenty-docker/scripts/__tests__/*.test.mjs`). Real final builder completed immutable install, SDK tarball build and manifest/version validation for all seven apps; log `/private/tmp/a2e-release-bundled-build.log`. Frontend provisioning guard: 4/4 Jest tests. Shared-domain DB integration: 3/3, with APP_REVISION set to the local baseline SHA, verifying the actual REST revision and independent signup/logout/workspace-bound sessions; existing test DB, no reset. Native cleanup touched only that test's new account.
**Compilation:** Direct uncached frontend/server `npx tsgo -p tsconfig.json --noEmit` and touched-file type-aware oxlint passed. Production frontend `NODE_ENV=production NODE_OPTIONS=--max-old-space-size=8192 npx vite build` passed (45.33s); release stamp was written and inspected on this local build. Direct server `npx nest build --path ./tsconfig.build.json` compiled 8,547 files successfully. Baseline is 3f97d9f7 plus this uncommitted diff; the local stamp exercises provenance plumbing, not a published revision.
**Checks/limits:** YAML parsing passed for CD and both Compose files; docs checker/tests and diff whitespace passed. The full host Nx dependency build stalled in its existing shared barrel-generation task, including attempts disabling the daemon/native runner; only those verification process trees were stopped. Direct native Node execution of the generator passed; its attempted command change did not resolve Nx and was reverted. No shared source/project changes remain. Logs: `/private/tmp/a2e-release-server-build*.log`. This is not a successful full Nx build. Docker CLI/engine are unavailable (also checked standard macOS application/socket paths), so no Linux image build or container boot was certified. Integration logs still contain the existing unavailable local ClickHouse audit sink.
**Missing for tick:** Publish this reviewed source via the maintainer MR/release workflow, require a successful complete CD image build, redeploy the existing Coolify service with the matching tag, then run the new deployment check and real two-account/new-workspace/invite/reset/2FA browser journeys. The new public check currently fails as intended on the old SPA fallback for release.json. Coolify service URL/access requested but not provided. No commit, push, image publication, production write, volume operation or deployment was performed.
**Do not redo:** Preserve AUTH-3 native membership/token security, existing data and the REST Resend driver. Do not treat an HTTP 200, version 0.2.1 or frontend screenshot as release acceptance. Ownership/quotas and full browser acceptance remain separate unfinished scope.

## 2026-10-23 — executor · AUTH-5 / sidebar entry and CI inspection

**Claim:** partial; source changes ready for review, full live journeys unverified.
**Observed:** Read main 7a0fd4d's actual Actions jobs/logs through the GitHub API. Docker CD run 39937826548 subsequently succeeded. Two upstream dispatches fail on missing GitHub App client ID; UI browser installation rejects ubuntu26.04; front Storybook queues without a runner on a custom 8-core label. Added upstream-integration guards, stable browser OS and standard-runner defaults with configurable larger runner. Changes were committed externally during this session; this agent did not commit or push. Actionlint 1.7.12 was downloaded from its official release with checksum verification; all seven relevant workflows pass (shellcheck/pyflakes disabled). Added missing action descriptions; formatting corrected. Repository secret/variable read confirms COOLIFY_DEPLOY_WEBHOOK and A2E_PUBLIC_URL absent: GitHub automatic redeployment/verification is not configured.
**Signup:** Public live config now reports shared/multi mode true. Native signup also checks IS_WORKSPACE_CREATION_LIMITED_TO_SERVER_ADMINS (default true). A2E image and both identical Compose copies now default this flag false, retaining explicit restrictions and database overrides; native policy tests retain restricted-instance coverage. No identity, membership or database permission bypass. DEPLOY.md includes sanitized public signup/Resend REST configuration and explains required Compose passthrough. No supplied encryption/database/email credential was written to tracked source.
**Navigation:** User supplied a projects-table URL. Bureau provider previously mounted only on /bureau; it now recognizes native Bureau folder ownership on project/table/record routes too, providing the existing tree, search, templates and create-page actions. Added a small accessible Pages + button using native page creation. Focused app links no longer register the whole row as a sortable drag handle or offer removal of installed app shortcuts. The generic editable folder retains existing sorting/removal. This addresses a possible click-interception path; target browser clicks and actual data loading still require verification, not inferred success from source.
**Checks:** Direct frontend types, touched-source type-aware lint and production Vite build (27.54s) passed before final test-fixture corrections. Native public/restricted signup policy: 4 passed. Final sidebar tests/checks recorded in the following verification entry. No migration or locale changes. Live authenticated Bilan data, provisioning upgrade state, actual document persistence and two-account/reset/invitation journeys remain unverified. No production writes or deployment performed. Landing redesign remains deferred behind these functional blockers.

**AUTH-5 final verification:** Frontend sidebar regressions: **15 passed across 4 suites**, including real computed document links from a projects route and Bureau context retained across app sections. Initial fixture errors (LINK instead of native OBJECT, missing metadata/label) were corrected. Native signup policy: **4 passed**. Final direct frontend typecheck, type-aware lint on five source/test files, formatting, matched Compose defaults/YAML, documentation checker and whitespace review passed. Production frontend compiled in **27.54s**; only test fixtures/docs changed afterward. Seven workflows passed actionlint with external shell/Python linters disabled. Linux image build, actual target signup after the new default, native page persistence and Bilan table/browser acceptance remain unverified. The successful earlier CD run does not contain these newly uncommitted sidebar/signup-default changes. No release certification or completed landing redesign is claimed.

## 2026-10-26 10:42 UTC — GPT-6 [executor] — Deployment diagnostics
**Task:** User's Coolify server-unhealthy deployment. **Claim:** partial; production root cause remains unestablished from supplied excerpt.
**Evidence:** Attached log ends with two successful workspace upgrades, zero failures and normal BullMQ cleanup. Both development and production-mode local `upgrade --dry-run` reproduce that ending and exit 0. Public `/readyz` and `/client-config` return HTTP 502. Read-only GHCR manifest/config inspection identifies current `latest` as revision 92a2a293c02c85c34ebd11691e5e5e07316e7268, built 2026-10-24; index digest sha256:524e85f81cbd13ccf4ee1d90065565ea478d639848051921d7a20fbc85cef7e4. Corresponding CD run 40130952784 succeeded. This does not establish which image ID the failed container actually ran.
**Changed:** Entrypoint prints each startup stage's start/result/duration and failure exit code, plus runtime handoff; PostgreSQL URL argument is quoted. Release verifier now also requires `/readyz` database/Redis health. DEPLOY.md provides focused state/image/log commands and distinguishes CLI cleanup from HTTP startup. No timeout inflation, health bypass or migration/provisioning suppression.
**Checks:** Deployment/provisioning/readiness tests: 34 passed before diagnostics; modified entrypoint tests: 22 passed including deliberate upgrade/registration/install failures. Docker script tests: 15 passed including rejecting unavailable/misleading readiness. Shell syntax, direct frontend/server types, scoped lint, docs checks and whitespace passed. Local HTTP server and worker return healthy dependency probes.
**Missing for tick:** Docker engine is unavailable locally; no Linux image build, intentional real-image failed-upgrade/restore drill, production container state/probe output or full post-upgrade boot log. Requested missing logs from user. Current changes are uncommitted/unpublished and cannot be present in GHCR `latest`.
**Next:** Obtain `docker inspect --format '{{json .State}}' <existing-server-container>` and complete startup log, identify actual crash/OOM/stalled stage or readiness error, fix that demonstrated cause and verify the newly published immutable image on the existing service/volumes. Do not label the deployment fixed from these passing local checks.

## 2026-10-26 11:20 UTC — GPT-6 [executor] — Finite CLI shutdown fix
**Task:** User supplied another startup log ending at successful upgrade/BullMQ shutdown and requested a fix with available evidence. **Claim:** command lifecycle fix verified locally; exact production retained resource and deployment recovery remain unverified.
**Changed:** `packages/twenty-server/src/command/command.ts` always closes the Nest context in `finally`, handles bootstrap errors before providers exist, flushes stdout/stderr and explicitly exits with the preserved command/interruption status after cleanup. A 30-second cleanup-only watchdog exits nonzero if a destroy hook stalls; there is no new execution deadline on migrations. Server/worker processes and migration/provisioning health gates are unchanged. DEPLOY.md explains that a new image is required.
**Behavior tests:** New real-child-process lifecycle suite: 9 passed, covering retained handles, handled/thrown command failure, rejected/stalled cleanup, long-running commands outside the cleanup budget, interruption status, early provider initialization failure and complete 512 KiB output draining. Final focused lifecycle/entrypoint/install/readiness run: 4 suites / 38 passed. Direct server `tsgo --noEmit`, type-aware lint and formatting passed; Nest compiled 8548 files; documentation/whitespace checks passed.
**Compiled integration:** Against local development PostgreSQL/Redis in production mode, both old and patched upgrade ran `--dry-run` with a deliberately injected retained handle. The old CLI reached successful upgrade/BullMQ cleanup and remained alive (test harness terminated it); patched CLI completed both workspaces, logged application context closed and exited 0 despite the handle. This reproduces the symptom under a controlled condition, not proof of which resource production retained. Logs: `/tmp/a2e-cli-baseline-retained-handle-integration.log` and `/tmp/a2e-cli-fixed-retained-handle-integration.log`.
**Runtime smoke:** Started compiled HTTP server through the real entrypoint on temporary port 3100 with production mode, migrations/provisioning/cron disabled only for this local replica. It started successfully and `/readyz` returned HTTP 200 with database/Redis up. Stopped only that temporary smoke process; original local server/worker remain. This does not certify bundled image installation, frontend assets or production health.
**Next:** Build/publish the reviewed source, select that immutable image SHA for both existing Coolify services and redeploy with current Compose/volumes/secrets. Confirm startup passes the upgrade into provisioning and runtime, then verify server/worker readiness. If cleanup times out it now fails explicitly with a useful stage rather than silently blocking; inspect the actual container state before further changes. No commit, push, production mutation or Docker image build was performed in this session.
