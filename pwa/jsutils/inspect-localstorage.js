// Script para inspeccionar localStorage y detectar problemas
console.log('🔍 Inspeccionando localStorage...\n')

// Función para inspeccionar localStorage
function inspectLocalStorage() {
  console.log('📊 Estado actual de localStorage:\n')

  // Ver todas las claves en localStorage
  const keys = Object.keys(localStorage)
  console.log(`🔑 Total de claves en localStorage: ${keys.length}`)

  keys.forEach(key => {
    try {
      const value = localStorage.getItem(key)
      if (value) {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) {
          console.log(`📋 ${key}: ${parsed.length} elementos`)
          if (parsed.length > 0) {
            console.log(`   Primer elemento:`, parsed[0])
          }
        } else if (typeof parsed === 'object' && parsed !== null) {
          const subKeys = Object.keys(parsed)
          console.log(`📦 ${key}: objeto con ${subKeys.length} propiedades`)
          console.log(`   Propiedades:`, subKeys)
        } else {
          console.log(`📄 ${key}: ${typeof parsed} = ${JSON.stringify(parsed).slice(0, 100)}...`)
        }
      } else {
        console.log(`❌ ${key}: valor vacío`)
      }
    } catch (e) {
      console.log(`⚠️ ${key}: error parseando JSON - ${localStorage.getItem(key)?.slice(0, 100)}...`)
    }
  })

  console.log('\n' + '='.repeat(50))

  // Inspeccionar específicamente datos relacionados con la app
  const appKeys = keys.filter(key => key.includes('apenergia'))
  console.log(`🎯 Claves relacionadas con la app: ${appKeys.length}`)

  appKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key)
      if (value) {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) {
          console.log(`📋 ${key}: ${parsed.length} elementos`)

          // Verificar duplicados
          const ids = parsed.map(item => item.id || item.header?.id).filter(Boolean)
          const uniqueIds = [...new Set(ids)]
          const duplicates = ids.length - uniqueIds.length

          if (duplicates > 0) {
            console.log(`   ⚠️ DUPLICADOS ENCONTRADOS: ${duplicates} duplicados`)
            console.log(`   IDs únicos: ${uniqueIds.length}, Total: ${ids.length}`)
          } else {
            console.log(`   ✅ Sin duplicados`)
          }

          // Mostrar algunos elementos
          if (parsed.length > 0) {
            console.log(`   Muestra:`)
            parsed.slice(0, 3).forEach((item, idx) => {
              const id = item.id || item.header?.id || 'sin ID'
              console.log(`     ${idx + 1}. ${id}`)
            })
            if (parsed.length > 3) {
              console.log(`     ... y ${parsed.length - 3} más`)
            }
          }
        }
      }
    } catch (e) {
      console.log(`⚠️ Error inspeccionando ${key}:`, e.message)
    }
  })

  console.log('\n' + '='.repeat(50))

  // Función para limpiar localStorage si es necesario
  window.clearAppData = function() {
    console.log('🧹 Limpiando datos de la aplicación...')
    appKeys.forEach(key => {
      localStorage.removeItem(key)
      console.log(`   🗑️ Eliminado: ${key}`)
    })
    console.log('✅ Limpieza completada. Recarga la página.')
  }

  console.log('\n💡 Para limpiar todos los datos de la app, ejecuta: clearAppData()')
}

// Ejecutar inspección
inspectLocalStorage()