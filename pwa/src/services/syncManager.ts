import { supabase } from './supabase'

// Tipos para la cola de sincronización
export interface PendingChange {
  id: string
  type: 'create' | 'update' | 'delete'
  table: 'companies' | 'tariffs' | 'readings'
  data: any
  timestamp: string
  retryCount: number
}

const PENDING_CHANGES_KEY = 'apenergia:pending_changes'

// Cola de cambios pendientes
export function getPendingChanges(): PendingChange[] {
  try {
    const raw = localStorage.getItem(PENDING_CHANGES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

export function addPendingChange(change: Omit<PendingChange, 'id' | 'timestamp' | 'retryCount'>): void {
  const pendingChanges = getPendingChanges()
  const newChange: PendingChange = {
    ...change,
    id: `${change.table}_${change.type}_${Date.now()}_${Math.random()}`,
    timestamp: new Date().toISOString(),
    retryCount: 0
  }
  pendingChanges.push(newChange)
  localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pendingChanges))
}

export function removePendingChange(id: string): void {
  const pendingChanges = getPendingChanges()
  const filtered = pendingChanges.filter(c => c.id !== id)
  localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(filtered))
}

export function updatePendingChangeRetry(id: string): void {
  const pendingChanges = getPendingChanges()
  const change = pendingChanges.find(c => c.id === id)
  if (change) {
    change.retryCount++
    localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pendingChanges))
  }
}

// Función para procesar la cola de cambios pendientes
export async function processPendingChanges(): Promise<void> {
  const pendingChanges = getPendingChanges()
  if (pendingChanges.length === 0) return

  for (const change of pendingChanges) {
    try {
      await processSingleChange(change)
      removePendingChange(change.id)
    } catch (error) {
      console.error(`Failed to process change ${change.id}:`, error)
      updatePendingChangeRetry(change.id)

      // Si ha fallado más de 3 veces, marcar como error permanente
      if (change.retryCount >= 3) {
        console.error(`Change ${change.id} failed permanently, removing from queue`)
        removePendingChange(change.id)
      }
    }
  }
}

// Procesar un cambio individual
async function processSingleChange(change: PendingChange): Promise<void> {
  const { type, table, data } = change

  switch (table) {
    case 'companies':
      await processCompanyChange(type, data)
      break
    case 'tariffs':
      await processTariffChange(type, data)
      break
    case 'readings':
      await processReadingChange(type, data)
      break
    default:
      throw new Error(`Unknown table: ${table}`)
  }
}

// Procesar cambios de compañías
async function processCompanyChange(type: string, data: any): Promise<void> {
  const now = new Date().toISOString()

  switch (type) {
    case 'create':
      const { error: createError } = await supabase
        .from('companies')
        .insert({
          ...data,
          created_at: now,
          updated_at: now,
          last_synced_at: now
        })
      if (createError) throw createError
      break

    case 'update':
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          ...data,
          updated_at: now,
          last_synced_at: now
        })
        .eq('id', data.id)
        .eq('code', data.code)
      if (updateError) throw updateError
      break

    case 'delete':
      const { error: deleteError } = await supabase
        .from('companies')
        .update({
          deleted_at: now,
          last_synced_at: now
        })
        .eq('id', data.id)
        .eq('code', data.code)
      if (deleteError) throw deleteError
      break
  }
}

// Placeholder para tarifas y lecturas (implementaremos después)
async function processTariffChange(type: string, data: any): Promise<void> {
  // TODO: Implementar cuando llegue a Fase 2.2
  throw new Error('Tariff sync not implemented yet')
}

async function processReadingChange(type: string, data: any): Promise<void> {
  // TODO: Implementar cuando llegue a Fase 2.3
  throw new Error('Reading sync not implemented yet')
}

// Función para verificar conectividad real con Supabase
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    console.log('🔗 Checking Supabase connection...')
    const { data, error } = await supabase
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    const isConnected = !error
    console.log('🔗 Supabase connection result:', isConnected, error ? `Error: ${error.message}` : 'Success')
    return isConnected
  } catch (e) {
    console.error('🔗 Supabase connection check failed:', e)
    return false
  }
}