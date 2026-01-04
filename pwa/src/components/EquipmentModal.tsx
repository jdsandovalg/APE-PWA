import React, { Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Combobox, Transition, Switch, Listbox } from '@headlessui/react'
import { X, Save, Zap, Settings, Calendar, Info, Check, ChevronsUpDown, Plus, ArrowLeft, Edit2, Trash2 } from 'lucide-react'
import { getEquipmentTypes, createEquipmentType, updateEquipmentType, deleteEquipmentType, type EquipmentType, type GroupedEquipmentTypes, type MeterEquipment } from '../services/equipmentService'
import { showToast } from '../services/toast'

interface EquipmentModalProps {
  open: boolean
  onClose: () => void
  onSave: (equipment: Partial<MeterEquipment>) => Promise<void>
  initial?: Partial<MeterEquipment> | null
  meterId: string
}

const LOAD_CATEGORIES = [
  { id: 'MIXED', label: 'Mixta (Uso general)' },
  { id: 'CRITICAL', label: 'Crítica (24/7)' },
  { id: 'PROGRAMMABLE', label: 'Programable (Horario)' },
  { id: 'NOCTURNAL', label: 'Nocturna' }
]

export default function EquipmentModal({ open, onClose, onSave, initial, meterId }: EquipmentModalProps) {
  const [loading, setLoading] = React.useState(false)
  const [types, setTypes] = React.useState<GroupedEquipmentTypes>({})
  const [loadingTypes, setLoadingTypes] = React.useState(true)
  const [query, setQuery] = React.useState('')
  
  // View management inside the modal
  const [viewMode, setViewMode] = React.useState<'main' | 'manageTypes' | 'editType'>('main')
  const [allTypes, setAllTypes] = React.useState<EquipmentType[]>([])
  const [editingType, setEditingType] = React.useState<EquipmentType | null>(null)
  
  // Form State
  const [formData, setFormData] = React.useState<Partial<MeterEquipment>>({
    meter_id: meterId,
    power_watts: 0,
    estimated_daily_hours: 0,
    is_future: false,
    start_date: new Date().toISOString().split('T')[0],
    ...initial
  })

  // New Type Form State
  const [newTypeData, setNewTypeData] = React.useState({
    name: '',
    load_category: 'MIXED',
    description: ''
  })

  // Load types on mount
  React.useEffect(() => {
    if (open) {
      loadTypes()
      // Reset or set initial data
      setFormData({
        meter_id: meterId,
        power_watts: 0,
        estimated_daily_hours: 0,
        is_future: false,
        start_date: new Date().toISOString().split('T')[0],
        ...initial
      })
      setViewMode('main')
    }
  }, [open, initial, meterId])

  async function loadTypes() {
    try {
      setLoadingTypes(true)
      const data = await getEquipmentTypes(true) as GroupedEquipmentTypes
      setTypes(data)
    } catch (error) {
      console.error('Error loading types:', error)
      showToast('Error cargando tipos de equipo', 'error')
    } finally {
      setLoadingTypes(false)
    }
  }

  // Load all types when switching to manage view
  React.useEffect(() => {
    async function loadAllTypesForManagement() {
      if (viewMode === 'manageTypes') {
        try {
          setLoadingTypes(true) // reuse loading state
          const data = await getEquipmentTypes(false) as EquipmentType[]
          setAllTypes(data)
        } catch (error) { showToast('Error cargando lista de tipos', 'error') } 
        finally { setLoadingTypes(false) }
      }
    }
    loadAllTypesForManagement()
  }, [viewMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.equipment_type_id) {
      showToast('Selecciona un tipo de equipo', 'error')
      return
    }
    if (!formData.equipment_name) {
      showToast('Ingresa un nombre para el equipo', 'error')
      return
    }
    if ((formData.power_watts || 0) <= 0) {
      showToast('La potencia debe ser mayor a 0', 'error')
      return
    }
    if ((formData.estimated_daily_hours || 0) < 0 || (formData.estimated_daily_hours || 0) > 24) {
      showToast('Las horas diarias deben estar entre 0 y 24', 'error')
      return
    }

    try {
      setLoading(true)
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Error saving equipment:', error)
      showToast('Error guardando el equipo', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTypeData.name) {
      showToast('El nombre es requerido', 'error')
      return
    }

    try {
      setLoading(true)

      if (editingType) {
        // Update existing type
        await updateEquipmentType(editingType.id, {
          name: newTypeData.name,
          load_category: newTypeData.load_category,
          description: newTypeData.description || null
        })
        showToast('Tipo de equipo actualizado', 'success')
      } else {
        // Create new type
        const code = newTypeData.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_')
        const newType = await createEquipmentType({
          code,
          name: newTypeData.name,
          load_category: newTypeData.load_category,
          description: newTypeData.description || null
        })
        handleTypeChange(newType) // Select the new type
        showToast('Tipo de equipo creado', 'success')
      }

      await loadTypes() // Refresh combobox list
      setViewMode('main') // Go back to main form
      setNewTypeData({ name: '', load_category: 'MIXED', description: '' })
      setEditingType(null)
    } catch (error) {
      showToast('Error creando tipo (posible código duplicado)', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteType = async (typeId: string) => {
    if (!confirm('¿Seguro que quieres eliminar este tipo de equipo? Esta acción no se puede deshacer.')) return
    try {
      await deleteEquipmentType(typeId)
      showToast('Tipo de equipo eliminado', 'success')
      // reload the list in manage view
      const data = await getEquipmentTypes(false) as EquipmentType[]
      setAllTypes(data)
      await loadTypes() // also reload the combobox data
    } catch (error: any) {
      showToast(error.message, 'error')
    }
  }

  // Calculate estimated monthly consumption for preview
  const estimatedKwh = React.useMemo(() => {
    const watts = Number(formData.power_watts || 0)
    const hours = Number(formData.estimated_daily_hours || 0)
    return (watts / 1000) * hours * 30
  }, [formData.power_watts, formData.estimated_daily_hours])

  // Derived state for Combobox
  const selectedType = React.useMemo(() => {
    if (!formData.equipment_type_id) return null
    let selectedType: EquipmentType | undefined
    Object.values(types).forEach(group => {
      const found = group.find(t => t.id === formData.equipment_type_id)
      if (found) selectedType = found
    })
    return selectedType || null
  }, [formData.equipment_type_id, types])

  const handleTypeChange = (type: EquipmentType) => {
    setFormData(prev => ({
      ...prev,
      equipment_type_id: type.id,
      // Auto-fill name if it's empty or looks like a default name
      equipment_name: (!prev.equipment_name || prev.equipment_name === '') 
        ? type.name 
        : prev.equipment_name
    }))
  }

  const filteredTypes = query === ''
    ? types
    : Object.entries(types).reduce((acc, [category, items]) => {
        const filtered = items.filter((type) =>
          type.name.toLowerCase().replace(/\s+/g, '').includes(query.toLowerCase().replace(/\s+/g, ''))
        )
        if (filtered.length > 0) {
          acc[category] = filtered
        }
        return acc
      }, {} as GroupedEquipmentTypes)

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 w-full max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="glass-card w-full max-w-md overflow-hidden relative z-10 flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                {viewMode === 'main' && <Zap className="text-yellow-400" size={20} />}
                {viewMode !== 'main' && <Settings className="text-green-400" size={20} />}
                {viewMode === 'main' ? (initial?.id ? 'Editar Equipo' : 'Nuevo Equipo') : viewMode === 'manageTypes' ? 'Gestionar Tipos de Equipo' : editingType ? 'Editar Tipo' : 'Nuevo Tipo'}
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
              {loadingTypes ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div></div>
              ) : viewMode === 'editType' ? (
                // ==================== CREATE/EDIT TYPE FORM ====================
                <form id="create-type-form" onSubmit={handleSaveType} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nombre del Tipo</label>
                    <input
                      type="text"
                      autoFocus
                      value={newTypeData.name}
                      onChange={e => setNewTypeData({...newTypeData, name: e.target.value})}
                      placeholder="Ej. Calefactor de Patio"
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-400/50"
                    />
                    {!editingType && (
                      <p className="text-[10px] text-gray-500 mt-1">Se generará el código automáticamente.</p>
                    )}
                  </div>
                  <div>
                  <label className="block text-xs text-gray-400 mb-1">Categoría de Carga</label>
                    <Listbox value={newTypeData.load_category} onChange={(value) => setNewTypeData({...newTypeData, load_category: value})}>
                      <div className="relative mt-1">
                        <Listbox.Button className="relative w-full cursor-default rounded-lg bg-black/20 py-2 pl-3 pr-10 text-left border border-white/10 focus:outline-none focus-visible:border-green-400/50 sm:text-sm h-[38px]">
                          <span className="block truncate">{LOAD_CATEGORIES.find(c => c.id === newTypeData.load_category)?.label}</span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronsUpDown
                              className="h-5 w-5 text-gray-400"
                              aria-hidden="true"
                            />
                          </span>
                        </Listbox.Button>
                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-[#1a1a1a] py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm border border-white/10 z-30">
                            {LOAD_CATEGORIES.map((category) => (
                              <Listbox.Option
                                key={category.id}
                                className={({ active }) =>
                                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                    active ? 'bg-green-500/20 text-green-100' : 'text-gray-300'
                                  }`
                                }
                                value={category.id}
                              >
                                {({ selected }) => (
                                  <>
                                    <span
                                      className={`block truncate ${
                                        selected ? 'font-medium text-green-400' : 'font-normal'
                                      }`}
                                    >
                                      {category.label}
                                    </span>
                                    {selected ? (
                                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-green-500">
                                        <Check className="h-4 w-4" aria-hidden="true" />
                                      </span>
                                    ) : null}
                                  </>
                                )}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Descripción (Opcional)</label>
                    <textarea
                      rows={3}
                      value={newTypeData.description}
                      onChange={e => setNewTypeData({...newTypeData, description: e.target.value})}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-400/50 text-sm"
                    />
                  </div>
                </form>
              ) : viewMode === 'manageTypes' ? (
                // ==================== MANAGE TYPES LIST ====================
                <div className="space-y-2">
                  {allTypes.map(type => (
                    <div key={type.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                      <div>
                        <p className="text-sm text-white">{type.name}</p>
                        <p className="text-xs text-gray-400">{type.load_category} - <span className="font-mono text-gray-500">{type.code}</span></p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditingType(type); setNewTypeData(type); setViewMode('editType'); }} className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white"><Edit2 size={14} /></button>
                        <button onClick={() => handleDeleteType(type.id)} className="p-2 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                  {allTypes.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No hay tipos de equipo.</p>
                  )}
                </div>
              ) : (
                // ==================== MAIN EQUIPMENT FORM ====================
                <form id="equipment-form" onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Type Selector */}
                  <div className="relative z-20 flex gap-1 items-end">
                    <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Tipo de Equipo</label>
                    <Combobox value={selectedType} onChange={handleTypeChange}>
                      <div className="relative mt-1">
                        <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-black/20 text-left border border-white/10 focus-within:border-yellow-400/50 sm:text-sm">
                          <Combobox.Input
                            className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-white bg-transparent focus:ring-0 focus:outline-none"
                            displayValue={(type: EquipmentType) => type?.name}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar tipo..."
                          />
                          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronsUpDown
                              className="h-5 w-5 text-gray-400"
                              aria-hidden="true"
                            />
                          </Combobox.Button>
                        </div>
                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                          afterLeave={() => setQuery('')}
                        >
                          <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-[#1a1a1a] py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm border border-white/10">
                            {Object.keys(filteredTypes).length === 0 && query !== '' ? (
                              <div className="relative cursor-default select-none py-2 px-4 text-gray-400">
                                No se encontraron resultados.
                              </div>
                            ) : (
                              Object.entries(filteredTypes).map(([category, items]) => (
                                <React.Fragment key={category}>
                                  <div className="relative cursor-default select-none py-1 px-3 text-xs font-semibold text-gray-500 bg-white/5 uppercase tracking-wider">
                                    {category}
                                  </div>
                                  {items.map((type) => (
                                    <Combobox.Option
                                      key={type.id}
                                      className={({ active }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                          active ? 'bg-yellow-500/20 text-yellow-100' : 'text-gray-300'
                                        }`
                                      }
                                      value={type}
                                    >
                                      {({ selected, active }) => (
                                        <>
                                          <span className={`block truncate ${selected ? 'font-medium text-yellow-400' : 'font-normal'}`}>
                                            {type.name}
                                          </span>
                                          {selected ? (
                                            <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-yellow-400' : 'text-yellow-500'}`}>
                                              <Check className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                          ) : null}
                                        </>
                                      )}
                                    </Combobox.Option>
                                  ))}
                                </React.Fragment>
                              ))
                            )}
                          </Combobox.Options>
                        </Transition>
                      </div>
                    </Combobox>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setEditingType(null); setNewTypeData({ name: '', load_category: 'MIXED', description: '' }); setViewMode('editType'); }}
                      className="h-[38px] w-[38px] flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white transition-colors mb-[1px]"
                      title="Crear nuevo tipo de equipo"
                    >
                      <Plus size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('manageTypes')}
                      className="h-[38px] w-[38px] flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white transition-colors mb-[1px]"
                      title="Gestionar tipos de equipo"
                    >
                      <Settings size={16} />
                    </button>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nombre Identificador</label>
                    <input
                      type="text"
                      value={formData.equipment_name || ''}
                      onChange={e => setFormData({...formData, equipment_name: e.target.value})}
                      placeholder="Ej. Aire Sala Principal"
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400/50"
                    />
                  </div>

                  {/* Power, Hours & Estimate */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Potencia (W)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.power_watts || ''}
                          onChange={e => setFormData({...formData, power_watts: parseFloat(e.target.value)})}
                          className="w-full bg-black/20 border border-white/10 rounded-lg pl-2 pr-6 py-2 text-white focus:outline-none focus:border-yellow-400/50 text-sm"
                        />
                        <span className="absolute right-2 top-2.5 text-xs text-gray-500">W</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Uso (h/día)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.1"
                          value={formData.estimated_daily_hours || ''}
                          onChange={e => setFormData({...formData, estimated_daily_hours: parseFloat(e.target.value)})}
                          className="w-full bg-black/20 border border-white/10 rounded-lg pl-2 pr-6 py-2 text-white focus:outline-none focus:border-yellow-400/50 text-sm"
                        />
                        <span className="absolute right-2 top-2.5 text-xs text-gray-500">h</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Mensual (Est.)</label>
                      <div className="w-full bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2 py-2 text-yellow-400 font-bold text-right text-sm h-[38px] flex items-center justify-end">
                        {estimatedKwh.toFixed(1)} <span className="text-[10px] font-normal text-yellow-500/70 ml-1">kWh</span>
                      </div>
                    </div>
                  </div>

                  {/* Dates & Future */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Inicio</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.start_date ? formData.start_date.split('T')[0] : ''}
                          onChange={e => setFormData({...formData, start_date: e.target.value})}
                          onClick={(e) => e.currentTarget.showPicker?.()}
                          className="w-full bg-black/20 border border-white/10 rounded-lg pl-2 pr-6 py-2 text-white focus:outline-none focus:border-yellow-400/50 text-sm appearance-none relative z-10"
                          style={{ colorScheme: 'dark' }}
                        />
                        <Calendar className="absolute right-2 top-2.5 text-gray-400 pointer-events-none z-0" size={16} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Fin (Opcional)</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.end_date ? formData.end_date.split('T')[0] : ''}
                          onChange={e => setFormData({...formData, end_date: e.target.value || null})}
                          onClick={(e) => e.currentTarget.showPicker?.()}
                          className="w-full bg-black/20 border border-white/10 rounded-lg pl-2 pr-6 py-2 text-white focus:outline-none focus:border-yellow-400/50 text-sm appearance-none relative z-10"
                          style={{ colorScheme: 'dark' }}
                        />
                        <Calendar className="absolute right-2 top-2.5 text-gray-400 pointer-events-none z-0" size={16} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">¿Proyección?</label>
                      <div className="h-[38px] flex items-center bg-black/20 border border-white/10 rounded-lg px-2">
                        <Switch
                          checked={formData.is_future || false}
                          onChange={(checked: boolean) => setFormData({...formData, is_future: checked})}
                          className={`${
                            formData.is_future ? 'bg-yellow-500' : 'bg-white/10 border border-white/20'
                          } relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500/50 mr-2`}
                        >
                          <span
                            className={`${
                              formData.is_future ? 'translate-x-4' : 'translate-x-1'
                            } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                          />
                        </Switch>
                        <span className="text-xs text-gray-300 cursor-pointer select-none" onClick={() => setFormData({...formData, is_future: !formData.is_future})}>
                          {formData.is_future ? 'Futuro' : 'Actual'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Notas</label>
                    <textarea
                      rows={2}
                      value={formData.notes || ''}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400/50 text-sm"
                    />
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-3">
              {viewMode === 'editType' ? (
                <>
                  <button
                    onClick={() => setViewMode('main')}
                    className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                    disabled={loading}
                  >
                    <ArrowLeft size={14} /> Volver
                  </button>
                  <button
                    type="submit"
                    form="create-type-form"
                    disabled={loading}
                    className="glass-button bg-green-500/20 hover:bg-green-500/30 text-green-200 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {loading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div> : <Save size={16} />}
                    {editingType ? 'Actualizar Tipo' : 'Crear Tipo'}
                  </button>
                </>
              ) : viewMode === 'manageTypes' ? (
                <button
                  onClick={() => setViewMode('main')}
                  className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                  disabled={loading}
                >
                  <ArrowLeft size={14} /> Volver al formulario
                </button>
              ) : (
                <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="equipment-form"
                disabled={loading || loadingTypes}
                className="glass-button bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div> : <Save size={16} />}
                Guardar
              </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}