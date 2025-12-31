import { supabase } from './supabase'
import { supabaseLogger, measureTime } from './supabaseLogger'

/**
 * Actualiza o inserta una lectura en la base de datos.
 * Utiliza la clave compuesta (meter_id, date) para determinar si es update o insert.
 * 
 * @param meter_id - Identificador del medidor (Contador)
 * @param date - Fecha de la lectura (YYYY-MM-DD)
 * @param consumption - Energía recibida (kWh)
 * @param production - Energía entregada (kWh)
 * @param credit - Crédito (opcional, por defecto 0)
 */
export async function updateReading(
  meter_id: string, 
  date: string, 
  consumption: number, 
  production: number,
  credit: number = 0
) {
  console.log(`💾 Saving reading for meter ${meter_id} on ${date}...`)

  const upsertData = {
    meter_id,
    date,
    consumption,
    production,
    credit,
    updated_at: new Date().toISOString()
  }

  const { result, duration } = await measureTime(async () => {
    return await supabase
      .from('readings')
      .upsert(upsertData, { onConflict: 'meter_id, date' })
      .select()
  })

  const { data, error } = result
  supabaseLogger.logUpsert('readings', upsertData, 'meter_id, date', data, error, duration)

  if (error) {
    console.error('❌ Error saving reading:', error)
    throw error
  }
  console.log(`✅ Reading saved successfully`)
  return data
}