import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { InspectionForm } from '../../sections/inspector-checklist/components/InspectionForm';
import type { ActiveInspection, Camp, ChecklistItem } from '../../sections/inspector-checklist/types';
import { listChecklistItems } from '../../api/checklistItems';
import {
  getInspection,
  patchInspection,
  submitInspection,
  uploadInspectionPhoto,
  deleteInspectionPhoto,
  type PatchInspectionBody,
} from '../../api/inspections';
import { ApiError } from '../../api/client';

export default function InspectionPage() {
  const { id } = useParams<{ id: string }>();
  const inspectionId = Number(id);
  const navigate = useNavigate();

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [inspection, setInspection] = useState<ActiveInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [items, { inspection }] = await Promise.all([listChecklistItems(), getInspection(inspectionId)]);
        if (cancelled) return;
        setChecklistItems(items);
        setInspection(inspection);
      } catch {
        if (!cancelled) setError('Could not load this inspection.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [inspectionId]);

  const buildPatchBody = useCallback((insp: ActiveInspection): PatchInspectionBody => ({
    headcount: insp.headcount,
    notes: insp.notes,
    residentIdNumbers: insp.residents.map((r) => r.residentIdNumber),
    responses: insp.responses.map((r) => ({
      checklistItemId: r.checklistItemId,
      selectedOptionIds: r.selectedOptionIds,
      counts: r.optionCounts,
      textValue: r.textValue ?? null,
    })),
  }), []);

  async function persist(insp: ActiveInspection) {
    setSaving(true);
    setError(null);
    try {
      const { inspection: saved } = await patchInspection(insp.id, buildPatchBody(insp));
      setInspection(saved);
      return saved;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save changes.');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-full items-center justify-center p-10 text-slate-500">Loading…</div>;
  }
  if (error && !inspection) {
    return <div className="p-10 text-red-600">{error}</div>;
  }
  if (!inspection) return null;

  const camp: Camp = { id: inspection.campId, name: inspection.campName, location: null };

  function update(mutate: (insp: ActiveInspection) => ActiveInspection) {
    setInspection((prev) => (prev ? mutate(prev) : prev));
  }

  return (
    <div>
      {(saving || error) && (
        <div className="border-b border-slate-200 bg-white px-4 py-2 text-center text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-950">
          {error ? <span className="text-red-600">{error}</span> : 'Saving…'}
        </div>
      )}
      <InspectionForm
      camp={camp}
      checklistItems={checklistItems}
      inspection={inspection}
      onBack={() => navigate('/rooms')}
      onCancel={() => navigate('/rooms')}
      onSaveDraft={() => {
        persist(inspection).catch(() => {});
      }}
      onSubmit={async () => {
        try {
          const saved = await persist(inspection);
          const { inspection: submitted } = await submitInspection(saved.id);
          setInspection(submitted);
        } catch {
          // error already surfaced via `error` state
        }
      }}
      onHeadcountChange={(headcount) => update((insp) => ({ ...insp, headcount }))}
      onNotesChange={(notes) => update((insp) => ({ ...insp, notes }))}
      onAddResident={(residentIdNumber) =>
        update((insp) => ({
          ...insp,
          residents: [...insp.residents, { id: -Date.now(), residentIdNumber }],
        }))
      }
      onRemoveResident={(residentId) =>
        update((insp) => ({ ...insp, residents: insp.residents.filter((r) => r.id !== residentId) }))
      }
      onSelectOptions={(checklistItemId, optionIds) =>
        update((insp) => ({
          ...insp,
          responses: insp.responses.map((r) =>
            r.checklistItemId === checklistItemId ? { ...r, selectedOptionIds: optionIds } : r
          ),
        }))
      }
      onCountChange={(checklistItemId, optionId, value) =>
        update((insp) => ({
          ...insp,
          responses: insp.responses.map((r) =>
            r.checklistItemId === checklistItemId
              ? { ...r, optionCounts: { ...r.optionCounts, [optionId]: value } }
              : r
          ),
        }))
      }
      onTextChange={(checklistItemId, value) =>
        update((insp) => ({
          ...insp,
          responses: insp.responses.map((r) => (r.checklistItemId === checklistItemId ? { ...r, textValue: value } : r)),
        }))
      }
      onUploadPhoto={async (file) => {
        try {
          const { photo } = await uploadInspectionPhoto(inspection.id, file);
          update((insp) => ({ ...insp, photos: [...insp.photos, photo] }));
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Could not upload photo.');
        }
      }}
      onRemovePhoto={async (photoId) => {
        try {
          await deleteInspectionPhoto(inspection.id, photoId);
          update((insp) => ({ ...insp, photos: insp.photos.filter((p) => p.id !== photoId) }));
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Could not remove photo.');
        }
      }}
      />
    </div>
  );
}
