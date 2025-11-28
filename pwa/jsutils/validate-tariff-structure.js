import { supabase } from './services/supabase.js'

// Función para validar la estructura de tariffs entre localStorage y Supabase
async function validateTariffStructure() {
  console.log('🔍 Validando estructura de tariffs entre localStorage y Supabase...\n')

  try {
    // 1. Obtener estructura de localStorage
    console.log('📱 Estructura actual en localStorage:')
    const { loadTariffs } = await import('./services/storage.js')
    const localTariffs = loadTariffs()

    if (localTariffs.length > 0) {
      const sample = localTariffs[0]
      console.log('Header:', JSON.stringify(sample.header, null, 2))
      console.log('Rates:', JSON.stringify(sample.rates, null, 2))
    } else {
      console.log('No hay tarifas en localStorage')
    }

    // 2. Obtener estructura de Supabase
    console.log('\n🗄️ Estructura en Supabase:')
    const { data: supabaseTariffs, error } = await supabase
      .from('tariffs')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Error obteniendo datos de Supabase:', error)
      return
    }

    if (supabaseTariffs && supabaseTariffs.length > 0) {
      console.log('Campos disponibles:', Object.keys(supabaseTariffs[0]))
      console.log('Muestra:', JSON.stringify(supabaseTariffs[0], null, 2))
    } else {
      console.log('No hay tarifas en Supabase')
    }

    // 3. Comparar estructuras
    console.log('\n⚖️ Comparación de estructuras:')

    if (localTariffs.length > 0 && supabaseTariffs && supabaseTariffs.length > 0) {
      const localSample = localTariffs[0]
      const supabaseSample = supabaseTariffs[0]

      console.log('LocalStorage header fields:', Object.keys(localSample.header))
      console.log('Supabase fields:', Object.keys(supabaseSample))

      // Verificar mapeo de campos
      const fieldMapping = {
        'id': 'id',
        'company': 'company',
        'companyCode': 'company_code',
        'segment': 'segment',
        'period.from': 'period_from',
        'period.to': 'period_to',
        'effectiveAt': 'effective_at',
        'currency': 'currency',
        'sourcePdf': 'source_pdf',
        'deleted_at': 'deleted_at',
        'fixedCharge_Q': 'fixed_charge_q',
        'energy_Q_per_kWh': 'energy_q_per_kwh',
        'distribution_Q_per_kWh': 'distribution_q_per_kwh',
        'potencia_Q_per_kWh': 'potencia_q_per_kwh',
        'contrib_percent': 'contrib_percent',
        'iva_percent': 'iva_percent',
        'notes': 'notes'
      }

      console.log('\n🔄 Mapeo de campos:')
      Object.entries(fieldMapping).forEach(([local, supabase]) => {
        const hasLocal = local.includes('.') ?
          localSample.header[local.split('.')[1]] !== undefined :
          (localSample.header[local] !== undefined || localSample.rates[local] !== undefined)
        const hasSupabase = supabaseSample[supabase] !== undefined
        const status = hasLocal && hasSupabase ? '✅' : hasLocal ? '📱' : hasSupabase ? '🗄️' : '❌'
        console.log(`${status} ${local} ↔ ${supabase}`)
      })
    }

  } catch (err) {
    console.error('❌ Error en validación:', err)
  }
}

// Ejecutar validación
validateTariffStructure()</content>
<parameter name="filePath">/Users/danielsandoval/appdev/AutoProductorEnergia/pwa/validate-tariff-structure.js