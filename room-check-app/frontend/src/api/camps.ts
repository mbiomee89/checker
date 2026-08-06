import { apiRequest } from './client';
import type { Camp } from '../sections/inspector-checklist/types';

export function listCamps() {
  return apiRequest<{ camps: Camp[] }>('/camps');
}
