// Simple test runner for parseInvoiceDetailed-like logic using the extracted text file.
const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', '2025 - Noviembre - 661116.txt')
const text = fs.readFileSync(filePath, 'utf8')

function parseNum(s){ return Number(String(s).replace(/\s+/g,'').replace(/,/g, '.')) }

function parseInvoiceDetailedText(text){
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
  const out = {}
  for (const raw of lines){
    const line = raw.replace(/\s+/g,' ')
    let m
    m = line.match(/cargo fijo[^0-9\-]*([0-9]+[.,]?[0-9]*)\s*([0-9]+[.,]?[0-9]*)?/i)
    if (m){ out.fixed_charge_rate = parseNum(m[1]); if (m[2]) out.fixed_charge = parseNum(m[2]); continue }
    m = line.match(/energ[ií]a neta[^0-9\-]*([0-9]+[.,]?[0-9]*)\s*([0-9]+)\s*kWh\s*([0-9]+[.,]?[0-9]*)/i)
    if (m){ out.energy_rate = parseNum(m[1]); out.energy_kwh = Number(m[2]); out.energy_amount = parseNum(m[3]); continue }
    m = line.match(/distribuci[oó]n[^0-9\-]*([0-9]+[.,]?[0-9]*)\s*([0-9]+)\s*kWh\s*([0-9]+[.,]?[0-9]*)/i)
    if (m){ out.distribution_rate = parseNum(m[1]); out.distribution_kwh = Number(m[2]); out.distribution_amount = parseNum(m[3]); continue }
    m = line.match(/potencia[^0-9\-]*([0-9]+[.,]?[0-9]*)\s*([0-9]+)\s*kWh\s*([0-9]+[.,]?[0-9]*)/i)
    if (m){ out.potencia_rate = parseNum(m[1]); out.potencia_kwh = Number(m[2]); out.potencia_amount = parseNum(m[3]); continue }
    m = line.match(/total cargo \(sin iva\)\s*([0-9]+[.,]?[0-9]*)/i)
    if (m){ out.total_cargo_sin_iva = parseNum(m[1]); continue }
    m = line.match(/total cargo \(con iva\)\s*([0-9]+[.,]?[0-9]*)/i)
    if (m){ out.total_cargo_con_iva = parseNum(m[1]); continue }
    m = line.match(/contribuci[oó]n[^0-9%]*([0-9]+[.,]?[0-9]*)%?[^0-9]*([0-9]+[.,]?[0-9]*)?/i)
    if (m){ if (m[1]) out.contrib_percent = parseNum(m[1]); if (m[2]) out.contrib_amount = parseNum(m[2]); continue }
    // IVA special row
    m = line.match(/^IVA\s+Q\b/i)
    if (m){
      const toks = line.match(/[0-9]+(?:[.,][0-9]+)?/g)
      if (toks && toks.length>0) out.iva_amount = parseNum(toks[toks.length-1])
      continue
    }
    m = line.match(/iva[^0-9%]*([0-9]+(?:[.,][0-9]+)?)%?[^0-9]*([0-9]+[.,]?[0-9]*)?/i)
    if (m){ if (m[1]) out.iva_percent = parseNum(m[1]); if (m[2]) out.iva_amount = parseNum(m[2]); continue }
    m = line.match(/total (de esta factura|a pagar)?[^0-9\-:]*([0-9]+[.,]?[0-9]*)/i)
    if (m){ out.total = parseNum(m[2]); continue }
    m = line.match(/\b(Z\d{3,})\b/i)
    if (m){ out.meter = m[1]; continue }
    m = line.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/)
    if (m && !out.date){ out.date = m[1]; continue }
  }
  // post-scan for IVA like 'IVA Q 0.00 6.65 6.65'
  if (out.iva_amount == null){
    for (const raw of lines){
      const line = raw.trim()
      const m2 = line.match(/^IVA\s+Q\s+(.+)$/i)
      if (m2){
        const toks = m2[1].trim().split(/\s+/)
        for (let i = toks.length-1; i>=0; i--){
          const num = String(toks[i]).replace(/[^0-9.,-]/g,'')
          if (num && /[0-9]/.test(num)){ out.iva_amount = parseNum(num); break }
        }
        if (out.iva_amount != null) break
      }
    }
  }

  return out
}

const parsed = parseInvoiceDetailedText(text)
console.log(JSON.stringify(parsed, null, 2))
