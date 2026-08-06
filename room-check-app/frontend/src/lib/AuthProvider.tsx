import { useEffect, useState, type ReactNode } from 'react';
import { AuthContext } from './auth';
import * as authApi from '../api/auth';
import { getToken, setToken as persistToken } from '../api/client';
import type { AuthUser, Role } from '../api/auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!token) {
        setBootstrapping(false);
        return;
      }
      try {
        const { user } = await authApi.me();
        if (!cancelled) setUser(user);
      } catch {
        if (!cancelled) {
          persistToken(null);
          setTokenState(null);
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    const { token, user } = await authApi.login(email, password);
    persistToken(token);
    setTokenState(token);
    setUser(user);
  }

  function logout() {
    persistToken(null);
    setTokenState(null);
    setUser(null);
  }

  async function switchRole(role: Role) {
    const { token, user } = await authApi.switchRole(role);
    persistToken(token);
    setTokenState(token);
    setUser(user);
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await authApi.changePassword(currentPassword, newPassword);
    setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        bootstrapping,
        isAuthenticated: Boolean(user && token),
        login,
        logout,
        switchRole,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
