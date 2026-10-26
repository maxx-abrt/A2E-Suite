# Deploy A2E Suite on Coolify

## Scope and release prerequisites

This guide describes the repository's **existing GitHub/GHCR → Coolify path**,
not an automatically configured release pipeline for the GitLab fork. Confirm
the authoritative build project, registry, tested immutable image and deployment
owner before using it. A GitLab push alone does not run `.github/workflows`.
The owner/registry shown below are legacy configuration examples, not proof that
this checkout publishes there or that those resources are public.

[Documentation home](docs/README.md) · [Applications provisioning](docs/applications.md)

- Platform deployment now includes A2E app provisioning: the production image
  contains built tarballs for seven A2E apps (Documents, Bilan, Projects,
  Chat, Drive, CRM assistant and Links). `app:provision-bundled` registers
  them; `install-pre-installed-apps --defer-post-install` installs their
  metadata before HTTP starts. Post-install hooks run through the worker
  after API readiness. Interactive installations still wait for synchronous hooks.
  Set `DISABLE_BUNDLED_APP_PROVISIONING=true` to opt out (e.g. for pinned-version
  deployments); every compose file passes it through to the server. Provisioning
  runs on the server only — workers set `DISABLE_BUNDLED_APP_PROVISIONING=true`,
  and any container with `DISABLE_DB_MIGRATIONS=true` skips it unless you set
  `DISABLE_BUNDLED_APP_PROVISIONING=false`. See [Applications provisioning](docs/applications.md).
- Supported infrastructure matrix: **PostgreSQL 16** (hard runtime floor: 14 —
  the server refuses to boot below it) and **Redis 7**. All compose files pin
  `postgres:16` / `redis:7` accordingly. Do not treat a healthy HTTP process
  as proof upgrades succeeded; inspect migration and worker results
  (audit F09/F10).
- Back up and rehearse restore before upgrades. Never change registry/package
  visibility or deploy production as an incidental documentation task.

The following setup is a starting runbook to adapt and verify, not a timed or
certified deployment promise.

## Architecture

```
GitHub (your private repo)          Coolify server (VPS)
┌──────────────────────────┐        ┌─────────────────────────────┐
│ push main                │        │ 4 Docker containers:        │
│   ↓ GitHub Actions       │  pull  │   server  (API + web, :3000)│
│   ↓ builds Docker image  │ ─────→ │   worker  (background jobs) │
│   ↓ pushes to GHCR       │        │   db      (Postgres 16)     │
│ ghcr.io/maxx-abrt/       │        │   redis                     │
│ a2e-suite:latest         │        │ + Traefik proxy + HTTPS     │
└──────────────────────────┘        └─────────────────────────────┘
```

- The image already contains backend **and** frontend. Database migrations run
  automatically on first boot. You never touch SQL.
- Files involved (already in this repo, just push them):
  - [`.github/workflows/cd-docker-image.yaml`](.github/workflows/cd-docker-image.yaml) — builds the image
  - [`packages/twenty-docker/docker-compose.coolify.yml`](packages/twenty-docker/docker-compose.coolify.yml) — what Coolify runs
  - [`packages/twenty-docker/twenty/Dockerfile`](packages/twenty-docker/twenty/Dockerfile) — the image definition (read-only for you)

---

## Part 1 — On your Mac: push the deployment files

Use your reviewed branch/MR and the maintainer-approved release process.
These files are already tracked: do not create a deployment commit or push
straight to `main` just to follow this guide. Confirm where the GitHub workflow
actually runs if your source of truth is GitLab.

Then wait for the build to finish **before** touching Coolify:

1. Open https://github.com/maxx-abrt/A2E-Suite/actions
2. Watch **"CD Docker image"** through **Test candidate with the Coolify stack**
   and **Promote tested image**. The build first uploads a candidate; only the
   tested digest receives `latest`, package-version and commit-SHA tags. This
   does not by itself prove the running Coolify service updated.
   The first build can take 30–40 minutes; caching speeds up later builds.
3. Check the image exists: https://github.com/maxx-abrt?tab=packages
   → package `a2e-suite`.

Make the image public (Coolify pulls it without credentials):

> GitHub → your package page `a2e-suite` → **Package settings** →
> **Danger Zone** → **Change visibility** → Public.

Only make an image public after approval and an artifact/secrets review;
runtime secret injection alone does not establish that the built layers are
safe to publish. Otherwise use the private-registry configuration below.

## Part 2 — In Coolify: allow the private repo

One-time. Coolify → sidebar **Sources** → **GitHub** → **Install GitHub App**
→ authorize it for `maxx-abrt/A2E-Suite`. Coolify can now clone your repo.

## Part 3 — In Coolify: create the app

**+ New Resource → Docker Compose**, then on the repository configuration
screen fill exactly:

| Field             | Value                                                  |
| ----------------- | ------------------------------------------------------ |
| Repository URL    | `https://github.com/maxx-abrt/A2E-Suite.git`           |
| Branch            | `main`                                                 |
| Build pack        | `Docker Compose`                                       |
| **Base directory**| **(empty — delete the `/`, leave blank)**              |
| Compose file      | `packages/twenty-docker/docker-compose.coolify.yml`    |

⚠️ The only trap on this screen: **Base directory must be empty**. If you put
`/` or `.`, Coolify shows `Resolved file: null/...` and gets stuck. Empty field
→ resolved path shows `/packages/twenty-docker/docker-compose.coolify.yml` →
**Continue**.

Coolify asks "build these services?" — answer **no / skip** everywhere. The
compose file only references a prebuilt `image:`; nothing is compiled on the
server.

### Plan B — paste the compose (bypasses the repository screen entirely)

If the repository screen keeps showing `Resolved file: null/...` after
clearing Base directory, skip git cloning completely (the stack is 100%
image-based and both the repo and the GHCR package are public):

1. Coolify → **+ New Resource** → **Docker Compose** → choose **Empty**
   (creates the resource without any git source).
2. On the resource page, **Docker Compose** section → **Edit Compose File**
   → paste the full content of
   [`packages/twenty-docker/docker-compose.coolify.yml`](packages/twenty-docker/docker-compose.coolify.yml)
   → **Save**.
3. Continue with Part 4 (env vars) and Part 5 (domain) below. Coolify never
   needs to clone the repo for this method.

For the git screen itself, the null fix stays: Base directory truly empty
(not `/`), Compose file exactly
`packages/twenty-docker/docker-compose.coolify.yml`, no trailing spaces in
either field.

## Part 4 — In Coolify: the 3 required env vars

Resource page → tab **Environment Variables** → add:

| Name                  | Value                          | How to get it                              |
| --------------------- | ------------------------------ | ------------------------------------------ |
| `SERVER_URL`          | `https://YOUR-DOMAIN.com`      | your final public URL, with `https://`     |
| `ENCRYPTION_KEY`      | e.g. `80OH8hsIj0lOznqf+lMpy…`  | run locally: `openssl rand -base64 32`     |
| `PG_DATABASE_PASSWORD`| e.g. `9f3ac2b6e01d47c8aa12bb`  | run locally: `openssl rand -hex 16`        |

Rules:
- `PG_DATABASE_PASSWORD`: letters/digits only — it is embedded in a
  connection URL, special characters break it.
- Generate each value **once** and keep a copy in a password manager.
- Never change `ENCRYPTION_KEY` later without moving the old one into
  `FALLBACK_ENCRYPTION_KEY` (encrypted data in the DB depends on it).

Everything else has a sane default (Postgres user/db, Redis URL, local file
storage). Email settings are passed to both server and worker; configure them
in the same tab when needed. For account verification, password resets and
invitations through Resend, follow the [transactional email guide](docs/resend-email.md).
Do not enable required email verification until a real delivery journey passes.
S3 storage and Google/Microsoft SSO remain optional extras.

## Part 5 — Domain + deploy

1. Resource page → **Domains** (or the domain field of the `server` service):
   enter `https://YOUR-DOMAIN.com`, service `server`, port `3000`.
   Coolify's proxy issues the Let's Encrypt certificate automatically.
2. DNS: in your registrar, point `YOUR-DOMAIN.com` (A record) to the VPS IP
   shown by Coolify. Wait for propagation (usually minutes).
3. Click **Deploy**.

What you will see in the deploy logs, in order (all normal):

```
Pulling images (server, worker, db, redis)     ~1 min
db / redis become healthy                       ~10 s
server: "Running database setup and migrations" ~1–3 min, first boot only
worker starts
healthz → healthy
```

Then open `https://YOUR-DOMAIN.com` → create your account (first user =
workspace owner). **Done.**

## Part 6 — Everyday use

| Action              | What to do                                                                        |
| ------------------- | --------------------------------------------------------------------------------- |
| Update the app      | `git push` on `main` → Actions rebuilds → in Coolify click **Deploy** (re-pulls)  |
| Fully automatic     | Coolify resource → **Webhooks** → copy "Deploy" URL → GitHub repo → Settings → Secrets → Actions → add secret `COOLIFY_DEPLOY_WEBHOOK` = that URL. Every push then redeploys by itself. Also enable "Pull new images before deploy" in Coolify server advanced settings. |
| Pin a version       | env var `TAG=0.2.1` (image tags follow package.json version + commit sha)         |
| View logs           | Coolify → resource → each service has a Logs tab                                   |
| Stop / start        | Coolify power buttons (data volumes are preserved)                                 |

### Backup and restore requirements

Confirm actual volume names in your deployment; the Compose project prefix can
change them. Protect both PostgreSQL and uploaded files (local volume or object
storage), plus encryption keys/configuration in a separate secret store.

**Do not tar a live PostgreSQL data directory.** Use a database-consistent
logical backup (`pg_dump`/`pg_restore`, with required roles/globals handled) or
a supported physical backup/PITR process. Coordinate database and file-storage
recovery points; database-only backup cannot restore uploaded content.

Before relying on a backup, restore it to an isolated instance, verify migrations,
workspace records, permissions, file downloads, encrypted data and worker jobs.
Record the tested image/database versions, retention, recovery point and recovery
time. Do not experiment against production or include keys in reports.

### Restore drill — rehearsed procedure (2026-09-13, dev environment)

A logical-backup restore was rehearsed end to end against a scratch database on
the same PostgreSQL 16 instance; treat the commands below as the baseline to
repeat on each deployment target before relying on a backup.

```bash
# 1. Backup (custom format, compressible, restorable with selective recovery)
pg_dump -h <host> -U postgres -Fc -d <database> -f backup-YYYYMMDD.dump

# 2. Restore into an ISOLATED scratch database (never over the live one)
createdb -h <host> -U postgres <database>_restore_drill
pg_restore -h <host> -U postgres -d <database>_restore_drill \
  --no-owner --no-privileges backup-YYYYMMDD.dump

# 3. Verify content parity, then run the migration gate on the copy:
#    node dist/command/command.js run-instance-commands
PG_DATABASE_URL="postgres://<host>:5432/<database>_restore_drill" \
  node dist/command/command.js run-instance-commands
```

Verified during the drill:

- `pg_restore` exits 0; workspace/user counts, roles/role-targets, API keys,
  installed apps (name + version), documents, workflows and file rows match
  the source database exactly.
- Encrypted-at-rest rows (`core."signingKey"`, application variables) restore
  byte-identical — `ENCRYPTION_KEY` (and `FALLBACK_ENCRYPTION_KEY` when used)
  must be part of the same recovery point or the data is unrecoverable.
- The migration gate refuses to run when any workspace has not completed its
  last workspace command (mid-upgrade state is detected, not silently
  accepted) and is a clean no-op when the copy is already current.
- Local file storage (`server-local-data` volume →
  `packages/twenty-server/.local-storage`) is keyed by
  `{workspaceId}/{applicationId}/…`; `core.file` rows store paths relative to
  that scope. Back up the volume together with the database — a database-only
  backup leaves app source/tarballs and uploads missing.

Readiness vs liveness (audit F10, partially addressed): `/healthz` remains a
liveness-only probe (process up), while `/readyz` now checks database and Redis
connectivity on the server, and the worker serves its own `/readyz` on port
3099 (`WORKER_HEALTH_PORT`) wired into its compose healthcheck. Migrations run
before traffic routing through the entrypoint gate, not inside the probes.
Inspect server/worker logs after upgrade if a deployment misbehaves.

## Realtime gateway requirements (WebSocket + Redis)

The A2E realtime gateway carries presence, chat and inbox live updates to the
front end. A self-hosted deployment must satisfy both halves of its transport:
the WebSocket upgrade and Redis.

### WebSocket

- The gateway is a raw `ws` server mounted on the **same HTTP port as the
  API** (default 3000) at path **`/realtime`** — there is no separate
  WebSocket port. Source:
  [realtime-gateway.service.ts](packages/twenty-server/src/engine/core-modules/realtime-gateway/services/realtime-gateway.service.ts),
  path constant in
  [realtime-gateway.constants.ts](packages/twenty-server/src/engine/core-modules/realtime-gateway/realtime-gateway.constants.ts).
- The browser derives its URL from `SERVER_URL` as `ws(s)://<host>/realtime`
  ([RealtimeConstants.ts](packages/twenty-front/src/modules/realtime/constants/RealtimeConstants.ts)).
  A reverse proxy must therefore forward `Upgrade`/`Connection` headers for
  `/realtime` on the API port, not just plain HTTP.
- The server pings every 15 s and terminates a socket that misses a pong
  (`REALTIME_HEARTBEAT_INTERVAL_MS`). Set the proxy idle/read timeout **above
  ~30 s** so idle WebSockets are not cut. The server keep-alive is 65 s
  (`SERVER_KEEP_ALIVE_TIMEOUT_MS`) by design.
- GraphQL subscriptions / SSE responses share the HTTP API; the proxy must not
  buffer streaming responses either.
- The shipped Kubernetes ingress and Helm values do **not** set WebSocket or
  timeout annotations — a self-hoster adding an ingress controller must add
  them explicitly.

### Redis

- **Redis is required.** The compose files run `redis:7` with
  `--maxmemory-policy noeviction` and a `redis-cli ping` healthcheck; server
  and worker wait for it to be healthy.
- The gateway fans out through Redis pub/sub on channels prefixed
  **`a2e:rt:`** ([realtime-publisher.service.ts](packages/twenty-server/src/engine/core-modules/realtime-gateway/services/realtime-publisher.service.ts)),
  with topics shaped `workspace:<id>[:kind:scope]`. Presence uses short-lived
  Redis keys (45 s connection, 5 s typing).
- Set **`REDIS_URL`** (compose default `redis://redis:6379`). An optional
  **`REDIS_QUEUE_URL`** sends BullMQ to a separate instance; otherwise the
  queue reuses `REDIS_URL`. Both are read in
  [redis-client.service.ts](packages/twenty-server/src/engine/core-modules/redis-client/redis-client.service.ts).
- The worker needs Redis for BullMQ and can publish gateway topics from jobs;
  with no HTTP adapter it serves **no** WebSocket port. Worker readiness on
  `WORKER_HEALTH_PORT` (3099) checks database and Redis.
- If Redis is unavailable: `/readyz` fails, presence operations throw, a topic
  subscribe is rejected with an `error` envelope instead of a false `ack`, and
  a publish is logged and dropped. Clients keep durable records and refetch
  after reconnecting.

### What the transport does not guarantee

Redis pub/sub is **fan-out, not a replay log**. Sequence numbers are
per-socket and reset on reconnect, so the gateway is at-most-once: a client
that misses events must refetch the authoritative records (chat messages,
inbox rows) rather than replay them from the socket. See the
[architecture audit](docs/repository-architecture-audit.md) (F02/F06) for the
current authentication and recovery gaps.

## Troubleshooting

### Server unhealthy after a successful upgrade

`Upgrade summary: ... 0 workspace(s) failed` followed by `Message queue
shutdown complete` is the normal end of the **upgrade CLI**, not evidence that
the HTTP server started. The entrypoint still has to flush caches, provision
bundled apps, install them and register jobs before starting the server.
New images print `[startup] step=... status=started|succeeded|failed` with
duration and failure exit code, then `step=runtime status=starting`.

The CLI now always closes its Nest application after command execution and
explicitly exits after draining output. A retained library socket can otherwise
leave a successful upgrade alive and block every later entrypoint step. Cleanup
has a 30-second deadline that exits **nonzero** on a stalled hook; migration
execution itself has no new deadline. Command errors and interruption statuses
remain failures. This change requires a rebuilt image; editing saved Compose
alone cannot change the CLI inside an existing image.

On the Docker host, inspect the existing server container (replace the name
with the one from the failed deployment):

```sh
docker inspect --format '{{json .State}}' server-qaegxmt0bkr7e3bizqifg05r
docker inspect --format 'image={{.Config.Image}} image_id={{.Image}}' server-qaegxmt0bkr7e3bizqifg05r
docker logs --timestamps --tail 2000 server-qaegxmt0bkr7e3bizqifg05r
```

The state includes the actual health-probe output, exit code and OOM flag.
Connection refused means no HTTP listener answered; HTTP 503 with database or
Redis details means the listener is running but a dependency is unavailable.
Check the first failed or unfinished startup step before changing timeouts.
The worker waiting for `service_healthy` is expected while the server is
unhealthy. Preserve the service, database/file volumes and existing secrets.

The initial 2026-10-26 excerpt ended after successful upgrades. Later logs
showed Cloudflare 502 during pre-installed app hooks: those synchronous hooks
called the public API before the entrypoint had launched HTTP. Startup now
queues post-install hooks in the existing logic-function queue. A metadata or
queueing failure still fails startup; starter content completes with the worker.

The Coolify Compose files also set `LOGIC_FUNCTION_LOCAL_API_URL=http://server:3000`
on both services. Local SDK calls stay on the Docker network, while `SERVER_URL`
continues to control public links. Outside this Compose stack, the optional
setting defaults to `SERVER_URL`. Lambda functions continue to use `SERVER_URL`
and ignore this local-only setting.

### Image acceptance before publication

Both Docker CI and CD use the real Coolify Compose file and its readiness grace
period, rather than the older general-purpose Compose configuration. The smoke
check starts an isolated fresh database, creates a native light development
workspace while the worker is stopped, then recreates the server and worker.
It requires every bundled app to install before readiness, and verifies that
the worker actually creates the shipped document templates, twelve starter
projects with their tasks and milestones, and two discussion channels through
the internal API. Template/task/milestone counts come from the shipped bundles. Another restart checks that
content counts stay stable. Database registration IDs and a file-volume marker
must survive recreation; frontend/backend revisions must match the tested SHA.

CD tests the build's immutable registry digest before promoting that same digest
to release tags. A failed smoke check prevents promotion and the optional
Coolify webhook. Diagnostics are uploaded as an Actions artifact, including
startup logs, container health/exit/OOM state and resource usage. These checks
run on disposable CI volumes; their cleanup never targets production volumes.
The native development workspace and its sample accounts exist only in that
isolated test stack. This startup check does not replace browser acceptance or
a database/file backup restore drill.

For an existing Empty Compose resource, update the saved configuration from
[`docker-compose.coolify.yml`](docker-compose.coolify.yml), preserving its
existing volume mappings and secrets. Wait for the new CD acceptance steps to
pass, select its full commit SHA as `TAG`, then deploy the existing resource.
Both the rebuilt image and updated saved Compose are needed for this correction.
When terminal access is unavailable, use the server/worker Logs tabs and the
Actions diagnostics artifact; a Cloudflare HTML page is not container health
output.

| Symptom                                  | Cause / fix                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `Resolved file: null/...` on repo screen | Base directory not empty → clear it (Part 3)                           |
| Coolify can't clone the repo             | GitHub App not installed/authorized (Part 2)                           |
| Deploy fails: `pull access denied` GHCR  | Package still private → make public, or add registry creds below       |
| `server` crash-loops about ENCRYPTION_KEY| Var missing or changed after first boot → restore original value       |
| 502 / certificate error                  | Domain not attached to service `server` port 3000, or DNS not propagated |
| Migrations seem stuck                    | Watch logs; first boot can take 3 min on a small VPS — it finishes     |
| OAuth/SSO redirect errors                | `SERVER_URL` must match the public URL exactly (scheme + host)         |

## Private registry (only if you kept the GHCR package private)

1. GitHub → Settings → Developer settings → Personal access tokens (classic)
   → generate with scope `read:packages`.
2. Coolify → **Servers** → your server → **Registries** → add:
   registry `ghcr.io`, username = your GitHub username, password = the token.
3. Redeploy.

---

Reference (deeper detail, plain-Docker alternative, S3/SMTP/SSO env tables):
[`packages/twenty-docker/SELF-HOSTING.md`](packages/twenty-docker/SELF-HOSTING.md)

## Coolify recovery and verifying updates (2026-10-22)

An Empty Compose service stores its own Compose configuration. A Git push does
not replace that saved configuration. Update the **existing service** with
`docker-compose.coolify.yml` from this repository, preserve its database/file
volumes and secrets, and save before deploying. Do not create another service
as an update: it can receive different persistent volumes.

Both services use `LOGIC_FUNCTION_TYPE=LOCAL` for bundled application actions.
`APP_SECRET` defaults to `ENCRYPTION_KEY`, rather than an empty value. The server
gets a five-minute startup grace period for migrations/provisioning. The worker
waits for server readiness and has its own probe on port 3099. Empty worker logs
while the server is unhealthy mean it may not have started yet.

Wait for **CD Docker image** to succeed before redeploying. A failed build does
not update `latest`. Prefer setting `TAG` to the full Git commit SHA from a
successful build; both services then use the same reproducible image. The
entrypoint prints `revision=...` and the image carries the OCI revision label.
Compare that revision with the intended commit after deploying. Package-version
tags and `latest` are mutable. The shipped pull policy requests the selected
image on deployment; restarting an existing container alone does not update it.

A healthy `/readyz` proves database/Redis connectivity, not every app journey.
Check server provisioning output and Settings → Applications, then open Bureau.
Provisioning failures now stop startup instead of silently serving missing apps;
fix the reported package/workspace error and retry. The explicit
`DISABLE_BUNDLED_APP_PROVISIONING=true` opt-out remains available for deployments
that intentionally manage app installation separately.

### Accounts and workspaces on one domain

The A2E production image and both Coolify Compose copies default to
`IS_SHARED_DOMAIN_WORKSPACE_ENABLED=true` on **both server and worker**. Set
`SERVER_URL=https://bureau.serveurmax.store` (or your own public app URL).
If `FRONTEND_URL` is configured separately, it must be the public browser origin.
No workspace subdomains or wildcard DNS are needed in this mode.

The root shows a public landing page to signed-out visitors. `/welcome` is the
native global account form: a different email signs into its own account or
registers independently, then creates or selects an authorized workspace.
Logout revokes the native session, clears previous workspace hints and returns
to the root. Explicit invitations still join their target workspace. Workspace
links exchange native signed login tokens and reload the document before
loading another workspace's metadata. Native membership, auth-provider, 2FA,
server-admin creation restrictions and enterprise workspace limits remain in
force. This does not add concurrent independent workspace cookies per tab.

**Deploying the new image is required:** preserve the existing service, volumes
and secrets. The image default activates shared-domain mode even when an older
saved Compose does not pass the new flag; an explicit `false` or database
configuration override must be reviewed separately. A Git push does not update
saved Compose configuration. Use the current root Compose for the other
readiness, mail and provisioning settings too. Confirm `/client-config` reports both
`isSharedDomainWorkspaceEnabled: true` and `isMultiWorkspaceEnabled: true`.
The latter describes native account/workspace features; it does not imply
subdomain routing when shared-domain mode is enabled. The shared-domain flag
takes precedence if both routing flags are enabled.

For an existing domain-based Twenty deployment, explicitly set
`IS_SHARED_DOMAIN_WORKSPACE_ENABLED=false`, retain
`IS_MULTIWORKSPACE_ENABLED=true`, and configure `DEFAULT_SUBDOMAIN`, wildcard
DNS, TLS and proxy routing together. For a deliberately single-workspace
instance, set both flags false; unrelated users still need invitations there.

After release, verify in a private browser: root → account form → account A's
workspace → logout → a new email → new workspace, then sign into an existing
account with a different membership. Also check invitations, reset emails,
required 2FA and workspace switching. A public landing screenshot alone does
not verify account creation or mail delivery.

### Build failures and exact deployed version

The root deployment file is `docker-compose.coolify.yml`: it **pulls** the image
from GHCR. GitHub builds that image from
`packages/twenty-docker/twenty/Dockerfile`, target `twenty`, with the repository
root as context. There is no separate root Dockerfile to edit.

The 2026-10-23 failed image build could not resolve
`twenty-shared/application` from isolated app builds. Later app successes hid
the original error in the shell loop, and archive collection eventually failed.
The bundled-app stage now inherits the built native shared package from the
server build, stops at the first failure and validates every archive. Host
`.twenty` state and frontend/server build outputs are excluded from the context.
The image always compiles the frontend from source.

After the reviewed change is merged and **CD Docker image** publishes it, set
Coolify's `TAG` to that build's full commit SHA and redeploy the existing stack.
Verify the public service from the repository root with Node 24:

```sh
node packages/twenty-docker/scripts/verify-account-entry.mjs \
  --url https://bureau.serveurmax.store \
  --revision <full-40-character-commit-sha>
```

This requires healthy database/Redis checks from `/readyz`, `appRevision` from `/client-config` and `revision` from
`/release.json` to match the expected SHA, both account/workspace flags true, and the configured
frontend host to match the requested host. An old SPA HTML fallback at
`/release.json` fails. A successful check establishes deployment identity and
mode; run the browser journeys above to accept the account experience.

For automatic redeploys, configure the existing Actions secret
`COOLIFY_DEPLOY_WEBHOOK` and repository variable
`A2E_PUBLIC_URL=https://bureau.serveurmax.store`. The workflow then waits for the
expected backend/frontend revision and mode after the webhook. Missing either
setting is reported as an unverified live deployment; a published image alone
is not a deployment certificate. Keep the deployment's selected tag consistent
with the workflow's intended SHA (a pinned older tag will correctly fail).

### Public signup and the provided Coolify environment

`Sign up is disabled.` can also mean workspace creation is reserved to server
admins. Shared-domain routing does not bypass this native instance restriction.
For a public A2E service, use the current root Compose (both services receive
these flags) and configure:

```dotenv
IS_SHARED_DOMAIN_WORKSPACE_ENABLED=true
IS_MULTIWORKSPACE_ENABLED=false
IS_WORKSPACE_CREATION_LIMITED_TO_SERVER_ADMINS=false
EMAIL_DRIVER=RESEND
RESEND_API_KEY=<existing-secret-key>
EMAIL_FROM_ADDRESS=noreply@association2e.org
EMAIL_FROM_NAME=A2E Suite
IS_EMAIL_VERIFICATION_REQUIRED=false
```

The sender above is the previously configured A2E sender; use your own verified
Resend sender if different. `LOGGER` does not deliver emails; the placeholder
`noreply@yourdomain.com` must be replaced. REST mode does not need SMTP fields.
Keep verification off until an actual reset/invitation reaches the inbox.
The image also defaults the admin-only restriction to false for public A2E;
explicit true still restricts registration. If the instance uses database-backed
configuration with an existing override, review that flag in the server admin
configuration too: database overrides take precedence over environment values.
Do not bypass membership or manually alter workspace/user rows to enable signup.

Keep the existing database password and encryption key unchanged. The root
Compose already derives `PG_DATABASE_URL` and falls back from an empty
`APP_SECRET` to `ENCRYPTION_KEY`; additional generated secrets are not mandatory
for that path. Outside this Compose, configure those values explicitly.
Saving a Coolify variable only affects the containers if the saved Compose
passes it through. Preserve the existing service and its volumes when updating
that configuration. Use normal URLs in the actual environment, without Markdown
backslashes around colons.

### GitHub workflows inherited from upstream

A2E's deployment workflow is **CD Docker image**. **CD deploy main** and
**App Prod-Parity E2E Dispatch** call private `twentyhq` repositories; on forks
they run only when `TWENTY_WORKFLOW_DISPATCHER_CLIENT_ID` is configured (along
with its existing private-key secret). Skipping these optional external
integrations does not certify prod-parity tests. Local A2E UI/E2E checks remain.
Browser jobs use Ubuntu 24.04 because the pinned Playwright version rejects
Ubuntu 26.04. A2E heavy jobs default to the standard runner; set
`A2E_LARGE_RUNNER` to an available larger runner label when needed. Upstream's
custom 4/8-core labels remain available for `twentyhq`.
