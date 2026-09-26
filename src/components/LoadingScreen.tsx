export function LoadingScreen() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 py-16 text-sm text-slate-600"
    >
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
      />
      Memuat…
    </div>
  )
}
