import React from 'react'
import { motion } from 'framer-motion'
import { Home, Calendar, DollarSign, Hammer, Sun, Building } from 'lucide-react'
import { getAllMeters, type MeterRecord } from '../services/supabaseBasic'
import { showToast } from '../services/toast'

export default function Navbar({ onNavigate }: { onNavigate: (v:'dashboard'|'readings'|'tariffs'|'billing'|'meters'|'companies')=>void }){
  /**
   * Navbar / header
   * ----------------
   * Shows the current meter summary and a compact select to switch meters.
   * It listens for global `ape:meterChange` events to update the header when
   * other components change the active meter (e.g. the star action in `Meters`).
   * It also emits `ape:meterChange` when the select changes.
   */
  const [meters, setMeters] = React.useState<MeterRecord[]>([])
  const [currentMeterId, setCurrentMeterId] = React.useState<string>('')
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    loadMeterData()
  }, [])

  // Listen to global meter change events so this navbar updates when other components (e.g. Meters) set the active meter
  React.useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail || {}
        let meterId = detail.meterId
        if (!meterId) return
        // If event passed a contador, try to resolve to id
        const foundById = meters.find(m => m.id === meterId)
        if (foundById) {
          setCurrentMeterId(foundById.id)
          return
        }
        const foundByCont = meters.find(m => m.contador === meterId)
        if (foundByCont) {
          setCurrentMeterId(foundByCont.id)
        }
      } catch (err) { console.warn('Error handling ape:meterChange in Navbar', err) }
    }

    window.addEventListener('ape:meterChange', handler as EventListener)
    return () => { window.removeEventListener('ape:meterChange', handler as EventListener) }
  }, [meters])

  async function loadMeterData(){
    try {
      setLoading(true)
      const metersData = await getAllMeters()
      setMeters(metersData)
      
      // Set current meter (use first one if available)
      if (metersData.length > 0) {
        const persisted = localStorage.getItem('ape_currentMeterId')
        const match = persisted ? metersData.find(m => m.id === persisted) : null
        if (match) {
          setCurrentMeterId(match.id)
        } else {
          setCurrentMeterId(metersData[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading meters:', error)
      showToast('Error cargando medidores', 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleMeterChange(meterId: string) {
    setCurrentMeterId(meterId)
    try {
      localStorage.setItem('ape_currentMeterId', meterId)
    } catch (e) { /* ignore localStorage errors */ }

    // Log and show a human-friendly toast when selection changes from the listbox
    try {
      const resolved = meters.find(m => m.id === meterId) || meters.find(m => m.contador === meterId)
      if (resolved) {
        console.log('Dispatching ape:meterChange (from Navbar select):', { meterId: resolved.id, contador: resolved.contador })
        showToast(`Medidor actual: ${resolved.contador} — ${resolved.propietaria}`, 'success')
      } else {
        console.log('Dispatching ape:meterChange (from Navbar select):', { meterId })
      }
    } catch (e) { /* ignore logging errors */ }

    try {
      window.dispatchEvent(new CustomEvent('ape:meterChange', { detail: { meterId } }))
    } catch (e) { /* ignore dispatch errors */ }
  }

  return (
    <header>
      <div className="glass-card mb-4 p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.45 }} className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">AutoProductor Energía</h1>
            <p className="hidden sm:block text-sm text-gray-300">Gestión de Autoproducción</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botones de import/export removidos - ahora usa Supabase directamente */}
        </div>
      </div>

      {/* Meter info card placed under header title for immediate visibility on mobile */}
      <div className="glass-card mb-4 p-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm text-gray-300">Información del contador</h3>
            {loading ? (
              <p className="text-sm text-gray-400 mt-1">Cargando...</p>
            ) : meters.length > 0 ? (
              <>
                <p className="text-sm text-gray-200 mt-1">
                  {meters.find(m => m.id === currentMeterId)?.contador || 'N/A'} — {meters.find(m => m.id === currentMeterId)?.propietaria || 'N/A'}
                </p>
                <div className="text-xs text-gray-400 mt-1">
                  {meters.find(m => m.id === currentMeterId)?.distribuidora || 'N/A'} · {meters.find(m => m.id === currentMeterId)?.tipo_servicio || 'N/A'} · Correlativo: {meters.find(m => m.id === currentMeterId)?.correlativo || 'N/A'}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 mt-1">No hay medidores configurados</p>
            )}
          </div>
            <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Medidor</label>
            <select 
              className="bg-transparent border border-white/10 text-white px-1 py-0.5 rounded text-xs h-7" 
              style={{ minWidth: 160 }}
              value={currentMeterId} 
              onChange={(e) => handleMeterChange(e.target.value)}
              disabled={loading || meters.length === 0}
            >
              {meters.map(meter => (
                <option key={meter.id} value={meter.id}>
                  {meter.contador} — {meter.propietaria}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <nav className="glass-card p-2 mb-4">
        <div className="grid grid-cols-2 sm:flex gap-2 sm:justify-center overflow-x-auto">
          <button onClick={()=>onNavigate('dashboard')} className={`flex items-center justify-start gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap text-gray-300 w-full sm:w-auto`} style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <Home size={16} />
            <span className="font-medium text-sm text-left">Dashboard</span>
          </button>
          <button onClick={()=>onNavigate('readings')} className={`flex items-center justify-start gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap text-gray-300 w-full sm:w-auto`} style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <Calendar size={16} />
            <span className="font-medium text-sm text-left">Lecturas</span>
          </button>
          <button onClick={()=>onNavigate('tariffs')} className={`flex items-center justify-start gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap text-gray-300 w-full sm:w-auto`} style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <DollarSign size={16} />
            <span className="font-medium text-sm text-left">Tarifas</span>
          </button>
          <button onClick={()=>onNavigate('companies')} className={`flex items-center justify-start gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap text-gray-300 w-full sm:w-auto`} style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <Building size={16} />
            <span className="font-medium text-sm text-left">Compañías</span>
          </button>
          <button onClick={()=>onNavigate('billing')} className={`flex items-center justify-start gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap text-gray-300 w-full sm:w-auto`} style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <Hammer size={16} />
            <span className="font-medium text-sm text-left">Facturación</span>
          </button>
        </div>
      </nav>
    </header>
  )
}
