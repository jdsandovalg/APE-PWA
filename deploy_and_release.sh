#!/usr/bin/env bash
set -euo pipefail

# Simple deploy script (KIS)
# - Builds pwa
# - Commits any changes (like build-meta)
# - Pushes to origin
# NOTE: Netlify deploy steps have been removed. Use `pwa/deploy_via_ftp.sh`,
# `pwa/deploy_to_mounted.sh` or configure Vercel for automatic deploys.

SKIP_NETLIFY=1
MSG=""

usage(){
  echo "Usage: $0 \"commit message\""
  exit 1
}

if [ "$#" -eq 0 ]; then usage; fi

MSG="$*"
MSG=${MSG:-"chore(deploy): update"}
echo "[deploy] Commit message: $MSG"

echo "[deploy] Building PWA..."
npm --prefix pwa run build

echo "[deploy] Staging changes..."
git add -A
if git diff --cached --quiet; then
  echo "[deploy] No staged changes to commit."
else
  git commit -m "$MSG" || true
fi

echo "[deploy] Pushing to origin..."
git push origin $(git rev-parse --abbrev-ref HEAD)

# Ensure the dist contains the final commit id so the PWA can show it
GIT_COMMIT=$(git rev-parse --short HEAD)
echo "[deploy] Git commit deployed: $GIT_COMMIT"

# Update pwa/dist/build-meta.json commit and builtAt so the deployed files include the correct id
node -e "const fs=require('fs');const pkg=require('./pwa/package.json');const path='./pwa/dist/build-meta.json';let obj={version:pkg.version};try{obj=JSON.parse(fs.readFileSync(path,'utf8'))}catch(e){};obj.commit=process.argv[1];obj.builtAt=new Date().toISOString();fs.writeFileSync(path,JSON.stringify(obj,null,2));" "$GIT_COMMIT"

echo "[deploy] Netlify deploy step removed. Use FTP/rsync scripts or configure Vercel."

echo "[deploy] Done."
