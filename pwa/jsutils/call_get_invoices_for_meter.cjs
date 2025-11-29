const { createClient } = require('@supabase/supabase-js')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing Supabase env. Source pwa/.env.local first.')
  process.exit(1)
}

const supabase = createClient(url, key)

async function run(meterId) {
  try {
    console.log('Calling RPC get_invoices for meter id:', meterId)
    // Try common parameter names used by different versions of the function
    let res = await supabase.rpc('get_invoices', { meter_id: meterId })
    if (res && res.error && res.status === 404) {
      res = await supabase.rpc('get_invoices', { meter_id_param: meterId })
    }
    if (res && res.error && res.status === 404) {
      res = await supabase.rpc('get_invoices', { meter_id_param_json: meterId })
    }
    console.log(JSON.stringify(res, null, 2))
  } catch (err) {
    console.error('RPC error', err)
    process.exit(1)
  }
}

if (require.main === module) {
  const arg = process.argv[2]
  if (!arg) { console.error('Usage: node call_get_invoices_for_meter.cjs <meterId>'); process.exit(2) }
  run(arg)
}
