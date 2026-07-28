import { cn } from '@/utils/format'

interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  /** Names the control for screen readers, since there is no visible label. */
  ariaLabel: string
  size?: 'sm' | 'md'
  className?: string
}

/**
 * A segmented control — the toolbar form for a short, mutually exclusive
 * choice.
 *
 * Used instead of a <select> for ranges and groupings: with three or four
 * options the whole choice set is worth showing, and switching costs one click
 * rather than open-scan-pick. It also keeps the filter inline in a header
 * rather than needing a filter card of its own, which is a whole row of the
 * page spent on two controls.
 *
 * Buttons with aria-pressed rather than a radiogroup: each segment stays
 * individually tabbable, so there is no arrow-key roving focus to implement
 * (and get subtly wrong).
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = 'md',
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-xl border border-line bg-sunken p-1',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg font-medium whitespace-nowrap transition-all duration-150',
              size === 'sm' ? 'px-3 py-1.5 text-[13px]' : 'px-3.5 py-2 text-sm',
              active
                ? // The selected segment lifts onto the raised surface rather
                  // than being painted a block of brand colour — the control is
                  // chrome, and should not out-shout the data it filters.
                  'bg-raised text-body shadow-card'
                : 'text-muted hover:text-body',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
