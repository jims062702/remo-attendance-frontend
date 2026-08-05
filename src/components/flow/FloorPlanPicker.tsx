import { useMemo } from 'react'
import { cn } from '@/utils/format'
import { Icon } from '@/components/ui/Icon'
import type { WorkstationOption } from '@/types'

/**
 * The PC picker, drawn as the room.
 *
 * A tasker is not choosing a machine from a catalogue; they are identifying the
 * desk they are already sitting at. That is a spatial question, and a list
 * answers it badly -- you have to know your PC number before you can find your
 * PC. Laid out as the floor, you find yourself by where you are: third pod
 * down, front row, two in from the aisle.
 *
 * The layout is entirely data-driven. Every machine carries a block, row and
 * column, so re-arranging the room is a data edit rather than a change here.
 * Nothing about the number of pods, their widths, or the serpentine numbering
 * is encoded in this component.
 */

interface FloorPlanPickerProps {
  workstations: WorkstationOption[]
  value: string
  onChange: (value: string) => void
  /** The tasker's own claim, which stays selectable even though it reads taken. */
  currentId?: number | null
}

type Pod = {
  block: number
  rows: { row: number; seats: WorkstationOption[] }[]
}

export function FloorPlanPicker({
  workstations,
  value,
  onChange,
  currentId,
}: FloorPlanPickerProps) {
  const { pods, unplaced } = useMemo(() => {
    const placed = workstations.filter(
      (pc) => pc.floor_block != null && pc.floor_row != null && pc.floor_col != null,
    )

    const byBlock = new Map<number, Map<number, WorkstationOption[]>>()

    for (const pc of placed) {
      const block = byBlock.get(pc.floor_block!) ?? new Map<number, WorkstationOption[]>()
      const row = block.get(pc.floor_row!) ?? []
      row.push(pc)
      block.set(pc.floor_row!, row)
      byBlock.set(pc.floor_block!, block)
    }

    const built: Pod[] = [...byBlock.entries()]
      .sort(([a], [b]) => a - b)
      .map(([block, rows]) => ({
        block,
        rows: [...rows.entries()]
          .sort(([a], [b]) => a - b)
          .map(([row, seats]) => ({
            row,
            seats: [...seats].sort((a, b) => (a.floor_col ?? 0) - (b.floor_col ?? 0)),
          })),
      }))

    return {
      pods: built,
      unplaced: workstations.filter((pc) => pc.floor_block == null),
    }
  }, [workstations])

  if (pods.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center">
        <p className="text-[15px] font-medium text-body">No floor plan has been set up yet</p>
        <p className="mt-1 text-[13px] text-muted">
          Switch to the list view to pick your PC, or ask an admin to position the machines.
        </p>
      </div>
    )
  }

  /*
   * The side row is drawn beside the pods rather than beneath them.
   *
   * It is the run of desks against the wall, and putting it under the last pod
   * would move a whole side of the room to the far end of it -- which is the
   * one thing a map must not do. Identified as the block whose rows are all a
   * single seat, so it stays correct if the room gains another pod.
   */
  const sideRail = pods.find((pod) => pod.rows.every((row) => row.seats.length === 1))
  const mainPods = pods.filter((pod) => pod !== sideRail)

  return (
    <div className="space-y-3">
      <Legend />

      <div className="overflow-x-auto rounded-2xl border border-line bg-sunken/50 p-3 sm:p-4">
        {/* min-width keeps the pods from crushing into unreadable slivers on a
            phone; the container scrolls instead, which preserves the geometry
            that makes the map readable at all. */}
        <div className="flex min-w-[38rem] gap-3">
          <div className="flex-1 space-y-4">
            {mainPods.map((pod) => (
              <div key={pod.block} className="space-y-1.5">
                {pod.rows.map((row) => (
                  <div
                    key={row.row}
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: `repeat(${row.seats.length}, minmax(0, 1fr))` }}
                  >
                    {row.seats.map((pc) => (
                      <Seat
                        key={pc.id}
                        pc={pc}
                        selected={String(pc.id) === value}
                        isOwn={currentId === pc.id}
                        onSelect={() => onChange(String(pc.id))}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}

            {/* The IT room is a landmark, not a desk. It is here purely so the
                map is recognisable as this room at a glance. */}
            <div className="mt-4 flex justify-end">
              <div className="grid h-16 w-40 place-items-center rounded-lg bg-neutral-soft text-[13px] font-bold tracking-[0.1em] text-muted uppercase">
                IT Room
              </div>
            </div>
          </div>

          {sideRail && (
            <div className="flex w-24 shrink-0 flex-col gap-1.5">
              {sideRail.rows.map((row) => (
                <div key={row.row}>
                  {row.seats.map((pc) => (
                    <Seat
                      key={pc.id}
                      pc={pc}
                      selected={String(pc.id) === value}
                      isOwn={currentId === pc.id}
                      onSelect={() => onChange(String(pc.id))}
                    />
                  ))}
                </div>
              ))}

              <div className="mt-2 grid h-14 place-items-center rounded-lg border border-warn/40 bg-warn-soft text-[12px] font-bold tracking-[0.1em] text-warn uppercase">
                Door
              </div>
            </div>
          )}
        </div>
      </div>

      {unplaced.length > 0 && (
        <p className="text-[13px] text-muted">
          {unplaced.length} machine{unplaced.length === 1 ? '' : 's'} {unplaced.length === 1 ? 'is' : 'are'}{' '}
          not on the plan yet. Use the list view to pick {unplaced.length === 1 ? 'it' : 'one'}.
        </p>
      )}
    </div>
  )
}

function Legend() {
  const items = [
    { label: 'Free', className: 'border-ok/50 bg-ok-soft' },
    { label: 'Taken', className: 'border-line bg-sunken' },
    { label: 'Yours', className: 'border-brand bg-brand' },
    { label: 'Support', className: 'border-info/50 bg-info-soft' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-[13px] text-muted">
          <span className={cn('h-3 w-3 rounded border', item.className)} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function Seat({
  pc,
  selected,
  isOwn,
  onSelect,
}: {
  pc: WorkstationOption
  selected: boolean
  isOwn: boolean
  onSelect: () => void
}) {
  // Support desks are drawn so the map matches the room, but are never
  // claimable. Someone else's claim blocks the seat; your own does not.
  const blocked = pc.is_support || (pc.is_claimed && !isOwn && !selected)

  // Only the number is drawn: the prefix is identical on every tile and the
  // location suffix is the room you are standing in.
  //
  // Captured rather than stripped. Names carry a suffix now ("PC-06 3F C"),
  // and a rule that deleted the prefix left "6 3F C" sitting in a tile sized
  // for two characters.
  const short = pc.name.match(/^PC[-\s]?0*(\d+)/i)?.[1] ?? pc.name

  const state = pc.is_support
    ? 'support'
    : selected
      ? 'selected'
      : pc.is_claimed
        ? 'taken'
        : 'free'

  return (
    <label
      className={cn('relative block', blocked ? 'cursor-not-allowed' : 'cursor-pointer')}
      // Still on the tile itself, for the long names the two drawn lines clip.
      title={
        pc.is_support
          ? `${pc.name} — Support`
          : pc.is_claimed
            ? `${pc.name} — taken by ${pc.claimed_by}`
            : `${pc.name} — free`
      }
    >
      <input
        type="radio"
        name="workstation"
        value={pc.id}
        checked={selected}
        disabled={blocked}
        onChange={onSelect}
        className="peer sr-only"
      />

      <span
        className={cn(
          // Taller than it was: the occupant's full name needs two lines, and
          // the operations floor plan this mirrors draws them the same way.
          'flex h-[4.5rem] flex-col items-center justify-center rounded-lg border px-1 transition-all duration-150',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-1',
          state === 'selected' && 'border-brand bg-brand text-on-brand shadow-raised',
          state === 'free' &&
            'border-ok/50 bg-ok-soft text-body hover:-translate-y-0.5 hover:border-ok hover:shadow-card',
          state === 'taken' && 'border-line bg-sunken text-faint',
          state === 'support' && 'border-info/50 bg-info-soft text-info',
        )}
      >
        <span className="numeric text-[15px] leading-none font-bold tabular-nums">{short}</span>

        <span className="mt-1 line-clamp-2 max-w-full text-center text-[10px] leading-[1.15] break-words hyphens-auto">
          {state === 'selected' ? (
            <span className="inline-flex items-center gap-0.5 font-semibold">
              <Icon name="check" size={10} strokeWidth={3} />
              You
            </span>
          ) : state === 'support' ? (
            'Support'
          ) : state === 'taken' ? (
            // The full name, wrapped over two lines.
            //
            // This was the first word only, on the reasoning that a full name
            // never fits. It does not fit on one line -- but "Maria" is not an
            // identification on a floor with three of them, and confirming you
            // are at the right desk is the entire job of this label. Anything
            // past two lines is clipped and still reachable in the tooltip.
            (pc.claimed_by ?? 'Taken')
          ) : (
            <span className="text-ok">Free</span>
          )}
        </span>
      </span>
    </label>
  )
}
