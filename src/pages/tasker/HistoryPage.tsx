import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { attendanceApi } from '@/services/api'
import { ApiError } from '@/services/http'
import { Card, CardBody, CardHeader, PageHeader, StatCard, StatGrid } from '@/components/ui/Card'
import { AttendanceBadge } from '@/components/ui/StatusBadge'
import { DateRange } from '@/components/ui/Field'
import { Reveal } from '@/components/ui/Reveal'
import { Ring } from '@/components/ui/Ring'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { StackedMeter } from '@/components/ui/Meter'
import { TrendChart } from '@/components/charts/TrendCharts'
import { useChartPalette } from '@/components/charts/theme'
import {
  EmptyState,
  ErrorState,
  PaginationBar,
  TBody,
  TableSkeleton,
  TableWrap,
  Td,
  Th,
  THead,
  Tr,
} from '@/components/ui/Table'
import {
  daysAgoISO,
  formatBucket,
  formatDate,
  formatHours,
  formatMinutesLate,
  formatNumber,
  formatShiftTime,
  formatTime,
  formatVariance,
  todayISO,
} from '@/utils/format'

/**
 * The tasker's own record.
 *
 * Ordered as the question is actually asked: how am I doing overall, how has
 * that moved night to night, then the individual shifts to check a specific
 * date against. The headline figures count up rather than appearing, which is
 * what makes a changed number obvious when the range is re-filtered.
 */
export default function TaskerHistoryPage() {
  const [from, setFrom] = useState(daysAgoISO(30))
  const [to, setTo] = useState(todayISO())
  const [page, setPage] = useState(1)

  const filters = { from, to }

  const history = useQuery({
    queryKey: ['attendance', 'history', filters, page],
    queryFn: () => attendanceApi.history({ ...filters, page, per_page: 15 }),
  })

  const summary = useQuery({
    queryKey: ['attendance', 'summary', filters],
    queryFn: () => attendanceApi.summary(filters),
  })

  /*
   * The chart needs the whole range, not the page being read.
   *
   * Charting `history.data` would silently redraw the trend every time someone
   * paged the table underneath it -- the same date range showing a different
   * shape depending on which fifteen rows happened to be on screen.
   */
  const trend = useQuery({
    queryKey: ['attendance', 'history', 'trend', filters],
    queryFn: () => attendanceApi.history({ ...filters, page: 1, per_page: 100 }),
  })

  const attendance = summary.data?.attendance
  const productivity = summary.data?.productivity
  const production = summary.data?.production

  const records = useMemo(
    () =>
      [...(trend.data?.data ?? [])].sort((a, b) =>
        a.attendance_date.localeCompare(b.attendance_date),
      ),
    [trend.data],
  )

  const hoursSeries = useMemo(
    () =>
      records
        .filter((record) => record.total_hours !== null)
        .map((record) => ({ label: record.attendance_date, value: record.total_hours ?? 0 })),
    [records],
  )

  const composition = useMemo(() => {
    const counts = { present: 0, late: 0, incomplete: 0, absent: 0 }
    for (const record of records) {
      if (record.status === 'present') counts.present += 1
      else if (record.status === 'late') counts.late += 1
      else if (record.status === 'incomplete') counts.incomplete += 1
      else if (record.status === 'absent') counts.absent += 1
    }
    return counts
  }, [records])

  const palette = useChartPalette()

  // attendance_rate arrives as a percentage; the ring wants a fraction.
  const rate = (attendance?.attendance_rate ?? 0) / 100
  const statsReady = !summary.isLoading

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="My record"
        title="My history"
        description="Your attendance and productivity over the selected period."
      />

      <Card>
        <CardBody>
          <DateRange
            from={from}
            to={to}
            onFromChange={(value) => {
              setFrom(value)
              setPage(1)
            }}
            onToChange={(value) => {
              setTo(value)
              setPage(1)
            }}
          />
        </CardBody>
      </Card>

      <section aria-label="Attendance summary">
        <h2 className="mb-3 text-[15px] font-semibold tracking-tight text-body">Attendance</h2>
        <StatGrid ready={statsReady} columns={4}>
          <StatCard
            label="Days worked"
            icon="clock"
            value={attendance?.days_worked}
            format={(n) => Math.round(n).toLocaleString()}
          />
          <StatCard
            label="Total hours"
            icon="history"
            tone="brand"
            value={attendance?.total_hours}
            format={(n) => n.toFixed(2)}
          />
          <StatCard
            label="Average per day"
            icon="chart"
            value={attendance?.average_hours_per_day}
            format={(n) => n.toFixed(2)}
            hint="Across days actually worked"
          />
          <StatCard
            label="Attendance rate"
            icon="users"
            value={attendance?.attendance_rate}
            format={(n) => `${n.toFixed(1)}%`}
            progress={rate}
            tone={rate >= 0.9 ? 'ok' : rate >= 0.7 ? 'default' : 'warn'}
            hint="Days worked ÷ days in range"
          />
        </StatGrid>
      </section>

      <Reveal ready={!trend.isLoading} delay={80} className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader
            title="Hours per shift"
            description="Every night you clocked in the selected range"
          />
          <CardBody className="pt-0">
            {trend.isLoading ? (
              <div className="skeleton h-[240px] rounded-xl" />
            ) : trend.isError ? (
              <ErrorState
                description={(trend.error as ApiError)?.message}
                onRetry={() => void trend.refetch()}
              />
            ) : (
              <TrendChart
                data={hoursSeries}
                name="Hours"
                suffix=" hrs"
                labelFormat={formatBucket}
                emptyTitle="No completed shifts in this period"
                emptyDescription="Hours appear here once a shift has been timed out."
              />
            )}
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="How your shifts went" description="Every filed shift in the range" />
          <CardBody className="pt-0">
            {trend.isLoading ? (
              <div className="skeleton h-[240px] rounded-xl" />
            ) : (
              <>
                <div className="flex items-center gap-5 pb-5">
                  <Ring
                    value={rate}
                    size={88}
                    tone={rate >= 0.9 ? 'ok' : rate >= 0.7 ? 'brand' : 'warn'}
                    label={`Attendance rate ${(attendance?.attendance_rate ?? 0).toFixed(1)} percent`}
                  >
                    <AnimatedNumber
                      value={attendance?.attendance_rate}
                      format={(n) => `${Math.round(n)}%`}
                      className="numeric text-lg font-semibold text-body tabular-nums"
                    />
                  </Ring>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-body">Attendance rate</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {formatNumber(attendance?.days_worked)} of the days in this range worked.
                    </p>
                  </div>
                </div>

                <StackedMeter
                  emptyLabel="No shifts filed in this period."
                  segments={[
                    { label: 'Present', value: composition.present, color: palette.present },
                    { label: 'Late', value: composition.late, color: palette.late },
                    { label: 'Incomplete', value: composition.incomplete, color: palette.incomplete },
                    { label: 'Absent', value: composition.absent, color: palette.absent },
                  ]}
                />
              </>
            )}
          </CardBody>
        </Card>
      </Reveal>

      {/* Production, from the nightly tracker.
          These four used to read from the Extra Tasks table, so a tasker who
          filed their tracker entry every night still saw zeros here. */}
      <section aria-label="Production summary">
        <h2 className="mb-3 text-[15px] font-semibold tracking-tight text-body">Production</h2>
        <StatGrid ready={statsReady} columns={4}>
          <StatCard
            label="Tasks submitted"
            icon="clipboard"
            tone="brand"
            value={production?.total_tasks}
            format={(n) => Math.round(n).toLocaleString()}
            hint={
              production?.average_tasks_per_night != null
                ? `${production.average_tasks_per_night} per night`
                : undefined
            }
          />
          <StatCard
            label="Task IDs"
            icon="database"
            value={production?.task_ids}
            format={(n) => Math.round(n).toLocaleString()}
            hint={
              (production?.sbq ?? 0) > 0
                ? `${formatNumber(production?.sbq)} sent back`
                : 'None sent back'
            }
          />
          <StatCard
            label="Nights filed"
            icon="history"
            value={production?.nights_filed}
            format={(n) => Math.round(n).toLocaleString()}
            hint="Tracker entries submitted"
          />
          <StatCard
            label="Committed vs actual"
            icon="chart"
            value={attendance?.variance}
            format={(n) => `${n > 0 ? '+' : ''}${n.toFixed(2)}`}
            hint={`${formatHours(attendance?.expected_hours, '')} committed`}
            tone={(attendance?.variance ?? 0) < 0 ? 'warn' : 'ok'}
          />
        </StatGrid>
      </section>

      {/* Only shown when there is something to show. Most taskers never use the
          Extra Tasks page, and a permanent row of zeroes beside their real
          production is exactly the confusion this whole fix is about. */}
      {(productivity?.total_tasks ?? 0) > 0 && (
        <section aria-label="Extra tasks summary">
          <h2 className="mb-3 text-[15px] font-semibold tracking-tight text-body">Extra tasks</h2>
          <StatGrid ready={statsReady} columns={3}>
            <StatCard
              label="Submitted"
              icon="clipboard"
              value={productivity?.total_tasks}
              format={(n) => Math.round(n).toLocaleString()}
            />
            <StatCard
              label="Total output"
              icon="database"
              value={productivity?.total_output}
              format={(n) => Math.round(n).toLocaleString()}
            />
            <StatCard
              label="Completion rate"
              icon="check"
              tone="ok"
              value={productivity?.completion_rate}
              format={(n) => `${n.toFixed(1)}%`}
              progress={(productivity?.completion_rate ?? 0) / 100}
              hint="Cancelled work excluded"
            />
          </StatGrid>
        </section>
      )}

      <Card>
        <CardHeader
          title="Shift records"
          description="Each row is one shift. A time out on the following morning is marked (+1d)."
        />

        {history.isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : history.isError ? (
          <ErrorState
            description={(history.error as ApiError)?.message}
            onRetry={() => void history.refetch()}
          />
        ) : history.data?.data.length === 0 ? (
          <EmptyState title="No shifts in this period" description="Try widening the date range." />
        ) : (
          <>
            <TableWrap>
              <THead>
                <Th>Shift date</Th>
                <Th>Time in</Th>
                <Th>Time out</Th>
                <Th>Hours</Th>
                <Th>Committed</Th>
                <Th>Variance</Th>
                <Th>Punctuality</Th>
                <Th>Status</Th>
                <Th>Tasks</Th>
              </THead>
              <TBody>
                {history.data?.data.map((record) => (
                  <Tr key={record.id}>
                    <Td className="font-medium whitespace-nowrap">
                      {formatDate(record.attendance_date)}
                    </Td>
                    <Td numeric>{record.time_in ? formatTime(record.time_in) : '—'}</Td>
                    <Td numeric>
                      {record.time_out
                        ? formatShiftTime(record.time_out, record.attendance_date)
                        : '—'}
                    </Td>
                    <Td numeric>
                      {formatHours(record.total_hours, '')}
                    </Td>
                    <Td numeric className="text-muted">
                      {formatHours(record.expected_hours, '')}
                    </Td>
                    <Td
                     
                      numeric
                      className={
                        record.variance === null
                          ? 'text-muted'
                          : record.variance < 0
                            ? 'text-warn'
                            : 'text-ok'
                      }
                    >
                      {formatVariance(record.variance)}
                    </Td>
                    <Td className="text-[13px] text-muted">
                      {record.time_in ? formatMinutesLate(record.minutes_late) : '—'}
                    </Td>
                    <Td>
                      <AttendanceBadge status={record.status} label={record.status_label} />
                    </Td>
                    <Td numeric className="text-muted">
                      {record.tasks_count ?? 0}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </TableWrap>
            <PaginationBar pagination={history.data?.meta.pagination} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
