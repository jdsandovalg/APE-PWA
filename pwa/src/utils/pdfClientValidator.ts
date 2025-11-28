// Minimal client-side PDF text extractor using pdfjs-dist
// Returns the concatenated text of all pages
export async function extractTextFromPdf(file: File): Promise<string> {
  // Read file into ArrayBuffer
  const arrayBuffer = await file.arrayBuffer()

  // Dynamically import pdfjs to avoid bundler startup cost
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf')
  // Import the worker and set workerSrc (Vite will return a URL in default)
  const workerModule = await import('pdfjs-dist/legacy/build/pdf.worker.entry')
  // Some bundlers export default, some export the URL directly
  // @ts-ignore
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule?.default || workerModule

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    // eslint-disable-next-line no-await-in-loop
    const page = await pdf.getPage(i)
    // eslint-disable-next-line no-await-in-loop
    const content = await page.getTextContent()
    const strings = content.items.map((s: any) => s.str)
    fullText += strings.join(' ') + '\n'
  }
  return fullText
}

// Basic parser: find total and meter (heuristic)
export function parseSimpleInvoiceText(text: string) {
  const result: any = {}
  if (!text) return result
  // Normalize
  const t = text.replace(/\s+/g, ' ')
  // Try to find total: look for words TOTAL and a currency amount
  const reTotal = /TOTAL[^0-9\n\r\$Q:,]*[Q$]?\s*([0-9]+[.,]?[0-9]*)/i
  const mTotal = t.match(reTotal)
  if (mTotal && mTotal[1]) {
    result.total = Number(mTotal[1].replace(/,/g, '.'))
  }
  // Try to find contador / meter like Z90018 or similar
  const reMeter = /\b(Z\d{4,})\b/i
  const mMeter = t.match(reMeter)
  if (mMeter) result.meter = mMeter[1]
  // Try to find a date in format dd/mm/yyyy or yyyy-mm-dd
  const reDate1 = /(\b\d{1,2}\/\d{1,2}\/\d{4}\b)/
  const mDate1 = t.match(reDate1)
  if (mDate1) result.date = mDate1[1]
  const reDate2 = /(\b\d{4}-\d{2}-\d{2}\b)/
  const mDate2 = t.match(reDate2)
  if (mDate2) result.date = mDate2[1]
  return result
}

// More detailed parser to extract line items: cargo fijo, energia, distribucion, potencia, contrib, iva, total
export function parseInvoiceDetailed(text: string) {
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
  const out: any = {}
  const parseNum = (s: string) => Number(s.replace(/\s+/g,'').replace(/,/g, '.'))

  // iterate lines and match known patterns
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ')

    // Cargo fijo
    let m = line.match(/cargo fijo[^0-9\-]*([0-9]+[.,]?[0-9]*)\s*([0-9]+[.,]?[0-9]*)?/i)
    if (m) {
      out.fixed_charge_rate = parseNum(m[1])
      if (m[2]) out.fixed_charge = parseNum(m[2])
      continue
    }

    // Energia neta with rate, kWh and amount
    m = line.match(/energ[ií]a neta[^0-9\-]*([0-9]+[.,]?[0-9]*)\s*([0-9]+)\s*kWh\s*([0-9]+[.,]?[0-9]*)/i)
    if (m) {
      out.energy_rate = parseNum(m[1])
      out.energy_kwh = Number(m[2])
      out.energy_amount = parseNum(m[3])
      continue
    }

    // Energia amount when kWh absent
    m = line.match(/energ[ií]a neta[^0-9\-]*([0-9]+[.,]?[0-9]*)/i)
    if (m && out.energy_amount==null) {
      out.energy_amount = parseNum(m[1])
      continue
    }

    // Distribucion: rate, kWh, amount
    m = line.match(/distribuci[oó]n[^0-9\-]*([0-9]+[.,]?[0-9]*)\s*([0-9]+)\s*kWh\s*([0-9]+[.,]?[0-9]*)/i)
    if (m) {
      out.distribution_rate = parseNum(m[1])
      out.distribution_kwh = Number(m[2])
      out.distribution_amount = parseNum(m[3])
      continue
    }

    // Potencia
    m = line.match(/potencia[^0-9\-]*([0-9]+[.,]?[0-9]*)\s*([0-9]+)\s*kWh\s*([0-9]+[.,]?[0-9]*)/i)
    if (m) {
      out.potencia_rate = parseNum(m[1])
      out.potencia_kwh = Number(m[2])
      out.potencia_amount = parseNum(m[3])
      continue
    }

    // Total cargo (sin IVA) and total cargo (con IVA)
    m = line.match(/total cargo \(sin iva\)\s*([0-9]+[.,]?[0-9]*)/i)
    if (m) { out.total_cargo_sin_iva = parseNum(m[1]); continue }
    m = line.match(/total cargo \(con iva\)\s*([0-9]+[.,]?[0-9]*)/i)
    if (m) { out.total_cargo_con_iva = parseNum(m[1]); continue }

    // Contribucion A.P.
    m = line.match(/contribuci[oó]n\s*A\.P\.[^0-9%]*([0-9]+[.,]?[0-9]*)%?[^0-9]*([0-9]+[.,]?[0-9]*)?/i)
    if (m) { if (m[1]) out.contrib_percent = parseNum(m[1]); if (m[2]) out.contrib_amount = parseNum(m[2]); continue }

    // IVA lines
    // IVA special row like: "IVA Q 0.00 6.65 6.65" -> take last numeric token as IVA amount
    m = line.match(/^IVA\s+Q\b/i)
    if (m) {
      const toks = line.match(/[0-9]+(?:[.,][0-9]+)?/g)
      if (toks && toks.length>0) {
        out.iva_amount = parseNum(toks[toks.length-1])
      }
      continue
    }
    // Generic IVA with percent and/or amount
    m = line.match(/iva[^0-9%]*([0-9]+(?:[.,][0-9]+)?)%?[^0-9]*([0-9]+[.,]?[0-9]*)?/i)
    if (m) { if (m[1]) out.iva_percent = parseNum(m[1]); if (m[2]) out.iva_amount = parseNum(m[2]); continue }

    // Total de esta factura or TOTAL A PAGAR
    m = line.match(/total (de esta factura|a pagar)?[^0-9\-:]*([0-9]+[.,]?[0-9]*)/i)
    if (m) { out.total = parseNum(m[2]); continue }

    // Meter
    m = line.match(/\b(Z\d{3,})\b/i)
    if (m) { out.meter = m[1]; continue }

    // Date
    m = line.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/)
    if (m && !out.date) { out.date = m[1]; continue }
  }

  // Post-scan heuristics: sometimes IVA appears in a table row like "IVA Q 0.00 6.65 6.65"
  if (out.iva_amount == null) {
    for (const raw of lines) {
      const line = raw.trim()
      const m2 = line.match(/^IVA\s+Q\s+(.+)$/i)
      if (m2) {
        // take last numeric token in the line
        const toks = m2[1].trim().split(/\s+/)
        for (let i = toks.length-1; i >=0; i--) {
          const num = toks[i].replace(/[^0-9.,-]/g,'')
          if (num && /[0-9]/.test(num)) { out.iva_amount = parseNum(num); break }
        }
        if (out.iva_amount != null) break
      }
    }
  }

  return out
}
