-- ==========================================
-- TABLA METERS - DDL COMPLETO
-- ==========================================

-- Crear tabla meters
CREATE TABLE IF NOT EXISTS meters (
  id TEXT PRIMARY KEY,
  meter_id TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  address TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'disconnected')),
  installation_date DATE,
  last_reading_date DATE,
  tariff_id TEXT,
  multiplier DECIMAL(5,2) DEFAULT 1.0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_meters_meter_id ON meters(meter_id);
CREATE INDEX IF NOT EXISTS idx_meters_status ON meters(status);
CREATE INDEX IF NOT EXISTS idx_meters_tariff_id ON meters(tariff_id);
CREATE INDEX IF NOT EXISTS idx_meters_deleted_at ON meters(deleted_at);

-- Habilitar RLS
ALTER TABLE meters ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para meters
CREATE POLICY "Users can view all meters" ON meters
FOR SELECT USING (true);

CREATE POLICY "Users can insert meters" ON meters
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update meters" ON meters
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Users can soft delete meters" ON meters
FOR UPDATE USING (true)
WITH CHECK (
  (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) OR
  (OLD.deleted_at = NEW.deleted_at)
);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meters_updated_at
  BEFORE UPDATE ON meters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- DATOS DE EJEMPLO PARA METERS
-- ==========================================

INSERT INTO meters (id, meter_id, customer_name, address, phone, status, installation_date, tariff_id, multiplier, notes) VALUES
('M001', 'Z90018', 'Juan Pérez García', 'Zona 1, Ciudad de Guatemala', '+502 5555-1234', 'active', '2024-01-15', 'EEGSA-BTSA-2025Q1', 1.0, 'Medidor principal de residencia'),
('M002', 'Z90019', 'María López Rodríguez', 'Zona 10, Ciudad de Guatemala', '+502 5555-5678', 'active', '2024-02-20', 'EEGSA-BTSA-2025Q1', 1.0, 'Casa familiar'),
('M003', 'Z90020', 'Carlos Martínez Sánchez', 'Zona 15, Ciudad de Guatemala', '+502 5555-9012', 'active', '2024-03-10', 'EEGSA-BTSA-2025Q2', 1.0, 'Apartamento'),
('M004', 'Z90021', 'Ana González Ramírez', 'Zona 4, Ciudad de Guatemala', '+502 5555-3456', 'active', '2024-04-05', 'EEGSA-BTSA-2025Q2', 1.0, 'Oficina pequeña'),
('M005', 'Z90022', 'Roberto Díaz Morales', 'Zona 12, Ciudad de Guatemala', '+502 5555-7890', 'inactive', '2024-05-12', 'EEGSA-BTSA-2025Q3', 1.0, 'Medidor temporalmente desconectado'),
('M006', 'Z90023', 'Patricia Ruiz Hernández', 'Zona 7, Ciudad de Guatemala', '+502 5555-1111', 'active', '2024-06-18', 'EEGSA-BTSA-2025Q3', 1.5, 'Medidor con multiplicador por transformador'),
('M007', 'Z90024', 'Miguel Torres Jiménez', 'Zona 9, Ciudad de Guatemala', '+502 5555-2222', 'active', '2024-07-25', 'EEGSA-BTSA-2025Q4', 1.0, 'Residencia con panel solar'),
('M008', 'Z90025', 'Carmen Flores Castillo', 'Zona 16, Ciudad de Guatemala', '+502 5555-3333', 'disconnected', '2024-08-30', 'EEGSA-BTSA-2025Q4', 1.0, 'Medidor desconectado por falta de pago'),
('M009', 'Z90026', 'Francisco Morales Luna', 'Zona 2, Ciudad de Guatemala', '+502 5555-4444', 'active', '2024-09-14', 'EEGSA-BTSA-2025Q1', 1.0, 'Negocio pequeño'),
('M010', 'Z90027', 'Gabriela Herrera Vargas', 'Zona 11, Ciudad de Guatemala', '+502 5555-5555', 'active', '2024-10-08', 'EEGSA-BTSA-2025Q2', 2.0, 'Industria ligera con multiplicador')
ON CONFLICT (id) DO NOTHING;

-- Actualizar last_reading_date basado en readings existentes
UPDATE meters
SET last_reading_date = (
  SELECT MAX(date)
  FROM readings
  WHERE readings.meter_id = meters.meter_id
)
WHERE EXISTS (
  SELECT 1 FROM readings WHERE readings.meter_id = meters.meter_id
);

-- ==========================================
-- VERIFICACIÓN
-- ==========================================

-- Contar registros insertados
SELECT COUNT(*) as total_meters FROM meters WHERE deleted_at IS NULL;

-- Mostrar algunos registros de ejemplo
SELECT id, meter_id, customer_name, status, tariff_id, multiplier
FROM meters
WHERE deleted_at IS NULL
ORDER BY id
LIMIT 5;
