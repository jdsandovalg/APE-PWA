import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

try{
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}catch(err:any){
  console.error('Render error', err)
  const el = document.getElementById('root')
  if (el) el.innerHTML = `<div style="padding:20px;color:#fff;background:#111"><h2>Application error</h2><pre style="white-space:pre-wrap;color:#f88">${String(err && err.stack ? err.stack : err)}</pre></div>`
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error)
  })
}
