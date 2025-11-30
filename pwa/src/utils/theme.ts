import SunCalc from 'suncalc'

export type Theme = 'dark' | 'light' | 'auto'

const THEME_KEY = 'ape_theme'
const COORDS_KEY = 'ape_coords'

type Coords = { lat: number; lng: number; ts?: number }

export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (!v) return null
    return v as Theme
  } catch (e) {
    return null
  }
}

function setStoredTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch (e) {}
}

function setHtmlTheme(name: 'dark' | 'light') {
  try {
    document.documentElement.setAttribute('data-theme', name)
  } catch (e) {}
}

export function setTheme(theme: Exclude<Theme, 'auto'>) {
  setStoredTheme(theme)
  setHtmlTheme(theme)
}

export function setAutoMode() {
  setStoredTheme('auto')
  // compute and apply async
  void applyAutoTheme()
}

async function getCoords(): Promise<Coords | null> {
  // Use last stored coords if available
  try {
    const raw = localStorage.getItem(COORDS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Coords
      if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') return parsed
    }
  } catch (e) {}

  // Geo-IP fallback (no browser prompt) — ipapi.co is used here as an example
  try {
    const res = await fetch('https://ipapi.co/json/')
    if (!res.ok) throw new Error('ipapi failed')
    const j = await res.json()
    if (j && j.latitude && j.longitude) {
      const coords = { lat: Number(j.latitude), lng: Number(j.longitude), ts: Date.now() }
      try { localStorage.setItem(COORDS_KEY, JSON.stringify(coords)) } catch (e) {}
      return coords
    }
  } catch (e) {
    // ignore
  }

  return null
}

export async function applyAutoTheme(): Promise<'dark' | 'light' | null> {
  try {
    const coords = await getCoords()
    if (!coords) return null
    const now = new Date()
    const times = SunCalc.getTimes(now, coords.lat, coords.lng)
    const isDay = now >= times.sunrise && now < times.sunset
    const theme = isDay ? 'light' : 'dark'
    setHtmlTheme(theme)
    return theme
  } catch (e) {
    return null
  }
}

// Try to request browser geolocation (more accurate). Stores coords on success.
export function requestBrowserGeolocation(timeout = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return resolve(false)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now() }
          try { localStorage.setItem(COORDS_KEY, JSON.stringify(coords)) } catch (e) {}
          resolve(true)
        },
        () => resolve(false),
        { maximumAge: 0, timeout }
      )
    } catch (e) { resolve(false) }
  })
}

export function initTheme() {
  const stored = getStoredTheme()
  if (stored === 'dark' || stored === 'light') {
    setHtmlTheme(stored)
  } else {
    // default to system preference to avoid flash
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    setHtmlTheme(prefersDark ? 'dark' : 'light')
  }

  if (stored === 'auto') {
    void applyAutoTheme()
  }

  return stored
}

export function toggleTheme() {
  const cur = (document.documentElement.getAttribute('data-theme') || 'dark') as 'dark' | 'light'
  const next = cur === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

export default { initTheme, getStoredTheme, setTheme, toggleTheme, setAutoMode, applyAutoTheme }
