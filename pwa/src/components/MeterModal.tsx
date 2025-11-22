import React from 'react'
import { MeterInfo, loadCompanies } from '../services/storage'
import { showToast } from '../services/toast'

type Props = {
  open: boolean,
  initial: MeterInfo,
  onClose: ()=>void,
  onSave: (m: MeterInfo)=>void,
  readOnlyPK?: boolean
}

export default function MeterModal({ open, initial, onClose, onSave, readOnlyPK=false }: Props){
  const [form, setForm] = React.useState<MeterInfo>(initial)

  React.useEffect(()=>{ setForm(initial) }, [initial])

  if (!open) return null

  function update<K extends keyof MeterInfo>(k: K, v: MeterInfo[K]){
    setForm(prev=> ({ ...prev, [k]: v }))
  }

  function handleSave(){
    // minimal validation
    if (!form.contador || !form.correlativo){
      try{ showToast('Por favor completa Contador y Correlativo', 'error') }catch(e){}
      return
    }
    try{
      // parent is responsible for persisting into meters map / current id
      onSave(form)
    }catch(e){
      console.error('save meter', e)
      try{ showToast('Error guardando información', 'error') }catch(e){}
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="glass-card max-w-md sm:max-w-lg w-full p-6 z-10 text-white">
        <h3 className="text-lg font-semibold mb-3 text-white">Información del contador</h3>
        <div className="grid grid-cols-1 gap-3">
          <label className="text-sm text-white">Contador
            <input disabled={readOnlyPK} className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-2 py-2 mt-1" placeholder="Contador" value={form.contador} onChange={e=>update('contador', e.target.value)} />
          </label>
          <label className="text-sm text-white">Correlativo
            <input disabled={readOnlyPK} className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-2 py-2 mt-1" placeholder="Correlativo" value={form.correlativo} onChange={e=>update('correlativo', e.target.value)} />
          </label>
          <label className="text-sm text-white">Propietaria
            <input className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-2 py-2 mt-1" placeholder="Propietaria" value={form.propietaria} onChange={e=>update('propietaria', e.target.value)} />
          </label>
          <label className="text-sm text-white">NIT
            <input className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-2 py-2 mt-1" placeholder="NIT" value={form.nit} onChange={e=>update('nit', e.target.value)} />
          </label>
          <label className="text-sm text-white">Distribuidora
            <select className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-2 py-2 mt-1" value={form.distribuidora} onChange={e=>update('distribuidora', e.target.value)}>
              {loadCompanies().length === 0 ? (
                <>
                  <option value="EEGSA">EEGSA</option>
                  <option value="Energuate - Deorsa">Energuate - Deorsa</option>
                  <option value="Energuate - Deocsa">Energuate - Deocsa</option>
                </>
              ) : (
                loadCompanies().map(c => (<option key={c.id} value={c.id}>{c.id} — {c.name}</option>))
              )}
            </select>
          </label>
          <label className="text-sm text-white">Tipo servicio
            {(() => {
              try{
                const comps = loadCompanies()
                const codes = Array.from(new Set(comps.map(c=> c.code).filter(Boolean)))
                if (codes.length>0){
                  return (
                    <select className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-2 py-2 mt-1" value={form.tipo_servicio} onChange={e=>update('tipo_servicio', e.target.value)}>
                      <option value="">(seleccionar)</option>
                      {codes.map(c=> (<option key={c} value={c}>{c}</option>))}
                    </select>
                  )
                }
              }catch(e){}
              return (<input className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-2 py-2 mt-1" placeholder="Tipo servicio" value={form.tipo_servicio} onChange={e=>update('tipo_servicio', e.target.value)} />)
            })()}
          </label>
          <label className="text-sm text-white">Sistema (breve descripción)
            <input className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-2 py-2 mt-1" placeholder="Sistema" value={form.sistema} onChange={e=>update('sistema', e.target.value)} />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="glass-button px-3 py-2" onClick={onClose}>Cancelar</button>
          <button className="glass-button px-3 py-2 bg-blue-600 text-white" onClick={handleSave}>Guardar</button>
        </div>
      </div>
    </div>
  )
}
