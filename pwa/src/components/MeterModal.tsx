import React from 'react'
import { getAllCompanies, type CompanyRecord } from '../services/supabasePure'
import { showToast } from '../services/toast'
import { MeterInfo } from '../types'
import { X, Save } from 'lucide-react'

type Props = {
  open: boolean,
  initial: MeterInfo,
  onClose: ()=>void,
  onSave: (m: MeterInfo)=>void,
  readOnlyPK?: boolean
}

export default function MeterModal({ open, initial, onClose, onSave, readOnlyPK=false }: Props){
  const [form, setForm] = React.useState<MeterInfo>(initial)
  const [companies, setCompanies] = React.useState<CompanyRecord[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(()=>{ 
    setForm(initial) 
  }, [initial])

  React.useEffect(() => {
    if (open) {
      loadCompanies()
    }
  }, [open])

  async function loadCompanies() {
    try {
      setLoading(true)
      const companiesData = await getAllCompanies()
      setCompanies(companiesData)
    } catch (error) {
      console.error('Error loading companies:', error)
      showToast('Error cargando compañías', 'error')
    } finally {
      setLoading(false)
    }
  }

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

    // Check if this is a solar system and requires installation date
    const isSolarSystem = form.sistema && (
      form.sistema.toLowerCase().includes('panel') ||
      form.sistema.toLowerCase().includes('solar') ||
      form.sistema.toLowerCase().includes('fotovoltaico') ||
      form.sistema.toLowerCase().includes('kw') ||
      form.sistema.toLowerCase().includes('kwp')
    )

    if (isSolarSystem && !form.installation_date) {
      try{ showToast('Para sistemas solares, debe configurar la fecha de instalación', 'error') }catch(e){}
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
      <div className="glass-card max-w-md sm:max-w-lg w-full p-4 z-10 text-white max-h-[80vh] overflow-y-auto">
        <h3 className="text-base font-semibold mb-2 text-white">Información del contador</h3>
        <div className="grid grid-cols-1 gap-2">
          <label className="text-xs text-white">Contador
            <input disabled={readOnlyPK} className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-1 py-1 mt-1 text-sm" placeholder="Contador" value={form.contador} onChange={e=>update('contador', e.target.value)} />
          </label>
          <label className="text-xs text-white">Correlativo
            <input disabled={readOnlyPK} className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-1 py-1 mt-1 text-sm" placeholder="Correlativo" value={form.correlativo} onChange={e=>update('correlativo', e.target.value)} />
          </label>
          <label className="text-xs text-white">Propietaria
            <input className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-1 py-1 mt-1 text-sm" placeholder="Propietaria" value={form.propietaria} onChange={e=>update('propietaria', e.target.value)} />
          </label>
          <label className="text-xs text-white">NIT
            <input className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-1 py-1 mt-1 text-sm" placeholder="NIT" value={form.nit} onChange={e=>update('nit', e.target.value)} />
          </label>
          <label className="text-xs text-white">Distribuidora
            <select className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-1 py-1 mt-1 text-sm" value={form.distribuidora} onChange={e=>update('distribuidora', e.target.value)}>
              {companies.length === 0 ? (
                <>
                  <option key="eegsa" value="EEGSA">EEGSA</option>
                  <option key="energuate-deorsa" value="Energuate - Deorsa">Energuate - Deorsa</option>
                  <option key="energuate-deocsa" value="Energuate - Deocsa">Energuate - Deocsa</option>
                </>
              ) : (
                companies.map((c, index) => (<option key={`company-${c.id}-${index}`} value={c.id}>{c.id} — {c.name}</option>))
              )}
            </select>
          </label>
          <label className="text-xs text-white">Tipo servicio
            {(() => {
              try{
                const codes = Array.from(new Set(companies.map(c=> c.code).filter(Boolean)))
                if (codes.length>0){
                  return (
                    <select className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-1 py-1 mt-1 text-sm" value={form.tipo_servicio} onChange={e=>update('tipo_servicio', e.target.value)}>
                      <option value="">(seleccionar)</option>
                      {codes.map(c=> (<option key={c} value={c}>{c}</option>))}
                    </select>
                  )
                }
              }catch(e){}
              return (<input className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-1 py-1 mt-1 text-sm" placeholder="Tipo servicio" value={form.tipo_servicio} onChange={e=>update('tipo_servicio', e.target.value)} />)
            })()}
          </label>
          <label className="text-xs text-white">Sistema (breve descripción)
            <input className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-1 py-1 mt-1 text-sm" placeholder="Sistema" value={form.sistema} onChange={e=>update('sistema', e.target.value)} />
          </label>
          <label className="text-xs text-white">Potencia pico (kWp)
            <input type="number" step="0.01" className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-1 py-1 mt-1 text-sm" placeholder="3.75" value={form.kwp || ''} onChange={e=>update('kwp', parseFloat(e.target.value) || undefined)} />
          </label>
          <label className="text-xs text-white">Fecha instalación sistema solar
            <input type="date" className="w-full bg-white/5 text-white placeholder-gray-400 border border-white/10 rounded px-1 py-1 mt-1 text-sm" value={form.installation_date || ''} onChange={e=>update('installation_date', e.target.value)} />
            <div className="text-xs text-gray-400 mt-1">
              {form.sistema && (form.sistema.toLowerCase().includes('panel') || form.sistema.toLowerCase().includes('solar') || form.sistema.toLowerCase().includes('fotovoltaico') || form.sistema.toLowerCase().includes('kw') || form.sistema.toLowerCase().includes('kwp'))
                ? 'Requerido para sistemas solares - mejora precisión de análisis estacionales'
                : 'Opcional - mejora precisión de análisis estacionales para sistemas solares'
              }
            </div>
          </label>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button className="glass-button p-1 flex items-center gap-2 text-sm" title="Cancelar" aria-label="Cancelar" onClick={onClose}><X size={12} /><span className="hidden md:inline">Cancelar</span></button>
          <button className="glass-button p-1 bg-blue-600 text-white flex items-center gap-2 text-sm" title="Guardar" aria-label="Guardar" onClick={handleSave}><Save size={12} /><span className="hidden md:inline">Guardar</span></button>
        </div>
      </div>
    </div>
  )
}
