import React from 'react'
import { motion } from 'framer-motion'
import { getAllCompanies, getAllTariffs, getReadings, saveReadings, createPreviousQuartersFromActive, type CompanyRecord, type TariffRecord, type ReadingRecord } from '../services/supabasePure'
import { getAllMeters, getMeterById, createMeter, updateMeter } from '../services/supabaseBasic'
import MeterModal from './MeterModal'
import ConfirmModal from './ConfirmModal'
import InvoiceModal from './InvoiceModal'
import SeasonalAnalysis from './SeasonalAnalysis'
import { showToast } from '../services/toast'
import { computeInvoiceForPeriod } from '../services/billing'
import { exportPDF } from '../utils/pdfExport'
import { Zap, TrendingDown, TrendingUp, DollarSign, AlertTriangle, PlusCircle, Gauge, Settings, X, Plus, Building, LineChart as ChartIcon } from 'lucide-react'
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
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [localeInfo, setLocaleInfo] = React.useState('')
  const [showInvoiceModal, setShowInvoiceModal] = React.useState(false)
  const [selectedInvoiceRow, setSelectedInvoiceRow] = React.useState<any>(null)

  // Function to open meter configuration modal for current meter
  const openCurrentMeterConfig = () => {
    if (meterInfo && Object.keys(meterInfo).length > 0) {
      setModalInitialMeter(meterInfo)
      setShowMeterModal(true)
    }
  }

  // Load all data from Supabase on mount
  React.useEffect(() => {
    loadAllData()

    try {
      const loc = Intl.DateTimeFormat().resolvedOptions().locale
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      setLocaleInfo(`${loc} · ${tz}`)
    } catch (e) {}

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

      const [metersData, companiesData, tariffsData] = await Promise.all([
        getAllMeters(),
        getAllCompanies(),
        getAllTariffs()
      ])

      setMeters(metersData)
      setCompanies(companiesData)
      setTariffs(tariffsData)

      // Set current meter (use persisted selection if available, otherwise first)
      let currentMeter = null
      if (metersData.length > 0) {
        const persisted = (() => { try { return localStorage.getItem('ape_currentMeterId') } catch (e) { return null } })()
        // allow persisted to be either meter.id (uuid) or meter.contador (human readable)
        if (persisted) {
          currentMeter = metersData.find(m => m.id === persisted) || metersData.find(m => m.contador === persisted) || null
        }
        if (!currentMeter) currentMeter = metersData[0]
        setCurrentMeterId(currentMeter.id)
        setMeterInfo(currentMeter)
        
        // Fetch readings specifically for the current meter to ensure we get all relevant data
        const meterReadings = await getReadings(currentMeter.contador || currentMeter.id)
        setReadings(meterReadings)

        console.log('📊 Dashboard data loaded from Supabase:', {
          meters: metersData.length,
          companies: companiesData.length,
          tariffs: tariffsData.length,
          readings: meterReadings.length,
          currentMeterId: currentMeter.id,
        })
      } else {
        setReadings([])
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

    const sorted = [...readings].sort((a, b) => {
      const timeA = new Date(a.date).getTime()
      const timeB = new Date(b.date).getTime()
      if (timeA !== timeB) return timeA - timeB
      return Number(a.consumption || 0) - Number(b.consumption || 0)
    })
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
    const activeTariffs = tariffs.filter((tariff: any) => {
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
  const { consumptionMonth, productionMonth, estimatedBill, lastDelta, latestSaldo, accumulatedSaldo, readingsMissingTariff, activeTariff } = React.useMemo(() => {
    const thisMonth = new Date().getMonth()
    const thisYear = new Date().getFullYear()
    let consumptionMonth = 0
    let productionMonth = 0
    let creditAccum = 0

    readings.forEach(r => {
      const d = new Date(r.date)
      // Use UTC methods to ensure a reading stored as "2025-11-01T00:00:00Z" counts as November, even if local time is Oct 31
      if (d.getUTCMonth() === thisMonth && d.getUTCFullYear() === thisYear) {
        consumptionMonth += Number(r.consumption || 0)
        productionMonth += Number(r.production || 0)
      }
      creditAccum += Number(r.credit || 0)
    })

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

    return { consumptionMonth, productionMonth, estimatedBill, lastDelta, latestSaldo, accumulatedSaldo, readingsMissingTariff, activeTariff }
  }, [readings, meterInfo, tariffs])

  // Compute chart data (rows and cumulativeRows) for charts
  const { chartRows, cumulativeRows, chartRowsAvg, chartRowsAvgProd } = React.useMemo(() => {
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
    return { chartRows, cumulativeRows, chartRowsAvg, chartRowsAvgProd }
  }, [readings])

  // Compute billing history chart data
  const billingChartRows = React.useMemo(() => {
    try {
      const deltas = computeDeltas(readings)
      if (!deltas || deltas.length === 0) return []

      const companyParam = meterInfo?.distribuidora || undefined
      const segmentParam = meterInfo?.tipo_servicio || undefined

      return deltas.map(delta => {
        let amount = 0
        let invoice = null
        let tariffForInvoice = null
        let tariffId = null
        try {
          const tariff = findActiveTariffForDate(delta.date, companyParam, segmentParam)
          if (tariff) {
            const inv = computeInvoiceForPeriod(Number(delta.consumption||0), Number(delta.production||0), tariff, { forUnit: 'period', date: delta.date })
            amount = inv.total_due_Q || 0
            invoice = inv
            tariffForInvoice = tariff
            tariffId = tariff.header?.id
          }
        } catch (e) {}
        return {
          date: delta.date.split('T')[0],
          amount: amount,
          invoice,
          tariff: tariffForInvoice,
          consumption_kWh: delta.consumption,
          production_kWh: delta.production,
          tariffId
        }
      })
    } catch (e) { return [] }
  }, [readings, meterInfo, tariffs])

  // Forecasting Logic (Trend-Adjusted Seasonality)
  const consumptionForecast = React.useMemo(() => {
    if (!readings || readings.length < 2) return null

    // 1. Calculate monthly totals from deltas
    const deltas = computeDeltas(readings)
    const monthly: Record<string, number> = {}
    deltas.forEach(d => {
      const date = new Date(d.date)
      // Use UTC to avoid timezone shifts
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}`
      if (!monthly[key]) monthly[key] = 0
      monthly[key] += Number(d.consumption || 0)
    })

    // 2. Determine context (Next Month after Latest Registered)
    // Find latest month key available in data
    const keys = Object.keys(monthly).sort()
    if (keys.length === 0) return null
    const lastKey = keys[keys.length - 1] // e.g. "2025-12"
    const [lastYearStr, lastMonthStr] = lastKey.split('-')
    const lastYear = parseInt(lastYearStr)
    const lastMonth = parseInt(lastMonthStr)

    // Target is next month relative to the last registered data
    let targetYear = lastYear
    let targetMonth = lastMonth + 1
    if (targetMonth > 12) {
      targetMonth = 1
      targetYear += 1
    }
    
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const targetMonthName = monthNames[targetMonth - 1]

    // History: Same month last year (Target - 1 year)
    const seasonalityKey = `${targetYear-1}-${String(targetMonth).padStart(2,'0')}`
    const seasonalityCons = monthly[seasonalityKey]

    // Trend: Compare Last Registered Month (Current Year vs Last Year)
    const trendCurrentKey = lastKey
    const trendLastYearKey = `${lastYear-1}-${String(lastMonth).padStart(2,'0')}`
    
    const trendCurrentCons = monthly[trendCurrentKey]
    const trendLastYearCons = monthly[trendLastYearKey]

    let forecast = 0
    let label = ''
    let trendPercent = 0
    let formula = ''

    // 1. Try Trend-Adjusted Seasonality (Best accuracy)
    if (seasonalityCons !== undefined && seasonalityCons > 0 && 
        trendCurrentCons !== undefined && trendLastYearCons !== undefined && trendLastYearCons > 0) {
        
        const ratio = trendCurrentCons / trendLastYearCons
        forecast = seasonalityCons * ratio
        trendPercent = (ratio - 1) * 100
        label = `Basado en ${seasonalityCons.toFixed(0)} kWh (${targetMonthName} ${targetYear-1}) ajustado por tendencia (${trendPercent > 0 ? '+' : ''}${trendPercent.toFixed(1)}%)`
        formula = `${seasonalityCons.toFixed(0)} × (${trendCurrentCons.toFixed(0)} / ${trendLastYearCons.toFixed(0)})`
    
    } else {
      // 2. Fallback: Moving Average of last 3 months (Smart Fallback)
      // Used if we can't calculate trend (e.g. missing history), even if we have the raw month from last year.
      const recentCount = 3
      const recentKeys = keys.slice(-recentCount)
      
      if (recentKeys.length > 0) {
        const sum = recentKeys.reduce((acc, k) => acc + monthly[k], 0)
        forecast = sum / recentKeys.length
        label = `Promedio últimos ${recentKeys.length} meses (sin histórico anual completo para tendencia)`
        formula = `(${recentKeys.map(k => monthly[k].toFixed(0)).join('+')}) / ${recentKeys.length}`
      } else if (seasonalityCons !== undefined && seasonalityCons > 0) {
        // 3. Last Resort: Pure Seasonality
        forecast = seasonalityCons
        label = `Basado en consumo de ${targetMonthName} ${targetYear-1} (${seasonalityCons.toFixed(0)} kWh)`
        formula = `${seasonalityCons.toFixed(0)} (Histórico puro)`
      } else {
        return null
      }
    }

    return { kwh: forecast, label, trendPercent, monthName: targetMonthName, year: targetYear, formula }
  }, [readings])

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
              <div className="mt-2 text-xs text-gray-200">
                Contador: <strong>{meterInfo.contador}</strong> · Correlativo: <strong>{meterInfo.correlativo}</strong>
                {meterInfo.kwp && <span> · Potencia: <strong>{meterInfo.kwp} kWp</strong></span>}
              </div>
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
              <h3 className="text-sm text-gray-300">Valor Ultima Factura</h3>
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
        {consumptionForecast && (
          <div className="card bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-indigo-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm text-indigo-200">Pronóstico {consumptionForecast.monthName} {consumptionForecast.year}</h3>
                <p className="text-2xl mt-2 text-indigo-100">{consumptionForecast.kwh.toFixed(0)} kWh</p>
                <div className="text-xs text-indigo-300/70 mt-1 max-w-[200px] leading-tight">
                  {consumptionForecast.label}
                  {consumptionForecast.formula && (
                    <div className="mt-1 pt-1 border-t border-indigo-500/20 font-mono text-[10px] opacity-80">
                      f = {consumptionForecast.formula}
                    </div>
                  )}
                </div>
              </div>
              <ChartIcon className="text-indigo-400" size={28} />
            </div>
          </div>
        )}
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
      </motion.div>

      {/* Line chart card */}
      <div className="glass-card mt-6 p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Producción neta por periodo (Entregado - Recibido)
          </h3>
          <div style={{ width: '100%', height: 270 }}>
            <ResponsiveContainer>
              <LineChart data={chartRows} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis 
                  dataKey="date" 
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fill: 'var(--text)', fontSize: 9 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                    const month = monthNames[date.getUTCMonth()]
                    const year = date.getUTCFullYear().toString().slice(-2)
                    return `${month}/${year}`
                  }}
                />
                <YAxis tick={{ fill: 'var(--text)', fontSize: 9 }} />
                <Tooltip 
                  labelFormatter={(label) => `Fecha: ${label}`}
                  formatter={(value: any) => [`${value} kWh`, '']} 
                  itemStyle={{ color: 'var(--text)' }} 
                  contentStyle={{ background: 'var(--bg-2)', borderColor: 'rgba(0,0,0,0.06)' }} 
                  wrapperStyle={{ position: 'fixed', zIndex: 99999, pointerEvents: 'auto' }} 
                />
                <Legend wrapperStyle={{ color: 'var(--text)' }} />
                <Line type="monotone" dataKey="net" name="Neto (kWh)" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false}>
                  <LabelList dataKey="net" position="top" style={{ fontSize: 8, fill: 'var(--text)' }} formatter={(v:any)=> Number(v).toFixed(0)} />
                </Line>
                <Line type="monotone" dataKey="production" name="Producción" stroke="#34d399" strokeWidth={2.5} dot={false} isAnimationActive={false}>
                  <LabelList dataKey="production" position="top" style={{ fontSize: 8, fill: 'var(--text)' }} formatter={(v:any)=> Number(v).toFixed(0)} />
                </Line>
                <Line type="monotone" dataKey="consumption" name="Consumo" stroke="#fb7185" strokeWidth={2.5} dot={false} isAnimationActive={false}>
                  <LabelList dataKey="consumption" position="top" style={{ fontSize: 8, fill: 'var(--text)' }} formatter={(v:any)=> Number(v).toFixed(0)} />
                </Line>
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
              <LineChart data={chartRowsAvg || []} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'var(--text)', fontSize: 9 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                    const month = monthNames[date.getMonth()]
                    const year = date.getFullYear().toString().slice(-2)
                    return `${month}/${year}`
                  }}
                />
                <YAxis tick={{ fill: 'var(--text)', fontSize: 9 }} />
                <Tooltip formatter={(value: any, name: any, props: any) => {
                  if (name === 'avg') return [`${Number(value).toFixed(2)} kWh/d`, 'Promedio']
                  return [`${value} kWh`, name]
                }} itemStyle={{ color: 'var(--text)' }} contentStyle={{ background: 'var(--bg-2)', borderColor: 'rgba(0,0,0,0.06)' }} wrapperStyle={{ position: 'fixed', zIndex: 99999, pointerEvents: 'auto' }} />
                <Legend wrapperStyle={{ color: 'var(--text)' }} />
                <Line type="monotone" dataKey="avg" name="kWh/día (avg)" stroke="#f59e0b" strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls={true}>
                  <LabelList dataKey="avg" position="top" style={{ fontSize: 8, fill: 'var(--text)' }} formatter={(v:any)=> v==null?'-':Number(v).toFixed(2)} />
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
              <LineChart data={chartRowsAvgProd || []} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'var(--text)', fontSize: 8 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                    const month = monthNames[date.getMonth()]
                    const year = date.getFullYear().toString().slice(-2)
                    return `${month}/${year}`
                  }}
                />
                <YAxis tick={{ fill: 'var(--text)', fontSize: 8 }} />
                <Tooltip formatter={(value: any, name: any) => {
                  if (name === 'avg') return [`${Number(value).toFixed(2)} kWh/d`, 'Promedio']
                  return [`${value} kWh`, name]
                }} itemStyle={{ color: 'var(--text)' }} contentStyle={{ background: 'var(--bg-2)', borderColor: 'rgba(0,0,0,0.06)' }} wrapperStyle={{ position: 'fixed', zIndex: 99999, pointerEvents: 'auto' }} />
                <Legend wrapperStyle={{ color: 'var(--text)' }} />
                <Line type="monotone" dataKey="avg" name="kWh/día (avg)" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false}>
                  <LabelList dataKey="avg" position="top" style={{ fontSize: 7, fill: 'var(--text)' }} formatter={(v:any)=> v==null?'-':Number(v).toFixed(2)} />
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
          <div className="mt-2" style={{ width: '100%', height: 270 }}>
            <ResponsiveContainer>
              <AreaChart data={cumulativeRows} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis 
                  dataKey="date" 
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fill: 'var(--text)', fontSize: 9 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                    const month = monthNames[date.getUTCMonth()]
                    const year = date.getUTCFullYear().toString().slice(-2)
                    return `${month}/${year}`
                  }}
                />
                <YAxis tick={{ fill: 'var(--text)', fontSize: 8 }} />
                <Tooltip 
                  labelFormatter={(label) => `Fecha: ${label}`}
                  formatter={(value: any) => [`${value} kWh`, '']} 
                  itemStyle={{ color: 'var(--text)' }} 
                  contentStyle={{ background: 'var(--bg-2)', borderColor: 'rgba(0,0,0,0.06)' }} 
                  wrapperStyle={{ position: 'fixed', zIndex: 99999, pointerEvents: 'auto' }} 
                />
                <Legend wrapperStyle={{ color: 'var(--text)' }} />
                <Area type="monotone" dataKey="positive" name="Saldo positivo (kWh)" stroke="#34d399" fill="#134e4a" fillOpacity={0.6}>
                  <LabelList dataKey="positive" position="top" style={{ fontSize: 8, fill: 'var(--text)' }} formatter={(v:any)=> v > 0 ? Number(v).toFixed(0) : ''} />
                </Area>
                <Area type="monotone" dataKey="negative" name="Saldo negativo (abs kWh)" stroke="#fb7185" fill="#4c0519" fillOpacity={0.6}>
                  <LabelList dataKey="negative" position="top" style={{ fontSize: 8, fill: 'var(--text)' }} formatter={(v:any)=> v > 0 ? Number(v).toFixed(0) : ''} />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
            {/* Facturación table removed from live UI; generated only at PDF export */}

        {/* Billing History Chart */}
        <div className="glass-card mt-6 p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            Facturación estimada por periodo (Total Q)
          </h3>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart 
                data={billingChartRows} 
                margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                onClick={(e) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    setSelectedInvoiceRow(e.activePayload[0].payload)
                    setShowInvoiceModal(true)
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'var(--text)', fontSize: 9 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                    return `${monthNames[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`
                  }}
                />
                <YAxis tick={{ fill: 'var(--text)', fontSize: 9 }} tickFormatter={(val) => Number(val).toFixed(2)} />
                <Tooltip formatter={(value: any) => [`Q ${Number(value).toFixed(2)}`, 'Total (Click para detalle)']} itemStyle={{ color: 'var(--text)' }} contentStyle={{ background: 'var(--bg-2)', borderColor: 'rgba(0,0,0,0.06)' }} wrapperStyle={{ position: 'fixed', zIndex: 99999, pointerEvents: 'auto' }} />
                <Legend wrapperStyle={{ color: 'var(--text)' }} />
                <Line type="monotone" dataKey="amount" name="Total Factura (Q)" stroke="#4ade80" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false}>
                  <LabelList dataKey="amount" position="top" style={{ fontSize: 8, fill: 'var(--text)' }} formatter={(v:any)=> `Q${Number(v).toFixed(2)}`} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      {/* Invoice Detail Modal from Chart */}
      <InvoiceModal open={showInvoiceModal} onClose={()=>setShowInvoiceModal(false)} row={selectedInvoiceRow} />

      <SeasonalAnalysis key={`${refreshKey}-${currentMeterId}`} meterId={currentMeterId} onConfigureMeter={openCurrentMeterConfig} />

          {showMeterModal && (
            <MeterModal
              key={modalInitialMeter?.id || 'new'}
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
                  setRefreshKey(prev => prev + 1) // Force SeasonalAnalysis to reload
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

          {localeInfo && (
            <div className="mt-8 mb-4 text-center text-[10px] text-gray-500 opacity-50">
              {localeInfo}
            </div>
          )}

        </section>
  )
}
