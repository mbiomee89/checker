import { apiRequest } from './client';
import type { PriorityFlag } from '../sections/camp-supervisor-dashboard/types';

export function listPriorityFlags(campId: number) {
  return apiRequest<{ priorityFlags: PriorityFlag[] }>(`/priority-flags?campId=${campId}`);
}

export function addPriorityFlag(campId: number, checklistItemId: number, optionId: number) {
  return apiRequest<{ checklistItemId: number; optionId: number; campId: number }>('/priority-flags', {
    method: 'POST',
    body: { campId, checklistItemId, optionId },
  });
}

export function removePriorityFlag(campId: number, checklistItemId: number, optionId: number) {
  return apiRequest<void>('/priority-flags', {
    method: 'DELETE',
    body: { campId, checklistItemId, optionId },
  });
}
