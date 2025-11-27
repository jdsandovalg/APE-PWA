// COPIA Y PEGA ESTO EN LA CONSOLA DEL NAVEGADOR (F12 > Console)

(function() {
  console.log('🔍 INSPECCIÓN DE LOCALSTORAGE - APE PWA\n');

  // Inspeccionar
  function inspect() {
    const keys = Object.keys(localStorage).filter(k => k.includes('apenergia'));
    console.log(`📊 Claves de la app: ${keys.length}`);

    let total = 0;
    keys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(data)) {
          console.log(`📋 ${key}: ${data.length} registros`);
          total += data.length;

          // Verificar duplicados
          const ids = data.map(item => item.id || item.header?.id || 'no-id');
          const unique = [...new Set(ids)];
          if (ids.length !== unique.length) {
            console.log(`   ⚠️ DUPLICADOS: ${ids.length - unique.length}`);
          }
        }
      } catch(e) { console.log(`⚠️ ${key}: error`); }
    });

    console.log(`\n🔢 TOTAL REGISTROS EN LOCALSTORAGE: ${total}`);
    return keys;
  }

  // Limpiar
  function clearAll() {
    console.log('🧹 LIMPIANDO LOCALSTORAGE...');
    const keys = inspect();
    keys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`   🗑️ ${key}`);
    });
    console.log('\n✅ LISTO - Recarga la página (F5)');
  }

  // Ejecutar
  inspect();

  // Exponer funciones
  window.inspectStorage = inspect;
  window.clearStorage = clearAll;

  console.log('\n💡 Ejecuta: clearStorage() para limpiar todo');
})();