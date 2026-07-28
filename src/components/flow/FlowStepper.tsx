import { cn } from '@/utils/format'
import { Icon } from '@/components/ui/Icon'

export interface FlowStep {
  key: string
  /** The step's name. Short enough to read at a glance. */
  label: string
  /** What this step is FOR, in one line. Shown while the step is current. */
  purpose: string
  done: boolean
  /**
   * Why this step cannot be opened yet. Undefined means it is reachable.
   *
   * Phrased as the thing to go and do ("File your attendance first — that is
   * what starts the clock"), not as a refusal, because the tasker reading it
   * is trying to work out what to do next.
   */
  lockedReason?: string
  /** What was actually recorded, once done. e.g. "4–6 hrs · PC-12 · in 10:05 PM" */
  summary?: string
}

interface FlowStepperProps {
  steps: FlowStep[]
  current: string
  onSelect: (key: string) => void
}

/**
 * The whole nightly flow, on one surface.
 *
 * This is the answer to "what does this system want from me tonight?". A row of
 * numbered circles says there are three steps but not what any of them is for,
 * what has already been recorded, or why the third one will not open -- so the
 * tasker learns the flow by trial and error, once per person, every night until
 * they memorise it.
 *
 * Each step therefore carries four things: where it sits in the sequence, its
 * state, and then EITHER what it recorded (done) or what it is for (current) or
 * what is blocking it (locked). Those three are mutually exclusive by
 * construction, so the tile is never ambiguous and never empty.
 *
 * Rendered as tiles in a grid rather than as circles joined by connectors: the
 * connectors are the first thing to break when the labels wrap on a narrow
 * screen, and they carry no information that the numbering does not.
 */
export function FlowStepper({ steps, current, onSelect }: FlowStepperProps) {
  const doneCount = steps.filter((step) => step.done).length
  const currentIndex = Math.max(0, steps.findIndex((step) => step.key === current))
  const allDone = doneCount === steps.length

  return (
    <section
      aria-label="Tonight’s flow"
      className="overflow-hidden rounded-2xl border border-line bg-raised shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand">
            <Icon name="clipboard" size={17} />
          </span>
          <div>
            <h2 className="text-[15px] leading-tight font-semibold text-body">Tonight’s flow</h2>
            <p className="text-[13px] leading-tight text-muted">
              {allDone
                ? 'All three steps are done. Your night is filed.'
                : `Step ${currentIndex + 1} of ${steps.length} — ${steps[currentIndex]?.label}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="numeric text-[13px] font-semibold text-muted tabular-nums">
            {doneCount}/{steps.length} done
          </span>
          {/* The same completion figure as a bar, so progress is legible
              without reading it. */}
          <div
            className="h-1.5 w-24 overflow-hidden rounded-full bg-sunken"
            role="img"
            aria-label={`${doneCount} of ${steps.length} steps complete`}
          >
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-700 ease-out',
                allDone ? 'bg-ok' : 'bg-brand',
              )}
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <ol className="grid gap-px bg-line sm:grid-cols-3">
        {steps.map((step, index) => {
          const isCurrent = step.key === current
          const locked = Boolean(step.lockedReason)

          return (
            <li key={step.key} className="bg-raised">
              <button
                type="button"
                // A locked step is genuinely not openable -- letting it through
                // would land the tasker on a panel that tells them to go back.
                disabled={locked}
                onClick={() => onSelect(step.key)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex h-full w-full flex-col gap-2 px-5 py-4 text-left transition-colors',
                  locked ? 'cursor-not-allowed' : 'hover:bg-sunken/60',
                  isCurrent && 'bg-brand-soft/40',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold',
                      'transition-all duration-200',
                      step.done && 'bg-ok text-white',
                      !step.done && isCurrent && 'bg-brand text-on-brand ring-4 ring-brand/15',
                      !step.done && !isCurrent && 'bg-sunken text-faint',
                    )}
                  >
                    {/* Keyed so the tick genuinely remounts and pops when the
                        step completes, rather than silently swapping glyph. */}
                    <span key={step.done ? 'done' : 'todo'} className="pop-in">
                      {step.done ? <Icon name="check" size={16} /> : index + 1}
                    </span>
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-[15px] leading-tight font-semibold',
                        isCurrent ? 'text-body' : step.done ? 'text-body' : 'text-faint',
                      )}
                    >
                      {step.label}
                    </p>
                    <p
                      className={cn(
                        'text-[12px] leading-tight font-bold tracking-[0.1em] uppercase',
                        step.done ? 'text-ok' : locked ? 'text-faint' : isCurrent ? 'text-brand' : 'text-faint',
                      )}
                    >
                      {step.done ? 'Done' : locked ? 'Locked' : isCurrent ? 'You are here' : 'To do'}
                    </p>
                  </div>
                </div>

                {/* Exactly one of these three, never none: what it recorded,
                    what is blocking it, or what it is for. */}
                <p className="text-[13px] leading-snug text-muted">
                  {step.done && step.summary ? (
                    <span className="text-body">{step.summary}</span>
                  ) : locked ? (
                    <span className="inline-flex items-start gap-1.5">
                      <Icon name="clock" size={13} className="mt-0.5 shrink-0 text-faint" />
                      {step.lockedReason}
                    </span>
                  ) : (
                    step.purpose
                  )}
                </p>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
