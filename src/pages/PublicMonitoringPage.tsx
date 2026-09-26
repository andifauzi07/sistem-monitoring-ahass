import { STATUS_SERVIS } from '../types/database'

export function PublicMonitoringPage() {
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <section className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Cek Status Servis Motor Anda</h1>
        <p className="text-slate-600">
          Masukkan nomor polisi kendaraan untuk melihat progres servis di AHASS Kota Mamuju.
        </p>
      </section>

      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="nopol" className="sr-only">
          Nomor polisi
        </label>
        <input
          id="nopol"
          disabled
          placeholder="Contoh: DC 1234 AB"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-lg uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal disabled:cursor-not-allowed disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled
          className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cek Status
        </button>
      </form>
      <p className="-mt-5 text-center text-xs text-slate-500">
        Pencarian akan aktif pada iterasi berikutnya.
      </p>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Tahapan servis</h2>
        <ol className="space-y-3">
          {STATUS_SERVIS.map((status, i) => (
            <li key={status} className="flex items-center gap-3 text-sm text-slate-700">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                {i + 1}
              </span>
              {status}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
