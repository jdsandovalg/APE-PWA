import React from 'react'
import { X, FileText, Bug } from 'lucide-react'
import { extractTextFromPdf, parseSimpleInvoiceText, parseInvoiceDetailed } from '../utils/pdfClientValidator'
import { showToast } from '../services/toast'

type Props = {
  open: boolean
  onClose: ()=>void
  row: any
}

function currency(v:number){ return `Q ${v.toFixed(2)}` }

export default function InvoiceCompareModal({ open, onClose, row }: Props){
  const [status, setStatus] = React.useState<'idle'|'parsing'|'done'|'error'>('idle')
  const [parsed, setParsed] = React.useState<any | null>(null)
  const [showDebug, setShowDebug] = React.useState<boolean>(false)

  React.useEffect(()=>{
    if (!open) {
      setStatus('idle')
      setParsed(null)
    }
  }, [open])
  const invoice = row?.invoice || {}
  const total = Number(invoice.total_due_Q || 0)
  const systemTotal = Number(row?.invoice?.total_due_Q ?? row?.invoice?.invoice?.total_due_Q ?? invoice?.total_due_Q ?? total ?? 0)
  const tol = 0.05

  if (!open || !row) return null

  async function onFile(f?: File | null){
    if (!f) return
    setStatus('parsing')
    try{
      const text = await extractTextFromPdf(f)
      const p = parseInvoiceDetailed(text)
      const simple = parseSimpleInvoiceText(text)
      setParsed({ p, simple, snippet: text.slice(0,200) })
      setStatus('done')
      // compute diff vs system and show toast if mismatches
      try{
        const diffs: any[] = []
        const sys = invoice || {}
        const num = (v:any)=> typeof v === 'number' ? v : (v? Number(v) : 0)
        const check = (key:string, label:string, pdfVal:any, sysVal:any, tol=0.05)=>{
          const pv = pdfVal != null ? Number(pdfVal) : null
          const sv = sysVal != null ? Number(sysVal) : null
          if (pv == null || sv == null) return
          const d = +(pv - sv)
          if (Math.abs(d) > tol) diffs.push({ field: label, pdf: pv, system: sv, diff: d })
        }
        check('fixed_charge', 'Cargo fijo', p.fixed_charge || p.fixed_charge_rate, sys.fixed_charge_Q || sys.invoice?.fixed_charge_Q || sys.invoice?.fixed_charge_Q)
        check('energy_amount', 'Energía', p.energy_amount, sys.energy_charge_Q || sys.invoice?.energy_charge_Q)
        check('distribution_amount', 'Distribución', p.distribution_amount, sys.distribution_charge_Q || sys.invoice?.distribution_charge_Q)
        check('potencia_amount', 'Potencia', p.potencia_amount, sys.potencia_charge_Q || sys.invoice?.potencia_charge_Q)
        check('contrib_amount', 'Contribución A.P.', p.contrib_amount, sys.contrib_amount_Q || sys.invoice?.contrib_amount_Q)
        check('iva_amount', 'IVA', p.iva_amount, sys.iva_amount_Q || sys.invoice?.iva_amount_Q)
        check('total', 'Total factura', p.total, sys.total_due_Q || sys.invoice?.total_due_Q)

        if (diffs.length > 0){
          const summary = diffs.map(d=>`${d.field}: PDF=${d.pdf.toFixed(2)} Sys=${d.system.toFixed(2)} Δ=${d.diff.toFixed(2)}`).join(' ; ')
          showToast(`Diferencias detectadas: ${summary}`, 'warning', 8000)
        } else {
          showToast('Factura coincide con el sistema', 'success', 3500)
        }
      }catch(e){ console.error('diff compute failed', e); showToast('Error al comparar PDF con sistema', 'error', 6000) }
    }catch(e){
      console.error('compare parse error', e)
      setStatus('error')
    }
  }

  const rates = invoice?.tariff || {}
  const lines = [
    { concept: 'Cargo fijo', rate: rates.fixed_charge_q != null ? `${Number(rates.fixed_charge_q).toFixed(4)} Q` : '-', amount: invoice.fixed_charge_Q || 0 },
    { concept: 'Energía neta', rate: rates.energy_q_per_kwh != null ? `${Number(rates.energy_q_per_kwh).toFixed(6)} Q/kWh` : '-', amount: invoice.energy_charge_Q || 0 },
    { concept: 'Distribución', rate: rates.distribution_q_per_kwh != null ? `${Number(rates.distribution_q_per_kwh).toFixed(6)} Q/kWh` : '-', amount: invoice.distribution_charge_Q || 0 },
    { concept: 'Potencia', rate: rates.potencia_q_per_kwh != null ? `${Number(rates.potencia_q_per_kwh).toFixed(6)} Q/kW` : '-', amount: invoice.potencia_charge_Q || 0 },
    { concept: 'Contrib. A.P.', rate: '-', amount: invoice.contrib_amount_Q || 0 },
    { concept: 'IVA', rate: rates.iva_percent != null ? `${Number(rates.iva_percent)}%` : '12%', amount: invoice.iva_amount_Q || 0 }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="glass-card max-w-md sm:max-w-2xl w-full p-4 z-10 text-white max-h-[85vh] overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} />
            <div className="flex flex-col">
              <h3 className="text-base font-semibold">Comparar factura</h3>
                <div className="text-xs text-gray-300">Fecha: {row.date || ''} — Tarifa: {invoice?.tariff?.id || 'N/A'}</div>
                <div className="text-sm font-semibold text-white mt-1">Total (Sistema): {`Q ${systemTotal.toFixed(2)}`}</div>
                {/* header diff removed to avoid confusing the user; analysis is visual now */}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="glass-button p-2" title="Debug" onClick={()=>setShowDebug(s=>!s)} aria-pressed={showDebug}><Bug size={14} /></button>
            <button className="glass-button p-2" title="Cerrar" onClick={onClose}><X size={14} /></button>
          </div>
        </div>

        {showDebug && (
          <div className="mt-2 p-2 bg-white/5 rounded text-2xs text-gray-200">
            <div className="font-medium">Debug info</div>
            <div className="mt-1 text-2xs text-gray-300">systemTotal: Q {systemTotal.toFixed(2)}</div>
            <div className="mt-1 text-2xs text-gray-300">pdf raw total: {parsed?.p?.total ?? parsed?.simple?.total ?? 'n/a'}</div>
            <div className="mt-1 text-2xs text-gray-300">pdf coerced total: {parsed ? Number(parsed.p?.total ?? parsed.simple?.total ?? NaN) : 'n/a'}</div>
            <div className="mt-2 max-h-40 overflow-auto bg-black/20 p-2 rounded text-2xs">
              <pre className="whitespace-pre-wrap break-words">{parsed ? JSON.stringify(parsed, null, 2) : 'no parsed data'}</pre>
            </div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-300">
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

        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="text-xs text-gray-300">Subir PDF para comparar</div>
          <div className="mt-2 flex items-center gap-2">
            <input type="file" accept="application/pdf" onChange={(e)=> onFile(e.target.files?.[0] ?? null)} />
            {status === 'parsing' && <div className="text-2xs text-gray-400">Analizando...</div>}
            {status === 'error' && <div className="text-2xs text-rose-400">Error al leer PDF</div>}
            {status === 'done' && <div className="text-2xs text-emerald-400">PDF procesado</div>}
          </div>

          {parsed && (
            <div className="mt-3 bg-white/3 p-2 rounded text-xs" role="region" aria-label="Comparación PDF vs Sistema">
              <div className="grid grid-cols-3 gap-2">
                <div className="font-medium">Campo</div>
                <div className="font-medium">PDF</div>
                <div className="font-medium">Sistema</div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div>Fecha</div>
                <div>{parsed.p.date ?? parsed.simple?.date ?? '-'}</div>
                <div>{row.date ?? '-'}</div>
                <div>Contador</div>
                <div>{parsed.p.meter ?? parsed.simple?.meter ?? '-'}</div>
                <div>{row.invoice?.meter || '-'}</div>
                <div>Cargo fijo</div>
                <div>{parsed.p.fixed_charge != null ? `Q ${parsed.p.fixed_charge.toFixed(2)}` : '-'}</div>
                <div>{row.invoice?.fixed_charge_Q != null ? `Q ${Number(row.invoice.fixed_charge_Q).toFixed(2)}` : '-'}</div>
                <div>Energía</div>
                <div>{parsed.p.energy_amount != null ? `Q ${parsed.p.energy_amount.toFixed(2)}` : '-'}</div>
                <div>{row.invoice?.energy_charge_Q != null ? `Q ${Number(row.invoice.energy_charge_Q).toFixed(2)}` : '-'}</div>
                <div>Distribución</div>
                <div>{parsed.p.distribution_amount != null ? `Q ${parsed.p.distribution_amount.toFixed(2)}` : '-'}</div>
                <div>{row.invoice?.distribution_charge_Q != null ? `Q ${Number(row.invoice.distribution_charge_Q).toFixed(2)}` : '-'}</div>
                <div>Potencia</div>
                <div>{parsed.p.potencia_amount != null ? `Q ${parsed.p.potencia_amount.toFixed(2)}` : '-'}</div>
                <div>{row.invoice?.potencia_charge_Q != null ? `Q ${Number(row.invoice.potencia_charge_Q).toFixed(2)}` : '-'}</div>
                <div>Contrib. A.P.</div>
                <div>{parsed.p.contrib_amount != null ? `Q ${parsed.p.contrib_amount.toFixed(2)}` : '-'}</div>
                <div>{row.invoice?.contrib_amount_Q != null ? `Q ${Number(row.invoice.contrib_amount_Q).toFixed(2)}` : '-'}</div>
                <div>IVA</div>
                <div>{parsed.p.iva_amount != null ? `Q ${parsed.p.iva_amount.toFixed(2)}` : '-'}</div>
                <div>{row.invoice?.iva_amount_Q != null ? `Q ${Number(row.invoice.iva_amount_Q).toFixed(2)}` : '-'}</div>
                <div>Total cargos (sin IVA)</div>
                <div>{parsed.p.total_cargo_sin_iva != null ? `Q ${parsed.p.total_cargo_sin_iva.toFixed(2)}` : '-'}</div>
                <div>{row.invoice?.total_cargo_sin_iva_Q != null ? `Q ${Number(row.invoice.total_cargo_sin_iva_Q).toFixed(2)}` : '-'}</div>
                <div>Subtotal</div>
                <div>{parsed.p.total_cargo_con_iva != null ? `Q ${parsed.p.total_cargo_con_iva.toFixed(2)}` : '-'}</div>
                <div>{row.invoice?.subtotal_Q != null ? `Q ${Number(row.invoice.subtotal_Q).toFixed(2)}` : (row.invoice?.total_cargo_con_iva ? `Q ${Number(row.invoice.total_cargo_con_iva).toFixed(2)}` : '-')}</div>
                <div>Créditos</div>
                <div>{parsed.p.credits_Q != null ? `Q ${parsed.p.credits_Q.toFixed(2)}` : '-'}</div>
                <div>{row.invoice?.credits_Q != null ? `Q ${Number(row.invoice.credits_Q).toFixed(2)}` : '-'}</div>
                <div>Total Q</div>
                <div>{parsed.p.total != null ? `Q ${parsed.p.total.toFixed(2)}` : '-'}</div>
                <div>{`Q ${systemTotal.toFixed(2)}`}</div>
                <div> Diferencia</div>
                <div>{parsed.p.total != null ? `Q ${(parsed.p.total - systemTotal).toFixed(2)}` : '-'}</div>
                <div></div>
              </div>
              <div className="mt-2 text-2xs text-gray-300">Extracto: {parsed.snippet}</div>
              <div className="mt-2 flex gap-2">
                <button className="glass-button px-2 py-1 text-2xs" onClick={()=>{
                  const diff = {
                    pdf: parsed.p,
                    simple: parsed.simple,
                    system: invoice
                  }
                  const blob = new Blob([JSON.stringify(diff, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `diff-${invoice?.tariff?.id || 'invoice'}-${invoice?.id || invoice?.invoice?.id || invoice?.invoice_id || 'row'}.json`
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                  URL.revokeObjectURL(url)
                }}>Descargar diff</button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button className="glass-button px-3 py-1" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
