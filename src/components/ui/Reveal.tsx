import type { ReactNode } from 'react'
import { cn } from '@/utils/format'

interface RevealProps {
  /** Flip to true when the real content is present, not when the shell mounts. */
  ready: boolean
  delay?: number
  className?: string
  children: ReactNode
}

/**
 * Plays an entrance animation at the moment content actually arrives.
 *
 * The problem this solves is a timing one that is easy to get wrong and
 * invisible in code review. A wrapper carrying `rise-in` mounts with the page,
 * so its animation runs against an empty skeleton and is finished by the time
 * the API responds. React then swaps in the real content by updating that same
 * DOM node -- and a CSS animation does not replay on re-render. The result is a
 * page that animates nothing you can see, which is exactly what "no animation
 * on refresh" looks like.
 *
 * Changing the key across the ready boundary makes React discard the old node
 * and mount a fresh one, which starts the animation over with the content in
 * place. The class is also withheld until ready, so the skeleton itself does
 * not slide around underneath.
 */
export function Reveal({ ready, delay = 0, className, children }: RevealProps) {
  return (
    <div
      key={ready ? 'ready' : 'pending'}
      className={cn(ready && 'rise-in', className)}
      style={ready && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
