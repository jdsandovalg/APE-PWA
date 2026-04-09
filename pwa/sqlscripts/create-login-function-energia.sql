-- ==========================================
-- CORREGIR FUNCTION login_user EN SCHEMA energia
-- El problema es que la vista tiene columnas en diferente orden
-- Fecha: 09-Abr-2026
-- ==========================================

-- Primero verificar la estructura de la vista
SELECT column_name, data_type, ordinal_position
FROM information_schema.columns
WHERE table_schema = 'energia' AND table_name = 'usuarios'
ORDER BY ordinal_position;

-- Eliminar y recrear la función con columnas explícitas
DROP FUNCTION IF EXISTS energia.login_user(TEXT, TEXT);

CREATE OR REPLACE FUNCTION energia.login_user(
    p_identifier TEXT,
    p_clave TEXT
)
RETURNS TABLE (
    id BIGINT,
    created_at TIMESTAMPTZ,
    responsable TEXT,
    clave TEXT,
    tipo_usuario TEXT,
    ubicacion TEXT,
    email TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validar parámetros no nulos
    IF p_identifier IS NULL OR TRIM(p_identifier) = '' THEN
        RETURN;
    END IF;
    
    IF p_clave IS NULL OR TRIM(p_clave) = '' THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        u.id, 
        u.created_at,
        u.responsable, 
        u.clave,
        u.tipo_usuario, 
        u.ubicacion, 
        u.email,
        u.avatar_url
    FROM energia.usuarios u
    WHERE 
        (LOWER(TRIM(u.email)) = LOWER(TRIM(p_identifier))
        OR u.id::TEXT = TRIM(p_identifier)
        OR LOWER(TRIM(u.ubicacion)) = LOWER(TRIM(p_identifier)))
        AND (u.clave = crypt(TRIM(p_clave), u.clave) 
             OR u.clave = TRIM(p_clave))
    LIMIT 1;
END;
$$;

-- Verificar
SELECT proname, pronamespace::regnamespace as schema
FROM pg_proc 
WHERE proname = 'login_user';