import React, { useEffect, useState } from 'react'

export default function Footer(){
  const [meta, setMeta] = useState<{version?:string, commit?:string, authorized?:string}>({})

  useEffect(()=>{
    let cancelled = false
    fetch('/build-meta.json').then(r=> r.json()).then(j=>{ if (!cancelled) setMeta(j) }).catch(()=>{})
    return ()=>{ cancelled = true }
  },[])

  const text = meta.authorized || (meta.version ? `Versión ${meta.version}` : '')

  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 6, textAlign: 'center', pointerEvents: 'none' }}>
      <div style={{ display: 'inline-block', padding: '2px 8px', fontSize: '10px', color: 'rgba(255,255,255,0.6)', background: 'transparent' }}>
        {text}{meta.commit ? ` — build ${meta.commit}` : ''}
        {text ? ' · ' : ''}
        <span style={{ opacity: 0.85 }}>Infosoft (r)</span>
      </div>
    </div>
  )
}
