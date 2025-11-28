# CHANGELOG

Todas las notas de cambios notables del proyecto.

## Unreleased - 2025-11-27

### 🚀 Migración Completa a Supabase
- **Migration**: Eliminación completa de localStorage - todas las operaciones ahora usan Supabase directamente
- **Database**: Migración de datos de compañías, medidores, lecturas y tarifas a Supabase
- **Services**: Reorganización de servicios - `supabasePure.ts` para operaciones puras, `supabaseBasic.ts` para funciones básicas
- **Cleanup**: Eliminación de servicios legacy (`storage.ts`, `syncManager.ts`, `smartCompanies.ts`)

### 🎯 Dashboard Mejorado
- **Graphs**: Arreglados gráficos que no se mostraban - corrección de `getReadings` con filtro por medidor
- **Tariffs**: Resuelto problema "Lecturas sin tarifa" - corrección de `findActiveTariffForDate`
- **UI**: Eliminación de botones innecesarios ("Limpiar", "Convertir deltas")
- **Navigation**: Agregado botón de navegación a secciones desde tarjetas del dashboard

### 🏢 Nueva Sección de Compañías
- **CRUD**: Implementación completa de gestión de compañías (crear, leer, actualizar, eliminar)
- **Navigation**: Agregado botón en dashboard y opción en navbar
- **Modal**: `CompaniesModal` para creación y edición de compañías
- **UI**: Interfaz limpia con lista de compañías y botones de acción

### 🧹 Limpieza y Optimización
- **Components**: Eliminación de componentes de prueba (`TariffTester.tsx`, `BillingTest.tsx`, etc.)
- **Code**: Simplificación de `supabase.ts` - ahora solo exporta el cliente
- **Imports**: Corrección de errores de importación después de limpieza
- **Build**: Verificación de builds exitosos y funcionamiento correcto

### 🔧 Mejoras Técnicas
- **Navigation**: Actualización del sistema de navegación para incluir sección de compañías
- **State**: Actualización de tipos TypeScript para incluir nueva vista
- **Performance**: Optimización de carga de datos desde Supabase
- **Error Handling**: Mejor manejo de errores en operaciones de base de datos

## Unreleased - 2025-11-25

### Problemas de Exportación PDF
- **Fix**: Resueltos problemas críticos con la exportación de PDFs que causaban gráficos incompletos y datos faltantes
- **Fix**: Aumentado el ancho de gráficos de 1200px a 1600px para mejor visualización de datos
- **Fix**: Corregida la estrategia del eje X con `tickCount={20}` para mostrar etiquetas de fecha distribuidas uniformemente
- **Fix**: Etiquetas del eje X rotadas 45 grados (`angle: -45, textAnchor: 'end'`) para mejor legibilidad
- **Fix**: `interval={0}` reemplazado por `tickCount={20}` para evitar sobrecarga en gráficos complejos

### Funcionalidad Deshabilitada Temporalmente
- **Disabled**: Botón de exportar PDF del medidor (sección de medidores) - marcado como "deshabilitado"
- **Disabled**: Botones de exportar e importar en la barra de navegación - opacidad reducida y cursores no permitidos
- **Reason**: Problemas técnicos con la generación de PDFs que requieren solución antes de re-habilitar

### Validación de Tarifas
- **Issue Identified**: Fechas de tarifas no corresponden correctamente a trimestres válidos
- **Validation**: Creado script de validación que identifica tarifas con fechas incorrectas
- **Examples Found**:
  - Q3 debería ser `07-01 → 09-30` (no `08-01 → 10-31`)
  - Q4 debería ser `10-01 → 12-31` (no `10-01 → 12-31` pero con días incorrectos)
- **Pending**: Corrección manual de fechas de tarifas en la interfaz de usuario

### Mejoras Técnicas
- **Build**: Múltiples builds exitosos verificando estabilidad del código
- **Performance**: Optimización de gráficos para evitar problemas de renderizado en PDFs
- **UI/UX**: Botones deshabilitados claramente marcados para evitar confusión del usuario

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

- Para solo push sin desplegar automáticamente:

```bash
cd pwa
./deploy_from_pwa.sh -s -m "chore(deploy): push only"
```

### Backup local

- Si necesitas restaurar la copia movida, está en `~/APE-PWA.backup`.

---

_Generado automáticamente el 2025-11-27_

## Unreleased - 2025-11-28

### 🔎 Comparación de facturas (UI + herramientas)
- **UI:** Añadido `InvoiceCompareModal` en `pwa/src/components/InvoiceCompareModal.tsx` — modal que permite subir un PDF de factura, extraer líneas relevantes y mostrar una comparación visual PDF vs sistema.
- **Billing UX:** Moved the compare icon inside the `Fecha` column (`pwa/src/components/Billing.tsx`), added a hover/focus tooltip `Comparar PDF` and replaced the inline SVG with `lucide-react` icons for consistent styling.
- **Parser (cliente):** Added `pwa/src/utils/pdfClientValidator.ts` using `pdfjs-dist` to extract text in-browser and heuristics (`parseInvoiceDetailed`, `parseSimpleInvoiceText`) to obtain fixed charge, energía, distribución, potencia, contribución, IVA y total.
- **Tools (jsutils):** Consolidated utility scripts under `pwa/jsutils/` (audit scripts, PDF validation, recompute helpers, and CLI test runners). Many scripts were added to aid invoice reconciliation and tariff inspection.
- **Debug & Robustness:** Added a small debug panel in the modal to display parsed JSON and values for quick diagnosis; fixed a hooks ordering bug in the modal so React no longer errors on open/close.
- **Behavioral change:** Removed the automatic header OK/DIF badge because it produced confusing results for some invoices; comparison is now intentionally visual and transparent.

### 🧰 Repo & Git
- **Removed large PDFs from index:** PDFs used for parser validation were removed from the git index and `/*.pdf` was added to `.gitignore` so local copies remain but are not pushed.
- **Commits:** UI and tooling changes were committed and pushed in `main` (see commits around 2025-11-27 .. 2025-11-28).

### 📝 Notas y próximos pasos
- Tuning: `parseInvoiceDetailed` is validated against one sample (`2025 - Noviembre - 661116`) and may need additional regex tweaks for other invoice formats. Consider running the existing `pwa/jsutils/test_parse_november.cjs` and adding more samples.
- Bundle size: `pdfjs-dist` pulls a worker that increases bundle size; consider dynamic import or server-side parsing for production.


### Problemas de Exportación PDF
- **Fix**: Resueltos problemas críticos con la exportación de PDFs que causaban gráficos incompletos y datos faltantes
- **Fix**: Aumentado el ancho de gráficos de 1200px a 1600px para mejor visualización de datos
- **Fix**: Corregida la estrategia del eje X con `tickCount={20}` para mostrar etiquetas de fecha distribuidas uniformemente
- **Fix**: Etiquetas del eje X rotadas 45 grados (`angle: -45, textAnchor: 'end'`) para mejor legibilidad
- **Fix**: `interval={0}` reemplazado por `tickCount={20}` para evitar sobrecarga en gráficos complejos

### Funcionalidad Deshabilitada Temporalmente
- **Disabled**: Botón de exportar PDF del medidor (sección de medidores) - marcado como "deshabilitado"
- **Disabled**: Botones de exportar e importar en la barra de navegación - opacidad reducida y cursores no permitidos
- **Reason**: Problemas técnicos con la generación de PDFs que requieren solución antes de re-habilitar

### Validación de Tarifas
- **Issue Identified**: Fechas de tarifas no corresponden correctamente a trimestres válidos
- **Validation**: Creado script de validación que identifica tarifas con fechas incorrectas
- **Examples Found**:
  - Q3 debería ser `07-01 → 09-30` (no `08-01 → 10-31`)
  - Q4 debería ser `10-01 → 12-31` (no `10-01 → 12-31` pero con días incorrectos)
- **Pending**: Corrección manual de fechas de tarifas en la interfaz de usuario

### Mejoras Técnicas
- **Build**: Múltiples builds exitosos verificando estabilidad del código
- **Performance**: Optimización de gráficos para evitar problemas de renderizado en PDFs
- **UI/UX**: Botones deshabilitados claramente marcados para evitar confusión del usuario

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

- Para solo push sin desplegar automáticamente:

```bash
cd pwa
./deploy_from_pwa.sh -s -m "chore(deploy): push only"
```

### Backup local

- Si necesitas restaurar la copia movida, está en `~/APE-PWA.backup`.

---

_Generado automáticamente el 2025-11-25_
