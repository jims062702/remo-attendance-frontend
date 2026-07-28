import type { ReactNode } from 'react'
import { cn } from '@/utils/format'
import { Icon } from '@/components/ui/Icon'

/**
 * Selection controls for the nightly flow.
 *
 * All three keep a REAL `input` in the markup, visually hidden rather than
 * replaced. A div with an onClick looks identical and quietly loses keyboard
 * operation, focus order, the arrow-key roving that groups radios together,
 * and the announcement of checked state. The visible tile is styled from the
 * input's own `peer` state, so what you see and what assistive technology is
 * told can never disagree.
 */

interface ChoiceTileProps {
  name?: string
  value: string
  checked: boolean
  onChange: () => void
  type?: 'radio' | 'checkbox'
  title: ReactNode
  description?: ReactNode
  /** A short trailing label, e.g. the hours a bracket implies. */
  meta?: ReactNode
  /** Recedes the tile — used for the support entries, which are the exception. */
  subdued?: boolean
  disabled?: boolean
  className?: string
}

/**
 * A large selectable card.
 *
 * For choices that deserve to be read rather than scanned: there are six
 * commitment brackets and picking the wrong one misfiles a whole shift, so
 * they get room, a clear selected state, and a tick that confirms the choice
 * landed.
 */
export function ChoiceTile({
  name,
  value,
  checked,
  onChange,
  type = 'radio',
  title,
  description,
  meta,
  subdued = false,
  disabled = false,
  className,
}: ChoiceTileProps) {
  return (
    <label
      className={cn(
        'group relative block cursor-pointer',
        disabled && 'cursor-not-allowed opacity-55',
        className,
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="peer sr-only"
      />

      <div
        className={cn(
          'relative flex h-full items-start gap-3 overflow-hidden rounded-xl border p-4',
          'transition-all duration-200',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2',
          checked
            ? 'border-brand bg-brand-soft shadow-card'
            : cn(
                'border-line bg-raised',
                !disabled && 'hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card',
              ),
        )}
      >
        {/* The indicator is drawn rather than being the native control, so it
            can match the tile at any size. It still only ever reflects the
            input's state. */}
        <span
          className={cn(
            'mt-0.5 grid h-5 w-5 shrink-0 place-items-center border transition-all duration-200',
            type === 'radio' ? 'rounded-full' : 'rounded-md',
            checked ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
          )}
        >
          {checked && (
            <span className="pop-in">
              <Icon name="check" size={13} strokeWidth={3} />
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-[15px] leading-snug font-semibold',
              checked ? 'text-brand' : subdued ? 'text-muted' : 'text-body',
            )}
          >
            {title}
          </span>
          {description && (
            <span className="mt-0.5 block text-[13px] leading-snug text-muted">{description}</span>
          )}
        </span>

        {meta && (
          <span className="numeric shrink-0 text-[13px] font-semibold text-faint tabular-nums">
            {meta}
          </span>
        )}
      </div>
    </label>
  )
}

interface ChipProps {
  checked: boolean
  onChange: () => void
  children: ReactNode
  disabled?: boolean
}

/**
 * A compact toggle pill.
 *
 * The tasking statuses are two dozen short phrases across several groups. As
 * stacked checkbox rows that is a wall roughly a screen and a half tall; as
 * wrapping chips the same content reads as a few short lines and the selected
 * ones are visible at a glance instead of needing to be hunted for.
 */
export function Chip({ checked, onChange, children, disabled = false }: ChipProps) {
  return (
    <label className={cn('relative inline-block', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[14px] font-medium',
          'transition-all duration-150',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2',
          checked
            ? 'border-brand bg-brand text-on-brand shadow-card'
            : 'border-line bg-raised text-muted hover:border-brand/40 hover:text-body',
        )}
      >
        {checked && (
          <span className="pop-in -ml-0.5">
            <Icon name="check" size={13} strokeWidth={3} />
          </span>
        )}
        {children}
      </span>
    </label>
  )
}
