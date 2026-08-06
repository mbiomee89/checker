import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SupervisorActivityReview } from '../../sections/inspector-checklist/components/SupervisorActivityReview';
import type { Camp, ChecklistItem, CorrectiveAction, PriorityFlag, RoomInspection } from '../../sections/inspector-checklist/types';
import { listCamps } from '../../api/camps';
import { listChecklistItems } from '../../api/checklistItems';
import { listLatestByRoom } from '../../api/roomInspections';
import { listCorrectiveActions } from '../../api/correctiveActions';
import { listPriorityFlags, addPriorityFlag, removePriorityFlag } from '../../api/priorityFlags';
import { useAuth } from '../../lib/auth';

export default function ActivityReviewPage() {
  const { user } = useAuth();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [campId, setCampId] = useState<number | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [roomInspections, setRoomInspections] = useState<RoomInspection[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([]);
  const [priorityFlags, setPriorityFlags] = useState<PriorityFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCampData = useCallback(async (id: number) => {
    const [ri, actions, flags] = await Promise.all([
      listLatestByRoom(id),
      listCorrectiveActions(id),
      listPriorityFlags(id),
    ]);
    setRoomInspections(ri.roomInspections);
    setCorrectiveActions(actions.correctiveActions);
    setPriorityFlags(flags.priorityFlags);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [{ camps }, items] = await Promise.all([listCamps(), listChecklistItems()]);
        if (cancelled) return;
        setCamps(camps);
        setChecklistItems(items);
        const firstCamp = camps[0];
        if (firstCamp) {
          setCampId(firstCamp.id);
          await loadCampData(firstCamp.id);
        }
      } catch {
        if (!cancelled) setError('Could not load activity review data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [loadCampData]);

  async function handleSelectCamp(id: number) {
    setCampId(id);
    setLoading(true);
    try {
      await loadCampData(id);
    } catch {
      setError('Could not load activity review data.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-full items-center justify-center p-10 text-slate-500">Loading…</div>;
  }
  if (error || !user) {
    return <div className="p-10 text-red-600">{error}</div>;
  }
  const camp = camps.find((c) => c.id === campId);
  if (!camp) {
    return <div className="p-10 text-slate-500">No camps available.</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-950">
        <Link
          to="/rooms"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline dark:text-blue-300"
        >
          <ArrowLeft className="size-3.5" />
          Rooms
        </Link>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          Camp
          <select
            value={campId ?? ''}
            onChange={(e) => handleSelectCamp(Number(e.target.value))}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
          >
            {camps.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <SupervisorActivityReview
        camp={camp}
        checklistItems={checklistItems}
        roomInspections={roomInspections}
        correctiveActions={correctiveActions}
        priorityFlags={priorityFlags}
        onTogglePriority={async (checklistItemId, optionId) => {
          if (!campId) return;
          const isFlagged = priorityFlags.some((f) => f.checklistItemId === checklistItemId && f.optionId === optionId);
          if (isFlagged) await removePriorityFlag(campId, checklistItemId, optionId);
          else await addPriorityFlag(campId, checklistItemId, optionId);
          await loadCampData(campId);
        }}
      />
    </div>
  );
}
