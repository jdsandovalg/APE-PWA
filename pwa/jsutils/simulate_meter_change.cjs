const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing Supabase env. Source pwa/.env.local first.')
  process.exit(1)
}

const supabase = createClient(url, key)

async function run(meterArg) {
  try {
    console.log('Querying meter:', meterArg)
    // try by contador first
    let { data: meterByCont, error: e1 } = await supabase
      .from('meters')
      .select('*')
      .eq('contador', meterArg)
      .limit(1)

    let meter = (meterByCont && meterByCont[0]) || null

    if (!meter) {
      const { data: meterById, error: e2 } = await supabase
        .from('meters')
        .select('*')
        .eq('id', meterArg)
        .limit(1)
      meter = (meterById && meterById[0]) || null
    }

    if (!meter) {
      console.error('Meter not found')
      process.exit(2)
    }

    console.log('Meter:', { id: meter.id, contador: meter.contador, distribuidora: meter.distribuidora, tipo_servicio: meter.tipo_servicio })

    console.log('Fetching readings for meter...')
    const { data: readings } = await supabase
      .from('readings')
      .select('meter_id, date, consumption, production, credit')
      .eq('meter_id', meter.contador)
      .order('date', { ascending: false })

    console.log('Readings count:', (readings||[]).length)
    if (readings && readings.length>0) console.log('Latest reading:', readings[0])

    console.log('Fetching tariffs for company:', meter.distribuidora)
    const { data: tariffs } = await supabase
      .from('tariffs')
      .select('*')
      .eq('company', meter.distribuidora)
      .order('period_from', { ascending: false })

    console.log('Tariffs found:', (tariffs||[]).length)
    // try to pick tariff matching segment
    const matched = (tariffs||[]).find(t => t.segment === meter.tipo_servicio)
    const chosen = matched || (tariffs||[])[0]
    if (chosen) {
      console.log('Chosen tariff id:', chosen.id, 'segment:', chosen.segment)
      const fixed = Number(chosen.fixed_charge_q || chosen.fixedCharge_Q || 0)
      const iva = Number(chosen.iva_percent || 0)
      const contrib = Number(chosen.contrib_percent || 0)
      const ivaAmount = fixed * (iva/100)
      const contribAmount = fixed * (contrib/100)
      const total = Math.round((fixed + ivaAmount + contribAmount + Number.EPSILON)*100)/100
      console.log('Computed fixed-only invoice:')
      console.log(' fixed_charge:', fixed)
      console.log(' iva_percent:', iva, ' ->', ivaAmount)
      console.log(' contrib_percent:', contrib, '->', contribAmount)
      console.log(' total:', total)
    } else {
      console.log('No tariffs available to compute')
    }

    console.log('Simulation complete')
  } catch (err) {
    console.error('Error during simulation', err)
    process.exit(1)
  }
}

if (require.main === module) {
  const arg = process.argv[2]
  if (!arg) { console.error('Usage: node simulate_meter_change.cjs <meter_id_or_contador>'); process.exit(2) }
  run(arg)
}
