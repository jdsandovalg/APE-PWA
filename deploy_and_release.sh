#!/usr/bin/env bash
set -euo pipefail

# deploy_and_release.sh
# Builds the PWA, commits & pushes changes, and deploys to Netlify.
# Usage: ./deploy_and_release.sh [-s|--skip-netlify] "commit message"

DEFAULT_SITE_ID="becf03c1-b495-476e-beea-0d845899650f"
DEFAULT_TOKEN_FILE="netfily.sh"

SKIP_NETLIFY=0
MSG=""

usage() {
  cat <<'USAGE'
Usage: deploy_and_release.sh [-s|--skip-netlify] "commit message"

Examples:
  ./deploy_and_release.sh "chore(build): update build-meta and UI fixes"
  ./deploy_and_release.sh -s "chore: update docs (skip deploy)"

Environment:
  NETLIFY_AUTH_TOKEN  (required unless --skip-netlify)
  NETLIFY_SITE_ID     (optional, defaults to the value in script)
USAGE
  exit 1
}

if [ "$#" -eq 0 ]; then usage; fi

while [ "$#" -gt 0 ]; do
  case "$1" in
    -s|--skip-netlify)
      SKIP_NETLIFY=1
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      MSG="$*"
      break
      ;;
  esac
done

if [ -z "$MSG" ]; then
  MSG="chore(deploy): update"
fi

echo "[deploy] Commit message: $MSG"

echo "[deploy] Building PWA (vite build) ..."
npm --prefix pwa run build

echo "[deploy] Staging changes..."
git add -A

if git diff --cached --quiet; then
  echo "[deploy] No staged changes to commit."
else
  echo "[deploy] Creating commit..."
  git commit -m "$MSG"
fi

echo "[deploy] Pushing to origin main..."
git push origin main

if [ "$SKIP_NETLIFY" -eq 1 ]; then
  echo "[deploy] Skipping Netlify deploy as requested."
  exit 0
fi

# Resolve site id and token (env takes precedence)
SITE_ID="${NETLIFY_SITE_ID:-$DEFAULT_SITE_ID}"

if [ -z "${NETLIFY_AUTH_TOKEN:-}" ] && [ -f "$DEFAULT_TOKEN_FILE" ]; then
  # extract token and site id from the token file if present
  TOK_LINE=$(grep -Eo 'NETLIFY_AUTH_TOKEN=[^[:space:]]+' "$DEFAULT_TOKEN_FILE" | head -n1 || true)
  if [ -n "$TOK_LINE" ]; then
    EXTRACTED=${TOK_LINE#*=}
    # remove surrounding single or double quotes if any
    EXTRACTED=${EXTRACTED%"}
    EXTRACTED=${EXTRACTED#"}
    EXTRACTED=${EXTRACTED%\'}
    EXTRACTED=${EXTRACTED#\'}
    export NETLIFY_AUTH_TOKEN="$EXTRACTED"
    echo "[deploy] NETLIFY_AUTH_TOKEN loaded from $DEFAULT_TOKEN_FILE (hidden)."
  fi

  SITE_LINE=$(grep -Eo 'NETLIFY_SITE_ID=[^[:space:]]+' "$DEFAULT_TOKEN_FILE" | head -n1 || true)
  if [ -n "$SITE_LINE" ]; then
    EX_SITE=${SITE_LINE#*=}
    EX_SITE=${EX_SITE%"}
    EX_SITE=${EX_SITE#"}
    EX_SITE=${EX_SITE%\'}
    EX_SITE=${EX_SITE#\'}
    SITE_ID="$EX_SITE"
    echo "[deploy] NETLIFY_SITE_ID loaded from $DEFAULT_TOKEN_FILE."
  fi
fi

if [ -z "${NETLIFY_AUTH_TOKEN:-}" ]; then
  echo "[deploy] ERROR: NETLIFY_AUTH_TOKEN is not set and couldn't be read from $DEFAULT_TOKEN_FILE. Export it and rerun, or pass -s to skip deploy."
  exit 2
fi

echo "[deploy] Deploying to Netlify site: $SITE_ID"
echo "[deploy] (token is read from NETLIFY_AUTH_TOKEN; not echoed)"

# Run Netlify CLI deploy (uses NETLIFY_AUTH_TOKEN from env)
NETLIFY_AUTH_TOKEN="$NETLIFY_AUTH_TOKEN" npx netlify deploy --prod --dir=pwa/dist --site="$SITE_ID"

echo "[deploy] Finished."
