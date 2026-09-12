# Deploy A2E Suite on Coolify

## Scope and release prerequisites

This guide describes the repository's **existing GitHub/GHCR → Coolify path**,
not an automatically configured release pipeline for the GitLab fork. Confirm
the authoritative build project, registry, tested immutable image and deployment
owner before using it. A GitLab push alone does not run `.github/workflows`.
The owner/registry shown below are legacy configuration examples, not proof that
this checkout publishes there or that those resources are public.

[Documentation home](docs/README.md) · [Applications provisioning](docs/applications.md)

- Platform deployment and Bilan/Documents/Projects provisioning are separate.
  The production image does not bundle/install the internal A2E app sources.
- Confirm supported database/runtime versions and required checks before a
  release. Do not treat a healthy HTTP process as proof upgrades succeeded;
  inspect migration and worker results (audit F09/F10).
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
2. Watch the workflow **"CD Docker image"** — green = done (~30–40 min the
   first time, ~10 min after, thanks to caching).
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
storage). Optional extras (S3 storage, SMTP email, Google/Microsoft SSO) are
listed commented-out in the compose file — add them in the same tab only if
you need them.

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
time. Do not experiment against production or include keys in reports. No
backup/restore drill has been performed for this documentation update.

## Troubleshooting

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
