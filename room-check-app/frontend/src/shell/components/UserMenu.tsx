import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, LogOut } from 'lucide-react'

export type UserMenuUser = {
  name: string
  avatarUrl?: string
  /** All roles this user is currently assigned — e.g. ['ADMIN', 'HSE_VIEWER']. */
  roles?: string[]
  /** Which of `roles` the user is currently acting as. */
  activeRole?: string
}

export type UserMenuProps = {
  user?: UserMenuUser
  /** Human-readable label per role value; falls back to the raw role string when omitted. */
  roleLabels?: Record<string, string>
  onLogout?: () => void
  /** Called when the user picks a different role from the switcher — only shown when `roles.length > 1`. */
  onSwitchRole?: (role: string) => void
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function UserMenu({ user, roleLabels, onLogout, onSwitchRole }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const roleLabel = (role: string) => roleLabels?.[role] ?? role
  const canSwitchRole = (user?.roles?.length ?? 0) > 1

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="font-[family-name:var(--font-body,Inter)] flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="size-8 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white dark:bg-blue-500">
            {initials(user.name)}
          </span>
        )}
        <span className="hidden max-w-[10rem] flex-col items-start sm:flex">
          <span className="truncate font-medium">{user.name}</span>
          {user.activeRole && (
            <span className="truncate text-xs text-slate-500 dark:text-slate-400">
              {roleLabel(user.activeRole)}
            </span>
          )}
        </span>
        <ChevronDown className="size-4 text-slate-400" aria-hidden />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute end-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800 sm:hidden">
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
              {user.name}
            </p>
            {user.activeRole && (
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {roleLabel(user.activeRole)}
              </p>
            )}
          </div>

          {canSwitchRole && (
            <div className="border-b border-slate-100 py-1 dark:border-slate-800">
              <p className="px-3 pt-1 pb-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
                Switch role
              </p>
              {user.roles?.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="menuitemradio"
                  aria-checked={r === user.activeRole}
                  onClick={() => {
                    setOpen(false)
                    if (r !== user.activeRole) onSwitchRole?.(r)
                  }}
                  className="font-[family-name:var(--font-body,Inter)] flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 dark:text-slate-200 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-100"
                >
                  <Check
                    className={`size-4 shrink-0 ${r === user.activeRole ? 'opacity-100' : 'opacity-0'}`}
                    aria-hidden
                  />
                  {roleLabel(r)}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onLogout?.()
            }}
            className="font-[family-name:var(--font-body,Inter)] flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 dark:text-slate-200 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-100"
          >
            <LogOut className="size-4" aria-hidden />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
