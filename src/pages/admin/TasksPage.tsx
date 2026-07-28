import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminApi, metaApi, taskApi } from '@/services/api'
import { ApiError } from '@/services/http'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, PageHeader, StatCard, StatGrid } from '@/components/ui/Card'
import { TaskBadge } from '@/components/ui/StatusBadge'
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
import { daysAgoISO, formatDate, formatNumber, todayISO } from '@/utils/format'
import type { TaskStatus } from '@/types'

export default function AdminTasksPage() {
  const [from, setFrom] = useState(daysAgoISO(29))
  const [to, setTo] = useState(todayISO())
  const [taskStatus, setTaskStatus] = useState<TaskStatus | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const filters = { from, to, task_status: taskStatus, search }

  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: metaApi.options, staleTime: Infinity })

  const tasks = useQuery({
    queryKey: ['admin', 'tasks', filters, page],
    queryFn: () => taskApi.list({ ...filters, page, per_page: 20 }),
  })

  const exportExcel = async () => {
    setExporting(true)
    try {
      await adminApi.exportReport('productivity', filters)
      toast.success('Export downloaded.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  /*
   * Range-wide figures, so "total output" is the range's output rather than
   * whichever twenty rows are on screen.
   */
  const range = useQuery({
    queryKey: ['admin', 'tasks', 'range', filters],
    queryFn: () => taskApi.list({ ...filters, page: 1, per_page: 200 }),
  })

  const rangeRows = range.data?.data ?? []

  const stats = rangeRows.reduce(
    (acc, task) => ({
      output: acc.output + (task.task_status === 'cancelled' ? 0 : task.output_count),
      completed: acc.completed + (task.task_status === 'completed' ? 1 : 0),
      cancelled: acc.cancelled + (task.task_status === 'cancelled' ? 1 : 0),
    }),
    { output: 0, completed: 0, cancelled: 0 },
  )

  const totalRecords = tasks.data?.meta.pagination.total
  const capped = (totalRecords ?? 0) > rangeRows.length
  const sampleNote = capped ? `Across the latest ${rangeRows.length} in range` : undefined
  const whole = (n: number) => Math.round(n).toLocaleString()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Task submissions"
        description="Daily production records across all taskers."
        action={
          <Button variant="primary" loading={exporting} onClick={() => void exportExcel()}>
            Export Excel
          </Button>
        }
      />

      <StatGrid ready={!range.isLoading} columns={4}>
        <StatCard label="Submissions" icon="clipboard" value={totalRecords} format={whole} />
        <StatCard
          label="Total output"
          icon="database"
          tone="brand"
          value={stats.output}
          format={whole}
          hint={sampleNote ?? 'Cancelled work excluded'}
        />
        <StatCard
          label="Completed"
          icon="check"
          tone="ok"
          value={stats.completed}
          format={whole}
          progress={rangeRows.length > 0 ? stats.completed / rangeRows.length : 0}
          hint={sampleNote}
        />
        <StatCard
          label="Cancelled"
          icon="close"
          value={stats.cancelled}
          format={whole}
          tone={stats.cancelled > 0 ? 'warn' : 'ok'}
          hint={sampleNote}
        />
      </StatGrid>

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3 p-4">
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

          <Field label="Status" className="w-44">
            {(id) => (
              <Select
                id={id}
                value={taskStatus}
                onChange={(event) => {
                  setTaskStatus(event.target.value as TaskStatus | '')
                  setPage(1)
                }}
              >
                <option value="">All statuses</option>
                {meta?.task_statuses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Search" className="min-w-48 flex-1">
            {(id) => (
              <Input
                id={id}
                type="search"
                placeholder="Task, code or reference"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
              />
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        {/* The counts moved to the tiles above, where they are range-wide
            rather than page-scoped, so this only has to say what the rows are. */}
        <CardHeader title="Submissions" description="Newest first" />

        {tasks.isLoading ? (
          <TableSkeleton rows={10} cols={7} />
        ) : tasks.isError ? (
          <ErrorState
            description={(tasks.error as ApiError)?.message}
            onRetry={() => void tasks.refetch()}
          />
        ) : tasks.data?.data.length === 0 ? (
          <EmptyState title="No submissions match these filters" />
        ) : (
          <>
            <TableWrap>
              <THead>
                <Th>Date</Th>
                <Th>Tasker</Th>
                <Th>Task</Th>
                <Th>Code</Th>
                <Th>Reference</Th>
                <Th>Output</Th>
                <Th>Status</Th>
                <Th>Screenshot</Th>
              </THead>
              <TBody>
                {tasks.data?.data.map((task) => (
                  <Tr key={task.id}>
                    <Td className="whitespace-nowrap">{formatDate(task.task_date)}</Td>
                    <Td>
                      <p className="font-medium text-body">{task.user?.name ?? '—'}</p>
                      <p className="text-xs text-muted">{task.user?.email}</p>
                    </Td>
                    <Td>
                      <p className="font-medium text-body">{task.task_name}</p>
                      {task.task_description && (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-muted">
                          {task.task_description}
                        </p>
                      )}
                    </Td>
                    <Td className="font-mono text-xs text-muted">{task.task_code}</Td>
                    <Td className="text-xs text-muted">{task.external_task_id_display}</Td>
                    <Td numeric>
                      {formatNumber(task.output_count)}
                    </Td>
                    <Td>
                      <TaskBadge status={task.task_status} label={task.task_status_label} />
                    </Td>
                    <Td>
                      {task.screenshot_link ? (
                        <a
                          href={task.screenshot_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-brand hover:underline"
                        >
                          Open ↗
                        </a>
                      ) : (
                        <span className="text-xs text-faint">N/A</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </TableWrap>
            <PaginationBar pagination={tasks.data?.meta.pagination} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
