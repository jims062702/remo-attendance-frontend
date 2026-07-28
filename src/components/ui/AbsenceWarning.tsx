import { cn } from '@/utils/format'
import { Icon } from '@/components/ui/Icon'
import { Badge } from '@/components/ui/StatusBadge'
import type { AbsenceRisk } from '@/types'

/**
 * The compact roster marker.
 *
 * Renders nothing at all when there is nothing to say. A column that shows
 * "0 absences" on every well-behaved tasker trains an admin to ignore it,
 * which is the one thing a warning must not do.
 */
export function AbsenceRiskBadge({ risk }: { risk?: AbsenceRisk }) {
  if (!risk || (!risk.at_risk && !risk.approaching)) return null

  const label = `${risk.absences} absence${risk.absences === 1 ? '' : 's'}`

  return (
    <Badge tone={risk.at_risk ? 'bad' : 'warn'}>
      {/* An icon as well as a colour: the difference between the warn and bad
          tones is a hue, and hue alone is not a signal everyone receives. */}
      <span className="inline-flex items-center gap-1">
        <Icon name={risk.at_risk ? 'close' : 'history'} size={12} />
        {risk.at_risk ? `At risk · ${label}` : label}
      </span>
    </Badge>
  )
}

/**
 * The full warning, for a page about one person.
 *
 * Says three things in order: that the threshold was reached, the evidence,
 * and what to do about it. The recommendation is phrased as a recommendation
 * because that is exactly what it is -- the count only reflects absences an
 * admin actually recorded, and nothing here deactivates anybody.
 */
export function AbsenceRiskBanner({
  risk,
  name,
  className,
}: {
  risk?: AbsenceRisk
  name?: string
  className?: string
}) {
  if (!risk || (!risk.at_risk && !risk.approaching)) return null

  const who = name ?? 'This tasker'
  const critical = risk.at_risk

  return (
    <section
      role="alert"
      className={cn(
        'rise-in overflow-hidden rounded-2xl border shadow-card',
        critical ? 'border-bad/40 bg-bad-soft' : 'border-warn/40 bg-warn-soft',
        className,
      )}
    >
      <div className="flex flex-wrap items-start gap-4 p-5">
        <span
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-xl',
            critical ? 'bg-bad text-white' : 'bg-warn text-white',
          )}
        >
          <Icon name={critical ? 'close' : 'history'} size={22} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className={cn('text-[17px] font-semibold', critical ? 'text-bad' : 'text-warn')}>
              {critical
                ? 'Recommended for review — repeated absences'
                : 'Approaching the absence threshold'}
            </h2>
            <span
              className={cn(
                'numeric rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums',
                critical ? 'bg-bad text-white' : 'bg-warn text-white',
              )}
            >
              {risk.absences} / {risk.threshold}
            </span>
          </div>

          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-body">
            {who} has been marked absent{' '}
            <strong>
              {risk.absences} time{risk.absences === 1 ? '' : 's'}
            </strong>{' '}
            in the last {risk.window_days} days
            {critical ? (
              <>
                , reaching the threshold of {risk.threshold}. Consider whether they should be
                discontinued or removed from the roster.
              </>
            ) : (
              <>
                . One more within this window reaches the threshold of {risk.threshold}.
              </>
            )}
          </p>

          {/* The two caveats that decide whether this number can be acted on
              at all. Putting them next to the recommendation is the point --
              they are useless in documentation nobody opens. */}
          <p className="mt-2.5 max-w-2xl text-[13px] leading-relaxed text-muted">
            Counted from {risk.window_start} onward, and only from shifts an admin explicitly marked
            absent — unrecorded absences are not included. Nobody is deactivated automatically; this
            is a recommendation for a person to act on.
          </p>
        </div>
      </div>
    </section>
  )
}
