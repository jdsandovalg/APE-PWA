import React, { useEffect, useState } from 'react'
import { loadMeters, loadCurrentMeterId, saveCurrentMeterId } from '../services/storage'
import MeterModal from './MeterModal'
import { showToast } from '../services/toast'
import { PlusCircle, Edit2, Star, FileText } from 'lucide-react'
import { exportMeterPDF } from '../utils/pdfExport'

type MeterInfo = {
  contador: string
  correlativo: string
  propietaria: string
  nit: string
  distribuidora: string
  tipo_servicio: string
  sistema: string
}

export default function Meters({ onNavigate }: { onNavigate: (view: string) => void }){
  const [meters, setMeters] = useState<Record<string, MeterInfo>>(() => loadMeters())
  const [currentMeterId, setCurrentMeterId] = useState<string>(() => loadCurrentMeterId())
  const [showModal, setShowModal] = useState(false)
  const [editingMeter, setEditingMeter] = useState<MeterInfo | null>(null)

  useEffect(() => {
    setMeters(loadMeters())
    setCurrentMeterId(loadCurrentMeterId())
  }, [])

  function handleAdd(){
    setEditingMeter(null)
    setShowModal(true)
  }

  function handleEdit(meter: MeterInfo){
    setEditingMeter(meter)
    setShowModal(true)
  }

  function handleSetCurrent(meterId: string){
    saveCurrentMeterId(meterId)
    setCurrentMeterId(meterId)
    showToast(`Medidor actual: ${meterId}`, 'success')
  }

  function handleModalClose(){
    setShowModal(false)
    setEditingMeter(null)
    setMeters(loadMeters())
    setCurrentMeterId(loadCurrentMeterId())
  }

  function handleSave(meter: MeterInfo){
    const mm = loadMeters()
    const creating = !(editingMeter && editingMeter.contador)
    if (creating){
      // enforce PK must not already exist
      if (mm[meter.contador]){ showToast('El contador ya existe', 'error'); return }
      mm[meter.contador] = meter
      // set as current if first
      if (Object.keys(mm).length === 1) saveCurrentMeterId(meter.contador)
    } else {
      // update non-PK fields only
      const curId = loadCurrentMeterId()
      const existing = mm[curId] || {}
      const updated = { ...existing, propietaria: meter.propietaria, nit: meter.nit, distribuidora: meter.distribuidora, tipo_servicio: meter.tipo_servicio, sistema: meter.sistema }
      mm[curId] = updated
    }
    // save
    const { saveMeters } = require('../services/storage')
    saveMeters(mm)
    setMeters(mm)
    setCurrentMeterId(loadCurrentMeterId())
    showToast(creating ? 'Medidor creado' : 'Información actualizada', 'success')
    setShowModal(false)
    setEditingMeter(null)
  }

  const metersList = Object.values(meters)

  return (
    <section>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Medidores</h2>
        <button className="glass-button p-2 flex items-center gap-2" title="Agregar medidor" aria-label="Agregar medidor" onClick={handleAdd}>
          <PlusCircle size={14} />
          <span className="hidden md:inline">Agregar</span>
        </button>
      </div>

      <div className="space-y-2">
        {metersList.map((meter) => (
          <div key={meter.contador} className="glass-card p-4 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                {meter.contador}
                {meter.contador === currentMeterId && <Star size={14} className="text-yellow-400" />}
              </h3>
              <p className="text-xs text-gray-400">Correlativo: {meter.correlativo} | Propietaria: {meter.propietaria}</p>
              <p className="text-xs text-gray-400">Distribuidora: {meter.distribuidora} | Tipo: {meter.tipo_servicio}</p>
            </div>
            <div className="flex gap-2">
              {meter.contador !== currentMeterId && (
                <button 
                  className="glass-button p-2" 
                  title="Establecer como actual" 
                  aria-label={`Establecer ${meter.contador} como actual`} 
                  onClick={() => handleSetCurrent(meter.contador)}
                >
                  <Star size={14} />
                </button>
              )}
              {meter.contador === currentMeterId && (
                <button 
                  className="glass-button p-2 opacity-50 cursor-not-allowed" 
                  title="Exportar PDF (deshabilitado)" 
                  aria-label="Exportar PDF (deshabilitado)" 
                  disabled
                >
                  <FileText size={14} />
                </button>
              )}
              <button 
                className="glass-button p-2" 
                title="Editar medidor" 
                aria-label={`Editar ${meter.contador}`} 
                onClick={() => handleEdit(meter)}
              >
                <Edit2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {metersList.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No hay medidores registrados. Haz clic en "Agregar" para crear uno.
          </div>
        )}
      </div>

      {showModal && (
        <MeterModal 
          open={showModal} 
          initial={editingMeter || { contador: '', correlativo: '', propietaria: '', nit: '', distribuidora: 'EEGSA', tipo_servicio: '', sistema: '' }}
          readOnlyPK={!!editingMeter}
          onClose={handleModalClose} 
          onSave={handleSave}
        />
      )}
    </section>
  )
}