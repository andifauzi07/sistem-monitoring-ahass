import { formatJam } from '../lib/format'

/** Status koneksi realtime + waktu data terakhir dimuat di halaman publik (design D6). */
export function IndikatorLive({ terhubung, diperbarui }: { terhubung: boolean; diperbarui: Date }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-500">
      <span className="inline-flex items-center gap-1.5">
        <span className="relative flex size-2.5" aria-hidden="true">
          {terhubung && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-60" />
          )}
          <span
            className={`relative inline-flex size-2.5 rounded-full ${terhubung ? 'bg-green-500' : 'bg-slate-400'}`}
          />
        </span>
        {terhubung ? 'Live · diperbarui otomatis' : 'Menghubungkan ulang…'}
      </span>
      <span aria-hidden="true" className="text-slate-300">
        |
      </span>
      <span>Diperbarui pukul {formatJam(diperbarui)}</span>
    </div>
  )
}
