import { apiRequest } from './client';
import type { ChecklistItem } from '../sections/inspector-checklist/types';

interface RawOption {
  id: number;
  label: string;
  isClearOption: boolean;
  sortOrder: number;
  kind: 'TOGGLE' | 'COUNT';
}

interface RawChecklistItem {
  id: number;
  sequenceNo: number;
  name: string;
  inputType: 'SINGLE_SELECT' | 'MULTI_SELECT' | 'TEXT';
  options: RawOption[];
}

export async function listChecklistItems(): Promise<ChecklistItem[]> {
  const { checklistItems } = await apiRequest<{ checklistItems: RawChecklistItem[] }>('/checklist-items');
  return checklistItems.map((item) => ({
    id: item.id,
    sequenceNo: item.sequenceNo,
    name: item.name,
    inputType: item.inputType,
    options: item.options.map((o) => ({
      id: o.id,
      label: o.label,
      isClearOption: o.isClearOption,
      sortOrder: o.sortOrder,
      kind: o.kind === 'COUNT' ? 'count' : 'toggle',
    })),
  }));
}
