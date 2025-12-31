import React from 'react'
import { getReadings, saveReadings, getAllTariffs, type ReadingRecord, type TariffRecord } from '../services/supabasePure'
import { updateReading } from '../services/readingsService'
import { getAllMeters, type MeterRecord } from '../services/supabaseBasic'
import { showToast } from '../services/toast'
import { X, Save } from 'lucide-react'

type Props = {
  open: boolean,
  onClose: ()=>void,
  onSaved: ()=>void,
  currentMeterId?: string
}

type InitialReading = { date: string, consumption: number | string, production: number | string }

type FormState = {
  date: string,
  consumption: string,
  production: string,
  days: number
}

export default function AddReadingModal({ open, onClose, onSaved, initial, editingIndex, currentMeterId }: Props & { initial?: InitialReading | null, editingIndex?: number | null }){
  const [form, setForm] = React.useState<FormState>({ date: new Date().toISOString().split('T')[0], consumption: '', production: '', days: 0 })
  const [readings, setReadings] = React.useState<ReadingRecord[]>([])
  const [meters, setMeters] = React.useState<MeterRecord[]>([])
  const [tariffs, setTariffs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

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
  }, [open, initial, readings])

  async function loadData() {
    try {
      setLoading(true)
      const [readingsData, metersData, tariffsData] = await Promise.all([
        getReadings(currentMeterId),
        getAllMeters(),
        getAllTariffs()
      ])
      setReadings(readingsData)
      setMeters(metersData)
      setTariffs(tariffsData)
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Error cargando datos', 'error')
    } finally {
      setLoading(false)
    }
  }

  function update<K extends keyof FormState>(k: K, v: FormState[K]){
    setForm(prev=> ({ ...prev, [k]: v }))
  }

  function computeDays(dateISO: string){
    try{
      const all = readings
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

  async function handleSave(){
    // basic validation
    if (!form.date){ showToast('Seleccione una fecha', 'error'); return }
    const consumption = Number(form.consumption || 0)
    const production = Number(form.production || 0)
    if (isNaN(consumption) || isNaN(production)) { showToast('Valores numéricos inválidos', 'error'); return }
    
    // Use currentMeterId prop to find the meter, otherwise fallback to first
    const currentMeter = currentMeterId 
      ? meters.find(m => m.contador === currentMeterId) || meters[0]
      : meters[0]

    // integrity checks: ensure meter and tariff exist
    try{
      if (meters.length === 0) {
        showToast('No hay medidores configurados. Configure un medidor antes de guardar lecturas.', 'error')
        return
      }

      if (!currentMeter || !currentMeter.contador || !currentMeter.correlativo) {
        showToast('Información del medidor incompleta (contador o correlativo faltante). Revise la sección Contadores y complete contador + correlativo.', 'error')
        return
      }
      
      // Validate there is an active tariff matching the meter's distribuidora/company and service/segment
      const company = currentMeter.distribuidora || undefined
      const segment = currentMeter.tipo_servicio || undefined
      const targetDate = new Date(form.date)

      // Support both shapes: legacy flat TariffRecord (period_from/period_to) and TariffSet (header.period)
      function tariffMatches(tariff: any){
        const fromRaw = tariff.period_from ?? tariff.header?.period?.from
        const toRaw = tariff.period_to ?? tariff.header?.period?.to
        if (!fromRaw || !toRaw) return false
        const fromDate = new Date(fromRaw)
        const toDate = new Date(toRaw)
        const matchesDate = targetDate >= fromDate && targetDate <= toDate
        const tCompany = tariff.company ?? tariff.header?.company
        const tSegment = tariff.segment ?? tariff.header?.segment
        const matchesCompany = !company || tCompany === company
        const matchesSegment = !segment || tSegment === segment
        return matchesDate && matchesCompany && matchesSegment
      }

      const activeTariff = tariffs.find(tariffMatches)
      
      if (!activeTariff) { 
        showToast('No existe una tarifa activa para la fecha seleccionada y el medidor configurado. Añada o asigne una tarifa (empresa/segmento) antes de guardar.', 'error')
        return 
      }
    } catch(e) { 
      showToast('Error validando integridad del medidor/tarifa', 'error')
      return 
    }
    
    try {
      setLoading(true)

      // Usamos la función updateReading que maneja upsert (insertar o actualizar)
      await updateReading(
        currentMeter.contador || '',
        form.date,
        consumption,
        production
      )
      showToast('Lectura guardada correctamente', 'success')

      // Ensure parent refresh completes before closing the modal
      try {
        await onSaved()
      } catch (e) {
        // parent might not return a promise, ignore
      }
      onClose()
    } catch(e: any) {
      console.error('save reading', e)
      const msg = e?.message || 'Error guardando lectura'
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="glass-card max-w-md sm:max-w-lg w-full p-4 z-10 text-white max-h-[80vh] overflow-y-auto">
        <h3 className="text-base font-semibold mb-2">{initial ? 'Actualizar' : 'Agregar'} lectura manual</h3>
        {currentMeterId && (
          <div className="mb-3 text-xs text-gray-300">
            {initial ? 'Actualizando' : 'Agregando'} lectura para el Contador: <strong className="text-white">
              {meters.find(m => m.contador === currentMeterId)?.contador || currentMeterId}
            </strong>
          </div>
        )}
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
          <button className="glass-button p-1 bg-blue-600 text-white flex items-center gap-2 text-sm" title="Guardar" aria-label="Guardar" onClick={handleSave}><Save size={12} /><span className="hidden md:inline">{initial ? 'Actualizar' : 'Guardar'}</span></button>
        </div>
      </div>
    </div>
  )
}
