import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

const missingEnv = [
  !url && 'VITE_SUPABASE_URL',
  !publishableKey && 'VITE_SUPABASE_PUBLISHABLE_KEY',
].filter((name): name is string => Boolean(name))

export const isSupabaseConfigured = missingEnv.length === 0

export const supabaseConfigError = isSupabaseConfigured
  ? null
  : `Variabel env belum diisi: ${missingEnv.join(', ')}. Salin .env.example menjadi .env lalu isi nilainya.`

// Pada konfigurasi kosong, client dibuat dengan placeholder agar import tidak crash;
// komponen wajib memeriksa `isSupabaseConfigured` sebelum memakai client.
export const supabase = createClient<Database>(
  url || 'http://localhost',
  publishableKey || 'missing-key',
)
