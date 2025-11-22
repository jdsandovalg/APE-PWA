import React, { useEffect, useState } from 'react'
import { loadTariffs, saveTariffs, TariffSet, TariffDetail, TariffHeader } from '../services/storage'
import { Save, Trash, PlusCircle, Upload } from 'lucide-react'
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null)

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
    const header: TariffHeader = { id: makeId('EEGSA','BTSA', from.toISOString().slice(0,10), to.toISOString().slice(0,10)), company: 'EEGSA', segment: 'BTSA', period: { from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10) }, currency: 'GTQ' }
    const s: TariffSet = { header, rates: emptyRates() }
    const next = [...items, s]
    persist(next)
    setSelectedIdx(next.length-1)
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
        segment: t.segment||'BTSA',
        period: t.period || { from: t.period_from || '2025-08-01', to: t.period_to || '2025-10-31' },
        currency: t.currency||'GTQ',
        sourcePdf: t.pdf || t.sourcePdf || 'Octubre2025.pdf'
      }
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

  function saveChanges(){ persist(items) }

  return (
    <>
    <section>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card md:col-span-1 col-span-1 w-full">
          <div className="flex items-center justify-between">
            <h3 className="text-lg">Trimestres / Tarifas</h3>
            <div className="flex gap-2">
              <button title="Importar desde PDF detectado" className="btn-ghost" onClick={importFromJson}><Upload size={16} /></button>
              <button className="btn-primary" onClick={addNew}><PlusCircle size={16} /> Nuevo</button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {items.length===0 && <div className="text-sm text-gray-400">No hay tarifas registradas.</div>}
            {items.map((it,idx)=> (
              <div key={it.header.id} className={`p-2 rounded border w-full ${selectedIdx===idx? 'border-blue-400 bg-white/5':'border-transparent hover:border-gray-700'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{it.header.company} — {it.header.segment}</div>
                    <div className="text-xs text-gray-400">{it.header.period.from} → {it.header.period.to}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn-ghost" onClick={()=>setSelectedIdx(idx)}>Editar</button>
                    <button aria-label={`Eliminar tarifa ${it.header.id}`} className="btn-ghost text-red-400 flex items-center justify-center p-1" onClick={()=>requestRemoveAt(idx)} title="Eliminar"><Trash size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card md:col-span-2 col-span-1 w-full">
          {selectedIdx===null ? (
            <div className="text-gray-300">Selecciona un trimestre a la izquierda para editar sus valores. Puedes importar el archivo extraído o crear uno nuevo.</div>
          ) : (
            <div>
              <h3 className="text-lg">Editar Tarifa — {items[selectedIdx].header.id}</h3>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm text-gray-300">Empresa</label>
                  <input value={items[selectedIdx].header.company} onChange={e=> updateSelected({ header: { company: e.target.value } })} className="mt-2 p-2 rounded bg-transparent border border-gray-700 w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300">Segmento</label>
                  <input value={items[selectedIdx].header.segment} onChange={e=> updateSelected({ header: { segment: e.target.value } })} className="mt-2 p-2 rounded bg-transparent border border-gray-700 w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300">Periodo desde</label>
                  <input type="date" value={items[selectedIdx].header.period.from} onChange={e=> updateSelected({ header: { period: { ...items[selectedIdx].header.period, from: e.target.value } } })} className="mt-2 p-2 rounded bg-transparent border border-gray-700 w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300">Periodo hasta</label>
                  <input type="date" value={items[selectedIdx].header.period.to} onChange={e=> updateSelected({ header: { period: { ...items[selectedIdx].header.period, to: e.target.value } } })} className="mt-2 p-2 rounded bg-transparent border border-gray-700 w-full" />
                </div>
              </div>

              <hr className="my-4 border-gray-700" />

              <h4 className="font-medium">Detalles de tarifas (Q / %) </h4>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-sm text-gray-300">Cargo fijo (Q)</label>
                  <input type="number" step="0.000001" value={items[selectedIdx].rates.fixedCharge_Q} onChange={e=> updateSelected({ rates: { fixedCharge_Q: Number(e.target.value) } })} className="mt-2 p-2 rounded bg-transparent border border-gray-700 w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300">Energía (Q/kWh)</label>
                  <input type="number" step="0.000001" value={items[selectedIdx].rates.energy_Q_per_kWh} onChange={e=> updateSelected({ rates: { energy_Q_per_kWh: Number(e.target.value) } })} className="mt-2 p-2 rounded bg-transparent border border-gray-700 w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300">Distribución (Q/kWh)</label>
                  <input type="number" step="0.000001" value={items[selectedIdx].rates.distribution_Q_per_kWh} onChange={e=> updateSelected({ rates: { distribution_Q_per_kWh: Number(e.target.value) } })} className="mt-2 p-2 rounded bg-transparent border border-gray-700 w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300">Potencia (Q/kWh)</label>
                  <input type="number" step="0.000001" value={items[selectedIdx].rates.potencia_Q_per_kWh} onChange={e=> updateSelected({ rates: { potencia_Q_per_kWh: Number(e.target.value) } })} className="mt-2 p-2 rounded bg-transparent border border-gray-700 w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300">Contribución A.P. (%)</label>
                  <input type="number" step="0.01" value={items[selectedIdx].rates.contrib_percent} onChange={e=> updateSelected({ rates: { contrib_percent: Number(e.target.value) } })} className="mt-2 p-2 rounded bg-transparent border border-gray-700 w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300">IVA (%)</label>
                  <input type="number" step="0.01" value={items[selectedIdx].rates.iva_percent} onChange={e=> updateSelected({ rates: { iva_percent: Number(e.target.value) } })} className="mt-2 p-2 rounded bg-transparent border border-gray-700 w-full" />
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button className="btn-primary flex items-center gap-2" onClick={saveChanges}><Save size={14} /> Guardar cambios</button>
                <button className="btn-ghost text-red-400 flex items-center gap-2" onClick={()=> requestRemoveAt(selectedIdx!)}><Trash size={14} /> Eliminar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
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
