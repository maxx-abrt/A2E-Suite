#!/bin/bash
# =============================================================================
# A2E Suite — build the bundled A2E apps into installable tarballs
# =============================================================================
# Builds every internal A2E app with the workspace SDK (the same version as the
# server) and collects the tarballs into packages/twenty-apps/dist, the
# directory `app:provision-bundled` reads by default. Then run:
#
#   cd packages/twenty-server
#   node dist/command/command.js app:provision-bundled --dir ../twenty-apps/dist
#   node dist/command/command.js install-pre-installed-apps
#
# Usage (from repo root, after `yarn install` and `npx nx build twenty-sdk`):
#   bash packages/twenty-utils/build-bundled-apps.sh            # all apps
#   bash packages/twenty-utils/build-bundled-apps.sh a2e-documents a2e-drive
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SDK_CLI="$REPO_ROOT/packages/twenty-sdk/dist/cli.cjs"
APPS_DIR="$REPO_ROOT/packages/twenty-apps/internal"
DIST_DIR="${BUNDLED_APPS_DIR:-$REPO_ROOT/packages/twenty-apps/dist}"

# Keep in sync with the Dockerfile twenty-apps-build stage.
DEFAULT_APPS=(a2e-documents a2e-accounting a2e-projects a2e-chat a2e-drive a2e-crm a2e-links)

if [ ! -f "$SDK_CLI" ]; then
  echo "SDK CLI not built: run 'npx nx build twenty-sdk' first" >&2
  exit 1
fi

if [ "$#" -gt 0 ]; then
  APPS=("$@")
else
  APPS=("${DEFAULT_APPS[@]}")
fi

mkdir -p "$DIST_DIR"

for app in "${APPS[@]}"; do
  app_path="$APPS_DIR/$app"

  if [ ! -d "$app_path" ]; then
    echo "Unknown app: $app" >&2
    exit 1
  fi

  echo "=> Building $app"
  rm -rf "$app_path/.twenty/output"
  node "$SDK_CLI" dev:build "$app_path" --tarball > "$app_path/.twenty-build.log" 2>&1 || {
    echo "   FAIL: $app (see $app_path/.twenty-build.log)" >&2
    exit 1
  }

  # One tarball per app in dist: drop older versions of the same app first.
  rm -f "$DIST_DIR/$app"-*.tgz
  cp "$app_path"/.twenty/output/*.tgz "$DIST_DIR/"
  rm -f "$app_path/.twenty-build.log"
  echo "   done: $(basename "$app_path"/.twenty/output/*.tgz)"
done

echo "Bundled tarballs in $DIST_DIR:"
ls -1 "$DIST_DIR"
