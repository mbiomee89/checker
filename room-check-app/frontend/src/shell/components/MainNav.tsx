import {
  ClipboardCheck,
  LayoutDashboard,
  Settings2,
  Shield,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  isActive?: boolean
}

const ICONS: Record<string, LucideIcon> = {
  '/inspector-checklist': ClipboardCheck,
  inspector: ClipboardCheck,
  '/camp-supervisor-dashboard': LayoutDashboard,
  supervisor: LayoutDashboard,
  '/admin-configuration': Settings2,
  admin: Settings2,
  '/hse-overview': Shield,
  hse: Shield,
}

function resolveIcon(item: NavItem): LucideIcon {
  const key = item.href.toLowerCase()
  if (ICONS[key]) return ICONS[key]
  const label = item.label.toLowerCase()
  if (label.includes('inspector')) return ClipboardCheck
  if (label.includes('supervisor')) return LayoutDashboard
  if (label.includes('admin')) return Settings2
  if (label.includes('hse')) return Shield
  return ClipboardCheck
}

export type MainNavProps = {
  navigationItems: NavItem[]
  onNavigate?: (href: string) => void
}

export function MainNav({ navigationItems, onNavigate }: MainNavProps) {
  return (
    <nav className="flex flex-col gap-1 px-3 py-4" aria-label="Main">
      {navigationItems.map((item) => {
        const Icon = resolveIcon(item)
        const active = Boolean(item.isActive)
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => onNavigate?.(item.href)}
            className={[
              'font-[family-name:var(--font-heading,Manrope)] flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
              active
                ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-500'
                : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-900 dark:text-slate-300 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-100',
            ].join(' ')}
          >
            <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
