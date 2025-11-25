import React, { useEffect, useState } from 'react'
import { loadTariffs, saveTariffs, TariffSet, TariffDetail, TariffHeader, loadCompanies } from '../services/storage'
import { Save, Trash, PlusCircle, Upload, Edit, X, RefreshCw } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import { showToast } from '../services/toast'

function emptyRates(): TariffDetail {
  return { fixedCharge_Q:0, energy_Q_per_kWh:0, distribution_Q_per_kWh:0, potencia_Q_per_kWh:0, contrib_percent:0, iva_percent:0 }
}

function makeId(company:string,segment:string,from:string,to:string){
  const a = company.replace(/\s+/g,'') || 'C';
  const b = segment.replace(/\s+/g,'') || 'S';
  return `${a}-${b}-${from.replace(/-/g,'')}_${to.replace(/-/g,'')}`
}

export default function Tariffs(){
  const [items, setItems] = useState<TariffSet[]>([])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [modalForm, setModalForm] = useState<TariffSet | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null)

  // when nothing selected, let the list occupy the full grid width (avoid cramped layout)
  const leftCardSpan = selectedIdx === null ? 'md:col-span-3' : 'md:col-span-1'

  useEffect(()=>{
    const t = loadTariffs()
    setItems(t)
  },[])

  function persist(next: TariffSet[]){
    setItems(next)
    saveTariffs(next)
    try{ showToast('Tarifas guardadas correctamente', 'success') }catch(e){}
  }

  function addNew(){
    const today = new Date()
    const from = new Date(today.getFullYear(), today.getMonth(), 1)
    const to = new Date(from); to.setMonth(from.getMonth()+2); // quarterly approx
    const defaultCompany = 'EEGSA'
    const defaultSegment = 'BTSA'
    const comps = loadCompanies()
    const found = comps.find(c=> c.id === defaultCompany)
    const header: TariffHeader = { id: makeId(defaultCompany,defaultSegment, from.toISOString().slice(0,10), to.toISOString().slice(0,10)), company: defaultCompany, companyCode: found?.code || undefined, segment: defaultSegment, period: { from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10) }, currency: 'GTQ' }
    const s: TariffSet = { header, rates: emptyRates() }
    const next = [...items, s]
    persist(next)
    setSelectedIdx(next.length-1)
    setModalForm(s)
    setShowEditModal(true)
  }

  function requestRemoveAt(i:number){
    setPendingDeleteIndex(i)
    setShowDeleteConfirm(true)
  }

  function executeRemovePending(){
    const i = pendingDeleteIndex
    if (i === null) return
    const next = items.slice(); next.splice(i,1)
    persist(next)
    setSelectedIdx(null)
    setPendingDeleteIndex(null)
    setShowDeleteConfirm(false)
  }

  function updateSelected(partial: Partial<TariffSet>){
    if (selectedIdx === null) return
    const next = items.map((it,idx)=> idx===selectedIdx ? { ...it, ...partial, header: { ...it.header, ...(partial.header||{}) }, rates: { ...it.rates, ...(partial.rates||{}) } } : it)
    setItems(next)
  }

  async function importFromJson(){
    try{
      const res = await fetch('/scripts/tariffs_Octubre2025.json')
      if (!res.ok) throw new Error('No encontrado')
      const t = await res.json()
      // try to map to TariffSet shape
      const header: TariffHeader = {
        id: t.id || makeId(t.company||'EEGSA', t.segment||'BTSA', t.period?.from||t.period_from||'2025-08-01', t.period?.to||t.period_to||'2025-10-31'),
        company: t.company||'EEGSA',
        companyCode: undefined,
        segment: t.segment||'BTSA',
        period: t.period || { from: t.period_from || '2025-08-01', to: t.period_to || '2025-10-31' },
        currency: t.currency||'GTQ',
        sourcePdf: t.pdf || t.sourcePdf || 'Octubre2025.pdf'
      }
      // try to fill companyCode from companies master
      try{ const comps = loadCompanies(); const found = comps.find(c=> c.id === header.company); if (found && found.code) header.companyCode = found.code }catch(e){}
      const rates = {
        fixedCharge_Q: Number(t.rates?.fixedCharge_Q ?? t.rates?.fixedCharge_Q ?? t.fixedCharge_Q ?? 0),
        energy_Q_per_kWh: Number(t.rates?.energy_Q_per_kWh ?? t.energy_Q_per_kWh ?? t.rates?.energy ?? 0),
        distribution_Q_per_kWh: Number(t.rates?.distribution_Q_per_kWh ?? t.distribution_Q_per_kWh ?? 0),
        potencia_Q_per_kWh: Number(t.rates?.potencia_Q_per_kWh ?? t.potencia_Q_per_kWh ?? 0),
        contrib_percent: Number(t.rates?.contribucion_AP_percent ?? t.rates?.contrib_percent ?? t.contrib_percent ?? 0),
        iva_percent: Number(t.rates?.iva_percent ?? t.iva_percent ?? 12)
      }
      const next = [...items, { header, rates }]
      persist(next)
      setSelectedIdx(next.length-1)
    }catch(err){
      try{ showToast('Error importando: '+String(err), 'error') }catch(e){}
    }
  }

  async function syncFromSupabase(){
    try{
      const { syncTariffsFromSupabase } = await import('../services/supabase')
      await syncTariffsFromSupabase()
      const t = loadTariffs()
      setItems(t)
      try{ showToast('Tarifas sincronizadas desde Supabase', 'success') }catch(e){}
    }catch(err){
      try{ showToast('Error sincronizando: '+String(err), 'error') }catch(e){}
    }
  }

  return (
    <>
    <section>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`card ${leftCardSpan} col-span-1 w-full`}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg">Trimestres / Tarifas</h3>
            <div className="flex gap-2">
              <button title="Sincronizar desde Supabase" className="btn-ghost" onClick={syncFromSupabase}><RefreshCw size={16} /></button>
              <button title="Importar desde PDF detectado" className="btn-ghost" onClick={importFromJson}><Upload size={16} /></button>
              <button className="btn-primary" onClick={addNew}><PlusCircle size={16} /> Nuevo</button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {items.length===0 && <div className="text-sm text-gray-400">No hay tarifas registradas.</div>}
            {items.map((it,idx)=> (
              <div key={it.header.id} className={`p-3 rounded border w-full ${selectedIdx===idx? 'border-blue-400 bg-white/5':'border-transparent hover:border-gray-700'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{it.header.company} — {it.header.segment}</div>
                    <div className="text-xs text-gray-400">{it.header.period.from} → {it.header.period.to}</div>
                    <div className="mt-1 text-xs">
                      <div className="grid grid-cols-2 gap-1">
                        <span>Fijo: Q {it.rates.fixedCharge_Q?.toFixed(2) || '0.00'}</span>
                        <span>Energía: Q {it.rates.energy_Q_per_kWh?.toFixed(4) || '0.0000'}/kWh</span>
                        <span>Dist: Q {it.rates.distribution_Q_per_kWh?.toFixed(4) || '0.0000'}/kWh</span>
                        <span>IVA: {it.rates.iva_percent || 0}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <button title="Editar" className="btn-ghost" onClick={()=>{ setSelectedIdx(idx); setModalForm(items[idx]); setShowEditModal(true) }}><Edit size={16} /></button>
                    <button aria-label={`Eliminar tarifa ${it.header.id}`} className="btn-ghost text-red-400 flex items-center justify-center p-1" onClick={()=>requestRemoveAt(idx)} title="Eliminar"><Trash size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedIdx !== null && (
          <div className="card md:col-span-2 col-span-1 w-full">
            <div>
              <h3 className="text-lg">Editar Tarifa — {items[selectedIdx].header.id}</h3>
              <div className="mt-2">
                <div className="font-medium">{items[selectedIdx].header.company} · {items[selectedIdx].header.segment}</div>
                <div className="text-xs text-gray-400">{items[selectedIdx].header.period.from} → {items[selectedIdx].header.period.to}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
      {showEditModal && modalForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setShowEditModal(false)} />
          <div className="glass-card max-w-md sm:max-w-lg w-full p-4 z-10 text-white max-h-[80vh] overflow-y-auto">
            <h3 className="text-base">Editar Tarifa — {modalForm.header.id}</h3>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-xs text-gray-300">Empresa</label>
                <select className="mt-1 p-1 rounded bg-transparent border border-gray-700 w-full text-sm" value={modalForm.header.company} onChange={e=> {
                  const val = e.target.value
                  const comp = loadCompanies().find(c=> c.id === val)
                  setModalForm({ ...modalForm, header: { ...modalForm.header, company: val, companyCode: comp?.code || modalForm.header.companyCode } })
                }}>
                  {loadCompanies().map(c=> (<option key={c.id} value={c.id}>{c.id} — {c.name}{c.code? ` (${c.code})`:''}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-300">Segmento</label>
                <input value={modalForm.header.segment} onChange={e=> setModalForm({ ...modalForm, header: { ...modalForm.header, segment: e.target.value } })} className="mt-1 p-1 rounded bg-transparent border border-gray-700 w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-300">Periodo desde</label>
                <input type="date" value={modalForm.header.period.from} onChange={e=> setModalForm({ ...modalForm, header: { ...modalForm.header, period: { ...modalForm.header.period, from: e.target.value } } })} className="mt-1 p-1 rounded bg-transparent border border-gray-700 w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-300">Periodo hasta</label>
                <input type="date" value={modalForm.header.period.to} onChange={e=> setModalForm({ ...modalForm, header: { ...modalForm.header, period: { ...modalForm.header.period, to: e.target.value } } })} className="mt-1 p-1 rounded bg-transparent border border-gray-700 w-full text-sm" />
              </div>
            </div>

            <hr className="my-2 border-gray-700" />

            <h4 className="font-medium text-sm">Detalles de tarifas (Q / %)</h4>
              <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-xs text-gray-300">Cargo fijo (Q)</label>
                <input type="number" step="0.000001" value={modalForm.rates.fixedCharge_Q} onChange={e=> setModalForm({ ...modalForm, rates: { ...modalForm.rates, fixedCharge_Q: Number(e.target.value) } })} className="mt-1 p-1 rounded bg-transparent border border-gray-700 w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-300">Energía (Q/kWh)</label>
                <input type="number" step="0.000001" value={modalForm.rates.energy_Q_per_kWh} onChange={e=> setModalForm({ ...modalForm, rates: { ...modalForm.rates, energy_Q_per_kWh: Number(e.target.value) } })} className="mt-1 p-1 rounded bg-transparent border border-gray-700 w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-300">Distribución (Q/kWh)</label>
                <input type="number" step="0.000001" value={modalForm.rates.distribution_Q_per_kWh} onChange={e=> setModalForm({ ...modalForm, rates: { ...modalForm.rates, distribution_Q_per_kWh: Number(e.target.value) } })} className="mt-1 p-1 rounded bg-transparent border border-gray-700 w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-300">Potencia (Q/kWh)</label>
                <input type="number" step="0.000001" value={modalForm.rates.potencia_Q_per_kWh} onChange={e=> setModalForm({ ...modalForm, rates: { ...modalForm.rates, potencia_Q_per_kWh: Number(e.target.value) } })} className="mt-1 p-1 rounded bg-transparent border border-gray-700 w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-300">Contribución A.P. (%)</label>
                <input type="number" step="0.01" value={modalForm.rates.contrib_percent} onChange={e=> setModalForm({ ...modalForm, rates: { ...modalForm.rates, contrib_percent: Number(e.target.value) } })} className="mt-1 p-1 rounded bg-transparent border border-gray-700 w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-300">IVA (%)</label>
                <input type="number" step="0.01" value={modalForm.rates.iva_percent} onChange={e=> setModalForm({ ...modalForm, rates: { ...modalForm.rates, iva_percent: Number(e.target.value) } })} className="mt-1 p-1 rounded bg-transparent border border-gray-700 w-full text-sm" />
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button className="glass-button p-1 flex items-center gap-2 text-sm" title="Cancelar" aria-label="Cancelar" onClick={()=> { setShowEditModal(false); setSelectedIdx(null); }}><X size={12} /><span className="hidden md:inline">Cancelar</span></button>
              <button className="glass-button p-1 bg-green-600 text-white flex items-center gap-2 text-sm" title="Guardar tarifa" aria-label="Guardar tarifa" onClick={()=>{
                // persist modalForm back into items with validations
                if (!modalForm) return
                // required header fields
                const hdr = modalForm.header || {} as TariffHeader
                if (!hdr.company || !hdr.company.trim()){ try{ showToast('Seleccione la empresa para esta tarifa', 'error') }catch(e){}; return }
                // companyCode is mandatory per new rule
                if (!hdr.companyCode || !String(hdr.companyCode).trim()){ try{ showToast('El código de empresa (companyCode) es obligatorio. Defínalo en Empresas antes de guardar.', 'error') }catch(e){}; return }
                if (!hdr.segment || !hdr.segment.trim()){ try{ showToast('El segmento es obligatorio', 'error') }catch(e){}; return }
                if (!hdr.period || !hdr.period.from || !hdr.period.to){ try{ showToast('Periodo inválido. Verifique fechas desde/hasta.', 'error') }catch(e){}; return }
                // validate date order
                try{
                  const fromD = new Date(hdr.period.from)
                  const toD = new Date(hdr.period.to)
                  if (isNaN(fromD.getTime()) || isNaN(toD.getTime()) || fromD.getTime() > toD.getTime()){ try{ showToast('Periodo inválido: la fecha "desde" debe ser anterior o igual a "hasta".', 'error') }catch(e){}; return }
                }catch(e){ try{ showToast('Periodo inválido', 'error') }catch(e){}; return }
                // ensure id exists (regenerate if needed)
                if (!hdr.id || hdr.id.trim() === '') hdr.id = makeId(hdr.company || 'X', hdr.segment || 'S', hdr.period.from || '0000-00-00', hdr.period.to || '0000-00-00')
                const next = items.map(it => it.header.id === modalForm.header.id ? modalForm : it)
                persist(next)
                setShowEditModal(false)
                setModalForm(null)
                setSelectedIdx(null)
              }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <ConfirmModal
          open={showDeleteConfirm}
          title="Eliminar tarifa"
          message="¿Eliminar este registro de tarifas? Esta acción no se puede deshacer."
          onCancel={()=>{ setShowDeleteConfirm(false); setPendingDeleteIndex(null) }}
          onConfirm={executeRemovePending}
          confirmText="Eliminar"
        />
      )}
    </>
  )
}
