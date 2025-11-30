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
      themeUtil.setAutoMode()
      // offer the user a chance to enable precise browser geolocation for better accuracy
      try {
        const ask = window.confirm('Modo Auto usa ubicación aproximada por IP. ¿Permitir ubicación más precisa (preguntará al navegador)?')
        if (ask) {
          themeUtil.requestBrowserGeolocation().then(ok => {
            if (ok) {
              // reapply auto theme using newly stored coords
              themeUtil.applyAutoTheme()
            }
          })
        }
      } catch (e) {}
    } else themeUtil.setTheme(next)
  }

  const icon = mode === 'auto' ? <Clock size={16} /> : mode === 'light' ? <Sun size={16} /> : <Moon size={16} />

  return (
    <button aria-label="Toggle theme" title="Tema" onClick={handleToggle} className="glass-button p-2 flex items-center justify-center" style={{ width:36, height:36 }}>
      {icon}
    </button>
  )
}
