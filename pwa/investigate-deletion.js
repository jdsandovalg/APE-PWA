import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://wtczfdkldixaptrskjwb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Y3pmZGtsZGl4YXB0cnNrandiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTk1NDIsImV4cCI6MjA3MjIzNTU0Mn0.paNwJUSuKaisbdMmK_J77LKTs4HpfKwgvv3cJz9pqI4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Investigar por qué no funciona la eliminación
async function investigateDeletionIssue() {
  console.log('🔍 Investigando problema de eliminación...\n')

  try {
    // 1. Ver todos los IDs exactamente como están en BD
    console.log('📋 IDs exactos en la base de datos:')
    const { data: allTariffs, error: allError } = await supabase
      .from('tariffs')
      .select('id')
      .is('deleted_at', null)
      .order('id')

    if (allError) {
      console.error('❌ Error obteniendo IDs:', allError)
      return
    }

    console.log('IDs encontrados:')
    allTariffs?.forEach((t, index) => {
      console.log(`  ${index + 1}. "${t.id}" (longitud: ${t.id.length})`)
      // Mostrar caracteres especiales
      const chars = []
      for (let i = 0; i < t.id.length; i++) {
        const char = t.id.charAt(i)
        const code = t.id.charCodeAt(i)
        if (code < 32 || code > 126) {
          chars.push(`[${code}]`)
        } else {
          chars.push(char)
        }
      }
      console.log(`     Caracteres: ${chars.join('')}`)
    })

    if (!allTariffs || allTariffs.length === 0) {
      console.log('⚠️ No hay tariffs activas')
      return
    }

    // 2. Probar eliminación con el primer ID
    const targetId = allTariffs[0].id
    console.log(`\n🎯 Probando eliminación del ID: "${targetId}"`)

    // Verificar que existe antes
    const { data: exists, error: existsError } = await supabase
      .from('tariffs')
      .select('id, deleted_at')
      .eq('id', targetId)
      .single()

    if (existsError) {
      console.error('❌ Error verificando existencia:', existsError)
      console.error('Código:', existsError.code)
      return
    }

    console.log(`✅ Existe: ${exists.id}, deleted_at: ${exists.deleted_at}`)

    // 3. Intentar UPDATE sin .select()
    console.log('\n🔄 Intentando UPDATE sin SELECT...')
    const deletedAt = new Date().toISOString()
    const { data: updateData, error: updateError } = await supabase
      .from('tariffs')
      .update({ deleted_at: deletedAt })
      .eq('id', targetId)

    console.log('Resultado UPDATE:', { data: updateData, error: updateError })

    if (updateError) {
      console.error('❌ Error UPDATE:', updateError)
      console.error('Código:', updateError.code)
      console.error('Mensaje:', updateError.message)
      return
    }

    // 4. Verificar si se actualizó
    const { data: afterUpdate, error: afterError } = await supabase
      .from('tariffs')
      .select('id, deleted_at')
      .eq('id', targetId)
      .single()

    if (afterError) {
      console.error('❌ Error verificando después:', afterError)
    } else {
      console.log(`📋 Después del UPDATE: deleted_at = ${afterUpdate.deleted_at}`)
      console.log(`✅ Eliminación: ${afterUpdate.deleted_at ? 'EXITOSA' : 'FALLIDA'}`)
    }

  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

// Ejecutar investigación
investigateDeletionIssue()