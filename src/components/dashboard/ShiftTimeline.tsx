import { useEffect, useMemo, useState } from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { cn } from '@/utils/format'

interface ShiftTimelineProps {
  /** ISO datetime of the scheduled shift start (22:00 on the business date). */
  start: string
  /** ISO datetime of the scheduled end — the following morning. */
  end: string
  className?: string
}

const HOUR_MS = 3_600_000

/**
 * Where we are inside tonight's shift.
 *
 * This is the one panel that could not be lifted from a generic admin
 * template, because the thing it shows is specific to this operation: a
 * 10 PM - 6 AM window that crosses midnight. "It is 1:40 AM" tells an admin
 * very little on its own; "we are three hours into an eight hour shift, five
 * hours left" is the question they are actually asking, and the answer is a
 * position on a line rather than a number.
 *
 * The marker moves on a 30-second tick. A per-second clock is already in the
 * header; a second one redrawing this bar 120x per minute would buy nothing.
 */
export function ShiftTimeline({ start, end, className }: ShiftTimelineProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const model = useMemo(() => {
    const startDate = parseISO(start)
    const endDate = parseISO(end)
    if (!isValid(startDate) || !isValid(endDate)) return null

    const startMs = startDate.getTime()
    const endMs = endDate.getTime()
    const span = endMs - startMs
    if (span <= 0) return null

    // Hour boundaries inside the window, used as tick marks. Every other one is
    // labelled -- nine labels across eight hours collide on a narrow column.
    const ticks: { pct: number; label: string; major: boolean }[] = []
    const firstHour = new Date(startMs)
    firstHour.setMinutes(0, 0, 0)

    let index = 0
    for (let t = firstHour.getTime(); t <= endMs; t += HOUR_MS) {
      if (t < startMs) continue
      ticks.push({
        pct: ((t - startMs) / span) * 100,
        label: format(new Date(t), 'h a'),
        major: index % 2 === 0,
      })
      index += 1
    }

    return { startMs, endMs, span, ticks }
  }, [start, end])

  if (!model) return null

  const { startMs, endMs, span, ticks } = model

  const elapsed = now - startMs
  const pct = Math.min(100, Math.max(0, (elapsed / span) * 100))

  const status =
    now < startMs
      ? { text: `Starts in ${humanise(startMs - now)}`, tone: 'text-muted' as const }
      : now > endMs
        ? { text: 'Shift window closed', tone: 'text-faint' as const }
        : { text: `${humanise(endMs - now)} remaining`, tone: 'text-body' as const }

  const live = now >= startMs && now <= endMs

  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
          Shift window
        </span>
        <span className={cn('numeric text-sm font-semibold tabular-nums', status.tone)}>
          {status.text}
        </span>
      </div>

      <div className="relative mt-3 h-2.5 rounded-full bg-sunken ring-1 ring-line/60 ring-inset">
        {ticks.map((tick) => (
          <span
            key={tick.pct}
            aria-hidden="true"
            className="absolute top-0 h-full w-px bg-line"
            style={{ left: `${tick.pct}%` }}
          />
        ))}

        <div
          className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-brand/45 to-brand"
          style={{ width: `${pct}%` }}
        />

        {live && (
          <span
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pct}%` }}
          >
            <span className="block h-4 w-4 rounded-full border-2 border-raised bg-brand shadow-raised" />
          </span>
        )}
      </div>

      {/* Labels are positioned rather than spaced, so each one sits under the
          tick it names even though the hours are not evenly spaced in pixels
          when the window does not start exactly on the hour. */}
      <div className="relative mt-2.5 h-4">
        {ticks
          .filter((tick) => tick.major)
          .map((tick) => (
            <span
              key={tick.pct}
              className="numeric absolute -translate-x-1/2 text-xs whitespace-nowrap text-muted tabular-nums"
              style={{
                left: `${tick.pct}%`,
                // Keep the first and last labels inside the track instead of
                // hanging off the edge of the panel.
                transform:
                  tick.pct <= 1
                    ? 'translateX(0)'
                    : tick.pct >= 99
                      ? 'translateX(-100%)'
                      : 'translateX(-50%)',
              }}
            >
              {tick.label}
            </span>
          ))}
      </div>
    </div>
  )
}

/** "5h 22m", or "48m" under an hour. */
function humanise(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000))
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}
