import type { ReactNode } from 'react'
import { cn } from '@/utils/format'
import { Icon, type IconName } from '@/components/ui/Icon'

interface StepPanelProps {
  index: number
  total: number
  title: string
  /**
   * What this step does, and what it causes.
   *
   * The consequence is the part that matters: "choosing your PC times you in on
   * the server clock" is the single fact that stops a tasker browsing the picker
   * at 9 PM and accidentally starting their shift an hour early.
   */
  purpose: string
  icon?: IconName
  children: ReactNode
  /** The action bar. Sticks to the bottom of the viewport on a long form. */
  footer?: ReactNode
}

/**
 * The shell every step of the nightly flow is rendered in.
 *
 * Shared so the three steps are visibly the same kind of thing. Before this,
 * each step was an ad-hoc stack of cards with its buttons wherever the markup
 * happened to end, which is what makes a wizard feel like three unrelated
 * screens rather than one sequence.
 *
 * The footer is sticky because two of these steps are long enough to scroll,
 * and a primary action you have to go looking for reads as a dead end.
 */
export function StepPanel({
  index,
  total,
  title,
  purpose,
  icon,
  children,
  footer,
}: StepPanelProps) {
  return (
    <section aria-label={title} className="space-y-4">
      <header className="overflow-hidden rounded-2xl border border-line bg-raised shadow-card">
        <div className="flex items-start gap-3.5 p-5">
          {icon && (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <Icon name={icon} size={21} />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.14em] text-faint uppercase">
              Step {index} of {total}
            </p>
            <h2 className="mt-1 text-xl leading-tight font-semibold tracking-tight text-body">
              {title}
            </h2>
            <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted">{purpose}</p>
          </div>
        </div>
      </header>

      {children}

      {footer && (
        <div
          className={cn(
            'sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3',
            'rounded-2xl border border-line bg-raised/85 px-4 py-3 shadow-raised backdrop-blur-xl',
          )}
        >
          {footer}
        </div>
      )}
    </section>
  )
}

interface SubStepProps {
  index: number
  title: string
  description?: string
  /** True once this sub-question has an answer. Drives the tick. */
  done?: boolean
  children: ReactNode
}

/**
 * One numbered question inside a step.
 *
 * The attendance step asks three separate things. As three plain cards they
 * read as three unrelated forms and the tasker cannot tell how much is left;
 * numbered and ticked, the step announces its own length and shows progress
 * through it.
 */
export function SubStep({ index, title, description, done = false, children }: SubStepProps) {
  return (
    <section className="rounded-2xl border border-line bg-raised shadow-card">
      <div className="flex items-start gap-3 px-5 pt-5 pb-4">
        <span
          className={cn(
            'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold transition-colors',
            done ? 'bg-ok text-white' : 'bg-sunken text-muted',
          )}
        >
          <span key={done ? 'done' : 'todo'} className="pop-in">
            {done ? <Icon name="check" size={14} /> : index}
          </span>
        </span>
        <div className="min-w-0">
          <h3 className="text-[16px] leading-snug font-semibold text-body">{title}</h3>
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
          )}
        </div>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </section>
  )
}
