import { warnaStatus } from '../lib/statusServis'
import type { StatusServis } from '../types/database'

export function StatusBadge({ status }: { status: StatusServis }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${warnaStatus[status]}`}
    >
      {status}
    </span>
  )
}
