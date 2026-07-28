import { useId } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { axisProps, useChartPalette, type ChartPalette } from './theme'
import { ChartFrame, ChartTooltip } from './primitives'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { EmptyState } from '@/components/ui/Table'

/**
 * Generic single-measure charts.
 *
 * The attendance charts answer a fixed question with a fixed four-series
 * composition. These answer "one number, across a dimension" -- hours per
 * night, tasks per project -- which is most of what the tasker pages and the
 * per-tasker admin view need.
 *
 * They are deliberately SINGLE-HUE. One measure means colour is not encoding
 * identity: the axis labels already say which night or which project a mark
 * belongs to, so a second hue would be decoration that implies a distinction
 * that does not exist. It also means no new categorical palette is introduced
 * here -- every tone below resolves to one of the four hues already validated
 * for CVD against this application's own light and dark chart surfaces.
 */

export interface SeriesPoint {
  /** The x value: a date, a bucket key, or a category name. */
  label: string
  value: number
}

export type SeriesTone = 'brand' | 'violet' | 'warn' | 'bad'

/** Every tone resolves into the validated palette rather than a fresh hue. */
function toneColor(palette: ChartPalette, tone: SeriesTone): string {
  switch (tone) {
    case 'violet':
      return palette.incomplete
    case 'warn':
      return palette.late
    case 'bad':
      return palette.absent
    default:
      return palette.hours
  }
}

interface TrendChartProps {
  data: SeriesPoint[]
  /** Names the measure. Shown in the tooltip; the panel title carries it visually. */
  name: string
  height?: number
  tone?: SeriesTone
  /** "area" for a continuous read, "bar" when each period is a discrete event. */
  variant?: 'area' | 'bar'
  /** Appended to tooltip values, e.g. " hrs". */
  suffix?: string
  /** Turns an x value into its axis label. */
  labelFormat?: (value: string) => string
  emptyTitle?: string
  emptyDescription?: string
}

/**
 * One measure over time.
 *
 * A single series, so there is no legend -- the panel title names it, which is
 * the rule for one series. The area variant is drawn left to right, the way the
 * series is read; the bar variant grows from the baseline.
 */
export function TrendChart({
  data,
  name,
  height = 240,
  tone = 'brand',
  variant = 'area',
  suffix = '',
  labelFormat,
  emptyTitle = 'Nothing to chart yet',
  emptyDescription = 'Adjust the date range to see a trend.',
}: TrendChartProps) {
  const palette = useChartPalette()
  const reducedMotion = useReducedMotion()
  const gradientId = useId()

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  const color = toneColor(palette, tone)

  // A single point has no line to draw; a bar reads it honestly.
  const resolved = data.length < 2 ? 'bar' : variant

  /*
   * The axes are written out in both branches rather than shared through a
   * fragment. Recharts locates its axes and grid by walking its own direct
   * children, so a fragment holding all three arrives as a single child of an
   * unrecognised type -- the chart then renders with no axes and no grid, with
   * nothing logged to say why.
   */
  return (
    <ChartFrame height={height}>
      <ResponsiveContainer width="100%" height={height}>
        {resolved === 'bar' ? (
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
            barCategoryGap="24%"
          >
            <CartesianGrid vertical={false} stroke={palette.grid} />
            <XAxis dataKey="label" tickFormatter={labelFormat} {...axisProps(palette)} />
            <YAxis {...axisProps(palette)} />
            <Tooltip
              cursor={{ fill: palette.grid, opacity: 0.35 }}
              content={
                <ChartTooltip
                  palette={palette}
                  suffix={suffix}
                  labelFormat={labelFormat}
                  showTotal={false}
                />
              }
            />
            <Bar
              dataKey="value"
              name={name}
              fill={color}
              // Rounded only at the data end, anchored to the baseline.
              radius={[4, 4, 0, 0]}
              isAnimationActive={!reducedMotion}
              animationDuration={700}
              animationEasing="ease-out"
            />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.24} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke={palette.grid} />
            <XAxis dataKey="label" tickFormatter={labelFormat} {...axisProps(palette)} />
            <YAxis {...axisProps(palette)} />
            <Tooltip
              cursor={{ stroke: palette.axis, strokeWidth: 1 }}
              content={
                <ChartTooltip
                  palette={palette}
                  suffix={suffix}
                  labelFormat={labelFormat}
                  showTotal={false}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="value"
              name={name}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              // Markers on hover only; a dot on every point turns a month-long
              // series into noise.
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: palette.surface }}
              isAnimationActive={!reducedMotion}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </ChartFrame>
  )
}

interface RankedBarChartProps {
  data: SeriesPoint[]
  name: string
  height?: number
  tone?: SeriesTone
  suffix?: string
  /**
   * Rows beyond this are folded into a single "Other" bar rather than being
   * dropped or given their own hue -- the total stays honest and the chart
   * stays readable.
   */
  limit?: number
  emptyTitle?: string
  emptyDescription?: string
}

/**
 * Magnitude by category, ranked.
 *
 * Horizontal because category names are words: on a vertical chart they would
 * be rotated or truncated, and a rotated label is read appreciably slower than
 * a horizontal one. Sorted descending so the ranking is the shape of the chart
 * rather than something the reader has to reconstruct.
 */
export function RankedBarChart({
  data,
  name,
  height,
  tone = 'brand',
  suffix = '',
  limit = 8,
  emptyTitle = 'Nothing to rank yet',
  emptyDescription = 'Adjust the date range to see a breakdown.',
}: RankedBarChartProps) {
  const palette = useChartPalette()
  const reducedMotion = useReducedMotion()

  const positive = data.filter((point) => point.value > 0)

  if (positive.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  const sorted = [...positive].sort((a, b) => b.value - a.value)

  const rows = sorted.slice(0, limit)
  const rest = sorted.slice(limit)
  if (rest.length > 0) {
    rows.push({
      label: `Other (${rest.length})`,
      value: rest.reduce((sum, point) => sum + point.value, 0),
    })
  }

  const color = toneColor(palette, tone)

  // A row per bar plus breathing room, so eight projects do not get the same
  // vertical space as two.
  const resolvedHeight = height ?? Math.max(140, rows.length * 34 + 28)

  // Enough gutter for the longest label, capped so one long project code does
  // not eat the plot area.
  const longest = rows.reduce((max, row) => Math.max(max, row.label.length), 0)
  const axisWidth = Math.min(140, Math.max(64, longest * 7.5))

  return (
    <ChartFrame height={resolvedHeight}>
      <ResponsiveContainer width="100%" height={resolvedHeight}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
          barCategoryGap="28%"
        >
          <CartesianGrid horizontal={false} stroke={palette.grid} />
          <XAxis type="number" {...axisProps(palette)} />
          <YAxis type="category" dataKey="label" width={axisWidth} {...axisProps(palette)} />
          <Tooltip
            cursor={{ fill: palette.grid, opacity: 0.35 }}
            content={
              <ChartTooltip
                palette={palette}
                suffix={suffix}
                labelFormat={(value) => value}
                showTotal={false}
              />
            }
          />
          <Bar
            dataKey="value"
            name={name}
            // Rounded at the value end only, anchored to the axis.
            radius={[0, 4, 4, 0]}
            isAnimationActive={!reducedMotion}
            animationDuration={700}
            animationEasing="ease-out"
          >
            {rows.map((row) => (
              <Cell
                key={row.label}
                fill={color}
                // The folded remainder is the same hue at lower emphasis: it is
                // the same measure, just not an entity in its own right.
                fillOpacity={row.label.startsWith('Other (') ? 0.45 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
