-- ==========================================
-- MOVER TABLA usuarios A SCHEMA public
-- Fecha: 09-Abr-2026
-- ==========================================

-- Mover usuarios de energia a public
ALTER TABLE energia.usuarios SET SCHEMA public;

-- Verificar que se movió
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'usuarios';

-- Verificar que existe en public
SELECT 'usuarios' as tabla, COUNT(*) as registros FROM usuarios;