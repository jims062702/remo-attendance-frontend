import type { ElementType, ReactNode } from 'react'
import { cn } from '@/utils/format'
import { useInView } from '@/hooks/useInView'
import { useReducedMotion } from '@/hooks/useReducedMotion'

type Direction = 'up' | 'down' | 'left' | 'right' | 'fade'

interface ScrollRevealProps {
  children: ReactNode
  /** Which way the content travels from. "up" rises from below. */
  direction?: Direction
  /** Milliseconds behind the element's own entrance. Use for staggering. */
  delay?: number
  className?: string
  as?: ElementType
}

const DIRECTIONS: Record<Direction, string> = {
  up: 'reveal-up',
  down: 'reveal-down',
  left: 'reveal-left',
  right: 'reveal-right',
  fade: 'fade-in',
}

/**
 * Reveals its children the first time they scroll into view.
 *
 * Distinct from `Reveal`, which fires when *data* arrives — the right trigger
 * inside the application, where a panel's content lands asynchronously and the
 * element was on screen the whole time. On a landing page the content is
 * present from the first byte and it is the reader who moves, so the trigger
 * has to be the viewport.
 *
 * Under reduced motion the element is simply rendered. Not "animated quickly" —
 * the initial state here is `opacity: 0`, so an entrance that is suppressed
 * rather than skipped would leave the whole page invisible. That failure mode
 * is why the hidden state is applied only once the component knows motion is
 * wanted.
 */
export function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  className,
  as: Tag = 'div',
}: ScrollRevealProps) {
  const reducedMotion = useReducedMotion()
  const { ref, inView } = useInView<HTMLDivElement>()

  if (reducedMotion) {
    return <Tag className={className}>{children}</Tag>
  }

  return (
    <Tag
      ref={ref}
      className={cn(!inView && 'opacity-0', inView && DIRECTIONS[direction], className)}
      style={inView && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
