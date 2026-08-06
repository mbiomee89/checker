import { prisma } from '../utils/prisma.js';

// Creates a blank DRAFT response for every active checklist item on a new inspection —
// no option is pre-selected (not even the "OK" isClearOption or the Cleanliness rating);
// the inspector must actively choose every finding.
export async function seedDefaultResponses(tx, inspectionId) {
  const items = await tx.checklistItem.findMany({
    where: { active: true },
    include: { options: { where: { active: true } } },
  });

  for (const item of items) {
    await tx.inspectionResponse.create({
      data: { inspectionId, checklistItemId: item.id },
    });
  }
}

// Splits an InspectionResponse's selectedOptions into TOGGLE ids vs COUNT quantities —
// the one place that encodes this so callers never re-derive it independently.
export function mapResponses(responses) {
  return responses.map((resp) => {
    const selectedOptionIds = resp.selectedOptions.filter((so) => so.option.kind === 'TOGGLE').map((so) => so.optionId);
    const optionCounts = {};
    for (const so of resp.selectedOptions) {
      if (so.option.kind === 'COUNT') optionCounts[so.optionId] = so.count ?? 0;
    }
    return { checklistItemId: resp.checklistItemId, selectedOptionIds, optionCounts };
  });
}

export function serializeInspection(inspection) {
  return {
    id: inspection.id,
    roomId: inspection.roomId,
    roomNumber: inspection.room.roomNumber,
    approvedCapacity: inspection.room.approvedCapacity,
    campId: inspection.campId,
    campName: inspection.camp.name,
    status: inspection.status,
    readOnly: inspection.status !== 'DRAFT',
    headcount: inspection.headcount,
    notes: inspection.notes,
    inspectedAt: inspection.inspectedAt,
    inspectorId: inspection.inspectorId,
    residents: inspection.residents.map((r) => ({ id: r.id, residentIdNumber: r.residentIdNumber })),
    photos: inspection.photos.map((p) => ({ id: p.id, url: `/uploads/inspection-photos/${p.filePath}`, mimeType: p.mimeType })),
    responses: mapResponses(inspection.responses).map((mapped, i) => {
      const resp = inspection.responses[i];
      return {
        ...mapped,
        commentText: resp.commentText,
        textValue: resp.textValue,
      };
    }),
  };
}

export const inspectionInclude = {
  room: true,
  camp: true,
  residents: true,
  photos: true,
  responses: {
    include: {
      selectedOptions: { include: { option: true } },
    },
  },
};
