import { createClient, SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_URL = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '')
const DEFAULT_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')

let client: SupabaseClient | null = null

export function getSupabaseClient(url?: string, key?: string){
  const u = url || DEFAULT_URL
  const k = key || DEFAULT_KEY
  if (!u || !k) throw new Error('Supabase URL or ANON key not provided')
  if (!client) client = createClient(u, k)
  return client
}

/** List objects in the bucket (root) */
export async function listBackups(bucket = 'ape-pwa'){
  const sb = getSupabaseClient()
  const { data, error } = await sb.storage.from(bucket).list('', { limit: 100, sortBy: { column: 'name', order: 'desc' } })
  if (error) throw error
  return data || []
}

/** Upload a Blob/File to the bucket with a timestamped prefix and return the object path */
export async function uploadBackupFromBlob(name: string, blob: Blob | File, bucket = 'ape-pwa'){
  const sb = getSupabaseClient()
  const path = `${new Date().toISOString().replace(/[:.]/g,'-')}_${name}`
  const { error } = await sb.storage.from(bucket).upload(path, blob as any, { upsert: true })
  if (error) throw error
  return path
}

/** Download an object from the bucket as a Blob */
export async function downloadBackup(path: string, bucket = 'ape-pwa'){
  const sb = getSupabaseClient()
  const { data, error } = await sb.storage.from(bucket).download(path)
  if (error) throw error
  return data
}

/** Remove an object from the bucket */
export async function removeBackup(path: string, bucket = 'ape-pwa'){
  const sb = getSupabaseClient()
  const { error } = await sb.storage.from(bucket).remove([path])
  if (error) throw error
  return true
}

/** Get a public URL for an object (if bucket policies allow) */
export function publicUrl(path: string, bucket = 'ape-pwa'){
  const sb = getSupabaseClient()
  const { data } = sb.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export default getSupabaseClient
