import { loadMeterInfo, loadReadings, computeDeltas, findActiveTariffForDate, computeInvoiceForPeriod } from '../services/storage'
import React from 'react'
import { render } from 'react-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, LabelList } from 'recharts'

export async function exportPDF() {
  if (typeof window === 'undefined') return
  const exportingRef = { current: false }
  if (exportingRef.current) return
  exportingRef.current = true
  let wrapper: HTMLElement | null = null
  let meterInfo: any = null
  try{
    meterInfo = loadMeterInfo()
    const readings = loadReadings()
    const src = document.getElementById('dashboard-printable')
    if (!src){ throw new Error('No se encontró la sección para exportar') }

    // Clone the dashboard to avoid modifying the live UI
    const clone = src.cloneNode(true) as HTMLElement

    // Remove interactive controls from the clone (buttons, inputs) by removing elements with .no-print
    clone.querySelectorAll && clone.querySelectorAll('.no-print').forEach(n=> n.parentNode && n.parentNode.removeChild(n))

    // Create a full-width wrapper that paints the page background, and an inner container to center content
    wrapper = document.createElement('div')
    wrapper.className = 'pdf-wrapper'
    wrapper.style.width = '100%'
    wrapper.style.minHeight = '11in'
    wrapper.style.boxSizing = 'border-box'
    wrapper.style.margin = '0'
    // Default to dashboard (dark) look for the exported wrapper (ensure opaque background)
    const pageBg = (getComputedStyle(document.body).backgroundColor) || '#0b1222'
    wrapper.style.background = pageBg
    wrapper.style.color = getComputedStyle(document.body).color || '#fff'
    wrapper.style.fontFamily = getComputedStyle(document.body).fontFamily || 'Inter, system-ui, sans-serif'

    const inner = document.createElement('div')
    inner.className = 'pdf-inner'
    inner.style.maxWidth = '7.8in'
    inner.style.width = '100%'
    inner.style.margin = '0 auto'
    inner.style.boxSizing = 'border-box'
    inner.style.padding = '18mm'
    inner.appendChild(clone)
    wrapper.appendChild(inner)

    // Build billing table only for PDF (do not show in live Dashboard)
    try{
      const modHelper: any = await import('../utils/billingPdfHelper')
      const buildBilling = modHelper && (modHelper.buildBillingTable || modHelper.default)
      if (typeof buildBilling === 'function'){
        const billingNode = buildBilling(readings, meterInfo)
        if (billingNode){
          try{ billingNode.style.pageBreakBefore = 'always' }catch(e){ /* ignore */ }
          // append billing table into the inner centered container so wrapper background fills the page
          inner.appendChild(billingNode)
        }
      }
    }catch(err){ console.warn('No se pudo generar tabla de facturación para PDF', err) }

    // Render inside a same-origin iframe to preserve styles and ensure proper rendering
    // Append iframe off-screen
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.left = '-10000px'
    iframe.style.top = '0'
    iframe.style.width = '8.5in'
    iframe.style.height = '11in'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const idoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!idoc) throw new Error('No se pudo acceder al documento del iframe')

    // Build a minimal HTML page: copy current head (styles) and write our wrapper
    idoc.open()
    idoc.write('<!doctype html><html><head>')
    // Copy only safe head elements (styles, stylesheets, meta, title) to avoid executing scripts inside iframe
    try{
      // ensure relative URLs resolve inside iframe
      idoc.write(`<base href="${location.origin}${location.pathname}" />`)
      const safeHeadNodes = Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style, meta, title'))
      safeHeadNodes.forEach((n:any)=>{
        try{ idoc.write(n.outerHTML) }catch(e){ /* ignore write errors */ }
      })
    }catch(e){
      // fallback to minimal head if something goes wrong
      try{ idoc.write(document.head ? document.head.innerHTML : '') }catch(_){ /* ignore */ }
    }
    // Determine a solid background color to paint the PDF area (avoid translucent RGBA)
    const computedBg = getComputedStyle(document.body).backgroundColor || '#0b1222'
    const ensureOpaque = (bg:string) => {
      // if rgba with alpha less than 1, fallback to dark default
      try{
        const m = bg.match(/rgba?\(([^)]+)\)/)
        if (!m) return bg
        const parts = m[1].split(',').map(p=>p.trim())
        if (parts.length===4){
          const a = parseFloat(parts[3])
          if (isFinite(a) && a < 1) return '#0b1222'
        }
        return bg
      }catch(e){ return bg }
    }
    const captureBg = ensureOpaque(computedBg)

    // Inject table-specific print styles to better match Billing.tsx and ensure inner content expands
    idoc.write(`<style>
      body{display:flex;justify-content:center;align-items:flex-start;margin:0;padding:0;background:${captureBg}}
      html{background:${captureBg}}
      .pdf-root{width:100%;display:block}
      /* Ensure root and wrapper occupy full printable page area */
      .pdf-root, body, html { width:100%; height:100%; }
      /* Billing table print tweaks */
      .billing-table table{width:100%;border-collapse:collapse;font-size:11px}
      .billing-table thead th{background:rgba(255,255,255,0.06);color:#fff;padding:6px;border:1px solid rgba(255,255,255,0.06);text-align:center}
      .billing-table tbody td{padding:6px;border:1px solid rgba(255,255,255,0.04);vertical-align:top}
      .billing-table thead{display:table-header-group}
      .billing-table tbody{display:table-row-group}
      .billing-table tr{page-break-inside:avoid;break-inside:avoid}
      .text-2xs{font-size:9px;color:rgba(156,163,175,1)}
      .font-medium{font-weight:600}
      @media print{ .billing-table table{font-size:10px} }
      /* Make inner content expand to available page width and force internal elements to fill it */
      .pdf-inner{width:100%;box-sizing:border-box}
      .pdf-inner .card, .pdf-inner .glass-card, .pdf-inner table{width:100% !important;max-width:100% !important}
      .pdf-inner svg, .pdf-inner canvas, .pdf-inner img{width:100% !important;height:auto !important}
      .pdf-inner .grid-cards{grid-template-columns:repeat(auto-fit,minmax(240px,1fr)) !important}
    </style>`)
    idoc.write('</head><body></body></html>')
    idoc.close()

    // Append wrapper to iframe body (wrap with a root div to control layout)
    const iframeBody = idoc.body
    const root = idoc.createElement('div')
    root.className = 'pdf-root'
    root.appendChild(wrapper)
    iframeBody.appendChild(root)

    // Ensure cards are kept together (avoid page breaks inside cards)
    try{
      const cards = wrapper.querySelectorAll('.card, .glass-card')
      cards.forEach((c:any)=>{
        c.style.pageBreakInside = 'avoid'
        c.style.breakInside = 'avoid'
        c.style.webkitColumnBreakInside = 'avoid'
      })
    }catch(e){ /* ignore */ }

    // Inline SVG text styles so chart labels are visible in the rendered canvas
    try{
      const svgs = wrapper.querySelectorAll('svg')
      svgs.forEach((svg: any) => {
        // Apply computed styles to each <text> node inside the svg
        const texts = svg.querySelectorAll('text')
        texts.forEach((t: any) => {
          try{
            const cs = window.getComputedStyle(t)
            if (cs.fill) t.setAttribute('fill', cs.color || cs.fill)
            if (cs.fontSize) t.setAttribute('font-size', cs.fontSize)
            if (cs.fontFamily) t.setAttribute('font-family', cs.fontFamily)
            t.style.fill = cs.color || cs.fill
          }catch(e){ /* ignore */ }
        })
      })
    }catch(e){ /* ignore */ }


    // Give browser a moment to render fonts/images inside the iframe
    await new Promise(res => setTimeout(res, 700))

    // Force orientation to landscape for exported PDFs (user requested fixed landscape)
    let orientation: 'portrait' | 'landscape' = 'landscape'

    // If landscape, resize the iframe to match letter landscape so capture fills page
    try{
      if (orientation === 'landscape'){
        iframe.style.width = '11in'
        iframe.style.height = '8.5in'
        // increase inner maxWidth and slightly reduce padding to use more horizontal space
        try{ inner.style.maxWidth = '10.5in'; inner.style.padding = '12mm' }catch(e){ /* ignore */ }
      } else {
        iframe.style.width = '8.5in'
        iframe.style.height = '11in'
        try{ inner.style.maxWidth = '7.8in'; inner.style.padding = '18mm' }catch(e){ /* ignore */ }
      }
    }catch(e){ /* ignore */ }

    const mod: any = await import('html2pdf.js')
    const html2pdf = mod && (mod.default || mod)
    const filename = `ficha-${meterInfo?.contador || 'sincont'}-${new Date().toISOString().split('T')[0]}.pdf`

    await html2pdf().from(iframeBody).set({
      margin: 0.3,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: captureBg },
      jsPDF: { unit: 'in', format: 'letter', orientation },
      pagebreak: { mode: ['css', 'legacy'] }
    }).save()

    // cleanup
    document.body.removeChild(iframe)
  }catch(e:any){
    console.error('PDF export error:', e)
    // try to show a readable message
    const msg = (e && e.message) ? e.message : String(e)
    const { showToast } = await import('../services/toast')
    showToast(`Error al generar el PDF: ${msg}`, 'error')
    // attempt a simple fallback: try rendering the wrapper directly if iframe failed
    try{
      console.info('Intentando fallback: render directo del wrapper')
      const mod2: any = await import('html2pdf.js')
      const html2pdfb = mod2 && (mod2.default || mod2)
      if (html2pdfb && wrapper){
        // append wrapper to body directly and try
        document.body.appendChild(wrapper)
        await html2pdfb().from(wrapper).set({
          margin: 0.3,
          filename: `ficha-${meterInfo?.contador || 'sincont'}-${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        }).save()
        document.body.removeChild(wrapper)
      }
    }catch(fallbackErr){
      console.error('Fallback also failed:', fallbackErr)
    }
  }finally{ exportingRef.current = false }
}

export async function exportMeterPDF() {
  if (typeof window === 'undefined') return
  const exportingRef = { current: false }
  if (exportingRef.current) return
  exportingRef.current = true
  try{
    const meterInfo = loadMeterInfo()
    if (!meterInfo || !meterInfo.contador) {
      throw new Error('No se encontró información del medidor para exportar el PDF')
    }
    const readings = loadReadings()

    // Create a simple HTML content for the meter PDF
    const wrapper = document.createElement('div')
    wrapper.className = 'pdf-wrapper'
    wrapper.style.width = '100%'
    wrapper.style.minHeight = '11in'
    wrapper.style.boxSizing = 'border-box'
    wrapper.style.margin = '0'
    wrapper.style.background = '#0b1222'
    wrapper.style.color = '#fff'
    wrapper.style.fontFamily = 'Inter, system-ui, sans-serif'
    wrapper.style.padding = '20px'

    const content = document.createElement('div')
    content.innerHTML = `
      <h1 style="text-align: center; margin-bottom: 30px;">Ficha del Medidor</h1>
      <div style="max-width: 600px; margin: 0 auto;">
        <h2>Información del Contador</h2>
        <p><strong>Contador:</strong> ${meterInfo.contador}</p>
        <p><strong>Correlativo:</strong> ${meterInfo.correlativo}</p>
        <p><strong>Propietaria:</strong> ${meterInfo.propietaria}</p>
        <p><strong>NIT:</strong> ${meterInfo.nit}</p>
        <p><strong>Distribuidora:</strong> ${meterInfo.distribuidora}</p>
        <p><strong>Tipo de Servicio:</strong> ${meterInfo.tipo_servicio}</p>
        <p><strong>Sistema:</strong> ${meterInfo.sistema}</p>
      </div>
    `
    wrapper.appendChild(content)

    // Add charts
    try {
      // Compute chart data like in Dashboard
      const rawsForChart = readings
      let chartRows: any[] = []
      let cumulativeRows: any[] = []
      let chartRowsAvg: any[] = []
      let chartRowsAvgProd: any[] = []
      
      if (rawsForChart && rawsForChart.length >= 2) {
        const items = [...rawsForChart].map(r=>({ ...r, date: new Date(r.date).toISOString() }))
        items.sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime())
        for (let i=1;i<items.length;i++){
          const prev = items[i-1]
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
        // build average kWh/day series
        const MS_PER_DAY = 1000 * 60 * 60 * 24
        const avgConsSeries: any[] = []
        const avgProdSeries: any[] = []
        for (let i=1;i<items.length;i++){
          const prev = items[i-1]
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
        cumulativeRows = chartRows.map(r=>{
          running += (Number(r.production)||0) - (Number(r.consumption)||0)
          return { ...r, cumulative: running, positive: Math.max(running,0), negative: Math.abs(Math.min(running,0)) }
        })
        chartRowsAvg = avgConsSeries
        chartRowsAvgProd = avgProdSeries
      }

      // Chart 1: Producción neta por periodo
      const chartDiv1 = document.createElement('div')
      chartDiv1.style.marginTop = '20px'
      chartDiv1.style.width = '100%'
      chartDiv1.style.height = '300px'
      chartDiv1.style.maxWidth = '1600px'
      render(
        <LineChart width={1600} height={300} data={chartRows} margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.95)', fontSize: 9, angle: -45, textAnchor: 'end' }} tickCount={20} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.95)', fontSize: 9 }} />
          <Tooltip formatter={(value: any) => `${value} kWh`} itemStyle={{ color: '#fff' }} contentStyle={{ background: '#0b1222', borderColor: 'rgba(255,255,255,0.06)' }} />
          <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.85)' }} />
          <Line type="monotone" dataKey="net" name="Neto (kWh)" stroke="#38bdf8" strokeWidth={3} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="production" name="Producción" stroke="#34d399" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="consumption" name="Consumo" stroke="#fb7185" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        </LineChart>,
        chartDiv1
      )
      wrapper.appendChild(chartDiv1)

      // Pequeño delay para asegurar que la gráfica se renderice completamente
      await new Promise(resolve => setTimeout(resolve, 200))

      // Chart 2: Recibida kWh/día (promedio)
      const chartDiv2 = document.createElement('div')
      chartDiv2.style.marginTop = '20px'
      chartDiv2.style.width = '100%'
      chartDiv2.style.height = '250px'
      chartDiv2.style.maxWidth = '1600px'
      render(
        <LineChart width={1600} height={250} data={chartRowsAvg} margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.95)', fontSize: 9, angle: -45, textAnchor: 'end' }} tickCount={20} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.95)', fontSize: 9 }} />
          <Tooltip formatter={(value: any, name: any, props: any) => {
            if (name === 'avg') return [`${Number(value).toFixed(2)} kWh/d`, 'Promedio']
            return [`${value} kWh`, name]
          }} itemStyle={{ color: '#fff' }} contentStyle={{ background: '#0b1222', borderColor: 'rgba(255,255,255,0.06)' }} />
          <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.85)' }} />
          <Line type="monotone" dataKey="avg" name="kWh/día (avg)" stroke="#f59e0b" strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls={true}>
            <LabelList dataKey="avg" position="top" style={{ fontSize: 8, fill: 'rgba(255,255,255,0.95)' }} formatter={(v:any)=> v==null?'-':Number(v).toFixed(2)} />
          </Line>
        </LineChart>,
        chartDiv2
      )
      wrapper.appendChild(chartDiv2)

      // Pequeño delay para asegurar que la gráfica se renderice completamente
      await new Promise(resolve => setTimeout(resolve, 200))

      // Chart 3: Entregada kWh/día (promedio)
      const chartDiv3 = document.createElement('div')
      chartDiv3.style.marginTop = '20px'
      chartDiv3.style.width = '100%'
      chartDiv3.style.height = '250px'
      chartDiv3.style.maxWidth = '1600px'
      render(
        <AreaChart width={1600} height={250} data={chartRowsConsumption} margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.95)', fontSize: 9, angle: -45, textAnchor: 'end' }} tickCount={20} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.95)', fontSize: 9 }} />
          <Tooltip formatter={(value: any, name: any) => {
            if (name === 'avg') return [`${Number(value).toFixed(2)} kWh/d`, 'Promedio']
            return [`${value} kWh`, name]
          }} itemStyle={{ color: '#fff' }} contentStyle={{ background: '#0b1222', borderColor: 'rgba(255,255,255,0.06)' }} />
          <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
          <Line type="monotone" dataKey="avg" name="kWh/día (avg)" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false}>
            <LabelList dataKey="avg" position="top" style={{ fontSize: 7, fill: 'rgba(255,255,255,0.9)' }} formatter={(v:any)=> v==null?'-':Number(v).toFixed(2)} />
          </Line>
        </AreaChart>,
        chartDiv3
      )
      wrapper.appendChild(chartDiv3)

      // Pequeño delay para asegurar que la gráfica se renderice completamente
      await new Promise(resolve => setTimeout(resolve, 200))

      // Chart 4: Saldo acumulado
      const chartDiv4 = document.createElement('div')
      chartDiv4.style.marginTop = '20px'
      chartDiv4.style.width = '100%'
      chartDiv4.style.height = '220px'
      chartDiv4.style.maxWidth = '1600px'
      render(
        <AreaChart width={1600} height={220} data={cumulativeRows} margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 8, angle: -45, textAnchor: 'end' }} tickCount={20} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 8 }} />
          <Tooltip formatter={(value: any) => `${value} kWh`} itemStyle={{ color: '#fff' }} contentStyle={{ background: '#0b1222', borderColor: 'rgba(255,255,255,0.06)' }} />
          <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
          <Area type="monotone" dataKey="positive" name="Saldo positivo (kWh)" stroke="#34d399" fill="#134e4a" fillOpacity={0.6} />
          <Area type="monotone" dataKey="negative" name="Saldo negativo (abs kWh)" stroke="#fb7185" fill="#4c0519" fillOpacity={0.6} />
        </AreaChart>,
        chartDiv4
      )
      wrapper.appendChild(chartDiv4)

      // Delay adicional para asegurar que todas las gráficas se rendericen completamente
      await new Promise(resolve => setTimeout(resolve, 500))

    } catch (chartErr) {
      console.warn('No se pudieron generar gráficas para PDF', chartErr)
    }

    // Build billing table for PDF
    try{
      const modHelper: any = await import('../utils/billingPdfHelper')
      const buildBilling = modHelper && (modHelper.buildBillingTable || modHelper.default)
      if (typeof buildBilling === 'function'){
        const billingNode = buildBilling(readings, meterInfo)
        if (billingNode){
          try{ billingNode.style.pageBreakBefore = 'always' }catch(e){ /* ignore */ }
          wrapper.appendChild(billingNode)
        }
      }
    }catch(err){ console.warn('No se pudo generar tabla de facturación para PDF', err) }

    const mod: any = await import('html2pdf.js')
    const html2pdf = mod && (mod.default || mod)
    const filename = `ficha-medidor-${meterInfo.contador}-${new Date().toISOString().split('T')[0]}.pdf`

    await html2pdf().from(wrapper).set({
      margin: 0.5,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true, backgroundColor: '#0b1222' },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
    }).save()

  }catch(e:any){
    console.error('PDF export error:', e)
    const msg = (e && e.message) ? e.message : String(e)
    const { showToast } = await import('../services/toast')
    showToast(`Error al generar el PDF: ${msg}`, 'error')
  }finally{ exportingRef.current = false }
}