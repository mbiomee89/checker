import { useMemo, useState, type ReactNode } from 'react'
import { Flag, XCircle } from 'lucide-react'
import type {
  ActionStatus,
  ActiveFilter,
  CampRoomInspection,
  ChecklistItem,
  HSEOverviewProps,
  InspectionCycle,
  PriorityFlag,
} from '../types'

const STATUS_LABEL: Record<ActionStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
}

const STATUS_BADGE_CLASS: Record<ActionStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200',
  RESOLVED: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
}

function inputCls() {
  return 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900'
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
    </label>
  )
}

/** Rooms with at least one non-zero value for this checklist item's options, one count per option. */
function aggregateCounts(item: ChecklistItem, roomInspections: CampRoomInspection[]): Record<number, number> {
  const counts: Record<number, number> = {}
  for (const opt of item.options) counts[opt.id] = 0
  for (const room of roomInspections) {
    const resp = room.responses.find((r) => r.checklistItemId === item.id)
    if (!resp) continue
    for (const opt of item.options) {
      if (opt.kind === 'count') {
        if ((resp.optionCounts[opt.id] ?? 0) > 0) counts[opt.id] += 1
      } else if (resp.selectedOptionIds.includes(opt.id)) {
        counts[opt.id] += 1
      }
    }
  }
  return counts
}

function roomMatchesFilter(room: CampRoomInspection, filter: ActiveFilter): boolean {
  const resp = room.responses.find((r) => r.checklistItemId === filter.checklistItemId)
  if (!resp) return false
  return resp.selectedOptionIds.includes(filter.optionId) || (resp.optionCounts[filter.optionId] ?? 0) > 0
}

function singleFindingText(item: ChecklistItem, room: CampRoomInspection, optionId: number): string {
  const resp = room.responses.find((r) => r.checklistItemId === item.id)
  const opt = item.options.find((o) => o.id === optionId)
  if (!resp || !opt) return '—'
  if (opt.kind === 'count') {
    const v = resp.optionCounts[opt.id] ?? 0
    return v > 0 ? `${opt.label}: ${v}` : '—'
  }
  return resp.selectedOptionIds.includes(opt.id) ? opt.label : '—'
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(
      new Date(iso),
    )
  } catch {
    return '—'
  }
}

function formatMonth(cycleMonth: string) {
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
      new Date(`${cycleMonth}-01T00:00:00`),
    )
  } catch {
    return cycleMonth
  }
}

function isFlagged(flags: PriorityFlag[], checklistItemId: number, optionId: number): boolean {
  return flags.some((f) => f.checklistItemId === checklistItemId && f.optionId === optionId)
}

/** Frequency of one finding per inspection cycle (month), scoped to Combined (sum across camps
 * sharing a month) or one camp — real client-computed aggregation per bucket, not pre-baked. */
function trendByMonth(
  item: ChecklistItem,
  optionId: number,
  cycles: InspectionCycle[],
  scopeCampId: number | null,
): { month: string; count: number }[] {
  const scoped = scopeCampId ? cycles.filter((c) => c.campId === scopeCampId) : cycles
  const byMonth = new Map<string, number>()
  for (const cycle of scoped) {
    const counts = aggregateCounts(item, cycle.roomInspections)
    const v = counts[optionId] ?? 0
    byMonth.set(cycle.cycleMonth, (byMonth.get(cycle.cycleMonth) ?? 0) + v)
  }
  return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }))
}

// ---------------------------------------------------------------------------
// Chart card (read-only — no priority-toggle capability, HSE can only view flags)
// ---------------------------------------------------------------------------

function ChartCard({
  item,
  counts,
  priorityFlags,
  activeFilter,
  onBarClick,
}: {
  item: ChecklistItem
  counts: Record<number, number>
  priorityFlags: PriorityFlag[]
  activeFilter: ActiveFilter | null | undefined
  onBarClick: (checklistItemId: number, optionId: number) => void
}) {
  const sortedOptions = useMemo(
    () => [...item.options].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0)),
    [item.options, counts],
  )
  const max = Math.max(1, ...sortedOptions.map((o) => counts[o.id] ?? 0))

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
        <span className="me-2 font-mono text-xs text-blue-600 dark:text-blue-400">
          {String(item.sequenceNo).padStart(2, '0')}
        </span>
        {item.name}
      </h3>
      <div className="space-y-2">
        {sortedOptions.map((opt) => {
          const count = counts[opt.id] ?? 0
          const pct = Math.round((count / max) * 100)
          const isActive = activeFilter?.checklistItemId === item.id && activeFilter?.optionId === opt.id
          const flagged = isFlagged(priorityFlags, item.id, opt.id)
          const barClass = isActive
            ? 'bg-blue-600'
            : opt.isClearOption
              ? 'bg-emerald-400 group-hover:bg-emerald-500'
              : 'bg-indigo-400 group-hover:bg-indigo-500'
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onBarClick(item.id, opt.id)}
              disabled={count === 0}
              className="group block w-full text-left disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="mb-0.5 flex items-center justify-between gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1 ${
                    isActive
                      ? 'font-semibold text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {flagged && (
                    <Flag
                      className="size-3 shrink-0 text-rose-600 dark:text-rose-400"
                      fill="currentColor"
                      aria-label="High priority"
                    />
                  )}
                  {opt.label}
                </span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                <div className={`h-full rounded transition-all ${barClass}`} style={{ width: `${pct}%` }} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function HSEOverview({
  camps,
  checklistItems,
  roomInspections,
  inspectionCycles,
  correctiveActions,
  priorityFlags,
  scopeCampId: controlledScopeCampId,
  onSetScopeCampId,
  activeFilter,
  onSetFilter,
}: HSEOverviewProps) {
  const [localScopeCampId, setLocalScopeCampId] = useState<number | null>(null)
  const scopeCampId = controlledScopeCampId !== undefined ? controlledScopeCampId : localScopeCampId

  function setScope(next: number | null) {
    setLocalScopeCampId(next)
    onSetScopeCampId?.(next)
  }

  const [localFilter, setLocalFilter] = useState<ActiveFilter | null>(null)
  const filter = activeFilter !== undefined ? activeFilter : localFilter

  function setFilter(next: ActiveFilter | null) {
    setLocalFilter(next)
    onSetFilter?.(next)
  }

  const [statusFilter, setStatusFilter] = useState<ActionStatus | 'ALL'>('ALL')

  const scopedRoomInspections = useMemo(
    () => (scopeCampId ? roomInspections.filter((r) => r.campId === scopeCampId) : roomInspections),
    [roomInspections, scopeCampId],
  )
  const scopedCorrectiveActions = useMemo(
    () => (scopeCampId ? correctiveActions.filter((a) => a.campId === scopeCampId) : correctiveActions),
    [correctiveActions, scopeCampId],
  )
  const scopedPriorityFlags = useMemo(
    () => (scopeCampId ? priorityFlags.filter((f) => f.campId === scopeCampId) : priorityFlags),
    [priorityFlags, scopeCampId],
  )

  const [pendingItemId, setPendingItemId] = useState<number | ''>(filter?.checklistItemId ?? checklistItems[0]?.id ?? '')
  // Sync pendingItemId when the filter's item changes externally (e.g. a bar click) — computed
  // during render rather than in an effect, per React's "adjusting state" pattern.
  const [prevFilterItemId, setPrevFilterItemId] = useState(filter?.checklistItemId)
  if (filter?.checklistItemId !== prevFilterItemId) {
    setPrevFilterItemId(filter?.checklistItemId)
    if (filter?.checklistItemId) setPendingItemId(filter.checklistItemId)
  }

  const sortedItems = useMemo(() => [...checklistItems].sort((a, b) => a.sequenceNo - b.sequenceNo), [checklistItems])
  // TEXT items have no options to chart or filter by — free-form notes surface in the room's inspection report instead.
  const selectableItems = useMemo(() => sortedItems.filter((i) => i.inputType !== 'TEXT'), [sortedItems])
  const countsByItem = useMemo(() => {
    const out: Record<number, Record<number, number>> = {}
    for (const item of selectableItems) out[item.id] = aggregateCounts(item, scopedRoomInspections)
    return out
  }, [selectableItems, scopedRoomInspections])

  const pendingItem = selectableItems.find((i) => i.id === pendingItemId)
  const filteredRooms = filter ? scopedRoomInspections.filter((r) => roomMatchesFilter(r, filter)) : []
  const filterItem = filter ? sortedItems.find((i) => i.id === filter.checklistItemId) : null

  const trendData = useMemo(() => {
    if (!filter || !filterItem) return []
    return trendByMonth(filterItem, filter.optionId, inspectionCycles, scopeCampId)
  }, [filter, filterItem, inspectionCycles, scopeCampId])
  const trendMax = Math.max(1, ...trendData.map((d) => d.count))

  const campOpenCounts = useMemo(
    () =>
      [...camps]
        .map((c) => ({
          camp: c,
          openCount: correctiveActions.filter((a) => a.campId === c.id && a.status !== 'RESOLVED').length,
        }))
        .sort((a, b) => b.openCount - a.openCount),
    [camps, correctiveActions],
  )

  const rollupActions = useMemo(
    () => (statusFilter === 'ALL' ? scopedCorrectiveActions : scopedCorrectiveActions.filter((a) => a.status === statusFilter)),
    [scopedCorrectiveActions, statusFilter],
  )

  const scopeCamp = camps.find((c) => c.id === scopeCampId) ?? null
  const scopeLabel = scopeCamp ? scopeCamp.name : 'All camps (combined)'

  return (
    <div className="min-h-full bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="border-b border-slate-200 bg-white px-4 py-5 dark:border-slate-700 dark:bg-slate-950 md:px-8">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          HSE Overview — {scopeLabel}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {scopedRoomInspections.length} rooms inspected · {scopedCorrectiveActions.filter((a) => a.status !== 'RESOLVED').length} open action
          {scopedCorrectiveActions.filter((a) => a.status !== 'RESOLVED').length === 1 ? '' : 's'} · {scopedPriorityFlags.length} high-priority finding
          {scopedPriorityFlags.length === 1 ? '' : 's'} · read only
        </p>
        <div className="mt-4 max-w-xs">
          <Field label="Scope">
            <select
              className={inputCls()}
              value={scopeCampId ?? ''}
              onChange={(e) => setScope(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Combined (all camps)</option>
              {camps.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="space-y-6 px-4 py-5 md:px-8">
        {scopeCampId === null && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Camp comparison — open corrective actions
            </h2>
            <div className="space-y-2">
              {campOpenCounts.map(({ camp, openCount }) => {
                const max = Math.max(1, ...campOpenCounts.map((c) => c.openCount))
                const pct = Math.round((openCount / max) * 100)
                return (
                  <button
                    key={camp.id}
                    type="button"
                    onClick={() => setScope(camp.id)}
                    className="group block w-full text-left"
                  >
                    <div className="mb-0.5 flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-600 group-hover:text-blue-700 dark:text-slate-300 dark:group-hover:text-blue-300">
                        {camp.name}
                      </span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{openCount}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded bg-rose-400 transition-all group-hover:bg-rose-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Findings by category (current state, latest inspection per room)
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {selectableItems.map((item) => (
              <ChartCard
                key={item.id}
                item={item}
                counts={countsByItem[item.id]}
                priorityFlags={scopedPriorityFlags}
                activeFilter={filter}
                onBarClick={(checklistItemId, optionId) => setFilter({ checklistItemId, optionId })}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Filter / drill down
          </h2>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Checklist item">
              <select
                className={inputCls()}
                value={pendingItemId}
                onChange={(e) => setPendingItemId(Number(e.target.value))}
              >
                {selectableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Option">
              <select
                className={inputCls()}
                value={filter?.checklistItemId === pendingItemId ? filter.optionId : ''}
                onChange={(e) => {
                  if (e.target.value && pendingItemId !== '')
                    setFilter({ checklistItemId: pendingItemId, optionId: Number(e.target.value) })
                }}
              >
                <option value="">Choose an option…</option>
                {pendingItem?.options.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label} ({countsByItem[Number(pendingItemId)]?.[opt.id] ?? 0})
                  </option>
                ))}
              </select>
            </Field>
            {filter && (
              <button
                type="button"
                onClick={() => setFilter(null)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <XCircle className="size-4" />
                Clear filter
              </button>
            )}
          </div>

          {filter && filterItem && (
            <>
              {trendData.length > 0 && (
                <div className="mt-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Frequency over time — {filterItem.name}:{' '}
                    {filterItem.options.find((o) => o.id === filter.optionId)?.label}
                  </h3>
                  <div className="flex items-end gap-3">
                    {trendData.map((d) => {
                      const pct = Math.round((d.count / trendMax) * 100)
                      return (
                        <div key={d.month} className="flex flex-col items-center gap-1">
                          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {d.count}
                          </span>
                          <div className="flex h-20 w-8 items-end overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                            <div
                              className="w-full rounded bg-indigo-500 transition-all"
                              style={{ height: `${Math.max(pct, d.count > 0 ? 6 : 0)}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {formatMonth(d.month)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] tracking-wide text-slate-500 uppercase dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                        <th className="px-4 py-2.5 font-semibold">Room #</th>
                        {scopeCampId === null && <th className="px-4 py-2.5 font-semibold">Camp</th>}
                        <th className="px-4 py-2.5 font-semibold">Finding</th>
                        <th className="px-4 py-2.5 font-semibold">Inspected</th>
                        <th className="px-4 py-2.5 font-semibold">Inspector</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRooms.map((room) => (
                        <tr
                          key={room.roomId}
                          className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                        >
                          <td className="px-4 py-2.5 font-mono font-semibold text-blue-800 dark:text-blue-300">
                            {room.roomNumber}
                          </td>
                          {scopeCampId === null && (
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{room.campName}</td>
                          )}
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                            {singleFindingText(filterItem, room, filter.optionId)}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                            {formatDate(room.inspectedAt)}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                            {room.inspectorName}
                          </td>
                        </tr>
                      ))}
                      {filteredRooms.length === 0 && (
                        <tr>
                          <td colSpan={scopeCampId === null ? 5 : 4} className="px-4 py-8 text-center text-slate-500">
                            No rooms currently match this finding.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            High-priority findings
          </h2>
          <div className="space-y-2">
            {scopedPriorityFlags.map((flag, i) => {
              const flagItem = sortedItems.find((it) => it.id === flag.checklistItemId)
              const flagOption = flagItem?.options.find((o) => o.id === flag.optionId)
              return (
                <div
                  key={`${flag.checklistItemId}-${flag.optionId}-${i}`}
                  className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm dark:border-rose-900 dark:bg-rose-950/40"
                >
                  <Flag className="size-3.5 shrink-0 text-rose-600 dark:text-rose-400" fill="currentColor" />
                  <span className="text-slate-800 dark:text-slate-100">
                    {flagItem?.name ?? '—'}: {flagOption?.label ?? '—'}
                  </span>
                  {scopeCampId === null && (
                    <span className="ms-auto shrink-0 text-xs text-slate-500 dark:text-slate-400">
                      {flag.campName}
                    </span>
                  )}
                </div>
              )
            })}
            {scopedPriorityFlags.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">No high-priority findings flagged.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Corrective actions
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    statusFilter === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {s === 'ALL' ? 'All' : STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {rollupActions.map((action) => {
              const actionItem = sortedItems.find((i) => i.id === action.checklistItemId)
              const actionOption = actionItem?.options.find((o) => o.id === action.optionId)
              return (
                <div
                  key={action.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm whitespace-pre-line text-slate-900 dark:text-white">
                      {action.description}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {scopeCampId === null ? `${action.campName} · ` : ''}Room {action.roomNumber} ·{' '}
                      {actionItem?.name ?? '—'}
                      {actionOption ? `: ${actionOption.label}` : ''} · Due {formatDate(action.dueDate)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[action.status]}`}
                  >
                    {STATUS_LABEL[action.status]}
                  </span>
                </div>
              )
            })}
            {rollupActions.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">No corrective actions match this filter.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HSEOverview
