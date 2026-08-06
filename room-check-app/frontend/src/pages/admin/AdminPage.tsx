import { useCallback, useEffect, useState } from 'react';
import { AdminConfiguration } from '../../sections/admin-configuration/components/AdminConfiguration';
import type {
  AdminTab,
  Camp,
  Room,
  AdminUser,
  ChecklistItem,
  DeletedCamp,
  DeletedRoom,
  DeletedUser,
} from '../../sections/admin-configuration/types';
import {
  listAdminCamps,
  createCamp,
  updateCamp,
  setCampActive,
  listDeletedCamps,
  deleteCamp,
  restoreCamp,
} from '../../api/adminCamps';
import {
  listAdminRooms,
  createRoom,
  updateRoom,
  setRoomActive,
  createRoomRange,
  listDeletedRooms,
  deleteRoom,
  restoreRoom,
} from '../../api/adminRooms';
import {
  listAdminUsers,
  createUser,
  updateUser,
  setUserActive,
  generateCredentials,
  listDeletedUsers,
  deleteUser,
  restoreUser,
} from '../../api/adminUsers';
import {
  listAdminChecklistItems,
  createChecklistItem,
  updateChecklistItem,
  setChecklistItemActive,
  createOption,
  updateOption,
  setOptionActive,
} from '../../api/adminChecklist';

export default function AdminPage() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [deletedCamps, setDeletedCamps] = useState<DeletedCamp[]>([]);
  const [deletedRooms, setDeletedRooms] = useState<DeletedRoom[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>('camps');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [c, r, u, ci, dc, dr, du] = await Promise.all([
      listAdminCamps(),
      listAdminRooms(),
      listAdminUsers(),
      listAdminChecklistItems(),
      listDeletedCamps(),
      listDeletedRooms(),
      listDeletedUsers(),
    ]);
    setCamps(c.camps);
    setRooms(r.rooms);
    setUsers(u.users);
    setChecklistItems(ci.checklistItems);
    setDeletedCamps(dc.camps);
    setDeletedRooms(dr.rooms);
    setDeletedUsers(du.users);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await reload();
      } catch {
        if (!cancelled) setError('Could not load admin data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  if (loading) {
    return <div className="flex min-h-full items-center justify-center p-10 text-slate-500">Loading…</div>;
  }
  if (error) {
    return <div className="p-10 text-red-600">{error}</div>;
  }

  return (
    <AdminConfiguration
      camps={camps}
      rooms={rooms}
      users={users}
      checklistItems={checklistItems}
      deletedCamps={deletedCamps}
      deletedRooms={deletedRooms}
      deletedUsers={deletedUsers}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onAddCamp={async (camp) => {
        await createCamp(camp);
        await reload();
      }}
      onEditCamp={async (campId, camp) => {
        await updateCamp(campId, camp);
        await reload();
      }}
      onRetireCamp={async (campId, active) => {
        await setCampActive(campId, active);
        await reload();
      }}
      onDeleteCamp={async (campId, confirmName) => {
        await deleteCamp(campId, confirmName);
        await reload();
      }}
      onRestoreCamp={async (campId) => {
        await restoreCamp(campId);
        await reload();
      }}
      onAddRoom={async (room) => {
        await createRoom(room);
        await reload();
      }}
      onEditRoom={async (roomId, room) => {
        await updateRoom(roomId, room);
        await reload();
      }}
      onRetireRoom={async (roomId, active) => {
        await setRoomActive(roomId, active);
        await reload();
      }}
      onDeleteRoom={async (roomId, confirmRoomNumber) => {
        await deleteRoom(roomId, confirmRoomNumber);
        await reload();
      }}
      onRestoreRoom={async (roomId) => {
        await restoreRoom(roomId);
        await reload();
      }}
      onAddRoomRange={async (range) => {
        await createRoomRange(range);
        await reload();
      }}
      onAddUser={async (user) => {
        await createUser(user);
        await reload();
      }}
      onEditUser={async (userId, user) => {
        await updateUser(userId, user);
        await reload();
      }}
      onSetUserActive={async (userId, active) => {
        await setUserActive(userId, active);
        await reload();
      }}
      onDeleteUser={async (userId, confirmEmail) => {
        await deleteUser(userId, confirmEmail);
        await reload();
      }}
      onRestoreUser={async (userId) => {
        await restoreUser(userId);
        await reload();
      }}
      onGenerateCredentials={async (userId) => {
        const { tempPassword } = await generateCredentials(userId);
        await reload();
        return tempPassword;
      }}
      onAddChecklistItem={async (item) => {
        await createChecklistItem(item);
        await reload();
      }}
      onEditChecklistItem={async (itemId, item) => {
        await updateChecklistItem(itemId, item);
        await reload();
      }}
      onRetireChecklistItem={async (itemId, active) => {
        await setChecklistItemActive(itemId, active);
        await reload();
      }}
      onAddOption={async (itemId, option) => {
        await createOption(itemId, option);
        await reload();
      }}
      onEditOption={async (itemId, optionId, option) => {
        await updateOption(itemId, optionId, option);
        await reload();
      }}
      onRetireOption={async (itemId, optionId, active) => {
        await setOptionActive(itemId, optionId, active);
        await reload();
      }}
    />
  );
}
