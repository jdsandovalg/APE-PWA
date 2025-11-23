# AutoProductorEnergia PWA — Instrucciones rápidas

Este `README` contiene instrucciones breves para publicar la PWA desde el directorio `pwa/`.

Opciones de despliegue disponibles actualmente:
- `pwa/deploy_via_ftp.sh` — sube `pwa/dist` a un servidor FTP/LAN usando `lftp`.
- `pwa/deploy_to_mounted.sh` — copia `pwa/dist` a una unidad montada con `rsync`.
- Configurar Vercel: añadí `pwa/vercel.json` para facilitar despliegues automáticos desde Vercel (build: `npm --prefix pwa run build`, output: `dist`).

Modos de uso (resumen)

1) Deploy completo (recomendado desde terminal local):

```bash
cd pwa
npm --prefix . run build
# sube manualmente con rsync/lftp o configura Vercel para deploy automático
```

2) Solo push (sin deploy):

```bash
cd pwa
git add -A && git commit -m "chore(release)" || true
git push origin $(git rev-parse --abbrev-ref HEAD)
```

Comportamiento interno
- El script de despliegue ejecuta `npm run build` dentro de `pwa`.
- Hace `git add -A`, `git commit` (si hay cambios) y `git push origin <branch>`.
- Antes del deploy, si `node` está presente intenta actualizar `dist/build-meta.json` con el `commit` y `builtAt`.

Seguridad y buenas prácticas
- No guardes tokens en el repo. Usa secretos de CI (GitHub Actions, Vercel) para credenciales.

Problemas comunes
- Si el deploy falla por autorización, revisa los permisos y las credenciales en el servidor/servicio elegido.

Contacto
- Si quieres, puedo:
  - configurar un workflow de CI (ya hay uno mínimo `.github/workflows/ci.yml` que construye `pwa`), o
  - adaptar un workflow para desplegar a Vercel o a tu servidor FTP/LAN.

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
