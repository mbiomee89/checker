import { useState } from 'react'
import { LogIn } from 'lucide-react'

export type LoginDemoUser = {
  id: string
  name: string
  email: string
  /** All roles this demo account holds — the first one is where login lands them. */
  roles: string[]
}

export type LoginPageProps = {
  productName?: string
  /** Human-readable label per role value; falls back to the raw role string when omitted. */
  roleLabels?: Record<string, string>
  /** Sample accounts shown below the form for quickly trying different roles. */
  demoUsers?: LoginDemoUser[]
  /** Form submit — parent looks up a matching account (there's no real backend here). */
  onLogin?: (credentials: { email: string; password: string }) => void
  /** One-click login as a specific demo account, skipping the form entirely. */
  onSelectDemoUser?: (userId: string) => void
  /** Shown above the form when the last onLogin attempt didn't match an account. */
  error?: string | null
}

function BrandMark({ productName }: { productName: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold tracking-wide text-white dark:bg-blue-500">
        CK
      </span>
      <div>
        <p className="font-[family-name:var(--font-heading,Manrope)] text-lg font-semibold text-slate-900 dark:text-white">
          {productName}
        </p>
        <p className="font-[family-name:var(--font-body,Inter)] text-xs text-slate-500 dark:text-slate-400">
          IKK Group
        </p>
      </div>
    </div>
  )
}

export function LoginPage({
  productName = 'Checker',
  roleLabels,
  demoUsers = [],
  onLogin,
  onSelectDemoUser,
  error,
}: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const roleLabel = (role: string) => roleLabels?.[role] ?? role

  return (
    <div className="font-[family-name:var(--font-body,Inter)] flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 dark:bg-slate-900">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <BrandMark productName={productName} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onLogin?.({ email, password })
            }}
            className="space-y-4"
          >
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">Email</span>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">Password</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <LogIn className="size-4" />
              Log in
            </button>
          </form>

          {demoUsers.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
                Or continue as a demo account
              </p>
              <div className="space-y-1.5">
                {demoUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => onSelectDemoUser?.(u.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800 dark:text-slate-100">
                        {u.name}
                      </span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                        {u.email}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-slate-500 dark:text-slate-400">
                      {u.roles.map(roleLabel).join(' + ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LoginPage
