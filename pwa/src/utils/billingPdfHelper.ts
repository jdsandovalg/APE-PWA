import { computeDeltas, findActiveTariffForDate } from '../services/storage'
import { computeInvoiceForPeriod } from '../services/billing'

export function buildBillingTable(readings: any[] = [], meterInfo?: any){
  function currency(v:number){ return `Q ${Number(v||0).toFixed(2)}` }
  // Create a container similar to the previous Dashboard table but isolated for PDF
  const wrapper = document.createElement('div')
  // Add billing-table class so injected PDF CSS targets it
  wrapper.className = 'glass-card billing-table'
  wrapper.style.width = '100%'
  wrapper.style.boxSizing = 'border-box'
  wrapper.style.color = 'inherit'
  wrapper.style.background = 'transparent'
  wrapper.style.marginTop = '16px'
  wrapper.style.padding = '12px'

  const h3 = document.createElement('h3')
  h3.textContent = 'Registro: Lecturas y Facturación'
  h3.style.fontSize = '16px'
  h3.style.fontWeight = '600'
  h3.style.marginBottom = '8px'
  wrapper.appendChild(h3)

  const container = document.createElement('div')
  container.style.overflowX = 'auto'

  const table = document.createElement('table')
  table.style.width = '100%'
  table.style.borderCollapse = 'collapse'
  table.style.fontSize = '11px'

  const thead = document.createElement('thead')
  const headRow = document.createElement('tr')
  // Match the detailed columns used in Billing.tsx
  const headers = ['Fecha','Consumo kWh','Cargo fijo','Energía neta','Distribución','Potencia','Contrib. A.P.','IVA','Total Q']
  headers.forEach((h, idx) => {
    const th = document.createElement('th')
    th.style.textAlign = idx === 0 ? 'left' : 'right'
    th.style.padding = '6px'
    th.style.borderBottom = '1px solid rgba(0,0,0,0.06)'
    th.textContent = h
    headRow.appendChild(th)
  })
  thead.appendChild(headRow)
  table.appendChild(thead)

  const tbody = document.createElement('tbody')
  try{
    const deltas = computeDeltas(readings || [])
    // iterate deltas (period rows) like Billing.tsx
    const sorted = (deltas || []).slice().sort((a:any,b:any)=> new Date(a.date).getTime() - new Date(b.date).getTime())
    sorted.forEach((r:any)=>{
      try{
        const tr = document.createElement('tr')
        tr.style.borderTop = '1px solid rgba(0,0,0,0.05)'
        const sampleDate = r.date
        const tariff = findActiveTariffForDate(sampleDate)
        const inv = computeInvoiceForPeriod(Number(r.consumption||0), Number(r.production||0), tariff, { forUnit: 'period', date: sampleDate, credits_kWh: Number((r as any).credit||0) } as any)

        const cells = [
          { txt: new Date(r.date).toISOString().split('T')[0], align: 'left' },
          { txt: Number(r.consumption||0).toLocaleString(), align: 'right' },
          { txt: inv && inv.fixed_charge_Q ? currency(inv.fixed_charge_Q) : '-', align: 'right' },
          { txt: inv && inv.energy_charge_Q ? currency(inv.energy_charge_Q) : '-', align: 'right' },
          { txt: inv && inv.distribution_charge_Q ? currency(inv.distribution_charge_Q) : '-', align: 'right' },
          { txt: inv && inv.potencia_charge_Q ? currency(inv.potencia_charge_Q) : '-', align: 'right' },
          { txt: inv && inv.contrib_amount_Q ? currency(inv.contrib_amount_Q) : '-', align: 'right' },
          { txt: inv && inv.iva_amount_Q ? currency(inv.iva_amount_Q) : '-', align: 'right' },
          { txt: inv && inv.total_due_Q ? currency(inv.total_due_Q) : currency(0), align: 'right' }
        ]
        cells.forEach(c=>{
          const td = document.createElement('td')
          td.style.padding = '6px'
          td.style.textAlign = c.align
          td.style.borderBottom = '1px solid rgba(0,0,0,0.03)'
          td.textContent = c.txt
          tr.appendChild(td)
        })
        tbody.appendChild(tr)
      }catch(e){ /* ignore row errors */ }
    })
  }catch(e){ /* ignore errors building table */ }

  table.appendChild(tbody)
  container.appendChild(table)
  wrapper.appendChild(container)
  return wrapper
}

export default buildBillingTable
