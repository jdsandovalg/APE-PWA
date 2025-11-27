import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://wtczfdkldixaptrskjwb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Y3pmZGtsZGl4YXB0cnNrandiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTk1NDIsImV4cCI6MjA3MjIzNTU0Mn0.paNwJUSuKaisbdMmK_J77LKTs4HpfKwgvv3cJz9pqI4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Función para diagnosticar eliminación de tariffs
async function diagnoseTariffDeletion() {
  console.log('🔍 Diagnosticando eliminación de tariffs...\n')

  try {
    // 1. Obtener todas las tariffs antes de eliminar
    console.log('📋 Tariffs antes de eliminación:')
    const { data: tariffsBefore, error: beforeError } = await supabase
      .from('tariffs')
      .select('id, company, segment, deleted_at')
      .order('id')

    if (beforeError) {
      console.error('❌ Error obteniendo tariffs:', beforeError)
      return
    }

    console.log(`Total de tariffs: ${tariffsBefore?.length || 0}`)
    tariffsBefore?.forEach(t => {
      console.log(`  - ${t.id}: ${t.company}/${t.segment} (deleted_at: ${t.deleted_at || 'null'})`)
    })

    // 2. Obtener solo las no eliminadas
    console.log('\n📋 Tariffs no eliminadas:')
    const { data: activeTariffs, error: activeError } = await supabase
      .from('tariffs')
      .select('id, company, segment')
      .is('deleted_at', null)
      .order('id')

    if (activeError) {
      console.error('❌ Error obteniendo tariffs activas:', activeError)
      return
    }

    console.log(`Total activas: ${activeTariffs?.length || 0}`)
    activeTariffs?.forEach(t => {
      console.log(`  - ${t.id}: ${t.company}/${t.segment}`)
    })

    // 3. Contar con la función de conteo
    console.log('\n📊 Conteo usando función getTariffsCount:')
    const { count, error: countError } = await supabase
      .from('tariffs')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    if (countError) {
      console.error('❌ Error en conteo:', countError)
    } else {
      console.log(`Conteo: ${count}`)
    }

    // 4. Intentar eliminar una tariff de prueba
    if (activeTariffs && activeTariffs.length > 0) {
      const testTariff = activeTariffs[0]
      console.log(`\n🗑️ Intentando eliminar tariff: ${testTariff.id}`)

      // Primero verificar que existe
      console.log('🔍 Verificando existencia antes de eliminar...')
      const { data: existsCheck, error: existsError } = await supabase
        .from('tariffs')
        .select('id, deleted_at')
        .eq('id', testTariff.id)
        .single()

      if (existsError) {
        console.error('❌ Error verificando existencia:', existsError)
        return
      }

      console.log(`Tariff existe: ${existsCheck.id}, deleted_at: ${existsCheck.deleted_at}`)

      // Intentar eliminar
      const deletedAt = new Date().toISOString()
      console.log(`Estableciendo deleted_at = ${deletedAt}`)

      const { data: updateResult, error: deleteError } = await supabase
        .from('tariffs')
        .update({ deleted_at: deletedAt })
        .eq('id', testTariff.id)
        .select('id, deleted_at')

      if (deleteError) {
        console.error('❌ Error eliminando:', deleteError)
        console.error('Código de error:', deleteError.code)
        console.error('Mensaje:', deleteError.message)
        console.error('Detalles:', deleteError.details)
      } else {
        console.log('✅ Resultado de eliminación:', updateResult)

        // Verificar inmediatamente después
        console.log('🔍 Verificando inmediatamente después...')
        const { data: verifyImmediate, error: verifyError } = await supabase
          .from('tariffs')
          .select('id, deleted_at')
          .eq('id', testTariff.id)
          .single()

        if (verifyError) {
          console.error('❌ Error verificando:', verifyError)
        } else {
          console.log(`Verificación inmediata: deleted_at = ${verifyImmediate.deleted_at}`)
        }

        // Verificar después de eliminar
        console.log('\n📋 Verificación después de eliminación:')
        const { data: afterTariffs, error: afterError } = await supabase
          .from('tariffs')
          .select('id, company, segment, deleted_at')
          .is('deleted_at', null)
          .order('id')

        if (afterError) {
          console.error('❌ Error verificando:', afterError)
        } else {
          console.log(`Tariffs activas restantes: ${afterTariffs?.length || 0}`)
          afterTariffs?.forEach(t => {
            console.log(`  - ${t.id}: ${t.company}/${t.segment}`)
          })

          // También mostrar todas las tariffs con deleted_at
          console.log('\n📋 Todas las tariffs (incluyendo eliminadas):')
          const { data: allTariffs, error: allError } = await supabase
            .from('tariffs')
            .select('id, company, segment, deleted_at')
            .order('id')

          if (!allError) {
            allTariffs?.forEach(t => {
              const status = t.deleted_at ? '🗑️ ELIMINADA' : '✅ ACTIVA'
              console.log(`  - ${t.id}: ${t.company}/${t.segment} (${status})`)
            })
          }
        }

        // Nuevo conteo
        const { count: newCount, error: newCountError } = await supabase
          .from('tariffs')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)

        if (newCountError) {
          console.error('❌ Error en nuevo conteo:', newCountError)
        } else {
          console.log(`Nuevo conteo: ${newCount}`)
        }
      }
    } else {
      console.log('\n⚠️ No hay tariffs activas para probar eliminación')
    }

  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

// Ejecutar diagnóstico
diagnoseTariffDeletion()