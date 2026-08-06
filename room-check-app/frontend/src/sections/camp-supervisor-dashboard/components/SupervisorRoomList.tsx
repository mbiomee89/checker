import { useMemo, useState } from 'react'
import { FileText, Search } from 'lucide-react'
import type { RoomRow, SupervisorRoomListProps } from '../types'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

function StatusPill({ status }: { status: RoomRow['status'] }) {
  if (status === 'draft') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Draft
      </span>
    )
  }
  if (status === 'submitted') {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-200">
        Submitted
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      Never
    </span>
  )
}

// Camp-locked, print-only room list for the supervisor — no Inspect/Resume (that's the
// inspector's job); the only action here is opening the printable report once submitted.
export function SupervisorRoomList({
  camp,
  roomRows,
  searchQuery,
  onSearchChange,
  onPreviewReport,
}: SupervisorRoomListProps) {
  const [localQuery, setLocalQuery] = useState('')
  const query = (searchQuery ?? localQuery).trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!query) return roomRows
    return roomRows.filter((r) => r.roomNumber.toLowerCase().includes(query))
  }, [roomRows, query])

  return (
    <div className="min-h-full bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="border-b border-slate-200 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 px-4 py-6 text-white md:px-8">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-blue-200 uppercase">
          Field round · {camp.location}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{camp.name}</h1>
        <p className="mt-1 text-sm text-blue-100/90">
          Camp Supervisor · {roomRows.length} rooms
        </p>
      </div>

      <div className="px-4 py-5 md:px-8">
        <label className="relative mb-4 block max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery ?? localQuery}
            onChange={(e) => {
              setLocalQuery(e.target.value)
              onSearchChange?.(e.target.value)
            }}
            placeholder="Filter by room number…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pr-3 pl-10 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] tracking-wide text-slate-500 uppercase dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 font-semibold dark:bg-slate-900">
                    Room #
                  </th>
                  <th className="px-4 py-3 font-semibold">Capacity</th>
                  <th className="px-4 py-3 font-semibold">Last inspection</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Report</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      No rooms match “{query}”.
                    </td>
                  </tr>
                )}
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="group border-b border-slate-100 transition-colors last:border-0 hover:bg-indigo-50/60 dark:border-slate-800 dark:hover:bg-indigo-950/30"
                  >
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 font-mono text-base font-semibold tracking-wide text-blue-800 group-hover:bg-indigo-50/60 dark:bg-slate-950 dark:text-blue-300 dark:group-hover:bg-indigo-950/30">
                      {row.roomNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {row.approvedCapacity ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {formatDate(row.lastInspectionAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-4 py-3">
                      {row.lastSubmittedInspectionId ? (
                        <button
                          type="button"
                          onClick={() => onPreviewReport?.(row.lastSubmittedInspectionId!)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-800 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-indigo-950"
                        >
                          <FileText className="size-3.5" />
                          Report
                        </button>
                      ) : (
                        <span
                          title="Available after the checklist is submitted"
                          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-400 dark:border-slate-800 dark:text-slate-600"
                        >
                          <FileText className="size-3.5" />
                          Report
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupervisorRoomList
