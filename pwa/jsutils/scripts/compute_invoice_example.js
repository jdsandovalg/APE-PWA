// Simple standalone invoice computation (CommonJS) using the user's rules
// Run: node compute_invoice_example.js

function round2(v){ return Math.round((v + Number.EPSILON) * 100) / 100 }

// Tariff values from Octubre2025 (EEGSA BTSA)
const tariff = {
  fixedCharge_Q: 13.136031,
  energy_Q_per_kWh: 1.136754,
  distribution_Q_per_kWh: 0.245609,
  potencia_Q_per_kWh: 0.053700,
  contrib_percent: 13.8,
  iva_percent: 12
}

// Example scenario: consumption 147 kWh (production is ignored for charge calculations)
const consumption_kWh = 147
const production_kWh = 0
const credits_Q = 0

// Rules:
// - Cargo fijo: applied once per invoice (not prorated here)
// - Energía neta: energy_Q_per_kWh * max(0, consumption - credits)
// - Distribución: distribution_Q_per_kWh * consumption (always based on consumption)
// - Potencia: potencia_Q_per_kWh * consumption (always based on consumption)
// - Contribución A.P.: contrib_percent % of total cargos (sin IVA)
// - IVA: iva_percent % applied to cargos (sin IVA) but NOT to contrib AP

const fixed = tariff.fixedCharge_Q
// net consumption = consumption - production (cannot be negative)
const netConsumption = Math.max(0, consumption_kWh - production_kWh)
const raw_energy = netConsumption * tariff.energy_Q_per_kWh
// Distribution and potencia are computed over consumption (production ignored)
const raw_distribution = consumption_kWh * tariff.distribution_Q_per_kWh
const raw_potencia = consumption_kWh * tariff.potencia_Q_per_kWh

const energy = round2(raw_energy)
const distribution = round2(raw_distribution)
const potencia = round2(raw_potencia)
const fixed_r = round2(fixed)

const total_cargo_sin_iva = round2(fixed_r + energy + distribution + potencia)
const iva = round2(total_cargo_sin_iva * (tariff.iva_percent/100))
const contrib = round2(total_cargo_sin_iva * (tariff.contrib_percent/100))
const subtotal = round2(total_cargo_sin_iva + iva + contrib)
const total_due = round2(Math.max(0, subtotal - credits_Q))

console.log('--- Invoice example (standalone) ---')
console.log(`Consumo (kWh): ${consumption_kWh}`)
console.log(`Producción (kWh): ${production_kWh}`)
console.log(`Cargo fijo: Q ${fixed_r.toFixed(2)}`)
console.log(`Energía: Q ${energy.toFixed(2)}`)
console.log(`Distribución: Q ${distribution.toFixed(2)}`)
console.log(`Potencia: Q ${potencia.toFixed(2)}`)
console.log(`Total cargos (sin IVA): Q ${total_cargo_sin_iva.toFixed(2)}`)
console.log(`IVA (${tariff.iva_percent}%): Q ${iva.toFixed(2)}`)
console.log(`Contribución A.P. (${tariff.contrib_percent}%): Q ${contrib.toFixed(2)}`)
console.log(`Créditos: Q ${credits_Q.toFixed(2)}`)
console.log(`TOTAL FACTURA: Q ${total_due.toFixed(2)}`)
