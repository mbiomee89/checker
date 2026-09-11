import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { InspectionForm } from '../../sections/inspector-checklist/components/InspectionForm';
import type { ActiveInspection, Camp, ChecklistItem } from '../../sections/inspector-checklist/types';
import { listChecklistItems } from '../../api/checklistItems';
import {
  getInspection,
  patchInspection,
  submitInspection,
  reopenInspection,
  cancelInspection,
  uploadInspectionPhoto,
  deleteInspectionPhoto,
  type PatchInspectionBody,
} from '../../api/inspections';
import { ApiError } from '../../api/client';
import { useAuth } from '../../lib/auth';
import { rememberInspectorCampId, roomsPathForCamp } from '../../shared/inspectorCamp';

function uploadErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 408) {
    return 'Photo upload timed out. Try a smaller photo or better connection.';
  }
  if (err instanceof ApiError) return err.message;
  return 'Could not upload photo.';
}

function SuccessPopup({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspection-success-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Check className="size-6" strokeWidth={2.5} />
          </div>
          <h3 id="inspection-success-title" className="text-base font-semibold text-slate-900 dark:text-white">
            {message}
          </h3>
        </div>
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InspectionPage() {
  const { id } = useParams<{ id: string }>();
  const inspectionId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [inspection, setInspection] = useState<ActiveInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inspectionRef = useRef<ActiveInspection | null>(null);
  inspectionRef.current = inspection;

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
    setSuccess(null);
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
  const canEditSubmitted =
    inspection.status === 'SUBMITTED' &&
    user?.activeRole === 'INSPECTOR' &&
    user.id === inspection.inspectorId;

  function update(mutate: (insp: ActiveInspection) => ActiveInspection) {
    setInspection((prev) => (prev ? mutate(prev) : prev));
  }

  const goToRooms = () => {
    rememberInspectorCampId(inspection.campId);
    navigate(roomsPathForCamp(inspection.campId));
  };

  return (
    <div>
      {(saving || uploading || error) && (
        <div className="border-b border-slate-200 bg-white px-4 py-2 text-center text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-950">
          {error ? <span className="text-red-600">{error}</span> : uploading ? 'Uploading photo…' : 'Saving…'}
        </div>
      )}
      {success && <SuccessPopup message={success} onClose={() => setSuccess(null)} />}
      <InspectionForm
      camp={camp}
      checklistItems={checklistItems}
      inspection={inspection}
      uploading={uploading}
      saving={saving}
      onBack={goToRooms}
      onCancel={async () => {
        if (inspection.status !== 'DRAFT') {
          goToRooms();
          return;
        }
        const restoringSubmitted = Boolean(inspection.reopened);
        const ok = window.confirm(
          restoringSubmitted
            ? 'Discard edits and restore the previous submitted inspection? Any answers you already saved on this draft will stay on that record.'
            : 'Discard this draft inspection? This cannot be undone.',
        );
        if (!ok) return;
        setError(null);
        setSuccess(null);
        setSaving(true);
        try {
          await cancelInspection(inspection.id);
          goToRooms();
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.message
              : restoringSubmitted
                ? 'Could not restore the submitted inspection.'
                : 'Could not discard this draft.',
          );
        } finally {
          setSaving(false);
        }
      }}
      onEdit={
        canEditSubmitted
          ? async () => {
              setError(null);
              setSuccess(null);
              setSaving(true);
              try {
                const { inspection: reopened } = await reopenInspection(inspection.id);
                setInspection(reopened);
                setSuccess('Reopened for editing.');
              } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Could not reopen this inspection.');
              } finally {
                setSaving(false);
              }
            }
          : undefined
      }
      onSaveDraft={() => {
        persist(inspection)
          .then(() => setSuccess('Save completed.'))
          .catch(() => {});
      }}
      onSubmit={async () => {
        if (uploading) return;
        try {
          const saved = await persist(inspection);
          const { inspection: submitted } = await submitInspection(saved.id);
          setError(null);
          setInspection(submitted);
          setSuccess('Save completed.');
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
        setUploading(true);
        setError(null);
        setSuccess(null);
        try {
          const { photo } = await uploadInspectionPhoto(inspection.id, file);
          setError(null);
          update((insp) => ({ ...insp, photos: [...insp.photos, photo] }));
        } catch (err) {
          // Ignore late failures if the inspection was already submitted.
          if (inspectionRef.current?.status === 'DRAFT') {
            setError(uploadErrorMessage(err));
          }
        } finally {
          setUploading(false);
        }
      }}
      onRemovePhoto={async (photoId) => {
        try {
          await deleteInspectionPhoto(inspection.id, photoId);
          setError(null);
          setSuccess(null);
          update((insp) => ({ ...insp, photos: insp.photos.filter((p) => p.id !== photoId) }));
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Could not remove photo.');
        }
      }}
      />
    </div>
  );
}
