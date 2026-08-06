import { useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, Flag, Plus, X, XCircle } from 'lucide-react'
import type {
  ActionStatus,
  ActiveFilter,
  CampSupervisorDashboardProps,
  ChecklistItem,
  CorrectiveAction,
  PriorityFlag,
  RoomInspection,
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

function Modal({
  title,
  onClose,
  onSubmit,
  submitLabel = 'Save',
  children,
}: {
  title: string
  onClose: () => void
  onSubmit: () => void
  submitLabel?: string
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
          className="space-y-3"
        >
          {children}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/** Rooms with at least one non-zero value for this checklist item's options, one count per option. */
function aggregateCounts(item: ChecklistItem, roomInspections: RoomInspection[]): Record<number, number> {
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

function roomMatchesFilter(room: RoomInspection, filter: ActiveFilter): boolean {
  const resp = room.responses.find((r) => r.checklistItemId === filter.checklistItemId)
  if (!resp) return false
  return resp.selectedOptionIds.includes(filter.optionId) || (resp.optionCounts[filter.optionId] ?? 0) > 0
}

/** One specific option's finding text for a room — used once a filter/action pins down the exact option. */
function singleFindingText(item: ChecklistItem, room: RoomInspection, optionId: number): string {
  const resp = room.responses.find((r) => r.checklistItemId === item.id)
  const opt = item.options.find((o) => o.id === optionId)
  if (!resp || !opt) return '—'
  if (opt.kind === 'count') {
    const v = resp.optionCounts[opt.id] ?? 0
    return v > 0 ? `${opt.label}: ${v}` : '—'
  }
  return resp.selectedOptionIds.includes(opt.id) ? opt.label : '—'
}

function authorPrefix(currentUser: { name: string }): string {
  const date = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(new Date())
  return `[${date}, ${currentUser.name}]`
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

function isFlagged(flags: PriorityFlag[], checklistItemId: number, optionId: number): boolean {
  return flags.some((f) => f.checklistItemId === checklistItemId && f.optionId === optionId)
}

// ---------------------------------------------------------------------------
// Chart card
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
// Add action modal
// ---------------------------------------------------------------------------

function AddActionModal({
  room,
  item,
  optionId,
  currentUser,
  existingAction,
  onClose,
  onSubmit,
}: {
  room: RoomInspection
  item: ChecklistItem
  optionId: number
  currentUser: CampSupervisorDashboardProps['currentUser']
  existingAction: CorrectiveAction | null
  onClose: () => void
  onSubmit: (payload: {
    note: string
    dueDate: string | null
    status: ActionStatus
  }) => void
}) {
  const option = item.options.find((o) => o.id === optionId)
  const isAppend = existingAction != null
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState(existingAction?.dueDate ?? '')
  const [status, setStatus] = useState<ActionStatus>(existingAction?.status ?? 'OPEN')

  return (
    <Modal
      title={`${isAppend ? 'Add note' : 'Add action'} — Room ${room.roomNumber} · ${item.name}`}
      onClose={onClose}
      submitLabel={isAppend ? 'Add note' : 'Create action'}
      onSubmit={() =>
        onSubmit({
          note,
          dueDate: dueDate || null,
          status,
        })
      }
    >
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        Finding: {option?.label ?? '—'}
      </p>
      {isAppend && existingAction && (
        <div>
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Existing log
          </span>
          <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs whitespace-pre-line text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {existingAction.description}
          </div>
        </div>
      )}
      <Field label={isAppend ? 'New note' : 'Action'}>
        <textarea
          className={inputCls()}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What needs to happen?"
          required
        />
        {note.trim() && (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Will be logged as: {authorPrefix(currentUser)}: {note}
          </p>
        )}
      </Field>
      <Field label="Due date (optional)">
        <input
          type="date"
          className={inputCls()}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </Field>
      <Field label="Status">
        <select
          className={inputCls()}
          value={status}
          onChange={(e) => setStatus(e.target.value as ActionStatus)}
        >
          {(Object.keys(STATUS_LABEL) as ActionStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </Field>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function CampSupervisorDashboard({
  camp,
  currentUser,
  checklistItems,
  roomInspections,
  correctiveActions,
  priorityFlags,
  activeFilter,
  onSetFilter,
  onAddAction,
  onSetActionStatus,
}: CampSupervisorDashboardProps) {
  const [localFilter, setLocalFilter] = useState<ActiveFilter | null>(null)
  const filter = activeFilter !== undefined ? activeFilter : localFilter

  function setFilter(next: ActiveFilter | null) {
    setLocalFilter(next)
    onSetFilter?.(next)
  }

  const [pendingItemId, setPendingItemId] = useState<number | ''>(filter?.checklistItemId ?? checklistItems[0]?.id ?? '')
  // Sync pendingItemId when the filter's item changes externally (e.g. a bar click) — computed
  // during render rather than in an effect, per React's "adjusting state" pattern, so the dropdown
  // never lags a frame behind the filter it's supposed to reflect.
  const [prevFilterItemId, setPrevFilterItemId] = useState(filter?.checklistItemId)
  if (filter?.checklistItemId !== prevFilterItemId) {
    setPrevFilterItemId(filter?.checklistItemId)
    if (filter?.checklistItemId) setPendingItemId(filter.checklistItemId)
  }

  const [actionTarget, setActionTarget] = useState<{
    room: RoomInspection
    item: ChecklistItem
    optionId: number
  } | null>(null)
  const existingActionForTarget = actionTarget
    ? (correctiveActions.find(
        (a) =>
          a.roomId === actionTarget.room.roomId &&
          a.checklistItemId === actionTarget.item.id &&
          a.optionId === actionTarget.optionId,
      ) ?? null)
    : null

  const sortedItems = useMemo(() => [...checklistItems].sort((a, b) => a.sequenceNo - b.sequenceNo), [checklistItems])
  // TEXT items have no options to chart or filter by — free-form notes surface in the room's inspection report instead.
  const selectableItems = useMemo(() => sortedItems.filter((i) => i.inputType !== 'TEXT'), [sortedItems])
  const countsByItem = useMemo(() => {
    const out: Record<number, Record<number, number>> = {}
    for (const item of selectableItems) out[item.id] = aggregateCounts(item, roomInspections)
    return out
  }, [selectableItems, roomInspections])

  const pendingItem = selectableItems.find((i) => i.id === pendingItemId)
  const filteredRooms = filter ? roomInspections.filter((r) => roomMatchesFilter(r, filter)) : []
  const filterItem = filter ? sortedItems.find((i) => i.id === filter.checklistItemId) : null

  const openActionsCount = correctiveActions.filter((a) => a.status !== 'RESOLVED').length
  const roomsWithOpenActions = new Set(
    correctiveActions.filter((a) => a.status !== 'RESOLVED').map((a) => a.roomId),
  ).size
  const overcrowdedRooms = roomInspections.filter(
    (r) => r.headcount != null && r.approvedCapacity != null && r.headcount > r.approvedCapacity,
  )

  return (
    <div className="min-h-full bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="border-b border-slate-200 bg-white px-4 py-5 dark:border-slate-700 dark:bg-slate-950 md:px-8">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {camp.name} — Camp Supervisor Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {roomInspections.length} rooms inspected · {openActionsCount} open action
          {openActionsCount === 1 ? '' : 's'} · {roomsWithOpenActions} room
          {roomsWithOpenActions === 1 ? '' : 's'} with open actions
          {overcrowdedRooms.length > 0 && (
            <>
              {' '}
              ·{' '}
              <span className="font-medium text-amber-700 dark:text-amber-400">
                {overcrowdedRooms.length} room{overcrowdedRooms.length === 1 ? '' : 's'} overcrowded
              </span>
            </>
          )}
        </p>
      </div>

      <div className="space-y-6 px-4 py-5 md:px-8">
        {overcrowdedRooms.length > 0 && (
          <div className="rounded-xl border border-amber-400 bg-amber-100 p-4 text-amber-950 dark:border-amber-600 dark:bg-amber-900 dark:text-amber-50">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="size-4.5 shrink-0 text-amber-700 dark:text-amber-200" />
              <h2 className="text-sm font-semibold tracking-wide uppercase">Overcrowded rooms</h2>
            </div>
            <ul className="space-y-1 text-sm text-amber-900 dark:text-amber-100">
              {overcrowdedRooms.map((room) => (
                <li key={room.roomId}>
                  Room <span className="font-mono font-semibold">{room.roomNumber}</span> — headcount{' '}
                  {room.headcount} exceeds approved capacity {room.approvedCapacity}
                </li>
              ))}
            </ul>
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
                priorityFlags={priorityFlags}
                activeFilter={filter}
                onBarClick={(checklistItemId, optionId) => setFilter({ checklistItemId, optionId })}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Filter rooms
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
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] tracking-wide text-slate-500 uppercase dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                      <th className="px-4 py-2.5 font-semibold">Room #</th>
                      <th className="px-4 py-2.5 font-semibold">Finding</th>
                      <th className="px-4 py-2.5 font-semibold">Inspected</th>
                      <th className="px-4 py-2.5 font-semibold">Inspector</th>
                      <th className="px-4 py-2.5 font-semibold">Actions</th>
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
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                          {singleFindingText(filterItem, room, filter.optionId)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                          {formatDate(room.inspectedAt)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                          {room.inspectorName}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => setActionTarget({ room, item: filterItem, optionId: filter.optionId })}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-800 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-indigo-950"
                          >
                            <Plus className="size-3.5" />
                            {correctiveActions.some(
                              (a) =>
                                a.roomId === room.roomId &&
                                a.checklistItemId === filterItem.id &&
                                a.optionId === filter.optionId,
                            )
                              ? 'Add note'
                              : 'Add action'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredRooms.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          No rooms currently match this finding.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Corrective actions
          </h2>
          <div className="space-y-2">
            {correctiveActions.map((action) => {
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
                    Room {action.roomNumber} · {actionItem?.name ?? '—'}
                    {actionOption ? `: ${actionOption.label}` : ''} · Due {formatDate(action.dueDate)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[action.status]}`}
                    value={action.status}
                    onChange={(e) => {
                      const nextStatus = e.target.value as ActionStatus
                      onSetActionStatus?.(action.id, nextStatus, `Changed status to ${STATUS_LABEL[nextStatus]}`)
                    }}
                  >
                    {(Object.keys(STATUS_LABEL) as ActionStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              )
            })}
            {correctiveActions.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">No corrective actions yet.</p>
            )}
          </div>
        </div>
      </div>

      {actionTarget && (
        <AddActionModal
          room={actionTarget.room}
          item={actionTarget.item}
          optionId={actionTarget.optionId}
          currentUser={currentUser}
          existingAction={existingActionForTarget}
          onClose={() => setActionTarget(null)}
          onSubmit={(payload) => {
            onAddAction?.({
              roomId: actionTarget.room.roomId,
              checklistItemId: actionTarget.item.id,
              optionId: actionTarget.optionId,
              ...payload,
            })
            setActionTarget(null)
          }}
        />
      )}
    </div>
  )
}

export default CampSupervisorDashboard
