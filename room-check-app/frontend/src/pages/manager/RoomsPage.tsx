import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SupervisorRoomList } from '../../sections/camp-supervisor-dashboard/components/SupervisorRoomList';
import type { Camp, RoomRow } from '../../sections/camp-supervisor-dashboard/types';
import { listCamps } from '../../api/camps';
import { listRooms } from '../../api/rooms';

export default function RoomsPage() {
  const navigate = useNavigate();
  const [camp, setCamp] = useState<Camp | null>(null);
  const [roomRows, setRoomRows] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { camps } = await listCamps();
        const myCamp = camps[0];
        if (!myCamp) throw new Error('No camp assigned');
        if (cancelled) return;
        setCamp(myCamp);
        const { roomRows } = await listRooms(myCamp.id);
        if (cancelled) return;
        setRoomRows(roomRows);
      } catch {
        if (!cancelled) setError('Could not load rooms.');
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
  if (error || !camp) {
    return <div className="p-10 text-red-600">{error ?? 'No camp assigned to your account.'}</div>;
  }

  return (
    <div>
      <div className="border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-950">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline dark:text-blue-300"
        >
          <ArrowLeft className="size-3.5" />
          Dashboard
        </Link>
      </div>
      <SupervisorRoomList camp={camp} roomRows={roomRows} onPreviewReport={(id) => navigate(`/inspections/${id}/report`)} />
    </div>
  );
}
