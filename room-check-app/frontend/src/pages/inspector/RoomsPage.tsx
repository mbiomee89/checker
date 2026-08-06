import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { RoomTable } from '../../sections/inspector-checklist/components/RoomTable';
import type { Camp, RoomRow } from '../../sections/inspector-checklist/types';
import { listCamps } from '../../api/camps';
import { listRooms } from '../../api/rooms';
import { createInspection } from '../../api/inspections';
import { useAuth } from '../../lib/auth';

export default function RoomsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [roomRows, setRoomRows] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { camps } = await listCamps();
        if (cancelled) return;
        setCamps(camps);
        const rows = await Promise.all(camps.map((c) => listRooms(c.id)));
        if (cancelled) return;
        setRoomRows(rows.flatMap((r) => r.roomRows));
      } catch {
        if (!cancelled) setError('Could not load rooms. Please refresh.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStartInspection(roomId: number) {
    const { inspection } = await createInspection(roomId);
    navigate(`/inspections/${inspection.id}`);
  }

  if (loading) {
    return <div className="flex min-h-full items-center justify-center p-10 text-slate-500">Loading rooms…</div>;
  }
  if (error) {
    return <div className="p-10 text-red-600">{error}</div>;
  }
  if (!user) return null;

  return (
    <div>
      <div className="flex justify-end border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-950">
        <Link
          to="/rooms/activity"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline dark:text-blue-300"
        >
          <BarChart3 className="size-3.5" />
          Supervisor activity review
        </Link>
      </div>
      <RoomTable
        camps={camps}
        currentUser={{ id: user.id, name: user.name, role: user.activeRole }}
        roomRows={roomRows}
        onStartInspection={handleStartInspection}
        onResumeDraft={(id) => navigate(`/inspections/${id}`)}
        onViewSubmitted={(id) => navigate(`/inspections/${id}`)}
        onPreviewReport={(id) => navigate(`/inspections/${id}/report`)}
      />
    </div>
  );
}
