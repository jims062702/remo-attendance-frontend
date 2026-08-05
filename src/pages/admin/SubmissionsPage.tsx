import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminApi } from '@/services/api'
import { ApiError } from '@/services/http'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ConfirmDialog } from '@/components/ui/Modal'
import { Card, CardBody, CardHeader, PageHeader, StatCard, StatGrid } from '@/components/ui/Card'
import { Badge } from '@/components/ui/StatusBadge'
import { Sparkline } from '@/components/ui/Sparkline'
import { Reveal } from '@/components/ui/Reveal'
import { RankedBarChart, TrendChart } from '@/components/charts/TrendCharts'
import { DateRange, Field, Input, Select } from '@/components/ui/Field'
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
import { TrackerEntryModal } from '@/pages/tasker/TrackerHistoryPage'
import type { TrackerEntry } from '@/types'

/**
 * The nightly tracker submissions, which is what the operation reviews each
 * morning. Each row expands to the per-project blocks, since one entry
 * routinely covers several projects with different IDs and complexities.
 */
export default function AdminSubmissionsPage() {
  const [from, setFrom] = useState(daysAgoISO(6))
  const [to, setTo] = useState(todayISO())
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState('')
  const [page, setPage] = useState(1)
  const [viewing, setViewing] = useState<TrackerEntry | null>(null)
  const [deleting, setDeleting] = useState<TrackerEntry | null>(null)

  const queryClient = useQueryClient()

  /*
   * Deleting a submission takes its per-project blocks with it — the database
   * cascades them, because a block describes one project inside one submission
   * and means nothing on its own.
   */
  const remove = useMutation({
    mutationFn: (entry: TrackerEntry) => adminApi.deleteTrackerEntry(entry.id),
    onSuccess: (message) => {
      toast.success(message)
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tracker-entries'] })
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  const filters = { from, to, search, project_id: projectId }

  const entries = useQuery({
    queryKey: ['admin', 'tracker-entries', filters, page],
    queryFn: () => adminApi.trackerEntries({ ...filters, page, per_page: 25 }),
  })

  const options = useQuery({ queryKey: ['daily', 'options'], queryFn: () => adminApi.dailyOptions() })

  const rows = entries.data?.data ?? []

  /*
   * Headline figures and charts read the whole range, not the page on screen.
   *
   * A total that moves when you turn the page is a fact about pagination, not
   * about the night's output -- which is why these used to have to admit it in
   * their own labels.
   */
  const range = useQuery({
    queryKey: ['admin', 'tracker-entries', 'range', filters],
    queryFn: () => adminApi.trackerEntries({ ...filters, page: 1, per_page: 200 }),
  })

  const rangeRows = useMemo(
    () => [...(range.data?.data ?? [])].sort((a, b) => a.entry_date.localeCompare(b.entry_date)),
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

  /** Tasks per night across every tasker, so the shape of the week is visible. */
  const nightlySeries = useMemo(() => {
    const byNight = new Map<string, number>()
    for (const entry of rangeRows) {
      byNight.set(entry.entry_date, (byNight.get(entry.entry_date) ?? 0) + (entry.total_tasks ?? 0))
    }
    return [...byNight].map(([label, value]) => ({ label, value }))
  }, [rangeRows])

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

  const statsReady = !range.isLoading

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Submissions"
        description="Nightly tracker entries filed by taskers."
      />

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3 p-4">
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

          <Field label="Project" className="w-56">
            {(id) => (
              <Select
                id={id}
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All projects</option>
                {options.data?.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Search tasker" className="min-w-48 flex-1">
            {(id) => (
              <Input
                id={id}
                type="search"
                placeholder="Name or email"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            )}
          </Field>
        </CardBody>
      </Card>

      <StatGrid ready={statsReady} columns={4}>
        <StatCard
          label="Entries"
          icon="clipboard"
          value={entries.data?.meta.pagination.total}
          format={(n) => Math.round(n).toLocaleString()}
        />
        <StatCard
          label="Tasks in range"
          icon="database"
          tone="brand"
          value={totals.tasks}
          format={(n) => Math.round(n).toLocaleString()}
          hint={
            rangeRows.length > 0
              ? `${(totals.tasks / rangeRows.length).toFixed(1)} per entry`
              : undefined
          }
        />
        <StatCard
          label="Task IDs in range"
          icon="chart"
          value={totals.ids}
          format={(n) => Math.round(n).toLocaleString()}
        />
        <StatCard
          label="Sent back (SBQ)"
          icon="history"
          value={totals.sbq}
          format={(n) => Math.round(n).toLocaleString()}
          tone={totals.sbq > 0 ? 'warn' : 'ok'}
          progress={totals.ids > 0 ? totals.sbq / totals.ids : 0}
        />
      </StatGrid>

      <Reveal ready={statsReady} delay={80} className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Tasks per night" description="Every tasker's output, summed by shift" />
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
                data={nightlySeries}
                name="Tasks"
                variant="bar"
                labelFormat={formatBucket}
                emptyTitle="No submissions in this period"
                emptyDescription="Nobody filed a tracker entry for the selected dates."
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
                emptyDescription="Nobody filed a tracker entry for the selected dates."
              />
            )}
          </CardBody>
        </Card>
      </Reveal>

      <Card>
        <CardHeader
          title="Tracker entries"
          description="Open one to see each project's task IDs, complexity and screenshots."
        />

        {entries.isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : entries.isError ? (
          <ErrorState
            description={(entries.error as ApiError)?.message}
            onRetry={() => void entries.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No submissions in this period"
            description="Nobody filed a tracker entry for the selected dates."
          />
        ) : (
          <>
            <TableWrap>
              <THead>
                <Th>Shift date</Th>
                <Th>Tasker</Th>
                <Th>Tenurity</Th>
                <Th>Support</Th>
                <Th>Tasks</Th>
                <Th>Task IDs</Th>
                <Th>Hours</Th>
                <Th>Trend</Th>
                <Th>Projects</Th>
                <Th>Actions</Th>
              </THead>
              <TBody>
                {rows.map((entry) => (
                  <Tr key={entry.id}>
                    <Td className="whitespace-nowrap">{formatDate(entry.entry_date)}</Td>
                    <Td>
                      <p className="font-medium text-body">{entry.user?.name ?? '—'}</p>
                      <p className="text-xs text-muted">{entry.user?.email}</p>
                    </Td>
                    <Td className="text-xs text-muted">{entry.tenurity_label}</Td>
                    <Td className="text-xs text-muted">{entry.support_team_name ?? '—'}</Td>
                    <Td numeric className="font-medium">
                      {formatNumber(entry.total_tasks ?? 0)}
                    </Td>
                    <Td numeric>
                      {entry.task_id_count}
                      {entry.sbq_count > 0 && (
                        <span className="ml-1 text-xs text-warn">({entry.sbq_count} SBQ)</span>
                      )}
                    </Td>
                    <Td numeric>
                      {formatHours(entry.declared_hours, '')}
                    </Td>
                    <Td>
                      {/* Output across the night's projects, in the order they
                          were submitted -- shows at a glance whether the work
                          was spread evenly or front-loaded onto one project. */}
                      <Sparkline
                        data={(entry.items ?? []).map((i) => i.total_tasks)}
                        tone="brand"
                        width={72}
                        height={24}
                        label={`Tasks across ${entry.items?.length ?? 0} projects`}
                      />
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {entry.items?.slice(0, 2).map((item) => (
                          <Badge key={item.project_id} tone="neutral">
                            {item.project_code}
                          </Badge>
                        ))}
                        {(entry.items?.length ?? 0) > 2 && (
                          <Badge tone="neutral">+{(entry.items?.length ?? 0) - 2}</Badge>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewing(entry)}>
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Icon name="trash" size={14} />}
                          aria-label={`Delete the submission of ${formatDate(entry.entry_date)}`}
                          onClick={() => setDeleting(entry)}
                        />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </TableWrap>
            <PaginationBar pagination={entries.data?.meta.pagination} onPageChange={setPage} />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete the submission of ${deleting ? formatDate(deleting.entry_date) : ''}?`}
        description={
          `This removes ${deleting?.user?.name ?? 'the tasker'}'s production declaration for that ` +
          'night, along with every project block in it. It cannot be undone, and it frees the ' +
          'night so they can file it again.'
        }
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />

      <TrackerEntryModal entry={viewing} onClose={() => setViewing(null)} showTasker />
    </div>
  )
}
