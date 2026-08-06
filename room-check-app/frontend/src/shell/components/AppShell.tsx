import { useEffect, useState, type ReactNode } from 'react'
import { Menu, X } from 'lucide-react'
import { MainNav, type NavItem } from './MainNav'
import { UserMenu, type UserMenuUser } from './UserMenu'

export type AppShellProps = {
  children: ReactNode
  navigationItems: Array<{ label: string; href: string; isActive?: boolean; sub?: boolean }>
  user?: UserMenuUser
  /** Human-readable label per role value, passed through to the user menu's role switcher. */
  roleLabels?: Record<string, string>
  onNavigate?: (href: string) => void
  onLogout?: () => void
  /** Called when the user picks a different role from their account menu. */
  onSwitchRole?: (role: string) => void
  productName?: string
}

function BrandBlock({ productName }: { productName: string }) {
  return (
    <div className="flex h-14 items-center gap-2 px-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-xs font-bold tracking-wide text-white dark:bg-blue-500">
        CK
      </span>
      <div className="min-w-0">
        <p className="font-[family-name:var(--font-heading,Manrope)] truncate text-sm font-semibold text-slate-900 dark:text-white">
          {productName}
        </p>
        <p className="font-[family-name:var(--font-body,Inter)] truncate text-[11px] text-slate-500 dark:text-slate-400">
          IKK Group
        </p>
      </div>
    </div>
  )
}

export function AppShell({
  children,
  navigationItems,
  user,
  roleLabels,
  onNavigate,
  onLogout,
  onSwitchRole,
  productName = 'Checker',
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  const handleNavigate = (href: string) => {
    setMobileOpen(false)
    onNavigate?.(href)
  }

  return (
    <div className="font-[family-name:var(--font-body,Inter)] flex min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      {/* Desktop sidebar — never overlays content; hidden when printing a report */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-slate-200 bg-slate-50 print:hidden dark:border-slate-800 dark:bg-slate-950 md:flex">
        <div className="border-b border-slate-200 dark:border-slate-800">
          <BrandBlock productName={productName} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <MainNav
            navigationItems={navigationItems as NavItem[]}
            onNavigate={handleNavigate}
          />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 start-0 flex w-[min(18rem,88vw)] flex-col bg-slate-50 shadow-2xl dark:bg-slate-950">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <BrandBlock productName={productName} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="me-3 rounded-lg p-2 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <MainNav
                navigationItems={navigationItems as NavItem[]}
                onNavigate={handleNavigate}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="relative z-0 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 print:hidden dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-700 md:hidden dark:text-slate-200">
              {productName}
            </p>
          </div>
          <UserMenu user={user} roleLabels={roleLabels} onLogout={onLogout} onSwitchRole={onSwitchRole} />
        </header>
        <main className="relative z-0 min-h-0 min-w-0 flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppShell
