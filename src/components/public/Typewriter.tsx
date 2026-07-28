import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/utils/format'
import { useReducedMotion } from '@/hooks/useReducedMotion'

type Phase = 'typing' | 'deleting'

interface TypewriterProps {
  /** One phrase, or several to rotate through in order. */
  text: string | string[]
  /** Runs only while true, so it can be tied to the section being on screen. */
  active?: boolean
  /** Milliseconds per character while typing. */
  speed?: number
  /** Milliseconds per character while deleting — always quicker than typing. */
  deleteSpeed?: number
  /** How long a finished phrase is held before it rubs itself out. */
  holdMs?: number
  /**
   * What separates the phrases for screen readers.
   *
   * The visible layer rotates, but assistive technology gets the whole set
   * once, as a single static string. Announcing a heading that rewrites itself
   * every few seconds, forever, would be intolerable.
   */
  srSeparator?: string
  className?: string
}

/**
 * Types each phrase out, holds it, deletes it, and moves to the next — looping
 * back to the first indefinitely.
 *
 * Three things make the difference between this and a naive character loop:
 *
 * The box is reserved. The LONGEST phrase is rendered invisibly underneath and
 * the typed text is laid over it, so the heading never changes size — not as
 * characters arrive, and not when a short phrase follows a long one. Without
 * that, everything below the heading shuffles up and down on a loop, which is
 * far more distracting than the typing itself.
 *
 * The rhythm is uneven. A fixed interval sounds mechanical, so each character
 * gets a small random variation and the pause is longer after a space — the
 * cadence of typing rather than of a metronome.
 *
 * Deleting is faster than typing, because that is how it works in reality and
 * a symmetric rub-out feels sluggish.
 */
export function Typewriter({
  text,
  active = true,
  speed = 85,
  deleteSpeed = 35,
  holdMs = 1800,
  srSeparator = ' — ',
  className,
}: TypewriterProps) {
  const reducedMotion = useReducedMotion()

  const phrases = useMemo(() => (Array.isArray(text) ? text : [text]), [text])

  const [index, setIndex] = useState(0)
  const [count, setCount] = useState(0)
  const [phase, setPhase] = useState<Phase>('typing')

  // The sizer. Measured by character count rather than rendered width, which
  // is close enough for a heading and costs no layout read.
  const longest = useMemo(
    () => phrases.reduce((a, b) => (b.length > a.length ? b : a), phrases[0] ?? ''),
    [phrases],
  )

  const current = phrases[Math.min(index, phrases.length - 1)] ?? ''

  useEffect(() => {
    // A heading that rewrites itself forever is decoration, and decoration is
    // exactly what a reduced-motion request is asking to be spared.
    if (reducedMotion) return

    if (!active) {
      // Rewound so returning to the section starts from the first phrase
      // rather than resuming mid-word.
      setIndex(0)
      setCount(0)
      setPhase('typing')
      return
    }

    let delay: number

    if (phase === 'typing') {
      if (count >= current.length) {
        delay = holdMs
      } else {
        // A beat after a space, the way a hand pauses between words.
        delay = speed + (current[count - 1] === ' ' ? 140 : 0) + Math.random() * 45
      }
    } else {
      delay = count <= 0 ? 320 : deleteSpeed + Math.random() * 20
    }

    const timer = window.setTimeout(() => {
      if (phase === 'typing') {
        if (count >= current.length) setPhase('deleting')
        else setCount((n) => n + 1)
        return
      }

      if (count <= 0) {
        // Next phrase, wrapping back to the first.
        setIndex((n) => (n + 1) % phrases.length)
        setPhase('typing')
      } else {
        setCount((n) => n - 1)
      }
    }, delay)

    return () => window.clearTimeout(timer)
  }, [
    count,
    phase,
    active,
    current,
    phrases.length,
    speed,
    deleteSpeed,
    holdMs,
    reducedMotion,
  ])

  if (reducedMotion) {
    return <span className={className}>{phrases.join(srSeparator)}</span>
  }

  return (
    <span className={cn('relative inline-block align-bottom', className)}>
      {/* Every phrase, once, statically — the accessible version of the loop. */}
      <span className="sr-only">{phrases.join(srSeparator)}</span>

      {/*
        Holds the final box so nothing reflows as phrases come and go.

        The caret is rendered here too, invisibly. The sizer must contain
        exactly what the visible layer will contain: reserving only the text
        left the overlay a few pixels wider than its own box, so once the
        longest phrase finished typing the caret had nowhere to go and wrapped
        onto a line of its own — pushing everything below it down.
      */}
      <span aria-hidden="true" className="invisible whitespace-pre-wrap">
        {longest}
        <Caret />
      </span>

      <span aria-hidden="true" className="absolute inset-0 whitespace-pre-wrap">
        {/* The trailing word and the caret are kept on one line together, so a
            phrase that does wrap breaks between words rather than stranding
            the caret by itself. */}
        {current.slice(0, count)}
        <Caret blinking />
      </span>
    </span>
  )
}

/**
 * The cursor.
 *
 * An element rather than a trailing character, so it cannot end up in a copied
 * selection or in the accessible name. Rendered in both the sizer and the
 * visible layer, which is what keeps the two boxes identical.
 */
function Caret({ blinking = false }: { blinking?: boolean }) {
  return (
    <span
      className={cn(
        'ml-1 inline-block h-[0.8em] w-[3px] translate-y-[0.06em] rounded-full bg-brand align-baseline',
        blinking && 'caret-blink',
      )}
    />
  )
}
