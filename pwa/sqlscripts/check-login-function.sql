-- ==========================================
-- VER DEFINICIÓN DE login_user
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- Ver la definición de la función
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'login_user';

-- O más legible
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'login_user';