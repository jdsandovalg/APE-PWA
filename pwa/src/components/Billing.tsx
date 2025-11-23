import React, { useEffect, useState } from 'react'
import { loadTariffs, loadReadings, computeDeltas, findActiveTariffForDate } from '../services/storage'
import { computeInvoiceForPeriod } from '../services/billing'
import InvoiceModal from './InvoiceModal'

function currency(v:number){ return `Q ${v.toFixed(2)}` }

export default function Billing(){
  const [tariffs, setTariffs] = useState<any[]>([])
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

  useEffect(()=>{ setTariffs(loadTariffs()) },[])
  // On mount, immediately compute row-by-row table so it's visible when entering the view
  useEffect(()=>{
    // small timeout to allow any surrounding navigation state to settle
    setTimeout(()=>{
      try{ runFromDeltas() }catch(e){ console.error('runFromDeltas failed', e) }
    }, 30)
  }, [])

  function run(){
    const tariff = selected!==null ? tariffs[selected] : (tariffs[0]||null)
    const r = computeInvoiceForPeriod(consumption, production, tariff, { forUnit: mode==='month'?'month':'period', credits_Q: credits })
    setResult(r)
  }

  function runFromReadings(){
    const raws = loadReadings()
    if (!raws || raws.length === 0){ setResultsByMonth([]); return }
    const deltas = computeDeltas(raws)
    // group deltas by YYYY-MM
    const groups: Record<string, { consumption:number, production:number, credits_kWh:number, dates: string[] }>= {}
    deltas.forEach(d=>{
      const dt = new Date(d.date)
      const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`
      if (!groups[key]) groups[key] = { consumption:0, production:0, credits_kWh:0, dates: [] }
      groups[key].consumption += Number(d.consumption || 0)
      groups[key].production += Number(d.production || 0)
      groups[key].credits_kWh += Number((d as any).credit || 0)
      groups[key].dates.push(d.date)
    })

    const months = Object.keys(groups).sort()
    const out: any[] = []
    let cumulativeCredits = 0
    for (const m of months){
      const g = groups[m]
      cumulativeCredits += g.credits_kWh
      const sampleDate = g.dates[g.dates.length-1] || `${m}-01`
      const tariff = findActiveTariffForDate(sampleDate)
      const credits_kWh_to_apply = useCumulativeCredits ? cumulativeCredits : g.credits_kWh
      const inv = computeInvoiceForPeriod(g.consumption, g.production, tariff, { forUnit: 'period', date: sampleDate, credits_kWh: credits_kWh_to_apply } as any)
      out.push({ month: m, consumption: g.consumption, production: g.production, credits_kWh: credits_kWh_to_apply, tariffId: tariff?.header?.id || null, invoice: inv })
    }
    setResultsByMonth(out)
  }

  function runFromDeltas(){
    const raws = loadReadings()
    if (!raws || raws.length === 0){ setResultsByMonth([]); return }
    const deltas = computeDeltas(raws)
    // for each delta row, compute invoice using tariff active on that date
    const rows = deltas.map(d=>{
      const sampleDate = d.date
      const tariff = findActiveTariffForDate(sampleDate)
      const inv = computeInvoiceForPeriod(Number(d.consumption||0), Number(d.production||0), tariff, { forUnit: 'period', date: sampleDate, credits_kWh: Number((d as any).credit || 0) } as any)
      return {
        date: new Date(d.date).toISOString().split('T')[0],
        consumption_kWh: Number(d.consumption||0),
        tariffId: tariff?.header?.id || null,
        invoice: inv
      }
    })
    // store in resultsByMonth to reuse rendering area
    setResultsByMonth(rows)
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
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '11.111111%' }} />
                      <col style={{ width: '11.111111%' }} />
                      <col style={{ width: '11.111111%' }} />
                      <col style={{ width: '11.111111%' }} />
                      <col style={{ width: '11.111111%' }} />
                      <col style={{ width: '11.111111%' }} />
                      <col style={{ width: '11.111111%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="px-2 py-2 border border-white/10 bg-white/6 backdrop-blur-sm sticky top-0 text-center text-white text-xs">Fecha</th>
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
                        <tr key={idx} onClick={()=>{ setSelectedRow(r); setShowInvoice(true) }} className={`border-t border-white/5 ${idx % 2 === 0 ? 'bg-white/2' : ''} text-xs hover:bg-white/5 cursor-pointer`}>
                          <td className="px-1 py-1 border border-white/10 align-top whitespace-normal">{r.date}</td>
                          <td className="px-2 py-2 border border-white/10 text-right align-top whitespace-nowrap">
                            <div className="text-2xs text-gray-400">kWh</div>
                            <div className="font-medium text-xs">{Number(r.consumption_kWh || 0).toLocaleString()}</div>
                          </td>
                          <td className="px-1 py-1 border border-white/10 text-right align-top whitespace-nowrap">
                            <div className="text-2xs text-gray-400">{r.invoice?.tariff?.rates?.fixedCharge_Q ? `${Number(r.invoice.tariff.rates.fixedCharge_Q).toFixed(4)} Q` : '-'}</div>
                            <div className="font-medium text-xs">{currency(Number(r.invoice?.fixed_charge_Q || 0))}</div>
                          </td>
                          <td className="px-1 py-1 border border-white/10 text-right align-top whitespace-nowrap">
                            <div className="text-2xs text-gray-400">{r.invoice?.tariff?.rates?.energy_Q_per_kWh ? `${Number(r.invoice.tariff.rates.energy_Q_per_kWh).toFixed(6)} Q/kWh` : '-'}</div>
                            <div className="font-medium text-xs">{currency(Number(r.invoice?.energy_charge_Q || 0))}</div>
                          </td>
                          <td className="px-1 py-1 border border-white/10 text-right align-top whitespace-nowrap">
                            <div className="text-2xs text-gray-400">{r.invoice?.tariff?.rates?.distribution_Q_per_kWh ? `${Number(r.invoice.tariff.rates.distribution_Q_per_kWh).toFixed(6)} Q/kWh` : '-'}</div>
                            <div className="font-medium text-xs">{currency(Number(r.invoice?.distribution_charge_Q || 0))}</div>
                          </td>
                          <td className="px-1 py-1 border border-white/10 text-right align-top whitespace-nowrap">
                            <div className="text-2xs text-gray-400">{r.invoice?.tariff?.rates?.potencia_Q_per_kWh ? `${Number(r.invoice.tariff.rates.potencia_Q_per_kWh).toFixed(6)} Q/kWh` : '-'}</div>
                            <div className="font-medium text-xs">{currency(Number(r.invoice?.potencia_charge_Q || 0))}</div>
                          </td>
                          <td className="px-1 py-1 border border-white/10 text-right align-top whitespace-nowrap">
                            <div className="text-2xs text-gray-400">{r.invoice?.tariff?.rates?.contrib_percent != null ? `${Number(r.invoice.tariff.rates.contrib_percent)}%` : '-'}</div>
                            <div className="font-medium text-xs">{currency(Number(r.invoice?.contrib_amount_Q || 0))}</div>
                          </td>
                          <td className="px-1 py-1 border border-white/10 text-right align-top whitespace-nowrap">
                            <div className="text-2xs text-gray-400">{r.invoice?.tariff?.rates?.iva_percent != null ? `${Number(r.invoice.tariff.rates.iva_percent)}%` : '12%'}</div>
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
    </section>
  )
}
