import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://wtczfdkldixaptrskjwb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Y3pmZGtsZGl4YXB0cnNrandiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTk1NDIsImV4cCI6MjA3MjIzNTU0Mn0.paNwJUSuKaisbdMmK_J77LKTs4HpfKwgvv3cJz9pqI4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Buscar dependientes de tariffs
async function findTariffDependencies() {
  console.log('🔍 Buscando dependientes de la tabla tariffs...\n')

  try {
    // 1. Ver todas las tablas disponibles
    console.log('📋 Tablas disponibles en la base de datos:')
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .neq('table_name', 'schema_migrations')

    if (tablesError) {
      console.error('❌ Error obteniendo tablas:', tablesError)
    } else {
      console.log('Tablas encontradas:')
      tables?.forEach(t => console.log(`  - ${t.table_name}`))
    }

    // 2. Buscar foreign keys que referencien tariffs
    console.log('\n🔗 Buscando foreign keys que referencien tariffs...')
    const { data: fks, error: fksError } = await supabase
      .from('information_schema.table_constraints')
      .select(`
        table_name,
        constraint_name,
        constraint_type
      `)
      .eq('constraint_type', 'FOREIGN KEY')
      .eq('table_schema', 'public')

    if (fksError) {
      console.error('❌ Error obteniendo foreign keys:', fksError)
    } else {
      console.log('Foreign keys encontradas:')
      fks?.forEach(fk => console.log(`  - ${fk.table_name}: ${fk.constraint_name}`))
    }

    // 3. Buscar columnas que referencien tariff_id o similares
    console.log('\n📊 Buscando columnas que podrían referenciar tariffs...')
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type')
      .eq('table_schema', 'public')
      .or('column_name.ilike.%tariff%,column_name.ilike.%rate%,column_name.ilike.%fee%')

    if (columnsError) {
      console.error('❌ Error obteniendo columnas:', columnsError)
    } else {
      console.log('Columnas relacionadas encontradas:')
      columns?.forEach(col => console.log(`  - ${col.table_name}.${col.column_name} (${col.data_type})`))
    }

    // 4. Verificar si hay tablas de cálculos, facturas, etc.
    console.log('\n💰 Buscando tablas relacionadas con cálculos/facturas...')

    const possibleRelatedTables = ['calculations', 'invoices', 'bills', 'charges', 'contributions', 'readings']

    for (const tableName of possibleRelatedTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (!error) {
          console.log(`✅ Tabla '${tableName}' existe`)
          // Ver estructura
          const { data: structure, error: structError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_schema', 'public')
            .eq('table_name', tableName)

          if (!structError && structure) {
            console.log(`  Estructura de ${tableName}:`)
            structure.forEach(col => {
              console.log(`    - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`)
            })
          }
        }
      } catch (err) {
        console.log(`❌ Tabla '${tableName}' no existe o no accesible`)
      }
    }

    // 5. Buscar registros que podrían referenciar tariffs
    console.log('\n🔍 Buscando datos que podrían depender de tariffs...')

    // Verificar si hay alguna tabla con tariff_id
    try {
      const { data: tariffRefs, error: refsError } = await supabase
        .from('information_schema.columns')
        .select('table_name, column_name')
        .eq('table_schema', 'public')
        .or('column_name.eq.tariff_id,column_name.eq.tariff')

      if (!refsError && tariffRefs && tariffRefs.length > 0) {
        console.log('Columnas que referencian tariffs:')
        tariffRefs.forEach(ref => console.log(`  - ${ref.table_name}.${ref.column_name}`))

        // Verificar si hay datos en esas tablas
        for (const ref of tariffRefs) {
          try {
            const { count, error: countError } = await supabase
              .from(ref.table_name)
              .select('*', { count: 'exact', head: true })

            if (!countError) {
              console.log(`  📊 ${ref.table_name} tiene ${count} registros`)
            }
          } catch (err) {
            console.log(`  ❌ Error contando en ${ref.table_name}`)
          }
        }
      } else {
        console.log('✅ No se encontraron referencias directas a tariff_id')
      }
    } catch (err) {
      console.error('❌ Error buscando referencias:', err)
    }

  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

// Ejecutar búsqueda
findTariffDependencies()