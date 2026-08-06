// Single source of truth for role -> route access. Hiding nav items is not enough —
// the backend enforces the same rules (requireRole) independently of this file.
import type { Role } from '../api/auth';

export const ROLE_HOME: Record<Role, string> = {
  INSPECTOR: '/rooms',
  CAMP_SUPERVISOR: '/dashboard',
  ADMIN: '/admin',
  HSE_VIEWER: '/hse',
};

export interface NavEntry {
  label: string;
  href: string;
  roles: Role[];
  /** Secondary item nested under its parent section in the sidebar. */
  sub?: boolean;
}

export const NAV_CATALOG: NavEntry[] = [
  { label: 'Inspector Checklist', href: '/rooms', roles: ['INSPECTOR'] },
  { label: 'Supervisor Activity Review', href: '/rooms/activity', roles: ['INSPECTOR'], sub: true },
  { label: 'Camp Supervisor Dashboard', href: '/dashboard', roles: ['CAMP_SUPERVISOR'] },
  { label: 'Room List', href: '/dashboard/rooms', roles: ['CAMP_SUPERVISOR'], sub: true },
  { label: 'Admin Configuration', href: '/admin', roles: ['ADMIN'] },
  { label: 'HSE Overview', href: '/hse', roles: ['HSE_VIEWER'] },
];

export function navForRole(role: Role) {
  return NAV_CATALOG.filter((item) => item.roles.includes(role));
}

const SECTION_ALLOWED_ROLES: Record<string, Role[]> = {
  '/rooms': ['INSPECTOR'],
  '/dashboard': ['CAMP_SUPERVISOR'],
  '/admin': ['ADMIN'],
  '/hse': ['HSE_VIEWER'],
};

export function roleMayAccessPath(role: Role, pathname: string): boolean {
  const section = Object.keys(SECTION_ALLOWED_ROLES).find((prefix) => pathname.startsWith(prefix));
  if (!section) return true; // unlisted paths (e.g. /inspections/:id) are gated by their own page logic
  return SECTION_ALLOWED_ROLES[section].includes(role);
}
