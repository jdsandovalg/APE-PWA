// Script para ejecutar en la consola del navegador
(function() {
  console.log('🔍 INSPECCIÓN COMPLETA DE LOCALSTORAGE\n')

  // Función para inspeccionar detalladamente
  function inspectStorage() {
    const keys = Object.keys(localStorage)
    console.log(`📊 Total de claves: ${keys.length}`)

    const appKeys = keys.filter(k => k.includes('apenergia'))
    console.log(`🎯 Claves de la app: ${appKeys.length}\n`)

    let totalRecords = 0

    appKeys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key))
        if (Array.isArray(data)) {
          console.log(`📋 ${key}: ${data.length} registros`)

          // Contar IDs únicos
          const ids = data.map(item => item.id || item.header?.id || `${item.meter_id}-${item.date}`)
          const uniqueIds = [...new Set(ids)]
          const duplicates = ids.length - uniqueIds.length

          if (duplicates > 0) {
            console.log(`   ⚠️ DUPLICADOS: ${duplicates}`)
          }

          totalRecords += data.length

          // Mostrar primeros 3 IDs
          console.log(`   IDs: ${uniqueIds.slice(0, 3).join(', ')}${uniqueIds.length > 3 ? '...' : ''}`)
        } else {
          console.log(`📦 ${key}: objeto único`)
        }
      } catch (e) {
        console.log(`⚠️ ${key}: error parseando`)
      }
    })

    console.log(`\n🔢 TOTAL DE REGISTROS EN LOCALSTORAGE: ${totalRecords}`)
    return { appKeys, totalRecords }
  }

  // Función para limpiar completamente
  // This browser console helper has been archived to `pwa/jsutils/originals_backup/clean-localstorage-browser.js`
  // Use that copy if you need the original behavior. The repo copy here is neutralized for safety.

  console.log('This utility has been archived to pwa/jsutils/originals_backup/clean-localstorage-browser.js');
