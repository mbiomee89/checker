import { apiRequest } from './client';
import type { ActiveInspection } from '../sections/inspector-checklist/types';

export function createInspection(roomId: number) {
  return apiRequest<{ inspection: ActiveInspection }>('/inspections', {
    method: 'POST',
    body: { roomId },
  });
}

export function getInspection(id: number) {
  return apiRequest<{ inspection: ActiveInspection }>(`/inspections/${id}`);
}

export interface PatchInspectionBody {
  headcount?: number | null;
  notes?: string | null;
  residentIdNumbers?: string[];
  responses?: Array<{
    checklistItemId: number;
    selectedOptionIds?: number[];
    counts?: Record<number, number>;
    textValue?: string | null;
    commentText?: string | null;
  }>;
}

export function patchInspection(id: number, body: PatchInspectionBody) {
  return apiRequest<{ inspection: ActiveInspection }>(`/inspections/${id}`, {
    method: 'PATCH',
    body,
  });
}

export function submitInspection(id: number) {
  return apiRequest<{ inspection: ActiveInspection }>(`/inspections/${id}/submit`, { method: 'POST' });
}

export function uploadInspectionPhoto(id: number, file: File) {
  const form = new FormData();
  form.append('photo', file);
  return apiRequest<{ photo: { id: number; url: string; mimeType: string } }>(`/inspections/${id}/photos`, {
    method: 'POST',
    body: form,
  });
}

export function deleteInspectionPhoto(id: number, photoId: number) {
  return apiRequest<void>(`/inspections/${id}/photos/${photoId}`, { method: 'DELETE' });
}
