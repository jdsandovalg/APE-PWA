-- ==========================================
-- AGREGAR CAMPO kwp A TABLA METERS
-- ==========================================

-- Agregar columna kwp (potencia pico en kW)
ALTER TABLE public.meters ADD COLUMN kwp numeric;

-- Actualizar registros existentes con valores calculados (opcional)
-- UPDATE public.meters SET kwp = 3.75 WHERE sistema LIKE '%6 paneles%625%';
-- UPDATE public.meters SET kwp = ... (agregar según sea necesario)

-- Verificar que la columna se agregó
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'meters' AND column_name = 'kwp';