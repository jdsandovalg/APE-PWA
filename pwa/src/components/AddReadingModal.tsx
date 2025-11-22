import React from 'react'
import { loadReadings, saveReadings } from '../services/storage'
import { showToast } from '../services/toast'

type Props = {
  open: boolean,
  onClose: ()=>void,
  onSaved: ()=>void
}

type FormState = {
  date: string,
  consumption: string,
  production: string,
  days: number
}

export default function AddReadingModal({ open, onClose, onSaved }: Props){
  const [form, setForm] = React.useState<FormState>({ date: new Date().toISOString().split('T')[0], consumption: '', production: '', days: 0 })

  React.useEffect(()=>{
    // reset when opened
    if (open){
      setForm({ date: new Date().toISOString().split('T')[0], consumption: '', production: '', days: 0 })
      computeDays(new Date().toISOString().split('T')[0])
    }
  }, [open])

  function update<K extends keyof FormState>(k: K, v: FormState[K]){
    setForm(prev=> ({ ...prev, [k]: v }))
  }

  function computeDays(dateISO: string){
    try{
      const all = loadReadings()
      if (!all || all.length === 0){ update('days', 0); return }
      // find last (most recent) reading by date
      const sorted = [...all].map(r=>({ ...r, date: new Date(r.date).toISOString() }))
      sorted.sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime())
      const last = sorted[0]
      const lastDate = new Date(last.date)
      const sel = new Date(dateISO)
      // compute difference in days (rounded to nearest integer)
      const diffMs = sel.getTime() - lastDate.getTime()
      const days = Math.max(0, Math.round(diffMs / (1000*60*60*24)))
      update('days', days)
    }catch(e){ update('days', 0) }
  }

  function handleDateChange(v: string){
    update('date', v)
    computeDays(v)
  }

  function handleSave(){
    // basic validation
    if (!form.date){ showToast('Seleccione una fecha', 'error'); return }
    const consumption = Number(form.consumption || 0)
    const production = Number(form.production || 0)
    if (isNaN(consumption) || isNaN(production)) { showToast('Valores numéricos inválidos', 'error'); return }
    // create reading object
    const reading = { date: new Date(form.date).toISOString(), consumption, production }
    try{
      const existing = loadReadings()
      // prepend new reading so it's treated as most recent
      const merged = [reading, ...existing]
      saveReadings(merged)
      showToast('Lectura guardada', 'success')
      onSaved()
      onClose()
    }catch(e){
      console.error('save reading', e)
      showToast('Error guardando lectura', 'error')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="glass-card max-w-md w-full p-6 z-10 text-white">
        <h3 className="text-lg font-semibold mb-3">Agregar lectura manual</h3>
        <div className="grid grid-cols-1 gap-3">
          <label className="text-sm text-white">Fecha
            <input type="date" className="w-full bg-white/5 text-white border border-white/10 rounded px-2 py-2 mt-1" value={form.date} onChange={e=>handleDateChange(e.target.value)} />
          </label>
          <label className="text-sm text-white">Energía recibida (kW)
            <input type="number" step="any" min="0" className="w-full bg-white/5 text-white border border-white/10 rounded px-2 py-2 mt-1" value={form.consumption} onChange={e=>update('consumption', e.target.value)} />
          </label>
          <label className="text-sm text-white">Energía entregada (kW)
            <input type="number" step="any" min="0" className="w-full bg-white/5 text-white border border-white/10 rounded px-2 py-2 mt-1" value={form.production} onChange={e=>update('production', e.target.value)} />
          </label>
          <div className="text-sm text-gray-300">Días de servicio calculados desde la última lectura: <strong className="text-white">{form.days}</strong></div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="glass-button px-3 py-2" onClick={onClose}>Cancelar</button>
          <button className="glass-button px-3 py-2 bg-blue-600 text-white" onClick={handleSave}>Guardar</button>
        </div>
      </div>
    </div>
  )
}
