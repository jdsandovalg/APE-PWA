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

How to use the Invoice Compare modal

1. Open the app and go to the **Facturación** / Billing view.
2. In the table, find the row for the invoice period you want to inspect. The small bar-chart icon is next to the date.
3. Click the icon (or focus + Enter) to open the **Comparar factura** modal.
4. In the modal, click **Subir PDF** and choose the invoice PDF file. The app parses the PDF locally (client-side) and displays a side-by-side comparison of the PDF values vs the system-calculated values.
5. Use the **Descargar diff** button to export a JSON file with parsed PDF fields and the system invoice object for offline analysis.

## Facturación y cargos financieros

- El sistema captura y gestiona únicamente las lecturas (`readings`) y las tarifas (`tariffs`).
- Las facturas presentadas en la interfaz incluyen una comparación calculada por el sistema basada en las lecturas y la tarifa activa (cargo fijo, energía, distribución, potencia, IVA y contribución) para propósitos operativos.
- Cargos financieros derivados de la facturación (por ejemplo, mora, intereses, recargos administrativos) son considerados elementos financieros que NO se capturan ni se almacenan en este sistema desde la interfaz de lecturas.
- Si una factura PDF incluye cargos adicionales (mora, intereses, cargos administrativos), esos montos pueden aparecer en el PDF y ser visibles en el comparador, pero no se guardan en la base de datos como parte de la tabla `readings` ni se sincronizan automáticamente.
- Esta decisión es intencional: el producto mantiene separadas las responsabilidades operativas (lecturas, cálculo estimado de facturas) y las responsabilidades financieras (cobros, mora). Las acciones financieras deben gestionarse en el módulo financiero/contable correspondiente fuera de este repositorio.

Si necesitas que el sistema muestre una línea explícita "Mora" en la tabla de facturación cuando el `invoice_data` contenga ese campo, podemos añadir la visualización en la UI —pero NO se persistirá en las lecturas; seguirá siendo una nota visual/consulta sobre el PDF o el JSON de la factura.

Notes and privacy
-----------------
- PDF parsing is performed in the browser using `pdfjs-dist`; the file is not uploaded anywhere unless you explicitly export/share the JSON diff.
- If the parser fails to detect fields correctly, open the debug panel in the modal (bug icon) to inspect the raw parsed JSON and the snippet extracted from the PDF.

Troubleshooting
---------------
- If the compare icon doesn't appear, try refreshing the page — HMR should display the updated icon.
- If totals look different, verify the invoice's numeric formats (commas vs dots) and use the debug panel to see what the parser extracted.

Notas:
- Importa CSV con cabeceras `date,consumption,production,credit`.
- Exporta datos en JSON para backup.
