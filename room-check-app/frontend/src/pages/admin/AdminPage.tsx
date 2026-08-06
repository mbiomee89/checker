import { Settings2 } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <Settings2 className="mx-auto size-8 text-blue-600 dark:text-blue-400" />
        <h1 className="mt-3 font-[family-name:var(--font-heading,Manrope)] text-lg font-semibold text-slate-900 dark:text-white">
          Admin Configuration
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Camp, room, user, and checklist management will live here.
        </p>
      </div>
    </div>
  );
}
