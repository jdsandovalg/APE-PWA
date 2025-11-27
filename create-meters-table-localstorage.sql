-- ==========================================
-- DDL PARA TABLA METERS - ESTRUCTURA IDÉNTICA A LOCALSTORAGE
-- ==========================================

-- Crear tabla meters con estructura idéntica a MeterInfo de localStorage
CREATE TABLE IF NOT EXISTS public.meters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contador VARCHAR(50) NOT NULL UNIQUE,
    correlativo VARCHAR(50),
    propietaria VARCHAR(255),
    nit VARCHAR(50),
    distribuidora VARCHAR(100),
    tipo_servicio VARCHAR(50),
    sistema TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_meters_contador ON public.meters(contador) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_meters_deleted_at ON public.meters(deleted_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.meters ENABLE ROW LEVEL SECURITY;

-- Crear política RLS para permitir todas las operaciones (ajusta según necesites)
CREATE POLICY "Enable all operations for authenticated users" ON public.meters
    FOR ALL USING (auth.role() = 'authenticated');

-- Crear política para usuarios anónimos (solo lectura)
CREATE POLICY "Enable read access for anonymous users" ON public.meters
    FOR SELECT USING (true);

-- Insertar el registro por defecto (Vilma Susana Rojas Castillo)
INSERT INTO public.meters (
    contador,
    correlativo,
    propietaria,
    nit,
    distribuidora,
    tipo_servicio,
    sistema
) VALUES (
    'Z90018',
    '661116',
    'Vilma Susana Rojas Castillo',
    '623758-4',
    'EEGSA',
    'BTSA',
    '6 paneles de 625W + inversor 5kW'
) ON CONFLICT (contador) DO NOTHING;

-- Crear trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meters_updated_at
    BEFORE UPDATE ON public.meters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();