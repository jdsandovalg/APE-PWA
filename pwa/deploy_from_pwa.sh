#!/usr/bin/env bash
set -euo pipefail

# Deploy helper to run from inside the `pwa` directory.
# Usage: ./deploy_from_pwa.sh [-s|--skip-netlify] "commit message"

DEFAULT_SITE_ID="becf03c1-b495-476e-beea-0d845899650f"
DEFAULT_TOKEN_FILE="../netfily.sh"

SKIP_NETLIFY=0
MSG=""

usage(){
  echo "Usage: $0 [-s|--skip-netlify] \"commit message\""
  exit 1
}

if [ "$#" -eq 0 ]; then usage; fi

while [ "$#" -gt 0 ]; do
  case "$1" in
    -s|--skip-netlify) SKIP_NETLIFY=1; shift ;;
    -h|--help) usage ;;
    *) MSG="$*"; break ;;
  esac
done

MSG=${MSG:-"chore(deploy): update"}
echo "[deploy] Commit message: $MSG"

echo "[deploy] Building PWA in $(pwd)..."
# build (the project's package.json should run the build-meta generator if present)
npm run build

echo "[deploy] Staging changes..."
git add -A
if git diff --cached --quiet; then
  echo "[deploy] No staged changes to commit."
else
  git commit -m "$MSG"
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "[deploy] Pushing to origin/$BRANCH..."
git push origin "$BRANCH"

if [ "$SKIP_NETLIFY" -eq 1 ]; then
  echo "[deploy] Skipping Netlify deploy as requested."; exit 0
fi

SITE_ID=${NETLIFY_SITE_ID:-$DEFAULT_SITE_ID}

# If token not in env, try to read from DEFAULT_TOKEN_FILE (simple parsing)
if [ -z "${NETLIFY_AUTH_TOKEN:-}" ] && [ -f "$DEFAULT_TOKEN_FILE" ]; then
  TOK_LINE=$(grep -m1 '^NETLIFY_AUTH_TOKEN=' "$DEFAULT_TOKEN_FILE" || true)
  if [ -n "$TOK_LINE" ]; then
    TOK_VALUE=${TOK_LINE#*=}
    # strip surrounding single/double quotes
    TOK_VALUE=$(printf "%s" "$TOK_VALUE" | sed -E 's/^['"']?//; s/['"']?$//')
    export NETLIFY_AUTH_TOKEN="$TOK_VALUE"
    echo "[deploy] NETLIFY_AUTH_TOKEN loaded from $DEFAULT_TOKEN_FILE (hidden)"
  fi
fi

if [ -z "${NETLIFY_AUTH_TOKEN:-}" ]; then
  echo "[deploy] ERROR: NETLIFY_AUTH_TOKEN not set. Export it or add to $DEFAULT_TOKEN_FILE." >&2
  exit 2
fi

echo "[deploy] Deploying to Netlify site: $SITE_ID"
# Ensure the dist contains the final commit id so the PWA can show it
GIT_COMMIT=$(git rev-parse --short HEAD)
echo "[deploy] Git commit deployed: $GIT_COMMIT"

DIST_DIR="./dist"
if [ ! -d "$DIST_DIR" ]; then
  echo "[deploy] ERROR: dist directory not found at $DIST_DIR" >&2; exit 3
fi

# Update dist/build-meta.json commit and builtAt so the deployed files include the correct id
if command -v node >/dev/null 2>&1; then
  node -e "const fs=require('fs');const path=process.argv[1];let obj={};try{obj=JSON.parse(fs.readFileSync(path,'utf8'))}catch(e){};obj.commit=process.argv[2];obj.builtAt=new Date().toISOString();fs.writeFileSync(path,JSON.stringify(obj,null,2));" "$DIST_DIR/build-meta.json" "$GIT_COMMIT" || true
else
  echo "[deploy] Warning: node not found; skipping build-meta injection." >&2
fi

NETLIFY_AUTH_TOKEN="$NETLIFY_AUTH_TOKEN" npx --yes netlify deploy --prod --dir="$DIST_DIR" --site="$SITE_ID" || {
  echo "[deploy] Netlify deploy command failed." >&2
  exit 4
}

echo "[deploy] Done."
