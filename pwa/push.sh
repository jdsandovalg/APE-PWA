#!/usr/bin/env bash
set -euo pipefail

: <<'DOC'
MODOS DE USO (ejemplos):

1) Deploy completo (build → commit → push)
   - Recomendada:
  ./push.sh -m "chore(release): mensaje"

2) Solo push (build → commit → push, sin despliegue automático):
  ./push.sh -m "chore(release): push only"

3) Ayuda:
  ./push.sh -h

Notas:
 - El script se ejecuta desde el directorio `pwa`.
 - Para el despliegue final puedes usar `pwa/deploy_via_ftp.sh`,
   `pwa/deploy_to_mounted.sh` o configurar un servicio como Vercel.
DOC

# push.sh - release helper kept inside pwa/
# Short usage:
#   ./push.sh -m "commit message"
#   ./push.sh -s -m "commit message"    # skip Netlify deploy

cd "$(dirname "$0")"
#!/usr/bin/env bash
set -euo pipefail

# push.sh - helper to build, commit and push the `pwa` project.
# Netlify-specific deploy steps have been removed; use the FTP/rsync scripts
# or configure Vercel for automatic deploys.

cd "$(dirname "$0")"

MSG=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    -m) shift; MSG="$1"; shift ;;
    -h|--help) echo "Usage: $0 -m \"commit message\""; exit 0 ;;
    *) MSG="$*"; break ;;
  esac
done

MSG=${MSG:-"chore(release): build and prepare dist"}

echo "[push] Running from $(pwd)"
echo "[push] Commit message: $MSG"

echo "[push] Building..."
npm run build

echo "[push] Staging changes..."
git add -A
if git diff --cached --quiet; then
  echo "[push] No staged changes to commit."
else
  git commit -m "$MSG" || true
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "[push] Pushing to origin/$BRANCH..."
git push origin "$BRANCH"

# Ensure build-meta contains this commit id
GIT_COMMIT=$(git rev-parse --short HEAD)
DIST_DIR="./dist"
if [ -d "$DIST_DIR" ] && command -v node >/dev/null 2>&1; then
  node -e "const fs=require('fs'),p=process.argv[1],c=process.argv[2];try{let o=JSON.parse(fs.readFileSync(p,'utf8')||'{}');o.commit=c;o.builtAt=new Date().toISOString();fs.writeFileSync(p,JSON.stringify(o,null,2))}catch(e){}" "$DIST_DIR/build-meta.json" "$GIT_COMMIT" || true
fi

echo "[push] Netlify deploy steps removed. Use pwa/deploy_via_ftp.sh, pwa/deploy_to_mounted.sh or configure Vercel."

echo "[push] Done."