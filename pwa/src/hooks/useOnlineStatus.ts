import { useState, useEffect } from 'react'
import { checkSupabaseConnection } from '../services/syncManager'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isConnecting, setIsConnecting] = useState(false)

  const checkConnection = async () => {
    setIsConnecting(true)
    try {
      const supabaseOnline = await checkSupabaseConnection()
      setIsOnline(supabaseOnline)
    } catch (e) {
      setIsOnline(false)
    } finally {
      setIsConnecting(false)
    }
  }

  useEffect(() => {
    const handleOnline = () => {
      checkConnection()
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsConnecting(false)
    }

    // Verificar conexión inicial
    checkConnection()

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Verificar conexión periódicamente cada 30 segundos
    const interval = setInterval(checkConnection, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  return { isOnline, isConnecting }
}