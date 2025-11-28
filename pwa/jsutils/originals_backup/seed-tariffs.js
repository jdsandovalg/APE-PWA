import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://wtczfdkldixaptrskjwb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Y3pmZGtsZGl4YXB0cnNrandiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTk1NDIsImV4cCI6MjA3MjIzNTU0Mn0.paNwJUSuKaisbdMmK_J77LKTs4HpfKwgvv3cJz9pqI4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Script para poblar tariffs de prueba en Supabase
async function seedTariffs() {
  console.log('🌱 Poblando tariffs de prueba en Supabase...\n')

  try {
    // Primero verificar compañías disponibles
    const { data: companies, error: compError } = await supabase
      .from('companies')
      .select('id, code, name')
      .is('deleted_at', null)
      .limit(5)

    if (compError) {
      console.error('❌ Error obteniendo compañías:', compError)
      return
    }

    if (!companies || companies.length === 0) {
      console.log('❌ No hay compañías disponibles. Ejecuta primero el SupabaseTester para crear compañías.')
      return
    }

    console.log('📋 Compañías disponibles:')
    companies.forEach(c => console.log(`  - ${c.id} (${c.code}): ${c.name}`))

    // Usar la primera compañía disponible
    const company = companies[0]
    console.log(`\n🎯 Usando compañía: ${company.name} (${company.code})\n`)

    // Tariffs de prueba
    const testTariffs = [
      {
        id: `TEST-${company.code}-2025Q3`,
        company: company.id,
        company_code: company.code,
        segment: 'BTSA',
        period_from: '2025-07-01',
        period_to: '2025-09-30',
        effective_at: '2025-07-01',
        currency: 'GTQ',
        source_pdf: 'Test-Q3-2025.pdf',
        fixed_charge_q: 15.500000,
        energy_q_per_kwh: 1.250000,
        distribution_q_per_kwh: 0.300000,
        potencia_q_per_kwh: 0.080000,
        contrib_percent: 13.8,
        iva_percent: 12,
        notes: 'Tarifa de prueba Q3 2025'
      },
      {
        id: `TEST-${company.code}-2025Q4`,
        company: company.id,
        company_code: company.code,
        segment: 'BTSA',
        period_from: '2025-10-01',
        period_to: '2025-12-31',
        effective_at: '2025-10-01',
        currency: 'GTQ',
        source_pdf: 'Test-Q4-2025.pdf',
        fixed_charge_q: 16.200000,
        energy_q_per_kwh: 1.350000,
        distribution_q_per_kwh: 0.320000,
        potencia_q_per_kwh: 0.085000,
        contrib_percent: 13.8,
        iva_percent: 12,
        notes: 'Tarifa de prueba Q4 2025'
      },
      {
        id: `TEST-${company.code}-2026Q1`,
        company: company.id,
        company_code: company.code,
        segment: 'MTSA',
        period_from: '2026-01-01',
        period_to: '2026-03-31',
        effective_at: '2026-01-01',
        currency: 'GTQ',
        source_pdf: 'Test-Q1-2026.pdf',
        fixed_charge_q: 18.000000,
        energy_q_per_kwh: 1.450000,
        distribution_q_per_kwh: 0.350000,
        potencia_q_per_kwh: 0.090000,
        contrib_percent: 13.8,
        iva_percent: 12,
        notes: 'Tarifa de prueba Q1 2026 - Segmento MTSA'
      }
    ]

    console.log('📝 Insertando tariffs de prueba...')

    for (const tariff of testTariffs) {
      try {
        const { data, error } = await supabase
          .from('tariffs')
          .upsert(tariff, { onConflict: 'id' })
          .select()

        if (error) {
          console.error(`❌ Error insertando ${tariff.id}:`, error)
        } else {
          console.log(`✅ Insertado: ${tariff.id} - ${tariff.segment} (${tariff.period_from} → ${tariff.period_to})`)
        }
      } catch (err) {
        console.error(`❌ Error procesando ${tariff.id}:`, err)
      }
    }

    // Verificar resultado final
    const { count, error: countError } = await supabase
      .from('tariffs')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    if (countError) {
      console.error('❌ Error obteniendo conteo final:', countError)
    } else {
      console.log(`\n📊 Total de tariffs en Supabase: ${count}`)
    }

    console.log('\n🎉 Proceso completado!')

  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

// Ejecutar seeding
seedTariffs()
