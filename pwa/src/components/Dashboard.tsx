import React from 'react'
import { loadReadings, computeDeltas, findActiveTariffForDate, createPreviousQuartersFromActive, loadMeterInfo, loadMeters, loadCurrentMeterId, saveMeters, saveCurrentMeterId, migrateLegacyReadingsToCurrentMeter, loadMigrationInfo, clearMigrationInfo } from '../services/storage'
import MeterModal from './MeterModal'
import ConfirmModal from './ConfirmModal'
import { showToast } from '../services/toast'
import { computeInvoiceForPeriod } from '../services/billing'
import { Zap, TrendingDown, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area } from 'recharts'

function currency(v:number){ return `Q ${v.toFixed(2)}` }

export default function Dashboard(){
  const readings = loadReadings()
  const [metersMap, setMetersMap] = React.useState<Record<string, any>>(() => loadMeters())
  const [currentMeterId, setCurrentMeterId] = React.useState<string>(() => loadCurrentMeterId())
  const [meterInfo, setMeterInfo] = React.useState(loadMeterInfo())
  const [showMeterModal, setShowMeterModal] = React.useState(false)
  const [modalInitialMeter, setModalInitialMeter] = React.useState<any | null>(null)
  const [showCreateQuartersModal, setShowCreateQuartersModal] = React.useState(false)
  const [createQuartersCount, setCreateQuartersCount] = React.useState<number>(2)
  const [showMigrateConfirm, setShowMigrateConfirm] = React.useState(false)
  const [pendingCreateQuarters, setPendingCreateQuarters] = React.useState<number | null>(null)

  // Run one-time migration automatically when Dashboard mounts, if legacy data exists.
  React.useEffect(()=>{
    try{
      if (typeof window !== 'undefined' && window.localStorage.getItem('apenergia:readings')){
        // perform migration immediately (as requested)
        const res = migrateLegacyReadingsToCurrentMeter()
        showToast(`Migradas ${res.migrated} lecturas legacy a ${res.to}`, 'success')
        // reload to ensure UI picks up namespaced readings
        setTimeout(()=> window.location.reload(), 600)
      }
    }catch(e){ /* ignore */ }
  }, [])

  // check migration info so we can show a persistent banner after reload
  const [migrationInfo, setMigrationInfo] = React.useState<any | null>(()=> loadMigrationInfo())
  const thisMonth = new Date().getMonth()
  let consumptionMonth = 0
  let productionMonth = 0
  let creditAccum = 0

  readings.forEach(r=>{
    const d = new Date(r.date)
    if (d.getMonth() === thisMonth && d.getFullYear() === new Date().getFullYear()){
      consumptionMonth += Number(r.consumption || 0)
      productionMonth += Number(r.production || 0)
    }
    creditAccum += Number(r.credit || 0)
  })

  const netMonth = consumptionMonth - productionMonth

  // find active tariff for this date and segment EEGSA/BTSA
  const activeTariff = findActiveTariffForDate(new Date().toISOString(), 'EEGSA', 'BTSA')
  // compute invoice for the month: prorate fixed charge per month
  // pass accumulated credit as kWh (credits_kWh) since stored credit is energy units
  const invoice = computeInvoiceForPeriod(consumptionMonth, productionMonth, activeTariff, { forUnit: 'month', date: new Date().toISOString(), credits_kWh: creditAccum } as any)
  // estimatedBill: prefer last delta's invoice (last period) if available, otherwise month invoice
  let estimatedBill = invoice.total_due_Q
  let lastDelta: any = null
  try{
    const raws = loadReadings()
    const deltas = computeDeltas(raws || [])
    if (deltas && deltas.length>0) lastDelta = deltas[deltas.length-1]
    if (lastDelta){
      try{
        const lastTariff = findActiveTariffForDate(lastDelta.date)
        const lastInv = computeInvoiceForPeriod(Number(lastDelta.consumption||0), Number(lastDelta.production||0), lastTariff, { forUnit: 'period', date: lastDelta.date } as any)
        if (lastInv && typeof lastInv.total_due_Q === 'number') estimatedBill = lastInv.total_due_Q
      }catch(e){ /* ignore and fall back */ }
    }
  }catch(e){ /* ignore */ }

  // compute latest saldo (from deltas) and month accumulated saldo
  let latestSaldo = 0
  let accumulatedSaldo = 0
  try{
    const raws = loadReadings()
    const deltas = computeDeltas(raws || [])
    if (deltas && deltas.length>0){
      const latest = deltas[deltas.length-1]
      latestSaldo = (Number(latest.production)||0) - (Number(latest.consumption)||0)
      accumulatedSaldo = deltas.reduce((acc,cur)=> acc + ((Number(cur.production)||0) - (Number(cur.consumption)||0)), 0)
    }
  }catch(e){ /* ignore */ }

  // Find readings that do not have an active tariff assigned
  let readingsMissingTariff: string[] = []
  try{
    const all = readings || []
    const missing = all.filter(r => {
      try{
        const t = findActiveTariffForDate(r.date)
        return !t
      }catch(e){ return true }
    })
    // unique dates (format to date only)
    const uniq = Array.from(new Set(missing.map(m => new Date(m.date).toISOString().split('T')[0])))
    readingsMissingTariff = uniq
  }catch(e){ readingsMissingTariff = [] }

  // compute chart data (rows and cumulativeRows) for charts
  let chartRows: any[] = []
  let cumulativeRows: any[] = []
  try {
    const rawsForChart = loadReadings()
    if (rawsForChart && rawsForChart.length >= 2) {
      const items = [...rawsForChart].map(r=>({ ...r, date: new Date(r.date).toISOString() }))
      items.sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime())
      for (let i=1;i<items.length;i++){
        const prev = items[i-1]
        const curr = items[i]
        const consCurr = Number(curr.consumption || 0)
        const prodCurr = Number(curr.production || 0)
        const consPrev = Number(prev.consumption || 0)
        const prodPrev = Number(prev.production || 0)
        const consumptionDelta = consCurr - consPrev
        const productionDelta = prodCurr - prodPrev
        const net = productionDelta - consumptionDelta
        chartRows.push({ date: curr.date.split('T')[0], consumption: consumptionDelta, production: productionDelta, net })
      }
      let running = 0
      cumulativeRows = chartRows.map(r=>{
        running += (Number(r.production)||0) - (Number(r.consumption)||0)
        return { ...r, cumulative: running, positive: Math.max(running,0), negative: Math.abs(Math.min(running,0)) }
      })
    }
  }catch(e){ chartRows = []; cumulativeRows = [] }

  return (
    <section>
      <div className="grid grid-cards gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-gray-300">Consumo del Mes</h3>
              <p className="text-2xl mt-2">{(lastDelta ? Number(lastDelta.consumption).toFixed(2) : consumptionMonth.toFixed(2))} kWh</p>
            </div>
            <TrendingDown className="text-red-400" size={28} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-gray-300">Producción del Mes</h3>
              <p className="text-2xl mt-2">{(lastDelta ? Number(lastDelta.production).toFixed(2) : productionMonth.toFixed(2))} kWh</p>
            </div>
            <TrendingUp className="text-blue-400" size={28} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-gray-300">Factura Estimada</h3>
              <p className="text-2xl mt-2">{currency(estimatedBill)}</p>
              <div className="text-xs text-gray-400 mt-1">
                {activeTariff ? `${activeTariff.header.company} — ${activeTariff.header.segment} (${activeTariff.header.period.from} → ${activeTariff.header.period.to})` : 'Sin tarifa activa (usar tarifa por defecto)'}
              </div>
            </div>
            <DollarSign className="text-purple-400" size={28} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-gray-300">Saldo último registro</h3>
              <p className="text-2xl mt-2">{latestSaldo.toFixed(2)} kWh</p>
              <div className="text-xs text-gray-400 mt-1">(Producción - Consumo del último periodo)</div>
            </div>
            <TrendingUp className="text-green-400" size={28} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-gray-300">Saldo acumulado (Crédito)</h3>
              <p className="text-2xl mt-2">{accumulatedSaldo.toFixed(2)} kWh</p>
              <div className="text-xs text-gray-400 mt-1">(Suma de saldos por periodo — crédito de la cuenta)</div>
            </div>
            <TrendingUp className="text-yellow-400" size={28} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-gray-300">Lecturas sin tarifa</h3>
              <p className="text-2xl mt-2">{readingsMissingTariff.length}</p>
              <div className="text-xs text-gray-400 mt-1">Fechas sin tarifa activa. Ir a Tarifas para crear tarifas históricas.</div>
            </div>
            <div className="text-right">
              {readingsMissingTariff.length>0 && (
                <div className="text-xs text-gray-200">
                  {readingsMissingTariff.slice(0,6).map(d=> (
                    <div key={d}>{new Date(d).toLocaleDateString()}</div>
                  ))}
                  {readingsMissingTariff.length>6 && <div className="text-xs text-gray-400">... y {readingsMissingTariff.length-6} más</div>}
                </div>
              )}
            </div>
            <AlertTriangle className="text-red-400" size={28} />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className={`glass-button px-3 py-2 ${readingsMissingTariff.length===0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={readingsMissingTariff.length===0}
              onClick={()=>{
                if (readingsMissingTariff.length===0) return
                // open modal to ask for number of quarters
                setCreateQuartersCount(2)
                setShowCreateQuartersModal(true)
              }}
              title={readingsMissingTariff.length===0 ? 'No hay lecturas sin tarifa pendientes' : 'Crear trimestres anteriores (KIS)'}
            >Crear trimestres anteriores (KIS)</button>
            {/* Migration button: only show if legacy key exists */}
            {typeof window !== 'undefined' && window.localStorage.getItem('apenergia:readings') && (
              <>
                <button
                  className="glass-button px-3 py-2 bg-amber-600"
                  onClick={()=>{
                    setShowMigrateConfirm(true)
                  }}
                >Migrar lecturas legacy</button>
              </>
            )}
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-gray-300">Información del contador</h3>
              <p className="text-sm text-gray-200 mt-2">{meterInfo.contador} — {meterInfo.propietaria}</p>
              <div className="text-xs text-gray-400 mt-1">{meterInfo.distribuidora} · {meterInfo.tipo_servicio} · Correlativo: {meterInfo.correlativo}</div>
              <div className="mt-2">
                <label className="text-xs text-gray-400">Medidor activo</label>
                <select className="ml-2 bg-transparent border border-white/10 text-white px-2 py-1 rounded" value={currentMeterId} onChange={(e)=>{
                  const id = e.target.value
                  saveCurrentMeterId(id)
                  setCurrentMeterId(id)
                  const m = loadMeters()[id]
                  if (m) setMeterInfo(m)
                }}>
                  {Object.keys(metersMap).map(k=> (
                    <option key={k} value={k}>{k} — {metersMap[k].propietaria}</option>
                  ))}
                </select>
              </div>
            </div>
              <div className="text-right flex flex-col items-end gap-2">
              <button className="glass-button px-3 py-2 w-full sm:w-36 inline-flex items-center justify-center whitespace-nowrap" onClick={()=>{ setModalInitialMeter(meterInfo); setShowMeterModal(true) }}>Editar contador</button>
              <button className="glass-button px-3 py-2 w-full sm:w-36 inline-flex items-center justify-center whitespace-nowrap" onClick={()=>{ setModalInitialMeter({ contador: '', correlativo: '', propietaria: '', nit: '', distribuidora: 'EEGSA', tipo_servicio: '', sistema: '' }); setShowMeterModal(true) }}>Agregar medidor</button>
            </div>
          </div>
        </div>
      </div>

      {/* Line chart card */}
      <div className="glass-card mt-6 p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Producción neta por periodo (Entregado - Recibido)
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={chartRows} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.8)' }} />
                <Tooltip formatter={(value: any) => `${value} kWh`} itemStyle={{ color: '#fff' }} contentStyle={{ background: '#0b1222', borderColor: 'rgba(255,255,255,0.06)' }} />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
                <Line type="monotone" dataKey="net" name="Neto (kWh)" stroke="#60a5fa" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="production" name="Producción" stroke="#34d399" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="consumption" name="Consumo" stroke="#fb7185" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
      </div>

        {/* Area chart card (accumulated saldo) */}
        <div className="glass-card mt-6 p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Saldo acumulado (kWh)
          </h3>
          <div className="mt-2" style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={cumulativeRows} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.8)' }} />
                <Tooltip formatter={(value: any) => `${value} kWh`} itemStyle={{ color: '#fff' }} contentStyle={{ background: '#0b1222', borderColor: 'rgba(255,255,255,0.06)' }} />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
                <Area type="monotone" dataKey="positive" name="Saldo positivo (kWh)" stroke="#34d399" fill="#134e4a" fillOpacity={0.6} />
                <Area type="monotone" dataKey="negative" name="Saldo negativo (abs kWh)" stroke="#fb7185" fill="#4c0519" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
          {showMeterModal && (
            <MeterModal
              open={showMeterModal}
              initial={modalInitialMeter || meterInfo}
              onClose={()=>{ setShowMeterModal(false); setModalInitialMeter(null) }}
              onSave={(m)=>{
                // update meters map and set current meter
                const mm = loadMeters()
                mm[m.contador] = m
                saveMeters(mm)
                saveCurrentMeterId(m.contador)
                setMetersMap(mm)
                setMeterInfo(m)
                setShowMeterModal(false)
                setModalInitialMeter(null)
                showToast('Información del contador guardada', 'success')
              }}
            />
          )}
          {migrationInfo && (
            <div className="mt-4 p-3 bg-emerald-900/30 border border-emerald-700 rounded text-sm text-white">
              Migración completada: se migraron <strong>{migrationInfo.migrated}</strong> lecturas a <code className="mx-1">{migrationInfo.to}</code>. Backup guardado en <code className="mx-1">{migrationInfo.backupKey}</code>.
              <button className="ml-4 glass-button px-2 py-1" onClick={()=>{ clearMigrationInfo(); setMigrationInfo(null); showToast('Aviso de migración descartado', 'info') }}>Cerrar</button>
            </div>
          )}
          {showCreateQuartersModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={()=>setShowCreateQuartersModal(false)} />
              <div className="glass-card max-w-md w-full p-6 z-10 text-white">
                <h3 className="text-lg font-semibold mb-2">Crear trimestres anteriores (KIS)</h3>
                <div className="text-sm text-gray-300 mb-4">Indica cuántos trimestres anteriores crear copiando la tarifa activa.</div>
                <div className="mb-4">
                  <label className="text-xs text-gray-400">Trimestres</label>
                  <input type="number" min={1} value={createQuartersCount} onChange={(e)=>setCreateQuartersCount(Number(e.target.value||0))} className="ml-2 bg-transparent border border-white/10 text-white px-2 py-1 rounded w-24" />
                </div>
                <div className="flex justify-end gap-2">
                  <button className="glass-button px-3 py-2" onClick={()=>setShowCreateQuartersModal(false)}>Cancelar</button>
                  <button className="glass-button px-3 py-2 bg-green-600 text-white" onClick={()=>{
                    const n = Number(createQuartersCount||0)
                    if (!n || n<=0){ showToast('Ingresa un número válido de trimestres', 'error'); return }
                    setShowCreateQuartersModal(false)
                    const res = createPreviousQuartersFromActive(n, 'EEGSA', 'BTSA')
                    showToast(`Creados: ${res.created}. Revisa la sección Tarifas.`, 'success')
                    setTimeout(()=> window.location.reload(), 900)
                  }}>Crear</button>
                </div>
              </div>
            </div>
          )}

          <ConfirmModal
            open={showMigrateConfirm}
            title="Migrar lecturas legacy"
            message="Se migrarán las lecturas legacy a la llave del medidor actual y se borrará la clave legacy. ¿Continuar?"
            onCancel={()=>setShowMigrateConfirm(false)}
            onConfirm={()=>{
              setShowMigrateConfirm(false)
              const res = migrateLegacyReadingsToCurrentMeter()
              showToast(`Migradas ${res.migrated} filas a ${res.to}`, 'success')
              setTimeout(()=> window.location.reload(), 600)
            }}
            confirmText="Migrar"
            cancelText="Cancelar"
          />
        </section>
  )
}
