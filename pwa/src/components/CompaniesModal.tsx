import React from 'react'
import { CompanyInfo, loadCompanies, saveCompanies } from '../services/storage'
import { showToast } from '../services/toast'
import { Edit, PlusCircle, Save, X, Trash2 } from 'lucide-react'

type Props = {
  open: boolean,
  onClose: ()=>void
}

export default function CompaniesModal({ open, onClose }: Props){
  const [list, setList] = React.useState<CompanyInfo[]>(() => loadCompanies())
  const [form, setForm] = React.useState<CompanyInfo>({ id: '', name: '', code: '' })
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)

  React.useEffect(()=>{ setList(loadCompanies()) }, [open])

  if (!open) return null

  function updateForm(k: keyof CompanyInfo, v: string){ setForm(prev => ({ ...prev, [k]: v })) }

  function handleAddOrUpdate(){
    if (!form.id || !form.name || !form.code){ try{ showToast('Completa ID, nombre y código (obligatorio)', 'error') }catch(e){}; return }
    const copy = [...list]
    if (editingIndex === null){
      // prevent duplicate id
      if (copy.find(c=>c.id === form.id)){ try{ showToast('ID ya existe', 'error') }catch(e){}; return }
      copy.push(form)
      setList(copy)
      saveCompanies(copy)
      setForm({ id: '', name: '', code: '' })
      try{ showToast('Empresa agregada', 'success') }catch(e){}
      return
    }
    // update
    copy[editingIndex] = form
    setList(copy)
    saveCompanies(copy)
    setEditingIndex(null)
    setForm({ id: '', name: '', code: '' })
    try{ showToast('Empresa actualizada', 'success') }catch(e){}
  }

  function handleEdit(i:number){ setEditingIndex(i); setForm(list[i]) }
  function handleDelete(i:number){
    const copy = [...list]
    const removed = copy.splice(i,1)
    setList(copy)
    saveCompanies(copy)
    try{ showToast('Empresa eliminada', 'info') }catch(e){}
    if (editingIndex === i){ setEditingIndex(null); setForm({ id: '', name: '', code: '' }) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="glass-card max-w-md sm:max-w-lg w-full p-6 z-10 text-white">
        <h3 className="text-lg font-semibold mb-3">Maestro: Empresas de energía</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <label className="text-sm">ID (ej: EEGSA)
            <input value={form.id} onChange={e=>updateForm('id', e.target.value)} className="w-full bg-white/5 text-white px-2 py-2 rounded mt-1" disabled={editingIndex!==null} />
          </label>
          <label className="text-sm">Nombre
            <input value={form.name} onChange={e=>updateForm('name', e.target.value)} className="w-full bg-white/5 text-white px-2 py-2 rounded mt-1" />
          </label>
          <label className="text-sm col-span-1 sm:col-span-2">Código (obligatorio)
            <input value={form.code} onChange={e=>updateForm('code', e.target.value)} className="w-full bg-white/5 text-white px-2 py-2 rounded mt-1" />
          </label>
        </div>
        <div className="flex justify-end gap-2 mb-4">
          <button className="glass-button p-2 flex items-center gap-2" title="Limpiar" aria-label="Limpiar" onClick={()=>{ setForm({ id: '', name: '', code: '' }); setEditingIndex(null) }}><X size={14} /><span className="hidden md:inline">Limpiar</span></button>
          <button className="glass-button p-2 bg-green-600 text-white flex items-center gap-2" title={editingIndex===null? 'Agregar empresa':'Actualizar empresa'} aria-label={editingIndex===null? 'Agregar empresa':'Actualizar empresa'} onClick={handleAddOrUpdate}><Save size={14} /><span className="hidden md:inline">{editingIndex===null ? 'Agregar' : 'Actualizar'}</span></button>
        </div>

        <div className="overflow-auto max-h-64">
          {list.length===0 ? (
            <div className="text-sm text-gray-400">No hay empresas registradas.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-300">
                  <th className="p-2">ID</th>
                  <th className="p-2">Nombre</th>
                  <th className="p-2">Código</th>
                  <th className="p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c,i)=> (
                  <tr key={c.id} className="border-t border-white/5">
                    <td className="p-2 align-top">{c.id}</td>
                    <td className="p-2 align-top">{c.name}</td>
                    <td className="p-2 align-top">{c.code||'-'}</td>
                    <td className="p-2 align-top">
                      <div className="flex gap-2">
                        <button title="Editar" className="glass-button px-2 py-1" onClick={()=>handleEdit(i)}><Edit size={14} /></button>
                        <button className="glass-button px-2 py-1 bg-red-600 text-white" title="Eliminar" aria-label={`Eliminar ${c.id}`} onClick={()=>handleDelete(i)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button className="glass-button p-2 flex items-center gap-2" title="Cerrar" aria-label="Cerrar" onClick={onClose}><X size={14} /><span className="hidden md:inline">Cerrar</span></button>
        </div>
      </div>
    </div>
  )
}
