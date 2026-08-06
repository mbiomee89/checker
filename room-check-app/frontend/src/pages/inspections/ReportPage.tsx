import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { InspectionReport } from '../../sections/inspector-checklist/components/InspectionReport';
import type { ActiveInspection, Camp, ChecklistItem, CorrectiveAction } from '../../sections/inspector-checklist/types';
import { getInspection } from '../../api/inspections';
import { listChecklistItems } from '../../api/checklistItems';
import { listCorrectiveActions } from '../../api/correctiveActions';

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const inspectionId = Number(id);
  const navigate = useNavigate();

  const [inspection, setInspection] = useState<ActiveInspection | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [{ inspection }, items] = await Promise.all([getInspection(inspectionId), listChecklistItems()]);
        if (cancelled) return;
        setInspection(inspection);
        setChecklistItems(items);
        const { correctiveActions } = await listCorrectiveActions(inspection.campId);
        if (cancelled) return;
        setCorrectiveActions(correctiveActions);
      } catch {
        if (!cancelled) setError('Could not load this report.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [inspectionId]);

  if (loading) {
    return <div className="flex min-h-full items-center justify-center p-10 text-slate-500">Loading…</div>;
  }
  if (error || !inspection) {
    return <div className="p-10 text-red-600">{error ?? 'Report not found.'}</div>;
  }

  const camp: Camp = { id: inspection.campId, name: inspection.campName, location: null };

  return (
    <InspectionReport
      camp={camp}
      checklistItems={checklistItems}
      inspection={inspection}
      correctiveActions={correctiveActions}
      onBack={() => navigate(-1)}
    />
  );
}
