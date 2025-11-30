import React from 'react'
import { Sun, Moon, Clock } from 'lucide-react'
import themeUtil, { initTheme, getStoredTheme } from '../utils/theme'

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

  function handleToggle(){
    const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light'
    setMode(next)
    if (next === 'auto') {
      // If we already have stored coords, or we already asked before, don't prompt again.
      if (themeUtil.hasStoredCoords()) {
        themeUtil.setAutoMode()
        // re-apply immediately with stored coords
        void themeUtil.applyAutoTheme()
      } else if (themeUtil.wasAskedForGeolocation()) {
        // User already declined/was asked previously — enable auto using Geo-IP fallback without prompting
        themeUtil.setAutoMode()
        void themeUtil.applyAutoTheme()
      } else {
        // Ask once for permission to get precise browser geolocation; if declined we markAsked to avoid repeating
        try {
          const ask = window.confirm('Modo Auto usa ubicación aproximada por IP. ¿Permitir ubicación más precisa (preguntará al navegador)?')
          if (ask) {
            themeUtil.requestBrowserGeolocation().then(ok => {
              if (ok) {
                // reapply auto theme using newly stored coords
                void themeUtil.applyAutoTheme()
                themeUtil.markAskedForGeolocation()
              } else {
                // user accepted prompt but geolocation failed/denied — mark as asked
                themeUtil.markAskedForGeolocation()
                themeUtil.setAutoMode()
                void themeUtil.applyAutoTheme()
              }
            })
          } else {
            // user declined to be asked now; remember choice and use Geo-IP fallback
            themeUtil.markAskedForGeolocation()
            themeUtil.setAutoMode()
            void themeUtil.applyAutoTheme()
          }
        } catch (e) {
          // fallback: enable auto using Geo-IP
          themeUtil.markAskedForGeolocation()
          themeUtil.setAutoMode()
          void themeUtil.applyAutoTheme()
        }
      }
    } else themeUtil.setTheme(next)
  }

  const icon = mode === 'auto' ? <Clock size={16} /> : mode === 'light' ? <Sun size={16} /> : <Moon size={16} />

  return (
    <button aria-label="Toggle theme" title="Tema" onClick={handleToggle} className="glass-button p-2 flex items-center justify-center" style={{ width:36, height:36 }}>
      {icon}
    </button>
  )
}
