import type { ToastState } from '../lib/useUndoToast'

/** Toast di bawah layar; tombol "Batalkan" hanya muncul bila `toast.onBatal` ada. */
export function UndoToast({ toast, onTutup }: { toast: ToastState | null; onTutup: () => void }) {
  if (!toast) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto flex max-w-lg items-center gap-4 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
      >
        <span className="min-w-0">{toast.pesan}</span>
        {toast.onBatal ? (
          <button
            type="button"
            onClick={toast.onBatal}
            className="min-h-11 shrink-0 rounded-md px-3 text-sm font-bold uppercase tracking-wide text-amber-300 hover:bg-white/10"
          >
            Batalkan
          </button>
        ) : (
          <button
            type="button"
            onClick={onTutup}
            aria-label="Tutup"
            className="min-h-11 shrink-0 rounded-md px-3 text-white/70 hover:bg-white/10"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
