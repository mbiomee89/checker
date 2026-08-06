import { createContext, useContext } from 'react';
import type { AuthUser } from '../api/auth';

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  bootstrapping: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export const ROLE_LABELS: Record<AuthUser['role'], string> = {
  INSPECTOR: 'Inspector',
  CAMP_SUPERVISOR: 'Camp Supervisor',
  ADMIN: 'Admin',
  HSE_VIEWER: 'HSE Viewer',
};
