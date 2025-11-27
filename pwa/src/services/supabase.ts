import { createClient } from '@supabase/supabase-js'
import { supabaseLogger, measureTime } from './supabaseLogger'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Función para obtener el conteo de compañías
export async function getCompaniesCount(): Promise<number> {
  try {
    const { result, duration } = await measureTime(async () => {
      return await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
    })

    const { count, error } = result
    supabaseLogger.logSelect('companies', '*', { count: 'exact', head: true }, { count }, error, duration)

    if (error) {
      console.error('Error fetching companies count:', error)
      return 0
    }

    return count || 0
  } catch (err) {
    console.error('Error in getCompaniesCount:', err)
    return 0
  }
}

// Función para soft delete una compañía
export async function softDeleteCompany(id: string, code: string): Promise<void> {
  try {
    const deletedAt = new Date().toISOString()
    console.log(`Soft deleting company: ${id}, ${code} at ${deletedAt}`)

    // Primero, verificar que existe
    const { result: fetchResult, duration: fetchDuration } = await measureTime(async () => {
      return await supabase
        .from('companies')
        .select('id, code, deleted_at')
        .eq('id', id)
        .eq('code', code)
    })

    const { data: existing, error: fetchError } = fetchResult
    supabaseLogger.logSelect('companies', 'id, code, deleted_at', { id, code }, existing, fetchError, fetchDuration)

    console.log('Existing records:', existing, fetchError)

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`)
    }

    if (!existing || existing.length === 0) {
      throw new Error(`Company not found in Supabase: ${id}, ${code}`)
    }

    // Actualizar en Supabase
    const { result: updateResult, duration: updateDuration } = await measureTime(async () => {
      return await supabase
        .from('companies')
        .update({ deleted_at: deletedAt })
        .eq('id', id)
        .eq('code', code)
        .select()
    })

    const { data, error } = updateResult
    supabaseLogger.logUpdate('companies', { deleted_at: deletedAt }, { id, code }, data, error, updateDuration)

    console.log('Supabase update result:', data, error)

    if (error) {
      console.error('Error soft deleting in Supabase:', error)
      throw error
    }

    // Verificar que se actualizó
    const { result: verifyResult, duration: verifyDuration } = await measureTime(async () => {
      return await supabase
        .from('companies')
        .select('id, code, deleted_at')
        .eq('id', id)
        .eq('code', code)
    })

    const { data: updated, error: verifyError } = verifyResult
    supabaseLogger.logSelect('companies', 'id, code, deleted_at', { id, code }, updated, verifyError, verifyDuration)

    console.log('Verification after update:', updated, verifyError)

    // Actualizar en localStorage
    const localRaw = localStorage.getItem('apenergia:companies')
    if (localRaw) {
      const localData = JSON.parse(localRaw)
      const updatedLocal = localData.map((c: any) =>
        c.id === id && c.code === code ? { ...c, deleted_at: deletedAt } : c
      )
      localStorage.setItem('apenergia:companies', JSON.stringify(updatedLocal))
      console.log('LocalStorage updated')
    }
  } catch (err) {
    console.error('Error in softDeleteCompany:', err)
    throw err
  }
}

// Función para obtener la lista de compañías
export async function getCompaniesList(): Promise<{ id: string; code: string; name: string; deleted_at?: string }[]> {
  try {
    const { result, duration } = await measureTime(async () => {
      return await supabase
        .from('companies')
        .select('id, code, name, deleted_at')
        .is('deleted_at', null)  // Filter out soft deleted
    })

    const { data, error } = result
    supabaseLogger.logSelect('companies', 'id, code, name, deleted_at', { deleted_at: 'null' }, data, error, duration)

    if (error) {
      console.error('Error fetching companies list:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error in getCompaniesList:', err)
    return []
  }
}

// Función para agregar una compañía nueva
export async function addCompany(id: string, code: string, name: string): Promise<void> {
  try {
    // Insertar en Supabase
    const { result, duration } = await measureTime(async () => {
      return await supabase
        .from('companies')
        .insert({ id, code, name })
        .select()
    })

    const { data, error } = result
    supabaseLogger.logInsert('companies', { id, code, name }, data, error, duration)

    if (error) {
      console.error('Error inserting company in Supabase:', error)
      throw error
    }

    // Agregar a localStorage
    const { loadCompanies, saveCompanies } = await import('./storage')
    const localData = loadCompanies()
    localData.push({ id, code, name })
    saveCompanies(localData)

    console.log(`Company added: ${id}, ${code}`)
  } catch (err) {
    console.error('Error in addCompany:', err)
    throw err
  }
}

// Función para actualizar una compañía
export async function updateCompany(id: string, code: string, name: string): Promise<void> {
  try {
    // Actualizar en Supabase
    const { result, duration } = await measureTime(async () => {
      return await supabase
        .from('companies')
        .update({ name })
        .eq('id', id)
        .eq('code', code)
        .select()
    })

    const { data, error } = result
    supabaseLogger.logUpdate('companies', { name }, { id, code }, data, error, duration)

    if (error) {
      console.error('Error updating company in Supabase:', error)
      throw error
    }

    // Actualizar en localStorage
    const { loadCompanies, saveCompanies } = await import('./storage')
    const localData = loadCompanies()
    const updatedLocal = localData.map((c: any) =>
      c.id === id && c.code === code ? { ...c, name } : c
    )
    saveCompanies(updatedLocal)

    console.log(`Company updated: ${id}, ${code}`)
  } catch (err) {
    console.error('Error in updateCompany:', err)
    throw err
  }
}

// Función para sincronizar companies: merge de Supabase y localStorage
export async function syncCompaniesFromSupabase(): Promise<void> {
  try {
    // Obtener datos de Supabase (solo no deleted)
    const supabaseData = await getCompaniesList()

    // Obtener datos de localStorage (incluyendo deleted para merge)
    const { loadCompanies, saveCompanies } = await import('./storage')
    const localRaw = localStorage.getItem('apenergia:companies')
    const localData = localRaw ? JSON.parse(localRaw) : []

    // Crear un mapa único basado en (id, code)
    const mergedMap = new Map<string, any>()

    // Agregar de localStorage (todos, incluyendo deleted)
    localData.forEach((c: any) => {
      if (c.code) {
        const key = `${c.id}|${c.code}`
        mergedMap.set(key, c)
      }
    })

    // Agregar/sobrescribir de Supabase (no deleted)
    supabaseData.forEach((c: { id: string; code: string; name: string; deleted_at?: string }) => {
      const key = `${c.id}|${c.code}`
      mergedMap.set(key, c)
    })

    // Convertir a array
    const mergedData = Array.from(mergedMap.values())

    // Guardar en localStorage (todos)
    localStorage.setItem('apenergia:companies', JSON.stringify(mergedData))

    // Guardar en Supabase (upsert, incluyendo deleted_at)
    const { result, duration } = await measureTime(async () => {
      return await supabase
        .from('companies')
        .upsert(mergedData, { onConflict: 'id,code' })
    })

    const { error } = result
    supabaseLogger.logUpsert('companies', mergedData, 'id,code', null, error, duration)

    if (error) {
      console.error('Error upserting to Supabase:', error)
    }

    console.log(`Sincronización completada: ${mergedData.length} compañías totales`)
  } catch (err) {
    console.error('Error en syncCompaniesFromSupabase:', err)
  }
}

// Función para obtener el conteo de tariffs
export async function getTariffsCount(): Promise<number> {
  try {
    const { result, duration } = await measureTime(async () => {
      return await supabase
        .from('tariffs')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
    })

    const { count, error } = result
    supabaseLogger.logSelect('tariffs', '*', { deleted_at: 'null', count: 'exact', head: true }, { count }, error, duration)

    if (error) {
      console.error('Error fetching tariffs count:', error)
      return 0
    }

    return count || 0
  } catch (err) {
    console.error('Error in getTariffsCount:', err)
    return 0
  }
}

// Función para soft delete una tariff
export async function softDeleteTariff(id: string): Promise<void> {
  try {
    const deletedAt = new Date().toISOString()
    console.log(`Soft deleting tariff: ${id} at ${deletedAt}`)

    // Actualizar en Supabase
    const { result, duration } = await measureTime(async () => {
      return await supabase
        .from('tariffs')
        .update({ deleted_at: deletedAt })
        .eq('id', id)
        .select()
    })

    const { data, error } = result
    supabaseLogger.logUpdate('tariffs', { deleted_at: deletedAt }, { id }, data, error, duration)

    console.log('Supabase update result:', data, error)

    if (error) {
      console.error('Error soft deleting tariff in Supabase:', error)
      throw error
    }

    // Actualizar en localStorage
    const localRaw = localStorage.getItem('apenergia:tariffs')
    if (localRaw) {
      const localData = JSON.parse(localRaw)
      const updatedLocal = localData.map((t: any) =>
        t.header.id === id ? { ...t, header: { ...t.header, deleted_at: deletedAt } } : t
      )
      localStorage.setItem('apenergia:tariffs', JSON.stringify(updatedLocal))
      console.log('LocalStorage updated for tariff')
    }
  } catch (err) {
    console.error('Error in softDeleteTariff:', err)
    throw err
  }
}

// Función para obtener la lista de tariffs
export async function getTariffsList(): Promise<{ id: string; company: string; segment: string; period_from: string; period_to: string; effective_at?: string; currency?: string; source_pdf?: string; fixed_charge_q: number; energy_q_per_kwh: number; distribution_q_per_kwh: number; potencia_q_per_kwh: number; contrib_percent: number; iva_percent: number; notes?: string; deleted_at?: string }[]> {
  try {
    const { result, duration } = await measureTime(async () => {
      return await supabase
        .from('tariffs')
        .select('id, company, segment, period_from, period_to, effective_at, currency, source_pdf, fixed_charge_q, energy_q_per_kwh, distribution_q_per_kwh, potencia_q_per_kwh, contrib_percent, iva_percent, notes, deleted_at')
        .is('deleted_at', null)
    })

    const { data, error } = result
    supabaseLogger.logSelect('tariffs', 'id, company, segment, period_from, period_to, effective_at, currency, source_pdf, fixed_charge_q, energy_q_per_kwh, distribution_q_per_kwh, potencia_q_per_kwh, contrib_percent, iva_percent, notes, deleted_at', { deleted_at: 'null' }, data, error, duration)

    if (error) {
      console.error('Error fetching tariffs list:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error in getTariffsList:', err)
    return []
  }
}

// Función para sincronizar tariffs: merge de Supabase y localStorage
export async function syncTariffsFromSupabase(): Promise<void> {
  try {
    // Obtener datos de Supabase (solo no deleted)
    const supabaseData = await getTariffsList()

    // Obtener datos de localStorage
    const { loadTariffs, saveTariffs } = await import('./storage')
    const localData = loadTariffs()

    // Crear un mapa único basado en (company, segment, period_from, period_to) para evitar duplicados
    const mergedMap = new Map<string, any>()

    // Agregar de localStorage (todos)
    localData.forEach((t: any) => {
      const key = `${t.header.company}|${t.header.segment}|${t.header.period.from}|${t.header.period.to}`
      mergedMap.set(key, t)
    })

    // Agregar/sobrescribir de Supabase (no deleted)
    supabaseData.forEach((t: any) => {
      const key = `${t.company}|${t.segment}|${t.period_from}|${t.period_to}`
      // Convertir a formato TariffSet
      const tariffSet = {
        header: {
          id: t.id,
          company: t.company,
          companyCode: t.company_code || t.company, // Asumir si falta
          segment: t.segment,
          period: { from: t.period_from, to: t.period_to },
          effectiveAt: t.effective_at,
          currency: t.currency,
          sourcePdf: t.source_pdf
        },
        rates: {
          fixedCharge_Q: t.fixed_charge_q,
          energy_Q_per_kWh: t.energy_q_per_kwh,
          distribution_Q_per_kWh: t.distribution_q_per_kwh,
          potencia_Q_per_kWh: t.potencia_q_per_kwh,
          contrib_percent: t.contrib_percent,
          iva_percent: t.iva_percent,
          notes: t.notes
        }
      }
      mergedMap.set(key, tariffSet)
    })

    // Convertir a array
    const mergedData = Array.from(mergedMap.values())

    // Guardar en localStorage
    saveTariffs(mergedData)

    // Guardar en Supabase (upsert)
    const upsertData = mergedData.map(t => ({
      id: t.header.id,
      company: t.header.company,
      company_code: t.header.companyCode,
      segment: t.header.segment,
      period_from: t.header.period.from,
      period_to: t.header.period.to,
      effective_at: t.header.effectiveAt,
      currency: t.header.currency,
      source_pdf: t.header.sourcePdf,
      fixed_charge_q: t.rates.fixedCharge_Q,
      energy_q_per_kwh: t.rates.energy_Q_per_kWh,
      distribution_q_per_kwh: t.rates.distribution_Q_per_kWh,
      potencia_q_per_kwh: t.rates.potencia_Q_per_kWh,
      contrib_percent: t.rates.contrib_percent,
      iva_percent: t.rates.iva_percent,
      notes: t.rates.notes,
      deleted_at: null // No upsert deleted
    }))

    const { result, duration } = await measureTime(async () => {
      return await supabase
        .from('tariffs')
        .upsert(upsertData, { onConflict: 'id' })
    })

    const { error } = result
    supabaseLogger.logUpsert('tariffs', upsertData, 'id', null, error, duration)

    if (error) {
      console.error('Error upserting tariffs to Supabase:', error)
    }

    console.log(`Sincronización de tariffs completada: ${mergedData.length} tariffs totales`)
  } catch (err) {
    console.error('Error en syncTariffsFromSupabase:', err)
  }
}

// Función para obtener el conteo de readings
export async function getReadingsCount(): Promise<number> {
  try {
    const { result, duration } = await measureTime(async () => {
      return await supabase
        .from('readings')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
    })

    const { count, error } = result
    supabaseLogger.logSelect('readings', '*', { deleted_at: 'null', count: 'exact', head: true }, { count }, error, duration)

    if (error) {
      console.error('Error fetching readings count:', error)
      return 0
    }

    return count || 0
  } catch (err) {
    console.error('Error in getReadingsCount:', err)
    return 0
  }
}

// Función para soft delete una reading
export async function softDeleteReading(meterId: string, date: string): Promise<void> {
  try {
    const deletedAt = new Date().toISOString()
    console.log(`Soft deleting reading: ${meterId} ${date} at ${deletedAt}`)

    const { result, duration } = await measureTime(async () => {
      return await supabase
        .from('readings')
        .update({ deleted_at: deletedAt })
        .eq('meter_id', meterId)
        .eq('date', date)
    })

    const { error } = result
    supabaseLogger.logUpdate('readings', { deleted_at: deletedAt }, { meter_id: meterId, date }, null, error, duration)

    if (error) {
      console.error('Error soft deleting reading in Supabase:', error)
      throw error
    }

    // Actualizar en localStorage
    const { loadReadings, saveReadings } = await import('./storage')
    const localData = loadReadings(meterId)
    const updatedLocal = localData.filter((r: any) => r.date.split('T')[0] !== date)
    saveReadings(updatedLocal, meterId)
    console.log('LocalStorage updated for reading')
  } catch (err) {
    console.error('Error in softDeleteReading:', err)
    throw err
  }
}

// Función para obtener la lista de readings
export async function getReadingsList(): Promise<{ meter_id: string; date: string; consumption: number; production: number; credit: number }[]> {
  try {
    const { result, duration } = await measureTime(async () => {
      return await supabase
        .from('readings')
        .select('meter_id, date, consumption, production, credit')
        .is('deleted_at', null)
    })

    const { data, error } = result
    supabaseLogger.logSelect('readings', 'meter_id, date, consumption, production, credit', { deleted_at: 'null' }, data, error, duration)

    if (error) {
      console.error('Error fetching readings list:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error in getReadingsList:', err)
    return []
  }
}

// Función para sincronizar readings: merge de Supabase y localStorage
export async function syncReadingsFromSupabase(): Promise<void> {
  try {
    // Obtener datos de Supabase (solo no deleted)
    const supabaseData = await getReadingsList()

    // Obtener datos de localStorage
    const { loadReadings, saveReadings, loadCurrentMeterId } = await import('./storage')
    const currentMeterId = loadCurrentMeterId()
    const localData = loadReadings(currentMeterId)

    // Crear un mapa único basado en (meter_id, date)
    const mergedMap = new Map<string, any>()

    // Agregar de localStorage
    localData.forEach((r: any) => {
      const key = `${r.meter_id || currentMeterId}|${r.date.split('T')[0]}`
      mergedMap.set(key, r)
    })

    // Agregar/sobrescribir de Supabase
    supabaseData.forEach((r: any) => {
      const key = `${r.meter_id}|${r.date}`
      mergedMap.set(key, r)
    })

    // Convertir a array y guardar en localStorage (solo para current meter)
    const mergedData = Array.from(mergedMap.values()).filter(r => (r.meter_id || currentMeterId) === currentMeterId)
    saveReadings(mergedData, currentMeterId)

    // Guardar en Supabase (upsert)
    const upsertData = mergedData.map(r => ({
      meter_id: r.meter_id || currentMeterId,
      date: r.date.split('T')[0],
      consumption: r.consumption,
      production: r.production,
      credit: r.credit,
      deleted_at: null
    }))

    const { result, duration } = await measureTime(async () => {
      return await supabase
        .from('readings')
        .upsert(upsertData, { onConflict: 'meter_id, date' })
    })

    const { error } = result
    supabaseLogger.logUpsert('readings', upsertData, 'meter_id, date', null, error, duration)

    if (error) {
      console.error('Error upserting readings to Supabase:', error)
    }

    console.log(`Sincronización de readings completada: ${mergedData.length} readings totales para ${currentMeterId}`)
  } catch (err) {
    console.error('Error en syncReadingsFromSupabase:', err)
  }
}