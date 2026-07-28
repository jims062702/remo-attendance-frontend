import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/utils/format'

interface AnimatedNumberProps {
  value: number | null | undefined
  /** Turns the running number into the string on screen. */
  format?: (value: number) => string
  duration?: number
  className?: string
  /** Rendered instead of the number when the value is null or undefined. */
  placeholder?: string
  /**
   * Holds the count at zero until this turns true.
   *
   * Exists for figures below the fold. A counter that runs on mount has always
   * finished by the time it is scrolled to, so the reader arrives at a static
   * number and the animation is spent on nobody.
   */
  start?: boolean
}

/** Fast at the start, settling gently -- a figure arriving, not a slot machine. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * A figure that counts to its value.
 *
 * Two reasons beyond decoration. It makes a number that has *changed* obvious
 * on a dashboard that refetches every sixty seconds -- a silent swap from 12 to
 * 13 is easy to miss, a count is not. And it gives the eye something to land on
 * as the page paints, so a screen full of statistics does not arrive all at
 * once.
 *
 * Counts from the previous value rather than from zero, so the 60-second
 * refetch nudges 96.5 -> 98.0 instead of replaying the whole number every
 * minute, which would be maddening on a screen someone is watching all night.
 */
export function AnimatedNumber({
  value,
  format = (n) => n.toLocaleString(),
  duration = 1100,
  className,
  placeholder = '—',
  start = true,
}: AnimatedNumberProps) {
  const reducedMotion = useReducedMotion()
  // Always starts at zero, never seeded from the incoming value. Seeding it
  // meant that a component mounting with its data already present -- anything
  // rendered behind a `loading ? skeleton : content` gate, which is most of a
  // dashboard -- had from === to on its first effect and silently skipped the
  // count entirely.
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)
  const frameRef = useRef<number | undefined>(undefined)

  /*
   * Rewind whenever the figure leaves the viewport.
   *
   * Without this a counter only ever animates once: the second time it is
   * scrolled to, `fromRef` still holds the finished value, `from === to`, and
   * the count is skipped entirely. Resetting on the way out is what lets it
   * run again on the way back in.
   *
   * Inert wherever `start` is left at its default of true -- which is every
   * use inside the application, where the trigger is data arriving rather than
   * scrolling.
   */
  useEffect(() => {
    if (start) return

    fromRef.current = 0
    setDisplay(0)
  }, [start])

  useEffect(() => {
    if (value === null || value === undefined) return
    // Held below the fold: stay at zero rather than counting to a figure
    // nobody is looking at yet.
    if (!start) return

    const from = fromRef.current
    const to = value

    if (reducedMotion || from === to) {
      fromRef.current = to
      setDisplay(to)
      return
    }

    // Named for what it is rather than `start`, which is now the prop
    // controlling whether this effect runs at all.
    const startedAt = performance.now()

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      setDisplay(from + (to - from) * easeOutCubic(progress))

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step)
      } else {
        fromRef.current = to
      }
    }

    frameRef.current = requestAnimationFrame(step)

    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current)
      // Remember where the interrupted count got to, so a value arriving
      // mid-animation continues from here instead of jumping backwards.
      fromRef.current = display
    }
    // `display` is deliberately not a dependency: it changes every frame, and
    // depending on it would restart the animation on each one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, reducedMotion, start])

  if (value === null || value === undefined) {
    return <span className={className}>{placeholder}</span>
  }

  return (
    // The final value is what assistive technology reads; the intermediate
    // frames are a visual effect and would otherwise be announced as a stream
    // of meaningless numbers.
    //
    // The figure also carries its own short entrance. A count only reads as a
    // count when there is distance to cover: a metric sitting at 0, or moving
    // 0 -> 1, produces a mathematically perfect animation that is impossible
    // to see. Since a dashboard is mostly zeroes before the shift starts, the
    // tile would look inert exactly when someone is checking whether the
    // system is alive. The entrance makes every figure arrive, and the count
    // adds the detail when the numbers are big enough to show it.
    <span className={cn('inline-block rise-in', className)}>
      <span aria-hidden="true">{format(display)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  )
}
