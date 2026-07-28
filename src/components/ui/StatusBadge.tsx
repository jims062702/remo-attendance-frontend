import { cn } from '@/utils/format'
import type { AttendanceStatus, TaskStatus, UserStatus } from '@/types'

type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral' | 'brand'

const TONES: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  info: 'bg-info-soft text-info',
  brand: 'bg-brand-soft text-brand',
  neutral: 'bg-neutral-soft text-muted',
}

interface BadgeProps {
  children: React.ReactNode
  tone?: Tone
  className?: string
  /** A leading dot helps distinguish states without relying on colour alone. */
  dot?: boolean
}

export function Badge({ children, tone = 'neutral', className, dot = false }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
}

/**
 * Attendance status.
 *
 * "Incomplete" is deliberately a warning rather than an error: it means the
 * tasker worked but never clocked out, so the record needs an admin's
 * attention, not blame.
 */
const ATTENDANCE_TONES: Record<AttendanceStatus, Tone> = {
  present: 'ok',
  late: 'warn',
  incomplete: 'warn',
  absent: 'bad',
  on_leave: 'info',
}

const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  incomplete: 'Incomplete',
  absent: 'Absent',
  on_leave: 'On Leave',
}

export function AttendanceBadge({ status, label }: { status: AttendanceStatus; label?: string }) {
  return (
    <Badge tone={ATTENDANCE_TONES[status] ?? 'neutral'} dot>
      {label ?? ATTENDANCE_LABELS[status] ?? status}
    </Badge>
  )
}

const TASK_TONES: Record<TaskStatus, Tone> = {
  completed: 'ok',
  in_progress: 'brand',
  pending: 'neutral',
  on_hold: 'warn',
  cancelled: 'bad',
}

const TASK_LABELS: Record<TaskStatus, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  pending: 'Pending',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
}

export function TaskBadge({ status, label }: { status: TaskStatus; label?: string }) {
  return (
    <Badge tone={TASK_TONES[status] ?? 'neutral'} dot>
      {label ?? TASK_LABELS[status] ?? status}
    </Badge>
  )
}

const USER_TONES: Record<UserStatus, Tone> = {
  active: 'ok',
  inactive: 'neutral',
  suspended: 'bad',
}

export function UserStatusBadge({ status, label }: { status: UserStatus; label?: string }) {
  return (
    <Badge tone={USER_TONES[status] ?? 'neutral'} dot>
      {label ?? status}
    </Badge>
  )
}
