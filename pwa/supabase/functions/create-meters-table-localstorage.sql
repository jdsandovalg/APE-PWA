-- DDL para crear la tabla meters idéntica a localStorage
-- Ejecutar en SQL Editor de Supabase

-- Crear tabla meters con estructura idéntica a MeterInfo de localStorage
CREATE TABLE IF NOT EXISTS meters (
  id SERIAL PRIMARY KEY,
  contador VARCHAR(50) UNIQUE NOT NULL,        -- ID del contador/medidor (equivalente a meter_id)
  correlativo VARCHAR(50),                     -- Número correlativo
  propietaria VARCHAR(255),                    -- Nombre del propietario
  nit VARCHAR(50),                             -- NIT del propietario
  distribuidora VARCHAR(100),                  -- Empresa distribuidora
  tipo_servicio VARCHAR(50),                   -- Tipo de servicio (BTSA, MTSA, etc.)
  sistema TEXT,                                -- Descripción del sistema
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'disconnected')),
  installation_date DATE DEFAULT CURRENT_DATE,
  address TEXT,                                -- Dirección (campo adicional)
  phone VARCHAR(50),                           -- Teléfono (campo adicional)
  notes TEXT,                                  -- Notas adicionales
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_meters_contador ON meters(contador);
CREATE INDEX IF NOT EXISTS idx_meters_distribuidora ON meters(distribuidora);
CREATE INDEX IF NOT EXISTS idx_meters_tipo_servicio ON meters(tipo_servicio);
CREATE INDEX IF NOT EXISTS idx_meters_status ON meters(status);
CREATE INDEX IF NOT EXISTS idx_meters_deleted_at ON meters(deleted_at);

-- Habilitar RLS
ALTER TABLE meters ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (igual que otras tablas)
CREATE POLICY "Enable read access for all users" ON meters
FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON meters
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON meters
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable soft delete for authenticated users" ON meters
FOR UPDATE USING (auth.role() = 'authenticated')
WITH CHECK (
  (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) OR
  (OLD.deleted_at = NEW.deleted_at)
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_meters_updated_at ON meters;
CREATE TRIGGER update_meters_updated_at
  BEFORE UPDATE ON meters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- INSERT DEL REGISTRO QUE ESTÁ EN LOCALSTORAGE
-- ==========================================

-- Insertar el registro por defecto de localStorage
INSERT INTO meters (
  contador,
  correlativo,
  propietaria,
  nit,
  distribuidora,
  tipo_servicio,
  sistema,
  status
) VALUES (
  'Z90018',                          -- contador
  '661116',                          -- correlativo
  'Vilma Susana Rojas Castillo',     -- propietaria
  '623758-4',                        -- nit
  'EEGSA',                           -- distribuidora
  'BTSA',                            -- tipo_servicio
  '6 paneles de 625W + inversor 5kW', -- sistema
  'active'                           -- status
) ON CONFLICT (contador) DO UPDATE SET
  correlativo = EXCLUDED.correlativo,
  propietaria = EXCLUDED.propietaria,
  nit = EXCLUDED.nit,
  distribuidora = EXCLUDED.distribuidora,
  tipo_servicio = EXCLUDED.tipo_servicio,
  sistema = EXCLUDED.sistema,
  updated_at = NOW();

-- ==========================================
-- VERIFICACIÓN
-- ==========================================

-- Verificar que se insertó correctamente
SELECT
  id,
  contador,
  correlativo,
  propietaria,
  nit,
  distribuidora,
  tipo_servicio,
  sistema,
  status,
  installation_date,
  created_at,
  updated_at
FROM meters
WHERE contador = 'Z90018' AND deleted_at IS NULL;