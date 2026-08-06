import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  Save,
  Send,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import type {
  ChecklistItem,
  InspectionFormProps,
  InspectionResponse,
} from '../types'

function responseFor(
  responses: InspectionResponse[],
  itemId: number,
): InspectionResponse {
  return (
    responses.find((r) => r.checklistItemId === itemId) ?? {
      checklistItemId: itemId,
      selectedOptionIds: [],
      optionCounts: {},
    }
  )
}

function toggleOption(
  item: ChecklistItem,
  selected: number[],
  optionId: number,
): number[] {
  const option = item.options.find((o) => o.id === optionId)
  if (!option) return selected

  if (item.inputType === 'SINGLE_SELECT') {
    return [optionId]
  }

  const isSelected = selected.includes(optionId)
  if (option.isClearOption) {
    return isSelected ? [] : [optionId]
  }

  let next = selected.filter((id) => {
    const o = item.options.find((x) => x.id === id)
    return o && !o.isClearOption
  })
  if (isSelected) next = next.filter((id) => id !== optionId)
  else next = [...next, optionId]
  return next
}

export function InspectionForm({
  camp,
  checklistItems,
  inspection,
  onSaveDraft,
  onSubmit,
  onCancel,
  onBack,
  onHeadcountChange,
  onNotesChange,
  onAddResident,
  onRemoveResident,
  onSelectOptions,
  onCountChange,
  onTextChange,
  onUploadPhoto,
  onRemovePhoto,
}: InspectionFormProps) {
  const [residentDraft, setResidentDraft] = useState('')
  const readOnly = inspection.readOnly
  const overcrowded =
    inspection.headcount != null &&
    inspection.approvedCapacity != null &&
    inspection.headcount > inspection.approvedCapacity

  const sortedItems = useMemo(
    () => [...checklistItems].sort((a, b) => a.sequenceNo - b.sequenceNo),
    [checklistItems],
  )

  return (
    <div className="min-h-full bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      {/* Page toolbar — stacked rows so it never fights the app shell nav */}
      <div className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4 md:px-8">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => onBack?.()}
              className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Rooms</span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold tracking-wider text-blue-700 uppercase dark:text-blue-300">
                {camp.name}
                <span className="mx-1.5 text-slate-400">·</span>
                {inspection.status}
                {readOnly ? (
                  <>
                    <span className="mx-1.5 text-slate-400">·</span>
                    Read only
                  </>
                ) : null}
              </p>
              <h1 className="mt-0.5 truncate font-mono text-xl font-bold text-slate-900 dark:text-white">
                Room {inspection.roomNumber}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Approved capacity {inspection.approvedCapacity ?? '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 md:px-8">
        {overcrowded && (
          <div className="flex gap-3 rounded-xl border border-amber-400 bg-amber-100 px-4 py-3 text-amber-950 dark:border-amber-600 dark:bg-amber-900 dark:text-amber-50">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-200" />
            <div>
              <p className="font-semibold">Overcrowding</p>
              <p className="text-sm text-amber-900 dark:text-amber-100">
                Headcount {inspection.headcount} exceeds approved capacity{' '}
                {inspection.approvedCapacity}.
              </p>
            </div>
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Occupancy
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
                Headcount
              </span>
              <input
                type="number"
                min={0}
                disabled={readOnly}
                value={inspection.headcount ?? ''}
                onChange={(e) =>
                  onHeadcountChange?.(
                    e.target.value === '' ? null : Number(e.target.value),
                  )
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
                Notes
              </span>
              <textarea
                disabled={readOnly}
                rows={2}
                value={inspection.notes ?? ''}
                onChange={(e) => onNotesChange?.(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Residents of the room (ID)
            </p>
            <ul className="mb-3 flex flex-wrap gap-2">
              {inspection.residents.length === 0 && (
                <li className="text-sm text-slate-500">No resident IDs yet.</li>
              )}
              {inspection.residents.map((r) => (
                <li
                  key={r.id}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 font-mono text-xs font-medium text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100"
                >
                  {r.residentIdNumber}
                  {!readOnly && (
                    <button
                      type="button"
                      aria-label={`Remove ${r.residentIdNumber}`}
                      onClick={() => onRemoveResident?.(r.id)}
                      className="rounded-full p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-900"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {!readOnly && (
              <div className="flex gap-2">
                <input
                  value={residentDraft}
                  onChange={(e) => setResidentDraft(e.target.value)}
                  placeholder="Add resident ID…"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = residentDraft.trim()
                    if (!v) return
                    onAddResident?.(v)
                    setResidentDraft('')
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <UserPlus className="size-4" />
                  Add
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="space-y-3">
          {sortedItems.map((item) => {
            const resp = responseFor(inspection.responses, item.id)
            const toggleOptions = item.options.filter((o) => o.kind !== 'count')
            const countOptions = item.options.filter((o) => o.kind === 'count')
            const issueSelected = resp.selectedOptionIds.some((id) => {
              const o = item.options.find((x) => x.id === id)
              return o && !o.isClearOption
            })
            return (
              <section
                key={item.id}
                className={[
                  'rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-950',
                  issueSelected
                    ? 'border-indigo-200 dark:border-indigo-800'
                    : 'border-slate-200 dark:border-slate-700',
                ].join(' ')}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    <span className="me-2 font-mono text-blue-600 dark:text-blue-400">
                      {String(item.sequenceNo).padStart(2, '0')}
                    </span>
                    {item.name}
                  </h3>
                  {item.inputType !== 'TEXT' &&
                    !issueSelected &&
                    toggleOptions.some((o) => o.isClearOption) && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        <Check className="size-3.5" />
                        Clear
                      </span>
                    )}
                </div>

                {item.inputType === 'TEXT' && (
                  <textarea
                    disabled={readOnly}
                    rows={3}
                    value={resp.textValue ?? ''}
                    onChange={(e) => onTextChange?.(item.id, e.target.value)}
                    placeholder="Add a note…"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                )}

                {item.inputType !== 'TEXT' && countOptions.length > 0 && (
                  <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[...countOptions]
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((opt) => (
                        <label
                          key={opt.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          {opt.label}
                          <input
                            type="number"
                            min={0}
                            disabled={readOnly}
                            value={resp.optionCounts[opt.id] ?? 0}
                            onChange={(e) =>
                              onCountChange?.(
                                item.id,
                                opt.id,
                                Math.max(0, Number(e.target.value) || 0),
                              )
                            }
                            className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-right dark:border-slate-700 dark:bg-slate-950"
                          />
                        </label>
                      ))}
                  </div>
                )}

                {item.inputType !== 'TEXT' && toggleOptions.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[...toggleOptions]
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((opt) => {
                        const active = resp.selectedOptionIds.includes(opt.id)
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={readOnly}
                            onClick={() =>
                              onSelectOptions?.(
                                item.id,
                                toggleOption(item, resp.selectedOptionIds, opt.id),
                              )
                            }
                            className={[
                              'rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-colors',
                              active
                                ? opt.isClearOption
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
                            ].join(' ')}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Photos ({inspection.photos.length}/4)
            </h2>
            {!readOnly && inspection.photos.length < 4 && (
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700">
                <Camera className="size-3.5" />
                Add photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onUploadPhoto?.(file)
                    e.target.value = ''
                  }}
                />
              </label>
            )}
          </div>
          {inspection.photos.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {inspection.photos.map((p) => (
                <li key={p.id} className="relative">
                  <img
                    src={p.url}
                    alt=""
                    className="size-20 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onRemovePhoto?.(p.id)}
                      className="absolute -top-1.5 -right-1.5 rounded-full bg-slate-900 p-1 text-white"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">No photos yet.</p>
          )}
        </section>

        {!readOnly && (
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={() => onCancel?.()}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSaveDraft?.()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-200 dark:border-slate-500 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            >
              <Save className="size-4 shrink-0" />
              <span className="truncate">Save draft</span>
            </button>
            <button
              type="button"
              onClick={() => onSubmit?.()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Send className="size-4 shrink-0" />
              Submit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
