import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/services/api'
import { ApiError } from '@/services/http'
import { Card, CardBody, CardHeader, StatCard, StatGrid } from '@/components/ui/Card'
import { AttendanceBadge, Badge, TaskBadge, UserStatusBadge } from '@/components/ui/StatusBadge'
import { AbsenceRiskBanner } from '@/components/ui/AbsenceWarning'
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
  formatNumber,
  formatShiftTime,
  formatTime,
  formatVariance,
  todayISO,
} from '@/utils/format'

export default function AdminTaskerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [from, setFrom] = useState(daysAgoISO(29))
  const [to, setTo] = useState(todayISO())

  const detail = useQuery({
    queryKey: ['admin', 'tasker', id, from, to],
    queryFn: () => adminApi.taskerDetail(Number(id), { from, to }),
    enabled: Boolean(id),
  })

  /*
   * Every hook runs before the error branch below.
   *
   * Returning early above them would change the number of hooks between a
   * successful render and a failed one, which React treats as a corrupted hook
   * order -- so the *next* render after a request failed would crash rather
   * than show the error state it was meant to show.
   */
  const palette = useChartPalette()

  const recent = useMemo(
    () =>
      [...(detail.data?.recent_attendance ?? [])].sort((a, b) =>
        a.attendance_date.localeCompare(b.attendance_date),
      ),
    [detail.data],
  )

  const hoursSeries = useMemo(
    () =>
      recent
        .filter((record) => record.total_hours !== null)
        .map((record) => ({ label: record.attendance_date, value: record.total_hours ?? 0 })),
    [recent],
  )

  if (detail.isError) {
    return (
      <ErrorState
        title="Could not load this tasker"
        description={(detail.error as ApiError)?.message}
        onRetry={() => void detail.refetch()}
      />
    )
  }

  const user = detail.data?.user
  const attendance = detail.data?.summary.attendance
  const productivity = detail.data?.summary.productivity

  const rate = (attendance?.attendance_rate ?? 0) / 100
  const ready = !detail.isLoading
  const whole = (n: number) => Math.round(n).toLocaleString()
  const twoDp = (n: number) => n.toFixed(2)

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/admin/taskers"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
        >
          ← Back to taskers
        </Link>
      </div>

      {/* The person, on the same hero surface the dashboards use: this page is
          about one individual, so their identity is the header rather than
          another card competing with the figures below it. */}
      <section className="hero-panel rise-in relative overflow-hidden rounded-2xl border border-line shadow-raised">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="h-16 w-16 rounded-full object-cover ring-1 ring-line"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-xl font-semibold text-brand ring-1 ring-line">
                {user?.name?.charAt(0).toUpperCase() ?? '?'}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-body">
                {user?.name ?? 'Loading…'}
              </h1>
              <p className="truncate text-sm text-muted">{user?.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {user && (
                  <Badge tone={user.role === 'admin' ? 'brand' : 'neutral'}>{user.role_label}</Badge>
                )}
                {user && <UserStatusBadge status={user.status} label={user.status_label} />}
                {user && !user.has_signed_in && <Badge tone="warn">Never signed in</Badge>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Ring
              value={rate}
              size={84}
              tone={rate >= 0.9 ? 'ok' : rate >= 0.7 ? 'brand' : 'warn'}
              label={`Attendance rate ${(attendance?.attendance_rate ?? 0).toFixed(1)} percent`}
            >
              <AnimatedNumber
                value={attendance?.attendance_rate}
                format={(n) => `${Math.round(n)}%`}
                className="numeric text-lg font-semibold text-body tabular-nums"
              />
            </Ring>
            <dl className="text-xs">
              <dt className="text-muted">Attendance rate</dt>
              <dd className="mt-1 font-medium text-body">
                {formatNumber(attendance?.days_worked)} days worked
              </dd>
              <dt className="mt-2.5 text-muted">Account created</dt>
              <dd className="mt-1 font-medium text-body">{formatDate(user?.created_at)}</dd>
            </dl>
          </div>
        </div>
      </section>

      {/* Sits above the date filter deliberately: it is not filtered by it, and
          placing it below would imply it was. */}
      <AbsenceRiskBanner risk={detail.data?.absence_risk} name={user?.name} />

      <Card>
        <CardBody>
          <DateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
        </CardBody>
      </Card>

      <section aria-label="Attendance summary">
        <h2 className="mb-3 text-[15px] font-semibold tracking-tight text-body">
          Attendance summary
        </h2>
        <StatGrid ready={ready} columns={4}>
          <StatCard label="Days worked" icon="clock" value={attendance?.days_worked} format={whole} />
          <StatCard
            label="Total hours"
            icon="history"
            tone="brand"
            value={attendance?.total_hours}
            format={twoDp}
          />
          <StatCard
            label="Average per day"
            icon="chart"
            value={attendance?.average_hours_per_day}
            format={twoDp}
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
          <StatCard
            label="Late days"
            icon="history"
            value={attendance?.late_days}
            format={whole}
            tone={(attendance?.late_days ?? 0) > 0 ? 'warn' : 'default'}
          />
          <StatCard label="Absences" icon="close" value={attendance?.absent_days} format={whole} />
          <StatCard
            label="Missing time out"
            icon="clock"
            value={attendance?.missing_time_out}
            format={whole}
            tone={(attendance?.missing_time_out ?? 0) > 0 ? 'warn' : 'default'}
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

      <Reveal ready={ready} delay={80} className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader
            title="Hours per shift"
            description="Their recent shifts in the selected range"
          />
          <CardBody className="pt-0">
            {detail.isLoading ? (
              <div className="skeleton h-[240px] rounded-xl" />
            ) : (
              <TrendChart
                data={hoursSeries}
                name="Hours"
                suffix=" hrs"
                labelFormat={formatBucket}
                emptyTitle="No completed shifts in this period"
                emptyDescription="Hours appear once a shift has been timed out."
              />
            )}
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Shift outcomes" description="How the range broke down" />
          <CardBody className="pt-0">
            {detail.isLoading ? (
              <div className="skeleton h-[240px] rounded-xl" />
            ) : (
              <StackedMeter
                emptyLabel="No shifts filed in this period."
                segments={[
                  {
                    label: 'On time',
                    value: Math.max(
                      0,
                      (attendance?.days_worked ?? 0) - (attendance?.late_days ?? 0),
                    ),
                    color: palette.present,
                  },
                  { label: 'Late', value: attendance?.late_days ?? 0, color: palette.late },
                  {
                    label: 'Missing time out',
                    value: attendance?.missing_time_out ?? 0,
                    color: palette.incomplete,
                  },
                  { label: 'Absent', value: attendance?.absent_days ?? 0, color: palette.absent },
                ]}
              />
            )}
          </CardBody>
        </Card>
      </Reveal>

      <section aria-label="Productivity summary">
        <h2 className="mb-3 text-[15px] font-semibold tracking-tight text-body">
          Productivity summary
        </h2>
        <StatGrid ready={ready} columns={4}>
          <StatCard
            label="Total tasks"
            icon="clipboard"
            value={productivity?.total_tasks}
            format={whole}
          />
          <StatCard
            label="Completed"
            icon="check"
            tone="ok"
            value={productivity?.completed_tasks}
            format={whole}
            progress={
              (productivity?.total_tasks ?? 0) > 0
                ? (productivity?.completed_tasks ?? 0) / (productivity?.total_tasks ?? 1)
                : 0
            }
          />
          <StatCard label="Pending" icon="history" value={productivity?.pending_tasks} format={whole} />
          <StatCard
            label="Total output"
            icon="database"
            tone="brand"
            value={productivity?.total_output}
            format={whole}
          />
          <StatCard
            label="Average daily output"
            icon="chart"
            value={productivity?.average_daily_output}
            format={whole}
          />
          <StatCard
            label="Completion rate"
            icon="check"
            value={productivity?.completion_rate}
            format={(n) => `${n.toFixed(1)}%`}
            progress={(productivity?.completion_rate ?? 0) / 100}
            hint="Cancelled work excluded"
          />
          <StatCard
            label="Output per hour"
            icon="clock"
            value={productivity?.output_per_hour}
            format={twoDp}
          />
          <StatCard
            label="Cancelled"
            icon="close"
            value={productivity?.cancelled_tasks}
            format={whole}
            tone={(productivity?.cancelled_tasks ?? 0) > 0 ? 'warn' : 'default'}
          />
        </StatGrid>
      </section>

      <Card>
        <CardHeader title="Recent shifts" description="Most recent first" />
        {detail.isLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : detail.data?.recent_attendance.length === 0 ? (
          <EmptyState title="No shifts in this period" />
        ) : (
          <TableWrap>
            <THead>
              <Th>Shift date</Th>
              <Th>Time in</Th>
              <Th>Time out</Th>
              <Th>Hours</Th>
              <Th>Variance</Th>
              <Th>Status</Th>
            </THead>
            <TBody>
              {detail.data?.recent_attendance.map((record) => (
                <Tr key={record.id}>
                  <Td className="whitespace-nowrap">{formatDate(record.attendance_date)}</Td>
                  <Td numeric>{record.time_in ? formatTime(record.time_in) : '—'}</Td>
                  <Td numeric>
                    {record.time_out ? formatShiftTime(record.time_out, record.attendance_date) : '—'}
                  </Td>
                  <Td numeric>
                    {formatHours(record.total_hours, '')}
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
                  <Td>
                    <AttendanceBadge status={record.status} label={record.status_label} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </TableWrap>
        )}
      </Card>

      <Card>
        <CardHeader title="Recent submissions" description="Most recent first" />
        {detail.isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : detail.data?.recent_tasks.length === 0 ? (
          <EmptyState title="No submissions in this period" />
        ) : (
          <TableWrap>
            <THead>
              <Th>Date</Th>
              <Th>Task</Th>
              <Th>Code</Th>
              <Th>Output</Th>
              <Th>Status</Th>
            </THead>
            <TBody>
              {detail.data?.recent_tasks.map((task) => (
                <Tr key={task.id}>
                  <Td className="whitespace-nowrap">{formatDate(task.task_date)}</Td>
                  <Td className="font-medium">{task.task_name}</Td>
                  <Td className="font-mono text-xs text-muted">{task.task_code}</Td>
                  <Td numeric>
                    {formatNumber(task.output_count)}
                  </Td>
                  <Td>
                    <TaskBadge status={task.task_status} label={task.task_status_label} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </TableWrap>
        )}
      </Card>
    </div>
  )
}
