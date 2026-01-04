-- 1. Tabla de Tipos de Equipo (Catálogo)
CREATE TABLE IF NOT EXISTS public.equipment_types (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  code character varying(50) NOT NULL,
  name character varying(100) NOT NULL,
  load_category character varying(30) NOT NULL,
  description text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT equipment_types_pkey PRIMARY KEY (id),
  CONSTRAINT equipment_types_code_key UNIQUE (code)
) TABLESPACE pg_default;

-- 2. Tabla de Equipos por Medidor
CREATE TABLE IF NOT EXISTS public.meter_equipment (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  meter_id uuid NOT NULL,
  equipment_type_id uuid NOT NULL,
  equipment_name character varying(150) NOT NULL,
  power_watts numeric(12, 2) NOT NULL CHECK (power_watts > 0),
  estimated_daily_hours numeric(4, 2) NOT NULL CHECK (estimated_daily_hours BETWEEN 0 AND 24),
  -- Columna generada automáticamente
  energy_kwh_month numeric(12, 2) GENERATED ALWAYS AS ((power_watts / 1000.0) * estimated_daily_hours * 30.0) STORED,
  start_date date NOT NULL,
  end_date date NULL,
  is_future boolean NOT NULL DEFAULT false,
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT meter_equipment_pkey PRIMARY KEY (id),
  CONSTRAINT meter_equipment_meter_fk FOREIGN KEY (meter_id) REFERENCES meters (id) ON DELETE CASCADE,
  CONSTRAINT meter_equipment_type_fk FOREIGN KEY (equipment_type_id) REFERENCES equipment_types (id),
  CONSTRAINT check_dates_validity CHECK (end_date IS NULL OR end_date >= start_date)
) TABLESPACE pg_default;

-- 3. Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_meter_equipment_meter ON public.meter_equipment USING btree (meter_id);
CREATE INDEX IF NOT EXISTS idx_meter_equipment_active_period ON public.meter_equipment USING btree (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_meter_equipment_type ON public.meter_equipment USING btree (equipment_type_id);
CREATE INDEX IF NOT EXISTS idx_equipment_types_name ON public.equipment_types USING btree (name);
CREATE INDEX IF NOT EXISTS idx_equipment_types_category ON public.equipment_types USING btree (load_category);

-- 4. Trigger para updated_at (Función genérica)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Aplicar Triggers
DROP TRIGGER IF EXISTS update_meter_equipment_modtime ON public.meter_equipment;
CREATE TRIGGER update_meter_equipment_modtime BEFORE UPDATE ON public.meter_equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_types_modtime ON public.equipment_types;
CREATE TRIGGER update_equipment_types_modtime BEFORE UPDATE ON public.equipment_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Limpieza de datos (Eliminar equipos a Gas si existen)
DELETE FROM public.equipment_types WHERE code IN ('WATER_HEATER_GAS', 'DRYER_GAS');
