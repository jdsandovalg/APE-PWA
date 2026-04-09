# 📋 Plan Solar Schema - AutoProductor de Energía

## Objetivo
Proyecto para gestionar energía solar. Las tablas existentes ya están en el schema `energia`.

---

## 📊 Tablas del Sistema (schema: energia)

| # | Tabla | Propósito | Columnas principales |
|---|-------|-----------|---------------------|
| 1 | `companies` | Compañías distribuidoras (EEGSA, etc.) | id, code, name, deleted_at |
| 2 | `tariffs` | Tarifas eléctricas por período | id, company, company_code, segment, period_from, period_to, fixed_charge_q, energy_q_per_kwh, etc. |
| 3 | `meters` | Medidores registrados | id, contador, correlativo, propietaria, nit, distribuidora, tipo_servicio, sistema, kwp, installation_date |
| 4 | `readings` | Lecturas de consumo/producción | meter_id, date, consumption, production, credit |
| 5 | `usuarios` | Usuarios del sistema | id, responsable, clave, tipo_usuario, ubicacion, email, avatar_url |
| 6 | `equipment_types` | Catálogo tipos de equipo | id, code, name, load_category, description |
| 7 | `meter_equipment` | Equipos por medidor | id, meter_id, equipment_type_id, equipment_name, power_watts, estimated_daily_hours |

---

## 📝 Bitácora de Ejecución

| # | Fecha | Tabla | Estado | Notas |
|---|-------|-------|--------|-------|
| 1 | 09-Abr-2026 | companies | ✅ Movida a schema energia | - |
| 2 | 09-Abr-2026 | tariffs | ✅ Movida a schema energia | - |
| 3 | 09-Abr-2026 | meters | ✅ Movida a schema energia | - |
| 4 | 09-Abr-2026 | readings | ✅ Movida a schema energia | - |
| 5 | 09-Abr-2026 | usuarios | ✅ Vista → public.usuarios | Alias en energia, tabla real en public |
| 6 | 09-Abr-2026 | equipment_types | ✅ Movida a schema energia | - |
| 7 | 09-Abr-2026 | meter_equipment | ✅ Movida a schema energia | - |

---

## 📋 Distribución de Schemas

| Schema: energia | Schema: public |
|----------------|----------------|
| companies | usuarios (vista → public.usuarios) |
| tariffs | |
| meters | |
| readings | |
| equipment_types | |
| meter_equipment | |

---

*Documento actualizado: 09-Abr-2026*