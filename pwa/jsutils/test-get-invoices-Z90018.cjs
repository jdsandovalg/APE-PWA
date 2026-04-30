// Prueba de la función get_invoices para el contador Z90018
// Ejecutar: node jsutils/test-get-invoices-Z90018.cjs

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Cargar variables de entorno desde .env si existe
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testGetInvoices() {
  console.log('🔍 Testing get_invoices for contador Z90018...')

  try {
    // Primero, buscar el medidor para confirmar que existe
    const { data: meter, error: meterError } = await supabase
      .from('meters')
      .select('id, contador, propietaria, distribuidora')
      .eq('contador', 'Z90018')
      .single()

    if (meterError) {
      console.error('❌ Error finding meter Z90018:', meterError.message)
      process.exit(1)
    }

    console.log(`✅ Found meter: ${meter.contador} (ID: ${meter.id})`)
    console.log(`   Owner: ${meter.propietaria}`)
    console.log(`   Distributor: ${meter.distribuidora}`)

    // Llamar a la función get_invoices
    console.log('\n📊 Calling get_invoices RPC...')
    const { data: invoices, error: invoiceError } = await supabase.rpc('get_invoices', { 
      meter_id_param: meter.contador 
    })

    if (invoiceError) {
      console.error('❌ Error calling get_invoices:', invoiceError.message)
      console.error('Details:', invoiceError.details)
      process.exit(1)
    }

    console.log(`✅ get_invoices returned ${invoices?.length || 0} invoices`)

    if (invoices && invoices.length > 0) {
      console.log('\n📄 Invoice details:')
      invoices.forEach((inv: any, idx: number) => {
        console.log(`\nInvoice #${idx + 1}:`)
        console.log(`  Date: ${inv.invoice_date}`)
        console.log(`  Consumption: ${inv.consumption_kwh} kWh`)
        console.log(`  Production: ${inv.production_kwh} kWh`)
        console.log(`  Credit: ${inv.credit_kwh} kWh`)
        console.log(`  Tariff ID: ${inv.tariff_id}`)
        if (inv.invoice_data) {
          console.log(`  Total Due: Q ${inv.invoice_data.total_due_Q?.toFixed(2) || 'N/A'}`)
        }
      })
    } else {
      console.log('\n⚠️  No invoices returned. Possible causes:')
      console.log('   - No readings exist for this meter')
      console.log('   - No tariffs match the reading dates')
      console.log('   - Function still has issues')
    }

    // También verificar las lecturas directamente
    console.log('\n📈 Checking readings directly...')
    const { data: readings, error: readingsError } = await supabase
      .from('readings')
      .select('meter_id, date, consumption, production, credit')
      .eq('meter_id', meter.id)
      .order('date', { ascending: false })
      .limit(5)

    if (readingsError) {
      console.error('❌ Error fetching readings:', readingsError.message)
    } else {
      console.log(`✅ Found ${readings?.length || 0} recent readings for meter ${meter.contador}`)
      if (readings && readings.length > 0) {
        console.log('   Recent readings:')
        readings.forEach((r: any) => {
          console.log(`     ${r.date}: Cons=${r.consumption}, Prod=${r.production}, Cred=${r.credit}`)
        })
      }
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err)
    process.exit(1)
  }
}

testGetInvoices()
