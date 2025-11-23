import React, { useEffect, useState } from 'react'
import { loadReadings, saveReadings, loadCurrentMeterId, loadMeterInfo } from '../services/storage'
import { computeDeltas } from '../services/storage'
import AddReadingModal from './AddReadingModal'
import ConfirmModal from './ConfirmModal'
import { showToast } from '../services/toast'
import { parseCSV, toNumber } from '../services/csv'
import { UploadCloud, DownloadCloud, Edit2, PlusCircle, Trash2 } from 'lucide-react'

type Reading = { date:string, consumption:number, production:number, credit?:number }

export default function Readings(){
  const [data, setData] = useState<Reading[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const currentMeterId = loadCurrentMeterId()
  const meterInfo = loadMeterInfo()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingInitial, setEditingInitial] = useState<{date:string, consumption:number, production:number} | null>(null)

  useEffect(()=>{ setData(loadReadings()) },[])

  function applyParsedRows(rows: Record<string,string>[], srcName = 'archivo'){
    const parsed: Reading[] = rows.map(r=>({
      date: r.date || r.fecha || new Date().toISOString(),
      consumption: toNumber(r.consumption ?? r.consumo ?? r.kwh ?? r.lecturarecibida ?? '0'),
      production: toNumber(r.production ?? r.produccion ?? r.generacion ?? r.lecturaentregada ?? '0'),
      credit: toNumber(r.credit ?? r.credito ?? '0')
    }))
    // If the CSV provides only lecturaentregada/lecturarecibida as instantaneous readings
    // and not explicit consumption/production, keep the raw values. (You can later
    // compute deltas externally if needed.)
    const merged = [...parsed, ...data]
    setData(merged)
    saveReadings(merged)
    setMessage(`Importadas ${parsed.length} filas desde ${srcName}`)
  }

  function onImport(e: React.ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () =>{
      const txt = String(reader.result || '')
      const { rows } = parseCSV(txt)
      applyParsedRows(rows, file.name)
    }
    reader.readAsText(file)
  }

  async function importFromRepo(){
    try{
      const resp = await fetch('/Cargas.csv')
      if (!resp.ok) throw new Error('No encontrado en repo')
      const txt = await resp.text()
      const { rows } = parseCSV(txt)
      applyParsedRows(rows, 'Cargas.csv (repo)')
    }catch(err:any){
      setMessage(`Error al cargar desde repo: ${err.message || err}`)
    }
  }

  function exportJSON(){
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'readings-backup.json'
    a.click()
    URL.revokeObjectURL(url)
    try{ showToast('Exportación de lecturas descargada', 'success') }catch(e){}
  }

  function clearAll(){
    // open confirm modal instead of browser confirm
    setShowConfirmClear(true)
  }

  function doClear(){
    setShowConfirmClear(false)
    setData([]); saveReadings([])
    setMessage('Lecturas limpiadas')
    showToast('Lecturas limpiadas', 'success')
  }

  function convertToDeltas(){
    const deltas = computeDeltas(data)
    if (!deltas || deltas.length===0){ setMessage('No hay lecturas para convertir'); return }
    // preserve original ordering by date descending for UX (most recent first)
    const ordered = [...deltas].sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime())
    setData(ordered)
    saveReadings(ordered)
    setMessage(`Calculados ${deltas.length} periodos (deltas)`)
  }

  // prepare deltas map (date ISO -> delta row)
  const deltas = computeDeltas(data)
  const deltaMap = new Map<string, Reading>()
  deltas.forEach(d=> deltaMap.set(new Date(d.date).toISOString(), d))
  // build cumulative saldo map (running sum of (production - consumption)) ordered by date
  const cumulativeMap = new Map<string, number>()
  // prepare reference map container (filled below)
  const refMap = new Map<string, number>()
  try{
    const sorted = [...deltas].map(d=>({ ...d, date: new Date(d.date).toISOString() }))
    sorted.sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime())
    let running = 0
    for (const d of sorted){
      running += (Number(d.production) || 0) - (Number(d.consumption) || 0)
      cumulativeMap.set(new Date(d.date).toISOString(), running)
    }
    // assign simple reference numbers for delta rows (B1: per-row reference)
    try{
      let refCount = 0
      const ordered = [...deltas].map(d=>({ ...d, date: new Date(d.date).toISOString() }))
      ordered.sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime())
      for (const d of ordered){
        const iso = new Date(d.date).toISOString()
        const hasRaw = (Number(d.consumption)||0) !== 0 || (Number(d.production)||0) !== 0
        if (hasRaw){ refCount += 1; refMap.set(iso, refCount) }
      }
    }catch(e){ /* ignore */ }
  }catch(e){ /* ignore */ }

  // build days-of-service map: difference in days between each reading and the previous one
  const daysMap = new Map<string, number>()
  try{
    const sortedDates = [...data].map(r=>new Date(r.date)).sort((a,b)=> a.getTime() - b.getTime())
    const MS_PER_DAY = 1000 * 60 * 60 * 24
    for (let i=0;i<sortedDates.length;i++){
      const cur = sortedDates[i]
      if (i===0){
        // first (oldest) — no previous period
        daysMap.set(cur.toISOString(), 0)
      }else{
        const prev = sortedDates[i-1]
        const diff = Math.floor((cur.getTime() - prev.getTime()) / MS_PER_DAY)
        daysMap.set(cur.toISOString(), diff)
      }
    }
  }catch(e){ /* ignore */ }

  return (
    <section>
      <div className="mb-4 text-xs text-gray-300">Medidor activo: <strong className="text-white">{currentMeterId}</strong> — {meterInfo.propietaria}</div>
        <div className="flex gap-2 mb-4 items-center justify-center flex-wrap">
          <button className="glass-button p-2 flex items-center gap-2" title="Agregar lectura" aria-label="Agregar lectura" onClick={()=> { setEditingIndex(null); setEditingInitial(null); setShowAddModal(true) }}><PlusCircle size={14} /><span className="hidden md:inline">Agregar lectura</span></button>
        <label className="glass-button cursor-pointer p-2 flex items-center gap-2 px-3 py-2">
          <UploadCloud size={16} />
          <span className="hidden md:inline">Importar CSV</span>
          <input type="file" accept=".csv,.txt" onChange={onImport} className="hidden" />
        </label>
        <button className="glass-button p-2 flex items-center gap-2" title="Exportar datos" aria-label="Exportar datos" onClick={exportJSON}><DownloadCloud size={16} /><span className="hidden md:inline">Exportar datos</span></button>
        <button className="glass-button p-2 bg-red-600 text-white flex items-center gap-2" title="Limpiar lecturas" aria-label="Limpiar lecturas" onClick={clearAll}><Trash2 size={14} /><span className="hidden md:inline">Limpiar</span></button>
      </div>
      {message && <div className="w-full text-center mb-4 text-sm text-gray-300">{message}</div>}

      <AddReadingModal open={showAddModal} onClose={()=> setShowAddModal(false)} onSaved={()=>{ setData(loadReadings()); setMessage('Lectura agregada') }} initial={editingInitial} editingIndex={editingIndex} />
      <ConfirmModal open={showConfirmClear} title="Confirmar limpieza" message="¿Desea borrar todas las lecturas? Esta acción no se puede deshacer." onCancel={()=> setShowConfirmClear(false)} onConfirm={doClear} cancelText="Cancelar" confirmText="Borrar" />

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead>
            <tr className="text-gray-300">
              <th>
                <div className="glass-button px-1 py-0.5 w-full text-center text-white text-[10px]">Fecha</div>
              </th>
              <th>
                <div className="glass-button px-1 py-0.5 w-full text-center text-white text-[10px]">Lectura Recibida (raw)</div>
              </th>
              <th>
                <div className="glass-button px-1 py-0.5 w-full text-center text-white text-[10px]">Recibida kWh (∆)</div>
              </th>
              <th>
                <div className="glass-button px-1 py-0.5 w-full text-center text-white text-[10px]">Lectura Entregada (raw)</div>
              </th>
              <th>
                <div className="glass-button px-1 py-0.5 w-full text-center text-white text-[10px]">Entregada kWh (∆)</div>
              </th>
              <th>
                <div className="glass-button px-1 py-0.5 w-full text-center text-white text-[10px]">Saldo (kWh)</div>
              </th>
              <th>
                <div className="glass-button px-1 py-0.5 w-full text-center text-white text-[10px]">Saldo Acumulado (kWh)</div>
              </th>
              <th>
                <div className="glass-button px-1 py-0.5 w-full text-center text-white text-[10px]">Días servicio</div>
              </th>
              <th>
                <div className="glass-button px-1 py-0.5 w-full text-center text-white text-[10px]">Recibida kWh/día (promedio)</div>
              </th>
              <th>
                <div className="glass-button px-1 py-0.5 w-full text-center text-white text-[10px]">Entregada kWh/día (promedio)</div>
              </th>
              <th>
                <div className="glass-button px-1 py-0.5 w-full text-center text-white text-[10px]">Acciones</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((r,idx)=> {
              const iso = new Date(r.date).toISOString()
              const d = deltaMap.get(iso) || { consumption: 0, production: 0, date: r.date }
              const saldo = (Number(d.production) || 0) - (Number(d.consumption) || 0)
              const days = daysMap.get(iso) ?? 0
              const avgRec = days>0 ? (Number(d.consumption||0)/days) : null
              const avgProd = days>0 ? (Number(d.production||0)/days) : null
              return (
                <tr key={idx} className="border-b border-gray-700 text-xs">
                  <td className="py-1">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="py-1 text-right">{Number(r.consumption || 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                  <td className="py-1 text-right">{Number(d.consumption || 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                  <td className="py-1 text-right">{Number(r.production || 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                  <td className="py-1 text-right">{Number(d.production || 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                  <td className="py-1 text-right">{Number(saldo || 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                  <td className="py-1 text-right">{Number(cumulativeMap.get(iso) || 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                  <td className="py-1 text-right">{typeof days === 'number' ? String(days) : '-'}</td>
                  <td className="py-1 text-right" title={(days>0) ? `${Number(d.consumption||0)} / ${days} = ${Number(avgRec!).toLocaleString(undefined,{maximumFractionDigits:2})}` : `raw=${Number(d.consumption||0)} (days=0)`}>
                    <div>{days>0 ? Number(avgRec!).toLocaleString(undefined,{maximumFractionDigits:2}) : '-'}</div>
                    <div className="text-[10px] text-gray-400">{Number(d.consumption||0).toLocaleString()}</div>
                  </td>
                  <td className="py-1 text-right" title={(days>0) ? `${Number(d.production||0)} / ${days} = ${Number(avgProd!).toLocaleString(undefined,{maximumFractionDigits:2})}` : `raw=${Number(d.production||0)} (days=0)`}>
                    <div>{days>0 ? Number(avgProd!).toLocaleString(undefined,{maximumFractionDigits:2}) : '-'}</div>
                    <div className="text-[10px] text-gray-400">{Number(d.production||0).toLocaleString()}</div>
                  </td>
                  <td className="py-1 text-center">
                    <button className="glass-button px-2 py-1 text-xs inline-flex items-center gap-1" title="Editar lectura" aria-label={`Editar lectura ${new Date(r.date).toLocaleDateString()}`} onClick={()=>{
                      setEditingIndex(idx)
                      setEditingInitial({ date: r.date, consumption: Number(r.consumption||0), production: Number(r.production||0) })
                      setShowAddModal(true)
                    }}><Edit2 size={14} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {/* Compact reference values: single-line small text */}
        <div className="mt-2 text-[10px] text-gray-400">
          {(() => {
            const parts: string[] = []
            for (const [iso, n] of refMap.entries()){
              const d = deltaMap.get(iso) || { consumption: 0, production: 0, date: iso }
              parts.push(`${n}: R ${Number(d.consumption||0).toLocaleString()} / E ${Number(d.production||0).toLocaleString()}`)
            }
            if (parts.length===0) return null
            return parts.join(' · ')
          })()}
        </div>
      </div>
    </section>
  )
}
