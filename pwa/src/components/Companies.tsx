import React, { useEffect, useState } from 'react'
import { getAllCompanies, createCompany, updateCompany, deleteCompany, type CompanyRecord } from '../services/supabasePure'
import CompaniesModal from './CompaniesModal'
import { showToast } from '../services/toast'
import { PlusCircle, Edit2 } from 'lucide-react'

export default function Companies({ onNavigate }: { onNavigate: (view: string) => void }){
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState<CompanyRecord | null>(null)

  useEffect(() => {
    loadCompaniesData()
  }, [])

  async function loadCompaniesData(){
    try {
      setLoading(true)
      console.log('🔄 Loading companies from Supabase...')
      const companiesData = await getAllCompanies()
      setCompanies(companiesData)
      console.log('📋 Companies loaded from Supabase:', companiesData.length, 'companies')
    } catch (error) {
      console.error('❌ Error loading companies:', error)
      showToast('Error cargando compañías', 'error')
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }

  function handleAdd(){
    setEditingCompany(null)
    setShowModal(true)
  }

  function handleEdit(company: CompanyRecord){
    setEditingCompany(company)
    setShowModal(true)
  }

  async function handleModalClose(){
    setShowModal(false)
    setEditingCompany(null)
    await loadCompaniesData() // reload after save
  }

  return (
    <section>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Compañías</h2>
          <div className="text-xs text-gray-400">
            Total: {companies.length} compañías
          </div>
        </div>
        <div className="flex gap-2">
          <button className="glass-button p-2 flex items-center gap-2" title="Agregar compañía" aria-label="Agregar compañía" onClick={handleAdd}>
            <PlusCircle size={14} />
            <span className="hidden md:inline">Agregar</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {companies.map((company) => (
          <div key={`${company.id}-${company.code}`} className="glass-card p-4 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium text-white">{company.name}</h3>
              <p className="text-xs text-gray-400">ID: {company.id} | Código: {company.code || 'N/A'}</p>
            </div>
            <button 
              className="glass-button p-2" 
              title="Editar compañía" 
              aria-label={`Editar ${company.name}`} 
              onClick={() => handleEdit(company)}
            >
              <Edit2 size={14} />
            </button>
          </div>
        ))}
        {companies.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No hay compañías registradas. Haz clic en "Agregar" para crear una.
          </div>
        )}
      </div>

      {showModal && (
        <CompaniesModal 
          open={showModal} 
          onClose={handleModalClose} 
          initial={editingCompany ? { id: editingCompany.id, code: editingCompany.code, name: editingCompany.name } : undefined}
        />
      )}
    </section>
  )
}