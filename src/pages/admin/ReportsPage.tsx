import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminApi } from '@/services/api'
import { ApiError } from '@/services/http'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, PageHeader, StatCard, StatGrid } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { RankedBarChart } from '@/components/charts/TrendCharts'
import { DateRange } from '@/components/ui/Field'
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
  formatHours,
  formatNumber,
  formatPercent,
  formatVariance,
  todayISO,
} from '@/utils/format'

type ExportType = 'attendance' | 'productivity' | 'taskers' | 'tasker-summary'

const EXPORTS: { type: ExportType; title: string; description: string }[] = [
  {
    type: 'attendance',
    title: 'Attendance report',
    description: 'One row per shift: times, hours rendered, committed hours, variance and status.',
  },
  {
    type: 'productivity',
    title: 'Productivity report',
    description: 'One row per submission, with the hours of the shift it was produced in.',
  },
  {
    type: 'tasker-summary',
    title: 'Tasker summary',
    description: 'One row per tasker: days, hours, output and completion rate for the period.',
  },
  {
    type: 'taskers',
    title: 'Tasker list',
    description: 'The full roster, including deactivated accounts.',
  },
]

export default function AdminReportsPage() {
  const [from, setFrom] = useState(daysAgoISO(29))
  const [to, setTo] = useState(todayISO())
  const [busy, setBusy] = useState<ExportType | null>(null)

  const filters = { from, to }

  const summary = useQuery({
    queryKey: ['admin', 'tasker-summary', filters],
    queryFn: () => adminApi.taskerSummaryReport(filters),
  })

  const download = async (type: ExportType) => {
    setBusy(type)
    try {
      await adminApi.exportReport(type, filters)
      toast.success('Report downloaded.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Export failed.')
    } finally {
      setBusy(null)
    }
  }

  const rows = summary.data ?? []

  /* The on-screen table's own totals, so the period has a headline. */
  const totals = rows.reduce(
    (acc, row) => ({
      hours: acc.hours + row.total_hours,
      output: acc.output + row.total_output,
      tasks: acc.tasks + row.total_tasks,
      late: acc.late + row.late_days,
    }),
    { hours: 0, output: 0, tasks: 0, late: 0 },
  )

  const outputByTasker = rows.map((row) => ({ label: row.name, value: row.total_output }))

  const ready = !summary.isLoading
  const whole = (n: number) => Math.round(n).toLocaleString()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Data"
        title="Reports"
        description="Every workbook records the date range and filters it was generated with."
      />

      <Card>
        <CardHeader title="Report period" description="Applies to the exports below" />
        <CardBody>
          <DateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
        </CardBody>
      </Card>

      <StatGrid ready={ready} columns={4}>
        <StatCard label="Taskers with activity" icon="users" value={rows.length} format={whole} />
        <StatCard
          label="Hours rendered"
          icon="clock"
          tone="brand"
          value={totals.hours}
          format={(n) => n.toFixed(2)}
        />
        <StatCard label="Total output" icon="database" value={totals.output} format={whole} />
        <StatCard
          label="Late arrivals"
          icon="history"
          value={totals.late}
          format={whole}
          tone={totals.late > 0 ? 'warn' : 'ok'}
        />
      </StatGrid>

      <Reveal ready={ready} delay={80}>
        <Card>
          <CardHeader
            title="Output by tasker"
            description="Ranked across the selected period"
          />
          <CardBody className="pt-0">
            {summary.isLoading ? (
              <div className="skeleton h-[240px] rounded-xl" />
            ) : (
              <RankedBarChart
                data={outputByTasker}
                name="Output"
                emptyTitle="No output in this period"
                emptyDescription="Nobody recorded production in the selected range."
              />
            )}
          </CardBody>
        </Card>
      </Reveal>

      <section aria-label="Available reports">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Staggered for the same reason the stat tiles are: four identical
              cards arriving at once is a wall, arriving in sequence is a list.
              The delay has to sit on the element carrying the animation, so the
              wrapper owns both rather than splitting them. */}
          {EXPORTS.map((report, index) => (
            <div
              key={report.type}
              className="rise-in"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <Card className="flex h-full flex-col p-5 transition-colors hover:border-brand/40">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                    <Icon name="download" size={18} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-body">{report.title}</h2>
                    <p className="mt-1 text-sm text-muted">{report.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex-1" />
                <div>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={busy === report.type}
                    onClick={() => void download(report.type)}
                  >
                    Export Excel
                  </Button>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader
          title="Tasker summary"
          description="The same figures as the exported workbook, on screen"
        />

        {summary.isLoading ? (
          <TableSkeleton rows={6} cols={9} />
        ) : summary.isError ? (
          <ErrorState
            description={(summary.error as ApiError)?.message}
            onRetry={() => void summary.refetch()}
          />
        ) : summary.data?.length === 0 ? (
          <EmptyState
            title="No activity in this period"
            description="Nobody recorded attendance or submitted tasks in the selected range."
          />
        ) : (
          <TableWrap>
            <THead>
              <Th>Tasker</Th>
              <Th>Days</Th>
              <Th>Late</Th>
              <Th>Hours</Th>
              <Th>Avg/day</Th>
              <Th>Committed</Th>
              <Th>Variance</Th>
              <Th>Tasks</Th>
              <Th>Output</Th>
              <Th>Completion</Th>
            </THead>
            <TBody>
              {summary.data?.map((row) => (
                <Tr key={row.user_id}>
                  <Td>
                    <p className="font-medium text-body">{row.name}</p>
                    <p className="text-xs text-muted">{row.email}</p>
                  </Td>
                  <Td numeric>
                    {formatNumber(row.days_worked)}
                  </Td>
                  <Td numeric className={row.late_days > 0 ? 'text-warn' : 'text-muted'}>
                    {formatNumber(row.late_days)}
                  </Td>
                  <Td numeric className="font-medium">
                    {formatHours(row.total_hours, '')}
                  </Td>
                  <Td numeric className="text-muted">
                    {formatHours(row.average_hours, '')}
                  </Td>
                  <Td numeric className="text-muted">
                    {formatHours(row.expected_hours, '')}
                  </Td>
                  <Td
                   
                    numeric
                    className={row.variance < 0 ? 'text-warn' : 'text-ok'}
                  >
                    {formatVariance(row.variance)}
                  </Td>
                  <Td numeric>
                    {formatNumber(row.total_tasks)}
                  </Td>
                  <Td numeric className="font-medium">
                    {formatNumber(row.total_output)}
                  </Td>
                  <Td numeric>
                    {formatPercent(row.completion_rate)}
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
