// Servicio de logging detallado para operaciones de Supabase
// Muestra DML, datos enviados y resultados en consola

import { supabase } from './supabase'

interface SupabaseLogEntry {
  timestamp: string
  operation: string
  table: string
  dml: string
  data?: any
  filters?: any
  result?: any
  error?: any
  duration?: number
}

class SupabaseLogger {
  private logs: SupabaseLogEntry[] = []
  private maxLogs = 100

  private formatDML(operation: string, table: string, data?: any, filters?: any): string {
    const timestamp = new Date().toISOString()

    switch (operation.toUpperCase()) {
      case 'INSERT':
        return `INSERT INTO ${table} (${Object.keys(data || {}).join(', ')}) VALUES (${Object.values(data || {}).map(v => typeof v === 'string' ? `'${v}'` : v).join(', ')})`

      case 'UPDATE':
        const setClause = Object.entries(data || {}).map(([k, v]) => `${k} = ${typeof v === 'string' ? `'${v}'` : v}`).join(', ')
        const whereClause = filters ? Object.entries(filters).map(([k, v]) => `${k} = ${typeof v === 'string' ? `'${v}'` : v}`).join(' AND ') : ''
        return `UPDATE ${table} SET ${setClause}${whereClause ? ` WHERE ${whereClause}` : ''}`

      case 'DELETE':
        const deleteWhere = filters ? Object.entries(filters).map(([k, v]) => `${k} = ${typeof v === 'string' ? `'${v}'` : v}`).join(' AND ') : ''
        return `DELETE FROM ${table}${deleteWhere ? ` WHERE ${deleteWhere}` : ''}`

      case 'UPSERT':
        if (Array.isArray(data)) {
          const sample = data[0] || {}
          const fields = Object.keys(sample).join(', ')
          return `UPSERT INTO ${table} (${fields}) VALUES (${data.length} records)`
        } else {
          const fields = Object.keys(data || {}).join(', ')
          const values = Object.values(data || {}).map(v => typeof v === 'string' ? `'${v}'` : v).join(', ')
          return `UPSERT INTO ${table} (${fields}) VALUES (${values})`
        }

      case 'SELECT':
        const selectFields = data || '*'
        const selectWhere = filters ? Object.entries(filters).map(([k, v]) => `${k} = ${typeof v === 'string' ? `'${v}'` : v}`).join(' AND ') : ''
        return `SELECT ${selectFields} FROM ${table}${selectWhere ? ` WHERE ${selectWhere}` : ''}`

      default:
        return `${operation.toUpperCase()} on ${table}`
    }
  }

  log(operation: string, table: string, data?: any, filters?: any, result?: any, error?: any, duration?: number) {
    const entry: SupabaseLogEntry = {
      timestamp: new Date().toISOString(),
      operation,
      table,
      dml: this.formatDML(operation, table, data, filters),
      data,
      filters,
      result,
      error,
      duration
    }

    this.logs.unshift(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // Log to console with styling
    const style = error
      ? 'color: #ff4444; font-weight: bold;'
      : result
      ? 'color: #44ff44; font-weight: bold;'
      : 'color: #4444ff; font-weight: bold;'

    console.group(`🔄 %cSupabase ${operation.toUpperCase()} - ${table}`, style)
    console.log('📝 DML:', entry.dml)
    if (data) console.log('📦 Data:', data)
    if (filters) console.log('🔍 Filters:', filters)
    if (result) console.log('✅ Result:', result)
    if (error) console.log('❌ Error:', error)
    if (duration) console.log('⏱️ Duration:', `${duration}ms`)
    console.groupEnd()
  }

  // Métodos específicos para cada operación
  logInsert(table: string, data: any, result?: any, error?: any, duration?: number) {
    this.log('INSERT', table, data, undefined, result, error, duration)
  }

  logUpdate(table: string, data: any, filters: any, result?: any, error?: any, duration?: number) {
    this.log('UPDATE', table, data, filters, result, error, duration)
  }

  logDelete(table: string, filters: any, result?: any, error?: any, duration?: number) {
    this.log('DELETE', table, undefined, filters, result, error, duration)
  }

  logUpsert(table: string, data: any, onConflict?: string, result?: any, error?: any, duration?: number) {
    const dml = this.formatDML('UPSERT', table, data) + (onConflict ? ` ON CONFLICT (${onConflict})` : '')
    const entry: SupabaseLogEntry = {
      timestamp: new Date().toISOString(),
      operation: 'UPSERT',
      table,
      dml,
      data: Array.isArray(data) ? `${data.length} records` : data,
      result,
      error,
      duration
    }

    this.logs.unshift(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    const style = error ? 'color: #ff4444; font-weight: bold;' : 'color: #44ff44; font-weight: bold;'
    console.group(`🔄 %cSupabase UPSERT - ${table}`, style)
    console.log('📝 DML:', dml)
    if (Array.isArray(data)) {
      console.log('📦 Data:', `${data.length} records`)
      if (data.length > 0) {
        console.log('📋 Sample record:', data[0])
      }
    } else {
      console.log('📦 Data:', data)
    }
    if (onConflict) console.log('🔑 On Conflict:', onConflict)
    if (result) console.log('✅ Result:', result)
    if (error) {
      console.log('❌ Error:', error)
      // Mostrar detalles del error si está disponible
      if (error.details) console.log('📄 Details:', error.details)
      if (error.hint) console.log('💡 Hint:', error.hint)
      if (error.message) console.log('📝 Message:', error.message)
    }
    if (duration) console.log('⏱️ Duration:', `${duration}ms`)
    console.groupEnd()
  }

  logSelect(table: string, columns: string, filters?: any, result?: any, error?: any, duration?: number) {
    this.log('SELECT', table, columns, filters, result, error, duration)
  }

  // Obtener logs recientes
  getRecentLogs(count: number = 10): SupabaseLogEntry[] {
    return this.logs.slice(0, count)
  }

  // Limpiar logs
  clearLogs() {
    this.logs = []
  }
}

// Instancia global del logger
export const supabaseLogger = new SupabaseLogger()

// Función helper para medir tiempo
export function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now()
  return fn().then(result => {
    const duration = Math.round(performance.now() - start)
    return { result, duration }
  })
}

// Función para mostrar logs recientes en consola
export function showRecentLogs(count: number = 5) {
  const logs = supabaseLogger.getRecentLogs(count)
  console.group(`📋 Últimos ${count} logs de Supabase`)
  logs.forEach((log, index) => {
    const style = log.error ? 'color: #ff4444;' : 'color: #44ff44;'
    console.log(`%c${index + 1}. ${log.operation} ${log.table}`, style, {
      DML: log.dml,
      Data: log.data,
      Filters: log.filters,
      Result: log.result,
      Error: log.error,
      Duration: log.duration ? `${log.duration}ms` : 'N/A',
      Timestamp: log.timestamp
    })
  })
  console.groupEnd()
}

// Función para limpiar logs
export function clearSupabaseLogs() {
  supabaseLogger.clearLogs()
  console.log('🧹 Logs de Supabase limpiados')
}

// Función para probar permisos de tabla
export async function testTablePermissions(tableName: string) {
  console.group(`🔍 Probando permisos de tabla: ${tableName}`)

  try {
    // Probar SELECT
    console.log('Testing SELECT...')
    const { data: selectData, error: selectError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)

    if (selectError) {
      console.error('❌ SELECT failed:', selectError)
    } else {
      console.log('✅ SELECT works:', selectData?.length || 0, 'records')
    }

    // Probar INSERT (con datos dummy que luego eliminaremos)
    console.log('Testing INSERT...')
    const testId = `test_${Date.now()}`
    const { data: insertData, error: insertError } = await supabase
      .from(tableName)
      .insert({ id: testId, name: 'test' })
      .select()

    if (insertError) {
      console.error('❌ INSERT failed:', insertError)
      if (insertError.code === '401') {
        console.error('🚫 Error 401: Problema de autenticación/autorización')
      }
    } else {
      console.log('✅ INSERT works:', insertData)

      // Limpiar el registro de prueba
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', testId)

      if (deleteError) {
        console.warn('⚠️ No se pudo limpiar registro de prueba:', deleteError)
      } else {
        console.log('🧹 Registro de prueba limpiado')
      }
    }

  } catch (err) {
    console.error('💥 Error en test:', err)
  }

  console.groupEnd()
}

// Hacer disponibles las funciones globalmente para debugging
if (typeof window !== 'undefined') {
  ;(window as any).showSupabaseLogs = showRecentLogs
  ;(window as any).clearSupabaseLogs = clearSupabaseLogs
  ;(window as any).testTablePermissions = testTablePermissions
  ;(window as any).supabaseLogger = supabaseLogger
}