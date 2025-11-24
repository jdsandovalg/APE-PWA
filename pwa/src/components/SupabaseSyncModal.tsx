import React from 'react'
import { X, Upload, Download, Trash2 } from 'lucide-react'
import { loadReadings } from '../services/storage'
import { getSupabaseClient, listBackups, uploadBackupFromBlob, downloadBackup, removeBackup } from '../services/supabase'
import { showToast } from '../services/toast'

function readingsToCsv(rows:any[]){
  if (!rows || rows.length===0) return ''
  const keys = Object.keys(rows[0])
  const lines = [keys.join(',')]
  rows.forEach(r=>{
    const vals = keys.map(k=>{
      const v = r[k]
      if (v==null) return ''
      return String(v).replace(/"/g,'""')
 
                <div key={f.name} className="flex items-center justify-between gap-2 py-2 border-b border-white/5">
                  <div className="truncate text-sm">{f.name}</div>
                  <div className="flex items-center gap-2">
                    <button className="glass-button p-1" onClick={()=>downloadToClient(f.name, f.name)}><Download size={14} /></button>
                    <button className="glass-button p-1" onClick={()=>remove(f.name)}><Trash2 size={14} /></button>
                  </div>
                </div>
              )) : (<div className="text-sm text-gray-400">No hay backups</div>)}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="glass-button p-2" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
import React from 'react'
import { initSupabase, listBackups, uploadBackup, downloadBackupUrl, removeBackup } from '../services/supabase'
import { showToast } from '../services/toast'

function saveConfig(url: string, key: string){
  try{ localStorage.setItem('supabase:url', url); localStorage.setItem('supabase:key', key) }catch(e){}
}

function loadConfig(){
  try{ return { url: localStorage.getItem('supabase:url')||'', key: localStorage.getItem('supabase:key')||'' } }catch(e){ return { url:'', key:'' } }
}

export default function SupabaseSyncModal({ open, onClose }:{ open:boolean, onClose:()=>void }){
  const cfg = loadConfig()
  const [url, setUrl] = React.useState(cfg.url)
  const [key, setKey] = React.useState(cfg.key)
  const [files, setFiles] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)

  const init = ()=>{
    try{ initSupabase(url.trim(), key.trim()); saveConfig(url.trim(), key.trim()); showToast('Supabase inicializado', 'success') }catch(e:any){ showToast(String(e), 'error') }
  }

  const refreshList = async ()=>{
    setLoading(true)
    try{
      initSupabase(url.trim(), key.trim())
      const items = await listBackups('ape-pwa')
      setFiles(items || [])
    }catch(e:any){ showToast('No se pudo listar backups: '+(e.message||String(e)), 'error') }
    setLoading(false)
  }
import React from 'react'

// Supabase sync UI was removed — keep a minimal stub so imports don't break during cleanup.
export default function SupabaseSyncModal(){
  return null
}
        if (v == null) return ''
        return String(v).replace(/"/g, '""')
      })
      lines.push(vals.map(v => `"${v}"`).join(','))
    })
    return lines.join('\n')
  }

  export default function SupabaseSyncModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [loading, setLoading] = React.useState(false)
    const [files, setFiles] = React.useState<any[]>([])
    const [url, setUrl] = React.useState<string>(import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '')
    const [key, setKey] = React.useState<string>(import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
    const bucket = 'ape-pwa'

    const refresh = React.useCallback(async () => {
      try {
        setLoading(true)
        getSupabaseClient(url || undefined, key || undefined)
        const list = await listBackups(bucket)
        setFiles(list)
      } catch (e: any) {
        console.error(e)
        showToast(`Error listando backups: ${e.message || e}`, 'error')
      } finally {
        setLoading(false)
      }
    }, [url, key])

    React.useEffect(() => {
      if (open) refresh()
    }, [open, refresh])

    const uploadCurrent = async () => {
      try {
        setLoading(true)
        const raws = loadReadings() || []
        const csv = readingsToCsv(raws)
        const blob = new Blob([csv], { type: 'text/csv' })
        const path = await uploadBackupFromBlob('readings.csv', blob, bucket)
        showToast(`Backup subido: ${path}`, 'success')
        await refresh()
      } catch (e: any) {
        console.error(e)
        showToast(`Error subiendo backup: ${e.message || e}`, 'error')
      } finally {
        setLoading(false)
      }
    }

    const handleFileUpload: React.ChangeEventHandler<HTMLInputElement> = async ev => {
      const f = ev.target.files && ev.target.files[0]
      if (!f) return
      try {
        setLoading(true)
        import React from 'react'
        import { X, Upload, Download, Trash2 } from 'lucide-react'
        import { loadReadings } from '../services/storage'
        import { getSupabaseClient, listBackups, uploadBackupFromBlob, downloadBackup, removeBackup } from '../services/supabase'
        import { showToast } from '../services/toast'

        function readingsToCsv(rows: any[]) {
          if (!rows || rows.length === 0) return ''
          const keys = Object.keys(rows[0])
          const lines = [keys.join(',')]
          rows.forEach(r => {
            const vals = keys.map(k => {
              const v = r[k]
              if (v == null) return ''
              return String(v).replace(/"/g, '""')
            })
            lines.push(vals.map(v => `"${v}"`).join(','))
          })
          return lines.join('\n')
        }

        export default function SupabaseSyncModal({ open, onClose }: { open: boolean; onClose: () => void }) {
          const [loading, setLoading] = React.useState(false)
          const [files, setFiles] = React.useState<any[]>([])
          const [url, setUrl] = React.useState<string>(import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '')
          const [key, setKey] = React.useState<string>(import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
          const bucket = 'ape-pwa'

          const refresh = React.useCallback(async () => {
            try {
              setLoading(true)
              getSupabaseClient(url || undefined, key || undefined)
              const list = await listBackups(bucket)
              setFiles(list)
            } catch (e: any) {
              console.error(e)
              showToast(`Error listando backups: ${e?.message || e}`, 'error')
            } finally {
              setLoading(false)
            }
          }, [url, key])

          React.useEffect(() => { if (open) refresh() }, [open, refresh])

          const uploadCurrent = async () => {
            try {
              setLoading(true)
              const raws = loadReadings() || []
              const csv = readingsToCsv(raws)
              const blob = new Blob([csv], { type: 'text/csv' })
              const path = await uploadBackupFromBlob('readings.csv', blob, bucket)
              showToast(`Backup subido: ${path}`, 'success')
              await refresh()
            } catch (e: any) {
              console.error(e)
              showToast(`Error subiendo backup: ${e?.message || e}`, 'error')
            } finally { setLoading(false) }
          }

          const handleFileUpload: React.ChangeEventHandler<HTMLInputElement> = async (ev) => {
            const f = ev.target.files && ev.target.files[0]
            if (!f) return
            try {
              setLoading(true)
              const path = await uploadBackupFromBlob(f.name, f, bucket)
              showToast(`Archivo ${f.name} subido: ${path}`, 'success')
              await refresh()
            } catch (e: any) {
              console.error(e)
              showToast(`Error subiendo archivo: ${e?.message || e}`, 'error')
            } finally { setLoading(false); ev.currentTarget.value = '' }
          }

          const downloadToClient = async (p: string, name?: string) => {
            try {
              setLoading(true)
              const blob = await downloadBackup(p, bucket)
              const u = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = u
              a.download = name || p.split('/').pop() || 'backup'
              document.body.appendChild(a)
              a.click()
              a.remove()
              URL.revokeObjectURL(u)
              showToast('Descarga iniciada', 'success')
            } catch (e: any) { console.error(e); showToast(`Error descargando: ${e?.message || e}`, 'error') } finally { setLoading(false) }
          }

          const remove = async (p: string) => {
            if (!confirm('Eliminar backup?')) return
            try { setLoading(true); await removeBackup(p, bucket); showToast('Backup eliminado', 'info'); await refresh() } catch (e: any) { console.error(e); showToast(`Error eliminando: ${e?.message || e}`, 'error') } finally { setLoading(false) }
          }

          if (!open) return null
          return (
            <div className="fixed inset-0 z-60 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={onClose} />
              <div className="glass-card w-[880px] max-w-full p-4 z-70 text-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Sync / Backups (Supabase)</h3>
                  <button className="glass-button p-2" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-300">Supabase URL</label>
                    <input className="w-full bg-transparent border border-white/10 px-2 py-1 rounded mt-1 text-white" value={url} onChange={e => setUrl(e.target.value)} />
                    <label className="text-xs text-gray-300 mt-2">Anon Key</label>
                    <textarea className="w-full bg-transparent border border-white/10 px-2 py-1 rounded mt-1 text-white" value={key} onChange={e => setKey(e.target.value)} rows={3} />
                    <div className="mt-3 flex gap-2">
                      <button className="glass-button p-2 flex items-center gap-2" onClick={uploadCurrent} disabled={loading}><Upload size={14} />Subir lecturas actuales</button>
                      <label className="glass-button p-2 flex items-center gap-2 cursor-pointer"><input type="file" className="hidden" onChange={handleFileUpload} /> <Upload size={14} /> Subir archivo</label>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Bucket: <code className="text-white">{bucket}</code></p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Backups</h4>
                      <button className="glass-button p-2" onClick={refresh} disabled={loading}>Refrescar</button>
                    </div>
                    <div className="mt-2 max-h-64 overflow-auto">
                      {files && files.length > 0 ? files.map(f => (
                        <div key={f.name} className="flex items-center justify-between gap-2 py-2 border-b border-white/5">
                          <div className="truncate text-sm">{f.name}</div>
                          <div className="flex items-center gap-2">
                            <button className="glass-button p-1" onClick={() => downloadToClient(f.name, f.name)}><Download size={14} /></button>
                            <button className="glass-button p-1" onClick={() => remove(f.name)}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      )) : (<div className="text-sm text-gray-400">No hay backups</div>)}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button className="glass-button p-2" onClick={onClose}>Cerrar</button>
                </div>
              </div>
            </div>
          )
        }
