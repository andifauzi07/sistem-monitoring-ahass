import { supabase } from './supabase'
import { mapAuthError, MSG_GENERIC } from './authErrors'

export type HasilAkun<T> = { data: T; error: null } | { data: null; error: string }

export async function ambilNamaAkun(userId: string): Promise<HasilAkun<string>> {
  const { data, error } = await supabase.from('service_advisors').select('nama').eq('id', userId).maybeSingle()
  if (error || !data) return { data: null, error: MSG_GENERIC }
  return { data: data.nama, error: null }
}

/** Mengembalikan pesan error (Bahasa Indonesia) atau `null` jika berhasil. */
export async function ubahNamaAkun(userId: string, nama: string): Promise<string | null> {
  const namaBersih = nama.trim()
  if (!namaBersih) return 'Nama tidak boleh kosong.'
  const { error } = await supabase.from('service_advisors').update({ nama: namaBersih }).eq('id', userId)
  return error ? MSG_GENERIC : null
}

/**
 * Mengubah email lewat Supabase Auth (auto-confirm, tanpa alur verifikasi ulang
 * yang dibangun aplikasi — lihat design.md D5). Salinan `service_advisors.email`
 * ikut disinkronkan karena tidak diperbarui otomatis oleh trigger DB.
 */
export async function ubahEmailAkun(userId: string, email: string): Promise<string | null> {
  const emailBersih = email.trim()
  const { error } = await supabase.auth.updateUser({ email: emailBersih })
  if (error) return mapAuthError(error)
  await supabase.from('service_advisors').update({ email: emailBersih }).eq('id', userId)
  return null
}

export async function ubahPasswordAkun(password: string): Promise<string | null> {
  const { error } = await supabase.auth.updateUser({ password })
  return error ? mapAuthError(error) : null
}
