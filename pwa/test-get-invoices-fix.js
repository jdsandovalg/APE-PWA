import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://wtczfdkldixaptrskjwb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Y3pmZGtsZGl4YXB0cnNrandiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTk1NDIsImV4cCI6MjA3MjIzNTU0Mn0.paNwJUSuKaisbdMmK_J77LKTs4HpfKwgvv3cJz9pqI4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Script para probar la función get_invoices corregida
async function testGetInvoices() {
  console.log('🧪 Probando función get_invoices corregida...\n')

  try {
    // Obtener medidores disponibles
    const { data: meters, error: metersError } = await supabase
      .from('meters')
      .select('id, contador, distribuidora')
      .is('deleted_at', null)
      .limit(3)

    if (metersError) {
      console.error('❌ Error obteniendo medidores:', metersError)
      return
    }

    if (!meters || meters.length === 0) {
      console.log('❌ No hay medidores disponibles para probar.')
      return
    }

    console.log('📋 Medidores disponibles:')
    meters.forEach(m => console.log(`  - ${m.contador} (${m.id}): ${m.distribuidora}`))

    // Probar con el primer medidor
    const testMeter = meters[0]
    console.log(`\n🎯 Probando con medidor: ${testMeter.contador} - Distribuidora: ${testMeter.distribuidora}\n`)

    // Llamar a la función get_invoices
    const { data: invoices, error: invoicesError } = await supabase
      .rpc('get_invoices', { meter_id_param: testMeter.contador })

    if (invoicesError) {
      console.error('❌ Error llamando get_invoices:', invoicesError)
      return
    }

    console.log(`✅ Función ejecutada exitosamente. ${invoices?.length || 0} facturas generadas.`)

    if (invoices && invoices.length > 0) {
      console.log('\n📄 Detalles de las primeras 3 facturas:')
      invoices.slice(0, 3).forEach((inv, index) => {
        console.log(`\nFactura ${index + 1}:`)
        console.log(`  📅 Fecha: ${inv.invoice_date}`)
        console.log(`  ⚡ Consumo: ${inv.consumption_kwh} kWh`)
        console.log(`  🔋 Producción: ${inv.production_kwh} kWh`)
        console.log(`  💰 Crédito: ${inv.credit_kwh} kWh`)
        console.log(`  🏷️ Tariff ID: ${inv.tariff_id || 'Sin tarifa'}`)

        if (inv.invoice_data) {
          const data = inv.invoice_data
          if (data.error) {
            console.log(`  ❌ Error: ${data.error}`)
          } else {
            console.log(`  💵 Total a pagar: Q${data.total_due_Q}`)
            if (data.tariff) {
              console.log(`  🏢 Compañía: ${data.tariff.company}`)
              console.log(`  📊 Segmento: ${data.tariff.segment}`)
            }
          }
        }
      })

      // Verificar que todas las facturas usan la compañía correcta
      console.log('\n🔍 Verificación de filtrado por compañía:')
      const correctCompany = testMeter.distribuidora
      let correctCount = 0
      let totalCount = 0

      invoices.forEach(inv => {
        totalCount++
        if (inv.invoice_data && inv.invoice_data.tariff) {
          const tariffCompany = inv.invoice_data.tariff.company
          if (tariffCompany === correctCompany) {
            correctCount++
          } else {
            console.log(`  ⚠️ Factura con compañía incorrecta: ${tariffCompany} (esperado: ${correctCompany})`)
          }
        }
      })

      console.log(`✅ ${correctCount}/${totalCount} facturas usan la compañía correcta (${correctCompany})`)

      if (correctCount === totalCount) {
        console.log('🎉 ¡Filtrado por compañía funcionando correctamente! No hay producto cartesiano.')
      } else {
        console.log('⚠️ Hay facturas con compañías incorrectas - revisar filtrado.')
      }

    } else {
      console.log('ℹ️ No se generaron facturas (posiblemente no hay suficientes lecturas).')
    }

    console.log('\n🎉 Prueba completada!')

  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

// Ejecutar prueba
testGetInvoices()