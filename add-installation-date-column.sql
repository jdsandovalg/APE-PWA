-- Add installation_date column to meters table for solar system installation tracking
-- This allows for more accurate seasonal analysis by only considering data from installation date onwards

ALTER TABLE meters ADD COLUMN installation_date DATE;

-- Add comment to document the purpose
COMMENT ON COLUMN meters.installation_date IS 'Fecha de instalación del sistema solar fotovoltaico. Usado para análisis estacionales precisos.';

-- Optional: Add index for performance if needed
CREATE INDEX IF NOT EXISTS idx_meters_installation_date ON meters(installation_date);