import type { ReactNode } from 'react'
import { cn } from '@/utils/format'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Sparkline } from '@/components/ui/Sparkline'

type MetricTone = 'default' | 'ok' | 'warn' | 'bad' | 'brand'

export interface RailMetric {
  label: string
  value: ReactNode
  icon: IconName
  tone?: MetricTone
  /** A trend series. Rendered as a sparkline when there is real history. */
  series?: number[]
  /** Shown in the footer slot when no series exists. Never invent a trend. */
  hint?: string
}

const VALUE_TONES: Record<MetricTone, string> = {
  default: 'text-body',
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-bad',
  brand: 'text-brand',
}

const ICON_TONES: Record<MetricTone, string> = {
  default: 'text-faint',
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-bad',
  brand: 'text-brand',
}

/**
 * The tonight-at-a-glance figures, as one instrument cluster.
 *
 * Deliberately NOT five separate cards. Five bordered, shadowed boxes in a row
 * is the most template-looking thing an admin panel can do: every metric is
 * given identical visual weight, the eye finds no entry point, and a third of
 * the width goes to gutters and repeated chrome. Rendering them as segments of
 * a single panel divided by hairlines says what is true -- these belong
 * together and are read across, not one at a time.
 *
 * The hairlines are the 1px grid gap showing the container's own background
 * through, so they stay perfect however the grid reflows at each breakpoint.
 */
export function MetricRail({ metrics }: { metrics: RailMetric[] }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-card sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {metrics.map((metric) => {
        const tone = metric.tone ?? 'default'

        return (
          <div
            key={metric.label}
            className="group flex min-w-0 flex-col justify-between bg-raised px-5 py-4 transition-colors hover:bg-sunken/50"
          >
            <div className="flex items-center gap-2">
              <Icon name={metric.icon} size={16} className={cn('shrink-0', ICON_TONES[tone])} />
              <p className="truncate text-xs font-semibold tracking-[0.08em] text-muted uppercase">
                {metric.label}
              </p>
            </div>

            <p
              className={cn(
                'numeric mt-3.5 text-[32px] leading-none font-semibold tracking-tight tabular-nums',
                VALUE_TONES[tone],
              )}
            >
              {metric.value}
            </p>

            <div className="mt-3.5 flex h-7 items-end">
              {metric.series && metric.series.length > 1 ? (
                <Sparkline
                  data={metric.series}
                  tone={tone === 'default' ? 'brand' : tone === 'warn' ? 'bad' : tone}
                  filled
                  width={108}
                  height={26}
                  label={`${metric.label} trend`}
                />
              ) : (
                <p className="truncate text-[13px] text-muted">{metric.hint}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
