import { TariffSet, InvoiceBreakdown } from '../types'

type InvoiceBreakdownLegacy = {
  consumption_kWh: number,
  production_kWh?: number,
  energy_charge_Q: number,
  distribution_charge_Q: number,
  potencia_charge_Q: number,
  fixed_charge_Q: number,
  total_cargo_sin_iva_Q: number,
  iva_amount_Q: number,
  contrib_amount_Q: number,
  subtotal_Q: number,
  credits_Q: number,
  total_due_Q: number,
  tariff?: TariffSet | null
}

function monthsInclusive(fromIso: string, toIso: string){
  const f = new Date(fromIso)
  const t = new Date(toIso)
  const months = (t.getFullYear() - f.getFullYear()) * 12 + (t.getMonth() - f.getMonth()) + 1
  return Math.max(1, months)
}

// IMPORTANT: All monetary charges must be computed on consumption, never on production.
// production_kWh is accepted for compatibility but is ignored in charge calculations.
export function computeInvoiceForPeriod(consumption_kWh: number, production_kWh: number, tariff: TariffSet | null, opts?: { forUnit?: 'month' | 'period', date?: string, credits_Q?: number }): InvoiceBreakdown{
  const date = opts?.date || new Date().toISOString()
  // support credits passed either as monetary (`credits_Q`) or as energy (`credits_kWh`)
  const credits_Q = Number(opts?.credits_Q || 0)
  const credits_kWh = Number((opts as any)?.credits_kWh || 0)
  if (!tariff){
    // fallback: simple flat rate not available
    const simpleRate = 0.9
    // if credits_kWh provided, apply it to reduce net consumption
    // Net energy for billing: consumption minus production and credits (cannot be negative)
    const netConsumption = Math.max(0, consumption_kWh - production_kWh - credits_kWh)
    const energy = netConsumption * simpleRate
    return {
      consumption_kWh,
      energy_charge_Q: energy,
      distribution_charge_Q: 0,
      potencia_charge_Q: 0,
      fixed_charge_Q: 0,
      total_cargo_sin_iva_Q: energy,
      iva_amount_Q: 0,
      contrib_amount_Q: 0,
      subtotal_Q: energy,
      credits_Q: credits_Q,
      total_due_Q: Math.max(0, energy - credits_Q),
      tariff: null
    }
  }

  const rates = tariff.rates || tariff

  // Debug: print input and rates to help diagnose zero charges
  try{
    console.log('[billing] computeInvoiceForPeriod:', { date, consumption_kWh, production_kWh, credits_kWh, ratesKeys: Object.keys(rates || {}).join(',') })
    console.log('[billing] rates sample:', {
      energy: rates.energy_Q_per_kWh || rates.energy_q_per_kwh,
      distribution: rates.distribution_Q_per_kWh || rates.distribution_q_per_kwh,
      potencia_per_kwh: rates.potencia_Q_per_kWh || rates.potencia_q_per_kwh,
      potencia_fixed: rates.potencia_Q || rates.potencia_q,
      fixed_charge: rates.fixedCharge_Q || rates.fixed_charge_q
    })
  }catch(e){ /* ignore logging errors */ }

  // determine fixed charge application: use value as-is (tariff fixedCharge_Q is applied per billing period)
  // NOTE: do not prorate by months — tariffs represent the period fixed amounts month-to-month as requested.
  const fixedChargeApplied = Number(rates.fixedCharge_Q || rates.fixed_charge_q || 0)

  // helper: no rounding of intermediate values — keep full precision and round only final monetary outputs
  const round2 = (v:number) => Math.round((v + Number.EPSILON) * 100) / 100

  // apply credits in kWh (if provided) by reducing net consumption (affects energy charge)
  // Net energy depends on production: if you produce more than consume, net energy is zero.
  const netConsumption = Math.max(0, consumption_kWh - production_kWh - credits_kWh)
  const raw_energy = netConsumption * Number(rates.energy_Q_per_kWh || rates.energy_q_per_kwh || 0)
  // distribution applies to the energy consumed from the grid (consumo), not to injected production
  // Use the gross consumption_kWh as base for distribution charge.
  const raw_distribution = consumption_kWh * Number(rates.distribution_Q_per_kWh || rates.distribution_q_per_kwh || 0)
  // Potencia (if modelled per-kWh) should likewise be applied to consumption.
  const raw_potencia = consumption_kWh * Number(rates.potencia_Q_per_kWh || rates.potencia_q_per_kwh || 0) + Number(rates.potencia_Q || rates.potencia_q || 0)

  // Debug: show computed potencia components
  try{
    console.log('[billing] potencia calc:', {
      consumo: consumption_kWh,
      potencia_per_kwh: Number(rates.potencia_Q_per_kWh || rates.potencia_q_per_kwh || 0),
      potencia_fixed: Number(rates.potencia_Q || rates.potencia_q || 0),
      raw_potencia
    })
  }catch(e){ }

  const energy_charge = raw_energy
  const distribution_charge = raw_distribution
  const potencia_charge = raw_potencia
  const fixed_charge = fixedChargeApplied

  const total_cargo_sin_iva = fixed_charge + energy_charge + distribution_charge + potencia_charge

  // IVA applies to cargos (sin IVA). Contribución A.P. is calculated on the cargos (sin IVA) and is not subject to IVA
  const iva_amount = total_cargo_sin_iva * (Number(rates.iva_percent || 0) / 100)
  const contrib_amount = total_cargo_sin_iva * (Number(rates.contrib_percent || 0) / 100)

  const subtotal = total_cargo_sin_iva + iva_amount + contrib_amount
  // monetary credits (if any) are subtracted at the end; keep full precision until rounding
  const total_due_raw = Math.max(0, subtotal - credits_Q)
  const total_due = round2(total_due_raw)

  return {
    consumption_kWh,
    production_kWh,
    // round monetary outputs only at the end
    energy_charge_Q: round2(energy_charge),
    distribution_charge_Q: round2(distribution_charge),
    potencia_charge_Q: round2(potencia_charge),
    fixed_charge_Q: round2(fixed_charge),
    total_cargo_sin_iva_Q: round2(total_cargo_sin_iva),
    iva_amount_Q: round2(iva_amount),
    contrib_amount_Q: round2(contrib_amount),
    subtotal_Q: round2(subtotal),
    credits_Q: round2(credits_Q),
    total_due_Q: total_due,
    tariff
  }
}

export type { InvoiceBreakdown }
