import { prisma } from '../utils/prisma.js';

// Builds the default selection for a brand-new DRAFT response on one checklist item.
// - Items with an isClearOption (canonical "OK") pre-select it.
// - Room cleanliness (rating scale, no OK) defaults to "Good".
// - COUNT-kind items (Furniture) and TEXT items start with no selection.
function defaultOptionIdsForItem(item) {
  if (item.inputType === 'TEXT') return [];
  const clearOption = item.options.find((o) => o.isClearOption);
  if (clearOption) return [clearOption.id];
  if (item.name === 'Room cleanliness') {
    const good = item.options.find((o) => o.label.startsWith('Good'));
    return good ? [good.id] : [];
  }
  return [];
}

export async function seedDefaultResponses(tx, inspectionId) {
  const items = await tx.checklistItem.findMany({
    where: { active: true },
    include: { options: { where: { active: true } } },
  });

  for (const item of items) {
    const response = await tx.inspectionResponse.create({
      data: { inspectionId, checklistItemId: item.id },
    });
    const defaultIds = defaultOptionIdsForItem(item);
    for (const optionId of defaultIds) {
      await tx.inspectionResponseOption.create({
        data: { responseId: response.id, optionId },
      });
    }
  }
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
    responses: inspection.responses.map((resp) => {
      const selectedOptionIds = resp.selectedOptions.filter((so) => so.option.kind === 'TOGGLE').map((so) => so.optionId);
      const optionCounts = {};
      for (const so of resp.selectedOptions) {
        if (so.option.kind === 'COUNT') optionCounts[so.optionId] = so.count ?? 0;
      }
      return {
        checklistItemId: resp.checklistItemId,
        commentText: resp.commentText,
        textValue: resp.textValue,
        selectedOptionIds,
        optionCounts,
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
