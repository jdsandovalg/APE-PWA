import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://wtczfdkldixaptrskjwb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Y3pmZGtsZGl4YXB0cnNrandiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTk1NDIsImV4cCI6MjA3MjIzNTU0Mn0.paNwJUSuKaisbdMmK_J77LKTs4HpfKwgvv3cJz9pqI4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Simular exactamente lo que hace el TariffTester
async function simulateTariffTesterBehavior() {
  console.log('🧪 Simulando comportamiento del TariffTester...\n')

  try {
    // 1. Cargar tariffs iniciales (como loadTariffs)
    console.log('1️⃣ Carga inicial de tariffs...')
    const { data: initialTariffs, error: initialError } = await supabase
      .from('tariffs')
      .select('id, company, company_code, segment, period_from, period_to, effective_at, currency, source_pdf, fixed_charge_q, energy_q_per_kwh, distribution_q_per_kwh, potencia_q_per_kwh, contrib_percent, iva_percent, notes, deleted_at, created_at, updated_at, last_synced_at')
      .is('deleted_at', null)
      .order('period_from', { ascending: false })

    if (initialError) {
      console.error('❌ Error en carga inicial:', initialError)
      return
    }

    console.log(`✅ Cargadas ${initialTariffs?.length || 0} tariffs inicialmente`)

    // 2. Obtener contador inicial (como getTariffsCount)
    console.log('\n2️⃣ Obteniendo contador inicial...')
    const { count: initialCount, error: countError } = await supabase
      .from('tariffs')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    if (countError) {
      console.error('❌ Error obteniendo contador:', countError)
    } else {
      console.log(`✅ Contador inicial: ${initialCount}`)
    }

    if (!initialTariffs || initialTariffs.length === 0) {
      console.log('⚠️ No hay tariffs para probar')
      return
    }

    // 3. Intentar eliminar la primera tariff (como handleDeleteTariff)
    const targetTariff = initialTariffs[0]
    console.log(`\n3️⃣ Intentando eliminar: ${targetTariff.id}`)

    // Simular deleteTariff de supabaseBasic.ts
    console.log('   Ejecutando deleteTariff...')
    const deletedAt = new Date().toISOString()
    console.log(`   Timestamp: ${deletedAt}`)

    const { data: deleteResult, error: deleteError } = await supabase
      .from('tariffs')
      .update({ deleted_at: deletedAt })
      .eq('id', targetTariff.id)
      .select('id, deleted_at')

    console.log('   Resultado UPDATE:', { data: deleteResult, error: deleteError })

    if (deleteError) {
      console.error('❌ Error en deleteTariff:', deleteError)
      console.error('Código:', deleteError.code)
      console.error('Mensaje:', deleteError.message)
      return
    }

    if (!deleteResult || deleteResult.length === 0) {
      console.error('❌ UPDATE no afectó filas - posible problema de permisos o RLS')
      return
    }

    console.log(`✅ Eliminación exitosa: ${deleteResult[0].id} marcado como deleted_at = ${deleteResult[0].deleted_at}`)

    // 4. Recargar tariffs (como loadTariffs después de eliminación)
    console.log('\n4️⃣ Recargando tariffs después de eliminación...')
    const { data: afterDeleteTariffs, error: afterError } = await supabase
      .from('tariffs')
      .select('id, company, company_code, segment, period_from, period_to, effective_at, currency, source_pdf, fixed_charge_q, energy_q_per_kwh, distribution_q_per_kwh, potencia_q_per_kwh, contrib_percent, iva_percent, notes, deleted_at, created_at, updated_at, last_synced_at')
      .is('deleted_at', null)
      .order('period_from', { ascending: false })

    if (afterError) {
      console.error('❌ Error recargando:', afterError)
    } else {
      console.log(`✅ Después de eliminación: ${afterDeleteTariffs?.length || 0} tariffs`)
      console.log(`   Eliminada correctamente: ${!afterDeleteTariffs?.some(t => t.id === targetTariff.id)}`)
    }

    // 5. Verificar contador después
    console.log('\n5️⃣ Verificando contador después...')
    const { count: afterCount, error: afterCountError } = await supabase
      .from('tariffs')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    if (afterCountError) {
      console.error('❌ Error obteniendo contador final:', afterCountError)
    } else {
      console.log(`✅ Contador final: ${afterCount}`)
      console.log(`   Diferencia: ${initialCount} → ${afterCount} (${initialCount - afterCount} eliminado)`)
    }

    // 6. Verificar si hay tariffs eliminadas
    console.log('\n6️⃣ Verificando tariffs eliminadas...')
    const { data: deletedTariffs, error: deletedError } = await supabase
      .from('tariffs')
      .select('id, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })

    if (!deletedError && deletedTariffs) {
      console.log(`📋 Tariffs eliminadas encontradas: ${deletedTariffs.length}`)
      deletedTariffs.forEach(t => {
        console.log(`   🗑️ ${t.id}: eliminado ${t.deleted_at}`)
      })
    }

  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

// Ejecutar simulación
simulateTariffTesterBehavior()