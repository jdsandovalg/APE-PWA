import React from 'react'
import { Sun, Moon, Clock } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import themeUtil, { initTheme, getStoredTheme, getGeoAskStatus, hasStoredCoords } from '../utils/theme'

export default function ThemeToggle(){
  const [mode, setMode] = React.useState<'light'|'dark'|'auto'>(() => {
    try {
      const stored = getStoredTheme() as ('light'|'dark'|'auto'|null)
      return (stored || 'auto') as any
    } catch { return 'auto' }
  })

  React.useEffect(()=>{
    const t = initTheme()
    if (t === 'auto' || t === null) setMode('auto')
    else setMode(t as 'light'|'dark')
  }, [])

  const [showAsk, setShowAsk] = React.useState(false)

  function handleToggle(){
    const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light'
    setMode(next)
    if (next === 'auto') {
      // If we already have fresh stored coords -> use precise silently
      if (hasStoredCoords()) {
        themeUtil.setAutoMode()
        void themeUtil.applyAutoTheme()
        return
      }

      const geoStatus = getGeoAskStatus()
      if (geoStatus === 'declined') {
        // user already declined before -> enable auto with Geo-IP silently
        themeUtil.setAutoMode()
        void themeUtil.applyAutoTheme()
        return
      }

      if (geoStatus === 'accepted') {
        // user accepted previously but coords expired: try silent request to refresh coords
        themeUtil.requestBrowserGeolocation(8000).then(ok => {
          if (ok) {
            themeUtil.setAutoMode()
            void themeUtil.applyAutoTheme()
          } else {
            // fallback to Geo-IP
            themeUtil.setAutoMode()
            void themeUtil.applyAutoTheme()
            themeUtil.markGeoAskStatus('declined')
          }
        })
        return
      }

      // never asked -> open modal to ask once
      setShowAsk(true)
    } else themeUtil.setTheme(next)
  }

  const icon = mode === 'auto' ? <Clock size={16} /> : mode === 'light' ? <Sun size={16} /> : <Moon size={16} />
  const autoBadge = mode === 'auto' ? (hasStoredCoords() ? 'GPS' : 'IP') : null

  return (
    <>
      <ConfirmModal open={showAsk} title="Usar ubicación precisa?" message="Modo Auto usa ubicación aproximada por IP para calcular amanecer/anochecer. ¿Permitir ubicación más precisa (el navegador pedirá permiso)?" onCancel={()=>{ setShowAsk(false); themeUtil.markGeoAskStatus('declined'); themeUtil.setAutoMode(); void themeUtil.applyAutoTheme() }} onConfirm={()=>{ setShowAsk(false); themeUtil.requestBrowserGeolocation().then(ok=>{ if(ok){ themeUtil.setAutoMode(); void themeUtil.applyAutoTheme() } else { themeUtil.setAutoMode(); void themeUtil.applyAutoTheme(); themeUtil.markGeoAskStatus('declined') } }) }} />
      <button aria-label="Toggle theme" title="Tema" onClick={handleToggle} className="glass-button p-2 flex items-center justify-center relative" style={{ width:36, height:36 }}>
        {icon}
        {autoBadge && (
          <span className="absolute -bottom-2 right-0 text-2xs bg-black/50 px-1 py-0.5 rounded text-white" style={{ transform: 'translateY(50%)' }}>{autoBadge}</span>
        )}
      </button>
    </>
  )
}
