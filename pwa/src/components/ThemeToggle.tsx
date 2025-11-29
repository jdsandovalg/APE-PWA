import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { initTheme, getStoredTheme, toggleTheme } from '../utils/theme'

export default function ThemeToggle(){
  const [theme, setTheme] = React.useState<string>(() => (typeof document !== 'undefined' ? (document.documentElement.getAttribute('data-theme') || (getStoredTheme() || 'dark')) : 'dark'))

  React.useEffect(()=>{
    // Ensure theme initialized on mount
    const t = initTheme()
    setTheme(t)
  }, [])

  function handleToggle(){
    const next = toggleTheme()
    setTheme(next)
  }

  return (
    <button aria-label="Toggle theme" title="Tema" onClick={handleToggle} className="glass-button p-2 flex items-center justify-center" style={{ width:36, height:36 }}>
      {theme === 'dark' ? <Sun size={16} className="text-white" /> : <Moon size={16} className="text-gray-700" />}
    </button>
  )
}
