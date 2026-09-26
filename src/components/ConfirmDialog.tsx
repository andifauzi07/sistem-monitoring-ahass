import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  open: boolean
  judul: string
  children?: ReactNode
  labelKonfirmasi: string
  labelBatal?: string
  bahaya?: boolean
  memproses?: boolean
  onKonfirmasi: () => void
  onBatal: () => void
}

/** Dialog konfirmasi berbasis <dialog> native (fokus dan Esc ditangani browser). */
export function ConfirmDialog({
  open,
  judul,
  children,
  labelKonfirmasi,
  labelBatal = 'Batal',
  bahaya = false,
  memproses = false,
  onKonfirmasi,
  onBatal,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        // Esc: biarkan state induk yang menutup dialog.
        e.preventDefault()
        if (!memproses) onBatal()
      }}
      className="m-auto w-[min(92vw,28rem)] rounded-xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-black/40"
    >
      <div className="space-y-3 p-5">
        <h2 className="text-lg font-bold text-slate-900">{judul}</h2>
        {children && <div className="text-sm text-slate-600">{children}</div>}
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4">
        <button
          type="button"
          onClick={onBatal}
          disabled={memproses}
          className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {labelBatal}
        </button>
        <button
          type="button"
          onClick={onKonfirmasi}
          disabled={memproses}
          className={`min-h-11 rounded-md px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
            bahaya ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'
          }`}
        >
          {memproses ? 'Memproses…' : labelKonfirmasi}
        </button>
      </div>
    </dialog>
  )
}
