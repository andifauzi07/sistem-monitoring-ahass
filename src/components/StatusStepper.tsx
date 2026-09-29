import { Check } from 'lucide-react'
import { STATUS_SERVIS, type StatusServis } from '../types/database'

type Tahap = 'selesai' | 'aktif' | 'belum'

const gayaLingkaran: Record<Tahap, string> = {
  selesai: 'border-brand-600 bg-brand-600 text-white',
  aktif: 'border-brand-600 bg-brand-50 text-brand-700 ring-4 ring-brand-100',
  belum: 'border-slate-300 bg-white text-slate-400',
}

const gayaLabel: Record<Tahap, string> = {
  selesai: 'text-slate-700',
  aktif: 'font-semibold text-brand-700',
  belum: 'text-slate-400',
}

/**
 * Penanda tahapan servis (design D6): vertikal di HP, horizontal mulai `sm`.
 * `status = null` menampilkan semua tahap sebagai panduan tanpa tahap aktif.
 */
export function StatusStepper({ status }: { status: StatusServis | null }) {
  const indeksAktif = status ? STATUS_SERVIS.indexOf(status) : -1

  return (
    <ol className="flex flex-col sm:flex-row">
      {STATUS_SERVIS.map((s, i) => {
        const tahap: Tahap = i < indeksAktif ? 'selesai' : i === indeksAktif ? 'aktif' : 'belum'
        const terakhir = i === STATUS_SERVIS.length - 1
        return (
          <li
            key={s}
            aria-current={tahap === 'aktif' ? 'step' : undefined}
            className="relative flex items-start gap-3 pb-5 last:pb-0 sm:flex-1 sm:flex-col sm:items-center sm:gap-2 sm:pb-0 sm:text-center"
          >
            {!terakhir && (
              <span
                aria-hidden="true"
                className={`absolute top-8 bottom-0 left-[15px] w-0.5 sm:top-[15px] sm:right-[calc(-50%+1rem)] sm:bottom-auto sm:left-[calc(50%+1rem)] sm:h-0.5 sm:w-auto ${
                  i < indeksAktif ? 'bg-brand-600' : 'bg-slate-200'
                }`}
              />
            )}
            <span
              className={`relative flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${gayaLingkaran[tahap]}`}
            >
              {tahap === 'selesai' ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : i + 1}
            </span>
            <span className={`pt-1 text-sm sm:px-1 sm:pt-0 sm:text-xs ${gayaLabel[tahap]}`}>
              {s}
              {tahap === 'selesai' && <span className="sr-only"> (selesai)</span>}
              {tahap === 'aktif' && <span className="sr-only"> (tahap saat ini)</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
