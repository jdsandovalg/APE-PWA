import React from 'react'
import { CompanyInfo, loadCompanies, saveCompanies } from '../services/storage'
import { showToast } from '../services/toast'
import { softDeleteCompany, addCompany, updateCompany } from '../services/supabase'
import { Edit, PlusCircle, Save, X, Trash2 } from 'lucide-react'

type Props = {
  open: boolean,
  onClose: ()=>void,
  initial?: CompanyInfo
}

export default function CompaniesModal({ open, onClose, initial }: Props){
  const [form, setForm] = React.useState<CompanyInfo>({ id: '', name: '', code: '' })
  const [isEditing, setIsEditing] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      if (initial) {
        setForm(initial)
        setIsEditing(true)
      } else {
        setForm({ id: '', name: '', code: '' })
        setIsEditing(false)
      }
    }
  }, [open, initial])

  if (!open) return null

  function updateForm(k: keyof CompanyInfo, v: string){ setForm(prev => ({ ...prev, [k]: v })) }

  async function handleSave(){
    if (!form.id || !form.name || !form.code){ showToast('Completa ID, nombre y código (obligatorio)', 'error'); return }
    try {
      if (isEditing) {
        await updateCompany(form.id, form.code, form.name)
        showToast('Empresa actualizada', 'success')
      } else {
        await addCompany(form.id, form.code, form.name)
        showToast('Empresa agregada', 'success')
      }
      onClose()
    } catch (err) {
      console.error('Error saving company:', err)
      showToast('Error guardando empresa', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="glass-card max-w-md w-full p-4 z-10 text-white">
        <h3 className="text-base font-semibold mb-2">{isEditing ? 'Editar Empresa' : 'Agregar Empresa'}</h3>
        <div className="grid grid-cols-1 gap-2 mb-3">
          <label className="text-xs">ID (ej: EEGSA)
            <input value={form.id} onChange={e=>updateForm('id', e.target.value)} className="w-full bg-white/5 text-white px-1 py-1 rounded mt-1 text-sm" disabled={isEditing} />
          </label>
          <label className="text-xs">Nombre
            <input value={form.name} onChange={e=>updateForm('name', e.target.value)} className="w-full bg-white/5 text-white px-1 py-1 rounded mt-1 text-sm" />
          </label>
          <label className="text-xs">Código (obligatorio)
            <input value={form.code} onChange={e=>updateForm('code', e.target.value)} className="w-full bg-white/5 text-white px-1 py-1 rounded mt-1 text-sm" />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button className="glass-button p-1 flex items-center gap-2 text-sm" title="Cancelar" aria-label="Cancelar" onClick={onClose}><X size={12} /><span className="hidden md:inline">Cancelar</span></button>
          <button className="glass-button p-1 bg-green-600 text-white flex items-center gap-2 text-sm" title="Guardar" aria-label="Guardar" onClick={handleSave}><Save size={12} /><span className="hidden md:inline">Guardar</span></button>
        </div>
      </div>
    </div>
  )
}
