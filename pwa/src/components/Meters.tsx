import React, { useEffect, useState } from 'react'
import { getAllMeters, createMeter, updateMeter, type MeterRecord } from '../services/supabaseBasic'
import MeterModal from './MeterModal'
import { showToast } from '../services/toast'
import { PlusCircle, Edit2, Star, FileText } from 'lucide-react'
import { exportMeterPDF } from '../utils/pdfExport'

export default function Meters({ onNavigate }: { onNavigate: (view: string) => void }){
  /**
   * Meters list view
   * ----------------
   * This component lists meters and allows creating/updating them.
   * Recent changes:
   * - Persist selected meter in `localStorage` under `ape_currentMeterId`.
   * - Dispatch `window.dispatchEvent(new CustomEvent('ape:meterChange', { detail: { meterId } }))`
   *   when the star is clicked so other components (Navbar, Dashboard, Readings, Billing)
   *   react to selection changes.
   * - Toast now shows human-readable `contador — propietaria` instead of UUID when possible.
   */
  const [meters, setMeters] = useState<MeterRecord[]>([])
  const [currentMeterId, setCurrentMeterId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMeter, setEditingMeter] = useState<MeterRecord | null>(null)

  useEffect(() => {
    // restore persisted selected meter (if any) then load meters
    const persisted = typeof window !== 'undefined' ? localStorage.getItem('ape_currentMeterId') : null
    if (persisted) setCurrentMeterId(persisted)
    loadMetersData()
  }, [])

  async function loadMetersData() {
    try {
      setLoading(true)
      const metersData = await getAllMeters()
      setMeters(metersData)

      // Set current meter to first one if available
      if (metersData.length > 0 && !currentMeterId) {
        const first = metersData[0].id
        setCurrentMeterId(first)
        try {
          localStorage.setItem('ape_currentMeterId', first)
          window.dispatchEvent(new CustomEvent('ape:meterChange', { detail: { meterId: first } }))
        } catch (e) {
          // ignore storage errors in SSR or restricted env
        }
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
    // meterId here should be the meter.id (uuid). Support callers passing contador by resolving to id.
    let id = meterId
    const matchById = meters.find(m => m.id === meterId)
    if (!matchById) {
      const matchByCont = meters.find(m => m.contador === meterId)
      if (matchByCont) id = matchByCont.id
    }

    setCurrentMeterId(id)
    try {
      localStorage.setItem('ape_currentMeterId', id)
      const resolved = meters.find(m => m.id === id) || meters.find(m => m.contador === id)
      console.log('Dispatching ape:meterChange (from Meters star):', { meterId: id, contador: resolved?.contador })
      window.dispatchEvent(new CustomEvent('ape:meterChange', { detail: { meterId: id } }))
    } catch (e) {
      // ignore
    }
    // Prefer showing human-readable contador and propietaria in the toast
    const resolved = meters.find(m => m.id === id) || meters.find(m => m.contador === id)
    if (resolved) {
      showToast(`Medidor actual: ${resolved.contador} — ${resolved.propietaria}`, 'success')
    } else {
      showToast(`Medidor actual: ${id}`, 'success')
    }
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