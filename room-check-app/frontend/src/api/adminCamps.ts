import { apiRequest } from './client';
import type { Camp, DeletedCamp } from '../sections/admin-configuration/types';

export function listAdminCamps() {
  return apiRequest<{ camps: Camp[] }>('/admin/camps');
}

export function listDeletedCamps() {
  return apiRequest<{ camps: DeletedCamp[] }>('/admin/camps/deleted');
}

export function deleteCamp(id: number, confirmName: string) {
  return apiRequest<void>(`/admin/camps/${id}`, { method: 'DELETE', body: { confirmName } });
}

export function restoreCamp(id: number) {
  return apiRequest<{ camp: Camp }>(`/admin/camps/${id}/restore`, { method: 'POST' });
}

export function createCamp(body: { name: string; location: string | null }) {
  return apiRequest<{ camp: Camp }>('/admin/camps', { method: 'POST', body });
}

export function updateCamp(id: number, body: { name: string; location: string | null }) {
  return apiRequest<{ camp: Camp }>(`/admin/camps/${id}`, { method: 'PATCH', body });
}

export function setCampActive(id: number, active: boolean) {
  return apiRequest<{ camp: Camp }>(`/admin/camps/${id}/active`, { method: 'PATCH', body: { active } });
}
