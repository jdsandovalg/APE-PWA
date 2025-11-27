import React, { useEffect, useState } from 'react'
import { getAllTariffs, createTariff, updateTariff, deleteTariff, getAllCompanies } from '../services/supabasePure'
import { TariffDetail } from '../types'
import { Save, Trash, PlusCircle, Edit, X } from 'lucide-react'
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
  const [items, setItems] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [modalForm, setModalForm] = useState<any | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null)

  // when nothing selected, let the list occupy the full grid width (avoid cramped layout)
  const leftCardSpan = selectedIdx === null ? 'md:col-span-3' : 'md:col-span-1'

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [tariffsData, companiesData] = await Promise.all([
        getAllTariffs(),
        getAllCompanies()
      ])
      setItems(tariffsData)
      setCompanies(companiesData)
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Error al cargar datos', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function persist(next: any[]){
    setItems(next)
    // Note: Individual tariff operations are handled by create/update/delete functions
    // The local state is updated immediately for better UX
    try{ showToast('Tarifas actualizadas correctamente', 'success') }catch(e){}
  }

  async function addNew(){
    const today = new Date()
    const from = new Date(today.getFullYear(), today.getMonth(), 1)
    const to = new Date(from); to.setMonth(from.getMonth()+2); // quarterly approx
    const defaultCompany = companies.length > 0 ? companies[0].id : 'EEGSA'
    const defaultSegment = 'BTSA'
    const found = companies.find(c => c.id === defaultCompany)
    const header: any = {
      id: makeId(defaultCompany, defaultSegment, from.toISOString().slice(0,10), to.toISOString().slice(0,10)),
      company: defaultCompany,
      companyCode: found?.code || undefined,
      segment: defaultSegment,
      period: { from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10) },
      currency: 'GTQ'
    }
    const s: any = { header, rates: emptyRates() }

    // Don't create the tariff immediately, just open the modal for editing
    setModalForm(s)
    setShowEditModal(true)
  }

  function requestRemoveAt(i:number){
    setPendingDeleteIndex(i)
    setShowDeleteConfirm(true)
  }

  async function executeRemovePending(){
    const i = pendingDeleteIndex
    if (i === null || !items[i]) return

    try {
      await deleteTariff(items[i].header.id)
      await loadData() // Reload all data
      setSelectedIdx(null)
      setPendingDeleteIndex(null)
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Error deleting tariff:', error)
      showToast('Error al eliminar tarifa', 'error')
    }
  }

  function updateSelected(partial: Partial<any>){
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
      const header: any = {
        id: t.id || makeId(t.company||'EEGSA', t.segment||'BTSA', t.period?.from||t.period_from||'2025-08-01', t.period?.to||t.period_to||'2025-10-31'),
        company: t.company||'EEGSA',
        companyCode: undefined,
        segment: t.segment||'BTSA',
        period: t.period || { from: t.period_from || '2025-08-01', to: t.period_to || '2025-10-31' },
        currency: t.currency||'GTQ',
        sourcePdf: t.pdf || t.sourcePdf || 'Octubre2025.pdf'
      }
      // try to fill companyCode from companies
      const found = companies.find(c => c.id === header.company)
      if (found && found.code) header.companyCode = found.code

      const rates = {
        fixedCharge_Q: Number(t.rates?.fixedCharge_Q ?? t.rates?.fixedCharge_Q ?? t.fixedCharge_Q ?? 0),
        energy_Q_per_kWh: Number(t.rates?.energy_Q_per_kWh ?? t.energy_Q_per_kWh ?? t.rates?.energy ?? 0),
        distribution_Q_per_kWh: Number(t.rates?.distribution_Q_per_kWh ?? t.distribution_Q_per_kWh ?? 0),
        potencia_Q_per_kWh: Number(t.rates?.potencia_Q_per_kWh ?? t.potencia_Q_per_kWh ?? 0),
        contrib_percent: Number(t.rates?.contribucion_AP_percent ?? t.rates?.contrib_percent ?? t.contrib_percent ?? 0),
        iva_percent: Number(t.rates?.iva_percent ?? t.iva_percent ?? 12)
      }

      const tariffSet = { header, rates }
      await createTariff(tariffSet)
      await loadData() // Reload all data
      setSelectedIdx(items.length) // Select the newly added item
    }catch(err){
      try{ showToast('Error importando: '+String(err), 'error') }catch(e){}
    }
  }

  async function syncFromSupabase(){
    // Since we're now using Supabase directly, just reload data
    try {
      await loadData()
      showToast('Datos recargados desde Supabase', 'success')
    } catch (error) {
      showToast('Error recargando datos: ' + String(error), 'error')
    }
  }

  if (loading) {
    return (
      <section>
        <div className="text-center text-gray-400 py-8">
          Cargando tarifas...
        </div>
      </section>
    )
  }

  return (
    <>
    <section>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`card ${leftCardSpan} col-span-1 w-full`}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg">Trimestres / Tarifas</h3>
            <div className="flex gap-2">
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
                  const comp = companies.find(c=> c.id === val)
                  setModalForm({ ...modalForm, header: { ...modalForm.header, company: val, companyCode: comp?.code || modalForm.header.companyCode } })
                }}>
                  {companies.map(c=> (<option key={c.id} value={c.id}>{c.id} — {c.name}{c.code? ` (${c.code})`:''}</option>))}
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
              <button className="glass-button p-1 bg-green-600 text-white flex items-center gap-2 text-sm" title="Guardar tarifa" aria-label="Guardar tarifa" onClick={async ()=>{
                // persist modalForm back into items with validations
                if (!modalForm) return
                // required header fields
                const hdr = modalForm.header || {} as any
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

                try {
                  // Check if this is an existing tariff or new one
                  const existingTariff = items.find(item => item.header.id === modalForm.header.id)
                  if (existingTariff) {
                    // Update existing
                    await updateTariff(modalForm.header.id, modalForm)
                  } else {
                    // Create new
                    await createTariff(modalForm)
                  }

                  await loadData() // Reload all data
                  setShowEditModal(false)
                  setModalForm(null)
                  setSelectedIdx(null)
                } catch (error) {
                  console.error('Error saving tariff:', error)
                  showToast('Error al guardar tarifa', 'error')
                }
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
