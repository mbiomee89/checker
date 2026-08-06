export type InputType = 'SINGLE_SELECT' | 'MULTI_SELECT' | 'TEXT';
export type OptionKind = 'toggle' | 'count';
export type ActionStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface Camp {
  id: number;
  name: string;
  location: string | null;
}

export interface ChecklistItemOption {
  id: number;
  label: string;
  isClearOption: boolean;
  kind?: OptionKind;
  sortOrder: number;
}

export interface ChecklistItem {
  id: number;
  sequenceNo: number;
  name: string;
  inputType: InputType;
  options: ChecklistItemOption[];
}

export interface RoomInspectionResponse {
  checklistItemId: number;
  selectedOptionIds: number[];
  optionCounts: Record<number, number>;
}

export interface CampRoomInspection {
  roomId: number;
  roomNumber: string;
  campId: number;
  campName: string;
  approvedCapacity: number | null;
  inspectedAt: string;
  inspectorName: string;
  headcount: number | null;
  responses: RoomInspectionResponse[];
}

export interface InspectionCycle {
  campId: number;
  campName: string;
  cycleMonth: string;
  roomInspections: CampRoomInspection[];
}

export interface CorrectiveAction {
  id: number;
  roomId: number;
  roomNumber: string;
  campId: number;
  campName: string;
  checklistItemId: number;
  optionId: number;
  description: string;
  status: ActionStatus;
  dueDate: string | null;
  createdAt: string;
}

export interface PriorityFlag {
  checklistItemId: number;
  optionId: number;
  campId: number;
  campName: string;
}

export interface ActiveFilter {
  checklistItemId: number;
  optionId: number;
}

export interface HSEOverviewProps {
  camps: Camp[];
  checklistItems: ChecklistItem[];
  roomInspections: CampRoomInspection[];
  inspectionCycles: InspectionCycle[];
  correctiveActions: CorrectiveAction[];
  priorityFlags: PriorityFlag[];

  scopeCampId?: number | null;
  onSetScopeCampId?: (campId: number | null) => void;

  activeFilter?: ActiveFilter | null;
  onSetFilter?: (filter: ActiveFilter | null) => void;
}
