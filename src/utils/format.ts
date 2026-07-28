import { format, isValid, parseISO } from 'date-fns'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes with later ones winning over earlier conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

const EM_DASH = '—'

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : null
}

/** "Jul 26, 2026" */
export function formatDate(value: string | null | undefined): string {
  const date = toDate(value)
  return date ? format(date, 'MMM d, yyyy') : EM_DASH
}

/** "Sun, Jul 26" */
export function formatDateShort(value: string | null | undefined): string {
  const date = toDate(value)
  return date ? format(date, 'EEE, MMM d') : EM_DASH
}

/** "10:05 PM" */
export function formatTime(value: string | null | undefined): string {
  const date = toDate(value)
  return date ? format(date, 'h:mm a') : EM_DASH
}

/** "Jul 26, 10:05 PM" */
export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value)
  return date ? format(date, 'MMM d, h:mm a') : EM_DASH
}

/**
 * A clock time, annotated with its date when it falls on a different day from
 * the shift it belongs to.
 *
 * This is what keeps the overnight shift readable: a clock-out at 6:02 AM
 * belongs to the previous night's shift, and showing it as a bare "6:02 AM"
 * next to a 10:05 PM clock-in reads as though the tasker worked backwards.
 * Rendered as "6:02 AM (+1d)" instead.
 */
export function formatShiftTime(
  value: string | null | undefined,
  shiftDate: string | null | undefined,
): string {
  const date = toDate(value)
  if (!date) return EM_DASH

  const base = toDate(shiftDate)
  if (!base) return format(date, 'h:mm a')

  const dayDiff = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
      new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime()) /
      86_400_000,
  )

  if (dayDiff === 0) return format(date, 'h:mm a')

  return `${format(date, 'h:mm a')} (${dayDiff > 0 ? '+' : ''}${dayDiff}d)`
}

/** "8.00 hrs", or an em dash when the shift is still open. */
export function formatHours(value: number | null | undefined, suffix = 'hrs'): string {
  if (value === null || value === undefined) return EM_DASH
  return `${value.toFixed(2)} ${suffix}`.trim()
}

/** Signed, so a shortfall reads as "-0.50" rather than "0.50". */
export function formatVariance(value: number | null | undefined): string {
  if (value === null || value === undefined) return EM_DASH
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return EM_DASH
  return value.toLocaleString()
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return EM_DASH
  return `${value.toFixed(1)}%`
}

/** "1h 45m late", for the lateness column. */
export function formatMinutesLate(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return 'On time'
  if (minutes < 60) return `${minutes}m late`

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder === 0 ? `${hours}h late` : `${hours}h ${remainder}m late`
}

/** Elapsed time since a moment, as "3h 12m". Used for a running shift. */
export function elapsedSince(value: string | null | undefined, now: Date = new Date()): string {
  const start = toDate(value)
  if (!start) return EM_DASH

  const minutes = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 60_000))
  const hours = Math.floor(minutes / 60)

  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

/** Decimal hours elapsed, matching how the backend computes total_hours. */
export function elapsedHours(value: string | null | undefined, now: Date = new Date()): number {
  const start = toDate(value)
  if (!start) return 0
  return Math.max(0, (now.getTime() - start.getTime()) / 3_600_000)
}

/** "N/A" for the optional fields that legitimately have no value. */
export function orNA(value: string | null | undefined): string {
  return value && value.trim() !== '' ? value : 'N/A'
}

/** Today as YYYY-MM-DD, for date inputs. */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** N days before today as YYYY-MM-DD. */
export function daysAgoISO(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return format(date, 'yyyy-MM-dd')
}

/** Turn "2026-W30" or "2026-07" bucket keys into something readable. */
export function formatBucket(bucket: string): string {
  if (/^\d{4}-W\d{1,2}$/.test(bucket)) {
    const [year, week] = bucket.split('-W')
    return `W${week} ${year}`
  }

  if (/^\d{4}-\d{2}$/.test(bucket)) {
    const parsed = parseISO(`${bucket}-01`)
    return isValid(parsed) ? format(parsed, 'MMM yyyy') : bucket
  }

  const parsed = parseISO(bucket)
  return isValid(parsed) ? format(parsed, 'MMM d') : bucket
}
