import type { Camp } from '../sections/inspector-checklist/types';

/** Tab-local last camp for inspector rooms flow (fallback when URL has no campId). */
export const INSPECTOR_CAMP_STORAGE_KEY = 'checker-inspector-campId';

export function rememberInspectorCampId(campId: number) {
  try {
    sessionStorage.setItem(INSPECTOR_CAMP_STORAGE_KEY, String(campId));
  } catch {
    // Ignore quota / private-mode failures — URL still works.
  }
}

export function readRememberedInspectorCampId(): number | null {
  try {
    const raw = sessionStorage.getItem(INSPECTOR_CAMP_STORAGE_KEY);
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

/** URL param → sessionStorage → first camp; must be present in `camps`. */
export function resolveInspectorCampId(camps: Camp[], urlCampId: string | null): number | null {
  if (camps.length === 0) return null;
  const fromUrl = urlCampId != null && urlCampId !== '' ? Number(urlCampId) : NaN;
  if (Number.isFinite(fromUrl) && camps.some((c) => c.id === fromUrl)) return fromUrl;
  const remembered = readRememberedInspectorCampId();
  if (remembered != null && camps.some((c) => c.id === remembered)) return remembered;
  return camps[0].id;
}

export function roomsPathForCamp(campId: number) {
  return `/rooms?campId=${campId}`;
}
