import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase (desde variables de entorno)
const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PUBLIC_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLIC_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL and SUPABASE_ANON_KEY environment variables.')
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY before running this script.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Probar eliminación después de crear la política RLS
async function testDeletionAfterRLS() {
  console.log('🧪 Probando eliminación después de crear política RLS...\n')

  try {
    // 1. Ver estado inicial
    console.log('📊 Estado inicial:')
    const { data: initialTariffs, error: initialError } = await supabase
      .from('tariffs')
      .select('id, deleted_at')
      .is('deleted_at', null)
      .order('id')

    if (initialError) {
      console.error('❌ Error obteniendo tariffs iniciales:', initialError)
      return
    }

    console.log(`Tariffs activas: ${initialTariffs?.length || 0}`)
    initialTariffs?.forEach(t => {
      console.log(`  - ${t.id}: deleted_at = ${t.deleted_at}`)
    })

    if (!initialTariffs || initialTariffs.length === 0) {
      console.log('⚠️ No hay tariffs activas para probar')
      return
    }

    // 2. Probar eliminación del primer tariff
    const targetTariff = initialTariffs[0]
    console.log(`\n🎯 Probando eliminación de: ${targetTariff.id}`)

    // Verificar estado antes
    console.log(`Antes: deleted_at = ${targetTariff.deleted_at}`)

    // 3. Ejecutar eliminación
    const deletedAt = new Date().toISOString()
    console.log(`\n🗑️ Ejecutando eliminación con timestamp: ${deletedAt}`)

    const { data: updateResult, error: updateError } = await supabase
      .from('tariffs')
      .update({ deleted_at: deletedAt })
      .eq('id', targetTariff.id)

    console.log('Resultado UPDATE:', { data: updateResult, error: updateError })

    if (updateError) {
      console.error('❌ Error en UPDATE:', updateError)
      console.error('Código:', updateError.code)
      console.error('Mensaje:', updateError.message)
      return
    }

    // 4. Verificar resultado
    console.log('\n🔍 Verificando resultado...')

    const { data: afterUpdate, error: afterError } = await supabase
      .from('tariffs')
      .select('id, deleted_at')
      .eq('id', targetTariff.id)
      .single()

    if (afterError) {
      console.error('❌ Error verificando resultado:', afterError)
    } else {
      console.log(`Después: deleted_at = ${afterUpdate.deleted_at}`)
      const success = afterUpdate.deleted_at !== null
      console.log(`✅ Eliminación: ${success ? 'EXITOSA' : 'FALLIDA'}`)
    }

    // 5. Verificar que ya no aparece en consultas activas
    console.log('\n📋 Verificando que no aparece en consultas activas...')

    const { data: activeAfter, error: activeError } = await supabase
      .from('tariffs')
      .select('id')
      .is('deleted_at', null)
      .order('id')

    if (activeError) {
      console.error('❌ Error obteniendo tariffs activas:', activeError)
    } else {
      const stillActive = activeAfter?.some(t => t.id === targetTariff.id)
      console.log(`Tariffs activas después: ${activeAfter?.length || 0}`)
      console.log(`Eliminado sigue activo: ${stillActive ? 'SÍ (ERROR)' : 'NO (CORRECTO)'}`)

      if (!stillActive) {
        console.log('\n🎉 ¡EXITO! La eliminación funciona correctamente con RLS')
        console.log('✅ Tariff eliminado no aparece en consultas activas')
        console.log('✅ Campo deleted_at actualizado correctamente')
      } else {
        console.log('\n❌ ERROR: Tariff sigue apareciendo como activo')
      }
    }

    // 6. Verificar consultas con deleted_at
    console.log('\n🔍 Verificando consultas incluyendo eliminados...')

    const { data: allIncludingDeleted, error: allError } = await supabase
      .from('tariffs')
      .select('id, deleted_at')
      .order('id')

    if (!allError) {
      const deletedOnes = allIncludingDeleted?.filter(t => t.deleted_at !== null)
      console.log(`Total tariffs en BD: ${allIncludingDeleted?.length || 0}`)
      console.log(`Tariffs eliminados: ${deletedOnes?.length || 0}`)
      deletedOnes?.forEach(t => {
        console.log(`  - ${t.id}: eliminado el ${t.deleted_at}`)
      })
    }

  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

// Ejecutar prueba
testDeletionAfterRLS()
