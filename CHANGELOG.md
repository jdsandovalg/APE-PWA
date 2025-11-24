# CHANGELOG

Todas las notas de cambios notables del proyecto.

## v0.1.0 - 2025-11-23

- Añadido: `InvoiceModal` mejora — muestra líneas de factura (Concepto / Valor/Tasa / Importe) y lecturas asociadas (Saldo Anterior, Lectura Actual, Saldo, Resultado).
- Cambiado: UI más compacta (botones icon-first, tamaños de fuente reducidos para tablas y cabeceras de modal a 10px).
- Mejorado: accesibilidad y comportamiento de modales — `role="dialog"`, `aria-modal`, cierre con `Escape`, enfoque programático al botón de cerrar y restauración del foco.
- Arreglo: se eliminó/archivó la carpeta duplicada accidental `pwa/APE-PWA` (movida a `~/APE-PWA.backup`) y se registró la eliminación en Git.
- Infra: script de despliegue `pwa/deploy_from_pwa.sh` revisado — helpers para `npm run build` y commit/push. Netlify-specific deploy steps were removed; use Vercel or the provided FTP/rsync helpers.
- Build: generación de `pwa/dist` y `vite preview` corriendo localmente (por defecto en http://localhost:4173/).

### Notas de despliegue

- Para deploy completo desde `pwa` usar (recomendado en CI o con token en entorno):

```bash
cd pwa
npm --prefix . run build
# Use pwa/deploy_via_ftp.sh or configure Vercel for automatic deploys
```

-- Para solo push sin desplegar automáticamente:

```bash
cd pwa
./deploy_from_pwa.sh -s -m "chore(deploy): push only"
```

````markdown
# CHANGELOG

Todas las notas de cambios notables del proyecto.

## v0.1.0 - 2025-11-23

- Añadido: `InvoiceModal` mejora — muestra líneas de factura (Concepto / Valor/Tasa / Importe) y lecturas asociadas (Saldo Anterior, Lectura Actual, Saldo, Resultado).
- Cambiado: UI más compacta (botones icon-first, tamaños de fuente reducidos para tablas y cabeceras de modal a 10px).
- Mejorado: accesibilidad y comportamiento de modales — `role="dialog"`, `aria-modal`, cierre con `Escape`, enfoque programático al botón de cerrar y restauración del foco.
- Arreglo: se eliminó/archivó la carpeta duplicada accidental `pwa/APE-PWA` (movida a `~/APE-PWA.backup`) y se registró la eliminación en Git.
- Infra: script de despliegue `pwa/deploy_from_pwa.sh` revisado — helpers para `npm run build` y commit/push. Netlify-specific deploy steps were removed; use Vercel or the provided FTP/rsync helpers.
- Build: generación de `pwa/dist` y `vite preview` corriendo localmente (por defecto en http://localhost:4173/).

### Notas de despliegue

- Para deploy completo desde `pwa` usar (recomendado en CI o con token en entorno):

```bash
cd pwa
npm --prefix . run build
# Use pwa/deploy_via_ftp.sh or configure Vercel for automatic deploys
```

-- Para solo push sin desplegar automáticamente:

```bash
cd pwa
./deploy_from_pwa.sh -s -m "chore(deploy): push only"
```

### Backup local

- Si necesitas restaurar la copia movida, está en `~/APE-PWA.backup`.

---

_Generado automáticamente el 2025-11-23_

## Unreleased - 2025-11-24

- Fix: PDF export — forced `landscape` orientation and improved print layout (opaque page background, centered inner container).
- Fix: Prevent React/scripts executing inside export iframe by copying only safe `<head>` elements (`link[rel=stylesheet]`, `style`, `meta`, `title`) and adding a `<base>` to resolve assets.
- Feature: Billing table generation moved to print-only helper (`pwa/src/utils/billingPdfHelper.ts`) and appended at export time (no longer visible in live Dashboard).
- Improvement: Charts and dashboard cards scale to better use landscape width; chart heights and Y-axis tick fonts reduced for denser PDF layouts.
- Fix: Inline SVG text styling during export to preserve Recharts labels in generated PDF.
- Chore: Added backup branch `backup-before-20251124T220053Z` containing interim work; main updated to commit `41fa879`.

_Commit: 41fa879 — chore: export PDF landscape + scale charts for print_

````
