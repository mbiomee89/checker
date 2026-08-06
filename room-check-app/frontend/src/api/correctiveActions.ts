import { apiRequest } from './client';
import type { ActionStatus, CorrectiveAction } from '../sections/camp-supervisor-dashboard/types';

export function listCorrectiveActions(campId: number) {
  return apiRequest<{ correctiveActions: CorrectiveAction[] }>(`/corrective-actions?campId=${campId}`);
}

export interface AddCorrectiveActionBody {
  roomId: number;
  checklistItemId: number;
  optionId: number;
  note: string;
  dueDate: string | null;
  status: ActionStatus;
}

export function addCorrectiveAction(body: AddCorrectiveActionBody) {
  return apiRequest<{ correctiveAction: CorrectiveAction }>('/corrective-actions', {
    method: 'POST',
    body,
  });
}

export function setCorrectiveActionStatus(id: number, status: ActionStatus, note: string) {
  return apiRequest<{ correctiveAction: CorrectiveAction }>(`/corrective-actions/${id}`, {
    method: 'PATCH',
    body: { status, note },
  });
}
