import React from 'react'
import { CompanyInfo, loadCompanies, saveCompanies } from '../services/storage'
import { showToast } from '../services/toast'
import { softDeleteCompany } from '../services/supabase'
import { smartAddCompany, smartUpdateCompany } from '../services/smartCompanies'
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
      console.log('💾 Starting save operation...')
      if (isEditing) {
        console.log('📝 Editing existing company')
        await smartUpdateCompany(form.id, form.code, form.name)
        showToast('Empresa actualizada', 'success')
      } else {
        console.log('➕ Adding new company')
        await smartAddCompany(form.id, form.code, form.name)
        showToast('Empresa agregada', 'success')
      }

      // Pequeño delay para asegurar que Supabase procese el cambio
      console.log('⏳ Waiting for Supabase to process...')
      await new Promise(resolve => setTimeout(resolve, 500))

      console.log('✅ Save operation completed, closing modal')
      onClose()
    } catch (err) {
      console.error('❌ Error saving company:', err)
      showToast('Error guardando empresa', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="glass-card max-w-xs w-full p-4 z-10 text-white relative">
        <h3 className="text-lg font-semibold mb-4">{isEditing ? 'Editar Empresa' : 'Agregar Empresa'}</h3>
        <div className="grid grid-cols-1 gap-3 mb-4">
          <label className="text-sm">
            ID (ej: EEGSA)
            <input value={form.id} onChange={e=>updateForm('id', e.target.value)} className="w-full bg-white/10 text-white px-3 py-2 rounded mt-1 text-sm border border-white/20" disabled={isEditing} />
          </label>
          <label className="text-sm">
            Nombre
            <input value={form.name} onChange={e=>updateForm('name', e.target.value)} className="w-full bg-white/10 text-white px-3 py-2 rounded mt-1 text-sm border border-white/20" />
          </label>
          <label className="text-sm">
            Código (obligatorio)
            <input value={form.code} onChange={e=>updateForm('code', e.target.value)} className="w-full bg-white/10 text-white px-3 py-2 rounded mt-1 text-sm border border-white/20" />
          </label>
        </div>
        <div className="flex justify-end gap-3">
          <button className="glass-button px-4 py-2 flex items-center gap-2 text-sm" title="Cancelar" aria-label="Cancelar" onClick={onClose}><X size={14} /><span className="hidden md:inline">Cancelar</span></button>
          <button className="glass-button px-4 py-2 bg-green-600 text-white flex items-center gap-2 text-sm" title="Guardar" aria-label="Guardar" onClick={handleSave}><Save size={14} /><span className="hidden md:inline">Guardar</span></button>
        </div>
      </div>
    </div>
  )
}
