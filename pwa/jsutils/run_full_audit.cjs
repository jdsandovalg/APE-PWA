const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')

// Paths
const validate = path.join(__dirname, 'validate_invoice_pdf.cjs')
const rpc = path.join(__dirname, 'call_get_invoices.cjs')

async function run(pdfPath) {
  if (!pdfPath) {
    console.error('Usage: node run_full_audit.cjs <pdf-path>')
    process.exit(2)
  }

  const base = path.basename(pdfPath, path.extname(pdfPath)).replace(/\s+/g,'_')
  const outDir = path.join(__dirname, 'pdf_checks', base)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  console.log('1) Validate PDF and produce parsed.json...')
  execSync(`node "${validate}" "${pdfPath}"`, { stdio: 'inherit', env: process.env })

  const parsedPath = path.join(outDir, 'parsed.json')
  if (!fs.existsSync(parsedPath)) {
    console.error('parsed.json not found — aborting RPC step')
    process.exit(1)
  }
  const parsed = JSON.parse(fs.readFileSync(parsedPath,'utf8'))
  const meter = parsed.meter || parsed['meter']
  let meterId = null
  if (typeof meter === 'string' && /^[A-Z0-9-]+$/.test(meter)) meterId = meter
  // Try to extract a meter-like token from parsed.rawLines
  if (!meterId && parsed.rawLines && Array.isArray(parsed.rawLines)){
    // look for tokens like Z90018 or similar (letter followed by digits) or 'CONTADOR' lines
    for (const l of parsed.rawLines){
      const m1 = l.match(/\b([A-Z]{1,2}\d{3,6})\b/)
      if (m1) { meterId = m1[1]; break }
      const m2 = l.match(/CONTADOR\s*[:]?\s*([A-Z0-9-]{4,20})/i)
      if (m2) { meterId = m2[1].trim(); break }
    }
  }

  if (!meterId) {
    console.error('Could not determine meter id from parsed PDF — aborting RPC step')
    process.exit(1)
  }

  console.log('2) Calling get_invoices RPC for meter:', meterId)
  const outRpc = path.join(outDir, 'get_invoices_result.json')
  try {
    execSync(`node "${rpc}" "${meterId}" "${outRpc}"`, { stdio: 'inherit', env: process.env })
  } catch (err) {
    console.error('RPC step failed:', err)
  }

  console.log('Audit complete. Files written to', outDir)
}

if (require.main === module) {
  run(process.argv[2])
}
