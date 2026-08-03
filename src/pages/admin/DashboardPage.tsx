import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/services/api'
import { ApiError } from '@/services/http'
import { useChartPalette } from '@/components/charts/theme'
import { AttendanceCompositionChart, HoursTrendChart } from '@/components/charts/AttendanceCharts'
import { MetricRail, type RailMetric } from '@/components/dashboard/MetricRail'
import { ShiftTimeline } from '@/components/dashboard/ShiftTimeline'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { ProgressBar, StackedMeter } from '@/components/ui/Meter'
import { Reveal } from '@/components/ui/Reveal'
import { Ring } from '@/components/ui/Ring'
import { Segmented } from '@/components/ui/Segmented'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { AttendanceBadge } from '@/components/ui/StatusBadge'
import { EmptyState, ErrorState } from '@/components/ui/Table'
import {
  cn,
  daysAgoISO,
  elapsedHours,
  elapsedSince,
  formatDate,
  formatHours,
  formatNumber,
  formatTime,
  todayISO,
} from '@/utils/format'
import type { AdminDashboard, Attendance, AttendanceAnalytics, DashboardSummary } from '@/types'

type RangeKey = '7' | '30' | '90'
type GroupBy = 'day' | 'week' | 'month'

const RANGES: { value: RangeKey; label: string }[] = [
  { value: '7', label: '7D' },
  { value: '30', label: '30D' },
  { value: '90', label: '90D' },
]

const GROUPINGS: { value: GroupBy; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

/**
 * The operations dashboard.
 *
 * Built around one question asked in a fixed order: what is happening on the
 * floor *right now*, what has tonight produced, and how does that compare with
 * the last month. Each of those gets a different visual treatment -- a hero
 * band, an instrument cluster, then charts -- so the page has a reading order
 * rather than being a uniform field of cards the eye has to search.
 */
export default function AdminDashboardPage() {
  const [range, setRange] = useState<RangeKey>('30')
  const [groupBy, setGroupBy] = useState<GroupBy>('day')

  const from = useMemo(() => daysAgoISO(Number(range) - 1), [range])
  const to = todayISO()

  const dashboard = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.dashboard,
    refetchInterval: 60_000,
  })

  const analytics = useQuery({
    queryKey: ['admin', 'analytics', from, to, groupBy],
    queryFn: () => adminApi.analytics({ from, to, group_by: groupBy }),
  })

  const summary = dashboard.data?.summary

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-body">
            Operations
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {summary
              ? `Shift of ${formatDate(summary.business_date)} · ${summary.shift_start.slice(11, 16)} – ${summary.shift_end.slice(11, 16)}`
              : 'Loading tonight’s shift…'}
          </p>
        </div>

        {/* One control row governing every trend on the page. Presets rather
            than two date inputs: a dashboard is scanned, and the full date
            picker already lives on Attendance and Reports where a specific
            range is actually being investigated. */}
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            ariaLabel="Trend range"
            value={range}
            options={RANGES}
            onChange={(value) => {
              setRange(value)
              // 90 daily bars in one frame is a barcode, not a chart.
              setGroupBy(value === '90' ? 'week' : 'day')
            }}
          />
          <Segmented
            ariaLabel="Group trends by"
            value={groupBy}
            options={GROUPINGS}
            onChange={setGroupBy}
          />
        </div>
      </header>

      {dashboard.isError ? (
        <ErrorState
          title="Could not load tonight’s shift"
          description={(dashboard.error as ApiError)?.message}
          onRetry={() => void dashboard.refetch()}
        />
      ) : (
        <ShiftHero data={dashboard.data} loading={dashboard.isLoading} />
      )}

      {/* Each band arrives a beat after the one above it, walking the eye down
          the page in reading order. Gated on its own data rather than on mount,
          so the animation coincides with content appearing. */}
      <Reveal ready={!dashboard.isLoading} delay={80}>
        <MetricRail metrics={buildMetrics(summary, analytics.data)} />
      </Reveal>

      <Reveal ready={!analytics.isLoading} delay={160} className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader
            title="Attendance breakdown"
            description={`How each ${groupBy} was composed across the last ${range} days`}
          />
          <CardBody className="pt-0">
            {analytics.isLoading ? (
              <div className="skeleton h-[300px] rounded-xl" />
            ) : analytics.isError ? (
              <ErrorState
                description={(analytics.error as ApiError)?.message}
                onRetry={() => void analytics.refetch()}
              />
            ) : (
              <AttendanceCompositionChart data={analytics.data?.series ?? []} />
            )}
          </CardBody>
        </Card>

        <RangeTotals analytics={analytics.data} loading={analytics.isLoading} days={range} />
      </Reveal>

      <Reveal
        ready={!dashboard.isLoading && !analytics.isLoading}
        delay={240}
        className="grid gap-4 xl:grid-cols-5"
      >
        <Roster
          records={dashboard.data?.currently_on_shift ?? []}
          loading={dashboard.isLoading}
          className="xl:col-span-3"
        />

        <Card className="xl:col-span-2">
          <CardHeader title="Hours rendered" description="Total clocked hours per period" />
          <CardBody className="pt-0">
            {analytics.isLoading ? (
              <div className="skeleton h-[260px] rounded-xl" />
            ) : (
              <HoursTrendChart data={analytics.data?.series ?? []} height={260} />
            )}
          </CardBody>
        </Card>
      </Reveal>
    </div>
  )
}

// ------------------------------------------------------------------ Hero band

/**
 * The live state of the floor.
 *
 * Given its own surface treatment and roughly a third of the fold, because it
 * is the only part of this page that is time-critical -- everything below it
 * will read the same in ten minutes.
 */
function ShiftHero({ data, loading }: { data?: AdminDashboard; loading: boolean }) {
  const palette = useChartPalette()

  if (loading || !data) {
    return <div className="skeleton h-64 rounded-2xl" />
  }

  const s = data.summary

  /*
   * Every figure here comes from a per-status count on the server.
   *
   * They used to be derived from `attendance_today`, the number of records
   * filed — which counts absences, because an absence is a record. One absent
   * tasker rendered as "Present 1" on a 100% attendance rate. A total cannot
   * be taken apart into the states that composed it; the states have to be
   * counted separately, and now they are.
   */
  const notIn = Math.max(
    0,
    s.active_taskers - s.worked_today - s.absent_today - s.on_leave_today,
  )

  /*
   * Approved leave is removed from the denominator rather than counted as a
   * failure to attend. Someone whose leave was granted is not expected
   * tonight, and scoring the floor down for it would push admins toward not
   * recording leave at all.
   */
  const expected = Math.max(0, s.active_taskers - s.on_leave_today)
  const rate = expected > 0 ? s.worked_today / expected : 0

  return (
    <section
      aria-label="Live shift status"
      className="hero-panel rise-in relative overflow-hidden rounded-2xl border border-line shadow-raised"
    >
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)_auto] lg:items-center lg:gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-raised/70 px-2.5 py-1 text-xs font-bold tracking-[0.12em] text-body uppercase backdrop-blur">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ok" />
              </span>
              Live
            </span>
            <span className="text-xs text-muted">{formatDate(s.business_date)}</span>
          </div>

          <div className="mt-4 flex items-end gap-3">
            <AnimatedNumber
              value={s.currently_timed_in}
              format={(n) => Math.round(n).toString()}
              className="numeric text-[56px] leading-[0.85] font-semibold tracking-tight text-body tabular-nums"
            />
            <p className="numeric pb-1 text-lg leading-none font-medium text-faint tabular-nums">
              / {s.active_taskers}
            </p>
          </div>
          <p className="mt-2.5 text-sm text-muted">
            timed in and still working, of {formatNumber(s.active_taskers)} active taskers
          </p>
        </div>

        <div className="min-w-0">
          <p className="mb-3 text-xs font-semibold tracking-[0.12em] text-faint uppercase">
            Tonight’s roll call
          </p>
          <StackedMeter
            emptyLabel="No attendance filed yet tonight."
            /* Zero-valued segments are dropped by StackedMeter, so a floor
               with nobody incomplete or on leave still reads as three bands. */
            segments={[
              { label: 'Present', value: s.present_today, color: palette.present },
              { label: 'Late', value: s.late_today, color: palette.late },
              { label: 'Incomplete', value: s.incomplete_today, color: palette.incomplete },
              { label: 'Absent', value: s.absent_today, color: palette.absent },
              { label: 'On leave', value: s.on_leave_today, color: palette.axis },
              { label: 'Not yet in', value: notIn, color: palette.grid },
            ]}
          />
        </div>

        <div className="flex items-center gap-4 lg:flex-col lg:items-center lg:gap-2">
          <Ring
            value={rate}
            tone={rate >= 0.9 ? 'ok' : rate >= 0.7 ? 'brand' : 'warn'}
            label={`Attendance rate ${Math.round(rate * 100)} percent`}
          >
            <AnimatedNumber
              value={rate * 100}
              format={(n) => `${Math.round(n)}%`}
              className="numeric text-xl font-semibold text-body tabular-nums"
            />
          </Ring>
          <p className="text-center text-xs leading-tight text-faint">
            Attendance
            <br className="hidden lg:block" /> rate
          </p>
        </div>
      </div>

      <div className="border-t border-line/70 px-5 py-4 sm:px-6">
        <ShiftTimeline start={s.shift_start} end={s.shift_end} />
      </div>
    </section>
  )
}

// ------------------------------------------------------------- Metric cluster

function buildMetrics(
  summary: DashboardSummary | undefined,
  analytics: AttendanceAnalytics | undefined,
): RailMetric[] {
  const series = analytics?.series ?? []

  // Trends come only from the analytics series, so a sparkline is drawn only
  // where real history exists. The remaining metrics get a plain caption --
  // a fabricated trend line is worse than none.
  const hoursSeries = series.map((bucket) => bucket.total_hours)
  const lateSeries = series.map((bucket) => bucket.late)
  const recordsSeries = series.map((bucket) => bucket.records)

  const whole = (n: number) => Math.round(n).toLocaleString()
  const twoDp = (n: number) => n.toFixed(2)

  return [
    {
      label: 'Hours tonight',
      icon: 'clock',
      tone: 'brand',
      value: <AnimatedNumber value={summary?.total_hours_today} format={twoDp} />,
      series: hoursSeries,
    },
    {
      label: 'Attendance',
      icon: 'users',
      value: <AnimatedNumber value={summary?.attendance_today} format={whole} />,
      series: recordsSeries,
    },
    {
      label: 'Submissions',
      icon: 'clipboard',
      value: <AnimatedNumber value={summary?.submissions_today} format={whole} />,
      // Tracker entries filed tonight, matching what the Submissions screen
      // lists. The hint used to report completed *Extra Tasks*, which is a
      // different table entirely and read as 0 on a busy night.
      hint: summary
        ? `of ${formatNumber(summary.attendance_today)} timed in`
        : undefined,
    },
    {
      label: 'Output',
      icon: 'database',
      value: <AnimatedNumber value={summary?.output_today} format={whole} />,
      hint: summary
        ? `${formatNumber(summary.task_ids_today)} task IDs${summary.sbq_today > 0 ? ` · ${formatNumber(summary.sbq_today)} SBQ` : ''}`
        : undefined,
    },
    {
      label: 'Late tonight',
      icon: 'history',
      tone: (summary?.late_today ?? 0) > 0 ? 'warn' : 'ok',
      value: <AnimatedNumber value={summary?.late_today} format={whole} />,
      series: lateSeries,
    },
  ]
}

// -------------------------------------------------------------- Range totals

function RangeTotals({
  analytics,
  loading,
  days,
}: {
  analytics?: AttendanceAnalytics
  loading: boolean
  days: string
}) {
  const totals = analytics?.totals
  const onTime = totals && totals.records > 0 ? (totals.records - totals.late) / totals.records : 0

  const rows = [
    { label: 'Total hours', value: totals ? formatHours(totals.total_hours, '') : '—' },
    { label: 'Average per shift', value: totals ? formatHours(totals.average_hours, '') : '—' },
    { label: 'Taskers active', value: formatNumber(totals?.taskers) },
    { label: 'Late arrivals', value: formatNumber(totals?.late), tone: 'warn' as const },
    {
      label: 'Missing time out',
      value: formatNumber(totals?.missing_time_out),
      tone: (totals?.missing_time_out ?? 0) > 0 ? ('bad' as const) : undefined,
    },
  ]

  return (
    <Card className="xl:col-span-2">
      <CardHeader title="Range totals" description={`Across the last ${days} days`} />

      {loading ? (
        <CardBody className="pt-0">
          <div className="skeleton h-64 rounded-xl" />
        </CardBody>
      ) : (
        <>
          <div className="flex items-center gap-5 px-5 pt-1 pb-5">
            <Ring
              value={onTime}
              size={88}
              tone={onTime >= 0.9 ? 'ok' : 'warn'}
              label={`On time rate ${Math.round(onTime * 100)} percent`}
            >
              <AnimatedNumber
                value={onTime * 100}
                format={(n) => `${Math.round(n)}%`}
                className="numeric text-lg font-semibold text-body tabular-nums"
              />
            </Ring>
            <div className="min-w-0">
              <p className="text-sm font-medium text-body">On-time arrivals</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {formatNumber(totals?.records)} shifts filed,{' '}
                {formatNumber(totals?.late)} of them late.
              </p>
            </div>
          </div>

          <dl className="border-t border-line">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-3 border-b border-line/60 px-5 py-2.5 last:border-b-0"
              >
                <dt className="text-[13px] text-muted">{row.label}</dt>
                <dd
                  className={cn(
                    'numeric text-[13px] font-semibold tabular-nums',
                    row.tone === 'warn'
                      ? 'text-warn'
                      : row.tone === 'bad'
                        ? 'text-bad'
                        : 'text-body',
                  )}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </Card>
  )
}

// -------------------------------------------------------------------- Roster

/**
 * Who is on the floor, as a roster rather than a table.
 *
 * A table would give equal column weight to the email address and to how far
 * through their committed hours someone is. The question here is progress, so
 * progress gets the bar and everything else supports it.
 */
function Roster({
  records,
  loading,
  className,
}: {
  records: Attendance[]
  loading: boolean
  className?: string
}) {
  // Elapsed times are computed at render, so the list needs a tick of its own
  // to stay honest between the 60s refetches.
  const [, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(timer)
  }, [])

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader
        title="On the floor"
        description="Timed in and still working"
        action={
          <Link
            to="/admin/attendance"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            All attendance
            <Icon name="external" size={12} />
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-px px-5 pb-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-14 rounded-lg" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          title="Nobody is currently timed in"
          description="Taskers appear here the moment they claim a PC and start their shift."
        />
      ) : (
        <ul className="border-t border-line">
          {records.map((record) => {
            const committed = record.expected_hours ?? 0
            const worked = elapsedHours(record.time_in)
            const progress = committed > 0 ? worked / committed : 0

            return (
              <li
                key={record.id}
                className="flex items-center gap-3 border-b border-line/60 px-5 py-3 transition-colors last:border-b-0 hover:bg-sunken/50 sm:gap-4"
              >
                <RosterAvatar name={record.user?.name} url={record.user?.avatar_url ?? null} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-body">
                    {record.user?.name ?? '—'}
                  </p>
                  <p className="numeric truncate text-xs text-faint tabular-nums">
                    In at {formatTime(record.time_in)}
                  </p>
                </div>

                <div className="hidden w-32 shrink-0 sm:block">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="numeric text-xs font-semibold text-body tabular-nums">
                      {elapsedSince(record.time_in)}
                    </span>
                    <span className="numeric text-xs text-faint tabular-nums">
                      {committed > 0 ? `of ${committed}h` : 'no target'}
                    </span>
                  </div>
                  <ProgressBar
                    className="mt-1.5"
                    value={progress}
                    tone={progress >= 1 ? 'ok' : 'brand'}
                    label={`${Math.round(progress * 100)} percent of committed hours`}
                  />
                </div>

                <AttendanceBadge status={record.status} label={record.status_label} />
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function RosterAvatar({ name, url }: { name?: string; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-line"
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
      {name?.charAt(0).toUpperCase() ?? '?'}
    </span>
  )
}
