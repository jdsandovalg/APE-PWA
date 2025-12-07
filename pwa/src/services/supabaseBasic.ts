import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ==========================================
// FUNCIONES BÁSICAS DE COMPANIES (SOLO ONLINE)
// ==========================================

export interface CompanyRecord {
  id: string
  code: string
  name: string
  deleted_at?: string
}

// Obtener todas las compañías (no deleted)
export async function getAllCompanies(): Promise<CompanyRecord[]> {
  console.log('🔍 Getting all companies from Supabase...')

  const { data, error } = await supabase
    .from('companies')
    .select('id, code, name, deleted_at')
    .is('deleted_at', null)
    .order('name')

  if (error) {
    console.error('❌ Error getting companies:', error)
    throw error
  }

  console.log(`✅ Got ${data?.length || 0} companies`)
  return data || []
}

// Obtener una compañía por ID y código
export async function getCompanyById(id: string, code: string): Promise<CompanyRecord | null> {
  console.log(`🔍 Getting company ${id}/${code}...`)

  const { data, error } = await supabase
    .from('companies')
    .select('id, code, name, deleted_at')
    .eq('id', id)
    .eq('code', code)
    .is('deleted_at', null)
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      console.log(`ℹ️ Company ${id}/${code} not found`)
      return null
    }
    console.error('❌ Error getting company:', error)
    throw error
  }

  console.log(`✅ Got company: ${data.name}`)
  return data
}

// Crear una nueva compañía
export async function createCompany(company: Omit<CompanyRecord, 'deleted_at'>): Promise<CompanyRecord> {
  console.log(`➕ Creating company: ${company.id}/${company.code} - ${company.name}`)

  const { data, error } = await supabase
    .from('companies')
    .insert(company)
    .select()
    .single()

  if (error) {
    console.error('❌ Error creating company:', error)
    throw error
  }

  console.log(`✅ Company created successfully`)
  return data
}

// Actualizar una compañía existente
export async function updateCompany(id: string, code: string, updates: Partial<Pick<CompanyRecord, 'name'>>): Promise<CompanyRecord> {
  console.log(`📝 Updating company ${id}/${code}...`)

  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', id)
    .eq('code', code)
    .select()
    .single()

  if (error) {
    console.error('❌ Error updating company:', error)
    throw error
  }

  console.log(`✅ Company updated successfully`)
  return data
}

// Soft delete una compañía
export async function deleteCompany(id: string, code: string): Promise<void> {
  console.log(`🗑️ Soft deleting company ${id}/${code}...`)

  const { error } = await supabase
    .from('companies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('code', code)

  if (error) {
    console.error('❌ Error deleting company:', error)
    throw error
  }

  console.log(`✅ Company soft deleted successfully`)
}

// ==========================================
// FUNCIONES BÁSICAS DE TARIFFS (SOLO ONLINE)
// ==========================================

export interface TariffRecord {
  id: string
  company: string
  company_code: string  // NOT NULL según la definición de tabla
  segment: string
  period_from: string  // date type
  period_to: string    // date type
  effective_at?: string  // date type
  currency?: string
  source_pdf?: string
  fixed_charge_q: number
  energy_q_per_kwh: number
  distribution_q_per_kwh: number
  potencia_q_per_kwh: number
  contrib_percent: number
  iva_percent: number
  notes?: string
  deleted_at?: string
  created_at?: string
  updated_at?: string
  last_synced_at?: string
}

// Obtener todas las tarifas (no deleted)
export async function getAllTariffs(): Promise<TariffRecord[]> {
  console.log('🔍 Getting all tariffs from Supabase...')

  const { data, error } = await supabase
    .from('tariffs')
    .select('id, company, company_code, segment, period_from, period_to, effective_at, currency, source_pdf, fixed_charge_q, energy_q_per_kwh, distribution_q_per_kwh, potencia_q_per_kwh, contrib_percent, iva_percent, notes, deleted_at, created_at, updated_at, last_synced_at')
    .is('deleted_at', null)
    .order('period_from', { ascending: false })

  if (error) {
    console.error('❌ Error getting tariffs:', error)
    throw error
  }

  console.log(`✅ Got ${data?.length || 0} tariffs`)
  return data || []
}

// Obtener una tarifa por ID
export async function getTariffById(id: string): Promise<TariffRecord | null> {
  console.log(`🔍 Getting tariff ${id}...`)

  const { data, error } = await supabase
    .from('tariffs')
    .select('id, company, company_code, segment, period_from, period_to, effective_at, currency, source_pdf, fixed_charge_q, energy_q_per_kwh, distribution_q_per_kwh, potencia_q_per_kwh, contrib_percent, iva_percent, notes, deleted_at, created_at, updated_at, last_synced_at')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      console.log(`ℹ️ Tariff ${id} not found`)
      return null
    }
    console.error('❌ Error getting tariff:', error)
    throw error
  }

  console.log(`✅ Got tariff: ${data.id}`)
  return data
}

// Crear una nueva tarifa
export async function createTariff(tariff: Omit<TariffRecord, 'deleted_at' | 'created_at' | 'updated_at' | 'last_synced_at'>): Promise<TariffRecord> {
  console.log(`➕ Creating tariff: ${tariff.id} - ${tariff.company}/${tariff.segment}`)

  // Validar que company_code esté presente
  if (!tariff.company_code) {
    throw new Error('company_code is required for tariff creation')
  }

  const { data, error } = await supabase
    .from('tariffs')
    .insert(tariff)
    .select()
    .single()

  if (error) {
    console.error('❌ Error creating tariff:', error)
    throw error
  }

  console.log(`✅ Tariff created successfully`)
  return data
}

// Actualizar una tarifa existente
export async function updateTariff(id: string, updates: Partial<Omit<TariffRecord, 'id' | 'deleted_at' | 'created_at' | 'updated_at' | 'last_synced_at'>>): Promise<TariffRecord> {
  console.log(`📝 Updating tariff ${id}...`)

  // Validar que si se actualiza company_code, no sea vacío
  if (updates.company_code !== undefined && !updates.company_code) {
    throw new Error('company_code cannot be empty when updating')
  }

  const { data, error } = await supabase
    .from('tariffs')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('❌ Error updating tariff:', error)
    throw error
  }

  console.log(`✅ Tariff updated successfully`)
  return data
}

// Soft delete una tarifa
export async function deleteTariff(id: string): Promise<void> {
  console.log(`🗑️ Soft deleting tariff ${id}...`)

  const deletedAt = new Date().toISOString()
  console.log(`📅 Usando timestamp: ${deletedAt}`)

  const { data, error } = await supabase
    .from('tariffs')
    .update({ deleted_at: deletedAt })
    .eq('id', id)
    .select('id, deleted_at')

  if (error) {
    console.error('❌ Error deleting tariff:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details
    })
    throw error
  }

  console.log('✅ Update result:', data)

  if (!data || data.length === 0) {
    throw new Error(`No se pudo eliminar la tariff ${id} - no se encontró o no se actualizó`)
  }

  console.log(`✅ Tariff soft deleted successfully: ${data[0].id} at ${data[0].deleted_at}`)
}

// ==========================================
// FUNCIONES DE TESTING Y UTILIDADES
// ==========================================

// Probar conexión básica a Supabase
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing Supabase connection...')

    // Intentar una consulta simple
    const { data, error } = await supabase
      .from('companies')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Connection test failed:', error)
      return false
    }

    console.log('✅ Supabase connection successful')
    return true
  } catch (err) {
    console.error('❌ Connection test error:', err)
    return false
  }
}

export interface MeterRecord {
  id: string
  contador: string
  correlativo: string
  propietaria: string
  nit: string
  distribuidora: string
  tipo_servicio: string
  sistema: string
  kwp?: number
  installation_date?: string
  deleted_at?: string
  created_at?: string
  updated_at?: string
}

// Obtener todos los medidores (no deleted)
export async function getAllMeters(): Promise<MeterRecord[]> {
  console.log('🔍 Getting all meters from Supabase...')

  const { data, error } = await supabase
    .from('meters')
    .select('id, contador, correlativo, propietaria, nit, distribuidora, tipo_servicio, sistema, kwp, installation_date, deleted_at, created_at, updated_at')
    .is('deleted_at', null)
    .order('contador')

  if (error) {
    console.error('❌ Error getting meters:', error)
    throw error
  }

  console.log(`✅ Got ${data?.length || 0} meters`)
  return data || []
}

// Obtener un medidor por ID
export async function getMeterById(id: string): Promise<MeterRecord | null> {
  console.log(`🔍 Getting meter ${id}...`)

  const { data, error } = await supabase
    .from('meters')
    .select('id, contador, correlativo, propietaria, nit, distribuidora, tipo_servicio, sistema, kwp, installation_date, deleted_at, created_at, updated_at')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      console.log(`ℹ️ Meter ${id} not found`)
      return null
    }
    console.error('❌ Error getting meter:', error)
    throw error
  }

  console.log(`✅ Got meter: ${data.contador}`)
  return data
}

// Obtener medidor por contador
export async function getMeterByContador(contador: string): Promise<MeterRecord | null> {
  console.log(`🔍 Getting meter by contador ${contador}...`)

  const { data, error } = await supabase
    .from('meters')
    .select('id, contador, correlativo, propietaria, nit, distribuidora, tipo_servicio, sistema, deleted_at, created_at, updated_at')
    .eq('contador', contador)
    .is('deleted_at', null)
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      console.log(`ℹ️ Meter with contador ${contador} not found`)
      return null
    }
    console.error('❌ Error getting meter by contador:', error)
    throw error
  }

  console.log(`✅ Got meter: ${data.contador}`)
  return data
}

// Crear un nuevo medidor
export async function createMeter(meter: Omit<MeterRecord, 'id' | 'deleted_at' | 'created_at' | 'updated_at'>): Promise<MeterRecord> {
  console.log(`➕ Creating meter: ${meter.contador} - ${meter.propietaria}`)

  const { data, error } = await supabase
    .from('meters')
    .insert(meter)
    .select()
    .single()

  if (error) {
    console.error('❌ Error creating meter:', error)
    throw error
  }

  console.log(`✅ Meter created successfully`)
  return data
}

// Actualizar un medidor existente
export async function updateMeter(id: string, updates: Partial<Omit<MeterRecord, 'id' | 'deleted_at' | 'created_at' | 'updated_at'>>): Promise<MeterRecord> {
  console.log(`📝 Updating meter ${id}...`)

  const { data, error } = await supabase
    .from('meters')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('❌ Error updating meter:', error)
    throw error
  }

  console.log(`✅ Meter updated successfully`)
  return data
}

// Soft delete un medidor
export async function deleteMeter(id: string): Promise<void> {
  console.log(`🗑️ Soft deleting meter ${id}...`)

  const deletedAt = new Date().toISOString()
  console.log(`📅 Usando timestamp: ${deletedAt}`)

  const { data, error } = await supabase
    .from('meters')
    .update({ deleted_at: deletedAt })
    .eq('id', id)
    .select('id, deleted_at')

  if (error) {
    console.error('❌ Error deleting meter:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details
    })
    throw error
  }

  console.log('✅ Update result:', data)

  if (!data || data.length === 0) {
    throw new Error(`No se pudo eliminar el meter ${id} - no se encontró o no se actualizó`)
  }

  console.log(`✅ Meter soft deleted successfully: ${data[0].id} at ${data[0].deleted_at}`)
}

// Obtener información de la tabla companies
export async function getCompaniesTableInfo(): Promise<any> {
  try {
    console.log('📊 Getting companies table info...')

    // Intentar una consulta básica para ver qué devuelve
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Error getting table info:', error)
      return { error: error.message, code: error.code, details: error.details }
    }

    console.log('✅ Table info retrieved')
    return {
      success: true,
      rowCount: data?.length || 0,
      sampleRow: data?.[0] || null
    }
  } catch (err) {
    console.error('❌ Table info error:', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

// Limpiar todas las compañías (solo para testing)
export async function clearAllCompanies(): Promise<void> {
  console.log('🧹 Clearing all companies (use with caution!)...')

  const { error } = await supabase
    .from('companies')
    .delete()
    .neq('id', '') // Delete all rows

  if (error) {
    console.error('❌ Error clearing companies:', error)
    throw error
  }

  console.log('✅ All companies cleared')
}