-- ==========================================
-- CREAR VISTA/ALIAS usuarios EN SCHEMA energia
-- Apunta a public.usuarios
-- Fecha: 09-Abr-2026
-- ==========================================

-- Crear vista en schema energia que apunta a public.usuarios
CREATE OR REPLACE VIEW energia.usuarios AS
SELECT * FROM public.usuarios;

-- Verificar que la vista existe
SELECT table_name, table_schema, table_type
FROM information_schema.tables 
WHERE table_name = 'usuarios' AND table_schema = 'energia';

-- Probar que se puede leer desde energia
SELECT COUNT(*) as registros FROM energia.usuarios;