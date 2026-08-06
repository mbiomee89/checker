import { useState } from 'react'
import { ArrowLeft, Printer } from 'lucide-react'
import type {
  ChecklistItem,
  CorrectiveAction,
  InspectionReportProps,
  InspectionResponse,
} from '../types'

const COMPANY_NAME = 'ISAM KABBANI AND PARTNERS CONSTRUCTION AND MAINTENANCE'
const FORM_TITLE = 'HOUSEKEEPING & ROOM INSPECTION CHECKLIST'

/**
 * Exact wording from the original paper form letterhead, keyed by sequenceNo.
 * Kept separate from ChecklistItem.name (which uses shorter labels elsewhere
 * in the app UI, e.g. "Windows & Screens") so the printed report matches the
 * letterhead precisely.
 */
const ORIGINAL_DESCRIPTIONS: Record<number, string> = {
  1: 'Room cleanliness',
  2: 'Occupancy & Capacity',
  3: 'Door',
  4: 'Window and window screen',
  5: 'Electrical Sockets',
  6: 'air conditioner',
  7: 'wall and ceiling paint',
  8: 'lighting and light switch',
  9: 'smoke detector and sprinkler',
  10: 'Insects and pest control',
  11: 'furniture, specify the number per unit.',
  12: 'violations',
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

/** Selected option labels + non-zero counts for the report's Comment cell, one per line. */
function commentLines(item: ChecklistItem, resp: InspectionResponse | undefined): string[] {
  if (!resp) return []
  if (item.inputType === 'TEXT') {
    return resp.textValue?.trim() ? [resp.textValue] : []
  }
  const parts: string[] = []
  for (const opt of item.options) {
    if (opt.kind === 'count') {
      const value = resp.optionCounts?.[opt.id] ?? 0
      if (value > 0) parts.push(`${opt.label}: ${value}`)
    } else if (resp.selectedOptionIds.includes(opt.id)) {
      parts.push(opt.label)
    }
  }
  return parts
}

/** Supervisor's corrective-action text for each of this row's findings that has one, one per line. */
function actionLines(
  item: ChecklistItem,
  resp: InspectionResponse | undefined,
  correctiveActions: CorrectiveAction[],
  roomId: number,
): string[] {
  if (!resp) return []
  const selectedOptionIds = new Set(resp.selectedOptionIds)
  for (const opt of item.options) {
    if (opt.kind === 'count' && (resp.optionCounts?.[opt.id] ?? 0) > 0) selectedOptionIds.add(opt.id)
  }
  return correctiveActions
    .filter(
      (a) => a.roomId === roomId && a.checklistItemId === item.id && selectedOptionIds.has(a.optionId),
    )
    .map((a) => a.description)
}

function CompanyLogo() {
  return (
    <img
      src="/company-logo.jpg"
      alt="Isam Kabbani and Partners"
      className="size-12 shrink-0 rounded-full sm:size-14"
    />
  )
}

export function InspectionReport({
  camp,
  checklistItems,
  inspection,
  correctiveActions = [],
  onBack,
}: InspectionReportProps) {
  const [includeActions, setIncludeActions] = useState(true)
  const sortedItems = [...checklistItems].sort((a, b) => a.sequenceNo - b.sequenceNo)
  const residentsText = inspection.residents.map((r) => r.residentIdNumber).join(', ')

  return (
    <div className="min-h-full bg-slate-100 print:bg-white dark:bg-slate-900">
      {/* Screen-only toolbar — hidden when printing */}
      <div className="border-b border-slate-200 bg-white px-4 py-4 print:hidden dark:border-slate-700 dark:bg-slate-950 md:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onBack?.()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="size-4" />
            Rooms
          </button>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeActions}
                onChange={(e) => setIncludeActions(e.target.checked)}
                className="size-4 rounded border-slate-300"
              />
              Include corrective actions
            </label>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Printer className="size-4" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Report body — a fixed light "document" look on screen and print, matching the paper form */}
      <div className="mx-auto max-w-3xl px-4 py-6 print:max-w-none print:px-0 print:py-0 md:px-8">
        <div className="border border-slate-900 bg-white text-black shadow-sm print:border-0 print:shadow-none">
          {/* Letterhead */}
          <div className="flex items-center justify-center gap-3 border-b-2 border-slate-900 px-4 py-3 text-center">
            <CompanyLogo />
            <div>
              <p className="text-xs font-bold tracking-tight uppercase sm:text-sm">
                {COMPANY_NAME}
              </p>
              <p className="mt-0.5 text-xs font-bold tracking-tight uppercase sm:text-sm">
                {FORM_TITLE}
              </p>
            </div>
          </div>

          {/* Header fields — stacked, full-width bordered rows, matching the original */}
          <div className="border-b border-slate-900 text-sm font-bold">
            <div className="border-b border-slate-900 px-3 py-1.5">
              DATE:{formatDate(inspection.inspectedAt)}
            </div>
            <div className="border-b border-slate-900 px-3 py-1.5">CAMP: {camp.name}</div>
            <div className="border-b border-slate-900 px-3 py-1.5">
              ROOM #:{inspection.roomNumber}
            </div>
            <div className="px-3 py-1.5">Residents of the room (ID): {residentsText}</div>
          </div>

          {/* Checklist table */}
          <table className="w-full table-fixed border-collapse text-sm print:text-xs">
            <colgroup>
              <col className="w-[5%]" />
              <col className="w-[20%]" />
              <col className="w-[25%]" />
              <col className="w-[50%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="border border-slate-900 px-2 py-1.5 text-center text-base font-bold">
                  S
                </th>
                <th className="border border-slate-900 px-2 py-1.5 text-center text-base font-bold">
                  Description
                </th>
                <th className="border border-slate-900 px-2 py-1.5 text-center text-base font-bold">
                  COMMENT
                </th>
                <th className="border border-slate-900 px-2 py-1.5 text-center text-base font-bold">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => {
                const resp = inspection.responses.find((r) => r.checklistItemId === item.id)
                const lines = commentLines(item, resp)
                const actions = includeActions
                  ? actionLines(item, resp, correctiveActions, inspection.roomId)
                  : []
                return (
                  <tr key={item.id} className="break-inside-avoid">
                    <td className="border border-slate-900 px-2 py-1.5 align-top">
                      {item.sequenceNo}
                    </td>
                    <td className="border border-slate-900 px-2 py-1.5 align-top">
                      {ORIGINAL_DESCRIPTIONS[item.sequenceNo] ?? item.name}
                    </td>
                    <td className="border border-slate-900 px-2 py-1.5 align-top">
                      {lines.length > 0
                        ? lines.map((line, i) => <div key={i}>{line}</div>)
                        : null}
                    </td>
                    <td className="border border-slate-900 px-2 py-1.5 align-top whitespace-pre-line">
                      {actions.length > 0
                        ? actions.map((line, i) => <div key={i}>{line}</div>)
                        : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Photos are part of the report, so they sit inside the same document, before the sign-off */}
          {inspection.photos.length > 0 && (
            <div className="break-inside-avoid border-t border-slate-900 px-4 py-3">
              <h2 className="mb-2 text-xs font-bold tracking-wide uppercase">Photos</h2>
              <div className="flex flex-wrap gap-2 print:gap-3">
                {inspection.photos.map((p) => (
                  <img
                    key={p.id}
                    src={p.url}
                    alt=""
                    className="size-28 rounded-lg object-cover ring-1 ring-slate-300 print:size-32 print:rounded-none print:ring-1 print:ring-slate-400"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sign-off footer — last, since photos are part of the report body */}
          <div className="grid grid-cols-2 gap-6 border-t border-slate-900 px-4 py-4 text-sm break-inside-avoid">
            <div className="space-y-3">
              <p className="border-b border-slate-400 pb-1">Inspected by:</p>
              <p className="border-b border-slate-400 pb-1">Signature:</p>
              <p className="border-b border-slate-400 pb-1">Date:</p>
            </div>
            <div className="space-y-3">
              <p className="border-b border-slate-400 pb-1">Camp supervisor:</p>
              <p className="border-b border-slate-400 pb-1">Signature:</p>
              <p className="border-b border-slate-400 pb-1">Date:</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InspectionReport
