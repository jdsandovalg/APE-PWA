import React, { useEffect, useState } from 'react'
import { getAllMeters, createMeter, updateMeter, type MeterRecord } from '../services/supabaseBasic'
import MeterModal from './MeterModal'
import { showToast } from '../services/toast'
import { PlusCircle, Edit2, Star, FileText } from 'lucide-react'
import { exportMeterPDF } from '../utils/pdfExport'

export default function Meters({ onNavigate }: { onNavigate: (view: string) => void }){
  const [meters, setMeters] = useState<MeterRecord[]>([])
  const [currentMeterId, setCurrentMeterId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMeter, setEditingMeter] = useState<MeterRecord | null>(null)

  useEffect(() => {
    loadMetersData()
  }, [])

  async function loadMetersData() {
    try {
      setLoading(true)
      const metersData = await getAllMeters()
      setMeters(metersData)

      // Set current meter to first one if available
      if (metersData.length > 0 && !currentMeterId) {
        setCurrentMeterId(metersData[0].contador)
      }
    } catch (error) {
      console.error('Error loading meters:', error)
      showToast('Error al cargar medidores', 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleAdd(){
    setEditingMeter(null)
    setShowModal(true)
  }

  function handleEdit(meter: MeterRecord){
    setEditingMeter(meter)
    setShowModal(true)
  }

  function handleSetCurrent(meterId: string){
    setCurrentMeterId(meterId)
    showToast(`Medidor actual: ${meterId}`, 'success')
  }

  function handleModalClose(){
    setShowModal(false)
    setEditingMeter(null)
    loadMetersData()
  }

  async function handleSave(meterData: any){
    try {
      if (editingMeter) {
        // Update existing meter
        await updateMeter(editingMeter.id, {
          correlativo: meterData.correlativo,
          propietaria: meterData.propietaria,
          nit: meterData.nit,
          distribuidora: meterData.distribuidora,
          tipo_servicio: meterData.tipo_servicio,
          sistema: meterData.sistema
        })
        showToast('Medidor actualizado', 'success')
      } else {
        // Create new meter
        await createMeter({
          contador: meterData.contador,
          correlativo: meterData.correlativo,
          propietaria: meterData.propietaria,
          nit: meterData.nit,
          distribuidora: meterData.distribuidora,
          tipo_servicio: meterData.tipo_servicio,
          sistema: meterData.sistema
        })
        showToast('Medidor creado', 'success')
      }

      setShowModal(false)
      setEditingMeter(null)
      await loadMetersData()
    } catch (error) {
      console.error('Error saving meter:', error)
      showToast('Error al guardar medidor', 'error')
    }
  }

  if (loading) {
    return (
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Medidores</h2>
        </div>
        <div className="text-center text-gray-400 py-8">
          Cargando medidores...
        </div>
      </section>
    )
  }

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
        {meters.map((meter) => (
          <div key={meter.id} className="glass-card p-4 flex justify-between items-center">
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
        {meters.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No hay medidores registrados. Haz clic en "Agregar" para crear uno.
          </div>
        )}
      </div>

      {showModal && (
        <MeterModal
          open={showModal}
          initial={editingMeter ? {
            contador: editingMeter.contador,
            correlativo: editingMeter.correlativo,
            propietaria: editingMeter.propietaria,
            nit: editingMeter.nit,
            distribuidora: editingMeter.distribuidora,
            tipo_servicio: editingMeter.tipo_servicio,
            sistema: editingMeter.sistema
          } : { contador: '', correlativo: '', propietaria: '', nit: '', distribuidora: 'EEGSA', tipo_servicio: '', sistema: '' }}
          readOnlyPK={!!editingMeter}
          onClose={handleModalClose}
          onSave={handleSave}
        />
      )}
    </section>
  )
}