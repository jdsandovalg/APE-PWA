// Script para ejecutar en el navegador y limpiar localStorage
(function() {
  console.log('🔍 Inspeccionando localStorage de la aplicación...\n')

  // Función para contar elementos en localStorage
  function countLocalStorageItems() {
    const keys = Object.keys(localStorage)
    console.log(`📊 Total de claves en localStorage: ${keys.length}`)

    // Filtrar claves relacionadas con la app
    const appKeys = keys.filter(key => key.includes('apenergia'))
    console.log(`🎯 Claves de la aplicación: ${appKeys.length}`)

    appKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key)
        if (value) {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed)) {
            console.log(`📋 ${key}: ${parsed.length} elementos`)

            // Verificar duplicados
            const ids = parsed.map(item => {
              // Manejar diferentes formatos
              if (item.id) return item.id
              if (item.header && item.header.id) return item.header.id
              if (item.meter_id && item.date) return `${item.meter_id}-${item.date}`
              return JSON.stringify(item).slice(0, 50) // fallback
            })

            const uniqueIds = [...new Set(ids)]
            const duplicates = ids.length - uniqueIds.length

            if (duplicates > 0) {
              console.log(`   ⚠️ DUPLICADOS: ${duplicates} duplicados detectados`)
              console.log(`   IDs únicos: ${uniqueIds.length}, Total: ${ids.length}`)
            }

            // Mostrar algunos IDs
            if (parsed.length > 0) {
              console.log(`   Muestra de IDs:`)
              parsed.slice(0, 5).forEach((item, idx) => {
                const id = item.id || item.header?.id || `${item.meter_id}-${item.date}` || `item-${idx}`
                console.log(`     ${idx + 1}. ${id}`)
              })
              if (parsed.length > 5) {
                console.log(`     ... y ${parsed.length - 5} más`)
              }
            }
          } else {
            console.log(`📦 ${key}: objeto o valor único`)
          }
        }
      } catch (e) {
        console.log(`⚠️ ${key}: error parseando - ${e.message}`)
      }
    })

    return { total: keys.length, app: appKeys.length, appKeys }
  }

  // Función para limpiar datos de la app
  function clearAppData() {
    console.log('🧹 Limpiando datos de la aplicación...')
    const { appKeys } = countLocalStorageItems()

    appKeys.forEach(key => {
      localStorage.removeItem(key)
      console.log(`   🗑️ Eliminado: ${key}`)
    })

    console.log('✅ Limpieza completada. Recarga la página para ver los cambios.')
    console.log('💡 Ahora la aplicación usará solo datos de Supabase.')
  }

  // Función para mostrar resumen detallado
  function showDetailedSummary() {
    console.log('\n📈 RESUMEN DETALLADO:')
    const { appKeys } = countLocalStorageItems()

    let totalElements = 0
    appKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key)
        if (value) {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed)) {
            totalElements += parsed.length
            console.log(`   ${key}: ${parsed.length} elementos`)
          }
        }
      } catch (e) {
        // ignore
      }
    })

    console.log(`\n🔢 TOTAL DE ELEMENTOS EN LOCALSTORAGE: ${totalElements}`)
    console.log('💡 Si este número es mucho mayor que los registros en Supabase,')
    console.log('   confirma que hay datos duplicados o basura acumulada.')
  }

  // Ejecutar inspección
  const result = countLocalStorageItems()
  showDetailedSummary()

  // Exponer funciones globales
  window.inspectLocalStorage = countLocalStorageItems
  window.clearAppData = clearAppData
  window.showDetailedSummary = showDetailedSummary

  console.log('\n💡 Comandos disponibles:')
  console.log('   inspectLocalStorage() - Re-inspeccionar localStorage')
  console.log('   clearAppData() - Limpiar TODOS los datos de la app')
  console.log('   showDetailedSummary() - Mostrar resumen detallado')

  console.log('\n⚠️ IMPORTANTE: clearAppData() eliminará TODOS los datos locales.')
  console.log('   La aplicación seguirá funcionando con datos de Supabase.')
})()
