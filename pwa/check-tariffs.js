import { loadTariffs } from './services/storage.js'

console.log('=== REVISIÓN DE TARIFAS LOCALES ===\n')

const tariffs = loadTariffs()
console.log(`Total de tarifas encontradas: ${tariffs.length}\n`)

tariffs.forEach((tariff, index) => {
  console.log(`Tarifa ${index + 1}:`)
  console.log(`  ID: ${tariff.header.id}`)
  console.log(`  Empresa: ${tariff.header.company}`)
  console.log(`  Segmento: ${tariff.header.segment}`)
  console.log(`  Periodo: ${tariff.header.period.from} → ${tariff.header.period.to}`)

  // Verificar si las fechas corresponden a trimestres
  const fromDate = new Date(tariff.header.period.from)
  const toDate = new Date(tariff.header.period.to)

  const fromMonth = fromDate.getMonth() + 1 // 1-12
  const toMonth = toDate.getMonth() + 1
  const fromYear = fromDate.getFullYear()
  const toYear = toDate.getFullYear()

  // Calcular trimestre esperado
  const expectedFromQuarter = Math.ceil(fromMonth / 3)
  const expectedToQuarter = Math.ceil(toMonth / 3)

  // Fechas esperadas para el trimestre
  const expectedFromMonth = (expectedFromQuarter - 1) * 3 + 1
  const expectedToMonth = expectedFromQuarter * 3

  const expectedFromDate = new Date(fromYear, expectedFromMonth - 1, 1)
  const expectedToDate = new Date(fromYear, expectedToMonth, 0) // último día del mes

  console.log(`  Análisis:`)
  console.log(`    Mes inicio: ${fromMonth}/${fromYear} (trimestre esperado: Q${expectedFromQuarter})`)
  console.log(`    Mes fin: ${toMonth}/${toYear}`)
  console.log(`    Fecha inicio esperada: ${expectedFromDate.toISOString().split('T')[0]}`)
  console.log(`    Fecha fin esperada: ${expectedToDate.toISOString().split('T')[0]}`)

  // Verificar conflictos
  const actualFrom = tariff.header.period.from
  const actualTo = tariff.header.period.to
  const expectedFrom = expectedFromDate.toISOString().split('T')[0]
  const expectedTo = expectedToDate.toISOString().split('T')[0]

  if (actualFrom !== expectedFrom || actualTo !== expectedTo) {
    console.log(`    ⚠️  CONFLICTO DETECTADO:`)
    if (actualFrom !== expectedFrom) {
      console.log(`       Fecha inicio real: ${actualFrom} ≠ esperada: ${expectedFrom}`)
    }
    if (actualTo !== expectedTo) {
      console.log(`       Fecha fin real: ${actualTo} ≠ esperada: ${expectedTo}`)
    }
  } else {
    console.log(`    ✅ Fechas correctas para trimestre Q${expectedFromQuarter}`)
  }

  console.log(`  Notas: ${tariff.rates.notes || 'Sin notas'}\n`)
})

// Verificar superposiciones entre tarifas
console.log('=== VERIFICACIÓN DE SUPERPOSICIONES ===\n')

for (let i = 0; i < tariffs.length; i++) {
  for (let j = i + 1; j < tariffs.length; j++) {
    const t1 = tariffs[i]
    const t2 = tariffs[j]

    if (t1.header.company === t2.header.company && t1.header.segment === t2.header.segment) {
      const t1From = new Date(t1.header.period.from)
      const t1To = new Date(t1.header.period.to)
      const t2From = new Date(t2.header.period.from)
      const t2To = new Date(t2.header.period.to)

      // Verificar si los periodos se superponen
      if ((t1From <= t2To && t1To >= t2From)) {
        console.log(`⚠️  SUPERPOSICIÓN DETECTADA:`)
        console.log(`   ${t1.header.id}: ${t1.header.period.from} → ${t1.header.period.to}`)
        console.log(`   ${t2.header.id}: ${t2.header.period.from} → ${t2.header.period.to}`)
        console.log('')
      }
    }
  }
}

console.log('=== FIN DE REVISIÓN ===')