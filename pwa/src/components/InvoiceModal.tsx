import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { getReadings, type ReadingRecord } from '../services/supabasePure'
import { extractTextFromPdf, parseSimpleInvoiceText } from '../utils/pdfClientValidator'

type Props = {
  open: boolean
  onClose: ()=>void
  row: any
}

export default function InvoiceModal({ open, onClose, row }: Props){
  const [readings, setReadings] = React.useState<ReadingRecord[]>([])
  const [pdfStatus, setPdfStatus] = React.useState<'idle'|'parsing'|'done'|'error'>('idle')
  const [parsedPdf, setParsedPdf] = React.useState<any | null>(null)

  React.useEffect(() => {
    if (open) {
      loadReadingsData()
    }
  }, [open])

  async function loadReadingsData() {
    try {
      const readingsData = await getReadings()
      setReadings(readingsData)
    } catch (error) {
      console.error('Error loading readings:', error)
    }
  }
  // Close modal with Escape key for convenience
  useEffect(()=>{
    function onKey(e: KeyboardEvent){ if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Focus management: focus the close button on open, restore previous focus on close
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const prevActiveRef = useRef<HTMLElement | null>(null)
  useEffect(()=>{
    if (open){
      try{ prevActiveRef.current = document.activeElement as HTMLElement }
      catch(e){ prevActiveRef.current = null }
      // focus after render
      setTimeout(()=>{ closeBtnRef.current?.focus() }, 0)
    } else {
      // restore
      try{ prevActiveRef.current?.focus && prevActiveRef.current?.focus() }catch(e){}
      prevActiveRef.current = null
    }
  }, [open])

  if (!open || !row) return null

  const invoice = row.invoice || {}
  // The tariff object can be at `row.tariff` (from Dashboard) or `row.invoice.tariff` (from Billing RPC)
  const rates = row.tariff?.rates || invoice?.tariff?.rates || invoice?.tariff || {}
  const lines = [
    { concept: 'Cargo fijo', rate: (rates.fixed_charge_q ?? rates.fixedCharge_Q) != null ? `${Number(rates.fixed_charge_q ?? rates.fixedCharge_Q).toFixed(4)} Q` : '-', amount: invoice.fixed_charge_Q || 0 },
    { concept: 'Energía neta', rate: (rates.energy_q_per_kwh ?? rates.energy_Q_per_kWh) != null ? `${Number(rates.energy_q_per_kwh ?? rates.energy_Q_per_kWh).toFixed(6)} Q/kWh` : '-', amount: invoice.energy_charge_Q || 0 },
    { concept: 'Distribución', rate: (rates.distribution_q_per_kwh ?? rates.distribution_Q_per_kWh) != null ? `${Number(rates.distribution_q_per_kwh ?? rates.distribution_Q_per_kWh).toFixed(6)} Q/kWh` : '-', amount: invoice.distribution_charge_Q || 0 },
    { concept: 'Potencia', rate: (rates.potencia_q_per_kwh ?? rates.potencia_Q_per_kWh) != null ? `${Number(rates.potencia_q_per_kwh ?? rates.potencia_Q_per_kWh).toFixed(6)} Q/kW` : '-', amount: invoice.potencia_charge_Q || 0 },
    { concept: 'Contrib. A.P.', rate: '-', amount: invoice.contrib_amount_Q || 0 },
    { concept: 'IVA', rate: (rates.iva_percent) != null ? `${Number(rates.iva_percent)}%` : '12%', amount: invoice.iva_amount_Q || 0 }
  ]

  const total = Number(invoice.total_due_Q || 0)

  async function onPdfFile(file?: File | null) {
    if (!file) return
    setPdfStatus('parsing')
    setParsedPdf(null)
    try {
      const text = await extractTextFromPdf(file)
      const parsed = parseSimpleInvoiceText(text)
      setParsedPdf({ parsed, rawTextSnippet: text.slice(0, 200) })
      setPdfStatus('done')
    } catch (e) {
      console.error('PDF parse error', e)
      setPdfStatus('error')
    }
  }

  // Attempt to locate associated cumulative readings (original readings array)
  // Billing builds rows from deltas where `row.date` is YYYY-MM-DD; find the matching
  // reading in the cumulative readings and its previous entry to show balances.
  let prevReading: ReadingRecord | null = null
  let currReading: ReadingRecord | null = null
  try{
    const all = readings
    const idx = all.findIndex((r: ReadingRecord)=> new Date(r.date).toISOString().split('T')[0] === (row.date || ''))
    if (idx >= 0){
      currReading = all[idx]
      if (idx > 0) prevReading = all[idx-1]
    }
  }catch(e){ /* ignore */ }

  const prevCons = prevReading ? Number(prevReading.consumption || 0) : null
  const prevProd = prevReading ? Number(prevReading.production || 0) : null
  const currCons = currReading ? Number(currReading.consumption || 0) : null
  const currProd = currReading ? Number(currReading.production || 0) : null
  const recibido = (currCons != null) ? (currCons - (prevCons || 0)) : (row.invoice?.consumption_kWh ?? null)
  const entregado = (currProd != null) ? (currProd - (prevProd || 0)) : (row.invoice?.production_kWh ?? null)


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="glass-card max-w-md sm:max-w-lg w-full p-4 z-10 text-white max-h-[80vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="invoice-title">
        <div className="flex items-start justify-between">
          <div>
            <h3 id="invoice-title" className="text-base font-semibold">Detalle de Factura</h3>
            <div className="text-xs text-gray-300">Fecha: {row.date || ''} — Consumo: {row.consumption_kWh ?? '-'} kWh</div>
            <div className="text-xs text-gray-300">Tarifa: {invoice?.tariff?.id || row.tariffId || 'N/A'}</div>
          </div>
          <button ref={closeBtnRef} className="glass-button p-2" title="Cerrar" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="mt-3">
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-300">
            <div className="font-medium">Concepto</div>
            <div className="font-medium">Valor / Tasa</div>
            <div className="font-medium text-right">Importe</div>
          </div>
          <div className="mt-2 space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 text-xs items-center">
                <div className="text-gray-200">{l.concept}</div>
                <div className="text-gray-400">{l.rate}</div>
                <div className="text-right text-gray-200">Q {Number(l.amount || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>

          {/* Lecturas asociadas (saldo anterior, recibido, entregado, saldo actual) */}
          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="text-xs font-medium text-gray-300">Lecturas asociadas</div>
            <div className="mt-2 text-xs text-gray-400">Fecha: {row.date || ''}</div>
            <div className="mt-2 text-xs text-gray-300">Lecturas</div>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-left text-xs text-gray-200 table-fixed border-collapse">
                <thead>
                  <tr>
                    <th className="p-1 text-2xs text-gray-300" style={{ fontSize: '10px' }}></th>
                    <th className="p-1 text-2xs text-gray-300" style={{ fontSize: '10px' }}>Saldo Anterior (kWh)</th>
                    <th className="p-1 text-2xs text-gray-300" style={{ fontSize: '10px' }}>Lectura Actual (kWh)</th>
                    <th className="p-1 text-2xs text-gray-300" style={{ fontSize: '10px' }}>Saldo (kWh)</th>
                    <th className="p-1 text-2xs text-gray-300" style={{ fontSize: '10px' }}>Resultado (kWh)</th>
                  </tr>
                </thead>
                <tbody>
                  {
                    (()=>{
                      const saldoCons = (currCons != null && prevCons != null) ? Number(currCons) - Number(prevCons) : (row.invoice?.consumption_kWh ?? null)
                      const saldoProd = (currProd != null && prevProd != null) ? Number(currProd) - Number(prevProd) : (row.invoice?.production_kWh ?? null)
                      const net = (saldoCons != null && saldoProd != null) ? Number(saldoCons) - Number(saldoProd) : null
                      return (
                        <>
                          <tr className="align-top">
                            <td className="p-1 font-medium">Consumo</td>
                            <td className="p-1">{prevCons != null ? prevCons.toLocaleString() : '-'}</td>
                            <td className="p-1">{currCons != null ? currCons.toLocaleString() : '-'}</td>
                            <td className="p-1">{saldoCons != null ? Number(saldoCons).toLocaleString() : '-'}</td>
                            <td className="p-1 text-base font-semibold text-right" rowSpan={2}>{net != null ? (Number(net)).toLocaleString() : '-'}</td>
                          </tr>
                          <tr className="align-top">
                            <td className="p-1 font-medium">Producción</td>
                            <td className="p-1">{prevProd != null ? prevProd.toLocaleString() : '-'}</td>
                            <td className="p-1">{currProd != null ? currProd.toLocaleString() : '-'}</td>
                            <td className="p-1">{saldoProd != null ? Number(saldoProd).toLocaleString() : '-'}</td>
                          </tr>
                        </>
                      )
                    })()
                  }
                </tbody>
              </table>
              <div className="mt-2 text-gray-400" style={{ fontSize: '10px' }}>Resultado positivo = consumo neto (se gastó más). Resultado negativo = excedente acumulado.</div>
            </div>
          </div>

          <div className="mt-3 border-t border-white/10 pt-3 flex justify-end items-center">
            <div className="text-xs text-gray-300 mr-4">Total</div>
            <div className="text-base font-semibold">Q {total.toFixed(2)}</div>
          </div>
        </div>

        {/* Footer close button removed - keeping top-right X only for compact UI */}
      </div>
    </div>
  )
}
