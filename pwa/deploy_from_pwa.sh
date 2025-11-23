#!/usr/bin/env bash
set -euo pipefail

: <<'DOC'
MODOS DE USO (ejemplos):

1) Build + commit + push (recomendado):
   ./deploy_from_pwa.sh -m "chore(deploy): mensaje"

2) Ayuda:
   ./deploy_from_pwa.sh -h

Notas:
 - El script se ejecuta desde el directorio `pwa`.
 - Este script ahora solo hace: build → commit → push y actualiza `dist/build-meta.json`.
DOC

# Deploy helper to run from inside the `pwa` directory.
# Usage: ./deploy_from_pwa.sh -m "commit message"

MSG=""

usage(){
  echo "Usage: $0 -m \"commit message\""
  exit 1
}

if [ "$#" -eq 0 ]; then usage; fi

while [ "$#" -gt 0 ]; do
  case "$1" in
    -h|--help) usage ;;
    -m) shift; MSG="$1"; shift ;;
    *) MSG="$*"; break ;;
  esac
done

MSG=${MSG:-"chore(deploy): update"}
echo "[deploy] Commit message: $MSG"

echo "[deploy] Building PWA in $(pwd)..."
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

# Ensure the dist contains the final commit id so the PWA can show it
GIT_COMMIT=$(git rev-parse --short HEAD)

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

echo "[deploy] Done."
