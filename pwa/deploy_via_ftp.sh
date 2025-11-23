#!/usr/bin/env bash
set -euo pipefail

## deploy_via_ftp.sh
# Build the PWA and upload `dist/` to a remote FTP server using lftp.
# Uses environment variables: FTP_HOST, FTP_USER, FTP_PASS, FTP_PORT (optional), FTP_REMOTE_DIR
# Example:
#   FTP_HOST=192.168.1.10 FTP_USER=admin FTP_PASS=secret FTP_REMOTE_DIR=/www/ ./deploy_via_ftp.sh

: ${FTP_HOST:?Need FTP_HOST}
: ${FTP_USER:?Need FTP_USER}
: ${FTP_PASS:?Need FTP_PASS}
FTP_PORT=${FTP_PORT:-21}
FTP_REMOTE_DIR=${FTP_REMOTE_DIR:-/}

echo "[deploy] Building PWA..."
cd "$(dirname "$0")"
npm run build

if [ ! -d "dist" ]; then
  echo "[deploy] ERROR: dist directory not found" >&2
  exit 1
fi

echo "[deploy] Uploading dist to FTP://$FTP_HOST:$FTP_PORT$FTP_REMOTE_DIR"

# Use lftp mirror to upload (replace remote with local)
if ! command -v lftp >/dev/null 2>&1; then
  echo "[deploy] ERROR: lftp not installed. Install it (brew install lftp / apt install lftp)" >&2
  exit 2
fi

lftp -u "$FTP_USER","$FTP_PASS" -p "$FTP_PORT" "$FTP_HOST" <<EOF
set ftp:ssl-allow no
set net:max-retries 2
set net:reconnect-interval-base 5
mirror -R --delete --parallel=4 dist $FTP_REMOTE_DIR
bye
EOF

echo "[deploy] Done."
