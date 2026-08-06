import { apiRequest } from './client';
import type {
  CampRoomInspection,
  InspectionCycle,
  CorrectiveAction,
  PriorityFlag,
} from '../sections/hse-overview/types';

export function listHseRoomInspections() {
  return apiRequest<{ roomInspections: CampRoomInspection[] }>('/hse/room-inspections');
}

export function listHseInspectionCycles(months = 6) {
  return apiRequest<{ inspectionCycles: InspectionCycle[] }>(`/hse/inspection-cycles?months=${months}`);
}

export function listHseCorrectiveActions() {
  return apiRequest<{ correctiveActions: CorrectiveAction[] }>('/hse/corrective-actions');
}

export function listHsePriorityFlags() {
  return apiRequest<{ priorityFlags: PriorityFlag[] }>('/hse/priority-flags');
}
