import React from 'react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

interface ConnectionIndicatorProps {
  isOnline: boolean
  isConnecting?: boolean
  className?: string
}

export function ConnectionIndicator({ isOnline, isConnecting = false, className = '' }: ConnectionIndicatorProps) {
  const getStatusInfo = () => {
    if (isConnecting) {
      return {
        icon: <Loader2 size={14} className="animate-spin" />,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500',
        text: 'Conectando...',
        description: 'Verificando conexión con Supabase'
      }
    }

    if (isOnline) {
      return {
        icon: <Wifi size={14} />,
        color: 'text-green-400',
        bgColor: 'bg-green-500',
        text: 'Online',
        description: 'Cambios en vivo'
      }
    }

    return {
      icon: <WifiOff size={14} />,
      color: 'text-red-400',
      bgColor: 'bg-red-500',
      text: 'Offline',
      description: 'Cambios locales'
    }
  }

  const status = getStatusInfo()

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20 border border-white/10 ${className}`}>
      <div className={`w-2.5 h-2.5 rounded-full ${status.bgColor} flex items-center justify-center`}>
        {status.icon}
      </div>
      <div className="flex flex-col">
        <span className={`text-xs font-medium ${status.color}`}>
          {status.text}
        </span>
        <span className="text-xs text-gray-400 hidden sm:block">
          {status.description}
        </span>
      </div>
    </div>
  )
}