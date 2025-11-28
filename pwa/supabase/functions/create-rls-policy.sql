-- DDL para crear la política RLS que permite eliminación de tarifas
-- Ejecutar esto en el SQL Editor de Supabase

-- Política para permitir UPDATE en deleted_at (soft delete)
-- Solo usuarios autenticados pueden marcar tarifas como eliminadas
CREATE POLICY "Users can soft delete tariffs" ON tariffs
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (
  -- Solo permitir cambios en deleted_at cuando se está eliminando
  (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) OR
  -- O permitir otros updates si deleted_at no cambia
  (OLD.deleted_at = NEW.deleted_at)
);

-- Si quieres permitir que cualquier usuario (incluyendo anónimo) pueda eliminar:
-- CREATE POLICY "Anyone can soft delete tariffs" ON tariffs
-- FOR UPDATE
-- USING (true)
-- WITH CHECK (
--   (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) OR
--   (OLD.deleted_at = NEW.deleted_at)
-- );

-- Verificar que RLS esté habilitado en la tabla
ALTER TABLE tariffs ENABLE ROW LEVEL SECURITY;

-- Para verificar las políticas existentes:
-- SELECT * FROM pg_policies WHERE tablename = 'tariffs';