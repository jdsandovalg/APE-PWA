import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Sun, Settings, Info, X } from 'lucide-react'
import { getReadings, type ReadingRecord } from '../services/supabasePure'
import { getAllMeters } from '../services/supabaseBasic'
import * as suncalc from 'suncalc'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { showToast } from '../services/toast'
import { requestBrowserGeolocation } from '../utils/theme'

interface SeasonalAnalysisProps {
  meterId?: string
  onConfigureMeter?: () => void
}

export default function SeasonalAnalysis({ meterId, onConfigureMeter }: SeasonalAnalysisProps) {
  const [readings, setReadings] = useState<ReadingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [seasonalData, setSeasonalData] = useState<any[]>([])
  const [summerPercentage, setSummerPercentage] = useState(0)
  const [avgSunHours, setAvgSunHours] = useState(0)
  const [seasonStats, setSeasonStats] = useState({ summerMonths: 0, winterMonths: 0 })
  const [needsInstallationDate, setNeedsInstallationDate] = useState(false)
  const [sunHoursData, setSunHoursData] = useState({ summer: 0, winter: 0 })
  const [productionTotals, setProductionTotals] = useState({ summer: 0, winter: 0 })
  const [systemInfo, setSystemInfo] = useState({ panels: 0, wattsPerPanel: 0, totalWatts: 0 })
  const [locationDebug, setLocationDebug] = useState<string>('')
  const [seasonLabels, setSeasonLabels] = useState({ summer: '', winter: '' })
  const [seasonDisplayNames, setSeasonDisplayNames] = useState({ summer: 'Verano', winter: 'Invierno' })
  const [showDetails, setShowDetails] = useState(false)
  const [highYieldSeason, setHighYieldSeason] = useState<'summer' | 'winter'>('summer')
  const cardRef = useRef<HTMLDivElement>(null)
  const [modalWidth, setModalWidth] = useState(0)

  useEffect(() => {
    loadSeasonalData()
  }, [meterId])

  // Close modal with Escape key
  useEffect(() => {
    if (!showDetails) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowDetails(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showDetails])

  function parseSystemInfo(systemString: string) {
    const panelsMatch = systemString.match(/(\d+)\s*paneles?/i)
    const wattsMatch = systemString.match(/(\d+)\s*[Ww]/)
    const kwMatch = systemString.match(/(\d+(?:\.\d+)?)\s*kW/i)
    
    const panels = panelsMatch ? parseInt(panelsMatch[1]) : 0
    const wattsPerPanel = wattsMatch ? parseInt(wattsMatch[1]) : 0
    let totalWatts = panels * wattsPerPanel
    
    // If total kW is specified, use that instead
    if (kwMatch) {
      totalWatts = parseFloat(kwMatch[1]) * 1000
    }
    
    return { panels, wattsPerPanel, totalWatts }
  }

  async function loadSeasonalData() {
    try {
      setLoading(true)
      // Get meter info to check for installation date
      const meters = await getAllMeters()
      const currentMeter = meters.find(m => m.id === meterId)

      if (!currentMeter?.installation_date) {
        console.warn('No installation date found for meter:', meterId)
        setReadings([])
        setSeasonalData([])
        setSummerPercentage(0)
        setSeasonStats({ summerMonths: 0, winterMonths: 0 })
        setNeedsInstallationDate(true)
        setLoading(false)
        return
      }

      setNeedsInstallationDate(false)

      // Parse system information
      const parsedSystem = parseSystemInfo(currentMeter.sistema || '')
      const totalWatts = currentMeter.kwp ? currentMeter.kwp * 1000 : parsedSystem.totalWatts
      setSystemInfo({ ...parsedSystem, totalWatts })

      // Use installation date
      const filterDate = new Date(currentMeter.installation_date)
      console.log('Using installation date:', filterDate.toISOString().split('T')[0])

      // Get readings using contador instead of id
      const readingsData = await getReadings(currentMeter.contador)
      const filteredReadings = readingsData.filter(r => new Date(r.date) >= filterDate)
      setReadings(filteredReadings)

      // Calculate seasonal metrics
      calculateSeasonalMetrics(filteredReadings)
    } catch (error) {
      console.error('Error loading seasonal data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateLocation() {
    showToast('Solicitando ubicación precisa...', 'success')
    const ok = await requestBrowserGeolocation()
    if (ok) {
      showToast('Ubicación actualizada', 'success')
      loadSeasonalData()
    } else {
      showToast('No se pudo obtener la ubicación. Verifique permisos.', 'error')
    }
  }

  function calculateSeasonalMetrics(readings: ReadingRecord[]) {
    if (!readings.length) return

    // Get user's location dynamically from ape_coords (managed by ThemeToggle)
    let lat = -34.6037 // Default Buenos Aires
    let lon = -58.3816
    let locSource = 'Default'

    try {
      const stored = localStorage.getItem('ape_coords')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          lat = parsed.lat
          lon = parsed.lng
          locSource = 'GPS/IP'
        }
      }
    } catch (e) {}

    const isNorth = lat >= 0
    const hemisphere = isNorth ? 'Norte' : 'Sur'
    setLocationDebug(`${locSource}: ${lat.toFixed(4)}, ${lon.toFixed(4)} (${hemisphere})`)

    const isTropical = Math.abs(lat) < 23.5
    const useTropicalNames = isNorth && isTropical
    setSeasonDisplayNames({
      summer: useTropicalNames ? 'Invierno' : 'Verano',
      winter: useTropicalNames ? 'Verano' : 'Invierno'
    })

    const summerMonthsLabel = isNorth ? 'May-Oct' : 'Nov-Abr'
    const winterMonthsLabel = isNorth ? 'Nov-Abr' : 'May-Oct'
    setSeasonLabels({ summer: summerMonthsLabel, winter: winterMonthsLabel })

    // Sort readings by date
    const sortedReadings = readings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Calculate deltas (assuming cumulative production)
    const readingsWithDeltas = sortedReadings.map((reading, index) => {
      const production = Number(reading.production || 0)
      const prevProduction = index > 0 ? Number(sortedReadings[index - 1].production || 0) : 0
      const delta = Math.max(0, production - prevProduction) // Ensure non-negative
      return { ...reading, delta }
    })

    // Group by month and calculate averages
    const monthlyData: { [key: string]: { production: number, count: number, season: string } } = {}

    readingsWithDeltas.forEach(reading => {
      const date = new Date(reading.date)
      const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
      const month = date.getUTCMonth() + 1 // 1-12

      // Determine season based on hemisphere
      // North: Summer (High Sun) ~ May-Oct. Winter ~ Nov-Apr.
      // South: Summer (High Sun) ~ Nov-Apr. Winter ~ May-Oct.
      const isSummer = isNorth 
        ? (month >= 5 && month <= 10)
        : (month >= 11 || month <= 4)

      const season = isSummer ? 'summer' : 'winter'

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { production: 0, count: 0, season }
      }
      monthlyData[monthKey].production += reading.delta
      monthlyData[monthKey].count += 1
    })

    // Calculate averages and prepare chart data
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    let chartData = Object.entries(monthlyData).map(([month, data]) => {
      const [year, monthNum] = month.split('-')
      const monthName = monthNames[parseInt(monthNum) - 1]
      const yearShort = year.slice(-2)
      return {
        month: `${monthName}/${yearShort}`, // Format as "Dic/25"
        production: data.production / data.count,
        season: data.season,
        sortKey: parseInt(year) * 100 + parseInt(monthNum)
      }
    }).sort((a, b) => a.sortKey - b.sortKey)

    // Limit to last 12 months for balanced comparison (6 vs 6)
    if (chartData.length > 12) {
      chartData = chartData.slice(chartData.length - 12)
    }

    setSeasonalData(chartData)

    // Calculate summer vs winter production - total production per season
    const summerData = chartData.filter(d => d.season === 'summer')
    const winterData = chartData.filter(d => d.season === 'winter')

    console.log('Summer data:', summerData)
    console.log('Winter data:', winterData)

    // Calculate total production and average per month for each season
    const totalSummerProduction = summerData.reduce((sum, d) => sum + d.production, 0)
    const totalWinterProduction = winterData.reduce((sum, d) => sum + d.production, 0)
    const summerMonths = summerData.length
    const winterMonths = winterData.length

    setProductionTotals({ summer: totalSummerProduction, winter: totalWinterProduction })

    console.log('Total summer production:', totalSummerProduction, 'over', summerMonths, 'months')
    console.log('Total winter production:', totalWinterProduction, 'over', winterMonths, 'months')

    const avgSummer = summerMonths > 0 ? totalSummerProduction / summerMonths : 0
    const avgWinter = winterMonths > 0 ? totalWinterProduction / winterMonths : 0

    console.log('Avg monthly summer:', avgSummer, 'Avg monthly winter:', avgWinter)

    // Calculate average sun hours for each season
    const sunHoursData = calculateAverageSunHours(lat, lon, isNorth)
    const summerSunHours = sunHoursData.summer
    const winterSunHours = sunHoursData.winter

    setSunHoursData(sunHoursData)

    console.log('Summer sun hours:', summerSunHours, 'Winter sun hours:', winterSunHours)

    // Calculate seasonal efficiency (production per sun hour)
    const summerEfficiency = summerMonths > 0 ? totalSummerProduction / (summerMonths * summerSunHours) : 0
    const winterEfficiency = winterMonths > 0 ? totalWinterProduction / (winterMonths * winterSunHours) : 0

    console.log('Summer efficiency (kWh/hora sol):', summerEfficiency)
    console.log('Winter efficiency (kWh/hora sol):', winterEfficiency)

    // Dynamically determine High and Low yield seasons and calculate positive percentage difference
    const isSummerMoreEfficient = summerEfficiency >= winterEfficiency
    const highEff = isSummerMoreEfficient ? summerEfficiency : winterEfficiency
    const lowEff = isSummerMoreEfficient ? winterEfficiency : summerEfficiency
    
    const efficiencyPercentage = lowEff > 0 ? ((highEff - lowEff) / lowEff * 100) : 0
    
    setHighYieldSeason(isSummerMoreEfficient ? 'summer' : 'winter')
    setSummerPercentage(Math.round(efficiencyPercentage)) // Re-using state, it now means positive diff
    
    setAvgSunHours(Math.round((summerSunHours + winterSunHours) / 2)) // Keep average for display

    // Update season stats
    setSeasonStats({ summerMonths, winterMonths })
  }

  function calculateAverageSunHours(lat: number, lon: number, isNorth: boolean): { summer: number, winter: number } {
    const now = new Date()
    const year = now.getFullYear()

    // Define representative months for each season (0-indexed)
    // South Summer / North Winter: Nov(10) - Apr(3)
    const southSummerMonths = [10, 11, 0, 1, 2, 3]
    // South Winter / North Summer: May(4) - Oct(9)
    const southWinterMonths = [4, 5, 6, 7, 8, 9]

    const summerIndices = isNorth ? southWinterMonths : southSummerMonths
    const winterIndices = isNorth ? southSummerMonths : southWinterMonths

    const summerDays = summerIndices.map(m => {
      // Handle year wrap for Jan-Apr if needed, though for average sun hours just using current year is usually fine approximation
      // unless we are strictly calculating a continuous period. 
      // Using 'year' for all months gives the correct sun declination for that month in any year.
      return new Date(year, m, 15)
    })

    const winterDays = winterIndices.map(m => new Date(year, m, 15))

    const summerHours = summerDays.map(day => {
      const times = suncalc.getTimes(day, lat, lon)
      return (times.sunset.getTime() - times.sunrise.getTime()) / (1000 * 60 * 60) // hours
    }).reduce((a, b) => a + b, 0) / summerDays.length

    const winterHours = winterDays.map(day => {
      const times = suncalc.getTimes(day, lat, lon)
      return (times.sunset.getTime() - times.sunrise.getTime()) / (1000 * 60 * 60)
    }).reduce((a, b) => a + b, 0) / winterDays.length

    return { summer: summerHours * 0.6, winter: winterHours * 0.6 }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center p-4">
          <div className="text-xs text-gray-400">Cargando análisis estacional...</div>
        </div>
      </div>
    )
  }

  if (needsInstallationDate) {
    return (
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm text-gray-300">Análisis Estacional</h3>
            <p className="text-sm mt-2 text-yellow-400">
              ⚠️ Fecha de instalación no configurada
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Configure la fecha de instalación del sistema solar para ver el análisis estacional preciso.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={onConfigureMeter}
              className="glass-button p-2 text-xs"
              title="Configurar fecha de instalación"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card" ref={cardRef}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm text-gray-300">Eficiencia Estacional</h3>
          {systemInfo.totalWatts > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Sistema: {systemInfo.panels > 0 ? `${systemInfo.panels} paneles × ${systemInfo.wattsPerPanel}W = ` : ''}{(systemInfo.totalWatts / 1000).toFixed(2)} kWp
            </p>
          )}
          <p className="text-lg mt-1 flex items-center gap-2">
            <span>{seasonDisplayNames[highYieldSeason]} <span className="text-sm text-gray-400 font-normal">({highYieldSeason === 'summer' ? seasonLabels.summer : seasonLabels.winter})</span>: <strong className="text-green-400">+{summerPercentage}%</strong></span>
            <button onClick={() => {
              if (cardRef.current) setModalWidth(cardRef.current.offsetWidth)
              setShowDetails(true)
            }} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors" title="Ver detalle del cálculo"><Info size={16} /></button>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            vs {seasonDisplayNames[highYieldSeason === 'summer' ? 'winter' : 'summer']} ({highYieldSeason === 'summer' ? seasonLabels.winter : seasonLabels.summer}) • {seasonStats.summerMonths + seasonStats.winterMonths} meses analizados
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Eficiencia = Producción total / (Meses × Horas sol) | % = ((Alta - Baja) / Baja) × 100
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Horas sol promedio: {seasonDisplayNames.summer} {sunHoursData.summer.toFixed(1)}h | {seasonDisplayNames.winter} {sunHoursData.winter.toFixed(1)}h
          </p>
          {seasonalData.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Eficiencia calculada: {seasonDisplayNames.summer} {(productionTotals.summer / (seasonStats.summerMonths * sunHoursData.summer)).toFixed(1)} kWh/h | 
              {seasonDisplayNames.winter} {(productionTotals.winter / (seasonStats.winterMonths * sunHoursData.winter)).toFixed(1)} kWh/h
            </p>
          )}
        </div>
        <div className="flex flex-col items-end">
          <Sun className="text-yellow-400" size={24} />
          <span className="text-xs text-gray-400 mt-1">{avgSunHours}h sol</span>
        </div>
      </div>
      {seasonalData.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs text-gray-400 mb-2">Producción mensual promedio (kWh)</h4>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={seasonalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="month" 
                stroke="#9CA3AF" 
                fontSize={9}
                tick={(props) => {
                  const { x, y, payload } = props;
                  const { value, index } = payload;
                  const dataPoint = seasonalData[index];
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={0} y={0} dy={12} textAnchor="middle" fill="#9CA3AF" fontSize={10}>{value}</text>
                      <text x={0} y={0} dy={24} textAnchor="middle" fill="#71717a" fontSize={9}>{`${Math.round(dataPoint.production)} kWh`}</text>
                    </g>
                  );
                }}
                tickLine={false}
                axisLine={false}
                height={30}
              />
              <YAxis 
                stroke="#9CA3AF" 
                fontSize={10}
                tick={{ fill: '#9CA3AF' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#F3F4F6', 
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  color: '#1F2937',
                  fontSize: '12px'
                }}
                labelStyle={{ color: '#1F2937', fontWeight: 'bold' }}
              />
              <Bar dataKey="production" radius={[2, 2, 0, 0]}>
                {seasonalData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.season === highYieldSeason ? '#F59E0B' : '#3B82F6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
              <span className="text-xs text-gray-400">Temporada Alta</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
              <span className="text-xs text-gray-400">Temporada Baja</span>
            </div>
          </div>
        </div>
      )}
      {locationDebug && (
        <div className="mt-4 pt-2 border-t border-gray-700 text-[10px] text-gray-500 text-center flex items-center justify-center gap-2">
          <span>Ubicación: {locationDebug}</span>
          <button onClick={handleUpdateLocation} className="text-blue-400 hover:text-blue-300 underline cursor-pointer" title="Actualizar ubicación GPS">
            Cambiar
          </button>
        </div>
      )}

      {showDetails && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowDetails(false)} />
          <div className="glass-card p-6 z-10 text-white relative shadow-2xl border border-white/10 bg-black/40 backdrop-blur-xl" style={{ width: modalWidth || '100%', maxWidth: '100%' }}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Info size={20} className="text-blue-400" />
                Detalle de Eficiencia
              </h3>
              <button onClick={() => setShowDetails(false)} className="glass-button p-2" title="Cerrar"><X size={16} /></button>
            </div>
            
            {(() => {
               const summerEff = seasonStats.summerMonths > 0 ? productionTotals.summer / (seasonStats.summerMonths * sunHoursData.summer) : 0
               const winterEff = seasonStats.winterMonths > 0 ? productionTotals.winter / (seasonStats.winterMonths * sunHoursData.winter) : 0
               
               // Determinar qué datos corresponden a "Verano" y cuáles a "Invierno" según la configuración regional
               const isSummerVerano = seasonDisplayNames.summer === 'Verano'
               
               // Obtener desglose de valores mensuales para mostrar la suma
               const veranoValues = seasonalData
                 .filter(d => d.season === (isSummerVerano ? 'summer' : 'winter'))
                 .map(d => Math.round(d.production).toLocaleString())
                 .join(' + ')

               const inviernoValues = seasonalData
                 .filter(d => d.season === (!isSummerVerano ? 'summer' : 'winter'))
                 .map(d => Math.round(d.production).toLocaleString())
                 .join(' + ')

               const veranoStats = {
                 name: isSummerVerano ? seasonDisplayNames.summer : seasonDisplayNames.winter,
                 label: isSummerVerano ? seasonLabels.summer : seasonLabels.winter,
                 total: isSummerVerano ? productionTotals.summer : productionTotals.winter,
                 months: isSummerVerano ? seasonStats.summerMonths : seasonStats.winterMonths,
                 sunHours: isSummerVerano ? sunHoursData.summer : sunHoursData.winter,
                 eff: isSummerVerano ? summerEff : winterEff
               }

               const inviernoStats = {
                 name: !isSummerVerano ? seasonDisplayNames.summer : seasonDisplayNames.winter,
                 label: !isSummerVerano ? seasonLabels.summer : seasonLabels.winter,
                 total: !isSummerVerano ? productionTotals.summer : productionTotals.winter,
                 months: !isSummerVerano ? seasonStats.summerMonths : seasonStats.winterMonths,
                 sunHours: !isSummerVerano ? sunHoursData.summer : sunHoursData.winter,
                 eff: !isSummerVerano ? summerEff : winterEff
               }

               const percentDiff = inviernoStats.eff > 0 ? ((veranoStats.eff - inviernoStats.eff) / inviernoStats.eff * 100) : 0
               
               return (
                 <div className="space-y-5 text-sm">
                   <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                     <h4 className="font-medium text-yellow-400 mb-2 border-b border-yellow-500/20 pb-1">{veranoStats.name} ({veranoStats.label})</h4>
                     <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-300">
                       <div>Producción Total:</div><div className="text-right font-mono">{veranoStats.total.toLocaleString()} kWh</div>
                       {veranoValues && (
                         <div className="col-span-2 text-right text-[10px] text-gray-400 font-mono -mt-1 mb-1 break-words">
                           ({veranoValues})
                         </div>
                       )}
                       <div>Meses analizados:</div><div className="text-right font-mono">{veranoStats.months}</div>
                       <div>Factor solar (h/día):</div><div className="text-right font-mono">{veranoStats.sunHours.toFixed(2)}</div>
                       <div className="col-span-2 border-t border-yellow-500/20 my-1"></div>
                       <div className="text-white">Eficiencia:</div>
                       <div className="text-right font-mono text-white">{veranoStats.eff.toFixed(2)} <span className="text-xs text-gray-500">kWh/h-sol</span></div>
                     </div>
                   </div>

                   <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                     <h4 className="font-medium text-blue-400 mb-2 border-b border-blue-500/20 pb-1">{inviernoStats.name} ({inviernoStats.label})</h4>
                     <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-300">
                       <div>Producción Total:</div><div className="text-right font-mono">{inviernoStats.total.toLocaleString()} kWh</div>
                       {inviernoValues && (
                         <div className="col-span-2 text-right text-[10px] text-gray-400 font-mono -mt-1 mb-1 break-words">
                           ({inviernoValues})
                         </div>
                       )}
                       <div>Meses analizados:</div><div className="text-right font-mono">{inviernoStats.months}</div>
                       <div>Factor solar (h/día):</div><div className="text-right font-mono">{inviernoStats.sunHours.toFixed(2)}</div>
                       <div className="col-span-2 border-t border-blue-500/20 my-1"></div>
                       <div className="text-white">Eficiencia:</div>
                       <div className="text-right font-mono text-white">{inviernoStats.eff.toFixed(2)} <span className="text-xs text-gray-500">kWh/h-sol</span></div>
                     </div>
                   </div>

                   <div className="pt-2">
                     <div className="text-xs text-gray-400 mb-2 text-center">Comparación porcentual</div>
                     <div className="text-center font-mono bg-black/30 p-3 rounded border border-white/10 text-xs sm:text-sm flex flex-col gap-2">
                       <div className="text-gray-400 text-[10px] sm:text-xs border-b border-white/5 pb-2 tracking-wider">
                         Δ% = [ (Eff_{veranoStats.name} - Eff_{inviernoStats.name}) / Eff_{inviernoStats.name} ] × 100
                       </div>
                       <div>
                         (({veranoStats.eff.toFixed(2)} - {inviernoStats.eff.toFixed(2)}) / {inviernoStats.eff.toFixed(2)}) × 100 = <span className={percentDiff >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>{percentDiff > 0 ? '+' : ''}{Math.round(percentDiff)}%</span>
                       </div>
                     </div>
                   </div>

                   <div className="mt-4 text-center">
                     <button 
                       onClick={() => setShowDetails(false)}
                       className="text-gray-400 hover:text-white text-sm underline decoration-gray-600 hover:decoration-white transition-all"
                     >
                       Cerrar
                     </button>
                   </div>
                 </div>
               )
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}