# Self-hosting A2E Suite

A2E Suite ships as **one Docker image** (backend + frontend + CLI tools to
auto-migrate the database). The image is built in GitHub Actions
([`.github/workflows/cd-docker-image.yaml`](../../.github/workflows/cd-docker-image.yaml))
and published to GHCR, so your server only **pulls** it — no build, no Node
toolchain, no 8 GB frontend compilation on a small VPS.

```
ghcr.io/maxx-abrt/a2e-suite
  ├─ latest     latest commit on main
  ├─ <version>  package.json version (e.g. 0.2.1)
  └─ <sha>      exact commit
```

## What runs where

| Service   | Image                        | Role                                        |
| --------- | ---------------------------- | ------------------------------------------- |
| `server`  | `ghcr.io/maxx-abrt/a2e-suite` | API + serves the built frontend, port 3000  |
| `worker`  | same image                   | background jobs (`yarn worker:prod`)        |
| `db`      | `postgres:16`                | PostgreSQL                                  |
| `redis`   | `redis`                      | queue / pubsub                              |

On first boot the [`entrypoint.sh`](./twenty/entrypoint.sh) inside the image
creates the schema (`database:init:prod`) and applies migrations/upgrade
commands automatically — **no manual DB step ever**.

---

## Option A — Coolify (recommended)

### 1. Push these files to GitHub (one-time, from your machine)

The two deployment files were added to the repo:

- `.github/workflows/cd-docker-image.yaml` — builds & pushes the image on every push to `main`
- `packages/twenty-docker/docker-compose.coolify.yml` — the stack Coolify will run

```bash
git add .github/workflows/cd-docker-image.yaml packages/twenty-docker/docker-compose.coolify.yml
git commit -m "feat: add GHCR image build + Coolify compose"
git push origin main
```

GitHub Actions then builds the image (~30–40 min first run, ~10 min after with
cache). Watch it under **Actions → CD Docker image**. The image appears at
`https://github.com/maxx-abrt?tab=packages`.

> GHCR packages are private by default. To let Coolify pull without a token,
> open the package page → **Package settings** → change visibility to
> **Public** (recommended — the image contains no secrets). Otherwise do step
> "Private registry" below.

### 2. Create the project in Coolify

1. Coolify → **New resource** → **Docker Compose** (empty / "Docker Compose
   Empty").
2. On the Coolify "Repository configuration" screen, set exactly:
   - Repository URL: `https://github.com/maxx-abrt/A2E-Suite.git`
   - Branch: `main`
   - Build pack: `Docker Compose`
   - **Base directory: leave the field completely empty** (not `/`, not `.`).
     With `/` Coolify resolves the file as `null/...` and refuses to continue.
   - Compose file: `packages/twenty-docker/docker-compose.coolify.yml`
     The header must then show the resolved path without a `null/` prefix.
   - The repo is private: install the Coolify GitHub App first
     (Coolify → **Sources** → **GitHub** → install), or Coolify cannot clone.
   - Alternative: build pack **Docker Compose** with pasted content — no clone
     needed at deploy time, but redeploys won't pick up compose-file changes
     from git.
3. Coolify may warn that it wants to build the services — leave **"Build
   server"** unchecked everywhere; the `image:` field is used as-is.

### 3. Environment variables (set once in the Coolify UI)

Add to the resource's **Environment Variables** (these are interpolated into
the compose file):

| Variable                | Value                                            | Notes                                     |
| ----------------------- | ------------------------------------------------ | ----------------------------------------- |
| `SERVER_URL`            | `https://crm.votre-domaine.fr`                   | public URL, **https**                     |
| `ENCRYPTION_KEY`        | `openssl rand -base64 32` output                 | required                                  |
| `PG_DATABASE_PASSWORD`  | strong password, letters+digits only             | required (no special chars: used in URLs) |
| `TAG`                   | `latest`                                         | optional, pin a version for upgrades      |
| `SERVER_PORT`           | `3000`                                           | optional, only if 3000 is taken on host   |
| `APP_SECRET`            | `openssl rand -base64 32` output                 | optional (legacy)                         |

Optional integrations (same place, uncommented lines already exist in the
compose file): `STORAGE_S3_*` (S3-compatible storage instead of local disk),
`EMAIL_*`/`EMAIL_SMTP_*` (transactional email), `AUTH_GOOGLE_*` /
`AUTH_MICROSOFT_*` (SSO). Values follow
[`.env.example`](./.env.example).

### 4. Domain & proxy

1. In Coolify, on the compose resource → **Domains** → add
   `https://crm.votre-domaine.fr` and attach it to the **`server`** service,
   port `3000`.
2. Coolify's Traefik generates the Let's Encrypt cert automatically.
3. If you skip the domain mapping, the app is reachable on
   `http://<server-ip>:3000` (then set `SERVER_URL=http://<server-ip>:3000`).

### 5. Deploy

Click **Deploy**. Sequence: pull 4 images → `db` + `redis` healthy → `server`
runs migrations (first boot takes 1–3 min) → worker starts → healthcheck green
→ app live at your domain.

### 6. First login

Open the domain → sign-up form → first user becomes workspace owner. Done.

### Optional: zero-touch deploys

Add a Coolify **Deploy Webhook** URL (resource page) as GitHub secret
`COOLIFY_DEPLOY_WEBHOOK`. The CI workflow pings it after each image push, so
`git push` → image built → Coolify redeploys → done. Note: Coolify deploy
webhooks don't re-pull automatically unless "Force rebuild / pull" is enabled;
use the tag `latest` and enable **"Pull new images before deploy"** in
Coolify's server advanced settings.

### Upgrading

1. Merge to `main` (or push a git tag `v*`) → CI builds new image.
2. Coolify → **Deploy** (or the webhook fires automatically).

Downgrades of DB schema are not supported; image tags are immutable so you can
roll the container back to the previous `TAG` value.

---

## Option B — Plain Docker host (VPS, Portainer, Swarma, etc.)

```bash
ssh my-vps
mkdir -p /opt/a2e && cd /opt/a2e

# Get the compose file (or copy-paste it)
curl -o docker-compose.yml https://raw.githubusercontent.com/maxx-abrt/A2E-Suite/main/packages/twenty-docker/docker-compose.coolify.yml

# Secrets
export ENCRYPTION_KEY="$(openssl rand -base64 32)"
export PG_DATABASE_PASSWORD="$(openssl rand -hex 16)"
export SERVER_URL="https://crm.votre-domaine.fr"
# export TAG="0.2.1"   # pin a version (recommended)

cat > .env <<EOF
SERVER_URL=$SERVER_URL
ENCRYPTION_KEY=$ENCRYPTION_KEY
PG_DATABASE_PASSWORD=$PG_DATABASE_PASSWORD
TAG=${TAG:-latest}
EOF

docker compose pull
docker compose up -d
```

Reverse proxy (Caddy / Nginx / Traefik) → `server:3000` or `localhost:3000`.
Set `SERVER_URL` to the final public URL **before** first boot.

Useful commands:

```bash
docker compose logs -f server     # follow migrations
docker compose down               # stop (keeps data volumes)
docker compose pull && docker compose up -d   # upgrade
```

---

## Private GHCR (if you keep the image private)

Create a fine-grained PAT with `read:packages`, then:

```bash
docker login ghcr.io -u <github-user>   # paste the PAT
```

Coolify: **Servers → your server → Docker prune/Registries → add registry**
`ghcr.io` with user + PAT. Coolify then uses it for pulls.

---

## Data & backups

| Volume               | Content                    |
| -------------------- | -------------------------- |
| `db-data`            | PostgreSQL data            |
| `server-local-data`  | uploaded files (local storage mode) |

Back up both volumes (`docker run --rm -v a2e-suite_db-data:/data -v $PWD:/backup alpine tar czf /backup/db.tgz -C /data .`).

Using S3 storage (`STORAGE_TYPE=s3`) removes the second volume from the backup
scope (files live in the bucket).

## Troubleshooting

| Symptom                                     | Fix                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `server` restarts, logs show `ENCRYPTION_KEY` error | var missing/changed after first boot — restore original or reset volumes |
| 502 from Coolify proxy                      | domain must target service `server`, port `3000`                     |
| First boot stuck on migrations              | watch `docker compose logs -f server`; it exits once healthy         |
| "Server URL" mismatch on OAuth callbacks     | `SERVER_URL` must match the public URL exactly (scheme included)     |
| GHCR pull `denied`                          | package private → make public or add registry creds (above)          |
