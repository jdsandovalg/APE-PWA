-- Crear tabla de metrics para estadísticas y métricas de la aplicación
-- Ejecutar en SQL Editor de Supabase

-- Tabla para almacenar métricas de uso y rendimiento
CREATE TABLE IF NOT EXISTS metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type VARCHAR(50) NOT NULL, -- 'usage', 'performance', 'error', etc.
  metric_name VARCHAR(100) NOT NULL, -- nombre específico de la métrica
  value_numeric DECIMAL(15,6), -- valor numérico si aplica
  value_text TEXT, -- valor textual si aplica
  metadata JSONB, -- datos adicionales en JSON
  user_id UUID, -- si aplica a un usuario específico
  session_id VARCHAR(100), -- ID de sesión
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_metrics_type ON metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_user ON metrics(user_id) WHERE user_id IS NOT NULL;

-- Políticas RLS (si las necesitas)
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

-- Política básica: permitir insertar métricas (para logging)
CREATE POLICY "Allow insert metrics" ON metrics
FOR INSERT
WITH CHECK (true);

-- Política para leer métricas (solo admin o mismo usuario)
CREATE POLICY "Users can read own metrics" ON metrics
FOR SELECT
USING (auth.uid() = user_id OR auth.role() = 'admin');

-- Insertar algunas métricas de ejemplo
INSERT INTO metrics (metric_type, metric_name, value_numeric, value_text, metadata) VALUES
('app', 'tariffs_loaded', 6, 'Número de tarifas activas', '{"source": "supabase"}'),
('app', 'companies_loaded', 3, 'Número de compañías activas', '{"source": "supabase"}'),
('performance', 'load_time', 1.5, 'Tiempo de carga inicial', '{"component": "TariffTester"}');

-- Verificar que se creó correctamente
SELECT * FROM metrics ORDER BY created_at DESC LIMIT 5;