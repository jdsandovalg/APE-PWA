// ==========================================
// FUNCIONES PURAS DE SUPABASE - SIN LOCALSTORAGE
// ==========================================

import { supabase } from './supabase'
import { supabaseLogger, measureTime } from './supabaseLogger'

// ==========================================
// COMPANIES - FUNCIONES CRUD PURAS
// ==========================================

export interface CompanyRecord {
  id: string
  code: string
  name: string
  deleted_at?: string
  created_at?: string
  updated_at?: string
}

// Obtener todas las compañías (no deleted)
export async function getAllCompanies(): Promise<CompanyRecord[]> {
  console.log('🔍 Getting all companies from Supabase...')

  const { result, duration } = await measureTime(async () => {
    return await supabase
      .from('companies')
      .select('id, code, name, deleted_at, created_at, updated_at')
      .is('deleted_at', null)
      .order('name')
  })

  const { data, error } = result
  supabaseLogger.logSelect('companies', 'id, code, name, deleted_at, created_at, updated_at', { deleted_at: 'null' }, data, error, duration)

  if (error) {
    console.error('❌ Error getting companies:', error)
    throw error
  }

  console.log(`✅ Got ${data?.length || 0} companies`)
  return data || []
}

// Obtener compañía por ID
export async function getCompanyById(id: string): Promise<CompanyRecord | null> {
  console.log(`🔍 Getting company ${id}...`)

  const { result, duration } = await measureTime(async () => {
    return await supabase
      .from('companies')
      .select('id, code, name, deleted_at, created_at, updated_at')
      .eq('id', id)
      .is('deleted_at', null)
      .single()
  })

  const { data, error } = result
  supabaseLogger.logSelect('companies', 'id, code, name, deleted_at, created_at, updated_at', { id, deleted_at: 'null' }, data, error, duration)

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      console.log(`ℹ️ Company ${id} not found`)
      return null
    }
    console.error('❌ Error getting company:', error)
    throw error
  }

  console.log(`✅ Got company: ${data.name}`)
  return data
}

// Crear compañía
export async function createCompany(company: Omit<CompanyRecord, 'deleted_at' | 'created_at' | 'updated_at'>): Promise<CompanyRecord> {
  console.log(`➕ Creating company: ${company.id} - ${company.name}`)

  const { result, duration } = await measureTime(async () => {
    return await supabase
      .from('companies')
      .insert(company)
      .select()
      .single()
  })

  const { data, error } = result
  supabaseLogger.logInsert('companies', company, data, error, duration)

  if (error) {
    console.error('❌ Error creating company:', error)
    throw error
  }

  console.log(`✅ Company created successfully`)
  return data
}

// Actualizar compañía
export async function updateCompany(id: string, code: string, updates: Partial<Pick<CompanyRecord, 'name'>>): Promise<CompanyRecord> {
  console.log(`📝 Updating company ${id}...`)

  const { result, duration } = await measureTime(async () => {
    return await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .eq('code', code)
      .select()
      .single()
  })

  const { data, error } = result
  supabaseLogger.logUpdate('companies', updates, { id, code }, data, error, duration)

  if (error) {
    console.error('❌ Error updating company:', error)
    throw error
  }

  console.log(`✅ Company updated successfully`)
  return data
}

// Soft delete compañía
export async function deleteCompany(id: string, code: string): Promise<void> {
  console.log(`🗑️ Soft deleting company ${id}...`)

  const deletedAt = new Date().toISOString()
  console.log(`📅 Usando timestamp: ${deletedAt}`)

  const { result, duration } = await measureTime(async () => {
    return await supabase
      .from('companies')
      .update({ deleted_at: deletedAt })
      .eq('id', id)
      .eq('code', code)
      .select('id, deleted_at')
  })

  const { data, error } = result
  supabaseLogger.logUpdate('companies', { deleted_at: deletedAt }, { id, code }, data, error, duration)

  if (error) {
    console.error('❌ Error deleting company:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details
    })
    throw error
  }

  console.log('✅ Update result:', data)

  if (!data || data.length === 0) {
    throw new Error(`No se pudo eliminar la compañía ${id} - no se encontró o no se actualizó`)
  }

  console.log(`✅ Company soft deleted successfully: ${data[0].id} at ${data[0].deleted_at}`)
}

// ==========================================
// TARIFFS - FUNCIONES CRUD PURAS
// ==========================================

export interface TariffRecord {
  id: string
  company: string
  company_code: string
  segment: string
  period_from: string
  period_to: string
  effective_at?: string
  currency?: string
  source_pdf?: string
  fixed_charge_q: number
  energy_q_per_kwh: number
  distribution_q_per_kwh: number
  potencia_q_per_kWh: number
  contrib_percent: number
  iva_percent: number
  notes?: string
  deleted_at?: string
  created_at?: string
  updated_at?: string
}

// Convertir de formato Supabase a formato TariffSet (legacy)
export function convertToTariffSet(record: TariffRecord): any {
  return {
    header: {
      id: record.id,
      company: record.company,
      companyCode: record.company_code,
      segment: record.segment,
      period: { from: record.period_from, to: record.period_to },
      effectiveAt: record.effective_at,
      currency: record.currency,
      sourcePdf: record.source_pdf
    },
    rates: {
      fixedCharge_Q: record.fixed_charge_q,
      energy_Q_per_kWh: record.energy_q_per_kwh,
      distribution_Q_per_kWh: record.distribution_q_per_kwh,
      potencia_Q_per_kWh: record.potencia_q_per_kwh,
      contrib_percent: record.contrib_percent,
      iva_percent: record.iva_percent,
      notes: record.notes
    }
  }
}

// Convertir de formato TariffSet a formato Supabase
export function convertFromTariffSet(tariffSet: any): Omit<TariffRecord, 'deleted_at' | 'created_at' | 'updated_at'> {
  return {
    id: tariffSet.header.id,
    company: tariffSet.header.company,
    company_code: tariffSet.header.companyCode,
    segment: tariffSet.header.segment,
    period_from: tariffSet.header.period.from,
    period_to: tariffSet.header.period.to,
    effective_at: tariffSet.header.effectiveAt,
    currency: tariffSet.header.currency,
    source_pdf: tariffSet.header.sourcePdf,
    fixed_charge_q: tariffSet.rates.fixedCharge_Q,
    energy_q_per_kwh: tariffSet.rates.energy_Q_per_kWh,
    distribution_q_per_kwh: tariffSet.rates.distribution_Q_per_kWh,
    potencia_q_per_kwh: tariffSet.rates.potencia_Q_per_kWh,
    contrib_percent: tariffSet.rates.contrib_percent,
    iva_percent: tariffSet.rates.iva_percent,
    notes: tariffSet.rates.notes
  }
}

// Obtener todas las tarifas (no deleted)
export async function getAllTariffs(): Promise<any[]> {
  console.log('🔍 Getting all tariffs from Supabase...')

  const { result, duration } = await measureTime(async () => {
    return await supabase
      .from('tariffs')
      .select('id, company, company_code, segment, period_from, period_to, effective_at, currency, source_pdf, fixed_charge_q, energy_q_per_kwh, distribution_q_per_kwh, potencia_q_per_kwh, contrib_percent, iva_percent, notes, deleted_at, created_at, updated_at')
      .is('deleted_at', null)
      .order('period_from', { ascending: false })
  })

  const { data, error } = result
  supabaseLogger.logSelect('tariffs', '*', { deleted_at: 'null' }, data, error, duration)

  if (error) {
    console.error('❌ Error getting tariffs:', error)
    throw error
  }

  // Convertir a formato TariffSet
  const tariffSets = (data || []).map(convertToTariffSet)

  console.log(`✅ Got ${tariffSets.length} tariffs`)
  return tariffSets
}

// Obtener tarifa por ID
export async function getTariffById(id: string): Promise<any | null> {
  console.log(`🔍 Getting tariff ${id}...`)

  const { result, duration } = await measureTime(async () => {
    return await supabase
      .from('tariffs')
      .select('id, company, company_code, segment, period_from, period_to, effective_at, currency, source_pdf, fixed_charge_q, energy_q_per_kwh, distribution_q_per_kwh, potencia_q_per_kwh, contrib_percent, iva_percent, notes, deleted_at, created_at, updated_at')
      .eq('id', id)
      .is('deleted_at', null)
      .single()
  })

  const { data, error } = result
  supabaseLogger.logSelect('tariffs', '*', { id, deleted_at: 'null' }, data, error, duration)

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      console.log(`ℹ️ Tariff ${id} not found`)
      return null
    }
    console.error('❌ Error getting tariff:', error)
    throw error
  }

  const tariffSet = convertToTariffSet(data)
  console.log(`✅ Got tariff: ${tariffSet.header.id}`)
  return tariffSet
}

// Crear tarifa
export async function createTariff(tariffSet: any): Promise<any> {
  console.log(`➕ Creating tariff: ${tariffSet.header.id}`)

  const tariffRecord = convertFromTariffSet(tariffSet)

  const { result, duration } = await measureTime(async () => {
    return await supabase
      .from('tariffs')
      .insert(tariffRecord)
      .select()
      .single()
  })

  const { data, error } = result
  supabaseLogger.logInsert('tariffs', tariffRecord, data, error, duration)

  if (error) {
    console.error('❌ Error creating tariff:', error)
    throw error
  }

  const createdTariffSet = convertToTariffSet(data)
  console.log(`✅ Tariff created successfully`)
  return createdTariffSet
}

// Actualizar tarifa
export async function updateTariff(id: string, tariffSet: any): Promise<any> {
  console.log(`📝 Updating tariff ${id}...`)

  const updates = convertFromTariffSet(tariffSet)

  const { result, duration } = await measureTime(async () => {
    return await supabase
      .from('tariffs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
  })

  const { data, error } = result
  supabaseLogger.logUpdate('tariffs', updates, { id }, data, error, duration)

  if (error) {
    console.error('❌ Error updating tariff:', error)
    throw error
  }

  const updatedTariffSet = convertToTariffSet(data)
  console.log(`✅ Tariff updated successfully`)
  return updatedTariffSet
}

// Soft delete tarifa
export async function deleteTariff(id: string): Promise<void> {
  console.log(`🗑️ Soft deleting tariff ${id}...`)

  const deletedAt = new Date().toISOString()

  const { result, duration } = await measureTime(async () => {
    return await supabase
      .from('tariffs')
      .update({ deleted_at: deletedAt })
      .eq('id', id)
      .select('id, deleted_at')
  })

  const { data, error } = result
  supabaseLogger.logUpdate('tariffs', { deleted_at: deletedAt }, { id }, data, error, duration)

  if (error) {
    console.error('❌ Error deleting tariff:', error)
    throw error
  }

  console.log(`✅ Tariff soft deleted successfully`)
}

// ==========================================
// READINGS - FUNCIONES CRUD PURAS
// ==========================================

export interface ReadingRecord {
  meter_id: string
  date: string
  consumption: number
  production: number
  credit: number
  deleted_at?: string
  created_at?: string
  updated_at?: string
}

// Obtener readings para un medidor específico (opcional: si no se pasa meterId, obtiene todas)
export async function getReadings(meterId?: string): Promise<any[]> {
  console.log(`🔍 Getting readings${meterId ? ` for meter ${meterId}` : ' for all meters'}...`)

  const { result, duration } = await measureTime(async () => {
    let query = supabase
      .from('readings')
      .select('meter_id, date, consumption, production, credit, deleted_at, created_at, updated_at')
      .is('deleted_at', null)
      .order('date', { ascending: false })

    if (meterId) {
      query = query.eq('meter_id', meterId)
    }

    return query
  })

  const { data, error } = result
  supabaseLogger.logSelect('readings', 'meter_id, date, consumption, production, credit, deleted_at, created_at, updated_at', meterId ? { meter_id: meterId, deleted_at: 'null' } : { deleted_at: 'null' }, data, error, duration)

  if (error) {
    console.error('❌ Error getting readings:', error)
    throw error
  }

  // Convertir formato para compatibilidad con código existente
  const readings = (data || []).map(r => ({
    meter_id: r.meter_id,
    date: r.date,
    consumption: r.consumption,
    production: r.production,
    credit: r.credit
  }))

  console.log(`✅ Got ${readings.length} readings${meterId ? ` for meter ${meterId}` : ' for all meters'}`)
  return readings
}

// Guardar readings para un medidor (upsert)
export async function saveReadings(meterId: string, readings: any[]): Promise<void> {
  console.log(`💾 Saving ${readings.length} readings for meter ${meterId}...`)

  // Preparar datos para upsert
  const upsertData = readings.map(r => ({
    meter_id: meterId,
    date: r.date.split('T')[0], // Asegurar formato YYYY-MM-DD
    consumption: r.consumption,
    production: r.production,
    credit: r.credit || 0,
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
    console.error('❌ Error saving readings:', error)
    throw error
  }

  console.log(`✅ Readings saved successfully for meter ${meterId}`)
}

// Crear una sola reading
export async function createReading(meterId: string, reading: any): Promise<void> {
  console.log(`➕ Creating reading for meter ${meterId} on ${reading.date}...`)

  const readingRecord = {
    meter_id: meterId,
    date: reading.date.split('T')[0],
    consumption: reading.consumption,
    production: reading.production,
    credit: reading.credit || 0
  }

  const { result, duration } = await measureTime(async () => {
    return await supabase
      .from('readings')
      .insert(readingRecord)
      .select()
      .single()
  })

  const { data, error } = result
  supabaseLogger.logInsert('readings', readingRecord, data, error, duration)

  if (error) {
    console.error('❌ Error creating reading:', error)
    throw error
  }

  console.log(`✅ Reading created successfully`)
}

// Soft delete reading
export async function deleteReading(meterId: string, date: string): Promise<void> {
  console.log(`🗑️ Soft deleting reading ${meterId} ${date}...`)

  const deletedAt = new Date().toISOString()

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
    console.error('❌ Error deleting reading:', error)
    throw error
  }

  console.log(`✅ Reading soft deleted successfully`)
}

// ==========================================
// UTILIDADES PARA COMPATIBILIDAD
// ==========================================

// Utilities for quarters
function quarterFromDate(dateStr: string){
  const d = new Date(dateStr)
  const month = d.getMonth() // 0-11
  const quarter = Math.floor(month/3) + 1
  const year = d.getFullYear()
  const from = new Date(year, (quarter-1)*3, 1)
  const to = new Date(year, quarter*3, 0)
  return { year, quarter, from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] }
}

function quarterBefore(year:number, quarter:number, steps:number){
  let q = quarter - steps
  let y = year
  while(q <= 0){ q += 4; y -= 1 }
  const from = new Date(y, (q-1)*3, 1)
  const to = new Date(y, q*3, 0)
  return { year: y, quarter: q, from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] }
}

// Create previous N quarters by copying an existing tariff (KIS): copy rates and create new TariffSet with adjusted period
export async function createPreviousQuartersFromActive(count: number, company?: string, segment?: string){
  const today = new Date().toISOString()
  const active = await findActiveTariffForDate(today, company, segment)
  if (!active) return { created: 0, message: 'No hay tarifa activa para copiar' }
  const created: any[] = []
  const all = await getAllTariffs()
  // determine source header info
  const srcHeader = active.header
  const srcRates = active.rates
  // determine quarter of the active tariff (use header.period.from)
  const qinfo = quarterFromDate(srcHeader.period.from || today)
  for (let i=1;i<=count;i++){
    const target = quarterBefore(qinfo.year, qinfo.quarter, i)
    // check existence
    const exists = all.some(t=> t.header.period.from === target.from && t.header.company === srcHeader.company && t.header.segment === srcHeader.segment)
    if (exists) continue
    const id = `${srcHeader.company}-${srcHeader.segment}-${target.year}Q${target.quarter}`
    const newTariff: any = {
      header: {
        id,
        company: srcHeader.company,
        companyCode: srcHeader.companyCode,
        segment: srcHeader.segment,
        period: { from: target.from, to: target.to },
        effectiveAt: target.from,
        currency: srcHeader.currency || 'GTQ',
        sourcePdf: 'auto-copied-backward'
      },
      rates: { ...srcRates, notes: `Auto-copied from ${srcHeader.id} for ${target.year}Q${target.quarter}` }
    }
    try {
      await createTariff(newTariff)
      created.push(newTariff)
    } catch (error) {
      console.error('Error creating tariff:', error)
    }
  }
  return { created: created.length, items: created }
}

// Encontrar tarifa activa para una fecha (reemplaza findActiveTariffForDate)
export async function findActiveTariffForDate(dateStr: string, company?: string, segment?: string): Promise<any | null> {
  const d = new Date(dateStr)
  const allTariffs = await getAllTariffs()

  for (const t of allTariffs) {
    if (company && t.header.company !== company) continue
    if (segment && t.header.segment !== segment) continue
    const from = t.header.period.from ? new Date(t.header.period.from) : null
    const to = t.header.period.to ? new Date(t.header.period.to) : null
    if (from && to) {
      if (d >= from && d <= to) return t
    }
  }
  return null
}

// Calcular deltas (reemplaza computeDeltas)
export function computeDeltas(readings: any[]): any[] {
  if (!readings || readings.length === 0) return []

  // Clonar y ordenar por fecha ascendente
  const items = [...readings].map(r => ({ ...r, date: new Date(r.date).toISOString() }))
  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const out: any[] = []
  for (let i = 0; i < items.length; i++) {
    const curr = items[i]
    if (i === 0) {
      // Primera entrada: mantener como está o setear a 0
      out.push({ ...curr, consumption: 0, production: 0 })
    } else {
      const prev = items[i - 1]
      const c = Number(curr.consumption) - Number(prev.consumption)
      const p = Number(curr.production) - Number(prev.production)
      out.push({ ...curr, consumption: isNaN(c) ? 0 : c, production: isNaN(p) ? 0 : p })
    }
  }
  return out
}