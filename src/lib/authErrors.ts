import type { AuthError } from '@supabase/supabase-js'

export const MSG_INVALID_CREDENTIALS = 'Email atau password salah'
export const MSG_NETWORK = 'Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.'
export const MSG_NOT_CONFIRMED = 'Akun belum dikonfirmasi. Hubungi admin.'
export const MSG_GENERIC = 'Terjadi kesalahan. Coba lagi.'

export function mapAuthError(error: AuthError): string {
  if (error.code === 'invalid_credentials') return MSG_INVALID_CREDENTIALS
  if (error.code === 'email_not_confirmed') return MSG_NOT_CONFIRMED
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) return MSG_NETWORK
  return MSG_GENERIC
}
