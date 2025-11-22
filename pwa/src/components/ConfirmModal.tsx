import React from 'react'

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
          <button id="confirm-cancel-btn" className="glass-button px-3 py-2" onClick={onCancel}>{cancelText}</button>
          <button className="glass-button px-3 py-2 bg-red-600 text-white" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}
