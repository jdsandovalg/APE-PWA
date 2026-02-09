import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Zap, Edit2, Trash2, Calendar, Clock } from 'lucide-react'
import { getEquipmentForMeter, createMeterEquipment, updateMeterEquipment, deleteMeterEquipment, type MeterEquipment } from '../services/equipmentService'
import EquipmentModal from './EquipmentModal'
import { showToast } from '../services/toast'

interface EquipmentProps {
  meterId: string
  onBack: () => void
}

export default function Equipment({ meterId, onBack }: EquipmentProps) {
  const [equipment, setEquipment] = React.useState<MeterEquipment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showModal, setShowModal] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<MeterEquipment | null>(null)

  React.useEffect(() => {
    loadData()
  }, [meterId])

  async function loadData() {
    try {
      setLoading(true)
      const data = await getEquipmentForMeter(meterId)
      setEquipment(data)
    } catch (error) {
      console.error('Error loading equipment:', error)
      showToast('Error cargando equipos', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: Partial<MeterEquipment>) => {
    try {
      // IMPORTANTE: Eliminamos campos generados/sistema para evitar errores de Supabase
      const { energy_kwh_month, created_at, updated_at, id, equipment_types, ...cleanData } = data as any

      if (editingItem) {
        // Update
        await updateMeterEquipment(editingItem.id, cleanData)
        showToast('Equipo actualizado', 'success')
      } else {
        // Create
        // Ensure required fields for creation are present (TS check)
        if (!cleanData.equipment_type_id || !cleanData.equipment_name || cleanData.power_watts === undefined || cleanData.estimated_daily_hours === undefined || !cleanData.start_date) {
             throw new Error("Faltan datos requeridos")
        }
        await createMeterEquipment(cleanData)
        showToast('Equipo creado', 'success')
      }
      await loadData()
      setShowModal(false)
      setEditingItem(null)
    } catch (error) {
      console.error('Error saving:', error)
      showToast('Error al guardar', 'error')
      throw error // Re-throw to keep modal open if needed, or handle inside modal
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este equipo?')) return
    try {
      await deleteMeterEquipment(id)
      showToast('Equipo eliminado', 'success')
      await loadData()
    } catch (error) {
      console.error('Error deleting:', error)
      showToast('Error al eliminar', 'error')
    }
  }

  // Calculate totals
  const totalKwh = equipment.reduce((acc, item) => acc + (item.energy_kwh_month || 0), 0)
  const futureKwh = equipment.filter(i => i.is_future).reduce((acc, item) => acc + (item.energy_kwh_month || 0), 0)
  const currentKwh = totalKwh - futureKwh

  return (
    <section className="pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} className="text-gray-300" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">Equipos y Proyecciones</h2>
            <p className="text-xs text-gray-400">Gestión de carga instalada</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowModal(true) }}
          className="glass-button bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-all"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Agregar Equipo</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass-card p-4 rounded-xl">
          <div className="text-xs text-gray-400 mb-1">Consumo Instalado (Actual)</div>
          <div className="text-2xl font-bold text-white">{currentKwh.toFixed(1)} <span className="text-sm font-normal text-gray-400">kWh/mes</span></div>
        </div>
        <div className="glass-card p-4 rounded-xl border-yellow-500/20 bg-yellow-500/5">
          <div className="text-xs text-yellow-200/70 mb-1">Proyección Futura (+Nuevos)</div>
          <div className="text-2xl font-bold text-yellow-100">{totalKwh.toFixed(1)} <span className="text-sm font-normal text-yellow-200/50">kWh/mes</span></div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div></div>
      ) : equipment.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Zap size={48} className="mx-auto mb-4 opacity-20" />
          <p>No hay equipos registrados.</p>
          <button onClick={() => setShowModal(true)} className="text-yellow-400 text-sm mt-2 hover:underline">Agregar el primero</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {equipment.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card p-4 rounded-xl relative group ${item.is_future ? 'border-yellow-500/30 bg-yellow-500/5' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${item.is_future ? 'bg-yellow-500/20 text-yellow-300' : 'bg-white/10 text-gray-300'}`}>
                    <Zap size={18} />
                  </div>
                  <div>
                    <h3 className="font-medium text-white text-sm">{item.equipment_name}</h3>
                    <div className="text-[10px] text-gray-400 flex items-center gap-2">
                      <span>{item.power_watts}W</span>
                      <span>•</span>
                      <span>{item.estimated_daily_hours}h/día</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">{item.energy_kwh_month?.toFixed(1)}</div>
                  <div className="text-[10px] text-gray-500">kWh/mes</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 items-center">
                   {item.is_future && <span className="text-yellow-500/80 bg-yellow-500/10 px-1.5 py-0.5 rounded">Proyección</span>}
                   {!item.is_future && <span className="text-green-500/80 bg-green-500/10 px-1.5 py-0.5 rounded">Instalado</span>}
                   <span className="text-gray-400 flex items-center gap-1 ml-1"><Calendar size={10} /> {item.start_date}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingItem(item); setShowModal(true) }} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <EquipmentModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingItem(null) }}
        onSave={handleSave}
        initial={editingItem}
        meterId={meterId}
      />
    </section>
  )
}