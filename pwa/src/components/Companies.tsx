import React, { useEffect, useState } from 'react'
import { getCompaniesList } from '../services/supabase'
import { loadCompanies as loadCompaniesFromStorage, type CompanyInfo } from '../services/storage'
import CompaniesModal from './CompaniesModal'
import { showToast } from '../services/toast'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { PlusCircle, Edit2, RefreshCw } from 'lucide-react'

type Company = CompanyInfo

export default function Companies({ onNavigate }: { onNavigate: (view: string) => void }){
  const [companies, setCompanies] = useState<Company[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const { isOnline, isConnecting } = useOnlineStatus()

  useEffect(() => {
    loadCompaniesData()
  }, [])

  async function loadCompaniesData(){
    try {
      console.log('🔄 Loading companies from localStorage + Supabase...')

      // Cargar desde localStorage primero (datos más recientes disponibles)
      const localData = loadCompaniesFromStorage()
      console.log('💾 Local data loaded:', localData.length, 'companies')

      // Si estamos online, intentar sincronizar con Supabase
      if (isOnline && !isConnecting) {
        try {
          const supabaseData = await getCompaniesList()
          console.log('☁️ Supabase data loaded:', supabaseData.length, 'companies')

          // Crear mapa para merge inteligente usando timestamps
          const mergedMap = new Map<string, Company>()

          // Agregar datos de localStorage
          localData.forEach((company: Company) => {
            if (company.code && company.id) {
              const key = `${company.id}|${company.code}`
              mergedMap.set(key, company)
            }
          })

          // Merge con datos de Supabase (Supabase tiene prioridad si es más reciente o si no existe localmente)
          supabaseData.forEach((company: Company) => {
            if (company.code && company.id) {
              const key = `${company.id}|${company.code}`
              const localCompany = mergedMap.get(key)

              if (!localCompany) {
                // No existe localmente, agregar de Supabase
                mergedMap.set(key, company)
              } else {
                // Existe localmente, comparar timestamps si están disponibles
                const supabaseUpdated = company.updated_at ? new Date(company.updated_at) : new Date(0)
                const localUpdated = localCompany.updated_at ? new Date(localCompany.updated_at) : new Date(0)

                if (supabaseUpdated > localUpdated) {
                  // Supabase es más reciente, usar versión de Supabase
                  mergedMap.set(key, company)
                }
                // Si local es más reciente o igual, mantener local
              }
            }
          })

          // Convertir a array y filtrar no eliminados
          const mergedData = Array.from(mergedMap.values()).filter(c => !c.deleted_at)
          console.log('🔄 Merged data:', mergedData.length, 'companies')
          setCompanies(mergedData)
          console.log('📋 Companies loaded from Supabase + localStorage:', mergedData.length, 'companies')

        } catch (syncError) {
          console.warn('⚠️ Error syncing with Supabase, using local data only:', syncError)
          // En caso de error de sincronización, usar solo datos locales
          const filteredLocal = localData.filter(c => !c.deleted_at)
          setCompanies(filteredLocal)
          console.log('📋 Companies loaded from localStorage only:', filteredLocal.length, 'companies')
        }
      } else {
        // Offline: usar solo datos locales
        console.log('📱 Offline mode: using local data only')
        const filteredLocal = localData.filter(c => !c.deleted_at)
        setCompanies(filteredLocal)
        console.log('📋 Companies loaded from localStorage only:', filteredLocal.length, 'companies')
      }
    } catch (err) {
      console.error('❌ Error loading companies:', err)
      showToast('Error cargando compañías', 'error')
      // En caso de error total, intentar cargar solo desde localStorage
      try {
        const localFallback = loadCompaniesFromStorage().filter(c => !c.deleted_at)
        setCompanies(localFallback)
        console.log('📋 Companies loaded from localStorage fallback:', localFallback.length, 'companies')
      } catch (fallbackError) {
        console.error('❌ Even localStorage failed:', fallbackError)
        setCompanies([])
      }
    }
  }

  function handleAdd(){
    setEditingCompany(null)
    setShowModal(true)
  }

  function handleEdit(company: Company){
    setEditingCompany(company)
    setShowModal(true)
  }

  function handleModalClose(){
    setShowModal(false)
    setEditingCompany(null)
    loadCompaniesData() // reload after save
  }

  return (
    <section>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Compañías</h2>
          <div className="text-xs text-gray-400">
            Estado: {isConnecting ? '🔄 Conectando...' : isOnline ? '🟢 Online' : '🔴 Offline'} | 
            Total: {companies.length} compañías
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="glass-button p-2 flex items-center gap-2"
            title="Recargar compañías"
            aria-label="Recargar compañías"
            onClick={() => loadCompaniesData()}
          >
            <RefreshCw size={14} />
            <span className="hidden md:inline">Recargar</span>
          </button>
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