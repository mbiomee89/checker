export type UserRole = 'INSPECTOR' | 'CAMP_SUPERVISOR' | 'ADMIN' | 'HSE_VIEWER';
export type InputType = 'SINGLE_SELECT' | 'MULTI_SELECT' | 'TEXT';
export type OptionKind = 'toggle' | 'count';
export type AdminTab = 'camps' | 'rooms' | 'users' | 'checklist' | 'recycle-bin';

export interface Camp {
  id: number;
  name: string;
  location: string | null;
  active: boolean;
  roomCount: number;
  userCount: number;
}

export interface Room {
  id: number;
  roomNumber: string;
  campId: number;
  approvedCapacity: number | null;
  active: boolean;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  roles: UserRole[];
  campId: number | null;
  active: boolean;
  hasCredentials: boolean;
}

export interface ChecklistItemOption {
  id: number;
  label: string;
  isClearOption: boolean;
  kind: OptionKind;
  requiresAction: boolean;
  active: boolean;
  sortOrder: number;
}

export interface ChecklistItem {
  id: number;
  sequenceNo: number;
  name: string;
  inputType: InputType;
  active: boolean;
  options: ChecklistItemOption[];
}

export interface DeletedCamp {
  id: number;
  name: string;
  deletedAt: string;
}

export interface DeletedRoom {
  id: number;
  roomNumber: string;
  campId: number;
  deletedAt: string;
}

export interface DeletedUser {
  id: number;
  name: string;
  email: string;
  deletedAt: string;
}

export interface AdminConfigurationProps {
  camps: Camp[];
  rooms: Room[];
  users: AdminUser[];
  checklistItems: ChecklistItem[];
  deletedCamps?: DeletedCamp[];
  deletedRooms?: DeletedRoom[];
  deletedUsers?: DeletedUser[];
  activeTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;

  onAddCamp?: (camp: { name: string; location: string }) => void;
  onEditCamp?: (campId: number, camp: { name: string; location: string }) => void;
  onRetireCamp?: (campId: number, active: boolean) => void;
  onDeleteCamp?: (campId: number, confirmName: string) => void;
  onRestoreCamp?: (campId: number) => void;

  onAddRoom?: (room: { roomNumber: string; campId: number; approvedCapacity: number | null }) => void;
  onEditRoom?: (
    roomId: number,
    room: { roomNumber: string; campId: number; approvedCapacity: number | null }
  ) => void;
  onRetireRoom?: (roomId: number, active: boolean) => void;
  onDeleteRoom?: (roomId: number, confirmRoomNumber: string) => void;
  onRestoreRoom?: (roomId: number) => void;
  onAddRoomRange?: (range: {
    campId: number;
    startRoomNumber: number;
    endRoomNumber: number;
    approvedCapacity: number | null;
  }) => void;

  onAddUser?: (user: { name: string; email: string; roles: UserRole[]; campId: number | null }) => void;
  onEditUser?: (
    userId: number,
    user: { name: string; email: string; roles: UserRole[]; campId: number | null }
  ) => void;
  onSetUserActive?: (userId: number, active: boolean) => void;
  onDeleteUser?: (userId: number, confirmEmail: string) => void;
  onRestoreUser?: (userId: number) => void;
  /** Returns the real, server-generated temp password to display once. */
  onGenerateCredentials?: (userId: number) => Promise<string>;

  onAddChecklistItem?: (item: { name: string; inputType: InputType }) => void;
  onEditChecklistItem?: (itemId: number, item: { name: string; inputType: InputType }) => void;
  onRetireChecklistItem?: (itemId: number, active: boolean) => void;

  onAddOption?: (
    itemId: number,
    option: { label: string; isClearOption: boolean; kind: OptionKind; requiresAction: boolean }
  ) => void;
  onEditOption?: (
    itemId: number,
    optionId: number,
    option: { label: string; isClearOption: boolean; kind: OptionKind; requiresAction: boolean }
  ) => void;
  onRetireOption?: (itemId: number, optionId: number, active: boolean) => void;
}
