import { useCallback, useEffect, useState } from 'react';
import { CampSupervisorDashboard } from '../../sections/camp-supervisor-dashboard/components/CampSupervisorDashboard';
import type {
  Camp,
  ChecklistItem,
  CorrectiveAction,
  PriorityFlag,
  RoomInspection,
} from '../../sections/camp-supervisor-dashboard/types';
import { useAuth } from '../../lib/auth';
import { listCamps } from '../../api/camps';
import { listChecklistItems } from '../../api/checklistItems';
import { listLatestByRoom } from '../../api/roomInspections';
import { listCorrectiveActions, addCorrectiveAction, setCorrectiveActionStatus } from '../../api/correctiveActions';
import { listPriorityFlags } from '../../api/priorityFlags';

export default function DashboardPage() {
  const { user } = useAuth();
  const [camp, setCamp] = useState<Camp | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [roomInspections, setRoomInspections] = useState<RoomInspection[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([]);
  const [priorityFlags, setPriorityFlags] = useState<PriorityFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCampData = useCallback(async (campId: number) => {
    const [items, { roomInspections }, { correctiveActions }, { priorityFlags }] = await Promise.all([
      listChecklistItems(),
      listLatestByRoom(campId),
      listCorrectiveActions(campId),
      listPriorityFlags(campId),
    ]);
    setChecklistItems(items);
    setRoomInspections(roomInspections);
    setCorrectiveActions(correctiveActions);
    setPriorityFlags(priorityFlags);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { camps } = await listCamps();
        const myCamp = camps[0];
        if (!myCamp) throw new Error('No camp assigned');
        if (cancelled) return;
        setCamp(myCamp);
        await loadCampData(myCamp.id);
      } catch {
        if (!cancelled) setError('Could not load your camp dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [loadCampData]);

  if (loading) {
    return <div className="flex min-h-full items-center justify-center p-10 text-slate-500">Loading…</div>;
  }
  if (error || !camp || !user) {
    return <div className="p-10 text-red-600">{error ?? 'No camp assigned to your account.'}</div>;
  }

  return (
    <div>
      <CampSupervisorDashboard
        camp={camp}
        currentUser={{ id: user.id, name: user.name }}
        checklistItems={checklistItems}
        roomInspections={roomInspections}
        correctiveActions={correctiveActions}
        priorityFlags={priorityFlags}
        onAddAction={async ({ roomId, checklistItemId, optionId, note, dueDate, status }) => {
          await addCorrectiveAction({ roomId, checklistItemId, optionId, note, dueDate, status });
          await loadCampData(camp.id);
        }}
        onSetActionStatus={async (actionId, status, note) => {
          await setCorrectiveActionStatus(actionId, status, note);
          await loadCampData(camp.id);
        }}
      />
    </div>
  );
}
