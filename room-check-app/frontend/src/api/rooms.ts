import { apiRequest } from './client';
import type { RoomRow } from '../sections/inspector-checklist/types';

export function listRooms(campId: number) {
  return apiRequest<{ roomRows: RoomRow[] }>(`/rooms?campId=${campId}`);
}
