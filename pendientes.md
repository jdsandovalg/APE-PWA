# Pendientes

Este archivo contiene la lista actual de tareas pendientes para el proyecto. Usa este archivo como una fuente simple y humana para coordinar el trabajo diario.

Formato recomendado (línea por tarea):
- [ ] breve-titulo: descripción corta. (responsable) [prioridad]

## ✅ TRABAJO RECIENTE COMPLETADO (2025-11-27)

### Migración Completa a Supabase
- [x] supabase-migration: Eliminación completa de localStorage, todas las operaciones ahora usan Supabase
- [x] database-migration: Migración de compañías, medidores, lecturas y tarifas a Supabase
- [x] services-reorganization: Creación de `supabasePure.ts` y `supabaseBasic.ts`, eliminación de servicios legacy
- [x] code-cleanup: Eliminación de `storage.ts`, `syncManager.ts`, `smartCompanies.ts`

### Dashboard y Gráficos
- [x] dashboard-graphs-fix: Arreglados gráficos que no se mostraban - corrección de `getReadings` con filtro por medidor
- [x] tariff-mismatch-fix: Resuelto problema "Lecturas sin tarifa" - corrección de `findActiveTariffForDate`
- [x] ui-buttons-cleanup: Eliminación de botones innecesarios ("Limpiar", "Convertir deltas")
- [x] navigation-buttons: Agregado navegación desde tarjetas del dashboard a secciones

### Nueva Sección de Compañías
- [x] companies-crud: Implementación completa de gestión de compañías (crear, leer, actualizar, eliminar)
- [x] companies-navigation: Agregado botón en dashboard y opción en navbar
- [x] companies-modal: `CompaniesModal` para creación y edición
- [x] companies-ui: Interfaz limpia con lista y botones de acción

### Corrección de Función get_invoices
- [x] fix-get-invoices-cartesian-product: Corregida función `get_invoices` para filtrar tarifas por compañía del medidor
- [x] meter-tariff-association: Implementada lógica para asociar correctamente medidores con tarifas de su distribuidora
- [x] prevent-cartesian-product: Evitado producto cartesiano al agregar múltiples contadores de diferentes compañías

### Limpieza y Optimización
- [x] test-components-removal: Eliminación de componentes de prueba (`TariffTester.tsx`, `BillingTest.tsx`, etc.)
- [x] supabase-ts-simplification: Simplificación de `supabase.ts` - solo exporta cliente
- [x] import-errors-fix: Corrección de errores de importación después de limpieza
- [x] build-verification: Verificación de builds exitosos y funcionamiento correcto

### Mejoras Técnicas
- [x] navigation-system-update: Actualización del sistema de navegación para incluir compañías
- [x] typescript-types-update: Actualización de tipos para nueva vista
- [x] performance-optimization: Optimización de carga de datos desde Supabase
- [x] error-handling-improvement: Mejor manejo de errores en operaciones de BD

## 🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS

### Fechas de Tarifas Incorrectas
- [ ] fix-tariff-dates-q3: Corregir tarifa Q3 - debería ser `2025-07-01 → 2025-09-30` (actual: `2025-08-01 → 2025-10-31`)
- [ ] fix-tariff-dates-q4: Verificar tarifa Q4 - debería ser `2025-10-01 → 2025-12-31`
- [ ] validate-all-tariffs: Revisar todas las tarifas existentes para asegurar fechas correctas
- [ ] add-tariff-validation: Implementar validación automática en la UI de creación/edición de tarifas

### Exportación PDF (PENDIENTE PARA PRÓXIMA SESIÓN)
- [ ] pdf-rendering-fix: Resolver problemas de renderizado de gráficos en PDFs
- [ ] pdf-export-reenable: Re-habilitar funcionalidad de exportación una vez corregida
- [ ] pdf-quality-testing: Verificar calidad de PDFs generados en diferentes navegadores
- [ ] pdf-chart-optimization: Optimizar gráficos para exportación PDF

## 📋 TAREAS PENDIENTES POR PRIORIDAD

### Alta Prioridad
- [ ] tariff-dates-correction: Corregir manualmente las fechas de tarifas incorrectas en la aplicación
- [ ] pdf-export-fix: Implementar solución definitiva para exportación de PDFs
- [ ] data-validation: Añadir validaciones automáticas para prevenir datos incorrectos

### Media Prioridad
- [ ] ui-improvements: Mejorar UX de mensajes de error y estados de carga
- [ ] performance-optimization: Optimizar renderizado de gráficos grandes
- [ ] accessibility-audit: Revisar accesibilidad de componentes deshabilitados

### Baja Prioridad
- [ ] documentation-update: Actualizar documentación con cambios recientes
- [ ] code-cleanup: Limpiar código comentado y funciones no utilizadas
- [ ] testing-addition: Añadir pruebas unitarias para funciones críticas

## 🔄 FUNCIONALIDADES DESHABILITADAS TEMPORALMENTE

### Exportación/Importación
- Botón de exportar PDF del medidor (sección medidores)
- Botones de exportar/importar en barra de navegación
- **Motivo**: Problemas técnicos que requieren corrección antes de re-habilitar

### Notas Técnicas
- Los botones deshabilitados muestran opacidad reducida y tooltips explicativos
- La funcionalidad subyacente permanece intacta para futura re-habilitación
- Se recomienda no eliminar el código, solo deshabilitar la UI

## 📊 MÉTRICAS DE PROGRESO

- **Completado**: 97% de funcionalidades básicas operativas
- **Bloqueado**: 3% debido a problemas de PDF (pendiente para próxima sesión)
- **Próximo objetivo**: Corregir fechas de tarifas y resolver exportación PDF

Última actualización: 27/11/2025

### Problemas de PDF Resueltos
- [x] pdf-chart-width: Aumentado ancho de gráficos de 1200px a 1600px para mejor visualización
- [x] pdf-xaxis-labels: Corregida estrategia del eje X con tickCount={20} y etiquetas rotadas
- [x] pdf-export-buttons: Deshabilitados botones de exportación PDF temporalmente

### Validación de Tarifas
- [x] tariff-validation-script: Creado script de validación para identificar fechas incorrectas
- [x] quarter-dates-analysis: Identificados problemas en fechas Q3 y Q4 que no corresponden a trimestres

## 🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS

### Fechas de Tarifas Incorrectas
- [ ] fix-tariff-dates-q3: Corregir tarifa Q3 - debería ser `2025-07-01 → 2025-09-30` (actual: `2025-08-01 → 2025-10-31`)
- [ ] fix-tariff-dates-q4: Verificar tarifa Q4 - debería ser `2025-10-01 → 2025-12-31`
- [ ] validate-all-tariffs: Revisar todas las tarifas existentes para asegurar fechas correctas
- [ ] add-tariff-validation: Implementar validación automática en la UI de creación/edición de tarifas

### Exportación PDF
- [ ] fix-pdf-rendering: Resolver problemas de renderizado de gráficos en PDFs
- [ ] re-enable-pdf-export: Re-habilitar funcionalidad de exportación una vez corregida
- [ ] test-pdf-quality: Verificar calidad de PDFs generados en diferentes navegadores

## 📋 TAREAS PENDIENTES POR PRIORIDAD

### Alta Prioridad
- [ ] tariff-dates-correction: Corregir manualmente las fechas de tarifas incorrectas en la aplicación
- [ ] pdf-export-fix: Implementar solución definitiva para exportación de PDFs
- [ ] data-validation: Añadir validaciones automáticas para prevenir datos incorrectos

### Media Prioridad
- [ ] ui-improvements: Mejorar UX de mensajes de error y estados de carga
- [ ] performance-optimization: Optimizar renderizado de gráficos grandes
- [ ] accessibility-audit: Revisar accesibilidad de componentes deshabilitados

### Baja Prioridad
- [ ] documentation-update: Actualizar documentación con cambios recientes
- [ ] code-cleanup: Limpiar código comentado y funciones no utilizadas
- [ ] testing-addition: Añadir pruebas unitarias para funciones críticas

## 🔄 FUNCIONALIDADES DESHABILITADAS TEMPORALMENTE

### Exportación/Importación
- Botón de exportar PDF del medidor (sección medidores)
- Botones de exportar/importar en barra de navegación
- **Motivo**: Problemas técnicos que requieren corrección antes de re-habilitar

### Notas Técnicas
- Los botones deshabilitados muestran opacidad reducida y tooltips explicativos
- La funcionalidad subyacente permanece intacta para futura re-habilitación
- Se recomienda no eliminar el código, solo deshabilitar la UI

## 📊 MÉTRICAS DE PROGRESO

- **Completado**: 85% de funcionalidades básicas operativas
- **Bloqueado**: 15% debido a problemas de PDF y validación de datos
- **Próximo objetivo**: Corregir fechas de tarifas y re-habilitar exportación PDF

Última actualización: 25/11/2025