# AutoProductorEnergia PWA — Instrucciones rápidas

[![Netlify Status](https://api.netlify.com/api/v1/badges/becf03c1-b495-476e-beea-0d845899650f/deploy-status?branch=main)](https://app.netlify.com/sites/becf03c1-b495-476e-beea-0d845899650f/deploys)

Este `README` contiene instrucciones breves para publicar la PWA desde el directorio `pwa/`.

Archivos útiles
- `push.sh` — script principal para: build → commit → push → deploy a Netlify.
- `deploy_from_pwa.sh` — helper alternativo con la misma funcionalidad; ambos leen token desde la variable de entorno o desde `./.netlify_token`.

Modos de uso (resumen)

1) Deploy completo (recomendado desde terminal local):

```bash
cd pwa
export NETLIFY_AUTH_TOKEN="<tu_token_netlify>"
./push.sh -m "chore(release): mensaje de release"
```

2) Usar archivo local (más cómodo para sesiones locales; el archivo está en `.gitignore`):

```bash
cd pwa
echo "NETLIFY_AUTH_TOKEN=nfp_xxxTU_TOKEN" > .netlify_token
chmod 600 .netlify_token
./push.sh -m "chore(release): mensaje"
```

3) Solo push (sin deploy):

```bash
cd pwa
./push.sh -s -m "chore(release): push only"
```

Comportamiento interno
- El script ejecuta `npm run build` dentro de `pwa`.
- Hace `git add -A`, `git commit` (si hay cambios) y `git push origin <branch>`.
- Antes del deploy, si `node` está presente intenta actualizar `dist/build-meta.json` con el `commit` y `builtAt`.
- Ejecuta `npx netlify deploy --prod --dir=dist --site=<SITE_ID>` usando `NETLIFY_AUTH_TOKEN`.

Seguridad y buenas prácticas
- No guardes tokens en el repo. Si hay un token expuesto (p. ej. en `netfily.sh`), bórralo y rótalo en Netlify.
- Preferible: configurar `NETLIFY_AUTH_TOKEN` como secret en tu CI (GitHub Actions) y usar el workflow existente (`.github/workflows/netlify-deploy.yml`).
- Local: usar `.netlify_token` (archivo con permisos `600`) es mejor que dejar el token dentro del script.

Problemas comunes
- Si el deploy falla por autorización, revisa que el token tenga permisos para desplegar (personal access token con scope apropiado), o ejecuta el comando en modo debug:

```bash
NETLIFY_AUTH_TOKEN="..." npx netlify deploy --prod --dir=dist --site=<SITE_ID> --debug
```

Contacto
- Si quieres, puedo:
  - eliminar `netfily.sh` de la raíz por ti, o
  - mover el token a `pwa/.netlify_token` y borrar la versión en el script.

---
Pequeño recordatorio: los scripts están pensados para ejecutarse desde `pwa/`.
# AutoProductor Energía — PWA

Proyecto PWA minimal para gestión de energía solar (React + TypeScript + Tailwind).

Quick start:

```bash
cd pwa
npm install
npm run dev
```

- App: `src/App.tsx`
- Service Worker: `public/sw.js`
- Manifest: `manifest.json`

Notas:
- Importa CSV con cabeceras `date,consumption,production,credit`.
- Exporta datos en JSON para backup.
