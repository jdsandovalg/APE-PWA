-- ==========================================
-- AJUSTAR POLÍTICAS RLS PARA TABLA METERS
-- ==========================================

-- Primero, verificar políticas actuales
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'meters';

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.meters;
DROP POLICY IF EXISTS "Enable read access for anonymous users" ON public.meters;

-- Crear políticas más permisivas para desarrollo
-- Permitir todas las operaciones para usuarios autenticados
CREATE POLICY "meters_authenticated_all" ON public.meters
    FOR ALL USING (auth.role() = 'authenticated');

-- Permitir lectura para usuarios anónimos (útil para desarrollo)
CREATE POLICY "meters_anonymous_read" ON public.meters
    FOR SELECT USING (true);

-- Verificar que RLS esté habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'meters' AND schemaname = 'public';