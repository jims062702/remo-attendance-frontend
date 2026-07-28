import { cn } from '@/utils/format'

export interface MeterSegment {
  label: string
  value: number
  /** A CSS colour — pass a chart-palette entry or a token like var(--ok). */
  color: string
}

interface StackedMeterProps {
  segments: MeterSegment[]
  /** Shown when every segment is zero, e.g. before anyone has clocked in. */
  emptyLabel?: string
  height?: number
  className?: string
  /** Renders the label/value/share rows under the bar. */
  legend?: boolean
}

/**
 * A one-bar composition — how a single total divides between a few states.
 *
 * Preferred over a pie for this job: the parts are compared along one axis, so
 * a 4-point difference is legible, and it costs a strip of height rather than a
 * square of it. Segments carry a 2px surface gap so a thin band stays visible
 * instead of bleeding into its neighbour.
 *
 * Colour never carries the value alone — the legend repeats every figure as
 * text, which is also what makes the bar readable under CVD and in print.
 */
export function StackedMeter({
  segments,
  emptyLabel = 'Nothing recorded yet',
  height = 10,
  className,
  legend = true,
}: StackedMeterProps) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0)
  const visible = segments.filter((segment) => segment.value > 0)

  return (
    <div className={className}>
      <div
        className="flex overflow-hidden rounded-full bg-sunken"
        style={{ height, gap: visible.length > 1 ? 2 : 0 }}
      >
        {visible.map((segment) => (
          <div
            key={segment.label}
            className="h-full transition-[width] duration-700 ease-out first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(segment.value / total) * 100}%`,
              background: segment.color,
            }}
          />
        ))}
      </div>

      {legend &&
        (total === 0 ? (
          <p className="mt-3 text-[13px] text-muted">{emptyLabel}</p>
        ) : (
          <dl className="mt-3.5 space-y-2">
            {segments.map((segment) => (
              <div key={segment.label} className="flex items-center gap-2.5 text-[13px]">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: segment.color }}
                  aria-hidden="true"
                />
                <dt className="flex-1 truncate text-muted">{segment.label}</dt>
                <dd className="numeric font-semibold text-body tabular-nums">{segment.value}</dd>
                <dd className="numeric w-11 text-right text-muted tabular-nums">
                  {total === 0 ? '—' : `${Math.round((segment.value / total) * 100)}%`}
                </dd>
              </div>
            ))}
          </dl>
        ))}
    </div>
  )
}

interface ProgressBarProps {
  /** 0–1, clamped. */
  value: number
  tone?: 'brand' | 'ok' | 'warn' | 'bad'
  className?: string
  label: string
}

const TONE_BG: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  brand: 'bg-brand',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
}

/** A slim single-value bar, for progress against a target inside a table row. */
export function ProgressBar({ value, tone = 'brand', className, label }: ProgressBarProps) {
  const pct = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)) * 100

  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-sunken', className)}
      role="img"
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-700 ease-out', TONE_BG[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
