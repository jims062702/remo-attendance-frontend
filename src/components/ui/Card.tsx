import { Children, type ReactNode } from 'react'
import { cn } from '@/utils/format'
import { Icon, type IconName } from './Icon'
import { AnimatedNumber } from './AnimatedNumber'
import { Sparkline } from './Sparkline'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-raised shadow-card',
        'transition-shadow duration-200',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  /** A small label above the title, e.g. the section this panel belongs to. */
  eyebrow?: ReactNode
  /** Sits in a tinted tile to the left of the title. */
  icon?: IconName
  className?: string
}

export function CardHeader({
  title,
  description,
  action,
  eyebrow,
  icon,
  className,
}: CardHeaderProps) {
  return (
    <div
      className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-4', className)}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <Icon name={icon} size={18} />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-xs font-bold tracking-[0.12em] text-faint uppercase">
              {eyebrow}
            </p>
          )}
          <h2 className="text-[17px] font-semibold tracking-tight text-body">{title}</h2>
          {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function CardBody({ children, className }: CardProps) {
  return <div className={cn('p-5', className)}>{children}</div>
}

type Tone = 'default' | 'ok' | 'warn' | 'bad' | 'brand'

interface StatCardProps {
  label: string
  /**
   * A number counts up to itself; anything else is rendered as given.
   *
   * Passing the raw number rather than a preformatted string is what makes the
   * count possible -- a string has no intermediate values to animate through --
   * so prefer `value={total} format={formatNumber}` over `value={f(total)}`.
   * Null and undefined render as an em dash, matching the format helpers.
   */
  value: ReactNode | number | null | undefined
  /** Turns each frame of a numeric count into the string on screen. */
  format?: (value: number) => string
  hint?: ReactNode
  tone?: Tone
  icon?: IconName
  /** A signed change, e.g. "+32.7%", shown as a pill beside the value. */
  delta?: string
  deltaTone?: 'ok' | 'bad' | 'neutral'
  /** A trend series. Rendered as a sparkline under the value. */
  series?: number[]
  /** 0–1. Draws a progress bar under the value. */
  progress?: number
  className?: string
}

const VALUE_TONES: Record<Tone, string> = {
  default: 'text-body',
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-bad',
  brand: 'text-brand',
}

const ICON_TONES: Record<Tone, string> = {
  default: 'bg-neutral-soft text-muted',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  brand: 'bg-brand-soft text-brand',
}

const BAR_TONES: Record<Tone, string> = {
  default: 'bg-muted',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  brand: 'bg-brand',
}

const SPARK_TONES: Record<Tone, 'brand' | 'ok' | 'bad' | 'muted'> = {
  default: 'brand',
  ok: 'ok',
  warn: 'bad',
  bad: 'bad',
  brand: 'brand',
}

const DELTA_TONES = {
  ok: 'bg-ok-soft text-ok',
  bad: 'bg-bad-soft text-bad',
  neutral: 'bg-neutral-soft text-muted',
}

/**
 * A headline figure.
 *
 * Laid out as icon-and-label on one line, then the value: the label is
 * supporting text, so it is set small and quiet while the number carries the
 * weight. These are scanned across a row, not read one at a time.
 */
export function StatCard({
  label,
  value,
  format = (n) => n.toLocaleString(),
  hint,
  tone = 'default',
  icon,
  delta,
  deltaTone = 'neutral',
  series,
  progress,
  className,
}: StatCardProps) {
  const rendered =
    typeof value === 'number' ? (
      <AnimatedNumber value={value} format={format} />
    ) : value === null || value === undefined ? (
      '—'
    ) : (
      value
    )

  return (
    <div
      data-tone={tone}
      className={cn(
        'stat-tile h-full rounded-2xl border border-line bg-raised px-5 py-4 shadow-card',
        'hover:border-brand/40',
        className,
      )}
    >
      <div className="relative flex items-center gap-2.5">
        {icon && (
          <span
            className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', ICON_TONES[tone])}
          >
            <Icon name={icon} size={18} />
          </span>
        )}
        <p className="truncate text-sm font-medium text-muted">{label}</p>
      </div>

      <div className="relative mt-3 flex flex-wrap items-baseline gap-2.5">
        <p
          className={cn(
            'numeric text-[30px] leading-none font-semibold tracking-tight tabular-nums',
            VALUE_TONES[tone],
          )}
        >
          {rendered}
        </p>
        {delta && (
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', DELTA_TONES[deltaTone])}>
            {delta}
          </span>
        )}
      </div>

      {progress !== undefined && (
        <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-sunken">
          <div
            className={cn('grow-x h-full rounded-full', BAR_TONES[tone])}
            style={{
              width: `${Math.min(100, Math.max(0, (Number.isFinite(progress) ? progress : 0) * 100))}%`,
            }}
          />
        </div>
      )}

      {series && series.length > 1 && (
        <div className="relative mt-3 flex h-7 items-end">
          <Sparkline
            data={series}
            tone={SPARK_TONES[tone]}
            filled
            width={112}
            height={26}
            label={`${label} trend`}
          />
        </div>
      )}

      {hint && <p className="relative mt-2.5 text-[13px] leading-relaxed text-muted">{hint}</p>}
    </div>
  )
}

interface StatGridProps {
  children: ReactNode
  /**
   * Flip to true when the real figures are present, not when the shell mounts.
   * Same reasoning as Reveal: an animation that runs against a skeleton is
   * finished before anyone sees the number it was meant to introduce.
   */
  ready?: boolean
  /** Columns at the widest breakpoint. Below that it steps down to 2, then 1. */
  columns?: 2 | 3 | 4 | 5 | 6
  /** Milliseconds between one tile arriving and the next. */
  stagger?: number
  className?: string
}

const GRID_COLS: Record<NonNullable<StatGridProps['columns']>, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  // Six tiles fold to three-by-two rather than to a six-wide row that would
  // squeeze each figure below legibility on anything but a very wide screen.
  6: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
}

/**
 * A row of statistics that arrives one tile at a time.
 *
 * The stagger is doing the same job as the one on the dashboard's panels: it
 * walks the eye across the row in reading order instead of presenting five
 * finished figures simultaneously, which is what makes a stat row read as a
 * report rather than as a wall.
 *
 * Keyed on readiness so the entrance replays when the figures actually land --
 * a CSS animation does not re-run when React updates the same node in place.
 */
export function StatGrid({
  children,
  ready = true,
  columns = 4,
  stagger = 60,
  className,
}: StatGridProps) {
  const items = Children.toArray(children)

  return (
    <div
      key={ready ? 'ready' : 'pending'}
      className={cn('grid gap-4', GRID_COLS[columns], className)}
    >
      {items.map((child, index) => (
        <div
          key={index}
          className={cn(ready && 'rise-in')}
          style={ready ? { animationDelay: `${index * stagger}ms` } : undefined}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  /** A small label above the title, e.g. which section this page belongs to. */
  eyebrow?: ReactNode
}

/**
 * The heading block every page opens with. Shared so the type scale and
 * spacing are identical everywhere rather than each page inventing its own.
 */
export function PageHeader({ title, description, action, eyebrow }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-bold tracking-[0.14em] text-faint uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[30px] leading-tight font-semibold tracking-tight text-body">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
