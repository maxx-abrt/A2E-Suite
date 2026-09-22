#!/bin/sh
set -e

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
    has_app_token_table=$(psql -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'appToken')" ${PG_DATABASE_URL})
    if [ "$has_app_token_table" = "f" ]; then
        echo "Database appears to be empty, running migrations."
        yarn database:init:prod
    fi

    if ! yarn command:prod cache:flush; then
        echo "Warning: Failed to flush cache before upgrade, but continuing startup..."
    fi

    # The upgrade command exits non-zero on any workspace migration failure;
    # booting on a partially migrated DB makes the deployment report healthy
    # over broken data, so the container must abort instead.
    if ! yarn command:prod upgrade; then
        echo "ERROR: Upgrade failed. Refusing to start against a partially migrated database. Fix the migration and restart the container."
        exit 1
    fi

    if ! yarn command:prod cache:flush; then
        echo "Warning: Failed to flush cache after upgrade, but continuing startup..."
    fi

    echo "Successfully migrated DB!"
}

provision_bundled_apps() {
    if [ "${DISABLE_BUNDLED_APP_PROVISIONING}" = "true" ]; then
        echo "Bundled app provisioning is disabled, skipping..."
        return
    fi

    echo "Provisioning bundled A2E apps..."
    if yarn command:prod app:provision-bundled; then
        echo "Successfully provisioned bundled apps!"
    else
        echo "Warning: Bundled app provisioning failed, but continuing startup..."
        echo "  Apps can be provisioned manually with: yarn command:prod app:provision-bundled"
    fi
}

register_background_jobs() {
    if [ "${DISABLE_CRON_JOBS_REGISTRATION}" = "true" ]; then
        echo "Cron job registration is disabled, skipping..."
        return
    fi

    echo "Registering background sync jobs..."
    if yarn command:prod cron:register:all; then
        echo "Successfully registered all background sync jobs!"
    else
        echo "Warning: Failed to register background jobs, but continuing startup..."
    fi
}

setup_and_migrate_db
provision_bundled_apps
register_background_jobs

# Continue with the original Docker command
exec "$@"
