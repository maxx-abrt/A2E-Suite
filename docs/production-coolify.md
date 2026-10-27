# A2E production on a small Coolify host

[Deployment guide](../DEPLOY.md) · [Verification](verification.md)

[Release and backup operations](coolify-operations.md) documents the automatic
build identities, read-only deployment audit, native backup schedules and
container safeguards. A [production environment template](../packages/twenty-docker/coolify.production.env.example)
is provided; replace its placeholders and blank required secrets before use.

## Recommended topology

Keep the existing test resource. Create production as a separate Coolify Compose
resource with the same maintained [manifest](../docker-compose.coolify.yml).
Use a new domain, database, Redis volume, file volume and secrets. Do not promote
the exhausted test database into production or copy its data directory.

Keep the current architecture: one HTTP server, one worker, PostgreSQL 16 and
Redis 7. GitHub builds the image; the home server only pulls and runs it.
Splitting the Nest API into serverless functions does not repair installation
retries, database contention or queue durability. Additional API replicas also
consume more memory and need a single migration/provisioning owner.

The reported machine has 8 GB RAM shared with another project. That is a pilot
deployment target until measured under representative load, not a capacity
guarantee. Keep staging stopped outside test windows if simultaneous stacks
cause memory pressure. Do not build images on this host. Measure total host
memory, swap, OOM/restarts, CPU, disk latency and space, API p95 response time,
database connections and queue age before increasing workload. More containers
on the same host do not provide host-level availability.

## Create an isolated production resource

1. Follow the [Coolify setup](../DEPLOY.md), using a **new resource**. Leave the
   existing resource and its volumes intact. Coolify namespaces named volumes
   per resource; inspect **Show Deployable Compose / Persistent Storages** to
   confirm the actual names and ensure no external volume is shared.
   Prefer a Git-backed Compose resource and deploy its reviewed configuration
   alongside the matching image release. An Empty Compose resource retains the
   pasted configuration until it is explicitly updated; pulling a newer image
   cannot update that saved file.
2. Select a reviewed release after **CD Docker image → Test candidate with the
   Coolify stack → Promote tested image** passes. Set `TAG` to that full
   40-character commit SHA, or preferably set `A2E_IMAGE` to the tested full
   digest from the job summary. `A2E_IMAGE` overrides `TAG` on both services.
   Package-version, commit and `latest` tags can move when rebuilt; the digest
   identifies the exact tested artifact.
3. Set `SERVER_URL` to the production HTTPS domain, `PG_DATABASE_NAME=a2e_prod`,
   and independently generated `ENCRYPTION_KEY`, `APP_SECRET` and hexadecimal
   `PG_DATABASE_PASSWORD`. Keep these in a password manager. Do not copy staging
   secrets. Leave `PG_DATABASE_HOST=db` and `REDIS_URL=redis://redis:6379` unless
   intentionally using separately managed infrastructure.
4. Set `SERVER_PORT=0` for an ephemeral host binding when using the Coolify
   proxy. The proxy target remains **server:3000**, not the assigned host port.
   Zero allocates a random loopback host port; it does not remove publication.
   If an existing host proxy/tunnel targets `127.0.0.1:8088`, retain
   `SERVER_PORT=8088` until its route is deliberately changed. A tunnel in a
   separate container cannot reach the host's loopback through its own localhost.
   Two resources using the default host port 3000 would collide. Do not expose
   PostgreSQL or Redis publicly; restrict host port access with the firewall.
5. Leave `A2E_RECOVERY_TARGET_DATABASE` empty and `A2E_RECOVERY_APPLY=false`.
   They are maintenance controls for retaining old data, not normal startup.
   Keep bundled app provisioning enabled on the server and disabled on the
   worker; the worker also disables migrations and cron registration.
6. Initially keep local file storage on `server-local-data`. Back up that
   volume as well as PostgreSQL and secrets. Configure a real email provider
   through the [transactional email guide](resend-email.md); `LOGGER` only
   records email and does not deliver invitations or password resets.
7. Deploy. Check the explicit `[startup]` stages, `/readyz` for server and worker,
   and frontend/backend release identity. The first account is the owner;
   complete setup before opening access to other users.

Coolify's [storage documentation](https://coolify.io/docs/services/configuration/persistent-storage)
describes volume namespacing. Its [backup guide](https://coolify.io/docs/databases/backups)
also covers PostgreSQL components inside Services: verify that the actual running
container exposes `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB`, which the
shipped manifest maps. Backups must also be copied off this physical host.

## Queue durability

The Coolify manifest mounts `redis-data:/data`, enables AOF with
`appendfsync everysec`, and keeps `maxmemory-policy noeviction`. Redis holds
BullMQ jobs as well as caches, so it must survive container recreation.
This follows [BullMQ's production recommendations](https://docs.bullmq.io/guide/going-to-production).
An abrupt machine failure can still lose roughly the last second of writes;
AOF is not a backup or a guarantee of exactly-once processing. Disk capacity
and job failures need monitoring.

Adding this volume to an **existing** resource does not copy the old Redis
container's data. Pause producers and drain or explicitly migrate outstanding
jobs before switching storage on an environment whose queued work matters.
A new production resource starts with its own empty queue. Never share Redis
between staging and production, even with distinct PostgreSQL databases.

## Acceptance before real user data

- Create an account and workspace through the browser; choose a preset and
  verify its apps, navigation and sample content. Repeat setup and confirm it
  does not duplicate content. Failed installs must resume without uninstalling
  already committed application data.
- Create, complete and reopen a task; create a page and project; upload and
  download a file. Recreate server/worker and confirm records, files and login
  remain usable. Recreate Redis and confirm queued work resumes.
- Send and receive a real invitation and password reset. Exercise a second
  member's restricted permissions. Confirm public links use the production host.
- Restore a PostgreSQL backup and file backup into a separate isolated
  environment with the required encryption key. Verify real records and file
  downloads. Record recovery point/time; a successful backup file alone is not
  restore evidence.
- Observe representative concurrent usage with the other project running.
  Choose resource limits and worker concurrency from those measurements;
  arbitrary low memory limits can turn a slow startup into an OOM loop.

Image smoke acceptance checks fresh and populated boots, actual worker-created
starter content, stable physical column counts, file persistence and Redis data
across recreation. It does not replace these browser, email, permission, backup
and load checks on the target host.

## Controlled releases

Validate each new immutable image in staging, including an upgrade from a copy
of the current production backup. Take a backup before production upgrades,
update its pinned `TAG`, and deploy during a suitable maintenance window.
Do not wire an unconditional `latest` webhook to this pinned production resource:
a new image publication should not silently select the production release.

For automatic deployment verification, the Docker workflow supports
`COOLIFY_DEPLOY_WEBHOOK` and repository variable `A2E_PUBLIC_URL`. Their target
must match the intended resource and its image-selection policy. Without them,
green image publication leaves the live deployment **unverified**. The separate
`CD deploy main` workflow targets upstream website infrastructure, not Bureau.

Rollback after a schema-changing upgrade requires the compatible database/file
backup as well as the previous image and keys. Changing only the image tag is
not a general database rollback. Keep the test resource independent so failure
there cannot overwrite production files, credentials or queues.

## Current audit limits

The GitHub image build for main `74ab5fc7` passed candidate acceptance on
2026-10-26; its Coolify webhook and live verification steps were skipped.
That run predates the queue persistence and sign-in refinements described here.
The final local changes still require their own reviewed CI run. Coolify MCP
access was blocked by Cloudflare 1010, so the live image digest, OOM state,
resolved volumes and health output could not be read in this audit. No remote
resource, configuration, database or workflow was modified.
