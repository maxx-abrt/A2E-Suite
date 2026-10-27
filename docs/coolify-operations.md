# Releases, backups and operational checks

[Production runbook](production-coolify.md) · [Deployment guide](../DEPLOY.md)

## Identify what is running

The admin panel's version card reports the running application version, build
number/attempt, Git revision and UTC build time. It separately shows GitHub main
and the last successful **A2E CD Docker image** run. Docker Hub's Twenty releases
are not an update source for this fork.

Each Actions build automatically receives a distinct `APP_BUILD_ID`, such as
`120.2`, and `APP_BUILD_DATE`. `APP_VERSION` remains the maintained semantic
version; a new build does not invent a schema or compatibility version. The
server, frontend release file and worker must agree during image acceptance.
Live verification checks the expected build as well as the revision, including
when a commit is rebuilt after a dependency/base-image change.

The admin status distinguishes current code, another build of the same commit,
a forward update, an ahead/diverged checkout, a development build and an
unavailable check. New main commits are not treated as published images before
their CD run succeeds. Public GitHub checks use bounded requests and a shared
ten-minute cache; a network/rate-limit failure remains unknown. This card is
read-only and does not pull source or run migrations inside the container.

## Select and deploy a release

1. Require candidate smoke acceptance and image promotion to pass. Download the
   `release-<sha>-<build>-<attempt>` artifact or read **Tested A2E image** in the job summary.
   Its `release.json` records semantic version, build, commit, timestamp, workflow
   and the exact tested image digest. Candidate acceptance and live verification
   are separate; the manifest does not certify the running Coolify resource.
   Build/attempt-specific artifact names permit reruns without collisions. The
   small release record is retained for 90 days; detailed smoke logs for seven.
   Keep the production manifest with your own backup/release records too.
2. In production set `A2E_IMAGE` to that complete `ghcr.io/...@sha256:...`
   reference. It takes precedence over `TAG`, and both server and worker use it.
   A changed source commit alone does not update a pinned resource. `TAG=latest`
   remains available for an intentionally automatic staging channel.
3. Take/verify the production recovery point before upgrades, update the existing
   resource's saved Compose if it was pasted rather than Git-backed, then deploy.
   Keep encryption keys and volumes stable. Inspect startup stages and both
   service health checks; confirm the expected build in the admin panel.
4. Verify the live entry independently:

   ```sh
   node packages/twenty-docker/scripts/verify-account-entry.mjs \
     --url https://bureau.example.com \
     --revision <full-tested-commit-sha> --build-id <build-number.attempt>
   ```

The CLI checks frontend/server build identity and server PostgreSQL/Redis
readiness. It does not authenticate as a user or inspect the private worker.
Image acceptance checks worker revision and build; the native admin health/queue
views and target-host logs remain necessary for live worker acceptance.

CD serializes image publications. Only a tested build still matching current
main can move `latest` and trigger its optional deployment webhook. Historical
main reruns publish identity tags without rolling back the channel; release tags
do not move `latest`. A release tag must match `package.json`. Unique build tags
are also published; production should still use the digest to distinguish reruns.

## Automatic digest-pinned main deployments

The CD workflow supports an authenticated Coolify API path. Set these repository
Actions settings once; never place the token in a repository variable:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `COOLIFY_API_TOKEN` | Dedicated team token with `read`, `write`, and `deploy`; it updates the image variable/application revision and queues a deployment. |
| Variable | `COOLIFY_URL` | Coolify HTTPS origin, without `/api/v1` or `/mcp`. |
| Variable | `COOLIFY_APPLICATION_UUID` | Exactly one existing production application UUID. |
| Variable | `A2E_PUBLIC_URL` | The application's public HTTPS origin. Required before an API deployment can begin. |

Turn off Coolify's Git-push auto-deploy on this application. The CD workflow must
own deployment after candidate acceptance; Git-push auto-deploy can run before a
new image exists. Keep the existing digest until the first automated release.
Do not change database credentials, encryption keys or volume names for releases.

After promotion, CD rechecks current main and the deploy script verifies the
selected application belongs to `maxx-abrt/A2E-Suite`, uses `main`, and is a Compose
application. It updates only production `A2E_IMAGE` to the tested digest, pins the
application's Git commit to that same revision, and requests a deployment for
that UUID alone. It waits up to approximately 30 minutes for Coolify completion;
the existing public verifier then checks frontend/backend build identity and
PostgreSQL/Redis readiness. No digest editing is needed for subsequent merges.

The API route takes precedence over the legacy optional deploy webhook. The
workflow's image tests gate release; independent repository CI workflows are not
implicitly dependencies. Configure required PR checks separately when needed.
A failed API response never prints its body, which may contain secrets or logs.
A failed/ambiguous deployment is not automatically retried or rolled back: schema
upgrades can make an automatic image downgrade unsafe. Inspect the deployment
UUID and recover deliberately. A published image is not a successful deployment.

For activation, integrate this workflow and script through a reviewed feature
branch, configure the settings above, then observe a real main delivery. Confirm
both `Deploy tested release to Coolify` and `Verify deployed account entry` pass;
inspect server/worker health in Coolify. Until then automation is prepared, not
verified active. Semantic version remains deliberate in package.json; commit,
build number/attempt, timestamp and image digest identify each automatic build.

This Compose application recreates the stack during a deployment. Public requests
can return 503 while the API upgrades and starts; this path does not provide
zero-downtime rolling upgrades. Avoid concurrent manual redeploys while CD owns
a release. Persistent database, queue and file volumes retain their identities.

## Review a fresh resource's environment

Use the [production template](../packages/twenty-docker/coolify.production.env.example)
with newly generated secrets and a tested image digest. Do not copy secrets
from chat messages or the old test resource. Revoke exposed provider API keys;
keep old application encryption keys if old encrypted data still needs recovery.
A fresh resource needs new scoped database, queue and file volumes: restarting
the existing stack or changing only `PG_DATABASE_NAME` is not a clean instance.
Do not delete the test resource to create production.

| Setting | Fresh-resource contract |
| --- | --- |
| `A2E_IMAGE` | Complete tested `ghcr.io/...@sha256:...` reference. Do not set `APP_VERSION`, `APP_REVISION`, `APP_BUILD_ID` or `APP_BUILD_DATE` manually; they come from that image. |
| `SERVER_URL` | Final public HTTPS origin, without the container/host port or a trailing slash. It does not create a Coolify proxy route by itself. |
| `SERVER_BIND_ADDRESS`, `SERVER_PORT` | `127.0.0.1`, `0` when the integrated proxy targets `server:3000`. Keep a fixed host port such as `8088` if a host proxy/tunnel actually depends on it. Never assign the same fixed port to both resources. |
| `PG_DATABASE_NAME`, `PG_DATABASE_USER`, `PG_DATABASE_PASSWORD` | New database such as `a2e_prod`, default user `postgres`, independently generated hex password. Compose embeds credentials in a URL; raw reserved URL characters are unsafe here. |
| `PG_DATABASE_HOST`, `PG_DATABASE_PORT` | Omit for the bundled database; empty values resolve to `db`, `5432`. Setting an external host does not remove the bundled database or its startup dependency. |
| `REDIS_URL` | `redis://redis:6379` on this resource's private network. Never share the test queue with production. |
| `ENCRYPTION_KEY`, `APP_SECRET` | Generate independently and retain securely. Compose preserves the legacy fallback from an empty `APP_SECRET` to `ENCRYPTION_KEY`; use an independent secret for a new production. |
| `FALLBACK_ENCRYPTION_KEY` | Empty on a new database. During an actual rotation it must be the exact previous key, not a shortened/modified copy. |
| `LOGIC_FUNCTION_TYPE`, `LOGIC_FUNCTION_LOCAL_API_URL` | `LOCAL`, `http://server:3000`. Internal hooks avoid a round trip through the public proxy/Cloudflare; public user links still use `SERVER_URL`. |
| `DISABLE_BUNDLED_APP_PROVISIONING` | `false` for normal server boot. Empty also enables it, but the explicit value is easier to audit. The worker always disables its own provisioning/migrations. |
| `EMAIL_DRIVER`, `RESEND_API_KEY` | `RESEND` and a new provider key for REST mail. `EMAIL_SMTP_*` values are unused in this mode and can be omitted from the resource. No variable-to-variable SMTP password expression is needed. |
| `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` | A sender on a domain verified in Resend and the display name. A syntactically valid address does not prove domain verification or inbox delivery. |
| `IS_EMAIL_VERIFICATION_REQUIRED` | Keep `false` through the first real delivery/reset/invitation tests; enable before opening public self-service signup. |
| `IS_SHARED_DOMAIN_WORKSPACE_ENABLED`, `IS_MULTIWORKSPACE_ENABLED` | `true`, `false` intentionally support independent workspaces on one origin without wildcard subdomains; these values do not conflict. |
| `IS_WORKSPACE_CREATION_LIMITED_TO_SERVER_ADMINS` | `false` permits public self-service creation; `true` restricts new workspace creation after the first workspace while preserving authorized invitations. Choose explicitly. |
| `DEFAULT_SUBDOMAIN`, `LANDING_PAGE_URL` | Keep `app` as the default subdomain. Leave the optional marketing URL empty when there is no separate landing site. Neither requires another domain for shared-origin workspaces. |
| `STORAGE_TYPE` | `local` is supported; back up `server-local-data` as well as PostgreSQL. S3 app storage is optional and distinct from Coolify's S3 backup destination. |
| `A2E_RECOVERY_TARGET_DATABASE`, `A2E_RECOVERY_APPLY` | Empty, `false`. A nonempty target deliberately keeps normal API startup offline in recovery mode. |

The actual Compose mappings determine which resource variables enter each
container. Arbitrary extra variables in the Coolify UI are not automatically
passed through. For non-env-only application settings, a value saved in the
native admin panel/database takes precedence over the environment; inspect its
reported configuration source if an existing instance ignores an env change.
Infrastructure credentials and encryption keys remain env-only.

Shared-origin routing does not raise the application's workspace-count limit:
the current [native signup guard](../packages/twenty-server/src/engine/core-modules/auth/services/sign-in-up.service.ts)
allows at most five workspaces without a valid enterprise key. Public signup
therefore needs both product entitlement and host-capacity review before wider
use; adding an environment variable does not bypass this guard.

Create each application secret independently with `openssl rand -base64 32`,
and a URL-safe database password with `openssl rand -hex 32`, on a trusted
machine. Store the outputs directly in Coolify/password storage; never commit
them. Do not regenerate keys on every deploy. PostgreSQL initialization values
only initialize a new empty data volume: changing `PG_DATABASE_PASSWORD` in
Compose does not rotate the password of an existing database role.

Before routing the final domain, test the new resource on a distinct temporary
HTTPS hostname with matching `SERVER_URL`. Keep each hostname routed to only
one stack, then switch the route and application URL together. On a shared 8 GB
host, avoid leaving two full stacks running when memory pressure is observed;
stopping the old test stack preserves its volumes. No low memory limit or
extra replica is selected without measurements.

## Automatic read-only deployment audit

The [Deployment health workflow](../.github/workflows/ci-deployment-health.yaml)
runs hourly or manually after integration. Configure these repository variables:

| Variable | Meaning |
| --- | --- |
| `A2E_PUBLIC_URL` | Public HTTPS entry to audit; an empty value skips the job. |
| `A2E_EXPECTED_REVISION` | Production's pinned full commit SHA. Empty follows the latest successful main image run. |
| `A2E_EXPECTED_BUILD_ID` | Pinned build number/attempt; use it with the pinned revision for exact rerun detection. |

The audit does not deploy or change configuration. It fails if readiness,
frontend/backend identity or the expected release differs. GitHub scheduled jobs
are best effort; this is not a replacement for a dedicated uptime service.
Proxy/firewall challenges can also fail the check and must be diagnosed from
its output, without treating a Cloudflare page as healthy app JSON.

For an intentionally automatic main channel, CD also supports
`COOLIFY_DEPLOY_WEBHOOK`. Its target and image-selection policy must match the
audited resource. Do not use an unconditional latest-channel webhook as a way to
advance digest-pinned production. Repository settings and schedules are not
activated by editing this guide or by running local unit tests.

## Configure automatic backups in Coolify

Use Coolify's existing scheduler rather than another backup daemon. Its
[database backup guide](https://coolify.io/docs/databases/backups) covers
PostgreSQL inside a Service as well as standalone resources.

1. Open the production `db` component's **Backups** page and add a schedule.
   Choose **Specific databases** and the actual `PG_DATABASE_NAME`, such as
   `a2e_prod`. A selected PostgreSQL database uses a custom-format logical dump.
   Confirm resolved `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB`; the
   Compose file maps all three. The app and Coolify use distinct encryption keys.
2. For an initial small deployment, an hourly schedule (`0 * * * *`) gives a
   nominal database recovery point of up to an hour **only while backups keep
   succeeding**. Check the timezone shown by Coolify; it follows the configured
   server/instance timezone. Choose frequency from actual acceptable data loss
   and measured backup load on the shared host.
3. Configure a private, validated S3-compatible destination on a different
   physical host/provider. Enable S3 on the schedule. Start with a bounded local
   retention and a longer remote retention appropriate to database size, such as
   seven local copies and fourteen remote days; check space consumption. Every
   configured count/day/size limit can independently expire older backups.
4. Run **Back up now**. Inspect the execution: correct database, nonempty file,
   successful dump **and successful off-host upload**. A local success with an
   S3 warning is not an off-host backup. Configure Coolify failure notifications
   and check backup age; this repository has no access to confirm your schedules.
5. Download/restore a backup into an isolated resource and test actual accounts,
   permissions, records, encrypted fields and files. Never test restore by
   overwriting production. Record the tested recovery time and recovery point.

The candidate image smoke also performs a native `pg_dump`/`pg_restore` drill
into a separate database, then boots server/worker on it and checks installed
apps and starter records. That detects release regressions; it does **not**
verify the backups stored by your running Coolify instance.

## Files, queues and keys

Database backups alone do not protect uploaded files. For local storage, create
a [persistent-storage backup](https://coolify.io/docs/core/persistent-storage/storage-mounts/backups)
for `server-local-data` and enable its off-host copy. For a consistent full
recovery point, quiesce app/worker writes across both database and file capture.
Independent live schedules are not an atomic application snapshot. Never archive
a running PostgreSQL data directory as an ordinary file backup.

For a fresh production, native S3 application storage can reduce reliance on
the host's file volume. Both app services now receive the existing `STORAGE_S3_*`
settings. Configure a private bucket, suitable provider region/endpoint and
restricted credentials before real uploads; test uploads/downloads and worker
access. Enable provider versioning/retention according to the restore plan.
Changing `STORAGE_TYPE` does not migrate existing files. Keep the local volume
backup until the actual application/file restore has been verified.

Redis AOF and its persistent volume retain queues across recreation, with a
small possible loss window during abrupt host failure. They are not off-host
backups. Coordinate any queue recovery with database/file recovery and the native
idempotent job handlers; blindly replaying old jobs against newer data is unsafe.

Store `ENCRYPTION_KEY`, `APP_SECRET`, any fallback encryption key, database and
storage credentials outside the host in a password manager. Also back up Coolify
itself and preserve its separate `APP_KEY`, as documented in
[Coolify instance recovery](https://coolify.io/docs/core/backup-and-recovery/instance-backup).
Do not put secrets in release artifacts or GitHub repository variables.

## Container and database safeguards

- The app image runs as UID 1000. Server/worker have an init process, no added
  Linux capabilities and no-new-privileges, plus a 120-second shutdown grace.
  Worker starts Node directly. HTTP shutdown uses native Nest hooks, including
  the existing usage flush and provider cleanup. Long jobs still need idempotent
  retry; a stop deadline is not a promise every job finishes.
- The default published HTTP binding is loopback. Coolify routes to container
  port 3000; plain Docker hosts needing remote direct access can explicitly set
  `SERVER_BIND_ADDRESS=0.0.0.0` with appropriate firewall controls. PostgreSQL and
  Redis publish no host ports. Container logs rotate at three 10 MB files each.
- New PostgreSQL volumes initialize with data checksums. This does not enable
  them on an existing cluster. Candidate smoke also requires `fsync`,
  `full_page_writes` and `synchronous_commit` to remain enabled. Checksums detect
  corruption; they do not replace backups, reliable storage or a tested restore.
- Build contexts exclude environment files, local uploaded data, browser sessions
  and reference-app trees. Production configuration belongs in Coolify. Weekly
  Dependabot maintenance is configured for Actions and the runtime Dockerfile,
  with bounded grouped PRs and no automatic major upgrade or merge.

These safeguards do not provide high availability on a single home host. The
final Linux image, target-host startup, backup schedules/uploads and restore/load
acceptance must pass before treating the instance as production-ready.
