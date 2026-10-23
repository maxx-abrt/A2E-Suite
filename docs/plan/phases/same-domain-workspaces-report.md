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
