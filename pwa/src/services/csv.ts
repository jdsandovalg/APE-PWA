export function removeBOM(s: string){
  if (s && s.charCodeAt(0) === 0xFEFF) return s.slice(1)
  return s
}

function splitLine(line: string, delim: string){
  const res: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++){
    const ch = line[i]
    if (ch === '"'){
      if (inQuotes && line[i+1] === '"'){
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delim && !inQuotes){
      res.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  res.push(cur)
  return res
}

export function detectDelimiter(sample: string){
  // prefer semicolon if present, else comma, else tab
  if (sample.indexOf(';') >= 0) return ';'
  if (sample.indexOf(',') >= 0) return ','
  if (sample.indexOf('\t') >= 0) return '\t'
  return ','
}

export function parseCSV(text: string){
  const cleaned = removeBOM(text).replace(/\r/g,'')
  const lines = cleaned.split('\n').map(l=>l.trim()).filter(l=>l.length>0)
  if (lines.length === 0) return { headers: [], rows: [] }
  const delim = detectDelimiter(lines[0])
  const headers = splitLine(lines[0], delim).map(h=>h.trim().toLowerCase())
  const rows: Record<string,string>[] = []
  for (let i = 1; i < lines.length; i++){
    const cols = splitLine(lines[i], delim)
    const obj: Record<string,string> = {}
    for (let j = 0; j < headers.length; j++){
      obj[headers[j]] = (cols[j] ?? '').trim()
    }
    rows.push(obj)
  }
  return { headers, rows }
}

export function toNumber(v: string){
  if (!v && v !== 0) return 0
  // accept decimal comma
  const s = String(v).replace(/\s+/g,'').replace(',', '.')
  const n = Number(s)
  return isNaN(n) ? 0 : n
}
