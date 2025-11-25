# CHANGELOG

Todas las notas de cambios notables del proyecto.

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

_Generado automáticamente el 2025-11-25_
