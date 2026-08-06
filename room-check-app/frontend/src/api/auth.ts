import { apiRequest } from './client';

export type Role = 'INSPECTOR' | 'CAMP_SUPERVISOR' | 'ADMIN' | 'HSE_VIEWER';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  campId: number | null;
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
