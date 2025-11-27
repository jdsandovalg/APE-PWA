import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://wtczfdkldixaptrskjwb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Y3pmZGtsZGl4YXB0cnNrandiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTk1NDIsImV4cCI6MjA3MjIzNTU0Mn0.paNwJUSuKaisbdMmK_J77LKTs4HpfKwgvv3cJz9pqI4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Verificar qué tablas existen y si tienen relación con tariffs
async function checkTablesAndRelations() {
  console.log('🔍 Verificando tablas y posibles relaciones con tariffs...\n')

  // Lista de tablas que podrían existir
  const possibleTables = [
    'companies', 'tariffs', 'readings', 'calculations', 'invoices',
    'bills', 'charges', 'contributions', 'users', 'profiles'
  ]

  for (const tableName of possibleTables) {
    try {
      console.log(`📋 Verificando tabla: ${tableName}`)

      // Intentar obtener estructura (primer registro)
      const { data: sample, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)

      if (sampleError) {
        console.log(`  ❌ No accesible: ${sampleError.message}`)
        continue
      }

      if (!sample || sample.length === 0) {
        console.log(`  📭 Vacía`)
        continue
      }

      console.log(`  ✅ Existe - ${sample.length} registro(s) de muestra`)

      // Mostrar estructura del primer registro
      const record = sample[0]
      console.log(`  📊 Estructura:`)
      Object.keys(record).forEach(key => {
        const value = record[key]
        const type = Array.isArray(value) ? 'array' : typeof value
        console.log(`    - ${key}: ${type} = ${JSON.stringify(value).slice(0, 50)}...`)
      })

      // Buscar campos que podrían referenciar tariffs
      const tariffRelatedFields = Object.keys(record).filter(key =>
        key.toLowerCase().includes('tariff') ||
        key.toLowerCase().includes('rate') ||
        key.toLowerCase().includes('fee') ||
        key === 'id' // podría ser tariff_id en otras tablas
      )

      if (tariffRelatedFields.length > 0) {
        console.log(`  🎯 Campos relacionados con tariffs: ${tariffRelatedFields.join(', ')}`)
      }

      // Contar registros totales
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (!countError) {
        console.log(`  🔢 Total registros: ${count}`)
      }

      console.log('')

    } catch (err) {
      console.log(`  ❌ Error: ${err}`)
      console.log('')
    }
  }

  // Verificar específicamente si readings tiene algún campo relacionado con tariffs
  console.log('🔍 Verificación específica de readings...\n')

  try {
    const { data: readings, error: readingsError } = await supabase
      .from('readings')
      .select('*')
      .limit(5)

    if (!readingsError && readings && readings.length > 0) {
      console.log('📊 Muestra de readings:')
      readings.forEach((reading, index) => {
        console.log(`  Registro ${index + 1}:`, JSON.stringify(reading, null, 2).slice(0, 200) + '...')
      })

      // Verificar si algún reading tiene campos que podrían depender de tariffs
      const hasTariffDependency = readings.some(reading =>
        reading.tariff_id ||
        reading.rate_id ||
        reading.fee_id ||
        reading.calculation_id
      )

      if (hasTariffDependency) {
        console.log('⚠️  POSIBLE DEPENDENCIA: Readings parece tener referencias a tariffs')
      } else {
        console.log('✅ Readings no parece tener dependencias directas a tariffs')
      }
    }
  } catch (err) {
    console.error('❌ Error verificando readings:', err)
  }
}

// Ejecutar verificación
checkTablesAndRelations()