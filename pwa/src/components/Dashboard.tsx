import React from 'react'
import { motion } from 'framer-motion'
import { getAllCompanies, getAllTariffs, getReadings, saveReadings, createPreviousQuartersFromActive, type CompanyRecord, type TariffRecord, type ReadingRecord } from '../services/supabasePure'
import { getAllMeters, getMeterById, createMeter, updateMeter } from '../services/supabaseBasic'
import MeterModal from './MeterModal'
import ConfirmModal from './ConfirmModal'
import { showToast } from '../services/toast'
import { computeInvoiceForPeriod } from '../services/billing'
import { exportPDF } from '../utils/pdfExport'
import { Zap, TrendingDown, TrendingUp, DollarSign, AlertTriangle, PlusCircle, Gauge, Settings, X, Plus, Building } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area, LabelList } from 'recharts'

function currency(v:number){ return `Q ${v.toFixed(2)}` }

export default function Dashboard({ onNavigate }: { onNavigate: (view: string) => void }){
  /**
   * Dashboard
   * ---------
   * Displays metrics for the currently selected meter. Selection is read from
   * `localStorage.ape_currentMeterId` and via `ape:meterChange` global events.
   * Recent UI improvements:
   * - Pull-to-refresh spinner while `loadAllData()` runs.
   * - Card entrance animation using `framer-motion`.
   */
  const [meters, setMeters] = React.useState<any[]>([])
  const [currentMeterId, setCurrentMeterId] = React.useState<string>('')
  const [meterInfo, setMeterInfo] = React.useState<any>({})
  const [showMeterModal, setShowMeterModal] = React.useState(false)
  const [modalInitialMeter, setModalInitialMeter] = React.useState<any | null>(null)
  const [showCreateQuartersModal, setShowCreateQuartersModal] = React.useState(false)
  const [createQuartersCount, setCreateQuartersCount] = React.useState<number>(2)
  const [pendingCreateQuarters, setPendingCreateQuarters] = React.useState<number | null>(null)

  const [companies, setCompanies] = React.useState<CompanyRecord[]>([])
  const [tariffs, setTariffs] = React.useState<TariffRecord[]>([])
  const [readings, setReadings] = React.useState<ReadingRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  // Pull-to-refresh states (mobile)
  const [touchStartY, setTouchStartY] = React.useState<number | null>(null)
  const [pullDistance, setPullDistance] = React.useState<number>(0)
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false)

  // Load all data from Supabase on mount
  React.useEffect(() => {
    loadAllData()

    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail || {}
        const meterIdFromEvent = detail.meterId

        ;(async () => {
          try {
            // Prefer fetching the specific meter row and its readings to update UI quickly
            const persisted = (() => { try { return localStorage.getItem('ape_currentMeterId') } catch (e) { return null } })() || meterIdFromEvent
            if (persisted) {
              try {
                // Try to resolve persisted as an id first, then as a contador
                let m = await getMeterById(persisted)
                if (!m) {
                  try {
                    m = await (await import('../services/supabaseBasic')).getMeterByContador(persisted)
                  } catch (e) {
                    // ignore
                  }
                }

                if (m) {
                  setCurrentMeterId(m.id)
                  setMeterInfo(m)
                  // fetch only readings for this meter to minimize data transferred
                  const rr = await getReadings(m.contador || m.id)
                  setReadings(rr)
                }
              } catch (err) {
                console.warn('Error fetching meter/readings on meterChange:', err)
              }
            }
            // Also refresh all other data in background to keep everything in sync
            try { await loadAllData() } catch(e){ /* ignore */ }
          } catch (err) { console.warn('Async handler error for ape:meterChange', err) }
        })()

      } catch (err) { console.warn('Error handling ape:meterChange', err) }
    }

    window.addEventListener('ape:meterChange', handler as EventListener)
    return () => { window.removeEventListener('ape:meterChange', handler as EventListener) }
  }, [])

  // Pull-to-refresh handlers
  function onTouchStart(e: React.TouchEvent) {
    if (window.scrollY === 0 && !isRefreshing) {
      setTouchStartY(e.touches[0].clientY)
      setPullDistance(0)
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (touchStartY == null) return
    const dy = e.touches[0].clientY - touchStartY
    if (dy > 0) {
      // user is pulling down
      const capped = Math.min(dy, 140)
      setPullDistance(capped)
      // prevent default scrolling when pulling to show indicator
      if (capped > 0) e.preventDefault()
    } else {
      setPullDistance(0)
    }
  }

  async function onTouchEnd() {
    if (touchStartY == null) return
    try {
      if (pullDistance >= 80) {
        setIsRefreshing(true)
        await loadAllData()
      }
    } catch (err) {
      console.warn('Error during pull-to-refresh', err)
    } finally {
      setIsRefreshing(false)
      setPullDistance(0)
      setTouchStartY(null)
    }
  }

  async function loadAllData(){
    try {
      setLoading(true)
      console.log('🔄 Loading all dashboard data from Supabase...')

      const [metersData, companiesData, tariffsData, readingsData] = await Promise.all([
        getAllMeters(),
        getAllCompanies(),
        getAllTariffs(),
        getReadings()
      ])

      setMeters(metersData)
      setCompanies(companiesData)
      setTariffs(tariffsData)
      setReadings(readingsData)

      // Set current meter (use persisted selection if available, otherwise first)
      if (metersData.length > 0) {
        const persisted = (() => { try { return localStorage.getItem('ape_currentMeterId') } catch (e) { return null } })()
        // allow persisted to be either meter.id (uuid) or meter.contador (human readable)
        let currentMeter = null
        if (persisted) {
          currentMeter = metersData.find(m => m.id === persisted) || metersData.find(m => m.contador === persisted) || null
        }
        if (!currentMeter) currentMeter = metersData[0]
        setCurrentMeterId(currentMeter.id)
        setMeterInfo(currentMeter)
        // Filter readings to current meter
        const filteredReadings = readingsData.filter(r => r.meter_id === currentMeter.contador || r.meter_id === currentMeter.id)
        setReadings(filteredReadings)
        console.log('📊 Dashboard data loaded from Supabase:', {
          meters: metersData.length,
          companies: companiesData.length,
          tariffs: tariffsData.length,
          readings: readingsData.length,
          filteredReadings: filteredReadings.length,
          currentMeterId: currentMeter.id,
          readingsMeterIds: readingsData.map(r => r.meter_id)
        })
      }
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error)
      showToast('Error cargando datos del dashboard', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Helper functions for calculations
  function computeDeltas(readings: ReadingRecord[]) {
    if (!readings || readings.length < 2) return []

    const sorted = [...readings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const deltas = []

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      const consumption = Number(curr.consumption || 0) - Number(prev.consumption || 0)
      const production = Number(curr.production || 0) - Number(prev.production || 0)
      const credit = Number(curr.credit || 0)

      deltas.push({
        date: curr.date,
        consumption,
        production,
        credit,
        net: production - consumption
      })
    }

    return deltas
  }

  function findActiveTariffForDate(date: string, company?: string, segment?: string) {
    const targetDate = new Date(date)
    const activeTariffs = tariffs.filter(tariff => {
      // Support multiple tariff shapes: either `tariff.header.period.from/to` or `tariff.period_from` / `tariff.period_to`
      const fromStr = tariff?.header?.period?.from || tariff?.period_from || tariff?.header?.period_from || tariff?.header?.from
      const toStr = tariff?.header?.period?.to || tariff?.period_to || tariff?.header?.period_to || tariff?.header?.to
      const fromDate = fromStr ? new Date(fromStr) : new Date('1970-01-01')
      const toDate = toStr ? new Date(toStr) : new Date('2999-12-31')
      const matchesDate = targetDate >= fromDate && targetDate <= toDate
      const tariffCompany = tariff?.header?.company || tariff?.company || tariff?.company_code
      const tariffSegment = tariff?.header?.segment || tariff?.segment
      const matchesCompany = !company || tariffCompany === company
      const matchesSegment = !segment || tariffSegment === segment
      return matchesDate && matchesCompany && matchesSegment
    })

    return activeTariffs.length > 0 ? activeTariffs[0] : null
  }

  const handleExportPDF = async () => {
    await exportPDF()
  }

  // Calculate monthly consumption and production
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  let consumptionMonth = 0
  let productionMonth = 0
  let creditAccum = 0

  readings.forEach(r => {
    const d = new Date(r.date)
    if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
      consumptionMonth += Number(r.consumption || 0)
      productionMonth += Number(r.production || 0)
    }
    creditAccum += Number(r.credit || 0)
  })

  const netMonth = consumptionMonth - productionMonth

  // Find active tariff for this date and using current meter info (distribuidora/company, tipo_servicio/segment)
  const companyParam = meterInfo?.distribuidora || undefined
  const segmentParam = meterInfo?.tipo_servicio || undefined
  const activeTariff = findActiveTariffForDate(new Date().toISOString(), companyParam, segmentParam)

  // Compute invoice for the month: prorate fixed charge per month
  const invoice = activeTariff ? computeInvoiceForPeriod(consumptionMonth, productionMonth, activeTariff, { forUnit: 'month', date: new Date().toISOString(), credits_kWh: creditAccum }) : { total_due_Q: 0 }

  // Estimated bill: prefer last delta's invoice if available, otherwise month invoice
  let estimatedBill = invoice.total_due_Q
  const deltas = computeDeltas(readings)
  let lastDelta = null
  if (deltas && deltas.length > 0) {
    lastDelta = deltas[deltas.length - 1]
    if (lastDelta) {
      try {
        const lastTariff = findActiveTariffForDate(lastDelta.date)
        if (lastTariff) {
          const lastInv = computeInvoiceForPeriod(Number(lastDelta.consumption || 0), Number(lastDelta.production || 0), lastTariff, { forUnit: 'period', date: lastDelta.date })
          if (lastInv && typeof lastInv.total_due_Q === 'number') {
            estimatedBill = lastInv.total_due_Q
          }
        }
      } catch (e) { /* ignore and fall back */ }
    }
  }

  // Compute latest saldo and accumulated saldo
  let latestSaldo = 0
  let accumulatedSaldo = 0
  if (deltas && deltas.length > 0) {
    const latest = deltas[deltas.length - 1]
    latestSaldo = (Number(latest.production) || 0) - (Number(latest.consumption) || 0)
    accumulatedSaldo = deltas.reduce((acc, cur) => acc + ((Number(cur.production) || 0) - (Number(cur.consumption) || 0)), 0)
  }

  // Find readings that do not have an active tariff assigned
  let readingsMissingTariff: string[] = []
  try {
    const missing = readings.filter(r => {
      try {
        const t = findActiveTariffForDate(r.date)
        return !t
      } catch (e) { return true }
    })
    // Unique dates
    const uniq = Array.from(new Set(missing.map(m => new Date(m.date).toISOString().split('T')[0])))
    readingsMissingTariff = uniq
  } catch (e) { readingsMissingTariff = [] }

  // Compute chart data (rows and cumulativeRows) for charts
  let chartRows: any[] = []
  let cumulativeRows: any[] = []
  let chartRowsAvg: any[] = []
  let chartRowsAvgProd: any[] = []

  try {
    if (readings && readings.length >= 2) {
      const items = [...readings].map(r => ({ ...r, date: new Date(r.date).toISOString() }))
      items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1]
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

      // Build average kWh/day series (consumptionDelta / days between readings)
      const MS_PER_DAY = 1000 * 60 * 60 * 24
      const avgConsSeries: any[] = []
      const avgProdSeries: any[] = []

      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1]
        const curr = items[i]
        const consumptionDelta = Number(curr.consumption || 0) - Number(prev.consumption || 0)
        const productionDelta = Number(curr.production || 0) - Number(prev.production || 0)
        const days = Math.max(0, Math.floor((new Date(curr.date).getTime() - new Date(prev.date).getTime()) / MS_PER_DAY))
        const avgCons = days > 0 ? (consumptionDelta / days) : null
        const avgProd = days > 0 ? (productionDelta / days) : null
        avgConsSeries.push({ date: curr.date.split('T')[0], avg: avgCons, raw: consumptionDelta, days })
        avgProdSeries.push({ date: curr.date.split('T')[0], avg: avgProd, raw: productionDelta, days })
      }

      let running = 0
      cumulativeRows = chartRows.map(r => {
        running += (Number(r.production) || 0) - (Number(r.consumption) || 0)
        return { ...r, cumulative: running, positive: Math.max(running, 0), negative: Math.abs(Math.min(running, 0)) }
      })

      // Expose avg series to outer scope
      chartRowsAvg = avgConsSeries
      chartRowsAvgProd = avgProdSeries
    }
  } catch (e) { chartRows = []; cumulativeRows = [] }

  return (
    <section id="dashboard-printable"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <div style={{ height: pullDistance }} className="pointer-events-none">
        {pullDistance > 0 && (
          <div className="w-full flex items-center justify-center">
            {isRefreshing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white/40 border-b-2 border-transparent" />
                <div className="text-xs text-gray-300 py-2">Refrescando...</div>
              </div>
            ) : (
              <div className="text-xs text-gray-300 py-2">
                {pullDistance >= 80 ? 'Suelta para actualizar' : 'Desliza para actualizar'}
              </div>
            )}
          </div>
        )}
      </div>
      <motion.div initial="hidden" animate="visible" variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.03 } }
      }} className="grid grid-cards gap-4 sm:grid-cols-1 md:grid-cols-2">
        {/* Buttons to manage meter info: create new or update existing */}
        <motion.div whileHover={{ y: -4 }} className="card min-h-28">
          <div className="flex items-center justify-between w-full">
            <div className="pr-4">
              <h3 className="text-xs text-gray-300">Medidor / Información</h3>
              <div className="mt-2 text-xs text-gray-200">Contador: <strong>{meterInfo.contador}</strong> · Correlativo: <strong>{meterInfo.correlativo}</strong></div>
            </div>
              <div className="ml-4 flex flex-col gap-2 items-end">
              <button className="glass-button p-2" title="Gestionar medidores" aria-label="Gestionar medidores" onClick={()=> onNavigate('meters')}><Settings size={14} /></button>
            </div>
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -4 }} className="card min-h-28">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs text-gray-300">Maestro de Compañías</h3>
              <p className="text-xs text-gray-400 mt-1">Gestiona empresas y códigos de tarifa</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-gray-500" title={companies.map(c => `${c.id} (${c.code}): ${c.name}`).join('\n')}>
                {companies.length} registros
              </span>
              <button className="glass-button p-2" title="Compañías" aria-label="Compañías" onClick={()=> onNavigate('companies')}><Building size={14} /></button>
            </div>
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -4 }} className="card min-h-28">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs text-gray-300">Tarifas</h3>
              <p className="text-xs text-gray-400 mt-1">Gestiona tarifas por empresa y segmento</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-gray-500" title={tariffs.map(t => `${t.id}: ${t.company} ${t.segment} (${t.period_from} → ${t.period_to})`).join('\n')}>
                {tariffs.length} registros
              </span>
              <button className="glass-button p-2" title="Tarifas" aria-label="Tarifas" onClick={()=> onNavigate('tariffs')}><DollarSign size={14} /></button>
            </div>
          </div>
        </motion.div>
        <div className="card min-h-28">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs text-gray-300">Lecturas</h3>
              <p className="text-xs text-gray-400 mt-1">Historial de lecturas del medidor</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-gray-500" title={readings.slice(0,10).map(r => `${r.date}: Cons ${r.consumption}, Prod ${r.production}`).join('\n') + (readings.length > 10 ? '\n... y más' : '')}>
                {readings.length} registros
              </span>
              <button className="glass-button p-2" title="Lecturas" aria-label="Lecturas" onClick={()=> onNavigate('readings')}><Gauge size={14} /></button>
            </div>
          </div>
        </div>
        {/* meter info moved to header (Navbar) to appear under the title */}
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
                  <button
                    className={`glass-button p-2 flex items-center gap-2 ${readingsMissingTariff.length===0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={readingsMissingTariff.length===0}
                    onClick={async ()=>{
                      if (readingsMissingTariff.length===0) return
                      // open modal to ask for number of quarters
                      setCreateQuartersCount(2)
                      setShowCreateQuartersModal(true)
                    }}
                    title={readingsMissingTariff.length===0 ? 'No hay lecturas sin tarifa pendientes' : 'Crear trimestres anteriores (KIS)'}
                  ><PlusCircle size={14} /><span className="hidden md:inline">Crear trimestres anteriores (KIS)</span></button>
        </div>
        {/* meter info will be rendered at the top */}
      </div>

      {/* Line chart card */}
      <div className="glass-card mt-6 p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Producción neta por periodo (Entregado - Recibido)
          </h3>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={chartRows} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.95)', fontSize: 9 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.95)', fontSize: 9 }} />
                <Tooltip formatter={(value: any) => `${value} kWh`} itemStyle={{ color: '#fff' }} contentStyle={{ background: '#0b1222', borderColor: 'rgba(255,255,255,0.06)' }} />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.85)' }} />
                <Line type="monotone" dataKey="net" name="Neto (kWh)" stroke="#38bdf8" strokeWidth={3} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="production" name="Producción" stroke="#34d399" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="consumption" name="Consumo" stroke="#fb7185" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
      </div>

        {/* Average consumption per day chart */}
        <div className="glass-card mt-6 p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Recibida kWh/día (promedio)
          </h3>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={chartRowsAvg || []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.95)', fontSize: 9 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.95)', fontSize: 9 }} />
                <Tooltip formatter={(value: any, name: any, props: any) => {
                  if (name === 'avg') return [`${Number(value).toFixed(2)} kWh/d`, 'Promedio']
                  return [`${value} kWh`, name]
                }} itemStyle={{ color: '#fff' }} contentStyle={{ background: '#0b1222', borderColor: 'rgba(255,255,255,0.06)' }} />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.85)' }} />
                <Line type="monotone" dataKey="avg" name="kWh/día (avg)" stroke="#f59e0b" strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls={true}>
                  <LabelList dataKey="avg" position="top" style={{ fontSize: 8, fill: 'rgba(255,255,255,0.95)' }} formatter={(v:any)=> v==null?'-':Number(v).toFixed(2)} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Average production per day chart */}
        <div className="glass-card mt-6 p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Entregada kWh/día (promedio)
          </h3>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={chartRowsAvgProd || []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 8 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 8 }} />
                <Tooltip formatter={(value: any, name: any) => {
                  if (name === 'avg') return [`${Number(value).toFixed(2)} kWh/d`, 'Promedio']
                  return [`${value} kWh`, name]
                }} itemStyle={{ color: '#fff' }} contentStyle={{ background: '#0b1222', borderColor: 'rgba(255,255,255,0.06)' }} />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
                <Line type="monotone" dataKey="avg" name="kWh/día (avg)" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false}>
                  <LabelList dataKey="avg" position="top" style={{ fontSize: 7, fill: 'rgba(255,255,255,0.9)' }} formatter={(v:any)=> v==null?'-':Number(v).toFixed(2)} />
                </Line>
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
          <div className="mt-2" style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <AreaChart data={cumulativeRows} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 8 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 8 }} />
                <Tooltip formatter={(value: any) => `${value} kWh`} itemStyle={{ color: '#fff' }} contentStyle={{ background: '#0b1222', borderColor: 'rgba(255,255,255,0.06)' }} />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
                <Area type="monotone" dataKey="positive" name="Saldo positivo (kWh)" stroke="#34d399" fill="#134e4a" fillOpacity={0.6} />
                <Area type="monotone" dataKey="negative" name="Saldo negativo (abs kWh)" stroke="#fb7185" fill="#4c0519" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
            {/* Facturación table removed from live UI; generated only at PDF export */}
          {showMeterModal && (
            <MeterModal
              open={showMeterModal}
              initial={modalInitialMeter || meterInfo}
              readOnlyPK={!!(modalInitialMeter && modalInitialMeter.contador)}
              onClose={()=>{ setShowMeterModal(false); setModalInitialMeter(null) }}
              onSave={async (m) => {
                try {
                  // Determine if creating new or updating existing
                  const creating = !(modalInitialMeter && modalInitialMeter.id)

                  if (creating) {
                    // Check if meter already exists
                    const existingMeters = await getAllMeters()
                    const exists = existingMeters.some(meter => meter.contador === m.contador)
                    if (exists) {
                      showToast('El contador ya existe', 'error')
                      return
                    }

                    // Create new meter
                    await createMeter(m)
                    setCurrentMeterId(m.id)
                    setMeterInfo(m)
                    showToast('Medidor creado y seleccionado', 'success')
                  } else {
                    // Update existing meter
                    await updateMeter(m.id, m)
                    setMeterInfo(m)
                    showToast('Información del medidor actualizada', 'success')
                  }

                  setShowMeterModal(false)
                  setModalInitialMeter(null)
                  await loadAllData() // Reload all data
                } catch (error) {
                  console.error('Error saving meter:', error)
                  showToast('Error guardando medidor', 'error')
                }
              }}
            />
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
                  <button className="glass-button p-2 flex items-center gap-2" title="Cancelar" aria-label="Cancelar" onClick={()=>setShowCreateQuartersModal(false)}><X size={14} /><span className="hidden md:inline">Cancelar</span></button>
                  <button className="glass-button p-2 bg-green-600 text-white flex items-center gap-2" title="Crear trimestres" aria-label="Crear trimestres anteriores" onClick={async ()=>{
                    const n = Number(createQuartersCount||0)
                    if (!n || n<=0){ showToast('Ingresa un número válido de trimestres', 'error'); return }
                    setShowCreateQuartersModal(false)
                    try {
                      const res = await createPreviousQuartersFromActive(n, 'EEGSA', 'BTSA')
                      showToast(`Creados: ${res.created}. Revisa la sección Tarifas.`, 'success')
                      await loadAllData() // Reload data
                    } catch (error) {
                      console.error('Error creating quarters:', error)
                      showToast('Error creando trimestres', 'error')
                    }
                  }}><PlusCircle size={14} /><span className="hidden md:inline">Crear</span></button>
                </div>
              </div>
            </div>
          )}

        </section>
  )
}
