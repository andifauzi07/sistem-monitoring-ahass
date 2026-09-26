/**
 * Normalisasi nomor polisi: huruf kapital, hanya huruf & angka.
 * Harus setara dengan fungsi SQL `normalize_nopol` (sumber kebenaran ada di database).
 * Contoh: "dc 1234-ab" → "DC1234AB".
 */
export function normalizeNopol(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

/**
 * Format tampilan nomor polisi Indonesia: "DC1234AB" → "DC 1234 AB".
 * Jika pola tidak dikenali, nilai ternormalisasi dikembalikan apa adanya.
 */
export function formatNopol(input: string): string {
  const nopol = normalizeNopol(input)
  const match = /^([A-Z]{1,2})(\d{1,4})([A-Z]{0,3})$/.exec(nopol)
  if (!match) return nopol
  return match.slice(1).filter(Boolean).join(' ')
}
