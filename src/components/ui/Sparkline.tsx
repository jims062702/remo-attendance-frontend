import { useId } from 'react'
import { cn } from '@/utils/format'

interface SparklineProps {
  data: number[]
  /** Colour intent. "auto" derives it from whether the series ends up or down. */
  tone?: 'auto' | 'ok' | 'bad' | 'brand' | 'muted'
  width?: number
  height?: number
  /** Fill under the line. Off in dense table cells, on in larger contexts. */
  filled?: boolean
  className?: string
  /** Announced to screen readers, since the shape itself carries the meaning. */
  label?: string
}

const TONE_VARS = {
  ok: 'var(--ok)',
  bad: 'var(--bad)',
  brand: 'var(--brand)',
  muted: 'var(--faint)',
}

/**
 * A trend line small enough to live inside a table cell.
 *
 * Drawn as raw SVG rather than pulled from the charting library: a 24-point
 * line needs no axes, scales or tooltips, and rendering hundreds of Recharts
 * instances in a table would cost far more than the shape is worth.
 */
export function Sparkline({
  data,
  tone = 'auto',
  width = 96,
  height = 28,
  filled = false,
  className,
  label,
}: SparklineProps) {
  const gradientId = useId()

  if (data.length < 2) {
    return (
      <span className={cn('inline-block text-xs text-faint', className)} aria-label={label}>
        —
      </span>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  // A flat series would divide by zero; give it a mid-height line instead.
  const range = max - min || 1

  const pad = 2
  const stepX = (width - pad * 2) / (data.length - 1)

  const points = data.map((value, index) => {
    const x = pad + index * stepX
    const y = pad + (1 - (value - min) / range) * (height - pad * 2)
    return [x, y] as const
  })

  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${pad},${height - pad} ${line} ${(width - pad).toFixed(1)},${height - pad}`

  const resolved =
    tone === 'auto' ? (data[data.length - 1] >= data[0] ? 'ok' : 'bad') : tone
  const stroke = TONE_VARS[resolved]

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      role="img"
      aria-label={label ?? 'Trend'}
      className={cn('overflow-visible', className)}
    >
      {filled && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <polygon points={area} fill={`url(#${gradientId})`} />
        </>
      )}

      <polyline
        points={line}
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="spark-draw"
      />

      {/* The last point, so the eye lands on where the series ended up. Held
          back until the line has drawn under it. */}
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={2}
        fill={stroke}
        className="rise-in"
        style={{ animationDelay: '700ms' }}
      />
    </svg>
  )
}
