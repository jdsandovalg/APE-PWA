#!/usr/bin/env bash
set -euo pipefail

## deploy_to_mounted.sh
# Build the PWA and copy `dist/` to a mounted network drive using rsync.
# Usage examples:
#  MOUNT_PATH="/Volumes/FTP_DRIVE/site" ./deploy_to_mounted.sh
#  ./deploy_to_mounted.sh /mnt/ftp/site

MOUNT_PATH="${1:-${MOUNT_PATH:-}}"
if [ -z "$MOUNT_PATH" ]; then
  echo "Usage: MOUNT_PATH=/path/to/mount ./deploy_to_mounted.sh  OR  ./deploy_to_mounted.sh /path/to/mount" >&2
  exit 1
fi

echo "[deploy] Building PWA..."
cd "$(dirname "$0")"
npm run build

if [ ! -d "dist" ]; then
  echo "[deploy] ERROR: dist directory not found" >&2
  exit 1
fi

if [ ! -d "$MOUNT_PATH" ]; then
  echo "[deploy] ERROR: mount path does not exist: $MOUNT_PATH" >&2
  exit 2
fi

echo "[deploy] Syncing dist -> $MOUNT_PATH"
rsync -av --delete dist/ "$MOUNT_PATH/"
echo "[deploy] Done."
