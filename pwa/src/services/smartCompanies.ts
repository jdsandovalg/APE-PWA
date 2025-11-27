import { supabase } from './supabase'
import { loadCompanies, saveCompanies, CompanyInfo } from './storage'
import { addPendingChange, processPendingChanges } from './syncManager'
import { checkSupabaseConnection } from './syncManager'
import { supabaseLogger, measureTime } from './supabaseLogger'

// Función inteligente para agregar compañía
export async function smartAddCompany(id: string, code: string, name: string): Promise<void> {
  const now = new Date().toISOString()
  const companyData: CompanyInfo = {
    id,
    code,
    name,
    created_at: now,
    updated_at: now,
    last_synced_at: now
  }

  const isOnline = await checkSupabaseConnection()

  if (isOnline) {
    // Online: guardar directamente en Supabase
    const { error } = await supabase
      .from('companies')
      .insert(companyData)

    if (error) throw error

    // Actualizar localStorage como cache
    const localData = loadCompanies()
    localData.push(companyData)
    saveCompanies(localData)

    console.log(`Company added online: ${id}, ${code}`)
  } else {
    // Offline: guardar en localStorage y agregar a cola de pendientes
    const localData = loadCompanies()
    localData.push(companyData)
    saveCompanies(localData)

    addPendingChange({
      type: 'create',
      table: 'companies',
      data: companyData
    })

    console.log(`Company queued for sync: ${id}, ${code}`)
  }
}

// Función inteligente para actualizar compañía
export async function smartUpdateCompany(id: string, code: string, name: string): Promise<void> {
  const now = new Date().toISOString()
  const updateData = {
    id,
    code,
    name,
    updated_at: now,
    last_synced_at: now
  }

  console.log('🔍 Checking Supabase connection...')
  const isOnline = await checkSupabaseConnection()
  console.log('📡 Connection status:', isOnline ? 'ONLINE' : 'OFFLINE')

  if (isOnline) {
    console.log('💾 Updating company online:', { id, code, name })
    // Online: actualizar directamente en Supabase
    const { result, duration } = await measureTime(async () => {
      return await supabase
        .from('companies')
        .update({
          name,
          updated_at: now,
          last_synced_at: now
        })
        .eq('id', id)
        .eq('code', code)
        .select()
    })

    const { data, error } = result
    supabaseLogger.logUpdate('companies', { name, updated_at: now, last_synced_at: now }, { id, code }, data, error, duration)

    if (error) {
      console.error('❌ Supabase update error:', error)
      throw error
    }

    console.log('✅ Company updated in Supabase')

    // Actualizar localStorage como cache
    const localData = loadCompanies()
    const updatedLocal = localData.map((c: CompanyInfo) =>
      c.id === id && c.code === code ? { ...c, name, updated_at: now, last_synced_at: now } : c
    )
    saveCompanies(updatedLocal)

    console.log('💾 localStorage updated as cache')
  } else {
    console.log('📱 Updating company offline:', { id, code, name })
    // Offline: actualizar localStorage y agregar a cola de pendientes
    const localData = loadCompanies()
    const updatedLocal = localData.map((c: CompanyInfo) =>
      c.id === id && c.code === code ? { ...c, name, updated_at: now } : c
    )
    saveCompanies(updatedLocal)

    addPendingChange({
      type: 'update',
      table: 'companies',
      data: updateData
    })

    console.log('📋 Company update queued for sync')
  }
}

// Función inteligente para eliminar compañía (soft delete)
export async function smartDeleteCompany(id: string, code: string): Promise<void> {
  const now = new Date().toISOString()
  const deleteData = {
    id,
    code,
    deleted_at: now,
    last_synced_at: now
  }

  const isOnline = await checkSupabaseConnection()

  if (isOnline) {
    // Online: eliminar directamente en Supabase
    const { error } = await supabase
      .from('companies')
      .update({
        deleted_at: now,
        last_synced_at: now
      })
      .eq('id', id)
      .eq('code', code)

    if (error) throw error

    // Actualizar localStorage como cache
    const localData = loadCompanies()
    const updatedLocal = localData.map((c: CompanyInfo) =>
      c.id === id && c.code === code ? { ...c, deleted_at: now, last_synced_at: now } : c
    )
    saveCompanies(updatedLocal)

    console.log(`Company deleted online: ${id}, ${code}`)
  } else {
    // Offline: marcar como eliminada en localStorage y agregar a cola de pendientes
    const localData = loadCompanies()
    const updatedLocal = localData.map((c: CompanyInfo) =>
      c.id === id && c.code === code ? { ...c, deleted_at: now } : c
    )
    saveCompanies(updatedLocal)

    addPendingChange({
      type: 'delete',
      table: 'companies',
      data: deleteData
    })

    console.log(`Company deletion queued for sync: ${id}, ${code}`)
  }
}

// Función para sincronizar cambios pendientes cuando se reconecta
export async function syncPendingCompanyChanges(): Promise<void> {
  const isOnline = await checkSupabaseConnection()
  if (!isOnline) return

  await processPendingChanges()
}

// Función inteligente para sincronizar companies con timestamps
export async function smartSyncCompanies(): Promise<void> {
  try {
    // Primero procesar cambios pendientes
    await syncPendingCompanyChanges()

    // Obtener datos de Supabase con timestamps
    const { data: supabaseData, error } = await supabase
      .from('companies')
      .select('id, code, name, deleted_at, created_at, updated_at, last_synced_at')
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Obtener datos de localStorage
    const localData = loadCompanies()

    // Crear mapa para merge inteligente usando timestamps
    const mergedMap = new Map<string, CompanyInfo>()

    // Agregar datos de localStorage
    localData.forEach((company: CompanyInfo) => {
      if (company.code) {
        const key = `${company.id}|${company.code}`
        mergedMap.set(key, company)
      }
    })

    // Merge con datos de Supabase (Supabase tiene prioridad si es más reciente)
    supabaseData.forEach((company: any) => {
      const key = `${company.id}|${company.code}`
      const localCompany = mergedMap.get(key)

      if (!localCompany) {
        // No existe localmente, agregar
        mergedMap.set(key, company)
      } else {
        // Existe localmente, comparar timestamps
        const supabaseUpdated = new Date(company.updated_at || 0)
        const localUpdated = new Date(localCompany.updated_at || 0)

        if (supabaseUpdated > localUpdated) {
          // Supabase es más reciente, usar versión de Supabase
          mergedMap.set(key, company)
        }
        // Si local es más reciente o igual, mantener local
      }
    })

    // Convertir a array y guardar
    const mergedData = Array.from(mergedMap.values())
    saveCompanies(mergedData)

    // Actualizar last_synced_at en Supabase
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('companies')
      .update({ last_synced_at: now })
      .neq('id', '') // Actualizar todos

    if (updateError) {
      console.warn('Error updating last_synced_at:', updateError)
    }

    console.log(`Smart sync completed: ${mergedData.length} companies`)
  } catch (err) {
    console.error('Error in smartSyncCompanies:', err)
    throw err
  }
}