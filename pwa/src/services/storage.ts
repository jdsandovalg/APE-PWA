type Reading = { date:string, consumption:number, production:number, credit?:number }

const READINGS_KEY = 'apenergia:readings'
const TARIFFS_KEY = 'apenergia:tariffs'
const METER_INFO_KEY = 'apenergia:meter_info'
const METERS_KEY = 'apenergia:meters'
const CURRENT_METER_KEY = 'apenergia:current_meter'

export type MeterInfo = {
  contador: string,
  correlativo: string,
  propietaria: string,
  nit: string,
  distribuidora: string,
  tipo_servicio: string,
  sistema: string
}

const DEFAULT_METER: MeterInfo = {
  contador: 'Z90018',
  correlativo: '661116',
  propietaria: 'Vilma Susana Rojas Castillo',
  nit: '623758-4',
  distribuidora: 'EEGSA',
  tipo_servicio: 'BTSA',
  sistema: '6 paneles de 625W + inversor 5kW'
}

function readingsKey(meterId?: string){
  if (meterId) return `${READINGS_KEY}:${meterId}`
  // if meterId not provided, prefer current meter id
  const cur = loadCurrentMeterId()
  return `${READINGS_KEY}:${cur}`
}

// Load readings for a specific meter. If no meterId provided, uses the current meter.
export function loadReadings(meterId?: string): Reading[]{
  try{
    const key = readingsKey(meterId)
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)

    // If no namespaced data exists, attempt migration from legacy key
    const legacy = localStorage.getItem(READINGS_KEY)
    if (legacy){
      // migrate legacy readings into current meter namespace
      localStorage.setItem(key, legacy)
      // keep legacy as backup but no longer return it
      return JSON.parse(legacy)
    }

    return []
  }catch(e){ return [] }
}

export function saveReadings(r:Reading[], meterId?: string){
  try{
    const key = readingsKey(meterId)
    // deduplicate by date (ISO string) keeping the last occurrence
    const deduped = dedupeReadings(r)
    localStorage.setItem(key, JSON.stringify(deduped))
  }catch(e){}
}

export function dedupeReadings(arr: Reading[]){
  try{
    const map = new Map<string, Reading>()
    // normalize dates to ISO date (including time) and keep last occurrence
    for (const it of arr){
      const iso = new Date(it.date).toISOString()
      map.set(iso, { ...it, date: iso })
    }
    // return array ordered by date ascending
    const out = Array.from(map.values())
    out.sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime())
    return out
  }catch(e){ return arr }
}

// Tariff storage structures
export type TariffDetail = {
  fixedCharge_Q: number,
  energy_Q_per_kWh: number,
  distribution_Q_per_kWh: number,
  potencia_Q_per_kWh: number,
  contrib_percent: number,
  iva_percent: number,
  notes?: string
}

export type TariffHeader = {
  id: string,
  company: string,
  companyCode?: string,
  segment: string,
  period: { from: string, to: string },
  effectiveAt?: string,
  currency?: string,
  sourcePdf?: string,
  deleted_at?: string,  // Soft delete
}

export type TariffSet = { header: TariffHeader, rates: TariffDetail }

// Companies master for tariffs
export type CompanyInfo = {
  id: string,
  name: string,
  code: string,
  deleted_at?: string,  // Soft delete
}

const COMPANIES_KEY = 'apenergia:companies'

export function loadCompanies(): CompanyInfo[]{
  try{
    const raw = localStorage.getItem(COMPANIES_KEY)
    if (!raw) {
      // seed common companies used by tariffs so UI has sensible defaults
      const seed: CompanyInfo[] = [
        { id: 'EEGSA', name: 'EEGSA', code: 'EEGSA' },
        { id: 'BTSA', name: 'BTSA', code: 'BTSA' }
      ]
      try{ localStorage.setItem(COMPANIES_KEY, JSON.stringify(seed)) }catch(e){}
      return seed
    }
    const parsed = JSON.parse(raw)
    // Filter out soft deleted
    return parsed.filter((c: CompanyInfo) => !c.deleted_at)
  }catch(e){ return [] }
}

export function saveCompanies(list: CompanyInfo[]){
  try{ localStorage.setItem(COMPANIES_KEY, JSON.stringify(list)) }catch(e){}
}

// Load tariffs: support legacy single-object { rate: number } and arrays of TariffSet
export function loadTariffs(): TariffSet[]{
  try{
    const raw = localStorage.getItem(TARIFFS_KEY)
    if (!raw) {
      // seed default EEGSA BTSA Aug-Oct 2025 tariff
      const defaultTariff: TariffSet = {
        header: {
          id: 'EEGSA-BTSA-2025Q3',
          company: 'EEGSA',
          segment: 'BTSA',
          period: { from: '2025-08-01', to: '2025-10-31' },
          effectiveAt: '2025-08-01',
          currency: 'GTQ',
          sourcePdf: 'Octubre2025.pdf'
        },
        rates: {
          fixedCharge_Q: 13.136031,
          energy_Q_per_kWh: 1.136754,
          distribution_Q_per_kWh: 0.245609,
          potencia_Q_per_kWh: 0.053700,
          contrib_percent: 13.8,
          iva_percent: 12,
          notes: 'Semilla automática: EEGSA BTSA Ago-Oct 2025'
        }
      }
      saveTariffs([defaultTariff])
      return [defaultTariff]
    }
    const parsed = JSON.parse(raw)
    // legacy support
    if (Array.isArray(parsed)) {
      // sort by period.from descending (most recent first)
      parsed.sort((a: TariffSet, b: TariffSet) => {
        const af = a?.header?.period?.from || ''
        const bf = b?.header?.period?.from || ''
        return new Date(bf).getTime() - new Date(af).getTime()
      })
      // ensure companyCode is present by consulting companies master
      try{
        const comps = loadCompanies()
        parsed.forEach((t: TariffSet)=>{
          if (!t.header.companyCode){
            const found = comps.find(c=> c.id === t.header.company)
            if (found && found.code) t.header.companyCode = found.code
          }
        })
      }catch(e){}
      // Filter out soft deleted
      return parsed.filter((t: TariffSet) => !t.header.deleted_at)
    }
    if (parsed && typeof parsed === 'object'){
      if ('rate' in parsed){
        // convert legacy single rate into a TariffSet placeholder
        const t: TariffSet = {
          header: { id: 'legacy', company: 'unknown', segment: 'unknown', period: { from: '', to: '' }, currency: 'GTQ' },
          rates: { fixedCharge_Q: 0, energy_Q_per_kWh: Number(parsed.rate)||0, distribution_Q_per_kWh: 0, potencia_Q_per_kWh: 0, contrib_percent: 0, iva_percent: 0 }
        }
        return [t]
      }
      // if it looks like a TariffSet object (single), wrap it
      if (parsed.header && parsed.rates){
        try{ const comps = loadCompanies(); const found = comps.find(c=> c.id === parsed.header.company); if (found && found.code) parsed.header.companyCode = parsed.header.companyCode || found.code }catch(e){}
        return [parsed]
      }
    }
    return []
  }catch(e){ return [] }
}

export function saveTariffs(t: TariffSet[]){ localStorage.setItem(TARIFFS_KEY, JSON.stringify(t)) }

export function getTariffById(id: string): TariffSet | null {
  const all = loadTariffs()
  return all.find(x => x.header.id === id) || null
}

// Given a date string, find active tariff set (by period inclusion)
export function findActiveTariffForDate(dateStr: string, company?: string, segment?: string): TariffSet | null {
  const d = new Date(dateStr)
  const all = loadTariffs()
  for (const t of all){
    if (company && t.header.company !== company) continue
    if (segment && t.header.segment !== segment) continue
    const from = t.header.period.from ? new Date(t.header.period.from) : null
    const to = t.header.period.to ? new Date(t.header.period.to) : null
    if (from && to){
      if (d >= from && d <= to) return t
    }
  }
  return null
}

// Utilities for quarters
export function quarterFromDate(dateStr: string){
  const d = new Date(dateStr)
  const month = d.getMonth() // 0-11
  const quarter = Math.floor(month/3) + 1
  const year = d.getFullYear()
  const from = new Date(year, (quarter-1)*3, 1)
  const to = new Date(year, quarter*3, 0)
  return { year, quarter, from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] }
}

function quarterBefore(year:number, quarter:number, steps:number){
  let q = quarter - steps
  let y = year
  while(q <= 0){ q += 4; y -= 1 }
  const from = new Date(y, (q-1)*3, 1)
  const to = new Date(y, q*3, 0)
  return { year: y, quarter: q, from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] }
}

// Create previous N quarters by copying an existing tariff (KIS): copy rates and create new TariffSet with adjusted period
export function createPreviousQuartersFromActive(count: number, company?: string, segment?: string){
  const today = new Date().toISOString()
  const active = findActiveTariffForDate(today, company, segment)
  if (!active) return { created: 0, message: 'No hay tarifa activa para copiar' }
  const created: TariffSet[] = []
  const all = loadTariffs()
  // determine source header info
  const srcHeader = active.header
  const srcRates = active.rates
  // determine quarter of the active tariff (use header.period.from)
  const qinfo = quarterFromDate(srcHeader.period.from || today)
  for (let i=1;i<=count;i++){
    const target = quarterBefore(qinfo.year, qinfo.quarter, i)
    // check existence
    const exists = all.some(t=> t.header.period.from === target.from && t.header.company === srcHeader.company && t.header.segment === srcHeader.segment)
    if (exists) continue
    const id = `${srcHeader.company}-${srcHeader.segment}-${target.year}Q${target.quarter}`
    const newTariff: TariffSet = {
      header: {
        id,
        company: srcHeader.company,
        companyCode: srcHeader.companyCode,
        segment: srcHeader.segment,
        period: { from: target.from, to: target.to },
        effectiveAt: target.from,
        currency: srcHeader.currency || 'GTQ',
        sourcePdf: 'auto-copied-backward'
      },
      rates: { ...srcRates, notes: `Auto-copied from ${srcHeader.id} for ${target.year}Q${target.quarter}` }
    }
    all.push(newTariff)
    created.push(newTariff)
  }
  saveTariffs(all)
  return { created: created.length, items: created }
}

// Compute deltas (period consumptions) from cumulative readings.
// Assumes `consumption` and `production` currently contain cumulative meter values
// (monotonically increasing). Returns a new array where each entry's consumption
// and production are the difference from the previous chronological entry.
export function computeDeltas(readings: Reading[]){
  if (!readings || readings.length === 0) return []
  // clone and sort by date ascending
  const items = [...readings].map(r=>({ ...r, date: new Date(r.date).toISOString() }))
  items.sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime())
  const out: Reading[] = []
  for (let i=0;i<items.length;i++){
    const curr = items[i]
    if (i === 0){
      // first entry: keep as-is or set to 0 (choose 0 to represent no prior period)
      out.push({ ...curr, consumption: 0, production: 0 })
    } else {
      const prev = items[i-1]
      const c = Number(curr.consumption) - Number(prev.consumption)
      const p = Number(curr.production) - Number(prev.production)
      out.push({ ...curr, consumption: isNaN(c)?0:c, production: isNaN(p)?0:p })
    }
  }
  return out
}

// Meter info (metadata about the meter/owner/system)
export function loadMeterInfo(): MeterInfo {
  try{
    // Prefer meters map if present
    const metersRaw = localStorage.getItem(METERS_KEY)
    if (metersRaw){
      const map = JSON.parse(metersRaw) as Record<string, MeterInfo>
      const cur = loadCurrentMeterId()
      if (map && cur && map[cur]) return map[cur]
    }
    const raw = localStorage.getItem(METER_INFO_KEY)
    if (!raw) return DEFAULT_METER
    return JSON.parse(raw)
  }catch(e){ return DEFAULT_METER }
}

export function saveMeterInfo(m: MeterInfo){
  try{ localStorage.setItem(METER_INFO_KEY, JSON.stringify(m)) }catch(e){}
}

// Meters map management
export function loadMeters(): Record<string, MeterInfo>{
  try{
    const raw = localStorage.getItem(METERS_KEY)
    if (!raw){
      const defId = DEFAULT_METER.contador
      const map: Record<string, MeterInfo> = {}
      // prefer distribuidora from companies master if available
      let distrib = DEFAULT_METER.distribuidora
      try{ const comps = loadCompanies(); if (comps && comps.length>0) distrib = comps[0].id }catch(e){}
      const seeded: MeterInfo = { ...DEFAULT_METER, distribuidora: distrib }
      map[defId] = seeded
      localStorage.setItem(METERS_KEY, JSON.stringify(map))
      localStorage.setItem(CURRENT_METER_KEY, defId)
      return map
    }
    const parsed = JSON.parse(raw) as Record<string, MeterInfo>
    // ensure default exists
    if (!parsed[DEFAULT_METER.contador]){
      let distrib = DEFAULT_METER.distribuidora
      try{ const comps = loadCompanies(); if (comps && comps.length>0) distrib = comps[0].id }catch(e){}
      parsed[DEFAULT_METER.contador] = { ...DEFAULT_METER, distribuidora: distrib }
    }
    return parsed
  }catch(e){ return { [DEFAULT_METER.contador]: DEFAULT_METER } }
}

export function saveMeters(m: Record<string, MeterInfo>){
  try{ localStorage.setItem(METERS_KEY, JSON.stringify(m)) }catch(e){}
}

export function loadCurrentMeterId(): string {
  try{
    const cur = localStorage.getItem(CURRENT_METER_KEY)
    if (cur) return cur
    // initialize from meter_info or default
    const miRaw = localStorage.getItem(METER_INFO_KEY)
    if (miRaw){
      try{ const mi = JSON.parse(miRaw) as MeterInfo; localStorage.setItem(CURRENT_METER_KEY, mi.contador); return mi.contador }catch(e){}
    }
    localStorage.setItem(CURRENT_METER_KEY, DEFAULT_METER.contador)
    return DEFAULT_METER.contador
  }catch(e){ return DEFAULT_METER.contador }
}

export function saveCurrentMeterId(id: string){
  try{ localStorage.setItem(CURRENT_METER_KEY, id) }catch(e){}
}

// Migrate legacy readings stored under `apenergia:readings` into the
// namespaced key for the current meter (apenergia:readings:<meterId>).
// Returns an object describing the result.
export function migrateLegacyReadingsToCurrentMeter(){
  try{
    const legacy = localStorage.getItem(READINGS_KEY)
    if (!legacy) return { migrated: 0, from: READINGS_KEY, to: readingsKey() }
    const cur = loadCurrentMeterId()
    const targetKey = readingsKey(cur)
    const existing = localStorage.getItem(targetKey)
    const legacyArr = JSON.parse(legacy)
    // create a backup copy with timestamp before modifying
    const backupKey = `apenergia:readings_backup:${Date.now()}`
    try{ localStorage.setItem(backupKey, legacy) }catch(e){}
    if (existing){
      // merge with existing, keeping legacy first (older). Deduplicate by date.
      try{
        const existingArr = JSON.parse(existing)
        const merged = [...legacyArr, ...existingArr]
        const deduped = dedupeReadings(merged)
        localStorage.setItem(targetKey, JSON.stringify(deduped))
      }catch(e){
        // best effort: try to parse legacy and save deduped
        try{ const deduped = dedupeReadings(Array.isArray(legacyArr)? legacyArr : [legacyArr]); localStorage.setItem(targetKey, JSON.stringify(deduped)) }catch(err){ localStorage.setItem(targetKey, legacy) }
      }
    } else {
      // save legacy but normalize/dedupe
      try{ const deduped = dedupeReadings(Array.isArray(legacyArr)? legacyArr : [legacyArr]); localStorage.setItem(targetKey, JSON.stringify(deduped)) }catch(e){ localStorage.setItem(targetKey, legacy) }
    }
    // remove legacy key now that we've migrated
    localStorage.removeItem(READINGS_KEY)
    const migrated = Array.isArray(legacyArr)? legacyArr.length : 1
    // record migration meta so UI can show confirmation
    const migrationInfo = { migrated, from: READINGS_KEY, to: targetKey, backupKey, ts: Date.now() }
    try{ localStorage.setItem('apenergia:migration_done', JSON.stringify(migrationInfo)) }catch(e){}
    return { ...migrationInfo }
  }catch(e){
    return { migrated: 0, from: READINGS_KEY, to: readingsKey() }
  }
}

export function loadMigrationInfo(){
  try{
    const raw = localStorage.getItem('apenergia:migration_done')
    if (!raw) return null
    return JSON.parse(raw)
  }catch(e){ return null }
}

export function clearMigrationInfo(){
  try{ localStorage.removeItem('apenergia:migration_done') }catch(e){}
}
