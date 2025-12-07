const { createClient } = require('@supabase/supabase-js')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing Supabase env. Source pwa/.env.local first.')
  process.exit(1)
}

const supabase = createClient(url, key)

async function checkReadings() {
  const meterId = '80808084-71e8-495e-b4d6-4dfe3dcb46af'
  const installDate = '2024-12-16'

  console.log(`Checking readings for meter ${meterId} after ${installDate}`)

  const { data, error } = await supabase
    .from('readings')
    .select('date, production')
    .eq('meter_id', meterId)
    .gte('date', installDate)
    .order('date')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Found ${data.length} readings after ${installDate}`)
  if (data.length > 0) {
    console.log('First 5 readings:')
    data.slice(0, 5).forEach(r => console.log(`  ${r.date}: ${r.production}`))
  }

  // Check distinct meter_ids in readings
  console.log('\nChecking distinct meter_ids in readings...')
  const { data: idsData, error: idsError } = await supabase
    .from('readings')
    .select('meter_id')
    .order('meter_id')

  if (idsError) {
    console.error('Error getting ids:', idsError)
    return
  }

  const uniqueIds = [...new Set(idsData.map(r => r.meter_id))]
  console.log(`Unique meter_ids in readings: ${uniqueIds.length}`)
  uniqueIds.forEach(id => console.log(`  ${id}`))

  // Check if the meter exists
  console.log('\nChecking if meter exists...')
  const { data: meterData, error: meterError } = await supabase
    .from('meters')
    .select('id, contador')
    .eq('id', meterId)

  if (meterError) {
    console.error('Error getting meter:', meterError)
    return
  }

  console.log(`Meter exists: ${meterData.length > 0}`)
  if (meterData.length > 0) {
    console.log(`Contador: ${meterData[0].contador}`)
  }
}

checkReadings()