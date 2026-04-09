# 📋 Plan de Reorganización de Schemas en Supabase

## 📌 Objetivo

Mover las tablas de proyectos existentes a schemas dedicados, **NO se crean sistemas nuevos**, solo se reorganizan las tablas existentes en nuevos schemas.

> **Importante:** Este proceso es una **reorganización**, no una migración con creación de nuevas tablas. Solo se trasladan tablas existentes a un schema específico.

---

## ⚠️ Proyectos a Reorganizar

| # | Proyecto | Schema destino | Estado |
|---|----------|---------------|--------|
| 1 | AutoProductorEnergia (pwa) | `energia` | ✅ Completado (09-Abr-2026) |
| 2 | Villas de Alcala App (val-app) | `valapp` | ⏳ Pendiente |

---

## ✅ AutoProductorEnergia - Schema: energia

### Fecha: 09-Abr-2026

**Tablas movidas (6):**
- companies
- tariffs
- meters
- readings
- equipment_types
- meter_equipment

**特殊情况 (1):**
- `usuarios` → Vista en `energia` apuntando a `public.usuarios` (compartida con otra app)

### Implementación en código:

```typescript
// pwa/src/services/supabase.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'energia'
  }
})
```

---

## 📋 Enfoque Correcto: `db.schema` en el cliente de Supabase

La solución correcta es configurar el schema en el cliente de Supabase, no en las queries.

### Implementación:

**1. Cliente (supabase.ts):**
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(url, key, {
  db: {
    schema: 'energia'  // ← Aquí se define el schema
  }
})
```

**2. Supabase Dashboard → API → Data API Settings:**
- Agregar `energia` en **Exposed schemas**
- Guardar cambios

### Resultado:
- Las queries usan `supabase.from('companies')` (sin prefijo)
- El cliente automáticamente busca en el schema configurado
- Las tablas deben estar en el schema configurado (`energia`)

---

## 📋 Pasos para Migrar un Proyecto a un Nuevo Schema

### Requisitos previos:
1. ✅ Schema creado (CREATE SCHEMA IF NOT EXISTS nombre_schema)
2. Tablas movidas al nuevo schema con `ALTER TABLE schema.tabla SET SCHEMA nuevo_schema`
3. Schema expuesto en **Dashboard → API → Data API Settings**
4. ✅ Cliente configurado con `db.schema`

### Código a cambiar en el cliente:
```typescript
{
  db: {
    schema: 'nombre_schema'  // Cambiar aquí
  }
}
```

### NO se necesita:
- ❌ Crear nuevas tablas (ya existen)
- ❌ Cambiar queries individuales
- ❌ Usar prefijos como `schema.tabla`
- ❌ Configurar search_path a nivel de base de datos

---

## 📋 Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| `PGRST205` - "Could not find the table" | Schema no expuesto o tablas en otro schema | Verificar en Dashboard API Settings |
| `TypeError: Cannot read properties of undefined (reading 'get')` | Cookies no inicializadas | Wrapped getAll/setAll en try/catch |
| `public.energia.companies` | Usar prefijo en queries | NO usar prefijo - el cliente lo maneja |

---

## 📋 Scripts de referencia

| Script | Propósito |
|--------|-----------|
| `sqlscripts/move-tables-to-energia.sql` | Mover tablas a schema energia |
| `sqlscripts/move-usuarios-to-public.sql` | Mover usuarios a public |
| `sqlscripts/create-usuarios-alias.sql` | Crear vista alias para usuarios |
| `pwa/jsutils/test-solar-tables.js` | Test de conexión y tablas |

---

*Documento actualizado: 09-Abr-2026*
*Estado: AutoProductorEnergia ✅ completo, val-app ⏳ pendiente*