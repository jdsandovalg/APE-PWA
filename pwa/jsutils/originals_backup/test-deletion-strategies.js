import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://wtczfdkldixaptrskjwb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Y3pmZGtsZGl4YXB0cnNrandiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTk1NDIsImV4cCI6MjA3MjIzNTU0Mn0.paNwJUSuKaisbdMmK_J77LKTs4HpfKwgvv3cJz9pqI4'

// Para testing, usar service role key si está disponible
// const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY_HERE' // Necesitarías obtener esto del dashboard

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Función para probar diferentes estrategias de eliminación
async function testDeletionStrategies() {
  console.log('🧪 Probando diferentes estrategias de eliminación...\n')

  try {
    // 1. Verificar permisos de la tabla
    console.log('🔐 Verificando permisos de la tabla tariffs...')

    // Intentar una consulta que debería funcionar
    const { data: testRead, error: testReadError } = await supabase
      .from('tariffs')
      .select('count')
      .limit(1)

    if (testReadError) {
      console.error('❌ Error en lectura básica:', testReadError)
      return
    }

    console.log('✅ Lectura básica funciona')

    // 2. Verificar si RLS está bloqueando
    console.log('\n🔒 Probando si RLS está bloqueando UPDATE...')

    // Intentar UPDATE con diferentes condiciones
    const targetId = 'EEGSA-BTSA-2024Q4'
    const deletedAt = new Date().toISOString()

    // Estrategia 1: UPDATE directo
    console.log('📝 Estrategia 1: UPDATE directo')
    const { data: update1, error: error1 } = await supabase
      .from('tariffs')
      .update({ deleted_at: deletedAt })
      .eq('id', targetId)

    console.log('Resultado:', { data: update1, error: error1 })

    // Verificar resultado
    const { data: check1 } = await supabase
      .from('tariffs')
      .select('deleted_at')
      .eq('id', targetId)
      .single()

    console.log(`Después estrategia 1: deleted_at = ${check1?.deleted_at || 'null'}`)

    // Estrategia 2: Usar rpc function si existe
    console.log('\n🔧 Estrategia 2: Probando función RPC si existe...')
    try {
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('delete_tariff', { tariff_id: targetId })

      console.log('Resultado RPC:', { data: rpcResult, error: rpcError })

      if (!rpcError) {
        const { data: check2 } = await supabase
          .from('tariffs')
          .select('deleted_at')
          .eq('id', targetId)
          .single()

        console.log(`Después estrategia 2: deleted_at = ${check2?.deleted_at || 'null'}`)
      }
    } catch (rpcErr) {
      console.log('❌ No existe función RPC delete_tariff')
    }

    // Estrategia 3: Verificar si hay políticas RLS
    console.log('\n📋 Estrategia 3: Verificando estructura de la tabla...')

    // Intentar una consulta que revele información sobre RLS
    // Nota: Esta consulta podría no funcionar dependiendo de permisos
    try {
      const { data: policies, error: policiesError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'tariffs')

      if (!policiesError) {
        console.log('Políticas RLS encontradas:')
        policies?.forEach(policy => {
          console.log(`  - ${policy.policyname}: ${policy.cmd} on ${policy.qual}`)
        })
      } else {
        console.log('❌ No se pueden leer políticas RLS:', policiesError.message)
      }
    } catch (err) {
      console.log('❌ Error consultando políticas RLS')
    }

    // Estrategia 4: Probar con diferentes formatos de fecha
    console.log('\n📅 Estrategia 4: Probando diferentes formatos de fecha...')

    const formats = [
      new Date().toISOString(),
      new Date().toISOString().slice(0, -5) + 'Z', // Sin milisegundos
      '2025-11-27T12:00:00Z', // Fecha específica
    ]

    for (let i = 0; i < formats.length; i++) {
      console.log(`  Formato ${i + 1}: ${formats[i]}`)
      const { data: updateFormat, error: errorFormat } = await supabase
        .from('tariffs')
        .update({ deleted_at: formats[i] })
        .eq('id', targetId)

      console.log(`    Resultado: ${updateFormat}, Error: ${errorFormat}`)

      const { data: checkFormat } = await supabase
        .from('tariffs')
        .select('deleted_at')
        .eq('id', targetId)
        .single()

      console.log(`    deleted_at = ${checkFormat?.deleted_at || 'null'}`)
    }

    // Estrategia 5: Verificar si el problema es con el campo deleted_at
    console.log('\n🔍 Estrategia 5: Verificando si el problema es con el campo deleted_at...')

    // Intentar actualizar otro campo que no sea deleted_at
    const { data: updateOther, error: errorOther } = await supabase
      .from('tariffs')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', targetId)

    console.log('UPDATE en updated_at:', { data: updateOther, error: errorOther })

    const { data: checkOther } = await supabase
      .from('tariffs')
      .select('updated_at')
      .eq('id', targetId)
      .single()

    console.log(`updated_at cambió: ${checkOther?.updated_at || 'null'}`)

  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

// Ejecutar pruebas
testDeletionStrategies()
