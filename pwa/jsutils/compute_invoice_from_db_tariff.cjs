const { createClient } = require('@supabase/supabase-js')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing Supabase URL or Key. Load pwa/.env.local first.')
  process.exit(1)
}

const supabase = createClient(url, key)

async function compute() {
  // Use consumption from PDF: 140 kWh (as observed)
  const consumption_kWh = 140
  const production_kWh = 0
  const credits_Q = 0

  // Fetch a recent tariff (first non-deleted)
  const { data: tariffs, error } = await supabase
    .from('tariffs')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !tariffs || tariffs.length === 0) {
    console.error('Could not fetch a tariff:', error)
    process.exit(1)
  }

  const t = tariffs[0]

  const fixed = Number(t.fixed_charge_q || 0)
  const energy_rate = Number(t.energy_q_per_kwh || 0)
  const distribution_rate = Number(t.distribution_q_per_kwh || 0)
  const potencia_rate = Number(t.potencia_q_per_kwh || t.potencia_q_per_kwh || 0)
  const contrib_percent = Number(t.contrib_percent || 0)
  const iva_percent = Number(t.iva_percent || 0)

  const net_energy_kWh = Math.max(0, consumption_kWh - production_kWh)
  const energy_charge = net_energy_kWh * energy_rate
  const distribution_charge = consumption_kWh * distribution_rate
  const potencia_charge = consumption_kWh * potencia_rate

  const subtotal_no_iva = fixed + energy_charge + distribution_charge + potencia_charge
  const iva_amount = subtotal_no_iva * (iva_percent / 100)
  const subtotal_with_iva = subtotal_no_iva + iva_amount
  const contrib_amount = subtotal_no_iva * (contrib_percent / 100)
  const total = subtotal_with_iva + contrib_amount

  console.log('Tariff used:', t.id)
  console.log('Rates: fixed, energy, distribution, potencia, contrib%, iva%')
  console.log(fixed, energy_rate, distribution_rate, potencia_rate, contrib_percent, iva_percent)
  console.log('\nInputs:')
  console.log({ consumption_kWh, production_kWh, net_energy_kWh, credits_Q })

  console.log('\nBreakdown (Q):')
  console.log('  fixed:', fixed.toFixed(2))
  console.log('  energy:', energy_charge.toFixed(2))
  console.log('  distribution:', distribution_charge.toFixed(2))
  console.log('  potencia:', potencia_charge.toFixed(2))
  console.log('  subtotal_no_iva:', subtotal_no_iva.toFixed(2))
  console.log('  iva_amount:', iva_amount.toFixed(2))
  console.log('  subtotal_with_iva:', subtotal_with_iva.toFixed(2))
  console.log('  contrib_amount:', contrib_amount.toFixed(2))
  console.log('  TOTAL:', total.toFixed(2))
}

compute()
