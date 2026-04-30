# 🚀 Despliegue: Fix Facturación Contador Z90018

## Problema
El contador Z90018 no mostraba datos en la sección **Facturación** a pesar de tener lecturas registradas.

## Causa Raíz
La función `get_invoices` en la base de datos:
1. Estaba en schema `public` pero la app consulta desde schema `energia`
2. Filtraba `readings` con `meter_id = meter_id_param` (contador) en lugar de `meter_id = meter_rec.id` (UUID)
3. Esto devolvía vacío porque `readings.meter_id` almacena UUID, no el contador

## Archivos Modificados

### 1. Frontend (TypeScript/React)
- `pwa/src/components/Billing.tsx`
  - **Línea 59**: Cambiado `meterId = chosen.contador` → `meterId = chosen.id`
  - Ahora pasa UUID correcto a `getReadings()`

### 2. Backend (SQL — función PostgreSQL)
- `pwa/supabase/functions/get_invoices/get_invoices.sql`
  - **Schema**: Cambiado de `public.get_invoices` → `energia.get_invoices`
  - **Fix crítico** (línea 48): `WHERE meter_id = meter_rec.id` (antes `meter_id_param`)
  - **Tablas calificadas**: todas las referencias usan explícitamente `energia.*`
  - **Segmento**: prioriza `tipo_servicio` del medidor, con fallback a empresa

- `pwa/supabase/functions/get_invoices/index.ts`
  - **Línea 13**: Cliente Supabase ahora con `db: { schema: 'energia' }`

## Pasos para Aplicar el Fix

### Paso 1 — Crear/Actualizar la función en Supabase
1. Abre **Supabase Dashboard** → **SQL Editor**
2. Copia y pega el contenido de:
   ```
   pwa/supabase/functions/get_invoices/get_invoices.sql
   ```
3. Ejecuta la consulta

### Paso 2 — Verificar que el schema 'energia' esté expuesto
1. En Supabase Dashboard: **Settings** → **API**
2. En **Exposed schemas**, asegúrate que `energia` esté en la lista
3. Guardar

### Paso 3 — Probar la función
Ejecuta en SQL Editor:
```sql
SELECT COUNT(*) AS facturas_encontradas
FROM energia.get_invoices('Z90018');
```
Debe devolver ≥ 1 fila (ej: 16 facturas).

### Paso 4 — Reiniciar la app
- Si la app está en desarrollo: `npm run dev` (reinicia el servidor Vite)
- Si está desplegada: make a new deploy

## Resultado Esperado
- Al abrir **Facturación** en el dashboard, el contador Z90018 muestra su tabla de facturas
- Cada fila muestra: fecha, consumo, cargos (energía, distribución, potencia, fijo) e IVA
- ✅ Fix confirmado: la función ahora usa `meter_rec.id` (UUID) para buscar lecturas

## Notas Adicionales
- No se crea tabla de facturas; se calculan on-the-fly con join entre `readings`, `tariffs` y `meters`
- El frontend ahora pasa UUID (no contador) a `getReadings()` y `get_invoices()`
- Si hay problemas, verifica consola del navegador (F12) y logs de Supabase
