-- DDL to create the get_invoices PostgreSQL function
-- Run this in your Supabase SQL Editor to create the function
-- CORRECTION: Now filters tariffs by meter company to avoid cartesian product when multiple companies exist

CREATE OR REPLACE FUNCTION get_invoices(meter_id_param TEXT)
RETURNS TABLE(
  invoice_date DATE,
  consumption_kwh NUMERIC,
  production_kwh NUMERIC,
  credit_kwh NUMERIC,
  tariff_id TEXT,
  invoice_data JSONB
)
AS $$
DECLARE
  delta_rec RECORD;
  tariff_rec RECORD;
  meter_rec RECORD;
  rates JSONB;
  fixed_charge NUMERIC := 0;
  energy_rate NUMERIC := 0;
  distribution_rate NUMERIC := 0;
  potencia_per_kwh NUMERIC := 0;
  potencia_fixed NUMERIC := 0;
  iva_percent NUMERIC := 0;
  contrib_percent NUMERIC := 0;
  net_consumption NUMERIC;
  energy_charge NUMERIC;
  distribution_charge NUMERIC;
  potencia_charge NUMERIC;
  total_cargo_sin_iva NUMERIC;
  iva_amount NUMERIC;
  contrib_amount NUMERIC;
  subtotal NUMERIC;
  total_due NUMERIC;
  inv JSONB;
BEGIN
  -- Get meter information including distribuidora (company)
  SELECT * INTO meter_rec FROM meters WHERE id::text = meter_id_param OR contador = meter_id_param LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meter with ID % not found', meter_id_param;
  END IF;

  -- Create temp tables
  CREATE TEMP TABLE temp_readings AS
  SELECT * FROM readings WHERE meter_id = meter_id_param AND deleted_at IS NULL ORDER BY date;

  -- Filter tariffs by the meter's distribuidora (company) to avoid cartesian product
  -- This ensures we only use tariffs from the correct company for each meter
  CREATE TEMP TABLE temp_tariffs AS
  SELECT * FROM tariffs
  WHERE deleted_at IS NULL
  AND company = meter_rec.distribuidora;

  -- Compute deltas (assuming readings are ordered by date)
  CREATE TEMP TABLE temp_deltas AS
  SELECT
    r2.date,
    (r2.consumption - r1.consumption) AS consumption,
    (r2.production - r1.production) AS production,
    r2.credit AS credit
  FROM temp_readings r1
  JOIN temp_readings r2 ON r2.date > r1.date
  WHERE NOT EXISTS (SELECT 1 FROM temp_readings r3 WHERE r3.date > r1.date AND r3.date < r2.date);

  -- Loop over deltas
  FOR delta_rec IN SELECT * FROM temp_deltas ORDER BY date LOOP
    -- Find active tariff for the date
    SELECT * INTO tariff_rec FROM temp_tariffs
    WHERE period_from::DATE <= delta_rec.date AND period_to::DATE >= delta_rec.date
    LIMIT 1;

    IF FOUND THEN
      -- Extract rates (flat structure)
      rates := row_to_json(tariff_rec)::JSONB;

      -- Parse rate fields (snake_case and camelCase)
      fixed_charge := COALESCE((rates->>'fixed_charge_q')::NUMERIC, (rates->>'fixedCharge_Q')::NUMERIC, 0);
      energy_rate := COALESCE((rates->>'energy_q_per_kwh')::NUMERIC, (rates->>'energy_Q_per_kWh')::NUMERIC, 0);
      distribution_rate := COALESCE((rates->>'distribution_q_per_kwh')::NUMERIC, (rates->>'distribution_Q_per_kWh')::NUMERIC, 0);
      potencia_per_kwh := COALESCE((rates->>'potencia_q_per_kwh')::NUMERIC, (rates->>'potencia_Q_per_kWh')::NUMERIC, 0);
      potencia_fixed := COALESCE((rates->>'potencia_q')::NUMERIC, (rates->>'potencia_Q')::NUMERIC, 0);
      iva_percent := COALESCE((rates->>'iva_percent')::NUMERIC, (rates->>'ivaPercent')::NUMERIC, 0);
      contrib_percent := COALESCE((rates->>'contrib_percent')::NUMERIC, (rates->>'contribPercent')::NUMERIC, 0);

      -- Compute invoice components
      net_consumption := GREATEST(0, delta_rec.consumption - delta_rec.production - delta_rec.credit);
      energy_charge := net_consumption * energy_rate;
      distribution_charge := delta_rec.consumption * distribution_rate;
      potencia_charge := delta_rec.consumption * potencia_per_kwh + potencia_fixed;
      total_cargo_sin_iva := fixed_charge + energy_charge + distribution_charge + potencia_charge;
      iva_amount := total_cargo_sin_iva * (iva_percent / 100);
      contrib_amount := total_cargo_sin_iva * (contrib_percent / 100);
      subtotal := total_cargo_sin_iva + iva_amount + contrib_amount;
      total_due := ROUND(subtotal::NUMERIC, 2);

      -- Build invoice JSON
      inv := jsonb_build_object(
        'consumption_kWh', delta_rec.consumption,
        'production_kWh', delta_rec.production,
        'energy_charge_Q', ROUND(energy_charge, 2),
        'distribution_charge_Q', ROUND(distribution_charge, 2),
        'potencia_charge_Q', ROUND(potencia_charge, 2),
        'fixed_charge_Q', ROUND(fixed_charge, 2),
        'total_cargo_sin_iva_Q', ROUND(total_cargo_sin_iva, 2),
        'iva_amount_Q', ROUND(iva_amount, 2),
        'contrib_amount_Q', ROUND(contrib_amount, 2),
        'subtotal_Q', ROUND(subtotal, 2),
        'credits_Q', 0,
        'total_due_Q', total_due,
        'tariff', row_to_json(tariff_rec)::JSONB
      );

      tariff_id := tariff_rec.id::TEXT;
    ELSE
      inv := jsonb_build_object('error', 'No tariff found for date ' || delta_rec.date::TEXT);
      tariff_id := NULL;
    END IF;

    -- Return the row
    RETURN QUERY SELECT delta_rec.date::DATE, delta_rec.consumption, delta_rec.production, delta_rec.credit, tariff_id, inv;
  END LOOP;

  -- Clean up temp tables
  DROP TABLE IF EXISTS temp_readings;
  DROP TABLE IF EXISTS temp_deltas;
  DROP TABLE IF EXISTS temp_tariffs;
END;
$$ LANGUAGE plpgsql;