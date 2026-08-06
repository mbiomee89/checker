import { apiRequest } from './client';
import type { ChecklistItem, InputType, OptionKind } from '../sections/admin-configuration/types';

export function listAdminChecklistItems() {
  return apiRequest<{ checklistItems: ChecklistItem[] }>('/admin/checklist-items');
}

export function createChecklistItem(body: { name: string; inputType: InputType }) {
  return apiRequest<{ checklistItem: ChecklistItem }>('/admin/checklist-items', { method: 'POST', body });
}

export function updateChecklistItem(id: number, body: { name: string; inputType: InputType }) {
  return apiRequest<{ checklistItem: ChecklistItem }>(`/admin/checklist-items/${id}`, { method: 'PATCH', body });
}

export function setChecklistItemActive(id: number, active: boolean) {
  return apiRequest<{ checklistItem: ChecklistItem }>(`/admin/checklist-items/${id}/active`, {
    method: 'PATCH',
    body: { active },
  });
}

interface OptionBody {
  label: string;
  isClearOption: boolean;
  kind: OptionKind;
  requiresAction: boolean;
}

export function createOption(itemId: number, body: OptionBody) {
  return apiRequest<{ checklistItem: ChecklistItem }>(`/admin/checklist-items/${itemId}/options`, {
    method: 'POST',
    body,
  });
}

export function updateOption(itemId: number, optionId: number, body: OptionBody) {
  return apiRequest<{ checklistItem: ChecklistItem }>(`/admin/checklist-items/${itemId}/options/${optionId}`, {
    method: 'PATCH',
    body,
  });
}

export function setOptionActive(itemId: number, optionId: number, active: boolean) {
  return apiRequest<{ checklistItem: ChecklistItem }>(
    `/admin/checklist-items/${itemId}/options/${optionId}/active`,
    { method: 'PATCH', body: { active } }
  );
}
