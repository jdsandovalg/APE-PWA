export type Theme = 'dark' | 'light'

const THEME_KEY = 'ape_theme'

export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (!v) return null
    return v as Theme
  } catch (e) { return null }
}

export function setTheme(theme: Theme) {
  try {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  } catch (e) {
    // ignore
  }
}

export function detectSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function initTheme() {
  const stored = getStoredTheme()
  if (stored) { setTheme(stored); return stored }
  const sys = detectSystemTheme()
  setTheme(sys)
  return sys
}

export function toggleTheme() {
  const cur = (document.documentElement.getAttribute('data-theme') || 'dark') as Theme
  const next = cur === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

export default { initTheme, getStoredTheme, setTheme, toggleTheme }
