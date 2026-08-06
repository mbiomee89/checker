import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '../lib/auth';
import { AppShell } from '../shell/components';
import { navForRole, roleMayAccessPath, ROLE_HOME } from '../shared/accessControl';

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  if (!roleMayAccessPath(user.role, location.pathname)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  const navigationItems = navForRole(user.role).map((item) => ({
    ...item,
    isActive: location.pathname.startsWith(item.href),
  }));

  return (
    <AppShell
      navigationItems={navigationItems}
      user={{ name: user.name, roles: [user.role], activeRole: user.role }}
      roleLabels={ROLE_LABELS}
      onNavigate={(href) => navigate(href)}
      onLogout={logout}
    >
      <Outlet />
    </AppShell>
  );
}
