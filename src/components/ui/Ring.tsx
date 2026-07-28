import { useEffect, useState, type ReactNode } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/utils/format'

type RingTone = 'brand' | 'ok' | 'warn' | 'bad'

interface RingProps {
  /** 0–1. Values outside the range are clamped rather than drawn wrong. */
  value: number
  size?: number
  thickness?: number
  tone?: RingTone
  /** Rendered in the middle — usually the percentage and a one-word caption. */
  children?: ReactNode
  className?: string
  /** The ring is decorative on its own; this carries the value to a reader. */
  label: string
}

const TONE_VARS: Record<RingTone, string> = {
  brand: 'var(--brand)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  bad: 'var(--bad)',
}

/**
 * A progress ring.
 *
 * A single proportion — attendance rate, completion — reads faster as a filled
 * arc than as a number alone, because the remainder is visible: 82% and the
 * gap that makes up the other 18% arrive together.
 *
 * Drawn with a stroke-dashoffset rather than an arc path so the sweep is one
 * interpolated number, which means it can be transitioned smoothly and can
 * never produce the large-arc-flag bug that makes a >50% arc render inside out.
 */
export function Ring({
  value,
  size = 96,
  thickness = 9,
  tone = 'brand',
  children,
  className,
  label,
}: RingProps) {
  const reducedMotion = useReducedMotion()
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))

  // Held at zero for one paint so the CSS transition below has somewhere to
  // sweep from -- set directly, the arc would simply appear at its final angle.
  const [swept, setSwept] = useState(reducedMotion ? clamped : 0)
  useEffect(() => {
    if (reducedMotion) {
      setSwept(clamped)
      return
    }
    const frame = requestAnimationFrame(() => setSwept(clamped))
    return () => cancelAnimationFrame(frame)
  }, [clamped, reducedMotion])

  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--sunken)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={TONE_VARS[tone]}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - swept)}
          // Start the sweep at twelve o'clock instead of three.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        {children}
      </div>
    </div>
  )
}
