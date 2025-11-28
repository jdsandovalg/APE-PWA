const { createClient } = require('@supabase/supabase-js')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing Supabase URL or Key. Load pwa/.env.local first.')
  process.exit(1)
}

const supabase = createClient(url, key)

async function recompute() {
  const invoiceDate = '2025-11-27'
  // Observed from PDF
  const consumption_kWh = 140
  const production_kWh = 361

  try {
    const { data: tariffs, error } = await supabase
      .from('tariffs')
      .select('*')
      .lte('period_from', invoiceDate)
      .gte('period_to', invoiceDate)
      .is('deleted_at', null)
      .order('effective_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error fetching tariff:', error)
      process.exit(1)
    }

    if (!tariffs || tariffs.length === 0) {
      console.error('No tariff found for date', invoiceDate)
      process.exit(1)
    }

    const t = tariffs[0]
    const net_energy_kWh = Math.max(0, consumption_kWh - production_kWh)
    const fixed = Number(t.fixed_charge_q || 0)
    const energy_rate = Number(t.energy_q_per_kwh || 0)
    const distribution_rate = Number(t.distribution_q_per_kwh || 0)
    const potencia_rate = Number(t.potencia_q_per_kwh || 0)
    const contrib_percent = Number(t.contrib_percent || 0)
    const iva_percent = Number(t.iva_percent || 0)

    const energy_charge = net_energy_kWh * energy_rate
    const distribution_charge = consumption_kWh * distribution_rate
    const potencia_charge = consumption_kWh * potencia_rate

    const subtotal_no_iva = fixed + energy_charge + distribution_charge + potencia_charge
    const iva_amount = subtotal_no_iva * (iva_percent / 100)
    const subtotal_with_iva = subtotal_no_iva + iva_amount
    const contrib_amount = subtotal_no_iva * (contrib_percent / 100)
    const total = subtotal_with_iva + contrib_amount

    console.log('Invoice date:', invoiceDate)
    console.log('Tariff id:', t.id)
    console.log('fixed_charge_q (DB):', fixed)
    console.log('energy_q_per_kwh:', energy_rate)
    console.log('distribution_q_per_kwh:', distribution_rate)
    console.log('potencia_q_per_kwh:', potencia_rate)
    console.log('contrib_percent:', contrib_percent)
    console.log('iva_percent:', iva_percent)

    console.log('\nInputs:')
    console.log({ consumption_kWh, production_kWh, net_energy_kWh })

    console.log('\nBreakdown (Q):')
    console.log(' fixed:', fixed.toFixed(6))
    console.log(' energy:', energy_charge.toFixed(6))
    console.log(' distribution:', distribution_charge.toFixed(6))
    console.log(' potencia:', potencia_charge.toFixed(6))
    console.log(' subtotal_no_iva:', subtotal_no_iva.toFixed(6))
    console.log(' iva:', iva_amount.toFixed(6))
    console.log(' subtotal_with_iva:', subtotal_with_iva.toFixed(6))
    console.log(' contrib:', contrib_amount.toFixed(6))
    console.log(' TOTAL:', total.toFixed(6))

  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(1)
  }
}

recompute()
