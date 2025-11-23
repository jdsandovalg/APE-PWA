import React from 'react'
import { X, Check } from 'lucide-react'

type Props = {
  open: boolean,
  title?: string,
  message: string,
  onCancel: ()=>void,
  onConfirm: ()=>void,
  confirmText?: string,
  cancelText?: string
}

export default function ConfirmModal({ open, title, message, onCancel, onConfirm, confirmText='Aceptar', cancelText='Cancelar' }: Props){
  React.useEffect(()=>{
    if (!open) return
    // focus cancel button by default for safe default
    const el = document.getElementById('confirm-cancel-btn')
    if (el) (el as HTMLButtonElement).focus()
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="glass-card max-w-lg w-full p-6 z-10 text-white">
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <div className="text-sm text-gray-300 mb-4">{message}</div>
        <div className="flex justify-end gap-2">
          <button id="confirm-cancel-btn" className="glass-button p-2 flex items-center gap-2" title={cancelText} aria-label={cancelText} onClick={onCancel}><X size={14} /><span className="hidden md:inline">{cancelText}</span></button>
          <button className="glass-button p-2 bg-red-600 text-white flex items-center gap-2" title={confirmText} aria-label={confirmText} onClick={onConfirm}><Check size={14} /><span className="hidden md:inline">{confirmText}</span></button>
        </div>
      </div>
    </div>
  )
}
