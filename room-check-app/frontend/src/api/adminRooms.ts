import { apiRequest } from './client';
import type { Room, DeletedRoom } from '../sections/admin-configuration/types';

export function listAdminRooms() {
  return apiRequest<{ rooms: Room[] }>('/admin/rooms');
}

export function listDeletedRooms() {
  return apiRequest<{ rooms: DeletedRoom[] }>('/admin/rooms/deleted');
}

export function deleteRoom(id: number, confirmRoomNumber: string) {
  return apiRequest<void>(`/admin/rooms/${id}`, { method: 'DELETE', body: { confirmRoomNumber } });
}

export function restoreRoom(id: number) {
  return apiRequest<{ room: Room }>(`/admin/rooms/${id}/restore`, { method: 'POST' });
}

export function createRoom(body: { roomNumber: string; campId: number; approvedCapacity: number | null }) {
  return apiRequest<{ room: Room }>('/admin/rooms', { method: 'POST', body });
}

export function updateRoom(
  id: number,
  body: { roomNumber: string; campId: number; approvedCapacity: number | null }
) {
  return apiRequest<{ room: Room }>(`/admin/rooms/${id}`, { method: 'PATCH', body });
}

export function setRoomActive(id: number, active: boolean) {
  return apiRequest<{ room: Room }>(`/admin/rooms/${id}/active`, { method: 'PATCH', body: { active } });
}

export function createRoomRange(body: {
  campId: number;
  startRoomNumber: number;
  endRoomNumber: number;
  approvedCapacity: number | null;
}) {
  return apiRequest<{ rooms: Room[] }>('/admin/rooms/range', { method: 'POST', body });
}
