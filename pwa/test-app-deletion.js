import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://wtczfdkldixaptrskjwb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Y3pmZGtsZGl4YXB0cnNrandiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTk1NDIsImV4cCI6MjA3MjIzNTU0Mn0.paNwJUSuKaisbdMmK_J77LKTs4HpfKwgvv3cJz9pqI4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Simular la función deleteTariff del supabaseBasic.ts
export async function deleteTariff(tariffId) {
  console.log(`🗑️ Intentando eliminar tariff: ${tariffId}`)

  try {
    // Verificar que existe y no está eliminado
    const { data: existing, error: checkError } = await supabase
      .from('tariffs')
      .select('id, deleted_at')
      .eq('id', tariffId)
      .is('deleted_at', null)
      .single()

    if (checkError) {
      console.error('❌ Error verificando tariff:', checkError)
      return { success: false, error: checkError.message }
    }

    if (!existing) {
      console.log('⚠️ Tariff no encontrado o ya eliminado')
      return { success: false, error: 'Tariff no encontrado' }
    }

    console.log(`✅ Tariff encontrado: ${existing.id}`)

    // Ejecutar soft delete
    const deletedAt = new Date().toISOString()
    const { data, error } = await supabase
      .from('tariffs')
      .update({ deleted_at: deletedAt })
      .eq('id', tariffId)

    if (error) {
      console.error('❌ Error en UPDATE:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ UPDATE ejecutado sin error')

    // Verificar que se actualizó
    const { data: verify, error: verifyError } = await supabase
      .from('tariffs')
      .select('id, deleted_at')
      .eq('id', tariffId)
      .single()

    if (verifyError) {
      console.error('❌ Error verificando actualización:', verifyError)
      return { success: false, error: verifyError.message }
    }

    const success = verify.deleted_at !== null
    console.log(`📋 Resultado final: deleted_at = ${verify.deleted_at}`)
    console.log(`✅ Eliminación: ${success ? 'EXITOSA' : 'FALLIDA'}`)

    return { success, data: verify }

  } catch (err) {
    console.error('❌ Error general:', err)
    return { success: false, error: err.message }
  }
}

// Función para verificar estado actual
async function checkCurrentState() {
  console.log('📊 Estado actual de tariffs:\n')

  const { data: active, error: activeError } = await supabase
    .from('tariffs')
    .select('id, deleted_at')
    .is('deleted_at', null)
    .order('id')

  if (activeError) {
    console.error('❌ Error obteniendo activas:', activeError)
    return
  }

  console.log(`Tariffs activas: ${active?.length || 0}`)
  active?.forEach(t => console.log(`  ✅ ${t.id}`))

  const { data: deleted, error: deletedError } = await supabase
    .from('tariffs')
    .select('id, deleted_at')
    .not('deleted_at', 'is', null)
    .order('id')

  if (!deletedError && deleted?.length > 0) {
    console.log(`\nTariffs eliminadas: ${deleted.length}`)
    deleted.forEach(t => console.log(`  🗑️ ${t.id} (${t.deleted_at})`))
  }

  return active
}

// Probar eliminación desde la aplicación
async function testAppDeletion() {
  console.log('🧪 Probando eliminación desde la aplicación...\n')

  // Ver estado inicial
  const activeTariffs = await checkCurrentState()

  if (!activeTariffs || activeTariffs.length === 0) {
    console.log('⚠️ No hay tariffs activas para probar')
    return
  }

  // Elegir una para eliminar (evitando la que ya eliminamos antes)
  const testTariff = activeTariffs.find(t => t.id !== 'EEGSA-BTSA-2024Q4') || activeTariffs[0]

  console.log(`\n🎯 Probando eliminación de: ${testTariff.id}`)

  // Ejecutar eliminación como lo haría la app
  const result = await deleteTariff(testTariff.id)

  if (result.success) {
    console.log('\n🎉 ¡Eliminación exitosa desde la aplicación!')
    console.log('✅ La función deleteTariff funciona correctamente')
    console.log('✅ RLS permite la eliminación')
    console.log('✅ TariffTester debería funcionar ahora')
  } else {
    console.log('\n❌ Error en eliminación:', result.error)
  }

  // Ver estado final
  console.log('\n📊 Estado final:')
  await checkCurrentState()
}

// Ejecutar prueba
testAppDeletion()