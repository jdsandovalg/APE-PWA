-- ==========================================
-- AJUSTAR POLÍTICAS RLS PARA TABLA METERS
-- ==========================================

-- Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.meters;
DROP POLICY IF EXISTS "Enable read access for anonymous users" ON public.meters;
DROP POLICY IF EXISTS "Enable insert access for anonymous users" ON public.meters;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON public.meters;
DROP POLICY IF EXISTS "Enable update for public" ON public.meters;
DROP POLICY IF EXISTS "meters_authenticated_all" ON public.meters;
DROP POLICY IF EXISTS "meters_anonymous_all" ON public.meters;
DROP POLICY IF EXISTS "meters_anonymous_read" ON public.meters;

-- Crear políticas limpias para desarrollo
-- Permitir todas las operaciones para usuarios anónimos (para desarrollo)
CREATE POLICY "meters_anonymous_all" ON public.meters
    FOR ALL USING (true);

-- Verificar políticas actuales
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'meters';

-- Verificar que RLS esté habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'meters' AND schemaname = 'public';