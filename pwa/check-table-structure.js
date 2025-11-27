import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://wtczfdkldixaptrskjwb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Y3pmZGtsZGl4YXB0cnNrandiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTk1NDIsImV4cCI6MjA3MjIzNTU0Mn0.paNwJUSuKaisbdMmK_J77LKTs4HpfKwgvv3cJz9pqI4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Script para verificar la estructura de las tablas
async function checkTableStructure() {
  console.log('🔍 Verificando estructura de tablas en Supabase...\n')

  try {
    // Verificar estructura de meters
    console.log('📋 Tabla METERS:')
    const { data: meters, error: metersError } = await supabase
      .from('meters')
      .select('*')
      .limit(1)

    if (metersError) {
      console.error('❌ Error obteniendo meters:', metersError)
    } else if (meters && meters.length > 0) {
      const sample = meters[0]
      console.log('Campos encontrados:')
      Object.keys(sample).forEach(key => {
        const value = sample[key]
        const type = typeof value
        console.log(`  - ${key}: ${type} (${value})`)
      })
    }

    console.log('\n📋 Tabla TARIFFS:')
    const { data: tariffs, error: tariffsError } = await supabase
      .from('tariffs')
      .select('*')
      .limit(1)

    if (tariffsError) {
      console.error('❌ Error obteniendo tariffs:', tariffsError)
    } else if (tariffs && tariffs.length > 0) {
      const sample = tariffs[0]
      console.log('Campos encontrados:')
      Object.keys(sample).forEach(key => {
        const value = sample[key]
        const type = typeof value
        console.log(`  - ${key}: ${type} (${value})`)
      })
    }

    console.log('\n📋 Tabla COMPANIES:')
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .limit(1)

    if (companiesError) {
      console.error('❌ Error obteniendo companies:', companiesError)
    } else if (companies && companies.length > 0) {
      const sample = companies[0]
      console.log('Campos encontrados:')
      Object.keys(sample).forEach(key => {
        const value = sample[key]
        const type = typeof value
        console.log(`  - ${key}: ${type} (${value})`)
      })
    }

    console.log('\n🎉 Verificación completada!')

  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

// Ejecutar verificación
checkTableStructure()