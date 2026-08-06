import { useEffect, useState } from 'react';
import { HSEOverview } from '../../sections/hse-overview/components/HSEOverview';
import type {
  Camp,
  ChecklistItem,
  CampRoomInspection,
  InspectionCycle,
  CorrectiveAction,
  PriorityFlag,
} from '../../sections/hse-overview/types';
import { listCamps } from '../../api/camps';
import { listChecklistItems } from '../../api/checklistItems';
import { listHseRoomInspections, listHseInspectionCycles, listHseCorrectiveActions, listHsePriorityFlags } from '../../api/hse';

export default function HseDashboardPage() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [roomInspections, setRoomInspections] = useState<CampRoomInspection[]>([]);
  const [inspectionCycles, setInspectionCycles] = useState<InspectionCycle[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([]);
  const [priorityFlags, setPriorityFlags] = useState<PriorityFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [c, items, ri, cycles, actions, flags] = await Promise.all([
          listCamps(),
          listChecklistItems(),
          listHseRoomInspections(),
          listHseInspectionCycles(),
          listHseCorrectiveActions(),
          listHsePriorityFlags(),
        ]);
        if (cancelled) return;
        setCamps(c.camps);
        setChecklistItems(items);
        setRoomInspections(ri.roomInspections);
        setInspectionCycles(cycles.inspectionCycles);
        setCorrectiveActions(actions.correctiveActions);
        setPriorityFlags(flags.priorityFlags);
      } catch {
        if (!cancelled) setError('Could not load HSE overview data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="flex min-h-full items-center justify-center p-10 text-slate-500">Loading…</div>;
  }
  if (error) {
    return <div className="p-10 text-red-600">{error}</div>;
  }

  return (
    <HSEOverview
      camps={camps}
      checklistItems={checklistItems}
      roomInspections={roomInspections}
      inspectionCycles={inspectionCycles}
      correctiveActions={correctiveActions}
      priorityFlags={priorityFlags}
    />
  );
}
