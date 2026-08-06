import { mapResponses } from './inspections.js';

export function serializeCampRoomInspection(room, inspection) {
  return {
    roomId: room.id,
    roomNumber: room.roomNumber,
    campId: room.campId,
    campName: room.camp.name,
    approvedCapacity: room.approvedCapacity,
    inspectedAt: inspection.inspectedAt,
    inspectorName: inspection.inspector.name,
    headcount: inspection.headcount,
    responses: mapResponses(inspection.responses),
  };
}

// Last `count` calendar months as "YYYY-MM" strings, oldest first, including the current month.
export function monthRange(count) {
  const months = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export function monthOf(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
