#!/usr/bin/env bash
set -euo pipefail

: <<'DOC'
MODOS DE USO (ejemplos):

1) Deploy completo (build → commit → push → deploy a Netlify)
   - Recomendada (usar variable de entorno):
       export NETLIFY_AUTH_TOKEN="tu_token"
       ./push.sh -m "chore(release): mensaje"

   - Usando archivo local (no incluir en repo):
       echo "nfp_xxxTU_TOKEN" > .netlify_token
       chmod 600 .netlify_token
       ./push.sh -m "chore(release): mensaje"

2) Solo push (build → commit → push, sin deploy a Netlify):
       ./push.sh -s -m "chore(release): push only"

3) Ayuda:
       ./push.sh -h

Notas:
 - El script se ejecuta desde el directorio `pwa` (el script hace cd ahí automáticamente).
 - Es preferible usar la variable de entorno `NETLIFY_AUTH_TOKEN` o secrets en CI.
 - El archivo `.netlify_token` está en `.gitignore`.
DOC

# push.sh - release helper kept inside pwa/
# Short usage:
#   ./push.sh -m "commit message"
#   ./push.sh -s -m "commit message"    # skip Netlify deploy

cd "$(dirname "$0")"

SKIP_NETLIFY=0
MSG=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    -s|--skip-netlify) SKIP_NETLIFY=1; shift ;;
    -m) shift; MSG="$1"; shift ;;
    -h|--help) echo "Usage: $0 [-s|--skip-netlify] -m \"commit message\""; exit 0 ;;
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
  git commit -m "$MSG"
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "[push] Pushing to origin/$BRANCH..."
git push origin "$BRANCH"

if [ "$SKIP_NETLIFY" -eq 1 ]; then
  echo "[push] Skip requested. Exiting before Netlify deploy."; exit 0
fi

# NETLIFY deploy
SITE_ID="becf03c1-b495-476e-beea-0d845899650f"

# Prefer environment variable, fallback to .netlify_token in this directory (if present)
if [ -z "${NETLIFY_AUTH_TOKEN:-}" ]; then
  if [ -f ".netlify_token" ]; then
    echo "[push] Reading NETLIFY_AUTH_TOKEN from .netlify_token (consider using env var or CI secret instead)"
    # Support either plain token or KEY=VALUE format
    FIRST_LINE=$(head -n 1 .netlify_token | tr -d '\r')
    if [[ "$FIRST_LINE" == *=* ]]; then
      # parse KEY=VALUE
      NETLIFY_AUTH_TOKEN_VAL=$(echo "$FIRST_LINE" | awk -F'=' '{print $2}' | tr -d '"' | tr -d "'" )
    else
      NETLIFY_AUTH_TOKEN_VAL="$FIRST_LINE"
    fi
    export NETLIFY_AUTH_TOKEN="$(echo "$NETLIFY_AUTH_TOKEN_VAL" | tr -d '[:space:]')"
  else
    echo "[push] ERROR: NETLIFY_AUTH_TOKEN not set. Export it or create ./pwa/.netlify_token" >&2
    exit 2
  fi
fi

echo "[push] Deploying to Netlify site: $SITE_ID"
DIST_DIR="./dist"
if [ ! -d "$DIST_DIR" ]; then
  echo "[push] ERROR: dist directory not found at $DIST_DIR" >&2; exit 3
fi

GIT_COMMIT=$(git rev-parse --short HEAD)
if command -v node >/dev/null 2>&1; then
  node -e "const fs=require('fs'),p=process.argv[1],c=process.argv[2];try{let o=JSON.parse(fs.readFileSync(p,'utf8')||'{}');o.commit=c;o.builtAt=new Date().toISOString();fs.writeFileSync(p,JSON.stringify(o,null,2))}catch(e){}" "$DIST_DIR/build-meta.json" "$GIT_COMMIT" || true
fi

NETLIFY_AUTH_TOKEN="$NETLIFY_AUTH_TOKEN" npx --yes netlify deploy --prod --dir="$DIST_DIR" --site="$SITE_ID"

echo "[push] Deploy finished."
#!/usr/bin/env bash
set -euo pipefail


###export NETLIFY_AUTH_TOKEN=""


: <<'DOC'
MODOS DE USO (ejemplos):

1) Deploy completo (build → commit → push → deploy a Netlify)
   - Recomendada (usar variable de entorno):
  export NETLIFY_AUTH_TOKEN="tu_token"
  ./push.sh -m "chore(release): mensaje"

   - Usando archivo local (no incluir en repo):
  echo "nfp_xxxTU_TOKEN" > .netlify_token
  ./push.sh -m "chore(release): mensaje"

2) Solo push (build → commit → push, sin deploy a Netlify):
  ./push.sh -s -m "chore(release): push only"

3) Ayuda:
  ./push.sh -h

Notas:
 - El script debe ejecutarse desde el directorio `pwa` (el script hace cd ahí automáticamente).
 - Es preferible usar la variable de entorno `NETLIFY_AUTH_TOKEN` o secrets en CI.
 - El archivo `.netlify_token` está en `.gitignore` para evitar subir tokens.
DOC

# push.sh - release helper kept inside pwa/
# Short usage:
#   ./push.sh -m "commit message"
#   ./push.sh -s -m "commit message"    # skip Netlify deploy

cd "$(dirname "$0")"

SKIP_NETLIFY=0
MSG=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    -s|--skip-netlify) SKIP_NETLIFY=1; shift ;;
    -m) shift; MSG="$1"; shift ;;
    -h|--help) echo "Usage: $0 [-s|--skip-netlify] -m \"commit message\""; exit 0 ;;
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
  git commit -m "$MSG"
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "[push] Pushing to origin/$BRANCH..."
git push origin "$BRANCH"

if [ "$SKIP_NETLIFY" -eq 1 ]; then
  echo "[push] Skip requested. Exiting before Netlify deploy."; exit 0
fi

# NETLIFY deploy
SITE_ID="becf03c1-b495-476e-beea-0d845899650f"

# Prefer environment variable, fallback to .netlify_token in this directory (if present)
if [ -z "${NETLIFY_AUTH_TOKEN:-}" ]; then
  if [ -f ".netlify_token" ]; then
    echo "[push] Reading NETLIFY_AUTH_TOKEN from .netlify_token (consider using env var or CI secret instead)"
    export NETLIFY_AUTH_TOKEN="$(tr -d '\n' < .netlify_token | tr -d ' ')"
  else
    echo "[push] ERROR: NETLIFY_AUTH_TOKEN not set. Export it or create ./pwa/.netlify_token" >&2
    exit 2
  fi
fi

echo "[push] Deploying to Netlify site: $SITE_ID"
DIST_DIR="./dist"
if [ ! -d "$DIST_DIR" ]; then
  echo "[push] ERROR: dist directory not found at $DIST_DIR" >&2; exit 3
fi

GIT_COMMIT=$(git rev-parse --short HEAD)
if command -v node >/dev/null 2>&1; then
  node -e "const fs=require('fs'),p=process.argv[1],c=process.argv[2];try{let o=JSON.parse(fs.readFileSync(p,'utf8')||'{}');o.commit=c;o.builtAt=new Date().toISOString();fs.writeFileSync(p,JSON.stringify(o,null,2))}catch(e){}" "$DIST_DIR/build-meta.json" "$GIT_COMMIT" || true
fi

NETLIFY_AUTH_TOKEN="$NETLIFY_AUTH_TOKEN" npx --yes netlify deploy --prod --dir="$DIST_DIR" --site="$SITE_ID"

echo "[push] Deploy finished."
# 1. (opcional) asegurarte de estar en la rama correcta
git checkout main

# 2. construir (genera `dist/` y `public/build-meta.json`)
npm run build

# 3. añadir y commitear cambios generados (incluye build-meta si cambió)
git add -A
git commit -m "chore(release): build and prepare dist" || echo "No changes to commit"

# 4. empujar a remoto
git push origin $(git rev-parse --abbrev-ref HEAD)

###netlify


export NETLIFY_AUTH_TOKEN="nfp_g2k4HauQig539rcerbQCkGx7n8CWQHZu067c"
npx netlify deploy --prod --dir=dist --site=becf03c1-b495-476e-beea-0d845899650f
# then
unset NETLIFY_AUTH_TOKEN

####NETLIFY_AUTH_TOKEN=nfp_g2k4HauQig539rcerbQCkGx7n8CWQHZu067c npx netlify deploy --prod --dir=dist --site=becf03c1-b495-476e-beea-0d845899650f




# en pwa/ (ya lo hiciste ejecutable)
#./deploy_from_pwa.sh "chore(release): deploy compact UI and reading-edit feature"
# O solo push sin deploy:
#./deploy_from_pwa.sh -s "chore(release): push only"


# ver short SHA local
#git rev-parse --short HEAD

# listar el contenido de dist para confirmar que fue actualizado
#ls -la dist

# revisar el build-meta escrito en local dist
#cat dist/build-meta.json

# ejecutar netlify cli en modo debug
#NETLIFY_AUTH_TOKEN="..." npx netlify deploy --prod --dir=dist --site=... --debug