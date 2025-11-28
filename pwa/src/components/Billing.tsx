import React, { useEffect, useState } from 'react'
import { BarChart2 } from 'lucide-react'
import { getAllTariffs, getReadings, type TariffRecord, type ReadingRecord } from '../services/supabasePure'
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
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const metersData = await getAllMeters()
      let meterId = currentMeterId
      if (!meterId && metersData.length > 0) {
        meterId = metersData[0].contador
        setCurrentMeterId(meterId)
        setCurrentMeter(metersData[0])
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
      const rows = data.map((inv: any) => ({
        date: inv.invoice_date,
        consumption_kWh: inv.consumption_kwh,
        production_kWh: inv.production_kwh,
        credit_kWh: inv.credit_kwh,
        tariffId: inv.tariff_id,
        invoice: inv.invoice_data
      }));
      setResultsByMonth(rows);
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
                            <span className="truncate">{r.date}</span>
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
