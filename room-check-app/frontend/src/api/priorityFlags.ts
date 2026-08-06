import { apiRequest } from './client';
import type { PriorityFlag } from '../sections/camp-supervisor-dashboard/types';

export function listPriorityFlags(campId: number) {
  return apiRequest<{ priorityFlags: PriorityFlag[] }>(`/priority-flags?campId=${campId}`);
}
