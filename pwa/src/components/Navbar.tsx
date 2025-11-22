import React from 'react'
import { Home, Calendar, DollarSign, DownloadCloud, Sun, Hammer, Upload } from 'lucide-react'
import { loadMeters, loadTariffs, loadReadings, loadCurrentMeterId, loadMeterInfo, loadMigrationInfo, saveMeters, saveTariffs, saveReadings, saveMeterInfo, saveCurrentMeterId } from '../services/storage'
import { showToast } from '../services/toast'

function downloadJSON(obj: any, filename = 'apenergia-export.json'){
  try{
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }catch(e){ console.error('export failed', e) }
}

function exportAll(){
  try{
    const meters = loadMeters()
    const tariffs = loadTariffs()
    const current_meter = loadCurrentMeterId()
    const meter_info = loadMeterInfo()
    const migration = loadMigrationInfo()
    // gather readings per meter id
    const readingsByMeter: Record<string, any[]> = {}
    Object.keys(meters || {}).forEach(mId => {
      try{ readingsByMeter[mId] = loadReadings(mId) }catch(e){ readingsByMeter[mId] = [] }
    })

      // also include a raw snapshot of localStorage keys (helps with backups/migrations)
      const rawLocal: Record<string,string> = {}
      for (let i=0;i<localStorage.length;i++){
        try{ const k = localStorage.key(i) || ''; rawLocal[k] = localStorage.getItem(k) || '' }catch(e){}
      }

      const payload = {
        exportedAt: new Date().toISOString(),
        meters,
        current_meter,
        meter_info,
        readings: readingsByMeter,
        tariffs,
        migration,
        localStorage: rawLocal
      }
      downloadJSON(payload, `apenergia-export-${new Date().toISOString().split('T')[0]}.json`)
      showToast('Exportación completa: descargando archivo', 'success')
  }catch(e){ console.error('exportAll failed', e) }
}

function importAllFromFile(file: File){
  const reader = new FileReader()
  reader.onload = (ev) => {
    try{
      const txt = String(ev.target?.result || '')
      const payload = JSON.parse(txt)
      // Prefer structured fields when present
      if (payload.meters) try{ saveMeters(payload.meters); showToast('Medidores importados', 'success') }catch(e){}
      if (payload.current_meter) try{ saveCurrentMeterId(payload.current_meter); showToast('Contador actual importado', 'success') }catch(e){}
      if (payload.meter_info) try{ saveMeterInfo(payload.meter_info); showToast('Información del contador importada', 'success') }catch(e){}
      if (payload.tariffs) try{ saveTariffs(payload.tariffs); showToast('Tarifas importadas', 'success') }catch(e){}
      if (payload.readings) {
        // readings is expected to be an object keyed by meter id
        try{
          Object.keys(payload.readings).forEach(mid => {
            try{ saveReadings(payload.readings[mid] || [], mid) }catch(e){}
          })
          showToast('Lecturas importadas', 'success')
        }catch(e){}
      }
      // If a raw localStorage snapshot exists, restore unknown keys
      if (payload.localStorage && typeof payload.localStorage === 'object'){
        try{
          Object.keys(payload.localStorage).forEach(k => {
            try{ localStorage.setItem(k, payload.localStorage[k]) }catch(e){}
          })
          showToast('LocalStorage restaurado (claves importadas)', 'success')
        }catch(e){}
      }
      showToast('Importación finalizada. Recarga la página para ver los cambios.', 'info')
    }catch(err){
      console.error('Import failed', err)
      showToast('Error al importar: archivo inválido', 'error')
    }
  }
  reader.onerror = (e) => { console.error('file read error', e); showToast('Error leyendo el archivo', 'error') }
  reader.readAsText(file)
}

export default function Navbar({ onNavigate }: { onNavigate: (v:'dashboard'|'readings'|'tariffs'|'billing')=>void }){
  const fileRef = React.useRef<HTMLInputElement | null>(null)

  function onImportClick(){
    try{ fileRef.current && fileRef.current.click() }catch(e){}
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>){
    const f = e.target.files && e.target.files[0]
    if (!f) return
    importAllFromFile(f)
    // reset so same file can be picked again if needed
    try{ e.currentTarget.value = '' }catch(e){}
  }

  return (
    <header>
      <div className="glass-card mb-4 p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">AutoProductor Energía</h1>
            <p className="hidden sm:block text-sm text-gray-300">Gestión de Autoproducción</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="application/json" onChange={onFileChange} style={{ display: 'none' }} />
          <button onClick={onImportClick} className="glass-button px-2 py-1 sm:px-3 sm:py-2 flex items-center gap-2" title="Importar datos">
            <Upload size={16} />
          </button>
          <button onClick={exportAll} className="glass-button px-2 py-1 sm:px-3 sm:py-2 flex items-center gap-2" title="Exportar datos">
            <DownloadCloud size={16} />
          </button>
        </div>
      </div>

      {/* Meter info card placed under header title for immediate visibility on mobile */}
      <div className="glass-card mb-4 p-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm text-gray-300">Información del contador</h3>
            <p className="text-sm text-gray-200 mt-1">{loadMeterInfo().contador} — {loadMeterInfo().propietaria}</p>
            <div className="text-xs text-gray-400 mt-1">{loadMeterInfo().distribuidora} · {loadMeterInfo().tipo_servicio} · Correlativo: {loadMeterInfo().correlativo}</div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Medidor activo</label>
            <select className="bg-transparent border border-white/10 text-white px-2 py-1 rounded" value={loadCurrentMeterId()} onChange={(e)=>{ try{ saveCurrentMeterId(e.target.value); window.location.reload() }catch(e){} }}>
              {Object.keys(loadMeters()).map(k => (<option key={k} value={k}>{k} — {loadMeters()[k].propietaria}</option>))}
            </select>
          </div>
        </div>
      </div>

      <nav className="glass-card p-2 mb-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-center overflow-x-auto">
          <button onClick={()=>onNavigate('dashboard')} className={`flex items-center justify-start gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap text-gray-300 hover:bg-white/10 w-full sm:w-auto`}>
            <Home size={16} />
            <span className="font-medium text-sm text-left">Dashboard</span>
          </button>
          <button onClick={()=>onNavigate('readings')} className={`flex items-center justify-start gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap text-gray-300 hover:bg-white/10 w-full sm:w-auto`}>
            <Calendar size={16} />
            <span className="font-medium text-sm text-left">Lecturas</span>
          </button>
          <button onClick={()=>onNavigate('tariffs')} className={`flex items-center justify-start gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap text-gray-300 hover:bg-white/10 w-full sm:w-auto`}>
            <DollarSign size={16} />
            <span className="font-medium text-sm text-left">Tarifas</span>
          </button>
          <button onClick={()=>onNavigate('billing')} className={`flex items-center justify-start gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap text-gray-300 hover:bg-white/10 w-full sm:w-auto`}>
            <Hammer size={16} />
            <span className="font-medium text-sm text-left">Facturación</span>
          </button>
        </div>
      </nav>
    </header>
  )
}
