import React from 'react'
import { Home, Calendar, DollarSign, DownloadCloud, Sun, Hammer } from 'lucide-react'
import { loadMeters, loadTariffs, loadReadings, loadCurrentMeterId, loadMeterInfo, loadMigrationInfo } from '../services/storage'

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

export default function Navbar({ onNavigate }: { onNavigate: (v:'dashboard'|'readings'|'tariffs'|'billing')=>void }){
  return (
    <header>
      <div className="glass-card mb-4 p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <Sun className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AutoProductor Energía</h1>
            <p className="text-sm text-gray-300">Gestión de Autoproducción</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={exportAll} className="glass-button px-3 py-2 flex items-center gap-2" title="Exportar datos">
            <DownloadCloud size={16} />
          </button>
          <div className="text-right">
            <p className="text-sm text-gray-300">Contador</p>
            <p className="text-lg font-bold text-white">Z90018</p>
          </div>
        </div>
      </div>

      <nav className="glass-card p-2 mb-4">
        <div className="flex gap-2 justify-center overflow-x-auto">
          <button onClick={()=>onNavigate('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap text-gray-300 hover:bg-white/10`}>
            <Home size={16} />
            <span className="font-medium">Dashboard</span>
          </button>
          <button onClick={()=>onNavigate('readings')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap text-gray-300 hover:bg-white/10`}>
            <Calendar size={16} />
            <span className="font-medium">Lecturas</span>
          </button>
          <button onClick={()=>onNavigate('tariffs')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap text-gray-300 hover:bg-white/10`}>
            <DollarSign size={16} />
            <span className="font-medium">Tarifas</span>
          </button>
          <button onClick={()=>onNavigate('billing')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap text-gray-300 hover:bg-white/10`}>
            <Hammer size={16} />
            <span className="font-medium">Facturación</span>
          </button>
        </div>
      </nav>
    </header>
  )
}
