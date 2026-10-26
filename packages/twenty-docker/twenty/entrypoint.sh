#!/bin/sh
set -e

echo "A2E Suite starting: version=${APP_VERSION:-unknown} revision=${APP_REVISION:-unknown} command=$*"

run_startup_step() {
    startup_step=$1
    shift
    startup_step_started_at=$(date +%s)
    echo "[startup] step=$startup_step status=started"

    if "$@"; then
        echo "[startup] step=$startup_step status=succeeded elapsed_seconds=$(($(date +%s) - startup_step_started_at))"
    else
        startup_step_exit_code=$?
        echo "[startup] step=$startup_step status=failed exit_code=$startup_step_exit_code elapsed_seconds=$(($(date +%s) - startup_step_started_at))" >&2
        return "$startup_step_exit_code"
    fi
}

setup_and_migrate_db() {
    if [ "${DISABLE_DB_MIGRATIONS}" = "true" ]; then
        echo "Database setup and migrations are disabled, skipping..."
        return
    fi

    echo "Running database setup and migrations..."

    # Check for the table migrations create, not just the schema: a previous
    # boot can have created the "core" schema and died before creating any
    # table (setup-db and migrations are separate steps), and a schema-only
    # check would then skip init forever on a half-initialized database.
    has_app_token_table=$(psql -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'appToken')" "${PG_DATABASE_URL}")
    if [ "$has_app_token_table" = "f" ]; then
        echo "Database appears to be empty, running migrations."
        run_startup_step database-init yarn database:init:prod
    fi

    if ! run_startup_step cache-before-upgrade yarn command:prod cache:flush; then
        echo "Warning: Failed to flush cache before upgrade, but continuing startup..."
    fi

    # The upgrade command exits non-zero on any workspace migration failure;
    # booting on a partially migrated DB makes the deployment report healthy
    # over broken data, so the container must abort instead.
    if ! run_startup_step database-upgrade yarn command:prod upgrade; then
        echo "ERROR: Upgrade failed. Refusing to start against a partially migrated database. Fix the migration and restart the container."
        exit 1
    fi

    if ! run_startup_step cache-after-upgrade yarn command:prod cache:flush; then
        echo "Warning: Failed to flush cache after upgrade, but continuing startup..."
    fi

    echo "Successfully migrated DB!"
}

provision_bundled_apps() {
    if [ "${DISABLE_BUNDLED_APP_PROVISIONING}" = "true" ]; then
        echo "Bundled app provisioning is disabled, skipping..."
        return
    fi

    # Provisioning writes registrations and installs apps on every workspace, so
    # it must run exactly once per boot, after the schema is migrated, in the
    # container that owns migrations. A container started with migrations
    # disabled (the worker, or a replica) would otherwise race the migrating
    # server: on a fresh volume it hits an unmigrated schema, and on every boot
    # it runs a second concurrent install-pre-installed-apps pass over the same
    # workspaces. Deployments that migrate out-of-band can still force it on
    # the server with DISABLE_BUNDLED_APP_PROVISIONING=false.
    if [ "${DISABLE_DB_MIGRATIONS}" = "true" ] && [ "${DISABLE_BUNDLED_APP_PROVISIONING}" != "false" ]; then
        echo "Database migrations are disabled in this container, so bundled app provisioning is skipped too (the migrating server runs it)."
        echo "  Set DISABLE_BUNDLED_APP_PROVISIONING=false to force it in this container."
        return
    fi

    echo "Provisioning bundled A2E apps..."
    if run_startup_step bundled-app-registration yarn command:prod app:provision-bundled; then
        echo "Successfully provisioned bundled apps!"
    else
        echo "ERROR: Bundled app provisioning failed. Refusing to report a successful deployment with missing apps."
        echo "  Apps can be provisioned manually with: yarn command:prod app:provision-bundled"
        exit 1
    fi

    # Install newly-registered pre-installed apps on all existing workspaces.
    # This is idempotent — already-installed apps are skipped by the install service.
    echo "Installing pre-installed apps on all workspaces..."
    if run_startup_step bundled-app-installation yarn command:prod install-pre-installed-apps; then
        echo "Successfully installed pre-installed apps!"
    else
        echo "ERROR: Pre-installed app installation failed. Check the app and workspace errors above, then restart to retry."
        exit 1
    fi

    # Registrations are saved directly by the provisioning command, so evict
    # catalog entries computed before this image's packages were registered.
    run_startup_step cache-after-provisioning yarn command:prod cache:flush
}

register_background_jobs() {
    if [ "${DISABLE_CRON_JOBS_REGISTRATION}" = "true" ]; then
        echo "Cron job registration is disabled, skipping..."
        return
    fi

    echo "Registering background sync jobs..."
    if run_startup_step cron-registration yarn command:prod cron:register:all; then
        echo "Successfully registered all background sync jobs!"
    else
        echo "Warning: Failed to register background jobs, but continuing startup..."
    fi
}

setup_and_migrate_db
provision_bundled_apps
register_background_jobs

# Continue with the original Docker command
echo "[startup] step=runtime status=starting"
exec "$@"
