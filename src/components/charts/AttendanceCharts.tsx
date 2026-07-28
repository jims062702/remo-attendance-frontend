import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ATTENDANCE_SERIES, axisProps, useChartPalette } from './theme'
import { ChartFrame, ChartTooltip } from './primitives'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { formatBucket } from '@/utils/format'
import { EmptyState } from '@/components/ui/Table'
import type { AnalyticsBucket } from '@/types'

interface ChartProps {
  data: AnalyticsBucket[]
  height?: number
}

/**
 * Attendance composition per period.
 *
 * Stacked because the question is "how did the shift break down", and the
 * segments sum to a meaningful total (people scheduled). A 2px stroke in the
 * surface colour separates the segments -- without it adjacent fills touch and
 * a thin band is impossible to pick out.
 */
export function AttendanceCompositionChart({ data, height = 300 }: ChartProps) {
  const palette = useChartPalette()
  const reducedMotion = useReducedMotion()

  if (data.length === 0) {
    return (
      <EmptyState
        title="No attendance in this period"
        description="Adjust the date range or filters to see the breakdown."
      />
    )
  }

  return (
    <ChartFrame height={height}>
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke={palette.grid} strokeDasharray="0" />
        <XAxis dataKey="bucket" tickFormatter={formatBucket} {...axisProps(palette)} />
        <YAxis allowDecimals={false} {...axisProps(palette)} />
        <Tooltip
          cursor={{ fill: palette.grid, opacity: 0.35 }}
          content={<ChartTooltip palette={palette} />}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: palette.axis, paddingTop: 8 }}
        />
        {ATTENDANCE_SERIES.map((series, index) => (
          <Bar
            key={series.key}
            dataKey={series.key}
            name={series.label}
            stackId="attendance"
            fill={palette[series.color]}
            // The 2px surface gap between stacked fills.
            stroke={palette.surface}
            strokeWidth={2}
            // Only the topmost segment gets rounded ends, so the stack reads
            // as one bar rather than a pile of separate capsules.
            radius={index === ATTENDANCE_SERIES.length - 1 ? [4, 4, 0, 0] : undefined}
            // The stack grows from the baseline, each series a beat behind the
            // one below it, so the eye follows the composition being built up
            // rather than four layers appearing at once.
            isAnimationActive={!reducedMotion}
            animationBegin={index * 90}
            animationDuration={650}
            animationEasing="ease-out"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
    </ChartFrame>
  )
}

/**
 * Total hours rendered over time.
 *
 * A single series, so there is no legend -- the panel title names it. Kept as
 * its own chart rather than a second axis on the composition chart: two
 * measures on two scales in one frame is the most misread chart there is.
 */
export function HoursTrendChart({ data, height = 260 }: ChartProps) {
  const palette = useChartPalette()
  const reducedMotion = useReducedMotion()

  if (data.length === 0) {
    return <EmptyState title="No hours recorded" description="Adjust the date range to see totals." />
  }

  return (
    <ChartFrame height={height}>
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="hoursFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.hours} stopOpacity={0.22} />
            <stop offset="100%" stopColor={palette.hours} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid vertical={false} stroke={palette.grid} />
        <XAxis dataKey="bucket" tickFormatter={formatBucket} {...axisProps(palette)} />
        <YAxis {...axisProps(palette)} />
        <Tooltip
          cursor={{ stroke: palette.axis, strokeWidth: 1 }}
          content={<ChartTooltip palette={palette} suffix=" hrs" />}
        />
        <Area
          type="monotone"
          dataKey="total_hours"
          name="Hours rendered"
          stroke={palette.hours}
          strokeWidth={2}
          fill="url(#hoursFill)"
          // Markers appear on hover only; a dot on every point turns a
          // month-long series into noise.
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: palette.surface }}
          // Drawn left to right, the way the series is read.
          isAnimationActive={!reducedMotion}
          animationDuration={800}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
    </ChartFrame>
  )
}
