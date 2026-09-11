import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RoomTable } from '../../sections/inspector-checklist/components/RoomTable';
import type { Camp, RoomRow } from '../../sections/inspector-checklist/types';
import { listCamps } from '../../api/camps';
import { listRooms } from '../../api/rooms';
import { createInspection } from '../../api/inspections';
import { useAuth } from '../../lib/auth';
import { rememberInspectorCampId, resolveInspectorCampId } from '../../shared/inspectorCamp';

export default function RoomsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCampId = searchParams.get('campId');
  const [camps, setCamps] = useState<Camp[]>([]);
  const [roomRows, setRoomRows] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampId, setSelectedCampId] = useState<number | null>(null);

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

  // Keep selection in sync when URL campId changes without remounting (e.g. sidebar → /rooms).
  useEffect(() => {
    if (camps.length === 0) return;
    const resolved = resolveInspectorCampId(camps, urlCampId);
    if (resolved == null) {
      setSelectedCampId(null);
      return;
    }
    setSelectedCampId(resolved);
    rememberInspectorCampId(resolved);
    if (urlCampId !== String(resolved)) {
      setSearchParams({ campId: String(resolved) }, { replace: true });
    }
  }, [camps, urlCampId, setSearchParams]);

  const handleSelectedCampChange = useCallback(
    (campId: number) => {
      setSelectedCampId(campId);
      rememberInspectorCampId(campId);
      setSearchParams({ campId: String(campId) }, { replace: true });
    },
    [setSearchParams],
  );

  function openInspection(inspectionId: number) {
    if (selectedCampId != null) rememberInspectorCampId(selectedCampId);
    navigate(`/inspections/${inspectionId}`);
  }

  async function handleStartInspection(roomId: number) {
    const { inspection } = await createInspection(roomId);
    rememberInspectorCampId(inspection.campId);
    navigate(`/inspections/${inspection.id}`);
  }

  if (loading) {
    return <div className="flex min-h-full items-center justify-center p-10 text-slate-500">Loading rooms…</div>;
  }
  if (error) {
    return <div className="p-10 text-red-600">{error}</div>;
  }
  if (!user) return null;
  if (camps.length === 0 || selectedCampId == null) {
    return <div className="p-10 text-slate-500">No camps available.</div>;
  }

  return (
    <RoomTable
      camps={camps}
      currentUser={{ id: user.id, name: user.name, role: user.activeRole }}
      roomRows={roomRows}
      selectedCampId={selectedCampId}
      onSelectedCampChange={handleSelectedCampChange}
      onStartInspection={handleStartInspection}
      onResumeDraft={openInspection}
      onViewSubmitted={openInspection}
      onPreviewReport={(id) => {
        if (selectedCampId != null) rememberInspectorCampId(selectedCampId);
        navigate(`/inspections/${id}/report`);
      }}
    />
  );
}
