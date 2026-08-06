import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '../lib/auth';
import { AppShell } from '../shell/components';
import { navForRole, roleMayAccessPath, ROLE_HOME } from '../shared/accessControl';
import ForceChangePassword from '../components/ForceChangePassword';
import type { Role } from '../api/auth';

export function RequireAuth() {
  const { isAuthenticated, bootstrapping } = useAuth();
  const location = useLocation();

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function AppLayout() {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  if (user.mustChangePassword) {
    return <ForceChangePassword />;
  }

  if (!roleMayAccessPath(user.activeRole, location.pathname)) {
    return <Navigate to={ROLE_HOME[user.activeRole]} replace />;
  }

  // Longest matching href wins so e.g. /rooms/activity only highlights the
  // "Supervisor Activity Review" sub-item, not also its "Inspector Checklist" parent.
  const roleNav = navForRole(user.activeRole);
  const matchingHrefs = roleNav.map((item) => item.href).filter((href) => location.pathname.startsWith(href));
  const bestMatch = matchingHrefs.sort((a, b) => b.length - a.length)[0];
  const navigationItems = roleNav.map((item) => ({
    ...item,
    isActive: item.href === bestMatch,
  }));

  async function handleSwitchRole(role: string) {
    await switchRole(role as Role);
    navigate(ROLE_HOME[role as Role]);
  }

  return (
    <AppShell
      navigationItems={navigationItems}
      user={{ name: user.name, roles: user.roles, activeRole: user.activeRole }}
      roleLabels={ROLE_LABELS}
      onNavigate={(href) => navigate(href)}
      onLogout={logout}
      onSwitchRole={handleSwitchRole}
    >
      <Outlet />
    </AppShell>
  );
}
