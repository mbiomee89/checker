export type InputType = 'SINGLE_SELECT' | 'MULTI_SELECT' | 'TEXT';
export type OptionKind = 'toggle' | 'count';
export type ActionStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type RoomRowStatus = 'draft' | 'submitted' | 'never';

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

export interface RoomInspection {
  roomId: number;
  roomNumber: string;
  approvedCapacity: number | null;
  inspectedAt: string;
  inspectorName: string;
  headcount: number | null;
  responses: RoomInspectionResponse[];
}

export interface Person {
  id: number;
  name: string;
}

export interface CorrectiveAction {
  id: number;
  roomId: number;
  roomNumber: string;
  checklistItemId: number;
  optionId: number;
  description: string;
  status: ActionStatus;
  dueDate: string | null;
  createdAt: string;
}

export interface ActiveFilter {
  checklistItemId: number;
  optionId: number;
}

export interface PriorityFlag {
  checklistItemId: number;
  optionId: number;
}

export interface RoomRow {
  id: number;
  roomNumber: string;
  approvedCapacity: number | null;
  lastInspectionAt: string | null;
  status: RoomRowStatus;
  lastSubmittedInspectionId: number | null;
}

export interface SupervisorRoomListProps {
  camp: Camp;
  roomRows: RoomRow[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onPreviewReport?: (inspectionId: number) => void;
}

export interface CampSupervisorDashboardProps {
  camp: Camp;
  currentUser: Person;
  checklistItems: ChecklistItem[];
  roomInspections: RoomInspection[];
  correctiveActions: CorrectiveAction[];
  priorityFlags: PriorityFlag[];

  activeFilter?: ActiveFilter | null;
  onSetFilter?: (filter: ActiveFilter | null) => void;

  onAddAction?: (action: {
    roomId: number;
    checklistItemId: number;
    optionId: number;
    note: string;
    dueDate: string | null;
    status: ActionStatus;
  }) => void;
  onSetActionStatus?: (actionId: number, status: ActionStatus, note: string) => void;
}
