import { useMemo, useState } from 'react'
import { ClipboardPlus, Eye, FileText, Play, Search } from 'lucide-react'
import type { RoomRow, RoomTableProps } from '../types'

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

export function RoomTable({
  camps,
  currentUser,
  roomRows,
  searchQuery,
  onSearchChange,
  onStartInspection,
  onResumeDraft,
  onViewSubmitted,
  onPreviewReport,
}: RoomTableProps) {
  const [localQuery, setLocalQuery] = useState('')
  const [selectedCampId, setSelectedCampId] = useState<number | ''>(camps[0]?.id ?? '')
  const query = (searchQuery ?? localQuery).trim().toLowerCase()

  const camp = camps.find((c) => c.id === selectedCampId) ?? camps[0]

  const campRows = useMemo(
    () => roomRows.filter((r) => r.campId === selectedCampId),
    [roomRows, selectedCampId],
  )

  const filtered = useMemo(() => {
    if (!query) return campRows
    return campRows.filter((r) => r.roomNumber.toLowerCase().includes(query))
  }, [campRows, query])

  const draftCount = campRows.filter((r) => r.status === 'draft').length

  return (
    <div className="min-h-full bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="border-b border-slate-200 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 px-4 py-6 text-white md:px-8">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-blue-200 uppercase">
          Field round · {camp?.location ?? '—'}
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <label className="block">
              <span className="sr-only">Camp</span>
              <select
                value={selectedCampId}
                onChange={(e) => setSelectedCampId(Number(e.target.value))}
                className="-ms-1 rounded-md border-0 bg-transparent px-1 text-2xl font-semibold tracking-tight text-white md:text-3xl [&>option]:text-slate-900"
              >
                {camps.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-1 text-sm text-blue-100/90">
              Inspector {currentUser.name} · {campRows.length} rooms · {draftCount} open drafts
            </p>
          </div>
        </div>
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
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] tracking-wide text-slate-500 uppercase dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 font-semibold dark:bg-slate-900">
                    Room #
                  </th>
                  <th className="px-4 py-3 font-semibold">Capacity</th>
                  <th className="px-4 py-3 font-semibold">Last inspection</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
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
                      <div className="flex flex-wrap gap-2">
                        {row.openDraftInspectionId ? (
                          <button
                            type="button"
                            onClick={() => onResumeDraft?.(row.openDraftInspectionId!)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            <Play className="size-3.5" />
                            Resume
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onStartInspection?.(row.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-blue-950"
                          >
                            <ClipboardPlus className="size-3.5" />
                            Inspect
                          </button>
                        )}
                        {row.lastSubmittedInspectionId && (
                          <button
                            type="button"
                            onClick={() => onViewSubmitted?.(row.lastSubmittedInspectionId!)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Eye className="size-3.5" />
                            Last visit
                          </button>
                        )}
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
                      </div>
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
