import React, { useEffect, useState } from 'react'
import { Sun, Settings } from 'lucide-react'
import { getReadings, type ReadingRecord } from '../services/supabasePure'
import { getAllMeters } from '../services/supabaseBasic'
import * as suncalc from 'suncalc'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

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

  useEffect(() => {
    loadSeasonalData()
  }, [meterId])

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

  function calculateSeasonalMetrics(readings: ReadingRecord[]) {
    if (!readings.length) return

    // Get user's location (assume from localStorage or default)
    const lat = parseFloat(localStorage.getItem('ape_lat') || '-34.6037') // Default Buenos Aires
    const lon = parseFloat(localStorage.getItem('ape_lon') || '-58.3816')

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

      // Determine season: Nov-Apr = Summer (1), May-Oct = Winter (0)
      const isSummer = month >= 11 || month <= 4
      const season = isSummer ? 'summer' : 'winter'

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { production: 0, count: 0, season }
      }
      monthlyData[monthKey].production += reading.delta
      monthlyData[monthKey].count += 1
    })

    // Calculate averages and prepare chart data
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const chartData = Object.entries(monthlyData).map(([month, data]) => {
      const [year, monthNum] = month.split('-')
      const monthName = monthNames[parseInt(monthNum) - 1]
      const yearShort = year.slice(-2)
      return {
        month: `${monthName}/${yearShort}`, // Format as "Dic/25"
        production: data.production / data.count,
        season: data.season
      }
    }).sort((a, b) => {
      // Sort by year and month
      const [monthA, yearA] = [a.month.split('/')[0], a.month.split('/')[1]]
      const [monthB, yearB] = [b.month.split('/')[0], b.month.split('/')[1]]
      const monthOrder = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      
      if (yearA !== yearB) {
        return parseInt(yearA) - parseInt(yearB)
      }
      return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB)
    })

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
    const sunHoursData = calculateAverageSunHours(lat, lon)
    const summerSunHours = sunHoursData.summer
    const winterSunHours = sunHoursData.winter

    setSunHoursData(sunHoursData)

    console.log('Summer sun hours:', summerSunHours, 'Winter sun hours:', winterSunHours)

    // Calculate seasonal efficiency (production per sun hour)
    const summerEfficiency = summerMonths > 0 ? totalSummerProduction / (summerMonths * summerSunHours) : 0
    const winterEfficiency = winterMonths > 0 ? totalWinterProduction / (winterMonths * winterSunHours) : 0

    console.log('Summer efficiency (kWh/hora sol):', summerEfficiency)
    console.log('Winter efficiency (kWh/hora sol):', winterEfficiency)

    // Calculate percentage difference in efficiency
    const efficiencyPercentage = winterEfficiency > 0 ? ((summerEfficiency - winterEfficiency) / winterEfficiency * 100) : 0

    console.log('Efficiency percentage:', efficiencyPercentage)
    setSummerPercentage(Math.round(efficiencyPercentage))
    setAvgSunHours(Math.round((summerSunHours + winterSunHours) / 2)) // Keep average for display

    // Update season stats
    setSeasonStats({ summerMonths, winterMonths })
  }

  function calculateAverageSunHours(lat: number, lon: number): { summer: number, winter: number } {
    const now = new Date()
    const year = now.getFullYear()

    // Summer months: Nov-Apr (sample a few days)
    const summerDays = [
      new Date(year, 10, 15), // Nov 15
      new Date(year, 11, 15), // Dec 15
      new Date(year + 1, 0, 15), // Jan 15
      new Date(year + 1, 1, 15), // Feb 15
      new Date(year + 1, 2, 15), // Mar 15
      new Date(year + 1, 3, 15), // Apr 15
    ]

    // Winter months: May-Oct
    const winterDays = [
      new Date(year, 4, 15), // May 15
      new Date(year, 5, 15), // Jun 15
      new Date(year, 6, 15), // Jul 15
      new Date(year, 7, 15), // Aug 15
      new Date(year, 8, 15), // Sep 15
      new Date(year, 9, 15), // Oct 15
    ]

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
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm text-gray-300">Eficiencia Estacional</h3>
          {systemInfo.totalWatts > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Sistema: {systemInfo.panels > 0 ? `${systemInfo.panels} paneles × ${systemInfo.wattsPerPanel}W = ` : ''}{(systemInfo.totalWatts / 1000).toFixed(2)} kWp
            </p>
          )}
          <p className="text-lg mt-1">
            Verano: <strong>{summerPercentage > 0 ? '+' : ''}{summerPercentage}%</strong> más eficiente
          </p>
          <p className="text-xs text-gray-400 mt-1">
            kWh por hora de sol vs invierno • {seasonStats.summerMonths + seasonStats.winterMonths} meses analizados
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Eficiencia = Producción total / (Meses × Horas sol) | % = ((Verano - Invierno) / Invierno) × 100
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Horas sol promedio: Verano {sunHoursData.summer.toFixed(1)}h | Invierno {sunHoursData.winter.toFixed(1)}h
          </p>
          {seasonalData.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Eficiencia calculada: Verano {(productionTotals.summer / (seasonStats.summerMonths * sunHoursData.summer)).toFixed(1)} kWh/h | 
              Invierno {(productionTotals.winter / (seasonStats.winterMonths * sunHoursData.winter)).toFixed(1)} kWh/h
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
                fontSize={10}
                tick={{ fill: '#9CA3AF' }}
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
                    fill={entry.season === 'summer' ? '#F59E0B' : '#3B82F6'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-xs text-gray-400">Verano</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-xs text-gray-400">Invierno</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}