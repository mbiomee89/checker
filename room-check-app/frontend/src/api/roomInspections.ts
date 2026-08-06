import { apiRequest } from './client';
import type { RoomInspection } from '../sections/camp-supervisor-dashboard/types';

export function listLatestByRoom(campId: number) {
  return apiRequest<{ roomInspections: RoomInspection[] }>(`/inspections/latest-by-room?campId=${campId}`);
}
