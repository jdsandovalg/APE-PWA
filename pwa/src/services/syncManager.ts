// ==========================================
// SYNC MANAGER - CONEXIÓN Y SINCRONIZACIÓN
// ==========================================

import { supabase } from './supabase'

// Verificar conexión con Supabase
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('companies')
      .select('id')
      .limit(1)

    return !error
  } catch (e) {
    console.error('Error checking Supabase connection:', e)
    return false
  }
}