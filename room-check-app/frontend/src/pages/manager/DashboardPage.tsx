import { LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../lib/auth';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <LayoutDashboard className="mx-auto size-8 text-blue-600 dark:text-blue-400" />
        <h1 className="mt-3 font-[family-name:var(--font-heading,Manrope)] text-lg font-semibold text-slate-900 dark:text-white">
          Camp Supervisor Dashboard
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Welcome, {user?.name}. Submitted inspections and corrective actions for your camp will appear here once
          available.
        </p>
      </div>
    </div>
  );
}
