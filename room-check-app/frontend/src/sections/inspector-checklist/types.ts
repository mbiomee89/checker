export type RoomRowStatus = 'draft' | 'submitted' | 'never';
export type InspectionStatus = 'DRAFT' | 'SUBMITTED' | 'CANCELLED';
export type InputType = 'SINGLE_SELECT' | 'MULTI_SELECT' | 'TEXT';

export interface Camp {
  id: number;
  name: string;
  location: string | null;
}

export interface CurrentUser {
  id: number;
  name: string;
  role: 'INSPECTOR' | 'CAMP_SUPERVISOR' | 'ADMIN' | 'HSE_VIEWER';
}

export interface RoomRow {
  id: number;
  campId: number;
  roomNumber: string;
  approvedCapacity: number | null;
  lastInspectionAt: string | null;
  status: RoomRowStatus;
  openDraftInspectionId: number | null;
  lastSubmittedInspectionId: number | null;
}

export interface ChecklistItemOption {
  id: number;
  label: string;
  isClearOption: boolean;
  sortOrder: number;
  kind?: 'toggle' | 'count';
}

export interface ChecklistItem {
  id: number;
  sequenceNo: number;
  name: string;
  inputType: InputType;
  options: ChecklistItemOption[];
}

export interface InspectionResident {
  id: number;
  residentIdNumber: string;
}

export interface InspectionPhoto {
  id: number;
  url: string;
  mimeType: string;
}

export interface InspectionResponse {
  checklistItemId: number;
  selectedOptionIds: number[];
  optionCounts: Record<number, number>;
  textValue?: string;
}

export interface ActiveInspection {
  id: number;
  roomId: number;
  roomNumber: string;
  approvedCapacity: number | null;
  campId: number;
  campName: string;
  status: InspectionStatus;
  headcount: number | null;
  notes: string | null;
  inspectedAt: string;
  readOnly: boolean;
  residents: InspectionResident[];
  responses: InspectionResponse[];
  photos: InspectionPhoto[];
}

export interface RoomTableProps {
  camps: Camp[];
  currentUser: CurrentUser;
  roomRows: RoomRow[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onStartInspection?: (roomId: number) => void;
  onResumeDraft?: (inspectionId: number) => void;
  onViewSubmitted?: (inspectionId: number) => void;
  onPreviewReport?: (inspectionId: number) => void;
}

export type ActionStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

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

export interface InspectionReportProps {
  camp: Camp;
  checklistItems: ChecklistItem[];
  inspection: ActiveInspection;
  correctiveActions?: CorrectiveAction[];
  onBack?: () => void;
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

export interface ActiveFilter {
  checklistItemId: number;
  optionId: number;
}

export interface PriorityFlag {
  checklistItemId: number;
  optionId: number;
}

export interface SupervisorActivityReviewProps {
  camp: Camp;
  checklistItems: ChecklistItem[];
  roomInspections: RoomInspection[];
  correctiveActions: CorrectiveAction[];
  priorityFlags: PriorityFlag[];
  activeFilter?: ActiveFilter | null;
  onSetFilter?: (filter: ActiveFilter | null) => void;
  onTogglePriority?: (checklistItemId: number, optionId: number) => void;
}

export interface InspectionFormProps {
  camp: Camp;
  checklistItems: ChecklistItem[];
  inspection: ActiveInspection;
  onSaveDraft?: () => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  onBack?: () => void;
  onHeadcountChange?: (headcount: number | null) => void;
  onNotesChange?: (notes: string) => void;
  onAddResident?: (residentIdNumber: string) => void;
  onRemoveResident?: (residentId: number) => void;
  onSelectOptions?: (checklistItemId: number, optionIds: number[]) => void;
  onCountChange?: (checklistItemId: number, optionId: number, value: number) => void;
  onTextChange?: (checklistItemId: number, value: string) => void;
  onUploadPhoto?: (file: File) => void;
  onRemovePhoto?: (photoId: number) => void;
}
