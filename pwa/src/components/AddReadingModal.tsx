import React from 'react'
import { loadReadings, saveReadings, loadCurrentMeterId, loadMeterInfo, findActiveTariffForDate } from '../services/storage'
import { showToast } from '../services/toast'
import { X, Save } from 'lucide-react'

type Props = {
  open: boolean,
  onClose: ()=>void,
  onSaved: ()=>void
}

type InitialReading = { date: string, consumption: number | string, production: number | string }

type FormState = {
  date: string,
  consumption: string,
  production: string,
  days: number
}

export default function AddReadingModal({ open, onClose, onSaved, initial, editingIndex }: Props & { initial?: InitialReading | null, editingIndex?: number | null }){
  const [form, setForm] = React.useState<FormState>({ date: new Date().toISOString().split('T')[0], consumption: '', production: '', days: 0 })

  React.useEffect(()=>{
    // reset when opened; if `initial` is provided, load it for editing
    if (open){
      if (initial){
        setForm({ date: new Date(initial.date).toISOString().split('T')[0], consumption: String(initial.consumption || ''), production: String(initial.production || ''), days: 0 })
        computeDays(new Date(initial.date).toISOString().split('T')[0])
      } else {
        setForm({ date: new Date().toISOString().split('T')[0], consumption: '', production: '', days: 0 })
        computeDays(new Date().toISOString().split('T')[0])
      }
    }
  }, [open, initial])

  function update<K extends keyof FormState>(k: K, v: FormState[K]){
    setForm(prev=> ({ ...prev, [k]: v }))
  }

  function computeDays(dateISO: string){
    try{
      const all = loadReadings()
      if (!all || all.length === 0){ update('days', 0); return }
      // normalize items to ISO dates
      const items = [...all].map(r=>({ ...r, date: new Date(r.date).toISOString() }))
      // if editing an existing reading (initial provided), exclude that exact entry
      const filtered = initial ? items.filter(it => !(it.date === new Date(initial.date).toISOString() && Number(it.consumption) === Number(initial.consumption) && Number(it.production) === Number(initial.production))) : items
      const sel = new Date(dateISO)
      // find the most recent reading strictly before the selected date
      const previous = filtered
        .filter(it => new Date(it.date).getTime() < sel.getTime())
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      if (previous.length === 0){ update('days', 0); return }
      const prevDate = new Date(previous[0].date)
      const MS_PER_DAY = 1000 * 60 * 60 * 24
      const diffMs = sel.getTime() - prevDate.getTime()
      const days = Math.max(0, Math.floor(diffMs / MS_PER_DAY))
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
    // integrity checks: ensure meter and tariff exist
    try{
      const meterId = loadCurrentMeterId()
      if (!meterId){ showToast('No hay medidor activo. Configure un medidor antes de guardar lecturas.', 'error'); return }
      const mInfo = loadMeterInfo()
      if (!mInfo || !mInfo.contador || !mInfo.correlativo || String(mInfo.contador).trim() === '' || String(mInfo.correlativo).trim() === ''){
        showToast('Información del medidor incompleta (contador o correlativo faltante). Revise la sección Contadores y complete contador + correlativo.', 'error'); return
      }
      // Validate there is an active tariff matching the meter's distribuidora/company and service/segment
      const company = (mInfo.distribuidora || '').toString() || undefined
      const segment = (mInfo.tipo_servicio || '').toString() || undefined
      const tariff = findActiveTariffForDate(new Date(form.date).toISOString(), company, segment)
      if (!tariff){ showToast('No existe una tarifa activa para la fecha seleccionada y el medidor configurado. Añada o asigne una tarifa (empresa/segmento) antes de guardar.', 'error'); return }
    }catch(e){ showToast('Error validando integridad del medidor/tarifa', 'error'); return }
    // create reading object
    const reading = { date: new Date(form.date).toISOString(), consumption, production }
    try{
      const existing = loadReadings()
      if (typeof editingIndex === 'number' && editingIndex >= 0 && editingIndex < existing.length){
        // replace the reading at the given index
        existing[editingIndex] = reading
        saveReadings(existing)
        showToast('Lectura actualizada', 'success')
      } else {
        // prepend new reading so it's treated as most recent
        const merged = [reading, ...existing]
        saveReadings(merged)
        showToast('Lectura guardada', 'success')
      }
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
      <div className="glass-card max-w-md sm:max-w-lg w-full p-4 z-10 text-white max-h-[80vh] overflow-y-auto">
        <h3 className="text-base font-semibold mb-2">Agregar lectura manual</h3>
        <div className="grid grid-cols-1 gap-2">
          <label className="text-xs text-white">Fecha
            <input type="date" className="w-full bg-white/5 text-white border border-white/10 rounded px-1 py-1 mt-1 text-sm" value={form.date} onChange={e=>handleDateChange(e.target.value)} />
          </label>
          <label className="text-xs text-white">Energía recibida (kW)
            <input type="number" step="any" min="0" className="w-full bg-white/5 text-white border border-white/10 rounded px-1 py-1 mt-1 text-sm" value={form.consumption} onChange={e=>update('consumption', e.target.value)} />
          </label>
          <label className="text-xs text-white">Energía entregada (kW)
            <input type="number" step="any" min="0" className="w-full bg-white/5 text-white border border-white/10 rounded px-1 py-1 mt-1 text-sm" value={form.production} onChange={e=>update('production', e.target.value)} />
          </label>
          <div className="text-xs text-gray-300">Días de servicio calculados desde la última lectura: <strong className="text-white">{form.days}</strong></div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button className="glass-button p-1 flex items-center gap-2 text-sm" title="Cancelar" aria-label="Cancelar" onClick={onClose}><X size={12} /><span className="hidden md:inline">Cancelar</span></button>
          <button className="glass-button p-1 bg-blue-600 text-white flex items-center gap-2 text-sm" title="Guardar" aria-label="Guardar" onClick={handleSave}><Save size={12} /><span className="hidden md:inline">Guardar</span></button>
        </div>
      </div>
    </div>
  )
}
