import { supabase } from './supabaseBasic'

// ==========================================
// INTERFACES PARA EQUIPMENT
// ==========================================

export interface EquipmentType {
  id: string
  code: string
  name: string
  load_category: string
  description?: string | null
}

export interface MeterEquipment {
  id: string
  meter_id: string
  equipment_type_id: string
  equipment_name: string
  power_watts: number
  estimated_daily_hours: number
  energy_kwh_month: number // This is a generated column
  start_date: string // date
  end_date?: string | null // date
  is_future: boolean
  notes?: string | null
  created_at: string // timestamptz
  updated_at: string // timestamptz
}

// Type for the grouped response
export type GroupedEquipmentTypes = Record<string, EquipmentType[]>

// ==========================================
// FUNCIONES PARA EQUIPMENT TYPES
// ==========================================

/**
 * Obtiene todos los tipos de equipos, opcionalmente agrupados por categoría.
 */
export async function getEquipmentTypes(grouped = false): Promise<EquipmentType[] | GroupedEquipmentTypes> {
  console.log('🔍 Getting all equipment types from Supabase...')

  const { data, error } = await supabase
    .from('equipment_types')
    .select('id, code, name, load_category, description')
    .order('name')

  if (error) {
    console.error('❌ Error getting equipment types:', error)
    throw error
  }

  console.log(`✅ Got ${data?.length || 0} equipment types`)

  if (grouped) {
    const groupedData: GroupedEquipmentTypes = {}
    ;(data || []).forEach(item => {
      if (!groupedData[item.load_category]) {
        groupedData[item.load_category] = []
      }
      groupedData[item.load_category].push(item)
    })
    console.log('✅ Equipment types grouped by category')
    return groupedData
  }

  return data || []
}

/**
 * Crea un nuevo tipo de equipo en el catálogo.
 */
export async function createEquipmentType(
  item: Omit<EquipmentType, 'id'>
): Promise<EquipmentType> {
  console.log(`➕ Creating equipment type: ${item.name}`)
  const { data, error } = await supabase
    .from('equipment_types')
    .insert(item)
    .select()
    .single()

  if (error) {
    console.error('❌ Error creating equipment type:', error)
    throw error
  }
  return data
}

/**
 * Actualiza un tipo de equipo existente.
 */
export async function updateEquipmentType(
  id: string,
  updates: Partial<Omit<EquipmentType, 'id'>>
): Promise<EquipmentType> {
  console.log(`📝 Updating equipment type ${id}...`)

  const { data, error } = await supabase
    .from('equipment_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('❌ Error updating equipment type:', error)
    throw error
  }

  console.log(`✅ Equipment type updated successfully`)
  return data
}

/**
 * Elimina un tipo de equipo.
 */
export async function deleteEquipmentType(id: string): Promise<void> {
  console.log(`🗑️ Deleting equipment type ${id}...`)

  const { error } = await supabase.from('equipment_types').delete().eq('id', id)

  if (error) {
    // Check for foreign key violation (type is in use)
    if (error.code === '23503') {
      throw new Error('No se puede eliminar: el tipo de equipo está en uso.')
    }
    console.error('❌ Error deleting equipment type:', error)
    throw error
  }
  console.log(`✅ Equipment type deleted successfully`)
}

// ==========================================
// FUNCIONES PARA METER EQUIPMENT
// ==========================================

/**
 * Obtiene todos los equipos asociados a un medidor.
 */
export async function getEquipmentForMeter(meterId: string): Promise<MeterEquipment[]> {
  console.log(`🔍 Getting equipment for meter ${meterId}...`)

  const { data, error } = await supabase
    .from('meter_equipment')
    .select('*') // Select all columns
    .eq('meter_id', meterId)
    .order('start_date', { ascending: false })

  if (error) {
    console.error(`❌ Error getting equipment for meter ${meterId}:`, error)
    throw error
  }

  console.log(`✅ Got ${data?.length || 0} equipment items for meter ${meterId}`)
  return data || []
}

/**
 * Crea un nuevo equipo para un medidor.
 * La columna `energy_kwh_month` es generada en la DB, por lo que no se incluye.
 */
export async function createMeterEquipment(
  equipment: Omit<MeterEquipment, 'id' | 'created_at' | 'updated_at' | 'energy_kwh_month'>
): Promise<MeterEquipment> {
  console.log(`➕ Creating equipment: ${equipment.equipment_name} for meter ${equipment.meter_id}`)

  const { data, error } = await supabase
    .from('meter_equipment')
    .insert(equipment)
    .select()
    .single()

  if (error) {
    console.error('❌ Error creating meter equipment:', error)
    throw error
  }

  console.log(`✅ Meter equipment created successfully`)
  return data
}

/**
 * Actualiza un equipo existente.
 */
export async function updateMeterEquipment(
  id: string,
  updates: Partial<Omit<MeterEquipment, 'id' | 'created_at' | 'updated_at' | 'energy_kwh_month'>>
): Promise<MeterEquipment> {
  console.log(`📝 Updating equipment ${id}...`)

  const { data, error } = await supabase
    .from('meter_equipment')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('❌ Error updating meter equipment:', error)
    throw error
  }

  console.log(`✅ Meter equipment updated successfully`)
  return data
}

/**
 * Elimina un equipo.
 */
export async function deleteMeterEquipment(id: string): Promise<void> {
  console.log(`🗑️ Deleting equipment ${id}...`)

  const { error } = await supabase.from('meter_equipment').delete().eq('id', id)

  if (error) {
    console.error('❌ Error deleting meter equipment:', error)
    throw error
  }
  console.log(`✅ Meter equipment deleted successfully`)
}