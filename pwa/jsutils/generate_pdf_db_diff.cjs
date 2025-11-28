const fs = require('fs')
const path = require('path')

function safe(v){ return v == null ? null : (typeof v === 'number' ? Number(v) : (String(v).trim())) }
function num(v){ if(v==null) return null; const n=Number(String(v).replace(/[^0-9.-]/g,'')); return isNaN(n)?null:n }

function formatMoney(v){ if (v==null) return '-'; return Number(v).toFixed(2) }

function load(file){ if (!fs.existsSync(file)) return null; try{return JSON.parse(fs.readFileSync(file,'utf8')) }catch(e){ return null }}

function findBestInvoice(rpcInvoices, parsed){
  if (!rpcInvoices || rpcInvoices.length===0) return null
  // try match by invoice date
  if (parsed.invoice_date){
    const pDate = parsed.invoice_date
    const found = rpcInvoices.find(i => i.invoice_date && i.invoice_date.startsWith(pDate))
    if (found) return found
  }
  // try match by total amount
  if (parsed.total_Q){
    const found = rpcInvoices.find(i => Math.abs((Number(i.invoice?.total) || Number(i.total) || 0) - parsed.total_Q) < 0.5)
    if (found) return found
  }
  // fallback to first
  return rpcInvoices[0]
}

function buildRows(parsed, computed, rpcInvoice){
  const rows = []
  // map of concept: [pdfValue, systemValue]
  // try specific fields
  rows.push({concept: 'Fecha emisión', pdf: parsed.invoice_date || '-', system: rpcInvoice?.invoice_date || (computed ? parsed.invoice_date || '-' : '-')})
  rows.push({concept: 'Contador', pdf: parsed.meter || '-', system: rpcInvoice?.meter_id || '-'})
  rows.push({concept: 'Consumo kWh', pdf: parsed.entregada_delta || '-', system: rpcInvoice?.consumption_kwh ?? (computed? computed.net_energy_kWh: '-')})
  rows.push({concept: 'Producción kWh', pdf: parsed.recibida_delta || parsed.recibida_delta || '-', system: rpcInvoice?.production_kwh ?? '-'})
  // charges
  // cargo fijo
  const pdfFixed = parsed['Cargo_fijo_por_cliente_(Sin_IVA)'] || parsed['Cargo fijo'] || parsed['Cargo_fijo_por_cliente'] || parsed['Cargo_fijo'] || parsed['Cargo fijo por cliente (Sin IVA)'] || parsed['Cargo fijo por cliente (Sin IVA)'] || parsed['Cargo_fijo_por_cliente_(Sin_IVA)']
  const systemFixed = computed ? computed.fixed : (rpcInvoice?.invoice?.fixed || null)
  rows.push({concept: 'Cargo fijo (Q)', pdf: pdfFixed!=null?formatMoney(num(pdfFixed)): (parsed['Cargo_fijo_por_cliente_(Sin_IVA)']?formatMoney(num(parsed['Cargo_fijo_por_cliente_(Sin_IVA)'])):'-'), system: systemFixed!=null?formatMoney(systemFixed):'-'})

  // energy
  const pdfEnergy = parsed['Energía_neta_(Sin_IVA)'] || parsed['Energía neta']
  const systemEnergy = computed ? computed.energy_charge : (rpcInvoice?.invoice?.energy || null)
  rows.push({concept: 'Energía (Q)', pdf: pdfEnergy!=null?formatMoney(num(pdfEnergy)):'-', system: systemEnergy!=null?formatMoney(systemEnergy):'-'})

  // distribution
  const pdfDist = parsed['Cargo_por_distribución_(Sin_IVA)'] || parsed['Cargo por distribución']
  const systemDist = computed ? computed.distribution_charge : (rpcInvoice?.invoice?.distribution || null)
  rows.push({concept: 'Distribución (Q)', pdf: pdfDist!=null?formatMoney(num(pdfDist)):'-', system: systemDist!=null?formatMoney(systemDist):'-'})

  // potencia
  const pdfPot = parsed['Cargo_por_potencia_(Sin_IVA)'] || parsed['Cargo por potencia']
  const systemPot = computed ? computed.potencia_charge : (rpcInvoice?.invoice?.potencia || null)
  rows.push({concept: 'Potencia (Q)', pdf: pdfPot!=null?formatMoney(num(pdfPot)):'-', system: systemPot!=null?formatMoney(systemPot):'-'})

  // subtotal no iva
  const pdfSubtotalNoIva = parsed['Total cargo (Sin IVA)'] || parsed['Total cargo (Sin IVA)'] || parsed['Total cargo (Sin IVA)']
  const systemSubtotalNoIva = computed ? computed.subtotal_no_iva : (rpcInvoice?.invoice?.subtotal_no_iva || null)
  rows.push({concept: 'Subtotal (Sin IVA)', pdf: pdfSubtotalNoIva!=null?formatMoney(num(pdfSubtotalNoIva)):'-', system: systemSubtotalNoIva!=null?formatMoney(systemSubtotalNoIva):'-'})

  // iva
  const pdfIva = parsed['IVA'] || parsed.iva || parsed['IVA Q']
  const systemIva = computed ? computed.iva : (rpcInvoice?.invoice?.iva || null)
  rows.push({concept: 'IVA (Q)', pdf: pdfIva!=null?formatMoney(num(pdfIva)):'-', system: systemIva!=null?formatMoney(systemIva):'-'})

  // subtotal with iva
  const pdfSubtotalWithIva = parsed['Total cargo (Con IVA)'] || parsed['Total cargo (Con IVA)']
  const systemSubtotalWithIva = computed ? computed.subtotal_with_iva : (rpcInvoice?.invoice?.subtotal_with_iva || null)
  rows.push({concept: 'Subtotal (Con IVA)', pdf: pdfSubtotalWithIva!=null?formatMoney(num(pdfSubtotalWithIva)):'-', system: systemSubtotalWithIva!=null?formatMoney(systemSubtotalWithIva):'-'})

  // contrib
  const pdfContrib = parsed['Contribución A.P. (cobro cta. de terceros) (Sin IVA)'] || parsed.contrib_percent || parsed['Contribución']
  const systemContrib = computed ? computed.contrib : (rpcInvoice?.invoice?.contrib || null)
  rows.push({concept: 'Contribución A.P. (Q)', pdf: pdfContrib!=null?formatMoney(num(pdfContrib)):'-', system: systemContrib!=null?formatMoney(systemContrib):'-'})

  // total
  const pdfTotal = parsed.total_Q || parsed['Total de esta factura'] || parsed['Total factura']
  const systemTotal = computed ? computed.total : (rpcInvoice?.invoice?.total || null)
  rows.push({concept: 'Total factura (Q)', pdf: pdfTotal!=null?formatMoney(num(pdfTotal)):'-', system: systemTotal!=null?formatMoney(systemTotal):'-'})

  return rows
}

function toMarkdown(rows){
  const lines = []
  lines.push('| Concepto | PDF | Sistema |')
  lines.push('|---:|---:|---:|')
  for (const r of rows){
    lines.push(`| ${r.concept} | ${r.pdf} | ${r.system} |`)
  }
  return lines.join('\n')
}

async function main(pdfBase){
  const base = pdfBase.replace(/\s+/g,'_')
  const dir = path.join(__dirname, 'pdf_checks', base)
  if (!fs.existsSync(dir)) { console.error('Checks directory not found:', dir); process.exit(1) }
  const parsed = load(path.join(dir,'parsed.json')) || {}
  const computed = load(path.join(dir,'computed.json')) || null
  const rpc = load(path.join(dir,'get_invoices_result.json')) || null

  const rpcInvoices = Array.isArray(rpc) ? rpc : (rpc && rpc.invoices) ? rpc.invoices : rpc
  const best = findBestInvoice(rpcInvoices, parsed)

  const rows = buildRows(parsed, computed, best)

  fs.writeFileSync(path.join(dir,'diff.json'), JSON.stringify(rows,null,2),'utf8')
  fs.writeFileSync(path.join(dir,'diff.md'), toMarkdown(rows),'utf8')
  console.log('Diff written to', path.join(dir,'diff.md'))
}

if (require.main === module){
  const arg = process.argv[2]
  if (!arg){ console.error('Usage: node generate_pdf_db_diff.cjs "<pdf base name>"'); process.exit(2) }
  main(arg).catch(e=>{ console.error(e); process.exit(1) })
}
