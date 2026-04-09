import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wtczfdkldixaptrskjwb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Y3pmZGtsZGl4YXB0cnNrandiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTk1NDIsImV4cCI6MjA3MjIzNTU0Mn0.paNwJUSuKaisbdMmK_J77LKTs4HpfKwgvv3cJz9pqI4'

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'energia'
  }
})

const TABLAS_SISTEMA = [
  'companies',
  'tariffs',
  'meters',
  'readings',
  'usuarios',
  'equipment_types',
  'meter_equipment'
]

async function testTabla(tabla) {
  console.log(`\n🔍 Probando tabla: ${tabla}`)
  try {
    const { data, error } = await supabase
      .from(tabla)
      .select('*')
      .limit(1)

    if (error) {
      console.log(`  ❌ ERROR: ${error.message}`)
      return { tabla, existe: false, error: error.message }
    }

    console.log(`  ✅ EXISTE - Registros: ${data?.length || 0}`)
    if (data && data.length > 0) {
      console.log(`  📋 columns: ${Object.keys(data[0]).join(', ')}`)
    }
    return { tabla, existe: true, columnas: data?.[0] ? Object.keys(data[0]) : [] }
  } catch (e) {
    console.log(`  ❌ EXCEPCIÓN: ${e.message}`)
    return { tabla, existe: false, error: e.message }
  }
}

async function testConexion() {
  console.log('\n=== 🧪 TEST CONEXIÓN SUPABASE ===')
  console.log(`URL: ${supabaseUrl}`)
  console.log(`Schema: energia`)
  
  const { data, error } = await supabase.from('companies').select('count').limit(1)
  
  if (error) {
    console.log(`\n❌ Error de conexión: ${error.message}`)
    return false
  }
  
  console.log('✅ Conexión exitosa\n')
  return true
}

async function runTests() {
  console.log('\n========================================')
  console.log('   TEST DE TABLAS - PROYECTO SOLAR')
  console.log('   Schema: energia')
  console.log('========================================\n')

  const conexionOk = await testConexion()
  if (!conexionOk) {
    console.log('❌ No se puede continuar sin conexión')
    process.exit(1)
  }

  console.log('--- Tablas del Sistema ---')
  for (const tabla of TABLAS_SISTEMA) {
    await testTabla(tabla)
  }

  console.log('\n========================================')
  console.log('   RESUMEN')
  console.log('========================================')
  console.log('✅ Todas las tablas verificadas')
}

runTests()
  .then(() => {
    console.log('\n✅ Tests completados')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ Error en tests:', err)
    process.exit(1)
  })