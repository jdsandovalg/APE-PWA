const fs = require('fs')
const path = require('path')
const pdf = require('pdf-parse')
const PDFParse = pdf.PDFParse || pdf.default || pdf
const { createClient } = require('@supabase/supabase-js')

function safeNumber(v){
  if (v == null) return 0
  const n = Number(String(v).replace(/[^0-9.-]/g,''))
  return isNaN(n) ? 0 : n
}

async function extractText(pdfPath){
  const buf = fs.readFileSync(pdfPath)
  const p = new PDFParse({ data: buf })
  const data = await p.getText()
  const text = (data && data.text) ? data.text : (typeof data === 'string' ? data : '')
  return text
}

function parseInvoiceText(text){
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
  const out = { rawLines: lines }

  // invoice date
  const dateLine = lines.find(l=>/TOTAL A PAGAR\b.*Fecha de emisión|Fecha de emisión/i.test(l))
  if (dateLine){
    const m = dateLine.match(/Fecha de emisión\s*([0-9]{1,2}\/\d{1,2}\/\d{2,4})/i)
    if (m) out.invoice_date = m[1]
  }

  // total payable Q
  const totalLine = lines.find(l=>/TOTAL de esta factura|TOTAL A PAGAR|Total de esta factura|Total factura/i.test(l))
  if (totalLine){
    const m = totalLine.match(/Q\s*([0-9,.]+)/)
    if (m) out.total_Q = safeNumber(m[1])
  }

  // meter id and invoice number
  const meterLine = lines.find(l=>/CONTADOR|CONTADOR|CONTADOR\b|CONTADOR:/i.test(l)) || lines.find(l=>/CONTADOR|contador|CONTADOR/i.test(l))
  if (meterLine){
    const mm = meterLine.match(/CONTADOR\s*[:]?\s*([A-Z0-9-]+)/i)
    if (mm) out.meter = mm[1]
  }

  // consumption/production table heuristics: look for 'Entregada kWh' and numbers
  const entregIndex = lines.findIndex(l=>/Entregada kWh/i.test(l) || /Entregada kWh/i.test(l))
  if (entregIndex>=0){
    // the line likely contains totals like 'Entregada kWh   1,690   1,550   140'
    const ln = lines[entregIndex]
    const nums = ln.match(/[0-9,]+/g) || []
    if (nums.length>=3){
      out.entregada_prev = safeNumber(nums[0])
      out.entregada_actual = safeNumber(nums[1])
      out.entregada_delta = safeNumber(nums[2])
    }
  }

  // search for contribution and iva
  const contribLine = lines.find(l=>/Contribución A\.P\.|Contribución A.P.|Contribucion A.P\.|Contribución/i.test(l))
  if (contribLine){
    const m = contribLine.match(/([0-9]{1,2}\.?[0-9]?)%/) || contribLine.match(/([0-9,.]+)\s*Q/)
    if (m) out.contrib_percent = safeNumber(m[1])
  }
  const ivaLine = lines.find(l=>/IVA/i.test(l))
  if (ivaLine){
    const m = ivaLine.match(/IVA\s*Q\s*([0-9,.]+)/i) || ivaLine.match(/IVA\s*\(?([0-9]{1,2})%\)?/i)
    if (m) out.iva = safeNumber(m[1])
  }

  // find specific charges
  for (const chargeName of ['Cargo fijo', 'Cargo por distribución','Cargo por potencia','Energía neta']){
    const found = lines.find(l=> l.includes(chargeName) )
    if (found){
      const m = found.match(/([0-9,.]+)\s*Q?\s*$/) || found.match(/\s([0-9,.]+)\s*$/)
      if (m) out[chargeName.replace(/\s+/g,'_')] = safeNumber(m[1])
      // attempt to extract kWh if present
      const k = found.match(/([0-9]+)\s*kWh/)
      if (k) out[chargeName.replace(/\s+/g,'_')+'_kWh'] = safeNumber(k[1])
    }
  }

  return out
}

async function findTariffForDate(supabase, dateStr, company, segment){
  // First try exact match by period range
  try{
    const { data, error } = await supabase
      .from('tariffs')
      .select('*')
      .lte('period_from', dateStr)
      .gte('period_to', dateStr)
      .is('deleted_at', null)
      .order('effective_at', { ascending: false })
      .limit(1)
    if (!error && data && data.length>0) return data[0]
  }catch(e){ /* ignore */ }

  // fallback: most recent by effective_at
  const { data, error } = await supabase.from('tariffs').select('*').is('deleted_at', null).order('effective_at',{ascending:false}).limit(1)
  if (!error && data && data.length>0) return data[0]
  return null
}

async function computeFromTariff(tariff, consumption_kWh, production_kWh){
  const fixed = Number(tariff.fixed_charge_q || tariff.fixedCharge_Q || 0)
  const energy_rate = Number(tariff.energy_q_per_kwh || tariff.energy_Q_per_kWh || 0)
  const distribution_rate = Number(tariff.distribution_q_per_kwh || tariff.distribution_Q_per_kWh || 0)
  const potencia_rate = Number(tariff.potencia_q_per_kwh || tariff.potencia_Q_per_kWh || 0)
  const contrib_percent = Number(tariff.contrib_percent || 0)
  const iva_percent = Number(tariff.iva_percent || 0)

  const net = Math.max(0, (consumption_kWh || 0) - (production_kWh || 0))
  const energy_charge = net * energy_rate
  const distribution_charge = (consumption_kWh || 0) * distribution_rate
  const potencia_charge = (consumption_kWh || 0) * potencia_rate
  const subtotal_no_iva = fixed + energy_charge + distribution_charge + potencia_charge
  const iva = subtotal_no_iva * (iva_percent/100)
  const subtotal_with_iva = subtotal_no_iva + iva
  const contrib = subtotal_no_iva * (contrib_percent/100)
  const total = subtotal_with_iva + contrib
  return { fixed, energy_charge, distribution_charge, potencia_charge, subtotal_no_iva, iva, subtotal_with_iva, contrib, total }
}

async function main(){
  const arg = process.argv[2]
  if (!arg){
    console.error('Usage: node validate_invoice_pdf.cjs <pdf-path>')
    process.exit(2)
  }
  const pdfPath = path.resolve(arg)
  if (!fs.existsSync(pdfPath)){
    console.error('PDF not found:', pdfPath)
    process.exit(2)
  }

  const outDirBase = path.join(__dirname, 'pdf_checks')
  if (!fs.existsSync(outDirBase)) fs.mkdirSync(outDirBase)
  const base = path.basename(pdfPath, path.extname(pdfPath)).replace(/\s+/g,'_')
  const outDir = path.join(outDirBase, base)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)

  console.log('Extracting text...')
  const text = await extractText(pdfPath)
  fs.writeFileSync(path.join(outDir, 'extracted.txt'), text, 'utf8')

  console.log('Parsing invoice text...')
  const parsed = parseInvoiceText(text)
  fs.writeFileSync(path.join(outDir, 'parsed.json'), JSON.stringify(parsed, null, 2), 'utf8')

  // Setup Supabase
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key){
    console.warn('Supabase env not found in process.env — skipping DB comparison')
    console.log('Report written to:', outDir)
    return
  }
  const supabase = createClient(url, key)

  // Determine invoice date
  let invoiceDate = parsed.invoice_date || null
  if (invoiceDate && invoiceDate.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)){
    // convert DD/MM/YY to YYYY-MM-DD if needed
    const parts = invoiceDate.split('/').map(p=>p.trim())
    if (parts.length===3){
      const d = parts[0].padStart(2,'0')
      const m = parts[1].padStart(2,'0')
      let y = parts[2]
      if (y.length===2) y = '20'+y
      invoiceDate = `${y}-${m}-${d}`
    }
  } else {
    // try to find any date-like line
    const dtLine = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/)
    if (dtLine) {
      const p = dtLine[1].split('/')
      let y = p[2]; if (y.length===2) y='20'+y
      invoiceDate = `${y}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`
    }
  }

  console.log('Invoice date resolved to', invoiceDate)

  // extract consumptions
  const consumption = parsed.entregada_delta || parsed['Entregada_kWh'] || null
  const production = parsed['Energía_neta'] ? parsed['Energía_neta'] : (parsed.entregada_prev ? 0 : 0)
  // better heuristic: look for lines with 'Recibida kWh' earlier
  const recLine = parsed.rawLines.find(l=>/Recibida kWh/i.test(l))
  if (recLine){
    const nums = recLine.match(/[0-9,]+/g) || []
    if (nums.length>=3) parsed.recibida_delta = safeNumber(nums[2])
  }

  const consumption_kWh = Number(consumption || 0)
  const production_kWh = Number(parsed.recibida_delta || 0)

  // find tariff
  let tariff = null
  if (invoiceDate) tariff = await findTariffForDate(supabase, invoiceDate)
  if (!tariff) tariff = await findTariffForDate(supabase, new Date().toISOString().slice(0,10))

  let computed = null
  if (tariff) {
    computed = await computeFromTariff(tariff, consumption_kWh, production_kWh)
    fs.writeFileSync(path.join(outDir, 'tariff_from_db.json'), JSON.stringify(tariff, null, 2), 'utf8')
    fs.writeFileSync(path.join(outDir, 'computed.json'), JSON.stringify(computed, null, 2), 'utf8')
  }

  const report = {
    pdf: path.basename(pdfPath),
    parsed,
    invoiceDate,
    consumption_kWh,
    production_kWh,
    tariffId: tariff ? tariff.id : null,
    computed,
    note: 'See extracted.txt, parsed.json and computed.json in this folder.'
  }
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8')

  console.log('Report written to', outDir)
  console.log('Summary:')
  if (parsed.total_Q) console.log(' PDF total:', parsed.total_Q)
  if (computed) console.log(' DB computed total:', computed.total)
  if (parsed.total_Q && computed) console.log(' Difference:', (parsed.total_Q - computed.total).toFixed(6))
}

main().catch(err=>{ console.error('Fatal error:', err); process.exit(1) })
