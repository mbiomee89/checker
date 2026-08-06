import { useMemo, useState, type ReactNode } from 'react'
import {
  Ban,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  DoorOpen,
  KeyRound,
  ListChecks,
  ListPlus,
  Pencil,
  Plus,
  RotateCcw,
  Users as UsersIcon,
  X,
} from 'lucide-react'
import type {
  AdminConfigurationProps,
  AdminTab,
  AdminUser,
  Camp,
  ChecklistItem,
  ChecklistItemOption,
  InputType,
  OptionKind,
  Room,
  UserRole,
} from '../types'

const TABS: { id: AdminTab; label: string; icon: typeof Building2 }[] = [
  { id: 'camps', label: 'Camps', icon: Building2 },
  { id: 'rooms', label: 'Rooms', icon: DoorOpen },
  { id: 'users', label: 'Users', icon: UsersIcon },
  { id: 'checklist', label: 'Checklist Template', icon: ListChecks },
]

const ROLE_LABEL: Record<UserRole, string> = {
  INSPECTOR: 'Inspector',
  CAMP_SUPERVISOR: 'Camp Supervisor',
  ADMIN: 'Admin',
  HSE_VIEWER: 'HSE Viewer',
}

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  INSPECTOR: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200',
  CAMP_SUPERVISOR: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200',
  ADMIN: 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
  HSE_VIEWER: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
}

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  )
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

function CredentialsModal({
  userName,
  tempPassword,
  onClose,
}: {
  userName: string
  tempPassword: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard?.writeText(tempPassword).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Login credentials issued
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          One-time temporary password for <span className="font-semibold">{userName}</span>. Share it
          with them securely (not over an unsecured channel) — they'll be required to set their own
          password on first login.
        </p>
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950">
          <code className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
            {tempPassword}
          </code>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          This won't be shown again — generate a new one via "Reset password" if it's lost.
        </p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">{children}</table>
      </div>
    </div>
  )
}

function Thead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] tracking-wide text-slate-500 uppercase dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        {cols.map((c) => (
          <th key={c} className="px-4 py-3 font-semibold">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  )
}

// ---------------------------------------------------------------------------
// Camps
// ---------------------------------------------------------------------------

type CampModal = { kind: 'add' } | { kind: 'edit'; camp: Camp }

function CampsTab({
  camps,
  onAddCamp,
  onEditCamp,
  onRetireCamp,
}: {
  camps: Camp[]
  onAddCamp: AdminConfigurationProps['onAddCamp']
  onEditCamp: AdminConfigurationProps['onEditCamp']
  onRetireCamp: AdminConfigurationProps['onRetireCamp']
}) {
  const [modal, setModal] = useState<CampModal | null>(null)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')

  function openAdd() {
    setName('')
    setLocation('')
    setModal({ kind: 'add' })
  }
  function openEdit(camp: Camp) {
    setName(camp.name)
    setLocation(camp.location ?? '')
    setModal({ kind: 'edit', camp })
  }
  function submit() {
    if (!modal) return
    if (modal.kind === 'add') onAddCamp?.({ name, location })
    else onEditCamp?.(modal.camp.id, { name, location })
    setModal(null)
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="size-4" />
          Add camp
        </button>
      </div>
      <TableShell>
        <Thead cols={['Name', 'Location', 'Rooms', 'Users', 'Status', 'Actions']} />
        <tbody>
          {camps.map((c) => (
            <tr
              key={c.id}
              className={`border-b border-slate-100 last:border-0 dark:border-slate-800 ${!c.active ? 'opacity-60' : ''}`}
            >
              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{c.name}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.location}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.roomCount}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.userCount}</td>
              <td className="px-4 py-3">
                <Badge
                  className={
                    c.active
                      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }
                >
                  {c.active ? 'Active' : 'Retired'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onRetireCamp?.(c.id, !c.active)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {c.active ? <Ban className="size-3.5" /> : <RotateCcw className="size-3.5" />}
                    {c.active ? 'Retire' : 'Reactivate'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {camps.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                No camps yet.
              </td>
            </tr>
          )}
        </tbody>
      </TableShell>

      {modal && (
        <Modal
          title={modal.kind === 'add' ? 'Add camp' : 'Edit camp'}
          onClose={() => setModal(null)}
          onSubmit={submit}
        >
          <Field label="Name">
            <input className={inputCls()} value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Location">
            <input
              className={inputCls()}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </Field>
        </Modal>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

type RoomModal = { kind: 'add' } | { kind: 'edit'; room: Room }

function RoomsTab({
  camps,
  rooms,
  onAddRoom,
  onEditRoom,
  onRetireRoom,
  onAddRoomRange,
}: {
  camps: Camp[]
  rooms: Room[]
  onAddRoom: AdminConfigurationProps['onAddRoom']
  onEditRoom: AdminConfigurationProps['onEditRoom']
  onRetireRoom: AdminConfigurationProps['onRetireRoom']
  onAddRoomRange: AdminConfigurationProps['onAddRoomRange']
}) {
  const [campFilter, setCampFilter] = useState<number | 'all'>('all')
  const [modal, setModal] = useState<RoomModal | null>(null)
  const [roomNumber, setRoomNumber] = useState('')
  const [campId, setCampId] = useState<number | ''>(camps[0]?.id ?? '')
  const [capacity, setCapacity] = useState<string>('')
  const [roomError, setRoomError] = useState<string | null>(null)

  const [rangeOpen, setRangeOpen] = useState(false)
  const [rangeCampId, setRangeCampId] = useState<number | ''>(camps[0]?.id ?? '')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [rangeCapacity, setRangeCapacity] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)

  const rangeCount = useMemo(() => {
    const start = Number(rangeStart)
    const end = Number(rangeEnd)
    if (rangeStart === '' || rangeEnd === '' || !Number.isInteger(start) || !Number.isInteger(end)) {
      return null
    }
    if (end < start) return null
    return end - start + 1
  }, [rangeStart, rangeEnd])

  function openAddRange() {
    setRangeCampId(camps[0]?.id ?? '')
    setRangeStart('')
    setRangeEnd('')
    setRangeCapacity('')
    setRangeError(null)
    setRangeOpen(true)
  }
  const rangeConflicts = useMemo(() => {
    const start = Number(rangeStart)
    const end = Number(rangeEnd)
    if (rangeStart === '' || rangeEnd === '' || !Number.isInteger(start) || !Number.isInteger(end)) {
      return []
    }
    return rooms
      .filter((r) => r.campId === rangeCampId)
      .map((r) => Number(r.roomNumber))
      .filter((n) => Number.isInteger(n) && n >= start && n <= end)
      .sort((a, b) => a - b)
  }, [rooms, rangeCampId, rangeStart, rangeEnd])

  function submitRange() {
    const start = Number(rangeStart)
    const end = Number(rangeEnd)
    if (
      rangeStart === '' ||
      rangeEnd === '' ||
      !Number.isInteger(start) ||
      !Number.isInteger(end)
    ) {
      setRangeError('Enter whole-number start and end room numbers.')
      return
    }
    if (end < start) {
      setRangeError('End must be greater than or equal to start.')
      return
    }
    if (!rangeCampId) {
      setRangeError('Choose a camp.')
      return
    }
    if (rangeConflicts.length > 0) {
      setRangeError(
        `Room ${rangeConflicts.length === 1 ? 'number' : 'numbers'} ${rangeConflicts.join(', ')} already ${rangeConflicts.length === 1 ? 'exists' : 'exist'} in this camp — adjust the range or edit those rooms individually.`,
      )
      return
    }
    onAddRoomRange?.({
      campId: rangeCampId,
      startRoomNumber: start,
      endRoomNumber: end,
      approvedCapacity: rangeCapacity === '' ? null : Number(rangeCapacity),
    })
    setRangeOpen(false)
  }

  const campName = (id: number) => camps.find((c) => c.id === id)?.name ?? '—'
  const filtered = useMemo(
    () => (campFilter === 'all' ? rooms : rooms.filter((r) => r.campId === campFilter)),
    [rooms, campFilter],
  )

  function openAdd() {
    setRoomNumber('')
    setCampId(camps[0]?.id ?? '')
    setCapacity('')
    setRoomError(null)
    setModal({ kind: 'add' })
  }
  function openEdit(room: Room) {
    setRoomNumber(room.roomNumber)
    setCampId(room.campId)
    setCapacity(room.approvedCapacity != null ? String(room.approvedCapacity) : '')
    setRoomError(null)
    setModal({ kind: 'edit', room })
  }
  function submit() {
    if (!modal) return
    if (!campId) {
      setRoomError('Choose a camp.')
      return
    }
    const duplicate = rooms.some(
      (r) =>
        r.campId === campId &&
        r.roomNumber === roomNumber &&
        !(modal.kind === 'edit' && r.id === modal.room.id),
    )
    if (duplicate) {
      setRoomError(`Room ${roomNumber} already exists in this camp.`)
      return
    }
    const payload = {
      roomNumber,
      campId,
      approvedCapacity: capacity === '' ? null : Number(capacity),
    }
    if (modal.kind === 'add') onAddRoom?.(payload)
    else onEditRoom?.(modal.room.id, payload)
    setModal(null)
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <select
          value={campFilter}
          onChange={(e) => setCampFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">All camps</option>
          {camps.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          {camps.length === 0 && (
            <p className="text-xs text-slate-400">Add a camp first.</p>
          )}
          <button
            type="button"
            onClick={openAddRange}
            disabled={camps.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-indigo-950"
          >
            <ListPlus className="size-4" />
            Add range
          </button>
          <button
            type="button"
            onClick={openAdd}
            disabled={camps.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            <Plus className="size-4" />
            Add room
          </button>
        </div>
      </div>
      <TableShell>
        <Thead cols={['Room #', 'Camp', 'Approved capacity', 'Status', 'Actions']} />
        <tbody>
          {filtered.map((r) => (
            <tr
              key={r.id}
              className={`border-b border-slate-100 last:border-0 dark:border-slate-800 ${!r.active ? 'opacity-60' : ''}`}
            >
              <td className="px-4 py-3 font-mono font-semibold text-blue-800 dark:text-blue-300">
                {r.roomNumber}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{campName(r.campId)}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                {r.approvedCapacity ?? '—'}
              </td>
              <td className="px-4 py-3">
                <Badge
                  className={
                    r.active
                      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }
                >
                  {r.active ? 'Active' : 'Retired'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onRetireRoom?.(r.id, !r.active)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {r.active ? <Ban className="size-3.5" /> : <RotateCcw className="size-3.5" />}
                    {r.active ? 'Retire' : 'Reactivate'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                No rooms match this filter.
              </td>
            </tr>
          )}
        </tbody>
      </TableShell>

      {modal && (
        <Modal
          title={modal.kind === 'add' ? 'Add room' : 'Edit room'}
          onClose={() => setModal(null)}
          onSubmit={submit}
        >
          <Field label="Room #">
            <input
              className={inputCls()}
              value={roomNumber}
              onChange={(e) => {
                setRoomNumber(e.target.value)
                setRoomError(null)
              }}
              required
            />
          </Field>
          <Field label="Camp">
            <select
              className={inputCls()}
              value={campId}
              onChange={(e) => {
                setCampId(Number(e.target.value))
                setRoomError(null)
              }}
            >
              {camps.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          {roomError && <p className="text-sm text-red-600 dark:text-red-400">{roomError}</p>}
          <Field label="Approved capacity">
            <input
              type="number"
              min={0}
              className={inputCls()}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </Field>
        </Modal>
      )}

      {rangeOpen && (
        <Modal
          title="Add room range"
          onClose={() => setRangeOpen(false)}
          onSubmit={submitRange}
          submitLabel={rangeCount ? `Create ${rangeCount} room${rangeCount === 1 ? '' : 's'}` : 'Create'}
        >
          <Field label="Camp">
            <select
              className={inputCls()}
              value={rangeCampId}
              onChange={(e) => setRangeCampId(Number(e.target.value))}
            >
              {camps.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starting from">
              <input
                type="number"
                min={0}
                className={inputCls()}
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                placeholder="e.g. 401"
                required
              />
            </Field>
            <Field label="To">
              <input
                type="number"
                min={0}
                className={inputCls()}
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                placeholder="e.g. 450"
                required
              />
            </Field>
          </div>
          <Field label="Approved capacity (applies to every room in the range)">
            <input
              type="number"
              min={0}
              className={inputCls()}
              value={rangeCapacity}
              onChange={(e) => setRangeCapacity(e.target.value)}
            />
          </Field>
          {rangeError && <p className="text-sm text-red-600 dark:text-red-400">{rangeError}</p>}
          {!rangeError && rangeCount != null && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This will create {rangeCount} room{rangeCount === 1 ? '' : 's'} ({rangeStart}–{rangeEnd})
              in {camps.find((c) => c.id === rangeCampId)?.name ?? 'the selected camp'}.
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

type UserModal = { kind: 'add' } | { kind: 'edit'; user: AdminUser }

function UsersTab({
  camps,
  users,
  onAddUser,
  onEditUser,
  onSetUserActive,
  onGenerateCredentials,
}: {
  camps: Camp[]
  users: AdminUser[]
  onAddUser: AdminConfigurationProps['onAddUser']
  onEditUser: AdminConfigurationProps['onEditUser']
  onSetUserActive: AdminConfigurationProps['onSetUserActive']
  onGenerateCredentials: AdminConfigurationProps['onGenerateCredentials']
}) {
  const [modal, setModal] = useState<UserModal | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [roles, setRoles] = useState<UserRole[]>(['INSPECTOR'])
  const [campId, setCampId] = useState<number | ''>('')
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [credModal, setCredModal] = useState<{ user: AdminUser; tempPassword: string } | null>(null)
  const needsCamp = roles.includes('CAMP_SUPERVISOR')

  function toggleRole(r: UserRole) {
    setRolesError(null)
    setRoles((prev) => {
      const next = prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
      if (r === 'CAMP_SUPERVISOR' && next.includes(r) && !campId) {
        setCampId(camps[0]?.id ?? '')
      }
      return next
    })
  }

  async function issueCredentials(u: AdminUser) {
    const tempPassword = await onGenerateCredentials?.(u.id)
    if (tempPassword) setCredModal({ user: u, tempPassword })
  }

  const campName = (id: number | null) => (id ? camps.find((c) => c.id === id)?.name ?? '—' : '—')

  function openAdd() {
    setName('')
    setEmail('')
    setRoles(['INSPECTOR'])
    setCampId(camps[0]?.id ?? '')
    setRolesError(null)
    setModal({ kind: 'add' })
  }
  function openEdit(u: AdminUser) {
    setName(u.name)
    setEmail(u.email)
    setRoles(u.roles)
    setCampId(u.campId ?? '')
    setRolesError(null)
    setModal({ kind: 'edit', user: u })
  }
  function submit() {
    if (!modal) return
    if (roles.length === 0) {
      setRolesError('Select at least one role.')
      return
    }
    const payload = {
      name,
      email,
      roles,
      campId: needsCamp ? campId || null : null,
    }
    if (modal.kind === 'add') onAddUser?.(payload)
    else onEditUser?.(modal.user.id, payload)
    setModal(null)
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="size-4" />
          Add user
        </button>
      </div>
      <TableShell>
        <Thead cols={['Name', 'Email', 'Role', 'Camp', 'Status', 'Actions']} />
        <tbody>
          {users.map((u) => (
            <tr
              key={u.id}
              className={`border-b border-slate-100 last:border-0 dark:border-slate-800 ${!u.active ? 'opacity-60' : ''}`}
            >
              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{u.name}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {u.roles.map((r) => (
                    <Badge key={r} className={ROLE_BADGE_CLASS[r]}>
                      {ROLE_LABEL[r]}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{campName(u.campId)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    className={
                      u.active
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }
                  >
                    {u.active ? 'Active' : 'Deactivated'}
                  </Badge>
                  {!u.hasCredentials && (
                    <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                      No login yet
                    </Badge>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(u)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetUserActive?.(u.id, !u.active)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {u.active ? <Ban className="size-3.5" /> : <RotateCcw className="size-3.5" />}
                    {u.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => issueCredentials(u)}
                    className={
                      u.hasCredentials
                        ? 'inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                        : 'inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-xs font-medium text-indigo-800 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-indigo-950'
                    }
                  >
                    <KeyRound className="size-3.5" />
                    {u.hasCredentials ? 'Reset password' : 'Set up login'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      {modal && (
        <Modal
          title={modal.kind === 'add' ? 'Add user' : 'Edit user'}
          onClose={() => setModal(null)}
          onSubmit={submit}
        >
          <Field label="Name">
            <input className={inputCls()} value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputCls()}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Roles">
            <div className="space-y-1.5">
              {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={roles.includes(r)}
                    onChange={() => toggleRole(r)}
                    className="size-4 rounded border-slate-300"
                  />
                  {ROLE_LABEL[r]}
                </label>
              ))}
            </div>
            {rolesError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{rolesError}</p>}
            {roles.length > 1 && !rolesError && (
              <p className="mt-1 text-xs text-slate-400">
                This user switches between roles from their account menu once logged in.
              </p>
            )}
          </Field>
          {needsCamp && (
            <div>
              <Field label="Camp">
                <select className={inputCls()} value={campId} onChange={(e) => setCampId(Number(e.target.value))}>
                  {camps.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}
        </Modal>
      )}

      {credModal && (
        <CredentialsModal
          userName={credModal.user.name}
          tempPassword={credModal.tempPassword}
          onClose={() => setCredModal(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Checklist template
// ---------------------------------------------------------------------------

type ItemModal = { kind: 'add' } | { kind: 'edit'; item: ChecklistItem }
type OptionModal =
  | { kind: 'add'; itemId: number }
  | { kind: 'edit'; itemId: number; option: ChecklistItemOption }

function ChecklistTab({
  items,
  onAddChecklistItem,
  onEditChecklistItem,
  onRetireChecklistItem,
  onAddOption,
  onEditOption,
  onRetireOption,
}: {
  items: ChecklistItem[]
  onAddChecklistItem: AdminConfigurationProps['onAddChecklistItem']
  onEditChecklistItem: AdminConfigurationProps['onEditChecklistItem']
  onRetireChecklistItem: AdminConfigurationProps['onRetireChecklistItem']
  onAddOption: AdminConfigurationProps['onAddOption']
  onEditOption: AdminConfigurationProps['onEditOption']
  onRetireOption: AdminConfigurationProps['onRetireOption']
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [itemModal, setItemModal] = useState<ItemModal | null>(null)
  const [optionModal, setOptionModal] = useState<OptionModal | null>(null)

  const [itemName, setItemName] = useState('')
  const [itemInputType, setItemInputType] = useState<InputType>('MULTI_SELECT')

  const [optLabel, setOptLabel] = useState('')
  const [optIsClear, setOptIsClear] = useState(false)
  const [optKind, setOptKind] = useState<OptionKind>('toggle')
  const [optRequiresAction, setOptRequiresAction] = useState(false)

  const sorted = useMemo(() => [...items].sort((a, b) => a.sequenceNo - b.sequenceNo), [items])

  function toggleExpanded(id: number) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function openAddItem() {
    setItemName('')
    setItemInputType('MULTI_SELECT')
    setItemModal({ kind: 'add' })
  }
  function openEditItem(item: ChecklistItem) {
    setItemName(item.name)
    setItemInputType(item.inputType)
    setItemModal({ kind: 'edit', item })
  }
  function submitItem() {
    if (!itemModal) return
    if (itemModal.kind === 'add') onAddChecklistItem?.({ name: itemName, inputType: itemInputType })
    else onEditChecklistItem?.(itemModal.item.id, { name: itemName, inputType: itemInputType })
    setItemModal(null)
  }

  function openAddOption(itemId: number) {
    setOptLabel('')
    setOptIsClear(false)
    setOptKind('toggle')
    setOptRequiresAction(false)
    setOptionModal({ kind: 'add', itemId })
  }
  function openEditOption(itemId: number, option: ChecklistItemOption) {
    setOptLabel(option.label)
    setOptIsClear(option.isClearOption)
    setOptKind(option.kind)
    setOptRequiresAction(option.requiresAction)
    setOptionModal({ kind: 'edit', itemId, option })
  }
  function submitOption() {
    if (!optionModal) return
    const payload = {
      label: optLabel,
      isClearOption: optIsClear,
      kind: optKind,
      requiresAction: optRequiresAction,
    }
    if (optionModal.kind === 'add') onAddOption?.(optionModal.itemId, payload)
    else onEditOption?.(optionModal.itemId, optionModal.option.id, payload)
    setOptionModal(null)
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={openAddItem}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="size-4" />
          Add checklist item
        </button>
      </div>

      <div className="space-y-2">
        {sorted.map((item) => {
          const isOpen = !!expanded[item.id]
          return (
            <div
              key={item.id}
              className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950 ${!item.active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleExpanded(item.id)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  {isOpen ? (
                    <ChevronDown className="size-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-slate-400" />
                  )}
                  <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
                    {String(item.sequenceNo).padStart(2, '0')}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">{item.name}</span>
                  <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {item.inputType === 'SINGLE_SELECT' ? 'Single-select' : item.inputType === 'MULTI_SELECT' ? 'Multi-select' : 'Text'}
                  </Badge>
                  {!item.active && (
                    <Badge className="bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Retired
                    </Badge>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => openEditItem(item)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onRetireChecklistItem?.(item.id, !item.active)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {item.active ? <Ban className="size-3.5" /> : <RotateCcw className="size-3.5" />}
                  {item.active ? 'Retire' : 'Reactivate'}
                </button>
              </div>

              {isOpen && item.inputType === 'TEXT' && (
                <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-400">
                    Text items capture free-form notes — they don't have selectable options.
                  </p>
                </div>
              )}

              {isOpen && item.inputType !== 'TEXT' && (
                <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      Options
                    </p>
                    <button
                      type="button"
                      onClick={() => openAddOption(item.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2 py-1 text-xs font-medium text-indigo-800 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-indigo-950"
                    >
                      <Plus className="size-3.5" />
                      Add option
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[...item.options]
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((opt) => (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
                            opt.active
                              ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'
                              : 'border-slate-200 bg-slate-100 opacity-60 dark:border-slate-800 dark:bg-slate-900'
                          }`}
                        >
                          <span className="text-slate-700 dark:text-slate-200">{opt.label}</span>
                          {opt.isClearOption && (
                            <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                              OK
                            </Badge>
                          )}
                          {opt.kind === 'count' && (
                            <Badge className="bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
                              Count
                            </Badge>
                          )}
                          {opt.requiresAction && (
                            <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                              Requires action
                            </Badge>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditOption(item.id, opt)}
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                            aria-label={`Edit ${opt.label}`}
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRetireOption?.(item.id, opt.id, !opt.active)}
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                            aria-label={opt.active ? `Retire ${opt.label}` : `Reactivate ${opt.label}`}
                          >
                            {opt.active ? <Ban className="size-3" /> : <RotateCcw className="size-3" />}
                          </button>
                        </div>
                      ))}
                    {item.options.length === 0 && (
                      <p className="text-xs text-slate-400">No options yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {itemModal && (
        <Modal
          title={itemModal.kind === 'add' ? 'Add checklist item' : 'Edit checklist item'}
          onClose={() => setItemModal(null)}
          onSubmit={submitItem}
        >
          <Field label="Name">
            <input
              className={inputCls()}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </Field>
          <Field label="Input type">
            <select
              className={inputCls()}
              value={itemInputType}
              onChange={(e) => setItemInputType(e.target.value as InputType)}
            >
              <option value="SINGLE_SELECT">Single-select</option>
              <option value="MULTI_SELECT">Multi-select</option>
              <option value="TEXT">Text</option>
            </select>
            {itemModal.kind === 'edit' &&
              itemInputType === 'TEXT' &&
              itemModal.item.inputType !== 'TEXT' &&
              (() => {
                const activeOptionCount = itemModal.item.options.filter((o) => o.active).length
                return activeOptionCount > 0 ? (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    This item has {activeOptionCount} active option{activeOptionCount === 1 ? '' : 's'}.
                    Switching to Text hides them from the checklist — they aren't deleted and reappear
                    if you switch this item back to Single-select or Multi-select.
                  </p>
                ) : null
              })()}
          </Field>
        </Modal>
      )}

      {optionModal &&
        (() => {
          const parentItem = items.find((i) => i.id === optionModal.itemId)
          const existingClearOption = parentItem?.options.find(
            (o) =>
              o.active &&
              o.isClearOption &&
              !(optionModal.kind === 'edit' && o.id === optionModal.option.id),
          )
          return (
            <Modal
              title={optionModal.kind === 'add' ? 'Add option' : 'Edit option'}
              onClose={() => setOptionModal(null)}
              onSubmit={submitOption}
            >
              <Field label="Label">
                <input
                  className={inputCls()}
                  value={optLabel}
                  onChange={(e) => setOptLabel(e.target.value)}
                  required
                />
              </Field>
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={optIsClear}
                    onChange={(e) => setOptIsClear(e.target.checked)}
                    className="size-4 rounded border-slate-300"
                  />
                  This is the item's OK / clear option
                </label>
                {optIsClear && existingClearOption && (
                  <p className="mt-1 ps-6 text-xs text-amber-600 dark:text-amber-400">
                    "{existingClearOption.label}" is currently this item's OK option — retire it
                    first, or an item may end up with two.
                  </p>
                )}
              </div>
              <Field label="Renders as">
                <select
                  className={inputCls()}
                  value={optKind}
                  onChange={(e) => setOptKind(e.target.value as OptionKind)}
                >
                  <option value="toggle">Toggle chip</option>
                  <option value="count">Number count (e.g. furniture)</option>
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={optRequiresAction}
                  onChange={(e) => setOptRequiresAction(e.target.checked)}
                  className="size-4 rounded border-slate-300"
                />
                Selecting this auto-opens a corrective action
              </label>
            </Modal>
          )
        })()}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function AdminConfiguration({
  camps,
  rooms,
  users,
  checklistItems,
  activeTab,
  onTabChange,
  onAddCamp,
  onEditCamp,
  onRetireCamp,
  onAddRoom,
  onEditRoom,
  onRetireRoom,
  onAddRoomRange,
  onAddUser,
  onEditUser,
  onSetUserActive,
  onGenerateCredentials,
  onAddChecklistItem,
  onEditChecklistItem,
  onRetireChecklistItem,
  onAddOption,
  onEditOption,
  onRetireOption,
}: AdminConfigurationProps) {
  const [localTab, setLocalTab] = useState<AdminTab>('camps')
  const tab = activeTab ?? localTab
  function setTab(t: AdminTab) {
    setLocalTab(t)
    onTabChange?.(t)
  }

  return (
    <div className="min-h-full bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="border-b border-slate-200 bg-white px-4 py-5 dark:border-slate-700 dark:bg-slate-950 md:px-8">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Admin Configuration
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage camps, rooms, users, and the checklist template — no developer required.
        </p>
        <div className="mt-4 flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                '-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                tab === id
                  ? 'border-blue-600 text-blue-700 dark:text-blue-300'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
              ].join(' ')}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 md:px-8">
        {tab === 'camps' && (
          <CampsTab
            camps={camps}
            onAddCamp={onAddCamp}
            onEditCamp={onEditCamp}
            onRetireCamp={onRetireCamp}
          />
        )}
        {tab === 'rooms' && (
          <RoomsTab
            camps={camps}
            rooms={rooms}
            onAddRoom={onAddRoom}
            onEditRoom={onEditRoom}
            onRetireRoom={onRetireRoom}
            onAddRoomRange={onAddRoomRange}
          />
        )}
        {tab === 'users' && (
          <UsersTab
            camps={camps}
            users={users}
            onAddUser={onAddUser}
            onEditUser={onEditUser}
            onSetUserActive={onSetUserActive}
            onGenerateCredentials={onGenerateCredentials}
          />
        )}
        {tab === 'checklist' && (
          <ChecklistTab
            items={checklistItems}
            onAddChecklistItem={onAddChecklistItem}
            onEditChecklistItem={onEditChecklistItem}
            onRetireChecklistItem={onRetireChecklistItem}
            onAddOption={onAddOption}
            onEditOption={onEditOption}
            onRetireOption={onRetireOption}
          />
        )}
      </div>
    </div>
  )
}

export default AdminConfiguration
