// Script para cambiar entre versiones del TariffTester
// Ejecutar en la consola del navegador

(function() {
  console.log('🔄 CAMBIO DE TARIFFTESTER\n');

  // Función para usar versión simplificada (solo Supabase)
  function useSimplifiedVersion() {
    console.log('📦 Cambiando a TariffTesterSimplified (solo Supabase)...');

    // Aquí iría el código para cambiar el componente
    // Por ahora, solo mostrar instrucciones
    console.log('✅ Para usar la versión simplificada:');
    console.log('   1. Importa TariffTesterSimplified en lugar de TariffTester');
    console.log('   2. Esta versión NO usa localStorage');
    console.log('   3. Solo consulta directamente Supabase');
  }

  // Función para limpiar y recargar
  function resetAndReload() {
    console.log('🔄 Limpiando y recargando...');
    localStorage.clear();
    console.log('✅ localStorage limpiado');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  // Inspeccionar estado actual
  function checkCurrentState() {
    const keys = Object.keys(localStorage).filter(k => k.includes('apenergia'));
    console.log(`📊 localStorage tiene ${keys.length} claves de la app`);

    if (keys.length > 0) {
      console.log('⚠️ Todavía hay datos en localStorage que pueden interferir');
      console.log('💡 Ejecuta resetAndReload() para limpiar todo');
    } else {
      console.log('✅ localStorage está limpio');
    }
  }

  // Ejecutar verificación inicial
  checkCurrentState();

  // Exponer funciones
  window.useSimplifiedVersion = useSimplifiedVersion;
  window.resetAndReload = resetAndReload;
  window.checkCurrentState = checkCurrentState;

  console.log('\n💡 Comandos disponibles:');
  console.log('   checkCurrentState() - Ver estado actual');
  console.log('   resetAndReload() - Limpiar y recargar');
  console.log('   useSimplifiedVersion() - Info sobre versión simplificada');

})();