import { useEffect, useState, type ReactNode } from 'react'
import type { ChartPalette } from './theme'
import { formatBucket } from '@/utils/format'

/**
 * Holds the chart's box open for one frame before mounting it.
 *
 * ResponsiveContainer measures its parent on mount. On the very first paint
 * that parent has not been laid out yet, so the container reads a width of
 * zero, renders a degenerate chart, and runs its entrance animation against
 * that -- finishing before the real width arrives a frame later. The chart then
 * snaps to full size with its animation already spent, which looks exactly like
 * no animation at all.
 *
 * Reserving the height on a plain div and deferring the chart by one frame
 * means the container measures a real width the first time it looks, so the
 * animation plays against the geometry the user actually sees. The reserved
 * height also stops the panel collapsing and reflowing on that frame.
 */
export function ChartFrame({ height, children }: { height: number; children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return <div style={{ height }}>{mounted ? children : null}</div>
}

export interface TooltipEntry {
  name?: string
  value?: number | string
  color?: string
  dataKey?: string | number
}

/**
 * Tooltip.
 *
 * Rows are ordered largest first rather than in stack order, so the biggest
 * contributor is read first, and zero rows are dropped -- a stacked bar with
 * four series usually has only two that matter on any given day.
 *
 * `labelFormat` exists because not every chart's x-axis is a date bucket: the
 * ranked charts key on a project code, which `formatBucket` would mangle into
 * a nonsense date.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  palette,
  suffix = '',
  labelFormat = (value) => formatBucket(value),
  showTotal = true,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  palette: ChartPalette
  suffix?: string
  labelFormat?: (value: string) => string
  showTotal?: boolean
}) {
  if (!active || !payload?.length) return null

  const rows = payload
    .filter((entry) => Number(entry.value) > 0)
    .sort((a, b) => Number(b.value) - Number(a.value))

  if (rows.length === 0) return null

  const total = rows.reduce((sum, entry) => sum + Number(entry.value ?? 0), 0)

  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-lg"
      style={{ background: palette.tooltipBg, borderColor: palette.grid }}
    >
      <p className="mb-1.5 text-xs font-semibold" style={{ color: palette.tooltipText }}>
        {labelFormat(String(label ?? ''))}
      </p>

      <div className="space-y-1">
        {rows.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: entry.color }}
              aria-hidden="true"
            />
            <span className="flex-1 pr-3" style={{ color: palette.tooltipMuted }}>
              {entry.name}
            </span>
            <span className="numeric font-medium tabular-nums" style={{ color: palette.tooltipText }}>
              {Number(entry.value).toLocaleString()}
              {suffix}
            </span>
          </div>
        ))}
      </div>

      {showTotal && rows.length > 1 && (
        <div
          className="mt-1.5 flex items-center justify-between gap-3 border-t pt-1.5 text-xs"
          style={{ borderColor: palette.grid }}
        >
          <span style={{ color: palette.tooltipMuted }}>Total</span>
          <span className="numeric font-semibold" style={{ color: palette.tooltipText }}>
            {total.toLocaleString()}
            {suffix}
          </span>
        </div>
      )}
    </div>
  )
}
