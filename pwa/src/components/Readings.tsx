import React, { useEffect, useState } from 'react'
import { loadReadings, saveReadings, loadCurrentMeterId, loadMeterInfo } from '../services/storage'
import { computeDeltas } from '../services/storage'
import AddReadingModal from './AddReadingModal'
import ConfirmModal from './ConfirmModal'
import { showToast } from '../services/toast'
import { parseCSV, toNumber } from '../services/csv'
import { UploadCloud, DownloadCloud } from 'lucide-react'

type Reading = { date:string, consumption:number, production:number, credit?:number }

export default function Readings(){
  const [data, setData] = useState<Reading[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const currentMeterId = loadCurrentMeterId()
  const meterInfo = loadMeterInfo()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showConfirmClear, setShowConfirmClear] = useState(false)

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
  try{
    const sorted = [...deltas].map(d=>({ ...d, date: new Date(d.date).toISOString() }))
    sorted.sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime())
    let running = 0
    for (const d of sorted){
      running += (Number(d.production) || 0) - (Number(d.consumption) || 0)
      cumulativeMap.set(new Date(d.date).toISOString(), running)
    }
  }catch(e){ /* ignore */ }

  return (
    <section>
      <div className="mb-4 text-sm text-gray-300">Medidor activo: <strong className="text-white">{currentMeterId}</strong> — {meterInfo.propietaria}</div>
      <div className="flex gap-2 mb-4 items-center justify-center flex-wrap">
          <button className="glass-button flex items-center gap-2 px-3 py-2" onClick={()=> setShowAddModal(true)}>Agregar lectura</button>
        <label className="glass-button cursor-pointer flex items-center gap-2 px-3 py-2">
          <UploadCloud size={16} />
          Importar CSV
          <input type="file" accept=".csv,.txt" onChange={onImport} className="hidden" />
        </label>
        <button className="glass-button flex items-center gap-2 px-3 py-2" onClick={exportJSON}><DownloadCloud size={16} />Exportar datos</button>
        <button className="glass-button bg-red-600 flex items-center gap-2 px-3 py-2" onClick={clearAll}>Limpiar</button>
      </div>
      {message && <div className="w-full text-center mb-4 text-sm text-gray-300">{message}</div>}

      <AddReadingModal open={showAddModal} onClose={()=> setShowAddModal(false)} onSaved={()=>{ setData(loadReadings()); setMessage('Lectura agregada') }} />
      <ConfirmModal open={showConfirmClear} title="Confirmar limpieza" message="¿Desea borrar todas las lecturas? Esta acción no se puede deshacer." onCancel={()=> setShowConfirmClear(false)} onConfirm={doClear} cancelText="Cancelar" confirmText="Borrar" />

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="text-gray-300">
              <th>
                <div className="glass-button px-3 py-1 w-full text-center text-white">Fecha</div>
              </th>
              <th>
                <div className="glass-button px-3 py-1 w-full text-center text-white">Lectura Recibida (raw)</div>
              </th>
              <th>
                <div className="glass-button px-3 py-1 w-full text-center text-white">Recibida kWh (∆)</div>
              </th>
              <th>
                <div className="glass-button px-3 py-1 w-full text-center text-white">Lectura Entregada (raw)</div>
              </th>
              <th>
                <div className="glass-button px-3 py-1 w-full text-center text-white">Entregada kWh (∆)</div>
              </th>
              <th>
                <div className="glass-button px-3 py-1 w-full text-center text-white">Saldo (kWh)</div>
              </th>
              <th>
                <div className="glass-button px-3 py-1 w-full text-center text-white">Saldo Acumulado (kWh)</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((r,idx)=> {
              const iso = new Date(r.date).toISOString()
              const d = deltaMap.get(iso) || { consumption: 0, production: 0, date: r.date }
              const saldo = (Number(d.production) || 0) - (Number(d.consumption) || 0)
              return (
                <tr key={idx} className="border-b border-gray-700">
                  <td className="py-2">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="py-2 text-right">{Number(r.consumption || 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                  <td className="py-2 text-right">{Number(d.consumption || 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                  <td className="py-2 text-right">{Number(r.production || 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                  <td className="py-2 text-right">{Number(d.production || 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                  <td className="py-2 text-right">{Number(saldo || 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                  <td className="py-2 text-right">{Number(cumulativeMap.get(iso) || 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
