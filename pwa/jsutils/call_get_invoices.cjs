const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!url) {
  console.error('SUPABASE_URL missing in env')
  process.exit(1)
}

const keyToUse = serviceKey || anon
if (!keyToUse) {
  console.error('No supabase key found (SUPABASE_SERVICE_ROLE_KEY or ANON)')
  process.exit(1)
}

const supabase = createClient(url, keyToUse)

async function callRPC(meterId, outPath) {
  console.log('Calling RPC get_invoices for meter:', meterId)
  try {
    const { data, error } = await supabase.rpc('get_invoices', { meter_id_param: meterId })
    if (error) {
      console.error('RPC error:', error)
      return null
    }
    if (outPath) fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8')
    return data
  } catch (err) {
    console.error('Unexpected RPC error:', err)
    return null
  }
}

if (require.main === module) {
  const meter = process.argv[2]
  const out = process.argv[3]
  if (!meter) {
    console.error('Usage: node call_get_invoices.cjs <meter_id> [out.json]')
    process.exit(2)
  }
  callRPC(meter, out).then(res=>{
    if (res) console.log('RPC returned', Array.isArray(res)?res.length:'ok')
    else process.exit(1)
  })
}

module.exports = { callRPC }
