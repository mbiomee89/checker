import { apiRequest } from './client';
import type { AdminUser, UserRole } from '../sections/admin-configuration/types';

export function listAdminUsers() {
  return apiRequest<{ users: AdminUser[] }>('/admin/users');
}

export function createUser(body: { name: string; email: string; roles: UserRole[]; campId: number | null }) {
  return apiRequest<{ user: AdminUser }>('/admin/users', { method: 'POST', body });
}

export function updateUser(
  id: number,
  body: { name: string; email: string; roles: UserRole[]; campId: number | null }
) {
  return apiRequest<{ user: AdminUser }>(`/admin/users/${id}`, { method: 'PATCH', body });
}

export function setUserActive(id: number, active: boolean) {
  return apiRequest<{ user: AdminUser }>(`/admin/users/${id}/active`, { method: 'PATCH', body: { active } });
}

export function generateCredentials(id: number) {
  return apiRequest<{ tempPassword: string }>(`/admin/users/${id}/generate-credentials`, { method: 'POST' });
}
