const { createClient } = require('@supabase/supabase-js')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing Supabase URL or Key. Load pwa/.env.local first.')
  process.exit(1)
}

const supabase = createClient(url, key)

async function inspectInvoices() {
  try {
    console.log('🔍 Consultando tabla `invoices` (muestra de 10 registros ordenados por fecha)...')
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('invoice_date', { ascending: false })
      .limit(10)

    if (error) {
      console.error('❌ Error consultando invoices:', error)
      process.exit(1)
    }

    if (!data || data.length === 0) {
      console.log('📭 Tabla `invoices` vacía o no accesible (RLS?).')
      return
    }

    console.log(`✅ Encontrados ${data.length} registros. Mostrando campos relevantes...`)
    data.forEach((row, i) => {
      console.log(`\n--- Invoice #${i + 1} ---`)
      // Print a compact subset for privacy
      const subset = {}
      Object.keys(row).forEach(k => {
        subset[k] = row[k]
      })
      console.log(JSON.stringify(subset, null, 2))
    })

  } catch (err) {
    console.error('❌ Error inesperado:', err)
    process.exit(1)
  }
}

inspectInvoices()
