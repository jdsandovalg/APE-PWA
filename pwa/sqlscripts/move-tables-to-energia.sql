-- ==========================================
-- MOVER TABLAS AL SCHEMA "energia"
-- AutoProductor de Energía
-- Fecha: 09-Abr-2026
-- ==========================================

-- ==========================================
-- 1. CREAR SCHEMA SI NO EXISTE
-- ==========================================
CREATE SCHEMA IF NOT EXISTS energia;

-- ==========================================
-- 2. MOVER TABLAS EXISTENTES AL SCHEMA energia
-- ==========================================

-- companies
ALTER TABLE public.companies SET SCHEMA energia;

-- tariffs
ALTER TABLE public.tariffs SET SCHEMA energia;

-- meters
ALTER TABLE public.meters SET SCHEMA energia;

-- readings
ALTER TABLE public.readings SET SCHEMA energia;

-- usuarios
ALTER TABLE public.usuarios SET SCHEMA energia;

-- usuarios
ALTER TABLE energia.usuarios SET SCHEMA public;



-- equipment_types
ALTER TABLE public.equipment_types SET SCHEMA energia;

-- meter_equipment
ALTER TABLE public.meter_equipment SET SCHEMA energia;

-- metrics
ALTER TABLE public.metrics SET SCHEMA energia;

-- ==========================================
-- 3. VERIFICAR QUE LAS TABLAS SE MOVIERON
-- ==========================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'energia'
ORDER BY table_name;

-- ==========================================
-- 4. VERIFICAR POLÍTICAS RLS EN NUEVO SCHEMA
-- ==========================================
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'energia'
ORDER BY tablename, policyname;

-- ==========================================
-- NOTAS PARA DASHBOARD SUPABASE
-- ==========================================
/*
1. Ir a: API → Data API Settings
2. Agregar "energia" en Exposed schemas
3. (Opcional) Quitar "public" si no se necesita
4. Guardar cambios
*/