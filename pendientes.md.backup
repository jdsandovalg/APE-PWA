# Pendientes

Este archivo contiene la lista actual de tareas pendientes para el proyecto. Usa este archivo como una fuente simple y humana para coordinar el trabajo diario.

Formato recomendado (línea por tarea):
- [ ] breve-titulo: descripción corta. (responsable) [prioridad]


Tareas recomendadas inmediatas:
Tareas recomendadas inmediatas (agrupadas por área):

## Despliegue / Producción
- [ ] vercel-promote: Revisar el estado de deployments en Vercel y promover la deployment estable asociada a `2b83429`. (Daniel) [alta]
- [ ] deploy-sanity-check: Crear script/checklist para comprobar `curl -I` en assets después del deploy (content-type y no servir index.html). (Daniel) [alta]

## Backup / Rollback
- [ ] crear-branch-backup: Crear rama backup con commits posteriores al rollback por si necesitamos recuperar trabajo. (Daniel) [media]

## CI / Protecciones
- [ ] ci-protection: Añadir comprobación en CI para impedir merges a `main` sin PR aprobado y build exitoso. (Daniel) [alta]

## Funcionalidad / QA
- [ ] test-sync-scenario: Escribir pruebas y/o checklist manual para la funcionalidad de sincronización (incluye mocks para remote). (Daniel) [media]
- [ ] export-dashboard-pdf: Implementar exportador PDF para un `contador` y `correlativo` (ver nota abajo). (Daniel) [media]

## Documentación
- [ ] actualizar-readme: Añadir sección corta que enlace a `Colaboracion_Profesional.md` y explique el flujo de PRs/Deploys. (Daniel) [baja]

### Nota: export-dashboard-pdf
Objetivo: generar un PDF a color con la información de un `contador` y `correlativo` — básicamente una versión imprimible del Dashboard con datos y gráficos.

Enfoque propuesto (rápido):

1. Generar la vista HTML del dashboard (usar el `pwa/dist/index.html` construido o la Preview URL de Vercel).
2. Usar Puppeteer para renderizar la página y exportar a PDF (configurar tamaño A4 o Letter, opción color).
3. Añadir un script `scripts/generate-dashboard-pdf.js` que sirve `pwa/dist` localmente y genera el PDF.

Dependencias: instalar `puppeteer` en el entorno donde se ejecute el script:

```bash
# desde la raíz del repo
cd pwa
npm install --save-dev puppeteer
```

Uso (local):

```bash
cd /path/to/repo
node scripts/generate-dashboard-pdf.js --output=dashboard-contador-123.pdf --contador=123 --correlativo=456
```

El script de ejemplo intentará abrir la ruta local `http://localhost:PORT/?contador=123&correlativo=456` y generar un PDF.

Instrucciones rápidas para el asistente:
- Para pedirme que lea este archivo: escribe `Lee pendientes.md` o `Revisa pendientes`.

Última actualización: 23/11/2025
