import React, { useEffect, useState } from 'react'
import { BarChart2 } from 'lucide-react'
import { getAllTariffs, getReadings, type TariffRecord, type ReadingRecord } from '../services/supabasePure'
import { computeInvoiceForPeriod } from '../services/billing'
import { getAllMeters, type MeterRecord } from '../services/supabaseBasic'
import { supabase } from '../services/supabase'
import InvoiceModal from './InvoiceModal'
import InvoiceCompareModal from './InvoiceCompareModal'

function currency(v:number){ return `Q ${v.toFixed(2)}` }

export default function Billing(){
  const [tariffs, setTariffs] = useState<TariffRecord[]>([])
  const [readings, setReadings] = useState<ReadingRecord[]>([])
  const [consumption, setConsumption] = useState<number>(0)
  const [production, setProduction] = useState<number>(147)
  const [credits, setCredits] = useState<number>(0)
  const [mode, setMode] = useState<'month'|'period'>('period')
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<any>(null)
  const [resultsByMonth, setResultsByMonth] = useState<any[] | null>(null)
  const [useCumulativeCredits, setUseCumulativeCredits] = useState<boolean>(false)
  const [selectedRow, setSelectedRow] = useState<any | null>(null)
  const [showInvoice, setShowInvoice] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [compareRow, setCompareRow] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentMeterId, setCurrentMeterId] = useState<string>('')
  const [currentMeter, setCurrentMeter] = useState<MeterRecord | null>(null)

  useEffect(() => {
    loadData()

    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail || {}
        const meterId = detail.meterId
        if (!meterId) return
        // Reload data for the newly selected meter
        loadData()
        // Also re-run invoices computation after a small delay
        setTimeout(()=>{ runFromDeltas().catch(()=>{}) }, 50)
      } catch (err) { console.warn('Error handling ape:meterChange in Billing', err) }
    }

    window.addEventListener('ape:meterChange', handler as EventListener)
    return () => { window.removeEventListener('ape:meterChange', handler as EventListener) }
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const metersData = await getAllMeters()
      // Respect persisted selection if present
      let meterId = currentMeterId
      if (!meterId && metersData.length > 0) {
        const persisted = (() => { try { return localStorage.getItem('ape_currentMeterId') } catch (e) { return null } })()
        const chosen = persisted ? (metersData.find(m => m.id === persisted) || metersData[0]) : metersData[0]
        meterId = chosen.contador
        setCurrentMeterId(meterId)
        setCurrentMeter(chosen)
      }
      const [tariffsData, readingsData] = await Promise.all([
        getAllTariffs(),
        getReadings(meterId)
      ])
      setTariffs(tariffsData)
      setReadings(readingsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper functions
  // Removed: computeDeltas, findActiveTariffForDate (now handled server-side)

  // On mount, immediately compute row-by-row table so it's visible when entering the view
  useEffect(()=>{
    // small timeout to allow any surrounding navigation state to settle
    setTimeout(async ()=>{
      try{ await runFromDeltas() }catch(e){ console.error('runFromDeltas failed', e) }
    }, 30)
  }, [currentMeter])

  async function runFromDeltas(){
    if (!currentMeter?.contador) {
      setResultsByMonth([]);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('get_invoices', { meter_id_param: currentMeter.contador });
      if (error) throw error;
      // data is the array of invoices
      if (data && Array.isArray(data) && data.length > 0) {
        const rows = data.map((inv: any) => ({
          date: inv.invoice_date,
          consumption_kWh: inv.consumption_kwh,
          production_kWh: inv.production_kwh,
          credit_kWh: inv.credit_kwh,
          tariffId: inv.tariff_id,
          invoice: inv.invoice_data
        }))

        // If the returned invoice tariff segment does not match the meter's tipo_servicio,
        // prefer to compute a local invoice using the meter's correct segment (avoid BTSA vs BTSS mismatch).
        const meterSegment = currentMeter?.tipo_servicio || null
        if (meterSegment) {
          const mismatched = rows.some(r => r.invoice && r.invoice.tariff && r.invoice.tariff.header && r.invoice.tariff.header.segment && r.invoice.tariff.header.segment !== meterSegment)
          if (mismatched) {
            // compute local fallbacks for each row using matched tariff
            const today = new Date().toISOString()
            const computedRows: any[] = []
            for (const r of rows) {
              // find tariff that matches meterSegment and date
              let activeTariff: any = null
              try {
                activeTariff = tariffs.find((t:any) => {
                  if (!t?.header) return false
                  if (t.header.segment !== meterSegment) return false
                  const from = t.header.period?.from ? new Date(t.header.period.from) : null
                  const to = t.header.period?.to ? new Date(t.header.period.to) : null
                  if (from && to) {
                    const d = new Date(r.date || today)
                    return d >= from && d <= to
                  }
                  return true
                })
              } catch (e) { /* ignore */ }
              if (!activeTariff && tariffs.length>0) activeTariff = tariffs[0]
              const invoice = computeInvoiceForPeriod(Number(r.consumption_kWh||0), Number(r.production_kWh||0), activeTariff || null, { forUnit: 'period', date: r.date || today })
              invoice._computed_local = true
              computedRows.push({ ...r, invoice, tariffId: activeTariff?.header?.id || null })
            }
            setResultsByMonth(computedRows)
            return
          }
        }

        setResultsByMonth(rows);
      } else {
        // RPC returned no invoices — build a fallback invoice using tariff fixed charge
        // attempt to find tariff from local `tariffs` state using meter info
        const meterCompany = currentMeter?.distribuidora || currentMeter?.propietaria || undefined
        const meterSegment = currentMeter?.tipo_servicio || undefined
        const today = new Date().toISOString()

        // Prefer a tariff that matches company+segment and includes today's date
        let activeTariff: any = null
        try {
          activeTariff = tariffs.find((t:any) => {
            const from = t?.header?.period?.from ? new Date(t.header.period.from) : null
            const to = t?.header?.period?.to ? new Date(t.header.period.to) : null
            if (meterCompany && t.header.company !== meterCompany) return false
            if (meterSegment && t.header.segment !== meterSegment) return false
            if (from && to) {
              const d = new Date(today)
              return d >= from && d <= to
            }
            return true
          })
        } catch(e){ /* ignore */ }

        // If not found, try any tariff for company+segment
        if (!activeTariff && meterCompany) {
          activeTariff = tariffs.find((t:any) => (t.header.company === meterCompany && (!meterSegment || t.header.segment === meterSegment)))
        }

        // If still not found, take the most recent tariff as last resort
        if (!activeTariff && tariffs.length>0) activeTariff = tariffs[0]

        // Compute invoice for zero consumption/production — fixed charge should apply
        const invoice = computeInvoiceForPeriod(0, 0, activeTariff || null, { forUnit: 'month', date: today, credits_kWh: 0 })
        const row = {
          date: (new Date()).toISOString().split('T')[0],
          consumption_kWh: 0,
          production_kWh: 0,
          credit_kWh: 0,
          tariffId: activeTariff?.header?.id || null,
          invoice
        }
        setResultsByMonth([row])
      }
    } catch (e) {
      console.error('Error calling get_invoices', e);
      setResultsByMonth([]);
    }
  }

  return (
    <section>
      <div className="card w-full">

        {resultsByMonth && (
          <div className="mt-6 glass-card p-4 billing-table">
            {/* If rows are per-date deltas (have `date`), render table; otherwise render per-month cards */}
            {resultsByMonth.length===0 && <div className="text-sm text-gray-400 mt-2">No hay lecturas.</div>}
            {resultsByMonth.length>0 && (resultsByMonth[0].date ? (
              <div>
                <h4 className="font-medium mb-3 text-center text-xs">Tabla de facturación por periodo (delta)</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs table-fixed" style={{ borderCollapse: 'collapse' }}>
                    <colgroup>
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="px-2 py-2 border border-white/10 bg-white/6 backdrop-blur-sm sticky top-0 text-left text-white text-xs">Fecha</th>
                        <th className="px-2 py-2 border border-white/10 bg-white/6 backdrop-blur-sm text-center text-white text-xs tuncate">Consumo kWh</th>
                        <th className="px-2 py-2 border border-white/10 bg-white/6 backdrop-blur-sm text-center text-white text-xs">Cargo fijo</th>
                        <th className="px-2 py-2 border border-white/10 bg-white/6 backdrop-blur-sm text-center text-white text-xs">Energía neta</th>
                        <th className="px-2 py-2 border border-white/10 bg-white/6 backdrop-blur-sm text-center text-white text-xs">Distribución</th>
                        <th className="px-2 py-2 border border-white/10 bg-white/6 backdrop-blur-sm text-center text-white text-xs">Potencia</th>
                        <th className="px-2 py-2 border border-white/10 bg-white/6 backdrop-blur-sm text-center text-white text-xs">Contrib. A.P.</th>
                        <th className="px-2 py-2 border border-white/10 bg-white/6 backdrop-blur-sm text-center text-white text-xs">IVA</th>
                        <th className="px-2 py-2 border border-white/10 bg-white/6 backdrop-blur-sm text-center text-white text-xs">Total Q</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultsByMonth.map((r:any, idx:number)=> (
                        <tr key={idx} className={`border-t border-white/5 ${idx % 2 === 0 ? 'bg-white/2' : ''} text-xs hover:bg-white/5`}>
                          <td onClick={()=>{ setSelectedRow(r); setShowInvoice(true) }} className="px-2 py-2 border border-white/10 align-top whitespace-nowrap flex items-center gap-2">
                            <div className="relative inline-block group">
                              <button aria-label={`Comparar PDF para ${r.date}`} title="Comparar PDF" className="p-1 text-white focus:outline-none" onClick={(e)=>{ e.stopPropagation(); setCompareRow(r); setShowCompare(true) }} onKeyDown={(e)=>{ if(e.key==='Enter'){ e.stopPropagation(); setCompareRow(r); setShowCompare(true) } }}>
                                <BarChart2 size={16} className="text-white" />
                              </button>
                              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 transform hidden group-hover:block group-focus:block bg-black text-white text-2xs px-2 py-1 rounded whitespace-nowrap">Comparar PDF</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="truncate">{r.date}</span>
                              {r.invoice && r.invoice._computed_local && (
                                <span className="text-[10px] text-yellow-300 bg-yellow-900/10 px-1 py-0.5 rounded">calculado local</span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2 border border-white/10 text-right align-top whitespace-nowrap">
                            <div className="text-2xs text-gray-400">kWh</div>
                            <div className="font-medium text-xs">{Number(r.consumption_kWh || 0).toLocaleString()}</div>
                          </td>
                          <td className="px-1 py-1 border border-white/10 text-right align-top whitespace-nowrap">
                            <div className="text-2xs text-gray-400">{r.invoice?.tariff?.fixed_charge_q ? `${Number(r.invoice.tariff.fixed_charge_q).toFixed(4)} Q` : '-'}</div>
                            <div className="font-medium text-xs">{currency(Number(r.invoice?.fixed_charge_Q || 0))}</div>
                          </td>
                          <td className="px-1 py-1 border border-white/10 text-right align-top whitespace-nowrap">
                            <div className="text-2xs text-gray-400">{r.invoice?.tariff?.energy_q_per_kwh ? `${Number(r.invoice.tariff.energy_q_per_kwh).toFixed(6)} Q/kWh` : '-'}</div>
                            <div className="font-medium text-xs">{currency(Number(r.invoice?.energy_charge_Q || 0))}</div>
                          </td>
                          <td className="px-1 py-1 border border-white/10 text-right align-top whitespace-nowrap">
                            <div className="text-2xs text-gray-400">{r.invoice?.tariff?.distribution_q_per_kwh ? `${Number(r.invoice.tariff.distribution_q_per_kwh).toFixed(6)} Q/kWh` : '-'}</div>
                            <div className="font-medium text-xs">{currency(Number(r.invoice?.distribution_charge_Q || 0))}</div>
                          </td>
                          <td className="px-1 py-1 border border-white/10 text-right align-top whitespace-nowrap">
                            <div className="text-2xs text-gray-400">{r.invoice?.tariff?.potencia_q_per_kwh ? `${Number(r.invoice.tariff.potencia_q_per_kwh).toFixed(6)} Q/kW` : '-'}</div>
                            <div className="font-medium text-xs">{currency(Number(r.invoice?.potencia_charge_Q || 0))}</div>
                          </td>
                          <td className="px-1 py-1 border border-white/10 text-right align-top whitespace-nowrap">
                            <div className="text-2xs text-gray-400">-</div>
                            <div className="font-medium text-xs">{currency(Number(r.invoice?.contrib_amount_Q || 0))}</div>
                          </td>
                          <td className="px-1 py-1 border border-white/10 text-right align-top whitespace-nowrap">
                            <div className="text-2xs text-gray-400">{r.invoice?.tariff?.iva_percent != null ? `${Number(r.invoice.tariff.iva_percent)}%` : '12%'}</div>
                            <div className="font-medium text-xs">{currency(Number(r.invoice?.iva_amount_Q || 0))}</div>
                          </td>
                          <td className="px-1 py-1 border border-white/10 text-right font-semibold align-top whitespace-nowrap text-sm">{currency(Number(r.invoice?.total_due_Q || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div>
                <h4 className="font-medium">Resultados por mes (desde lecturas)</h4>
                {resultsByMonth.map((r:any)=> (
                  <div key={r.month} className="mt-3 border-t border-white/5 pt-3">
                    <div className="flex justify-between text-sm"><div className="font-medium">{r.month}</div><div className="text-right text-xs text-gray-400">Tarifa: {r.tariffId || 'N/A'}</div></div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                              <div>Consumo (kWh)</div><div className="text-right">{r.consumption}</div>
                              <div>Producción (kWh)</div><div className="text-right">{r.production}</div>
                              <div>Créditos aplicados (kWh)</div><div className="text-right">{r.credits_kWh}</div>
                              <div>Cargo energía</div><div className="text-right">{currency(r.invoice.energy_charge_Q)}</div>
                              <div>Cargo distribución</div><div className="text-right">{currency(r.invoice.distribution_charge_Q)}</div>
                              <div>Cargo potencia</div><div className="text-right">{currency(r.invoice.potencia_charge_Q)}</div>
                              <div>Cargo fijo</div><div className="text-right">{currency(r.invoice.fixed_charge_Q)}</div>
                              <div>Total cargos (sin IVA)</div><div className="text-right">{currency(r.invoice.total_cargo_sin_iva_Q)}</div>
                              <div>IVA</div><div className="text-right">{currency(r.invoice.iva_amount_Q)}</div>
                              <div>Contribución A.P.</div><div className="text-right">{currency(r.invoice.contrib_amount_Q)}</div>
                              <div className="font-semibold">Total</div><div className="font-semibold text-right">{currency(r.invoice.total_due_Q)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Invoice modal */}
      <InvoiceModal open={showInvoice} onClose={()=>setShowInvoice(false)} row={selectedRow} />
      {/* Compare modal */}
      <InvoiceCompareModal open={showCompare} onClose={()=>setShowCompare(false)} row={compareRow} />
    </section>
  )
}
