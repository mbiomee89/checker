import { apiRequest } from './client';

export type Role = 'INSPECTOR' | 'CAMP_SUPERVISOR' | 'ADMIN' | 'HSE_VIEWER';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  campId: number | null;
  roles: Role[];
  activeRole: Role;
  mustChangePassword: boolean;
}

export function login(email: string, password: string) {
  return apiRequest<{ token: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
}

export function me() {
  return apiRequest<{ user: AuthUser }>('/auth/me');
}

export function switchRole(role: Role) {
  return apiRequest<{ token: string; user: AuthUser }>('/auth/switch-role', {
    method: 'POST',
    body: { role },
  });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest<void>('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
}
