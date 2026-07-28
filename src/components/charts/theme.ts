import { useTheme } from '@/hooks/useTheme'

/**
 * Chart palette.
 *
 * These four hues were selected by running the palette validator against this
 * application's own chart surfaces (#ffffff light, #15181f dark) rather than
 * being chosen by eye. Both modes clear every gate:
 *
 *   worst adjacent CVD separation   ΔE 21.5 light / 19.5 dark  (target >= 8)
 *   worst adjacent normal vision    ΔE 30.8 light / 22.5 dark  (floor 15)
 *
 * The obvious semantic mapping -- green for present, orange for incomplete --
 * was tried first and FAILED: green sits ΔE 3.0 from yellow under protanopia
 * on the dark surface, and the reference warning/serious pair measured 13.6
 * under normal vision, below the 15 floor. Blue for "present" and violet for
 * "incomplete" separate cleanly and are, if anything, more honest: incomplete
 * means the hours are *unknown*, not that something is mildly wrong.
 *
 * Light-mode yellow sits at 2.17:1 against white, below the 3:1 mark. The
 * required relief is shipped: every chart carries a legend, a hover tooltip,
 * and the same figures in a table on the same page -- colour never carries a
 * value on its own.
 */
export interface ChartPalette {
  present: string
  late: string
  incomplete: string
  absent: string
  hours: string
  grid: string
  axis: string
  surface: string
  tooltipBg: string
  tooltipText: string
  tooltipMuted: string
}

const LIGHT: ChartPalette = {
  present: '#2a78d6',
  late: '#eda100',
  incomplete: '#4a3aa7',
  absent: '#d03b3b',
  hours: '#2a78d6',
  grid: '#e1e0d9',
  axis: '#898781',
  surface: '#ffffff',
  tooltipBg: '#ffffff',
  tooltipText: '#0b0b0b',
  tooltipMuted: '#52514e',
}

const DARK: ChartPalette = {
  present: '#3987e5',
  late: '#c98500',
  incomplete: '#9085e9',
  absent: '#e66767',
  hours: '#3987e5',
  grid: '#2c2c2a',
  axis: '#898781',
  surface: '#15181f',
  tooltipBg: '#1f232c',
  tooltipText: '#ffffff',
  tooltipMuted: '#c3c2b7',
}

export function useChartPalette(): ChartPalette {
  const { theme } = useTheme()
  return theme === 'dark' ? DARK : LIGHT
}

/**
 * Shared axis styling: recessive, so the data carries the emphasis.
 *
 * Lives here rather than beside the chart components because it is a plain
 * function, and a module that exports both components and helpers loses fast
 * refresh for everything in it.
 */
export function axisProps(palette: ChartPalette) {
  return {
    stroke: palette.axis,
    tick: { fill: palette.axis, fontSize: 11 },
    tickLine: false,
    axisLine: false,
  } as const
}

/** The stacked attendance series, in the order they stack. */
export const ATTENDANCE_SERIES = [
  { key: 'present', label: 'Present', color: 'present' },
  { key: 'late', label: 'Late', color: 'late' },
  { key: 'incomplete', label: 'Incomplete', color: 'incomplete' },
  { key: 'absent', label: 'Absent', color: 'absent' },
] as const satisfies readonly {
  key: string
  label: string
  color: keyof ChartPalette
}[]
