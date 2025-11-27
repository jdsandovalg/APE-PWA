// ==========================================
// TIPOS COMUNES PARA LA APLICACIÓN
// ==========================================

import type {
  CompanyRecord,
  TariffRecord,
  ReadingRecord
} from '../services/supabasePure'

// Alias para compatibilidad
export type Company = CompanyRecord
export type Tariff = TariffRecord
export type Reading = ReadingRecord

// ==========================================
// TIPOS ADICIONALES PARA FORMULARIOS Y UI
// ==========================================

// Tipos para formularios de compañías
export interface CompanyInfo {
  id: string
  name: string
  code: string
}

// Tipos para medidores
export interface MeterInfo {
  id: string
  number: string
  contador: string
  correlativo: string
  propietaria: string
  nit: string
  distribuidora: string
  tipo_servicio: string
  sistema: string
  company_id: string
  company_name?: string
  description?: string
  deleted_at?: string
  created_at?: string
  updated_at?: string
}

// Tipos para tarifas (formato legacy)
export interface TariffHeader {
  id: string
  company: string
  companyCode: string
  segment: string
  period: {
    from: string
    to: string
  }
  effectiveAt: string
  currency: string
  sourcePdf?: string
}

export interface TariffRates {
  fixedCharge_Q: number
  energy_Q_per_kWh: number
  distribution_Q_per_kWh: number
  potencia_Q_per_kWh: number
  contrib_percent: number
  iva_percent?: number
}

export interface TariffSet {
  header: TariffHeader
  rates: TariffRates
}

export interface TariffDetail {
  id: string
  company: string
  segment: string
  period_from: string
  period_to: string
  effective_at: string
  currency: string
  source_pdf?: string
  fixed_charge_q: number
  energy_q_per_kwh: number
  distribution_q_per_kwh: number
  potencia_q_per_kwh: number
  contrib_percent: number
  iva_percent?: number
  deleted_at?: string
  created_at?: string
  updated_at?: string
}

// Tipos para facturación
export interface InvoiceBreakdown {
  consumption_kWh: number
  production_kWh?: number
  energy_charge_Q: number
  distribution_charge_Q: number
  potencia_charge_Q: number
  fixed_charge_Q: number
  total_cargo_sin_iva_Q: number
  iva_amount_Q: number
  contrib_amount_Q: number
  subtotal_Q: number
  credits_Q: number
  total_due_Q: number
  tariff?: TariffSet | null
}