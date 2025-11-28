import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://wtczfdkldixaptrskjwb.supabase.co'
const supabaseAnonKey = 'REDACTED'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Verificar estado actual de tariffs
async function checkTariffsStatus() {
  console.log('🔍 Verificando estado actual de tariffs en Supabase...\n')

  try {
    // Todas las tariffs
    const { data: allTariffs, error: allError } = await supabase
      .from('tariffs')
      .select('id, company, segment, deleted_at')
      .order('id')

    if (allError) {
      console.error('❌ Error obteniendo todas las tariffs:', allError)
      return
    }

    console.log(`📊 Total de tariffs en BD: ${allTariffs?.length || 0}`)
    allTariffs?.forEach(t => {
      const status = t.deleted_at ? `🗑️ ELIMINADA (${t.deleted_at})` : '✅ ACTIVA'
      console.log(`  - ${t.id}: ${t.company}/${t.segment} (${status})`)
    })

    // Solo activas
    const { data: activeTariffs, error: activeError } = await supabase
      .from('tariffs')
      .select('id, company, segment')
      .is('deleted_at', null)
      .order('id')

    if (activeError) {
      console.error('❌ Error obteniendo tariffs activas:', activeError)
      return
    }

    console.log(`\n📊 Tariffs activas: ${activeTariffs?.length || 0}`)
    activeTariffs?.forEach(t => {
      console.log(`  - ${t.id}: ${t.company}/${t.segment}`)
    })

    // Conteo
    const { count, error: countError } = await supabase
      .from('tariffs')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    if (countError) {
      console.error('❌ Error en conteo:', countError)
    } else {
      console.log(`\n📊 Conteo oficial: ${count}`)
    }

  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

// Ejecutar verificación
checkTariffsStatus()
