export function logPrefix(user) {
  const date = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(new Date());
  return `[${date}, ${user.name}]: `;
}

export function appendNote(existingDescription, user, note) {
  const entry = `${logPrefix(user)}${note}`;
  return existingDescription ? `${existingDescription}\n${entry}` : entry;
}

/** True when this inspection has already written an auto-note for the finding — skip on resubmit. */
export function alreadyLoggedInspectionObservation(description, inspectionId) {
  if (!description) return false;
  return description.includes(`inspection #${inspectionId}`);
}

export function serializeCorrectiveAction(action) {
  return {
    id: action.id,
    roomId: action.roomId,
    roomNumber: action.room.roomNumber,
    checklistItemId: action.checklistItemId,
    optionId: action.optionId,
    description: action.description,
    status: action.status,
    dueDate: action.dueDate,
    createdAt: action.createdAt,
  };
}
