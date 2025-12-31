# Bitácora de Desarrollo - AutoProductor Energía

## 📋 Pendientes (To-Do)

1.  **Implementar Edición de Lecturas (`AddReadingModal.tsx`)**
    *   **Estado Actual:** Al intentar guardar una edición, muestra un toast: "Funcionalidad de edición no implementada completamente".
    *   **Acción:** Implementar la lógica de `UPDATE` (o `upsert`) en Supabase.
    *   **Requisito:** Debe detectar si es una edición (por ID o fecha+contador) y actualizar el registro existente en lugar de crear uno nuevo.

2.  **Consistencia en Selección de Medidor**
    *   **Estado:** Se corrigió para que `AddReadingModal` reciba `currentMeterId`.
    *   **Acción:** Verificar que **siempre** se use el medidor seleccionado globalmente. Nunca hacer fallback a `meters[0]` (el primero de la lista) si el usuario ya seleccionó uno específico, para evitar guardar lecturas en el medidor equivocado.

## ⚠️ Precauciones y Áreas Delicadas (LEER ANTES DE TOCAR)

1.  **Manejo de Fechas y Zonas Horarias (CRÍTICO)**
    *   **El Problema:** El Dashboard calcula totales mensuales ("Consumo del Mes") basándose en la fecha local del navegador vs la fecha guardada.
    *   **Regla de Oro:** **NO** alterar la hora de guardado (ej. no forzar mediodía UTC) sin revisar el impacto en el Dashboard.
    *   **Visualización:** Si el día "29" se ve como "28" en la tabla, corregirlo **solo visualmente** en `Readings.tsx` (usando `timeZone: 'UTC'` en el format), pero **no cambiar el dato en la BD**, ya que eso rompe los cálculos de deltas y saldos del Dashboard.

2.  **Identificadores de Medidores (UUID vs Contador)**
    *   **El Problema:** La base de datos y la API mezclan el uso de `id` (UUID interno) y `contador` (String visible, ej: "Z90018").
    *   **Regla de Oro:** `AddReadingModal` actualmente guarda usando `meter_id: currentMeter.contador`. **No cambiar a UUID** sin verificar que `getReadings` y el Dashboard sepan manejarlo, o las lecturas desaparecerán de la vista.

3.  **Carga de Datos en Dashboard (`loadAllData`)**
    *   **El Problema:** Al cambiar de medidor, a veces se cargan datos específicos y luego se sobrescriben con una carga general (`loadAllData`) que puede estar incompleta.
    *   **Regla de Oro:** Asegurar que el flujo de datos en `Dashboard.tsx` sea unidireccional y no sobrescriba datos detallados con datos genéricos.

4.  **Cálculo de Días de Servicio**
    *   **Contexto:** Se calcula restando la fecha de la lectura anterior.
    *   **Cuidado:** Al calcular esto en el modal, asegurarse de filtrar primero las lecturas **solo del medidor actual**. Si se mezclan medidores, el cálculo de días será erróneo (ej. restando una fecha de 2024 con una de 2025 de otro medidor).
