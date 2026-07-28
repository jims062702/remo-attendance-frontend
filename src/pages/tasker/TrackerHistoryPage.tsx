import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dailyApi } from '@/services/api'
import { ApiError } from '@/services/http'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, PageHeader, StatCard, StatGrid } from '@/components/ui/Card'
import { Badge } from '@/components/ui/StatusBadge'
import { Sparkline } from '@/components/ui/Sparkline'
import { Modal } from '@/components/ui/Modal'
import { DateRange } from '@/components/ui/Field'
import { Reveal } from '@/components/ui/Reveal'
import { RankedBarChart, TrendChart } from '@/components/charts/TrendCharts'
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
  formatNumber,
  todayISO,
} from '@/utils/format'
import type { TrackerEntry } from '@/types'

/**
 * The tasker's own production history.
 *
 * The Tonight page answers "what have I done recently" in three headline
 * numbers; this answers "what exactly did I submit on the 14th", which is what
 * someone needs when their pay or output is queried.
 */
export default function TaskerTrackerHistoryPage() {
  const [from, setFrom] = useState(daysAgoISO(29))
  const [to, setTo] = useState(todayISO())
  const [page, setPage] = useState(1)
  const [viewing, setViewing] = useState<TrackerEntry | null>(null)

  const entries = useQuery({
    queryKey: ['daily', 'tracker-history', from, to, page],
    queryFn: () => dailyApi.trackerHistory({ from, to, page, per_page: 20 }),
  })

  const rows = entries.data?.data ?? []

  /*
   * Totals and charts read the whole range, not the page being viewed.
   *
   * The tiles used to sum whichever twenty rows were on screen and admit it in
   * the label -- "Tasks (page)". That is a figure nobody wants: it changes when
   * you page, it is not comparable between ranges, and it answers a question
   * about pagination rather than about the work. A second request for the range
   * lets them mean what they appear to mean.
   */
  const range = useQuery({
    queryKey: ['daily', 'tracker-history', 'range', from, to],
    queryFn: () => dailyApi.trackerHistory({ from, to, page: 1, per_page: 100 }),
  })

  const rangeRows = useMemo(
    () =>
      [...(range.data?.data ?? [])].sort((a, b) => a.entry_date.localeCompare(b.entry_date)),
    [range.data],
  )

  const totals = useMemo(
    () =>
      rangeRows.reduce(
        (acc, e) => ({
          tasks: acc.tasks + (e.total_tasks ?? 0),
          ids: acc.ids + e.task_id_count,
          sbq: acc.sbq + e.sbq_count,
          hours: acc.hours + (e.declared_hours ?? 0),
        }),
        { tasks: 0, ids: 0, sbq: 0, hours: 0 },
      ),
    [rangeRows],
  )

  const tasksSeries = useMemo(
    () => rangeRows.map((entry) => ({ label: entry.entry_date, value: entry.total_tasks ?? 0 })),
    [rangeRows],
  )

  /** Tasks per project across the range, so the mix is visible at a glance. */
  const projectMix = useMemo(() => {
    const byProject = new Map<string, number>()
    for (const entry of rangeRows) {
      for (const item of entry.items ?? []) {
        const code = item.project_code ?? `#${item.project_id}`
        byProject.set(code, (byProject.get(code) ?? 0) + item.total_tasks)
      }
    }
    return [...byProject].map(([label, value]) => ({ label, value }))
  }, [rangeRows])

  const nights = entries.data?.meta.pagination.total
  const statsReady = !range.isLoading

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="My record"
        title="My tracker history"
        description="Every nightly entry you have submitted, with the task IDs and screenshots you sent."
      />

      <Card>
        <CardBody>
          <DateRange
            from={from}
            to={to}
            onFromChange={(v) => {
              setFrom(v)
              setPage(1)
            }}
            onToChange={(v) => {
              setTo(v)
              setPage(1)
            }}
          />
        </CardBody>
      </Card>

      <StatGrid ready={statsReady} columns={4}>
        <StatCard
          label="Nights filed"
          icon="history"
          value={nights}
          format={(n) => Math.round(n).toLocaleString()}
        />
        <StatCard
          label="Tasks in range"
          icon="clipboard"
          tone="brand"
          value={totals.tasks}
          format={(n) => Math.round(n).toLocaleString()}
          hint={
            nights ? `${(totals.tasks / Math.max(1, rangeRows.length)).toFixed(1)} per night` : undefined
          }
        />
        <StatCard
          label="Task IDs in range"
          icon="database"
          value={totals.ids}
          format={(n) => Math.round(n).toLocaleString()}
          hint={totals.sbq > 0 ? `${formatNumber(totals.sbq)} sent back` : 'None sent back'}
        />
        <StatCard
          label="Hours in range"
          icon="clock"
          value={totals.hours}
          format={(n) => n.toFixed(2)}
          hint="As declared on your entries"
        />
      </StatGrid>

      <Reveal ready={statsReady} delay={80} className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Tasks per night" description="Every entry you filed in this range" />
          <CardBody className="pt-0">
            {range.isLoading ? (
              <div className="skeleton h-[240px] rounded-xl" />
            ) : range.isError ? (
              <ErrorState
                description={(range.error as ApiError)?.message}
                onRetry={() => void range.refetch()}
              />
            ) : (
              <TrendChart
                data={tasksSeries}
                name="Tasks"
                variant="bar"
                labelFormat={formatBucket}
                emptyTitle="No entries in this period"
                emptyDescription="Try widening the date range."
              />
            )}
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Project mix" description="Tasks by project across the range" />
          <CardBody className="pt-0">
            {range.isLoading ? (
              <div className="skeleton h-[240px] rounded-xl" />
            ) : (
              <RankedBarChart
                data={projectMix}
                name="Tasks"
                emptyTitle="No projects in this period"
                emptyDescription="Try widening the date range."
              />
            )}
          </CardBody>
        </Card>
      </Reveal>

      <Card>
        <CardHeader title="Entries" description="Newest first. Open one to see the full submission." />

        {entries.isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : entries.isError ? (
          <ErrorState
            description={(entries.error as ApiError)?.message}
            onRetry={() => void entries.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No entries in this period"
            description="Try widening the date range."
          />
        ) : (
          <>
            <TableWrap>
              <THead>
                <Th>Shift date</Th>
                <Th>Projects</Th>
                <Th>Tasks</Th>
                <Th>Task IDs</Th>
                <Th>Hours</Th>
                <Th>Trend</Th>
                <Th>Actions</Th>
              </THead>
              <TBody>
                {rows.map((entry) => (
                  <Tr key={entry.id}>
                    <Td className="font-medium whitespace-nowrap">
                      {formatDate(entry.entry_date)}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {entry.items?.slice(0, 3).map((item) => (
                          <Badge key={item.project_id} tone="neutral">
                            {item.project_code}
                          </Badge>
                        ))}
                        {(entry.items?.length ?? 0) > 3 && (
                          <Badge tone="neutral">+{(entry.items?.length ?? 0) - 3}</Badge>
                        )}
                      </div>
                    </Td>
                    <Td numeric className="font-medium">
                      {formatNumber(entry.total_tasks ?? 0)}
                    </Td>
                    <Td numeric>
                      {entry.task_id_count}
                      {entry.sbq_count > 0 && (
                        <span className="ml-1 text-[13px] text-warn">({entry.sbq_count} SBQ)</span>
                      )}
                    </Td>
                    <Td numeric>
                      {formatHours(entry.declared_hours, '')}
                    </Td>
                    <Td>
                      <Sparkline
                        data={(entry.items ?? []).map((i) => i.total_tasks)}
                        tone="brand"
                        width={72}
                        height={24}
                        label="Tasks per project"
                      />
                    </Td>
                    <Td>
                      <Button size="sm" variant="ghost" onClick={() => setViewing(entry)}>
                        View
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </TableWrap>
            <PaginationBar pagination={entries.data?.meta.pagination} onPageChange={setPage} />
          </>
        )}
      </Card>

      <TrackerEntryModal entry={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}

/**
 * Full detail for one nightly entry.
 *
 * A modal rather than an expanding row: a submission has several projects,
 * each with a wall of comma-separated IDs, and inlining that pushes the rest
 * of the table off screen.
 */
export function TrackerEntryModal({
  entry,
  onClose,
  showTasker = false,
}: {
  entry: TrackerEntry | null
  onClose: () => void
  showTasker?: boolean
}) {
  if (!entry) return null

  return (
    <Modal
      open={entry !== null}
      onClose={onClose}
      title={`Tracker entry — ${formatDate(entry.entry_date)}`}
      eyebrow={showTasker && entry.user ? entry.user.name : entry.tenurity_label}
      description={
        showTasker && entry.user
          ? entry.user.email
          : `${entry.items?.length ?? 0} project${(entry.items?.length ?? 0) === 1 ? '' : 's'} submitted`
      }
      size="xl"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="space-y-5">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Tasks', value: formatNumber(entry.total_tasks ?? 0) },
            { label: 'Task IDs', value: String(entry.task_id_count) },
            { label: 'Sent back (SBQ)', value: String(entry.sbq_count) },
            { label: 'Hours rendered', value: formatHours(entry.declared_hours, '') },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-sunken px-3 py-2">
              <dt className="text-[13px] text-muted">{stat.label}</dt>
              <dd className="numeric mt-0.5 text-lg font-semibold text-body">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[15px] sm:grid-cols-3">
          {[
            { label: 'Tenurity', value: entry.tenurity_label },
            { label: 'Site', value: entry.site_name ?? '—' },
            { label: 'Support', value: entry.support_team_name ?? '—' },
          ].map((row) => (
            <div key={row.label}>
              <dt className="text-[13px] text-muted">{row.label}</dt>
              <dd className="text-body">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div>
          <h3 className="mb-2 text-[15px] font-semibold text-body">
            Projects ({entry.items?.length ?? 0})
          </h3>
          <div className="space-y-3">
            {entry.items?.map((item) => (
              <div key={item.project_id} className="rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[13px] font-medium text-body">
                    {item.project_code}
                  </span>
                  <Badge tone="brand">{item.total_tasks} tasks</Badge>
                  {item.tasker_level_label && (
                    <Badge tone="info">{item.tasker_level_label}</Badge>
                  )}
                  {item.task_complexity_label && (
                    <Badge tone="neutral">{item.task_complexity_label}</Badge>
                  )}
                  {(item.sbq_count ?? 0) > 0 && (
                    <Badge tone="warn">{item.sbq_count} SBQ</Badge>
                  )}
                </div>

                <div className="mt-2.5 space-y-2 text-[13px]">
                  <div>
                    <p className="text-muted">Task / Sub. IDs</p>
                    <p className="mt-0.5 break-words font-mono text-body">
                      {item.task_ids_display ?? 'N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted">Screenshots</p>
                    {item.screenshot_links ? (
                      <div className="mt-0.5 flex flex-wrap gap-2">
                        {item.screenshot_links.split(',').map((link, i) => (
                          <a
                            key={i}
                            href={link.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand hover:underline"
                          >
                            Screenshot {i + 1} ↗
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-0.5 text-faint">N/A</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {entry.remarks && (
          <div>
            <h3 className="mb-1 text-[15px] font-semibold text-body">Remarks</h3>
            <p className="rounded-lg bg-sunken px-3 py-2 text-[15px] text-muted">{entry.remarks}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
