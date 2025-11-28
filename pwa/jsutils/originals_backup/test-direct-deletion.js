import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://wtczfdkldixaptrskjwb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Y3pmZGtsZGl4YXB0cnNrandiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTk1NDIsImV4cCI6MjA3MjIzNTU0Mn0.paNwJUSuKaisbdMmK_J77LKTs4HpfKwgvv3cJz9pqI4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Probar eliminación directa
async function testDirectDeletion() {
  console.log('🧪 Probando eliminación directa de tariff...\n')

  try {
    // Obtener una tariff para eliminar
    const { data: tariffs, error: fetchError } = await supabase
      .from('tariffs')
      .select('id, company, segment, deleted_at')
      .is('deleted_at', null)
      .limit(1)

    if (fetchError) {
      console.error('❌ Error obteniendo tariff:', fetchError)
      return
    }

    if (!tariffs || tariffs.length === 0) {
      console.log('⚠️ No hay tariffs para eliminar')
      return
    }

    const tariff = tariffs[0]
    console.log(`🎯 Intentando eliminar: ${tariff.id} (${tariff.company}/${tariff.segment})`)

    // Verificar estado antes
    console.log(`📋 Estado antes: deleted_at = ${tariff.deleted_at}`)

    // Eliminar
    const deletedAt = new Date().toISOString()
    console.log(`🗑️ Eliminando con timestamp: ${deletedAt}`)

    const { data: updateData, error: updateError } = await supabase
      .from('tariffs')
      .update({ deleted_at: deletedAt })
      .eq('id', tariff.id)
      .select('id, deleted_at')

    if (updateError) {
      console.error('❌ Error en UPDATE:', updateError)
      console.error('Código:', updateError.code)
      console.error('Mensaje:', updateError.message)
      return
    }

    console.log('✅ UPDATE exitoso:', updateData)

    // Verificar estado después
    const { data: verifyData, error: verifyError } = await supabase
      .from('tariffs')
      .select('id, deleted_at')
      .eq('id', tariff.id)
      .single()

    if (verifyError) {
      console.error('❌ Error verificando:', verifyError)
    } else {
      console.log(`📋 Estado después: deleted_at = ${verifyData.deleted_at}`)
      console.log(`✅ Eliminación ${verifyData.deleted_at ? 'EXITOSA' : 'FALLIDA'}`)
    }

    // Verificar que ya no aparece en consultas activas
    const { data: activeAfter, error: activeError } = await supabase
      .from('tariffs')
      .select('id')
      .is('deleted_at', null)
      .eq('id', tariff.id)

    if (activeError) {
      console.error('❌ Error verificando activas:', activeError)
    } else {
      console.log(`📊 Aparece en activas: ${activeAfter && activeAfter.length > 0 ? 'SÍ' : 'NO'}`)
    }

  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

// Ejecutar prueba
testDirectDeletion()
