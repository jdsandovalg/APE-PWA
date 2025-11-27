// Supabase Edge Function (Deno) — Get invoices for a meter (contador)
// Uses the PostgreSQL function get_invoices for computation
// Deploy to Supabase Functions. Requires env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

import { serve } from "std/server"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var')
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  // Basic CORS handling for browser fetch
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: corsHeaders() })
  }

  try {
    const { contador } = await req.json().catch(() => ({}))
    if (!contador) return json(400, { error: 'Missing contador in body' })

    // Call the PostgreSQL function get_invoices
    const { data: invoicesRaw, error } = await supabase.rpc('get_invoices', { meter_id_param: contador })

    if (error) return json(500, { error: 'Error calling get_invoices function', details: error.message })

    // Transform to expected format
    const invoices = (invoicesRaw || []).map((row: any) => ({
      date: row.invoice_date,
      consumption_kWh: Number(row.consumption_kwh),
      production_kWh: Number(row.production_kwh),
      credit_kWh: Number(row.credit_kwh),
      tariffId: row.tariff_id,
      invoice: row.invoice_data
    }))

    return json(200, { invoices })

  } catch (err) {
    console.error('Function error', err)
    return json(500, { error: 'Internal error', details: String(err) })
  }
})

// Helpers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
}

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders() } })
}
