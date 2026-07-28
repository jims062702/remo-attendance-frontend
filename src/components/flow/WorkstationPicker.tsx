import { useMemo, useState } from 'react'
import { cn } from '@/utils/format'
import { Icon } from '@/components/ui/Icon'
import type { WorkstationOption } from '@/types'

/**
 * How many tiles are rendered at once.
 *
 * A floor can hold a great many machines, and painting all of them would cost
 * a long first render on exactly the screen a tasker is trying to get through
 * quickly. Searching is faster than scrolling past two hundred desks anyway,
 * so the cap doubles as a nudge toward the search box -- and the count of what
 * is hidden is always shown, so the list never silently lies about its length.
 */
const RENDER_LIMIT = 48

interface WorkstationPickerProps {
  workstations: WorkstationOption[]
  /** The currently selected id, as a string (matches the form state). */
  value: string
  onChange: (value: string) => void
  loading?: boolean
  invalid?: boolean
  /**
   * The machine already claimed by this tasker, if any. Kept selectable even
   * when the list marks it taken -- it is taken *by them*.
   */
  currentName?: string | null
}

/**
 * The PC picker.
 *
 * Was a native `<select>`. That control is the wrong shape for this decision in
 * a way that costs real time at the start of every shift: a tasker cannot see
 * which desks are free without opening it and reading down a list where the
 * taken ones are disabled entries indistinguishable at a glance from the rest.
 *
 * As a grid, availability is the first thing you see. Taken machines stay
 * visible rather than being filtered out -- somebody looking for the desk they
 * are physically sitting at needs to find it and learn it is claimed, not
 * conclude the system has lost it.
 */
export function WorkstationPicker({
  workstations,
  value,
  onChange,
  loading = false,
  invalid = false,
  currentName,
}: WorkstationPickerProps) {
  const [search, setSearch] = useState('')

  const matches = useMemo(() => {
    // Support machines belong on the map, where a hole would misrepresent the
    // room. In a flat searchable list there is no such gap to fill, so listing
    // desks nobody can pick would only be noise.
    const selectable = workstations.filter((pc) => !pc.is_support)

    const query = search.trim().toLowerCase()
    if (query === '') return selectable

    return selectable.filter(
      (pc) =>
        pc.name.toLowerCase().includes(query) || (pc.site ?? '').toLowerCase().includes(query),
    )
  }, [workstations, search])

  const shown = matches.slice(0, RENDER_LIMIT)
  const hidden = matches.length - shown.length
  const freeCount = matches.filter((pc) => !pc.is_claimed).length

  if (loading) {
    return (
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="skeleton h-[4.5rem] rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by PC name or site…"
            aria-label="Search workstations"
            className={cn(
              'h-11 w-full rounded-xl border bg-raised pr-3 pl-9 text-[15px] text-body',
              'placeholder:text-faint focus:border-brand focus:outline-none',
              invalid ? 'border-bad' : 'border-line',
            )}
          />
        </div>

        <p className="numeric text-[13px] text-muted tabular-nums">
          <strong className="text-ok">{freeCount}</strong> free
          <span className="text-faint"> · {matches.length} shown</span>
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center">
          <p className="text-[15px] font-medium text-body">No machines match “{search}”</p>
          <p className="mt-1 text-[13px] text-muted">
            Check the name, or clear the search to see everything.
          </p>
        </div>
      ) : (
        <>
          <div
            role="radiogroup"
            aria-label="Workstation"
            className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4"
          >
            {shown.map((pc) => {
              const selected = String(pc.id) === value
              // Claimed by somebody else. Their own claim is still selectable.
              const blocked = pc.is_claimed && !selected

              return (
                <label
                  key={pc.id}
                  className={cn('relative block', blocked ? 'cursor-not-allowed' : 'cursor-pointer')}
                >
                  <input
                    type="radio"
                    name="workstation"
                    value={pc.id}
                    checked={selected}
                    disabled={blocked}
                    onChange={() => onChange(String(pc.id))}
                    className="peer sr-only"
                  />

                  <span
                    className={cn(
                      'flex h-full flex-col justify-between rounded-xl border p-3 transition-all duration-200',
                      'peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2',
                      selected && 'border-brand bg-brand-soft shadow-card',
                      !selected && blocked && 'border-line bg-sunken/60',
                      !selected &&
                        !blocked &&
                        'border-line bg-raised hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-card',
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          'truncate text-[15px] leading-tight font-semibold',
                          selected ? 'text-brand' : blocked ? 'text-faint' : 'text-body',
                        )}
                      >
                        {pc.name}
                      </span>

                      {selected ? (
                        <span className="pop-in grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-on-brand">
                          <Icon name="check" size={13} strokeWidth={3} />
                        </span>
                      ) : (
                        // A dot is not enough on its own -- the state is also
                        // spelled out in words underneath.
                        <span
                          className={cn(
                            'mt-1 h-2 w-2 shrink-0 rounded-full',
                            blocked ? 'bg-bad/60' : 'bg-ok',
                          )}
                          aria-hidden="true"
                        />
                      )}
                    </span>

                    <span className="mt-2 block truncate text-[12px] leading-tight">
                      {blocked ? (
                        <span className="text-faint">Taken · {pc.claimed_by}</span>
                      ) : selected ? (
                        <span className="font-medium text-brand">Your PC</span>
                      ) : (
                        <span className="text-ok">Free</span>
                      )}
                    </span>

                    {pc.site && (
                      <span className="mt-0.5 block truncate text-[12px] text-faint">{pc.site}</span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>

          {hidden > 0 && (
            <p className="text-[13px] text-muted">
              {hidden} more machine{hidden === 1 ? '' : 's'} not shown. Search to narrow the list.
            </p>
          )}
        </>
      )}

      {/* If their claimed desk fell outside the rendered slice, the selection
          is still real and must still be visible somewhere. */}
      {value !== '' && !shown.some((pc) => String(pc.id) === value) && (
        <p className="rounded-lg bg-brand-soft px-3 py-2 text-[13px] text-brand">
          Selected: <strong>{currentName ?? `PC #${value}`}</strong> — not in the list above.
        </p>
      )}
    </div>
  )
}
