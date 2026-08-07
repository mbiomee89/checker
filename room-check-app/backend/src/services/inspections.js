import { prisma } from '../utils/prisma.js';
import { badRequest } from '../utils/errors.js';

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

// An item counts as "answered" for submit-completeness purposes if it has at least one
// InspectionResponseOption row — that covers both TOGGLE selections (including OK) and
// COUNT entries (a Furniture count the inspector actually typed), since both land in the
// same selectedOptions relation. TEXT items (Additional Notes) are always optional.
export function isItemAnswered(item, response) {
  if (item.inputType === 'TEXT') return true;
  return (response?.selectedOptions?.length ?? 0) > 0;
}

// Validates a PATCH /:id responses[] payload against the real checklist config before
// it's persisted — every optionId must belong to the checklistItem it's posted under and
// match the right kind (TOGGLE ids only in selectedOptionIds, COUNT ids only in counts),
// and TOGGLE selections must respect OK-exclusivity / SINGLE_SELECT single-pick server-side
// (the client already does this, but the API must not trust it).
export async function validateResponsePayload(client, responses) {
  if (!responses || responses.length === 0) return;
  const itemIds = [...new Set(responses.map((r) => r.checklistItemId))];
  const items = await client.checklistItem.findMany({
    where: { id: { in: itemIds } },
    include: { options: true },
  });
  const itemsById = new Map(items.map((i) => [i.id, i]));

  for (const r of responses) {
    const item = itemsById.get(r.checklistItemId);
    if (!item) throw badRequest(`Unknown checklist item ${r.checklistItemId}`);
    const optionsById = new Map(item.options.map((o) => [o.id, o]));

    const selectedIds = r.selectedOptionIds ?? [];
    for (const id of selectedIds) {
      const opt = optionsById.get(id);
      if (!opt || opt.kind !== 'TOGGLE') {
        throw badRequest(`Option ${id} is not a valid selection for "${item.name}"`);
      }
    }
    for (const optionIdStr of Object.keys(r.counts ?? {})) {
      const opt = optionsById.get(Number(optionIdStr));
      if (!opt || opt.kind !== 'COUNT') {
        throw badRequest(`Option ${optionIdStr} is not a valid count field for "${item.name}"`);
      }
    }

    const selectedOptions = selectedIds.map((id) => optionsById.get(id));
    const hasClear = selectedOptions.some((o) => o.isClearOption);
    const hasIssue = selectedOptions.some((o) => !o.isClearOption);
    if (hasClear && hasIssue) {
      throw badRequest(`"OK" cannot be combined with other findings on "${item.name}"`);
    }
    if (item.inputType === 'SINGLE_SELECT' && selectedIds.length > 1) {
      throw badRequest(`"${item.name}" only allows a single selection`);
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
